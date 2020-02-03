// Initialize leaflet.js
const L = require('leaflet');
require('leaflet-draw');

// server ip
var serverIp = "http://127.0.0.1:3333";


// Initialize the map
var mapMinZoom = 0;
var mapMaxZoom = 8;

var map = L.map('map', {
    maxZoom: mapMaxZoom,
    minZoom: mapMinZoom
}).setView([-66, -76], 3);

L.tileLayer('./map/{z}/{x}/{y}.png', {
    attribution: '',
    tms: true,
    bounds: [[0, -180], [-256, 27]],
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


//* on creation of drawing
map.on(L.Draw.Event.CREATED, function (e) {
    var type = e.layerType,
        layer = e.layer;

    if (type === "polyline") {
        var GeoJSONLayer = layer.toGeoJSON();
        fetch(`${serverIp}/polyline`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                polyline: JSON.stringify(GeoJSONLayer)
            })
        });
    } else
        if (type === "circle") {
            var GeoJSONLayer = layer.toGeoJSON();
            fetch(`${serverIp}/circle`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    circle: JSON.stringify(GeoJSONLayer),
                    radius: layer.getRadius()
                })
            });
        } else
            if (type === "marker") {
                var GeoJSONLayer = layer.toGeoJSON();
                fetch(`${serverIp}/marker`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({
                        marker: JSON.stringify(GeoJSONLayer)
                    })
                });
            }

    drawnItems.addLayer(layer);
});

map.on(L.Draw.Event.DELETED, function (e) {
    var layers = e.layers;
    console.log(e);
    console.log(layers);
    layers.eachLayer(layer => {
        if (layer instanceof L.Polyline && !(layer instanceof L.Polygon)) {
            var GeoJSONLayer = layer.toGeoJSON();
            fetch(`${serverIp}/deletepolyline`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    polyline: JSON.stringify(GeoJSONLayer)
                })
            });
        } else
            if (layer instanceof L.Circle) {
                var GeoJSONLayer = layer.toGeoJSON();
                fetch(`${serverIp}/deletecircle`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({
                        circle: JSON.stringify(GeoJSONLayer),
                        radius: layer.getRadius()
                    })
                });
            } else
                if (layer instanceof L.Marker) {
                    var GeoJSONLayer = layer.toGeoJSON();
                    fetch(`${serverIp}/deletemarker`, {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/json'
                        },
                        body: JSON.stringify({
                            marker: JSON.stringify(GeoJSONLayer)
                        })
                    });
                }
    });
});