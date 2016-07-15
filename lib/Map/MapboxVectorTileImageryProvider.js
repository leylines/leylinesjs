'use strict';

/*global require*/
var WebMercatorTilingScheme = require('terriajs-cesium/Source/Core/WebMercatorTilingScheme');
var Rectangle = require('terriajs-cesium/Source/Core/Rectangle');
var CesiumEvent = require('terriajs-cesium/Source/Core/Event');
var defined = require('terriajs-cesium/Source/Core/defined');
var VectorTile = require('vector-tile').VectorTile;
var Protobuf = require('pbf');
var inside = require('point-in-polygon');
var loadArrayBuffer = require('terriajs-cesium/Source/Core/loadArrayBuffer');
var defaultValue = require('terriajs-cesium/Source/Core/defaultValue');
var DeveloperError = require('terriajs-cesium/Source/Core/DeveloperError');
var URITemplate = require('urijs/src/URITemplate');
var ImageryLayerFeatureInfo = require('terriajs-cesium/Source/Scene/ImageryLayerFeatureInfo');
var defineProperties = require('terriajs-cesium/Source/Core/defineProperties');
var CesiumMath = require('terriajs-cesium/Source/Core/Math');


var POLYGON_FEATURE = 3; // feature.type == 3 for polygon features

var MapboxVectorTileImageryProvider = function (options) {
    this._uriTemplate = new URITemplate(options.url);

    if (typeof options.layerName !== 'string') {
        throw new DeveloperError('MapboxVectorTileImageryProvider requires a layer name passed as options.layerName');
    }
    this._layerName = options.layerName;

    this._subdomains = defaultValue(options.subdomains, []);

    if (!(options.styleFunc instanceof Function)) {
        throw new DeveloperError('MapboxVectorTileImageryProvider requires a styling function passed as options.styleFunc');
    }
    this._styleFunc = options.styleFunc;

    this._tilingScheme = new WebMercatorTilingScheme();

    this._tileWidth = 256;
    this._tileHeight = 256;

    this._minimumLevel = defaultValue(options.minimumZoom, 0);
    this._maximumLevel = defaultValue(options.maximumZoom, Infinity);

    this._rectangle = defaultValue(Rectangle.intersection(options.rectangle, this._tilingScheme.rectangle), this._tilingScheme.rectangle);
    this._featurePicking = options.featurePicking;
    this._borderColor = "rgb(0,0,0)";

    // Check the number of tiles at the minimum level.  If it's more than four,
    // throw an exception, because starting at the higher minimum
    // level will cause too many tiles to be downloaded and rendered.
    var swTile = this._tilingScheme.positionToTileXY(Rectangle.southwest(this._rectangle), this._minimumLevel);
    var neTile = this._tilingScheme.positionToTileXY(Rectangle.northeast(this._rectangle), this._minimumLevel);
    var tileCount = (Math.abs(neTile.x - swTile.x) + 1) * (Math.abs(neTile.y - swTile.y) + 1);
    if (tileCount > 4) {
        throw new DeveloperError('The imagery provider\'s rectangle and minimumLevel indicate that there are ' + tileCount + ' tiles at the minimum level. Imagery providers with more than four tiles at the minimum level are not supported.');
    }

    this._errorEvent = new CesiumEvent();

    this._ready = true;
};

defineProperties(MapboxVectorTileImageryProvider.prototype, {
    url : {
        get : function() {
            return this._uriTemplate.expression;
        }
    },

    tileWidth : {
        get : function() {
            return this._tileWidth;
        }
    },


    tileHeight: {
        get : function() {
            return this._tileHeight;
        }
    },


    maximumLevel : {
        get : function() {
            return this._maximumLevel;
        }
    },


    minimumLevel : {
        get : function() {
            return this._minimumLevel;
        }
    },


    tilingScheme : {
        get : function() {
            return this._tilingScheme;
        }
    },


    rectangle : {
        get : function() {
            return this._rectangle;
        }
    },


    errorEvent : {
        get : function() {
            return this._errorEvent;
        }
    },


    ready : {
        get : function() {
            return this._ready;
        }
    },


    hasAlphaChannel : {
        get : function() {
            return true;
        }
    }
});

MapboxVectorTileImageryProvider.prototype._getSubdomain = function(x, y, level) {
    if (this._subdomains.length === 0) {
        return undefined;
    } else {
        var index = (x + y + level) % this._subdomains.length;
        return this._subdomains[index];
    }
};

MapboxVectorTileImageryProvider.prototype._buildImageUrl = function(x, y, level) {
    return this._uriTemplate.expand({
        z: level,
        x: x,
        y: y,
        s: this._getSubdomain(x, y, level),
    });
};


