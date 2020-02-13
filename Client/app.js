//! initialize requirements
const L = require('leaflet');
const toastr = require('toastr');
const popupS = require('popups');
const textToImage = require('text-to-image');
const { read } = require('jimp/browser/lib/jimp.min.js');
const sizeOf = require('image-size');
require('leaflet-draw');
require('leaflet-edgebuffer');
require('./node_modules/leaflet-styleeditor/dist/javascript/Leaflet.StyleEditor.min');
require('leaflet.control.layers.tree');
require('leaflet-easybutton');
require('./libs/Leaflet.Liveupdate/leaflet-liveupdate');
require('./libs/L.Control.BoxZoom/leaflet-control-boxzoom');
require('./libs/leaflet-view-meta');
var config = require('./config/config.json');
L.RasterCoords = require('leaflet-rastercoords');

//* set server ip
var serverIp = config.ip;

var img = [
    34862,
    30281
];

//* Initialize the map

var map = L.map('map');

//* lay the coordinates out
var rc = new L.RasterCoords(map, img);
map.setMaxZoom(rc.zoomLevel());
map.setView(rc.unproject([img[0], img[1]]), 3);
map.setMaxBounds([[13.54, -180], [86, 11.5]]);

// map layer
L.tileLayer('./tiles/{z}/{x}/{y}.png', {
    attribution: "Don't edit while live update is on",
    bounds: [[13.54, -180], [86, 11.5]],
    noWrap: true,
    edgeBufferTiles: 2,
    zIndexOffset: 1
}).addTo(map);

// hex layer
var hexLayer = L.tileLayer('./hexTiles/{z}/{x}/{y}.png', {
    bounds: [[13.54, -180], [86, 11.5]],
    noWrap: true,
    edgeBufferTiles: 2,
    zIndexOffset: 2,
    minZoom: 4
});

// color layer
var colorLayer = L.tileLayer('./colorOverlay/{z}/{x}/{y}.png', {
    bounds: [[13.54, -180], [86, 11.5]],
    noWrap: true,
    edgeBufferTiles: 2,
    zIndexOffset: 3
});

// url layer
var viewMeta = L.control.viewMeta({
    position: 'bottomleft'
}).addTo(map);
viewMeta.parseParams();
map.removeControl(viewMeta);

//* add toolbars
// editor button
let styleEditor = L.control.styleEditor({
    position: 'topleft',
    useGrouping: false,
    colorRamp: [],
    openOnLeafletDraw: false,
    ignoreLayerTypes: ["Marker"]
});
map.addControl(styleEditor);

var drawnItems = new L.FeatureGroup();
map.addLayer(drawnItems);

var mapNames = new L.LayerGroup();

// remove stuff from toolbar
L.EditToolbar.Delete.include({
    removeAllLayers: false
});

L.Control.EasyButton.mergeOptions({
    position: 'bottomleft'
});

// drawing
var drawControl = new L.Control.Draw({
    draw: {
        polygon: false,
        rectangle: false,
        circlemarker: false,
        polyline: {
            showLength: false
        },
        circle: {
            showRadius: false
        }
    },
    edit: {
        featureGroup: drawnItems,
        edit: false
    }
});
map.addControl(drawControl);

// layer control
var overlaysTree = [
    { label: 'Markers', layer: drawnItems },
    { label: 'Hex Layer', layer: hexLayer },
    { label: 'Color Overlay', layer: colorLayer },
    { label: 'Country Names', layer: mapNames }
];
L.control.layers.tree([], overlaysTree, { collapsed: false }).addTo(map);

// zoom control
L.Control.boxzoom({
    position: 'topright'
}).addTo(map);

// live updating
L.control.liveupdate({
    update_map: function () {
        drawnItems.eachLayer(function (layer) {
            layer.remove();
        });
        mapNames.eachLayer(function (layer) {
            layer.remove();
        });
        fetchOldMarkers();
    },
    position: 'bottomright',
    interval: '10000'
}).addTo(map)
    .startUpdating()
    .toggleUpdating();

// position share
L.easyButton('fa-link', function () {
    viewMeta.addTo(map).update();
    map.removeControl(viewMeta);
    toastr.info('Copy link from url to share current map position');
}, 'Get link of current position').addTo(map);

// add names to map
L.easyButton('fa-lock', addTextOverlay, 'For DM only').addTo(map);

