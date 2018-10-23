/*
** Module dependencies
*/
const HttpAgent = require('http').Agent
const HttpsAgent = require('https').Agent
const parseUrl = require('url').parse
const got = require('got')
const {pick, findLast} = require('lodash')
const semver = require('semver')
const debug = require('debug')('wfs')
const xml = require('./xml')

/*
** Config
*/
const Agent = {
  'http:': HttpAgent,
  'https:': HttpsAgent
}

const supportedVersions = {
  '1.0.0': require('./versions/1.0.0'),
  '1.1.0': require('./versions/1.1.0'),
  '2.0.0': require('./versions/2.0.0')
}
const supportedVersionsKeys = Object.keys(supportedVersions)

class Client {
  constructor(url, options) {
    if (!url) {
      throw new TypeError('URL is required!')
    }
    this.url = url
    this.options = options || {}
    this.queryStringToAppend = options.queryStringToAppend || {}

    if (this.options.version) {
      if (!(this.options.version in supportedVersions)) {
        throw new Error('Version not supported by client')
      }
      this.version = this.options.version
    }

    if (this.options.maxSockets || this.options.keepAlive) {
      this.agent = new Agent[parseUrl(url).protocol](pick(this.options, 'keepAlive', 'maxSockets'))
    }
  }

  async _ensureVersion() {
    if (!this.version) {
      this.version = await this._negociateVersion(supportedVersionsKeys[supportedVersionsKeys.length - 1])
    }
    return this.version
  }

  async _negociateVersion(candidateVersion) {
    debug('client is trying with version %s', candidateVersion)

    const capabilities = await this._request({request: 'GetCapabilities', version: candidateVersion})
    if (capabilities.root().name() === 'WFS_Capabilities') {
      const rootNode = capabilities.root()
      const detectedVersion = rootNode.attr('version') ? rootNode.attr('version').value() : null
      if (!detectedVersion || !semver.valid(detectedVersion)) {
        debug('unable to read version in Capabilities')
        throw new Error('Unable to read version in Capabilities')
      }
      debug('server responded with version %s', detectedVersion)
      if (detectedVersion === candidateVersion) {
        debug('client and server versions are matching!')
        return detectedVersion
      }
      if (semver.gt(detectedVersion, candidateVersion)) {
        debug('client candidate version (%s) is smaller than the lowest supported by server (%s)', candidateVersion, detectedVersion)
        debug('version negociation failed')
        throw new Error('Version negociation has failed. Lowest version supported by server is ' + detectedVersion + ' but candidateVersion was ' + candidateVersion)
      } else {
        debug('candidate version (%s) is greater than server one (%s)', candidateVersion, detectedVersion)
        if (detectedVersion in supportedVersions) {
          debug('version returned by server (%s) is supported by client', detectedVersion)
          return detectedVersion
        }
        const nextCandidateVersion = findLast(supportedVersionsKeys, supportedVersion => {
          return semver.lt(supportedVersion, detectedVersion)
        })
        debug('nearest smaller version supported by client is %s', nextCandidateVersion)
        return this._negociateVersion(nextCandidateVersion)
      }
    }

    debug('enter in recovery mode (unable to read capabilities)')
    const nextCandidateVersion = findLast(supportedVersionsKeys, supportedVersion => {
      return semver.lt(supportedVersion, candidateVersion)
    })
    if (nextCandidateVersion) {
      debug('nearest smaller version supported by client is %s', nextCandidateVersion)
      return this._negociateVersion(nextCandidateVersion)
    }
    debug('version negocation failed - recovery mode')
    throw new Error('Version negociation has failed (recovery mode)')
  }

  async _request(query) {
    const options = {
      encoding: null,
      query: {
        service: 'WFS',
        ...this.queryStringToAppend,
        ...query
      },
      agent: this.agent
    }

    if (this.options.userAgent) {
      options.headers = {
        'user-agent': this.options.userAgent
      }
    }

    if (this.options.timeout) {
      options.timeout = this.options.timeout * 1000
    }

    const {body} = await got(this.url, options)

    return xml.parse(body)
  }

  async capabilities() {
    const client = this

    const version = await client._ensureVersion()
    const xmlDoc = await client._request({request: 'GetCapabilities', version})

    return supportedVersions[version].parseCapabilities(xmlDoc)
  }

  async featureTypes() {
    const capabilities = await this.capabilities()

    return capabilities.featureTypes || []
  }
}

/*
** Exports
*/
module.exports = Client
