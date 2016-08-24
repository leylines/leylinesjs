'use strict';

/*global require*/
var L = require('leaflet');
var html2canvas = require('html2canvas');

var Cartesian2 = require('terriajs-cesium/Source/Core/Cartesian2');
var Cartographic = require('terriajs-cesium/Source/Core/Cartographic');
var CesiumMath = require('terriajs-cesium/Source/Core/Math');
var CesiumTileLayer = require('../Map/CesiumTileLayer');
var MapboxVectorCanvasTileLayer = require('../Map/MapboxVectorCanvasTileLayer');
var MapboxVectorTileImageryProvider = require('../Map/MapboxVectorTileImageryProvider');
var defined = require('terriajs-cesium/Source/Core/defined');
var destroyObject = require('terriajs-cesium/Source/Core/destroyObject');
var DeveloperError = require('terriajs-cesium/Source/Core/DeveloperError');
var EasingFunction = require('terriajs-cesium/Source/Core/EasingFunction');
var Ellipsoid = require('terriajs-cesium/Source/Core/Ellipsoid');
var knockout = require('terriajs-cesium/Source/ThirdParty/knockout');
var Rectangle = require('terriajs-cesium/Source/Core/Rectangle');
var cesiumRequestAnimationFrame = require('terriajs-cesium/Source/Core/requestAnimationFrame');
var TweenCollection = require('terriajs-cesium/Source/Scene/TweenCollection');
var when = require('terriajs-cesium/Source/ThirdParty/when');
var defaultValue = require('terriajs-cesium/Source/Core/defaultValue');

var Feature = require('./Feature');
var GlobeOrMap = require('./GlobeOrMap');
var inherit = require('../Core/inherit');
var LeafletDragBox = require('../Map/LeafletDragBox');
var LeafletScene = require('../Map/LeafletScene');
var PickedFeatures = require('../Map/PickedFeatures');
var rectangleToLatLngBounds = require('../Map/rectangleToLatLngBounds');
var runLater = require('../Core/runLater');
const selectionIndicatorUrl = require('../../wwwroot/images/NM-LocationTarget.svg');

// Work around broken html2canvas 0.5.0-alpha2
window.html2canvas = html2canvas;

LeafletDragBox.initialize(L);

/**
 * The Leaflet viewer component
 *
 * @alias Leaflet
 * @constructor
 * @extends GlobeOrMap
 *
 * @param {Terria} terria The Terria instance.
 * @param {Viewer} map The leaflet viewer instance.
 */
var Leaflet = function(terria, map) {
    GlobeOrMap.call(this, terria);

    /**
     * Gets or sets the Leaflet {@link Map} instance.
     * @type {Map}
     */
    this.map = map;

    this.scene = new LeafletScene(map);

    this._tweens = new TweenCollection();
    this._tweensAreRunning = false;
    this._selectionIndicatorTween = undefined;
    this._selectionIndicatorIsAppearing = undefined;

    this._pickedFeatures = undefined;
    this._selectionIndicator = L.marker([0, 0], {
        icon: L.divIcon({
            className: '',
            html: '<img src="' + selectionIndicatorUrl + '" width="50" height="50" alt="" />',
            iconSize: L.point(50, 50)
        }),
        clickable: false,
        keyboard: false
    });
    this._selectionIndicator.addTo(this.map);
    this._selectionIndicatorDomElement = this._selectionIndicator._icon.children[0];

    this._dragboxcompleted = false;

    this.scene.featureClicked.addEventListener(featurePicked.bind(undefined, this));

    var that = this;

    // if we receive dragboxend (see LeafletDragBox) and we are currently
    // accepting a rectangle, then return the box as the picked feature
    map.on('dragboxend', function(e) {
        var mapInteractionModeStack = that.terria.mapInteractionModeStack;
        if (defined(mapInteractionModeStack) && mapInteractionModeStack.length > 0) {
				    if (mapInteractionModeStack[mapInteractionModeStack.length - 1].drawRectangle && defined(e.dragBoxBounds)) {
						    var b = e.dragBoxBounds;
                mapInteractionModeStack[mapInteractionModeStack.length - 1].pickedFeatures = Rectangle.fromDegrees(b.getWest(), b.getSouth(), b.getEast(), b.getNorth());
						}
        }
				that._dragboxcompleted = true;
    });

    map.on('click', function(e) {
        if (!that._dragboxcompleted) {
            pickFeatures(that, e.latlng);
        }
        that._dragboxcompleted = false;
    });

    this._selectedFeatureSubscription = knockout.getObservable(this.terria, 'selectedFeature').subscribe(function() {
        selectFeature(this);
    }, this);

    this._initProgressEvent();

    selectFeature(this);
};

