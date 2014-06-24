/*
** Module dependencies
*/
var HttpAgent = require('http').Agent;
var HttpsAgent = require('https').Agent;
var parseUrl = require('url').parse;
var Q = require('q');
var request = require('superagent');
require('superagent-retry')(request);
var _ = require('lodash');
var _s = require('underscore.string');
var libxml = require('libxmljs');
var semver = require('semver');
var debug = require('debug')('wfs');

/*
** Config
*/
var Agent = {
  'http:': HttpAgent,
  'https:': HttpsAgent
};

var supportedVersions = {
    '1.0.0': require('./versions/1.0.0'),
    // '1.1.0': require('./versions/1.1.0'),
    // '2.0.0': require('./versions/2.0.0')
};
var supportedVersionsKeys = _.keys(supportedVersions);

/*
** Constructor
*/
function Client(url, options) {
    if (!url) throw new Error('URL is required!');
    this.url = url;
    this.options = options || {};

    if (this.options.version) {
        if (!(this.version in supportedVersions)) throw new Error('Version not supported by client');
        this.version = this.options.version;
    }

    if (this.options.maxSockets || this.options.keepAlive) {
        this.agent = new Agent[parseUrl(url).protocol](_.pick(this.options, 'keepAlive', 'maxSockets'));
    }
}

/*
** Private methods
*/
Client.prototype.ensureVersion = function() {
    if (!this.version) this.version = this.negociateVersion(supportedVersionsKeys[supportedVersionsKeys.length - 1]);
    return Q(this.version);
};

Client.prototype.negociateVersion = function(candidateVersion) {
    var client = this;
    debug('client is trying with version %s', candidateVersion);
    return this.request({ request: 'GetCapabilities', version: candidateVersion })
        .then(function(capabilities) {
            var rootNode = capabilities.root();
            var detectedVersion = rootNode.attr('version') ? rootNode.attr('version').value() : null;
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
                var nextCandidateVersion = _.findLast(supportedVersionsKeys, function(supportedVersion) {
                    return semver.lt(supportedVersion, detectedVersion);
                });
                debug('nearest smaller version supported by client is %s', nextCandidateVersion);
                return client.negociateVersion(nextCandidateVersion);
            }
        });
};

Client.prototype.request = function(query) {
    var deferred = Q.defer();

    var req = request
        .get(this.url)
        .query({ service: 'WFS' })
        .query(query);

    if (this.agent) req.agent(this.agent); // Must be called before any set method!
    if (this.options.userAgent) req.set('User-Agent', this.options.userAgent);
    if (this.options.retry) req.retry(this.options.retry);

    req.buffer()
        .end(function(err, res) {
            if (err) return deferred.reject(err);
            if (!res.text || !res.text.length) return deferred.reject(new Error('Empty body'));

            try {
                deferred.resolve(libxml.parseXml(res.text, { noblanks: true }));
            } catch(e) {
                return deferred.reject(e);
            }
        });

    return deferred.promise;
};

Client.prototype.capabilities = function() {
    var client = this;

    return client.ensureVersion().then(function(version) {
        return client.request({ request: 'GetCapabilities', version: version }).then(function(xmlDoc) {
            return supportedVersions[version].parseCapabilities(xmlDoc);
        });
    });

};

Client.prototype.featureTypes = function() {
    return this.capabilities().then(function(capabilities) {
        return capabilities.featureTypes || [];
    });
};


/*
** Exports
*/
module.exports = Client;
