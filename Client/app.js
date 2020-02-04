//! initialize requirements
var L = require('leaflet');
require('leaflet-draw');
require('./libs/Leaflet.StyleEditor.min');
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

L.tileLayer('./tiles/{z}/{x}/{y}.png', {
    attribution: '',
    bounds: [[0, -180], [86, 12]],
    noWrap: true
}).addTo(map);

//* add toolbars
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
var drawControl = new L.Control.Draw({
    draw: {
        polygon: false,
        rectangle: false,
        circlemarker: false
    },
    edit: {
        featureGroup: drawnItems,
        edit: false
    }
});
map.addControl(drawControl);

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
                        showLength: true,
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
                        showRadius: true,
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