//! create old objects on page load
setTimeout(fetchOldMarkers, 100);
async function fetchOldMarkers() {
    //* fetch polylines
    fetch(`${serverIp}/fetchpolyline`)
        .then(async function (response) {
            var responseJSON = await response.json();
            var array = responseJSON.polyline;
            if (array.length != 0) {
                array.forEach(async element => {
                    var coordinates = [];
                    JSON.parse(element.coordinates).forEach(inputCoordinate => {
                        coordinates.push(rc.unproject(inputCoordinate));
                    });
                    var popupContent = null;
                    if (!(element.text == null || element === "")) {
                        popupContent = element.text;
                    }
                    // create polyline
                    var layer = L.polyline(coordinates, {
                        allowIntersection: true,
                        repeatMode: false,
                        drawError: {
                            color: '#b00b00',
                            timeout: 2500
                        },
                        icon: new L.DivIcon({
                            iconSize: new L.Point(8, 8),
                            className: 'leaflet-div-icon leaflet-editing-icon'
                        }),
                        touchIcon: new L.DivIcon({
                            iconSize: new L.Point(20, 20),
                            className: 'leaflet-div-icon leaflet-editing-icon leaflet-touch-icon'
                        }),
                        guidelineDistance: 20,
                        maxGuideLineLength: 4000,
                        shapeOptions: {
                            stroke: true,
                            color: '#3388ff',
                            weight: 4,
                            opacity: 0.65,
                            fill: false,
                            clickable: true
                        },
                        metric: true,
                        feet: true,
                        nautic: false,
                        showLength: false,
                        zIndexOffset: 2000,
                        factor: 1,
                        maxPoints: 0
                    });
                    // add popup if exists
                    layer.bindPopup(popupContent);
                    layer.addTo(drawnItems);
                });
            }
        });
    //* fetch circles
    fetch(`${serverIp}/fetchcircle`).
        then(async function (response) {
            var responseJSON = await response.json();
            var array = responseJSON.circle;
            if (array.length != 0) {
                array.forEach(async element => {
                    var coordinates = await JSON.parse(element.latlng);
                    var popupContent = null;
                    if (!(element.text === null || element.text === "")) {
                        popupContent = element.text;
                    }
                    // add circle
                    var layer = L.circle(rc.unproject(coordinates), element.radius, {
                        shapeOptions: {
                            stroke: true,
                            color: '#3388ff',
                            weight: 4,
                            opacity: 0.65,
                            fill: true,
                            fillColor: null,
                            fillOpacity: 0.3,
                            clickable: true
                        },
                        showRadius: false,
                        metric: true,
                        feet: true,
                        nautic: false
                    });
                    // add popup if exists
                    layer.bindPopup(popupContent);
                    layer.addTo(drawnItems);
                });
            }
        });
    //* fetch markers
    fetch(`${serverIp}/fetchmarker`)
        .then(async function (response) {
            var responseJSON = await response.json();
            var array = responseJSON.marker;
            if (array.length != 0) {
                array.forEach(async element => {
                    coordinates = await JSON.parse(element);
                    // add marker
                    L.marker(rc.unproject(coordinates), {
                        icon: new L.Icon.Default(),
                        repeatMode: false,
                        zIndexOffset: 2000
                    }).addTo(drawnItems);
                    //? doesn't allow for popups unless I do something fucky, idk
                });
            }
        });
    //* fetch text
    fetch(`${serverIp}/fetchtext`)
        .then(async function (response) {
            var responseJSON = await response.json();
            var array = responseJSON.text;
            if (array.length != 0) {
                array.forEach(async element => {
                    var coordinates = await JSON.parse(element.latlng);
                    var imageOverlay = L.imageOverlay(element.image, coordinates, { zIndex: 1000 });
                    imageOverlay.addTo(mapNames);
                });
            }
        });
}

//! on creation of drawing
map.on(L.Draw.Event.CREATED, function (e) {
    var type = e.layerType,
        layer = e.layer;

    // if polyline send to server
    if (type === "polyline") {
        var latlng = [];
        layer.getLatLngs().forEach(array => {
            latlng.push(rc.project(array));
        });
        fetch(`${serverIp}/polyline`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                latlng: JSON.stringify(latlng)
            })
        });
    } else
        // if circle send to server
        if (type === "circle") {
            var coordinates = rc.project(layer.getLatLng());
            fetch(`${serverIp}/circle`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    latlng: JSON.stringify(coordinates),
                    radius: layer.getRadius()
                })
            });
        } else
            // if marker send to server
            if (type === "marker") {
                var coordinates = rc.project(layer.getLatLng());
                fetch(`${serverIp}/marker`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({
                        latlng: JSON.stringify(coordinates)
                    })
                });
            }
    // add layer to the editable layer
    drawnItems.addLayer(layer);
});

