
mapboxgl.accessToken = 'pk.eyJ1IjoidGhvbWJsciIsImEiOiJja2dxbmdseTkwNnVpMnlxd2RjcXF2bHd2In0.-nQuV-bVYgtHWJls-534pw';

const map = new mapboxgl.Map({
    container: 'map',
    style: 'mapbox://styles/mapbox/outdoors-v11', // stylesheet location
    center: [4.3528, 50.8466], // starting position [lng, lat]
    zoom: 2, // starting zoom
    maxZoom: 9
});

map.addControl(new mapboxgl.NavigationControl({
        position: "top-left" // The controls appear at the top left
    }
));

const features = Array();

d3.json("datasets/fossils.json").then(function(data) {
    for(let i = 0; i < data.length; i++) {
        let point = {
            type : "Feature",
            geometry : {
                type : "Point",
                coordinates : [data[i].longitude, data[i].latitude],
            },
            properties : {
                name : data[i].name,
            }
        }
        features.push(point);
    }

    //data.forEach((item, index) => new mapboxgl.Marker().setLngLat([item['longitude'], item['latitude']]).addTo(map));
});

map.on("load", function() {
    let featureCollection = {type : "FeatureCollection", features : features};

    map.addSource('dinos', {
        'type': 'geojson',
        'data': featureCollection
    });

    map.addLayer({
        id: "dinosaurs",
        type: "circle",
        source: 'dinos',
        paint: {
            "circle-radius": 5,
            "circle-color": "#0082a3",
            "circle-opacity": 0.6,
            "circle-stroke-width": 1,
            "circle-stroke-color": "#004d60"
        }
    });
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
