
mapboxgl.accessToken = 'pk.eyJ1IjoidGhvbWJsciIsImEiOiJja2dxbmdseTkwNnVpMnlxd2RjcXF2bHd2In0.-nQuV-bVYgtHWJls-534pw';

var map = new mapboxgl.Map({
    container: 'map',
    style: 'mapbox://styles/mapbox/outdoors-v11', // stylesheet location
    center: [4.3528, 50.8466], // starting position [lng, lat]
    zoom: 2, // starting zoom
    maxZoom: 9
});

d3.json("datasets/fossils.json").then(function(data) {
    // data.forEach((item, index) => new mapboxgl.Marker().setLngLat([item['longitude'], item['latitude']]).addTo(map));
});

d3.json("datasets/gts_tree.json").then(function(data) {
    // console.log(data[0]);
});

d3.csv("datasets/dinosaurs.csv").then(function(data) {
    // console.log(data[0]);
});

d3.tsv("datasets/gts.tsv").then(function(data) {
    // data.forEach((item, index) => console.log(index, item['type']))
});