inherit(GlobeOrMap, Leaflet);

Leaflet.prototype._initProgressEvent = function() {
    var onTileLoadChange = function() {
        var tilesLoadingCount = 0;

        this.map.eachLayer(function(layer) {
            if (layer._tilesToLoad) {
                tilesLoadingCount += layer._tilesToLoad;
            }
        });

        this.updateTilesLoadingCount(Math.max(tilesLoadingCount - 1, 0));// -1 because _tilesToLoad doesn't update until after this runs
    }.bind(this);

    this.map.on('layeradd', function(evt) {
        // This check makes sure we only watch tile layers, and also protects us if this private variable gets removed.
        if (typeof evt.layer._tilesToLoad !== 'undefined') {
            evt.layer.on('tileloadstart tileload loaded', onTileLoadChange);
        }
    }.bind(this));

    this.map.on('layerremove', function(evt) {
        evt.layer.off('tileloadstart tileload loaded', onTileLoadChange);
    }.bind(this));
};

Leaflet.prototype.destroy = function() {
    if (defined(this._selectedFeatureSubscription)) {
        this._selectedFeatureSubscription.dispose();
        this._selectedFeatureSubscription = undefined;
    }

    this.map.clearAllEventListeners();
    this.map.eachLayer(layer => layer.clearAllEventListeners());

    GlobeOrMap.disposeCommonListeners(this);

    return destroyObject(this);
};

/**
 * Gets the current extent of the camera.  This may be approximate if the viewer does not have a strictly rectangular view.
 * @return {Rectangle} The current visible extent.
 */
Leaflet.prototype.getCurrentExtent = function() {
    var bounds = this.map.getBounds();
    return Rectangle.fromDegrees(bounds.getWest(), bounds.getSouth(), bounds.getEast(), bounds.getNorth());
};

/**
 * Gets the current container element.
 * @return {Element} The current container element.
 */
Leaflet.prototype.getContainer = function() {
    return this.map.getContainer();
};

/**
 * Zooms to a specified camera view or extent.
 *
 * @param {CameraView|Rectangle} viewOrExtent The view or extent to which to zoom.
 * @param {Number} [flightDurationSeconds=3.0] The length of the flight animation in seconds.  Leaflet ignores the actual value,
 *                                             but will use an animated transition when this value is greater than 0.
 */
Leaflet.prototype.zoomTo = function(viewOrExtent, flightDurationSeconds) {
    if (!defined(viewOrExtent)) {
        throw new DeveloperError('viewOrExtent is required.');
    }

    var extent;
    if (viewOrExtent instanceof Rectangle) {
        extent = viewOrExtent;
    } else {
        extent = viewOrExtent.rectangle;
    }

    // Account for a bounding box crossing the date line.
    if (extent.east < extent.west) {
        extent = Rectangle.clone(extent);
        extent.east += CesiumMath.TWO_PI;
    }

    this.map.fitBounds(rectangleToLatLngBounds(extent), {
        animate: flightDurationSeconds > 0.0
    });
};

/**
 * Captures a screenshot of the map.
 * @return {Promise} A promise that resolves to a data URL when the screenshot is ready.
 */
