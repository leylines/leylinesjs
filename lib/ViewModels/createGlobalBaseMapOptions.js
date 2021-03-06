"use strict";

/*global require*/
var BaseMapViewModel = require('./BaseMapViewModel');
var WebMapServiceCatalogItem = require('../Models/WebMapServiceCatalogItem');
var OpenStreetMapCatalogItem = require('../Models/OpenStreetMapCatalogItem');
var ArcGisMapServerCatalogItem = require('../Models/ArcGisMapServerCatalogItem');
//var MapboxMapCatalogItem = require('../Models/MapboxMapCatalogItem');
var IonImageryCatalogItem = require('../Models/IonImageryCatalogItem');

//var BingMapsCatalogItem = require('../Models/BingMapsCatalogItem');
//var BingMapsStyle = require('terriajs-cesium/Source/Scene/BingMapsStyle');

var createGlobalBaseMapOptions = function(terria, bingMapsKey, mapboxApiKey) {

    var result = [];

    var bingMapsAerialWithLabelsOnDemand = new IonImageryCatalogItem(terria);
    bingMapsAerialWithLabelsOnDemand.name = 'Bing Maps Aerial with Labels';
    bingMapsAerialWithLabelsOnDemand.ionAssetId = '11051';
    bingMapsAerialWithLabelsOnDemand.opacity = 1.0;
    bingMapsAerialWithLabelsOnDemand.isRequiredForRendering = true;

    result.push(new BaseMapViewModel({
        image: require('../../wwwroot/images/bingAerialLabels.png'),
        catalogItem: bingMapsAerialWithLabelsOnDemand
    }));

    var bingMapsAerial = new IonImageryCatalogItem(terria);
    bingMapsAerial.name = 'Bing Maps Aerial';
    bingMapsAerial.ionAssetId = '11050';
    bingMapsAerial.opacity = 1.0;
    bingMapsAerial.isRequiredForRendering = true;
    bingMapsAerial.requestWaterMask = true;

    result.push(new BaseMapViewModel({
        image: require('../../wwwroot/images/bingAerial.png'),
        catalogItem: bingMapsAerial
    }));

    var bingMapsRoadsOnDemand = new IonImageryCatalogItem(terria);
    bingMapsRoadsOnDemand.name = 'Bing Maps Roads';
    bingMapsRoadsOnDemand.ionAssetId = '11052';
    bingMapsRoadsOnDemand.opacity = 1.0;
    bingMapsRoadsOnDemand.isRequiredForRendering = true;

    result.push(new BaseMapViewModel({
        image: require('../../wwwroot/images/bingRoads.png'),
        catalogItem: bingMapsRoadsOnDemand
    }));

    var esriWorldImagery = new ArcGisMapServerCatalogItem(terria);
    esriWorldImagery.name = 'ESRI World Imagery';
    esriWorldImagery.url = 'https://services.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer';
    esriWorldImagery.opacity = 1.0;
    esriWorldImagery.isRequiredForRendering = true;
    esriWorldImagery.allowFeaturePicking = false;
    esriWorldImagery.attribution = "Sources: Esri, DigitalGlobe, GeoEye, i-cubed, USDA FSA, USGS, AEX, Getmapping, Aerogrid, IGN, IGP, swisstopo, and the GIS User Community";

    result.push(new BaseMapViewModel({
        image: require('../../wwwroot/images/esriWorldImagery.png'),
        catalogItem: esriWorldImagery
    }));

    var esriWorldTopoMap = new ArcGisMapServerCatalogItem(terria);
    esriWorldTopoMap.name = 'ESRI World Topo Map';
    esriWorldTopoMap.url = 'https://services.arcgisonline.com/arcgis/rest/services/World_Topo_Map/MapServer';
    esriWorldTopoMap.opacity = 1.0;
    esriWorldTopoMap.isRequiredForRendering = true;
    esriWorldTopoMap.allowFeaturePicking = false;
    esriWorldTopoMap.attribution = "Sources: Esri, DeLorme, HERE, TomTom, Intermap, increment P Corp., GEBCO, USGS, FAO, NPS, NRCAN, GeoBase, IGN, Kadaster NL, Ordnance Survey, Esri Japan, METI, Esri China (Hong Kong), swisstopo, MapmyIndia, and the GIS User Community";

    result.push(new BaseMapViewModel({
        image: require('../../wwwroot/images/esriWorldTopoMap.png'),
        catalogItem: esriWorldTopoMap
    }));

    var esriNationalGeographic = new ArcGisMapServerCatalogItem(terria);
    esriNationalGeographic.name = 'National Geographic Map';
    esriNationalGeographic.url = 'https://services.arcgisonline.com/ArcGIS/rest/services/NatGeo_World_Map/MapServer';
    esriNationalGeographic.opacity = 1.0;
    esriNationalGeographic.isRequiredForRendering = true;
    esriNationalGeographic.allowFeaturePicking = false;
    esriNationalGeographic.attribution = "Sources: National Geographic, Esri, DeLorme, HERE, UNEP-WCMC, USGS, NASA, ESA, METI, NRCAN, GEBCO, NOAA, iPC";

    result.push(new BaseMapViewModel({
        image: require('../../wwwroot/images/esriNationalGeographic.png'),
        catalogItem: esriNationalGeographic
    }));

    var openStreetMap = new WebMapServiceCatalogItem(terria);
    openStreetMap.name = 'Open Street Map ';
    openStreetMap.url = 'https://tiles.maps.eox.at/wms';
    openStreetMap.layers = 'osm_3857';
    openStreetMap.parameters = {
        tiled: true
    };
    openStreetMap.opacity = 1.0;
    openStreetMap.isRequiredForRendering = true;

    result.push(new BaseMapViewModel({
        image: require('../../wwwroot/images/openStreetMap.png'),
        catalogItem: openStreetMap
    }));

    var stamenToner = new OpenStreetMapCatalogItem(terria);
    stamenToner.name = 'Stamen Toner';
    stamenToner.url = 'https://stamen-tiles.a.ssl.fastly.net/toner-lite/';
    stamenToner.opacity = 1.0;
    stamenToner.isRequiredForRendering = true;
    stamenToner.attribution = "Map tiles by <a href=\"http://stamen.com\">Stamen Design</a>, under <a href=\"http://creativecommons.org/licenses/by/3.0\">CC BY 3.0</a>. Data by <a href=\"http://openstreetmap.org\">OpenStreetMap</a>, under <a href=\"http://www.openstreetmap.org/copyright\">ODbL</a>.";

    result.push(new BaseMapViewModel({
        image: require('../../wwwroot/images/stamenToner.png'),
        catalogItem: stamenToner
    }));

    var stamenTerrain = new OpenStreetMapCatalogItem(terria);
    stamenTerrain.name = 'Stamen Terrain';
    stamenTerrain.url = 'https://stamen-tiles.a.ssl.fastly.net/terrain/';
    stamenTerrain.opacity = 1.0;
    stamenTerrain.isRequiredForRendering = true;
    stamenTerrain.attribution = "Map tiles by <a href=\"http://stamen.com\">Stamen Design</a>, under <a href=\"http://creativecommons.org/licenses/by/3.0\">CC BY 3.0</a>. Data by <a href=\"http://openstreetmap.org\">OpenStreetMap</a>, under <a href=\"http://www.openstreetmap.org/copyright\">ODbL</a>.";

    result.push(new BaseMapViewModel({
        image: require('../../wwwroot/images/stamenTerrain.png'),
        catalogItem: stamenTerrain
    }));

    var eoxTerrain = new WebMapServiceCatalogItem(terria);
    eoxTerrain.name = 'EOX Terrain';
    eoxTerrain.url = 'https://tiles.maps.eox.at/wms';
    eoxTerrain.layers = 'terrain_3857';
    eoxTerrain.parameters = {
        tiled: true
    };
    eoxTerrain.opacity = 1.0;
    eoxTerrain.isRequiredForRendering = true;
    eoxTerrain.attribution = "Data ?? <a href=\"http://www.openstreetmap.org/copyright\">OpenStreetMap</a> contributors and <a href=\"https://esa.maps.eox.at/#data\">others</a>, Rendering ?? <a href=\"http://eox.at/\">EOX</a>";

    result.push(new BaseMapViewModel({
        image: require('../../wwwroot/images/eoxTerrain.png'),
        catalogItem: eoxTerrain
    }));

    var gebco = new WebMapServiceCatalogItem(terria);
    gebco.name = 'GEBCO Latest';
    gebco.url = 'https://www.gebco.net/data_and_products/gebco_web_services/web_map_service/mapserv';
    gebco.layers = 'GEBCO_LATEST';
    gebco.parameters = {
        tiled: true
    };
    gebco.opacity = 1.0;
    gebco.isRequiredForRendering = true;

    result.push(new BaseMapViewModel({
        image: require('../../wwwroot/images/gebco.png'),
        catalogItem: gebco
    }));

    var blackMarble = new IonImageryCatalogItem(terria);
    blackMarble.name = 'NASA Black Marble';
    blackMarble.ionAssetId = '3812';
    blackMarble.opacity = 1.0;
    blackMarble.isRequiredForRendering = true;

    result.push(new BaseMapViewModel({
        image: require('../../wwwroot/images/blackMarble.png'),
        catalogItem: blackMarble
    }));

    var mapboxMap = new IonImageryCatalogItem(terria);
    mapboxMap.name = 'Mapbox Satellite';
    mapboxMap.ionAssetId = '11060';
    mapboxMap.credit = 'Mapbox';
    mapboxMap.opacity = 1.0;
    mapboxMap.isRequiredForRendering = true;

    result.push(new BaseMapViewModel({
        image: require('../../wwwroot/images/mapBox.png'),
        catalogItem: mapboxMap
    }));

    var outdoorsMap = new IonImageryCatalogItem(terria);
    outdoorsMap.name = 'Mapbox Outdoors';
    outdoorsMap.ionAssetId = '11061';
    outdoorsMap.credit = 'Mapbox';
    outdoorsMap.opacity = 1.0;
    outdoorsMap.isRequiredForRendering = true;

    result.push(new BaseMapViewModel({
        image: require('../../wwwroot/images/mapBoxOutdoors.png'),
        catalogItem: outdoorsMap
    }));

    var piratesMap = new IonImageryCatalogItem(terria);
    piratesMap.name = 'Mapbox Streets';
    piratesMap.ionAssetId = '11069';
    piratesMap.credit = 'Mapbox';
    piratesMap.opacity = 1.0;
    piratesMap.isRequiredForRendering = true;

    result.push(new BaseMapViewModel({
        image: require('../../wwwroot/images/mapBoxPirates.png'),
        catalogItem: piratesMap
    }));

    return result;
};

module.exports = createGlobalBaseMapOptions;
