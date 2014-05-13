/*
** Module dependencies
*/
var HttpAgent = require('http').Agent;
var HttpsAgent = require('https').Agent;
var parseUrl = require('url').parse;

var request = require('superagent');
require('superagent-retry')(request);
var _ = require('lodash');
var _s = require('underscore.string');
var libxml = require('libxmljs');

var namespaces = require('./namespaces');


/*
** Config
*/
var Agent = {
  'http:': HttpAgent,
  'https:': HttpsAgent
};

/*
** Constructor
*/
function Client(url, options) {
    if (!url) throw new Error('URL is required!');
    this.url = url;
    this.options = options || {};

    if (this.options.maxSockets || this.options.keepAlive) {
        this.agent = new Agent[parseUrl(url).protocol](_.pick(this.options, 'keepAlive', 'maxSockets'));
    }
}

/*
** Private methods
*/
Client.prototype.request = function(query, cb) {
    var req = request
        .get(this.url)
        .query({ service: 'WFS', version: '2.0.0' })
        .query(query);

    if (this.agent) req.agent(this.agent); // Must be called before any set method!
    if (this.options.userAgent) req.set('User-Agent', this.options.userAgent);
    if (this.options.retry) req.retry(this.options.retry);

    req.buffer()
        .end(function(err, res) {
            if (err) return cb(err);
            if (!res.text || !res.text.length) return cb(new Error('Empty body'));

            var xmlDoc;
            try {
                xmlDoc = libxml.parseXml(res.text, { noblanks: true });
                cb(null, xmlDoc);
            } catch(e) {
                console.log(res.req.path);
                console.log(e);
                cb(e);
            }
        });

    return req;
};

Client.prototype.mapOptions = function(options) {
    var query = {};
    // Mapping original params
    _.extend(query, _.pick(options, 'typeNames', 'resultType'));
    if (options.limit) query.maxRecords = options.limit;
    if (options.offset) query.startPosition = options.offset + 1;
    return query;
};

Client.prototype.getCapabilities = function(cb) {
    this.request({ request: 'GetCapabilities' }, cb);
};

Client.prototype.featureTypes = function(cb) {
    this.getCapabilities(function(err, result) {
        if (err) return cb(err);

        var featureTypeNodes = result.find('/wfs:WFS_Capabilities/wfs:FeatureTypeList/wfs:FeatureType', namespaces);
        if (!featureTypeNodes) cb(null, []);
        var featureTypes = _.map(featureTypeNodes, function(featureTypeNode) {
            var featureType = {};

            function importTextValue(xpath, attributeName) {
                var node = featureTypeNode.get(xpath, namespaces);
                var value = node ? node.text() : '';
                if (value.length > 0) featureType[attributeName] = value;
            }

            importTextValue('./wfs:Name', 'name');
            importTextValue('./wfs:Title', 'title');
            importTextValue('./wfs:Abstract', 'abstract');

            // Always with WFS 2.0?
            var name;
            if (featureType.name && featureType.name.indexOf(':')) {
                name = featureType.name;
                featureType.name = _s.strRight(name, ':');
                featureType.namespace = _s.strLeft(name, ':');
            }

            return featureType;
        });

        cb(null, featureTypes);
    });
};


/*
** Exports
*/
module.exports = Client;