//! on deletion of drawing
map.on(L.Draw.Event.DELETED, function (e) {
    var layers = e.layers;
    layers.eachLayer(layer => {
        // check if it's a polyline
        if (layer instanceof L.Polyline && !(layer instanceof L.Polygon)) {
            var latlng = [];
            // get all polyline coordinates
            layer.getLatLngs().forEach(array => {
                latlng.push(rc.project(array));
            });
            fetch(`${serverIp}/deletepolyline`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    latlng: JSON.stringify(latlng)
                })
            });
        } else
            // check if it's a circle
            if (layer instanceof L.Circle) {
                var coordinates = rc.project(layer.getLatLng());
                fetch(`${serverIp}/deletecircle`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({
                        latlng: JSON.stringify(coordinates)
                    })
                });
            } else
                // check if it's a marker
                if (layer instanceof L.Marker) {
                    var coordinates = rc.project(layer.getLatLng());
                    fetch(`${serverIp}/deletemarker`, {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/json'
                        },
                        body: JSON.stringify({
                            latlng: JSON.stringify(coordinates)
                        })
                    });
                }
    });
});

//! on editing of marker
map.on('styleeditor:changed', function (layer) {
    // check if it is not a circle
    if (layer.options.radius === undefined || layer.options.radius === null || layer.options.radius === 0) {
        // check if it contains any text
        if (!(layer.options.popupContent === null || layer.options.popupContent === "")) {
            var latlng = [];
            // get all polyline coordinates
            layer.getLatLngs().forEach(array => {
                latlng.push(rc.project(array));
            });
            fetch(`${serverIp}/editpolyline`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    latlng: JSON.stringify(latlng),
                    text: layer.options.popupContent
                })
            });
        }
    }
    else {
        // check if it contains any text
        if (!(layer.options.popupContent === null || layer.options.popupContent === "")) {
            var coordinates = rc.project(layer.getLatLng());
            fetch(`${serverIp}/editcircle`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    latlng: JSON.stringify(coordinates),
                    text: layer.options.popupContent
                })
            });
        }
    }
});

//* change grid opacity on zoom
map.on('zoomend', function () {
    switch (map.getZoom()) {
        case 4:
            hexLayer.setOpacity(1);
            break;
        case 5:
            hexLayer.setOpacity(1);
            break;
        case 6:
            hexLayer.setOpacity(0.8);
            break;
        case 7:
            hexLayer.setOpacity(0.6);
            break;
        case 8:
            hexLayer.setOpacity(0.4);
            break;
    };


});


//! functions
//* adds a text on the map
async function addTextOverlay() {
    // start prompts
    popupS.prompt({
        content: "Fill in password",
        onSubmit: function (val) {
            // check if password is correct
            if (val !== config.password) {
                popupS.alert({
                    content: "This is for DM only"
                });
                return;
            }
            popupS.confirm({
                // ask if the person is where he wants to be
                content: "Is the center of your screen the location where you want the marker?",
                labelOk: "Yes",
                labelCancel: "no",
                onSubmit: function () {
                    popupS.prompt({
                        // ask for name of text
                        content: "What do you want the marker to be called?",
                        onSubmit: function (val) {
                            if (val != "") {
                                viewMeta.addTo(map).update();
                                map.removeControl(viewMeta);
                                var urlParams = new URLSearchParams(window.location.search);
                                var lat = urlParams.get("lat");
                                var lng = urlParams.get("lng");
                                // make image of text
                                textToImage.generate(val, {
                                    maxWidth: 2000,
                                    fontSize: 400,
                                    fontFamily: 'Monotype Corsiva',
                                    lineHeight: 410,
                                    margin: 0,
                                    bgColor: "transparent",
                                    textColor: "black"
                                }).then(dataUrl => {
                                    // make B64 image into image buffer
                                    read(Buffer.from(dataUrl.replace(/^data:image\/png;base64,/, ""), 'base64'))
                                        .then(image => {
                                            // crop transparency off the image
                                            image.autocrop();
                                            // turn image back into B64
                                            image.getBase64Async("image/png").then(image => {
                                                var dimensions = sizeOf(Buffer.from(image.replace(/^data:image\/png;base64,/, ""), 'base64'));
                                                var projection = rc.project([lat, lng]),
                                                    // image bounds are moved 50% left and 50% up so it's centered
                                                    imageBounds = [
                                                        rc.unproject([projection.x - (dimensions.width / 2), projection.y - (dimensions.height / 2)]),
                                                        rc.unproject([projection.x + (dimensions.width / 2), projection.y + (dimensions.height / 2)])
                                                    ];
                                                // make and add image overlay
                                                var imageOverlay = L.imageOverlay(image, imageBounds, { zIndex: 1000 });
                                                imageOverlay.addTo(mapNames);
                                                // send input data to server
                                                fetch(`${serverIp}/addtext`, {
                                                    method: 'POST',
                                                    headers: {
                                                        'Content-Type': 'application/json'
                                                    },
                                                    body: JSON.stringify({
                                                        name: val,
                                                        latlng: JSON.stringify(imageBounds),
                                                        image: image
                                                    })
                                                });
                                            });
                                        });
                                });
                            }
                        }
                    });
                },
                onClose: function () {
                    popupS.alert({
                        content: "Please go to the location where you want the marker"
                    });
                }
            });

        }
    });
}