Leaflet.prototype.captureScreenshot = function() {
    var deferred = when.defer();

    // Temporarily hide the map credits.
    this.map.attributionControl.removeFrom(this.map);

    var that = this;

    try {
        html2canvas(this.map.getContainer(), {
            useCORS: true,
            onrendered: function(canvas) {
                var dataUrl;

                try {
                    dataUrl = canvas.toDataURL("image/jpeg");
                } catch (e) {
                    deferred.reject(e);
                }

                that.map.attributionControl.addTo(that.map);

                deferred.resolve(dataUrl);
            }
        });
    } catch (e) {
        that.map.attributionControl.addTo(that.map);
        deferred.reject(e);
    }

    return deferred.promise;
};

/**
 * Notifies the viewer that a repaint is required.
 */
Leaflet.prototype.notifyRepaintRequired = function() {
    // Leaflet doesn't need to do anything with this notification.
};

var cartographicScratch = new Cartographic();

/**
 * Computes the screen position of a given world position.
 * @param  {Cartesian3} position The world position in Earth-centered Fixed coordinates.
 * @param  {Cartesian2} [result] The instance to which to copy the result.
 * @return {Cartesian2} The screen position, or undefined if the position is not on the screen.
 */
Leaflet.prototype.computePositionOnScreen = function(position, result) {
    var cartographic = Ellipsoid.WGS84.cartesianToCartographic(position, cartographicScratch);
    var point = this.map.latLngToContainerPoint(L.latLng(CesiumMath.toDegrees(cartographic.latitude), CesiumMath.toDegrees(cartographic.longitude)));

    if (defined(result)) {
        result.x = point.x;
        result.y = point.y;
    } else {
        result = new Cartesian2(point.x, point.y);
    }
    return result;
};

/**
 * Adds an attribution to the map.
 * @param {Credit} attribution The attribution to add.
 */
Leaflet.prototype.addAttribution = function(attribution) {
    if (attribution) {
        this.map.attributionControl.addAttribution(createLeafletCredit(attribution));
    }
};

/**
 * Removes an attribution from the map.
 * @param {Credit} attribution The attribution to remove.
 */
Leaflet.prototype.removeAttribution = function(attribution) {
    if (attribution) {
        this.map.attributionControl.removeAttribution(createLeafletCredit(attribution));
    }
};

// this private function is called by updateLayerOrder
function updateOneLayer(item, currZIndex) {
    if (defined(item.imageryLayer) && defined(item.imageryLayer.setZIndex)) {
        if (item.supportsReordering) {
            item.imageryLayer.setZIndex(currZIndex.reorderable++);
        } else {
            item.imageryLayer.setZIndex(currZIndex.fixed++);
        }
    }
}
/**
 * Updates the order of layers on the Leaflet map to match the order in the Now Viewing pane.
 */
Leaflet.prototype.updateLayerOrder = function() {
    // Set the current z-index of all layers.
    var items = this.terria.nowViewing.items;
    var currZIndex = {
        reorderable: 100, // an arbitrary place to start
        fixed: 1000000 // fixed layers go on top of reorderable ones
    };
    var i, j, currentItem, subItem;

    for (i = items.length - 1; i >= 0; --i) {
        currentItem = items[i];
        if (defined(currentItem.items)) {
            for (j = currentItem.items.length - 1; j >= 0; --j) {
                subItem = currentItem.items[j];
                updateOneLayer(subItem, currZIndex);
            }
        }
        updateOneLayer(currentItem, currZIndex);
    }
};

/**
 * Because Leaflet doesn't actually do raise/lower, just reset the orders after every raise/lower
 */
Leaflet.prototype.updateLayerOrderAfterReorder = function() {
    this.updateLayerOrder();
};

Leaflet.prototype.raise = function(index) {
    // raising and lowering is instead handled by updateLayerOrderAfterReorder
};

Leaflet.prototype.lower = function(index) {
    // raising and lowering is instead handled by updateLayerOrderAfterReorder
};

/**
 * Lowers this imagery layer to the bottom, underneath all other layers.  If this item is not enabled or not shown,
 * this method does nothing.
 * @param {CatalogItem} item The item to lower to the bottom (usually a basemap)
 */
Leaflet.prototype.lowerToBottom = function(item) {
    if (defined(item.items)) {
        for (var i = item.items.length - 1; i >= 0; --i) {
            var subItem = item.items[i];
            this.lowerToBottom(subItem);  // recursive
        }
    }

    if (!defined(item._imageryLayer)) {
        return;
    }

    item._imageryLayer.setZIndex(0);
};

