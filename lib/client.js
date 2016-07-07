/*
** Module dependencies
*/
const HttpAgent = require('http').Agent;
const HttpsAgent = require('https').Agent;
const parseUrl = require('url').parse;
const request = require('superagent');
const { pick, findLast } = require('lodash');
const semver = require('semver');
const debug = require('debug')('wfs');
const xml = require('./xml');

/*
** Config
*/
const Agent = {
    'http:': HttpAgent,
    'https:': HttpsAgent,
};

const supportedVersions = {
    '1.0.0': require('./versions/1.0.0'),
    '1.1.0': require('./versions/1.1.0'),
    '2.0.0': require('./versions/2.0.0'),
};
const supportedVersionsKeys = Object.keys(supportedVersions);


class Client {
    constructor(url, options) {
        if (!url) throw new Error('URL is required!');
        this.url = url;
        this.options = options || {};
        this.queryStringToAppend = options.queryStringToAppend || {};

        if (this.options.version) {
            if (!(this.version in supportedVersions)) throw new Error('Version not supported by client');
            this.version = this.options.version;
        }

        if (this.options.maxSockets || this.options.keepAlive) {
            this.agent = new Agent[parseUrl(url).protocol](pick(this.options, 'keepAlive', 'maxSockets'));
        }
    }

    _ensureVersion() {
        if (!this.version) this.version = this._negociateVersion(supportedVersionsKeys[supportedVersionsKeys.length - 1]);
        return Promise.resolve(this.version);
    }

    _negociateVersion(candidateVersion) {
        const client = this;
        debug('client is trying with version %s', candidateVersion);
        return this._request({ request: 'GetCapabilities', version: candidateVersion })
            .then(function (response) {
                if (response.root().name() === 'WFS_Capabilities') {
                    return response;
                } else {
                    debug('server has not returned capabilities');
                    throw new Error('Server has not returned capabilities');
                }
            })
            .then(function (capabilities) {
                const rootNode = capabilities.root();
                const detectedVersion = rootNode.attr('version') ? rootNode.attr('version').value() : null;
                if (!detectedVersion || !semver.valid(detectedVersion)) {
                    debug('unable to read version in Capabilities');
                    throw new Error('Unable to read version in Capabilities');
                }
                debug('server responded with version %s', detectedVersion);
                if (detectedVersion === candidateVersion) {
                    debug('client and server versions are matching!');
                    return detectedVersion;
                }
                if (semver.gt(detectedVersion, candidateVersion)) {
                    debug('client candidate version (%s) is smaller than the lowest supported by server (%s)', candidateVersion, detectedVersion);
                    debug('version negociation failed');
                    throw new Error('Version negociation has failed. Lowest version supported by server is ' + detectedVersion + ' but candidateVersion was ' + candidateVersion);
                } else {
                    debug('candidate version (%s) is greater than server one (%s)', candidateVersion, detectedVersion);
                    if (detectedVersion in supportedVersions) {
                        debug('version returned by server (%s) is supported by client', detectedVersion);
                        return detectedVersion;
                    }
                    const nextCandidateVersion = findLast(supportedVersionsKeys, function(supportedVersion) {
                        return semver.lt(supportedVersion, detectedVersion);
                    });
                    debug('nearest smaller version supported by client is %s', nextCandidateVersion);
                    return client._negociateVersion(nextCandidateVersion);
                }
            }, function() {
                /* Recovery mode \o/ */
                debug('enter in recovery mode (unable to read capabilities)');
                const nextCandidateVersion = findLast(supportedVersionsKeys, function(supportedVersion) {
                    return semver.lt(supportedVersion, candidateVersion);
                });
                if (nextCandidateVersion) {
                    debug('nearest smaller version supported by client is %s', nextCandidateVersion);
                    return client._negociateVersion(nextCandidateVersion);
                } else {
                    debug('version negocation failed - recovery mode');
                    throw new Error('Version negociation has failed (recovery mode)');
                }
            });
    }

    _request(query) {
        return new Promise((resolve, reject) => {
            const req = request
                .get(this.url)
                .parse(xml.parse)
                .query({ service: 'WFS' })
                .query(this.queryStringToAppend)
                .query(query);

            if (this.agent) req.agent(this.agent); // Must be called before any set method!
            if (this.options.userAgent) req.set('User-Agent', this.options.userAgent);
            if (this.options.timeout) req.timeout(this.options.timeout * 1000);

            req.buffer().end(function(err, res) {
                if (err) return reject(err);
                if (res.res.parseError) return reject(res.res.parseError);
                resolve(res.body);
            });
        });
    }

    capabilities() {
        const client = this;

        return client._ensureVersion().then(function(version) {
            return client._request({ request: 'GetCapabilities', version: version }).then(function(xmlDoc) {
                return supportedVersions[version].parseCapabilities(xmlDoc);
            });
        });
    }

    featureTypes() {
        return this.capabilities().then(function(capabilities) {
            return capabilities.featureTypes || [];
        });
    }
}


/*
** Exports
*/
module.exports = Client;
