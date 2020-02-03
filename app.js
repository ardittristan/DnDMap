// Initialize leaflet.js
const L = require('leaflet');
require('leaflet-draw');


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
    edit: {
        featureGroup: drawnItems
    }
});
map.addControl(drawControl);

map.on(L.Draw.Event.CREATED, function (e) {
    var type = e.layerType,
        layer = e.layer;

        if (type === "polyline") {
            layer.toGeoJSON()
        }

    drawnItems.addLayer(layer);
});

map.on(L.Draw.Event.EDITED, function(e) {

})

map.on(L.Draw.Event.DELETED, function(e) {

})