/**
 * Picks features based off a latitude, longitude and (optionally) height.
 * @param {Object} latlng The position on the earth to pick.
 * @param {Object} imageryLayerCoords A map of imagery provider urls to the coords used to get features for those imagery
 *     providers - i.e. x, y, level
 * @param existingFeatures An optional list of existing features to concatenate the ones found from asynchronous picking to.
 */
Leaflet.prototype.pickFromLocation = function(latlng, imageryLayerCoords, existingFeatures) {
    pickFeatures(this, latlng, imageryLayerCoords, existingFeatures);
};

Leaflet.prototype.addImageryProvider = function(options) {
    var layerOptions = {
        opacity: options.opacity,
        bounds : options.clipToRectangle && options.rectangle ? rectangleToLatLngBounds(options.rectangle) : undefined
    };

    if (defined(this.map.options.maxZoom)) {
        layerOptions.maxZoom = this.map.options.maxZoom;
    }

    var result;

    if (options.imageryProvider instanceof MapboxVectorTileImageryProvider) {
        layerOptions.async = true;
        layerOptions.bounds = rectangleToLatLngBounds(options.imageryProvider.rectangle);
        result = new MapboxVectorCanvasTileLayer(options.imageryProvider, layerOptions);
    }
    else {
        result = new CesiumTileLayer(options.imageryProvider, layerOptions);
    }

    result.errorEvent.addEventListener(function(sender, message) {
        if (defined(options.onProjectionError)) {
            options.onProjectionError();
        }

        // If the user re-shows the dataset, show the error again.
        result.initialized = false;
    });

    var errorEvent = options.imageryProvider.errorEvent;
    if (defined(options.onLoadError) && defined(errorEvent)) {
        errorEvent.addEventListener(function(tileProviderError) {
            // For Leaflet, this event will never be raised for tile errors; it will only be raised for metadata errors.
            // Just pass the error on to the user.
            options.onLoadError(tileProviderError);
        });
    }

    return result;
};

Leaflet.prototype.addImageryLayer = function(options) {
    var map = this.map;
    map.addLayer(options.layer);
};

Leaflet.prototype.removeImageryLayer = function(options) {
    var map = this.map;
    map.removeLayer(options.layer);
};

Leaflet.prototype.showImageryLayer = function(options) {
    if (!this.map.hasLayer(options.layer)) {
        options.layer.addTo(this.map);
    }
    this.updateLayerOrder();
};

Leaflet.prototype.hideImageryLayer = function(options) {
    this.map.removeLayer(options.layer);
};

/**
 * A convenient function for handling leaflet credit display
 * @param {Credit} attribution the original attribution object for leaflet to display as text or link
 * @return {String} The sanitized HTML for the credit.
 */
function createLeafletCredit(attribution) {
    var element;

    if (defined(attribution.link)) {
        element = document.createElement('a');
        element.href = attribution.link;
    } else {
        element = document.createElement('span');
    }

    element.textContent = attribution.text;
    return element.outerHTML;
}

/*
* There are two "listeners" for clicks which are set up in our constructor.
* - One fires for any click: `map.on('click', ...`.  It calls `pickFeatures`.
* - One fires only for vector features: `this.scene.featureClicked.addEventListener`.
*    It calls `featurePicked`, which calls `pickFeatures` and then adds the feature it found, if any.
* These events can fire in either order.
* Billboards do not fire the first event.
*
* Note that `pickFeatures` does nothing if `leaflet._pickedFeatures` is already set.
* Otherwise, it sets it, runs `runLater` to clear it, and starts the asynchronous raster feature picking.
*
* So:
* If only the first event is received, it triggers the raster-feature picking as desired.
* If both are received in the order above, the second adds the vector features to the list of raster features as desired.
* If both are received in the reverse order, the vector-feature click kicks off the same behavior as the other click would have;
* and when the next click is received, it is ignored - again, as desired.
*/