MapboxVectorTileImageryProvider.prototype._requestImage = function(x, y, level, canvas) {
    var that = this;
    var url = this._buildImageUrl(x, y, level);

    return loadArrayBuffer(url).then(function(data) {
        var tile = new VectorTile(new Protobuf(data));
        var layer = tile.layers[that._layerName];

        if (!defined(layer)) {
            return canvas; // return blank canvas for blank tile
        }

        var context = canvas.getContext('2d');
        context.strokeStyle = "black";
        context.lineWidth = 1;

        var pos;

        var extentFactor = canvas.width/layer.extent; // Vector tile works with extent [0, 4095], but canvas is only [0,255]

        // Features
        for (var i = 0; i < layer.length; i++) {
            var feature = layer.feature(i);
            if (feature.type === POLYGON_FEATURE) {
                var style = that._styleFunc(feature.properties[that._featurePicking.uniqueIdProp]);
                if (!style) continue;
                context.fillStyle = style.fillStyle;
                context.strokeStyle = style.strokeStyle;
                context.lineWidth = style.lineWidth;
                context.lineJoin = style.lineJoin;
                context.beginPath();
                var coordinates = feature.loadGeometry();

                // Polygon rings
                for (var i2 = 0; i2 < coordinates.length; i2++) {
                    pos = coordinates[i2][0];

                    context.moveTo(pos.x*extentFactor, pos.y*extentFactor);

                    // Polygon ring points
                    for (var j = 1; j < coordinates[i2].length; j++) {
                        pos = coordinates[i2][j];
                        context.lineTo(pos.x*extentFactor, pos.y*extentFactor);
                    }
                }
                context.stroke();
                context.fill();
            } else {
                console.log('Unexpected geometry type: ' + feature.type + ' in region map on tile ' + [level,x,y].join('/'));
            }
        }
        return canvas;
    });

};

MapboxVectorTileImageryProvider.prototype.requestImage = function(x, y, level) {
    var canvas = document.createElement('canvas');
    canvas.width = this._tileWidth;
    canvas.height = this._tileHeight;
    return this._requestImage(x, y, level, canvas);
};

function isExteriorRing(ring) {
    // See https://github.com/mapbox/vector-tile-spec/tree/master/2.0#4344-polygon-geometry-type && https://en.wikipedia.org/wiki/Shoelace_formula
    var n = ring.length;
    var twiceArea = ring[n-1][0]*(ring[0][1]-ring[n-2][1]) + ring[0][0]*(ring[1][1]-ring[n-1][1]);
    for (var i = 1; i <= n-2; i++) {
        twiceArea += ring[i][0]*(ring[i+1][1]-ring[i-1][1]);
    }
    return twiceArea <= 0; // Reversed sign because vector tile y coordinates are reversed
}

// According to the Mapbox Vector Tile specifications, a polygon consists of one exterior ring followed by 0 or more interior rings. Therefore:
// for each ring:
//   if point in ring:
//     for each interior ring (following the exterior ring):
//       check point in interior ring
//     if point not in any interior rings, feature is clicked
function isFeatureClicked(rings, point) {
    for (var i = 0; i < rings.length; i++) {
        if (inside(point, rings[i])) { // Point is in an exterior ring
            // Check whether point is in any interior rings
            var inInteriorRing = false;
            while (i+1 < rings.length && !isExteriorRing(rings[i+1])) {
                i++;
                if (!inInteriorRing && inside(point, rings[i])) {
                    inInteriorRing = true;
                    // Don't break. Still need to iterate over the rest of the interior rings but don't do point-in-polygon tests on those
                }
            }
            // Point is in exterior ring, but not in any interior ring. Therefore point is in the feature region
            if (!inInteriorRing) {
                return true;
            }
        }
    }
    return false;
}


MapboxVectorTileImageryProvider.prototype.pickFeatures = function(x, y, level, longitude, latitude) {
    var that = this;
    var url = this._buildImageUrl(x, y, level);

    return loadArrayBuffer(url).then(function(data) {
        var layer = new VectorTile(new Protobuf(data)).layers[that._layerName];
        var point = [CesiumMath.toDegrees(longitude), CesiumMath.toDegrees(latitude)];

        if (!defined(layer)) {
            return []; // return empty list of features for empty tile
        }

        var features = [];
        for (var i = 0; i < layer.length; i++) {
            var feature = layer.feature(i);
            if (feature.type === POLYGON_FEATURE && isFeatureClicked(feature.toGeoJSON(x, y, level).geometry.coordinates, point)) {
                var featureInfo = new ImageryLayerFeatureInfo();
                var uniqueId = feature.properties[that._featurePicking.uniqueIdProp];
                var rowObject = that._featurePicking.regionRowObjects[uniqueId];
                featureInfo.name = feature.properties[that._featurePicking.nameProp]; // Could be undefined
                if (defined(rowObject)) {
                    featureInfo.properties = rowObject;
                    featureInfo.description = that._featurePicking.regionRowDescriptions[uniqueId];
                    if (!defined(featureInfo.name)) {
                        featureInfo.configureNameFromProperties(feature.properties);
                    }
                } else {
                    featureInfo.properties = undefined;
                    featureInfo.description = undefined;
                }
                featureInfo.data = {id: uniqueId};
                features.push(featureInfo);
                that._selectedRegion = uniqueId;
            }
        }

        return features;
    });
};


MapboxVectorTileImageryProvider.prototype.createHighlightImageryProvider = function(regionUniqueID) {
    var that = this;
    var styleFunc = function(FID) {
        if (regionUniqueID === FID) {
            // No fill, but same style border as the regions, just thicker
            var regionStyling = that._styleFunc(FID);
            regionStyling.fillStyle = "rgba(0,0,0,0)";
            regionStyling.lineJoin = "round";
            regionStyling.lineWidth = Math.floor(1.5*defaultValue(regionStyling.lineWidth, 1) + 1);
            return regionStyling;
        } else {
            return undefined;
        }
    };
    var imageryProvider = new MapboxVectorTileImageryProvider({
        url: this._uriTemplate.expression,
        layerName: this._layerName,
        subdomains: this._subdomains,
        rectangle: this._rectangle,
        featurePicking: this._featurePicking,
        styleFunc: styleFunc
    });
    imageryProvider.pickFeatures = function() { return undefined; }; // Turn off feature picking
    return imageryProvider;
};

module.exports = MapboxVectorTileImageryProvider;
