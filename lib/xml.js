var libxml = require('libxmljs');
var _ = require('lodash');

exports.mapper = function(definition, ns) {

    var buildObject, buildArray, buildTextValue;

    buildTextValue = function(node) {
        if (!node) return null;
        var value;
        if (node.type() === 'attribute') value = node.value();
        if (node.type() === 'element') value = node.text();
        if (!value || value.length === 0) return null;
        return value;
    };

    buildArray = function(nodes, type) {
        if (!nodes || nodes.length === 0) return null;
        var result = [];
        nodes.forEach(function(node) {
            var value = type ? buildObject(node, type) : buildTextValue(node);
            if (value) result.push(value);
        });
        return result.length ? result : null;
    };

    buildObject = function(node, type) {
        var result = {};
        _.forEach(definition[type], function(params, xpath) {
            if (_.isString(params)) params = { dest: params };
            var value;
            if (params.multi) value = buildArray(node.find(xpath, ns), params.type);
            else if (params.type) value = buildObject(node.get(xpath, ns), params.type);
            else value = buildTextValue(node.get(xpath, ns));
            if (value) result[params.dest] = value;
        });
        return _.size(result) ? result : null;
    };

    return {
        buildTextValue: buildTextValue,
        buildArray: buildArray,
        buildObject: buildObject
    };

};

exports.parse = libxml.parseXml;