function featurePicked(leaflet, entity, event) {
    pickFeatures(leaflet, event.latlng);

    // Ignore clicks on the feature highlight.
    if (entity && entity.entityCollection && entity.entityCollection.owner && entity.entityCollection.owner.name === GlobeOrMap._featureHighlightName) {
        return;
    }

    var feature = Feature.fromEntity(entity);
    leaflet._pickedFeatures.features.push(feature);

    if (entity.position) {
        leaflet._pickedFeatures.pickPosition = entity.position._value;
    }
}

function pickFeatures(leaflet, latlng, tileCoordinates, existingFeatures) {
    if (defined(leaflet._pickedFeatures)) {
        // Picking is already in progress.
        return;
    }

    leaflet._pickedFeatures = new PickedFeatures();

    if (defined(existingFeatures)) {
        leaflet._pickedFeatures.features = existingFeatures;
    }

    // We run this later because vector click events and the map click event can come through in any order, but we can
    // be reasonably sure that all of them will be processed by the time our runLater func is invoked.
    var cleanup = runLater(function() {
        // Set this again just in case a vector pick came through and reset it to the vector's position.
        var newPickLocation = Ellipsoid.WGS84.cartographicToCartesian(pickedLocation);
        var mapInteractionModeStack = leaflet.terria.mapInteractionModeStack;
        if (defined(mapInteractionModeStack) && mapInteractionModeStack.length > 0) {
            mapInteractionModeStack[mapInteractionModeStack.length - 1].pickedFeatures.pickPosition = newPickLocation;
        } else if (defined(leaflet.terria.pickedFeatures)) {
            leaflet.terria.pickedFeatures.pickPosition = newPickLocation;
        }

        // Unset this so that the next click will start building features from scratch.
        leaflet._pickedFeatures = undefined;
    });

    var activeItems = leaflet.terria.nowViewing.items;
    tileCoordinates = defaultValue(tileCoordinates, {});

    var pickedLocation = Cartographic.fromDegrees(latlng.lng, latlng.lat);
    leaflet._pickedFeatures.pickPosition = Ellipsoid.WGS84.cartographicToCartesian(pickedLocation);

    // We want the all available promise to return after the cleanup one to make sure all vector click events have resolved.
    var promises = [cleanup].concat(activeItems.filter(function(item) {
        return item.isEnabled && item.isShown && defined(item.imageryLayer) && defined(item.imageryLayer.pickFeatures);
    }).map(function(item) {
        var imageryLayerUrl = item.imageryLayer.imageryProvider.url;
        var longRadians = CesiumMath.toRadians(latlng.lng);
        var latRadians = CesiumMath.toRadians(latlng.lat);

        return when(tileCoordinates[imageryLayerUrl] || item.imageryLayer.getFeaturePickingCoords(leaflet.map, longRadians, latRadians))
            .then(function(coords) {
                return item.imageryLayer.pickFeatures(coords.x, coords.y, coords.level, longRadians, latRadians).then(function(features) {
                    return {
                        features: features,
                        imageryLayer: item.imageryLayer,
                        coords: coords
                    };
                });
            });
    }));

    var pickedFeatures = leaflet._pickedFeatures;
    pickedFeatures.allFeaturesAvailablePromise = when.all(promises).then(function(results) {
        // Get rid of the cleanup promise
        var promiseResult = results.slice(1);

        pickedFeatures.isLoading = false;
        pickedFeatures.providerCoords = {};

        var filteredResults = promiseResult.filter(function(result) {
            return defined(result.features) && result.features.length > 0;
        });

        pickedFeatures.providerCoords = filteredResults.reduce(function(coordsSoFar, result) {
            coordsSoFar[result.imageryLayer.imageryProvider.url] = result.coords;
            return coordsSoFar;
        }, {});

        pickedFeatures.features = filteredResults.reduce(function(allFeatures, result) {
            return allFeatures.concat(result.features.map(function(feature) {
                feature.imageryLayer = result.imageryLayer;

                // For features without a position, use the picked location.
                if (!defined(feature.position)) {
                    feature.position = pickedLocation;
                }

                return leaflet._createFeatureFromImageryLayerFeature(feature);
            }));
        }, pickedFeatures.features);
    }).otherwise(function(e) {
        pickedFeatures.isLoading = false;
        pickedFeatures.error = 'An unknown error occurred while picking features.';

        throw e;
    });

    var mapInteractionModeStack = leaflet.terria.mapInteractionModeStack;
    if (defined(mapInteractionModeStack) && mapInteractionModeStack.length > 0) {
        mapInteractionModeStack[mapInteractionModeStack.length - 1].pickedFeatures = leaflet._pickedFeatures;
    } else {
        leaflet.terria.pickedFeatures = leaflet._pickedFeatures;
    }
}

