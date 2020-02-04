// Initialize leaflet.js
var L = require('leaflet');
require('leaflet-draw');
L.RasterCoords = require('leaflet-rastercoords');

// server ip
var serverIp = "http://127.0.0.1:3333";

var img = [
    34862,
    30281
];

// Initialize the map

var map = L.map('map');

var rc = new L.RasterCoords(map, img);
map.setMaxZoom(rc.zoomLevel());
map.setView(rc.unproject([img[0], img[1]]), 3);

L.tileLayer('./tiles/{z}/{x}/{y}.png', {
    attribution: '',
    bounds: [[0, -180], [86, 12]],
    noWrap: true
}).addTo(map);

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
                    elementArray = await JSON.parse(element);
                    elementArray.forEach(inputCoordinate => {
                        coordinates.push(rc.unproject(inputCoordinate))
                    })
                    L.polyline(coordinates, {
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
                            opacity: 0.5,
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
                    }).addTo(drawnItems);
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
                    L.circle(rc.unproject(coordinates), element.radius, {
                        shapeOptions: {
                            stroke: true,
                            color: '#3388ff',
                            weight: 4,
                            opacity: 0.5,
                            fill: true,
                            fillColor: null,
                            fillOpacity: 0.2,
                            clickable: true
                        },
                        showRadius: true,
                        metric: true,
                        feet: true,
                        nautic: false
                    }).addTo(drawnItems);
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
                    L.marker(rc.unproject(coordinates), {
                        icon: new L.Icon.Default(),
                        repeatMode: false,
                        zIndexOffset: 2000
                    }).addTo(drawnItems);
                });
            }
        });
}

//! on creation of drawing
map.on(L.Draw.Event.CREATED, function (e) {
    var type = e.layerType,
        layer = e.layer;

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

    drawnItems.addLayer(layer);
});

//! on deletion of drawing
map.on(L.Draw.Event.DELETED, function (e) {
    var layers = e.layers;
    layers.eachLayer(layer => {
        if (layer instanceof L.Polyline && !(layer instanceof L.Polygon)) {
            var latlng = [];
            layer.getLatLngs().forEach(array => {
                latlng.push(rc.project(array));
            });
            console.log("fetch")
            console.log(JSON.stringify(latlng))
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
            if (layer instanceof L.Circle) {
                var coordinates = rc.project(layer.getLatLng());
                fetch(`${serverIp}/deletecircle`, {
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