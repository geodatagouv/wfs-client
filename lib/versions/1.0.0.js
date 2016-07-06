/*
** Module dependencies
*/
const xml = require('../xml');
const isString = require('../util').isString;

const ns = {
    wfs: 'http://www.opengis.net/wfs',
    ogc: 'http://www.opengis.net/ogc',
};

const types = {

    Main: {
        './wfs:Service': { dest: 'service', type: 'Service' },
        // './wfs:Capability': { dest: 'capabilities', custom: true },
        './wfs:FeatureTypeList/wfs:FeatureType': { dest: 'featureTypes', multi: true, type: 'FeatureType' },
        // 'ogc:Filter_Capabilities': {}
    },

    Service: {
        '../@version': 'serviceTypeVersion',
        './wfs:Name': 'name', // Removed in 1.1.0
        './wfs:Title': 'title',
        './wfs:Abstract': 'abstract',
        './wfs:Keywords': 'keywords',
        './wfs:OnlineResource': 'location', // Removed in 1.1.0
        './wfs:Fees': 'fees',
        './wfs:AccessConstraints': 'accessConstraints',
    },

    FeatureType: {
        './wfs:Name': 'name',
        './wfs:Title': 'title',
        './wfs:Abstract': 'abstract',
        './wfs:Keywords': 'keywords',
        // './wfs:SRS': {},
        // './wfs:LatLongBoundingBox': {}
    },

};

// var resultFormats = {
//     GML2: 'GML v2',
//     GML3: 'GML v3',
//     'SHAPE-ZIP': 'Shapefile',
//     CSV: 'CSV',
//     JSON: 'GeoJSON'
// };

exports.parseCapabilities = function(xmlDoc) {
    const mapper = xml.mapper(types, ns);
    const capabilities = mapper.buildObject(xmlDoc, 'Main');

    if (capabilities.service && isString(capabilities.service.keywords)) {
        capabilities.service.keywords = capabilities.service.keywords.split(',').map(function(keyword) {
            return keyword.trim();
        });
    }

    if (capabilities.featureTypes) {
        capabilities.featureTypes.forEach(function(featureType) {
            if (featureType.keywords && isString(featureType.keywords)) {
                featureType.keywords = featureType.keywords.split(',').map(function(keyword) {
                    return keyword.trim();
                });
            }
        });
    }

    return capabilities;
};
