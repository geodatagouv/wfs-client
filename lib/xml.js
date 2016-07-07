const libxml = require('libxmljs');
const isString = require('../util').isString;
const { forEach, size } = require('lodash');

exports.mapper = function(definition, ns) {

    let buildObject, buildArray, buildTextValue;

    buildTextValue = function(node) {
        if (!node) return null;
        let value;
        if (node.type() === 'attribute') value = node.value();
        if (node.type() === 'element') value = node.text();
        if (!value || value.length === 0) return null;
        return value;
    };

    buildArray = function(nodes, type) {
        if (!nodes || nodes.length === 0) return null;
        const result = [];
        nodes.forEach(function(node) {
            const value = type ? buildObject(node, type) : buildTextValue(node);
            if (value) result.push(value);
        });
        return result.length ? result : null;
    };

    buildObject = function(node, type) {
        const result = {};
        forEach(definition[type], function(params, xpath) {
            if (isString(params)) params = { dest: params };
            let value;
            if (params.multi) value = buildArray(node.find(xpath, ns), params.type);
            else if (params.type) value = buildObject(node.get(xpath, ns), params.type);
            else value = buildTextValue(node.get(xpath, ns));
            if (value) result[params.dest] = value;
        });
        return size(result) ? result : null;
    };

    return { buildTextValue, buildArray, buildObject };

};

const parserOptions = {
    noblanks: true,
    noent: true,
    nocdata: true,
};

exports.parse = function(res, fn) {
    const chunks = [];
    res.on('data', function(chunk) {
        chunks.push(chunk);
    });
    res.on('end', function() {
        try {
            fn(null, libxml.parseXml(Buffer.concat(chunks), parserOptions));
        } catch (err) {
            res.parseError = err;
            fn(err);
        }
    });
};