function selectFeature(leaflet) {
    var feature = leaflet.terria.selectedFeature;

    leaflet._highlightFeature(feature);

    if (defined(feature) && defined(feature.position)) {
        var cartographic = Ellipsoid.WGS84.cartesianToCartographic(feature.position.getValue(leaflet.terria.clock.currentTime), cartographicScratch);
        leaflet._selectionIndicator.setLatLng([CesiumMath.toDegrees(cartographic.latitude), CesiumMath.toDegrees(cartographic.longitude)]);
        animateSelectionIndicatorAppear(leaflet);
    } else {
        animateSelectionIndicatorDepart(leaflet);
    }
}

function startTweens(leaflet) {
    if (leaflet._tweensAreRunning) {
        return;
    }

    if (leaflet._tweens.length === 0) {
        return;
    }

    leaflet._tweens.update();

    if (leaflet._tweens.length !== 0) {
        cesiumRequestAnimationFrame(startTweens.bind(undefined, leaflet));
    }
}

function animateSelectionIndicatorAppear(leaflet) {
    if (defined(leaflet._selectionIndicatorTween)) {
        if (leaflet._selectionIndicatorIsAppearing) {
            // Already appearing; don't restart the animation.
            return;
        }
        leaflet._selectionIndicatorTween.cancelTween();
        leaflet._selectionIndicatorTween = undefined;
    }

    var style = leaflet._selectionIndicatorDomElement.style;

    leaflet._selectionIndicatorIsAppearing = true;
    leaflet._selectionIndicatorTween = leaflet._tweens.add({
        startObject: {
            scale: 2.0,
            opacity: 0.0,
            rotate: -180
        },
        stopObject: {
            scale: 1.0,
            opacity: 1.0,
            rotate: 0
        },
        duration: 0.8,
        easingFunction: EasingFunction.EXPONENTIAL_OUT,
        update: function(value) {
            style.opacity = value.opacity;
            style.transform = 'scale(' + (value.scale) + ') rotate(' + value.rotate + 'deg)';
        },
        complete: function() {
            leaflet._selectionIndicatorTween = undefined;
        },
        cancel: function() {
            leaflet._selectionIndicatorTween = undefined;
        }
    });

    startTweens(leaflet);
}

function animateSelectionIndicatorDepart(leaflet) {
    if (defined(leaflet._selectionIndicatorTween)) {
        if (!leaflet._selectionIndicatorIsAppearing) {
            // Already disappearing, dont' restart the animation.
            return;
        }
        leaflet._selectionIndicatorTween.cancelTween();
        leaflet._selectionIndicatorTween = undefined;
    }

    var style = leaflet._selectionIndicatorDomElement.style;

    leaflet._selectionIndicatorIsAppearing = false;
    leaflet._selectionIndicatorTween = leaflet._tweens.add({
        startObject: {
            scale: 1.0,
            opacity: 1.0
        },
        stopObject: {
            scale: 1.5,
            opacity: 0.0
        },
        duration: 0.8,
        easingFunction: EasingFunction.EXPONENTIAL_OUT,
        update: function(value) {
            style.opacity = value.opacity;
            style.transform = 'scale(' + value.scale + ') rotate(0deg)';
        },
        complete: function() {
            leaflet._selectionIndicatorTween = undefined;
        },
        cancel: function() {
            leaflet._selectionIndicatorTween = undefined;
        }
    });

    startTweens(leaflet);
}

module.exports = Leaflet;
