
mapboxgl.accessToken = 'pk.eyJ1IjoidGhvbWJsciIsImEiOiJja2dxbmdseTkwNnVpMnlxd2RjcXF2bHd2In0.-nQuV-bVYgtHWJls-534pw';

var map = new mapboxgl.Map({
    container: 'map',
    style: 'mapbox://styles/mapbox/outdoors-v11', // stylesheet location
    center: [4.3528, 50.8466], // starting position [lng, lat]
    zoom: 2, // starting zoom
    maxZoom: 9
});


function getGeoJSON(points) {
    let features = Array();
    for(let i = 0; i < points.length; i++) {
        let species = points[i]["species"];
        let n = Math.floor((Math.random() * 3) + 1);
        let picture = `images/${species}/${species}${n}.png`;
        let point = {type : "Feature",
                        geometry : {
                            type : "Point",
                            coordinates : [points[i]["longitude"], points[i]["latitude"]]
                        },
                        properties : {
                            name : points[i]["name"],
                            distance : points[i]["distance"],
                            popup : 
                                `<strong>${points[i]["name"]}</strong>
                                <img src="${picture}" alt="foo" class="avatar">
                                <p>Age: ${points[i]["age"]} Ma</p>
                                <p>Taille: ${points[i]["size"]} m</p>
                                <p>Poids: ${points[i]["weight"]} kg</p>
                                <p>Test : ${points[i]["mail"]} </p>
                                <p>Vitesse: ${points[i]["speed"]} kmh</p>`
                        }
                    }
        features.push(point);
    }
    return features;
}

function showPointsOnMap(points) {
    console.log(points);
    let featurecollection = {type : "FeatureCollection", features : getGeoJSON(points)};
    map.getSource('selection').setData(featurecollection);
}

const container = map.getCanvasContainer();

const svg = d3.select(container)
    .append("svg")
        .attr("id", "points_container");

var fossils;
var default_points;
var preference = {
    age : 70,
    size : 10,
    weight : 100,
    speed : 50,
    diet : "indifferent",
    zone : "land"
};

/*
Return the "distance" between a given dino specified by point and the preferences
*/
function distanceFromPreference(point) {
    // Each component is normalized
    var ddiet
    if (preference['diet'] == "indifferent") {
        ddiet = 0;
    } else {
        // NB. false will be interpreted as 0
        ddiet = preference['diet'] != point['diet'];
    }
    return (
        ((preference['age'] - point['age'])/230 )**2
        + ((preference['size'] - point['size'])/35 )**2
        + ((preference['weight'] - point['weight'])/60000 )**2
        + ((preference['speed'] - point['speed'])/110 )**2
        + ddiet
        );
}

/*
Update the points shown on map only showing the 15 closest points to the preference and fly to the closest one.
*/
function updateSelection() {
    console.log(preference);
    fossils.forEach(function(point, index) {
        fossils[index]['distance'] = distanceFromPreference(point);
    });
    var mapped = fossils.map(function(point, i) {
        return { index: i, value : point['distance']};
    });
    mapped.sort(function(a,b) {return (a.value - b.value);});
    let sorted = (mapped.slice(0,15)).map(function(el) {
        return fossils[el.index];
    });
    clearHover();
    //showPointsOnMap(fossils);
    showPointsOnMap(sorted);
    map.flyTo({
        center: [
            sorted[0]['longitude'],
            sorted[0]['latitude']
        ],
        essential: true
    });
}

var popup = new mapboxgl.Popup({
closeButton: false,
closeOnClick: false
});

// Code for the sliders

var ageSlider = document.getElementById("ageSlider");
var ageLabel = document.getElementById("ageLabel");
ageSlider.oninput = function() {
    ageLabel.innerHTML = this.value + " Ma";
    preference['age'] = parseInt(this.value,10);
    updateSelection();
}

var sizeSlider = document.getElementById("sizeSlider");
var sizeLabel = document.getElementById("sizeLabel")
sizeSlider.oninput = function() {
    sizeLabel.innerHTML = this.value + " m";
    preference['size'] = parseInt(this.value,10);
    updateSelection();
}

var weightSlider = document.getElementById("weightSlider");
var weightLabel = document.getElementById("weightLabel");
weightSlider.oninput = function() {
    weightLabel.innerHTML = this.value + " kg";
    preference['weight'] = parseInt(this.value,10);
    updateSelection();
} 

var speedSlider = document.getElementById("speedSlider");
var speedLabel = document.getElementById("speedLabel");
speedSlider.oninput = function() {
    speedLabel.innerHTML = this.value + " kmh";
    preference['speed'] = parseInt(this.value,10);
    updateSelection();
}

var dietSlider = document.getElementById("dietSlider");
var dietLabel = document.getElementById("dietLabel");
dietSlider.oninput = function() {
    const labels = ["Carnivore", "Indifférent", "Herbivore"];
    const values = ["carnivorous", "indifferent", "herbivorous"];
    dietLabel.innerHTML = labels[parseInt(this.value)];
    preference['diet'] = values[parseInt(this.value)];
    updateSelection();
}

// Code for adding the circles on the map

map.on("load", function(){
    map.addSource('selection', {type : 'geojson', data : default_points, generateId: true})
    map.addLayer({
        id : "dinos",
        type : "circle",
        source : 'selection',
        paint : {
            "circle-opacity": ['^', 2, ['*', -5, ['get', 'distance']]],
            "circle-stroke-width": 1,
            "circle-stroke-color": "#000",
            'circle-radius': ['case',
                // The radius of the circle decreases exponentially with the distance to the preference, with a maximum of 10 (20 if hovered)
                ['boolean', ['feature-state', 'hover'], false],
                    ['+', 1, ['*', 20, ['^', 2, ['*', -4, ['get', 'distance']]]]],
                    ['+', 1, ['*', 10, ['^', 2, ['*', -4, ['get', 'distance']]]]]
            ],
            "circle-color": ['case',
                ['boolean', ['feature-state', 'hover'], false],
                "#aa2222",
                "#082a03"
            ]
        }
    })
});

// Code for loading the datasets.

/**
 * N.B. dinos.json is essentially fossils.json, brought to life!
 * It contains only the essential data from fossils.json (name, position, etc) along with values for size, weight, speed, age, etc... generated at random based on the data in dinosaurs.csv and gts.tsv
 */
d3.json("datasets/dinos.json").then(function(data) {
    console.log(data);
    fossils = data;
    fossils.forEach(function(item, index) {
        fossils[index]['distance'] = 0.4;
    })
    console.log(fossils)
    default_points = {type: "FeatureCollection", features: getGeoJSON(data)};
    console.log(default_points);
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


// Code for displaying the popup when hovering a circle on the map.
var dinoID = null;

map.on("mousemove", 'dinos', (e) => {
    map.getCanvas().style.cursor = 'pointer';

    //var dinoName = e.features[0].properties.name;
    var popupHTML = e.features[0].properties.popup;
    var coordinates = e.features[0].geometry.coordinates.slice();

    popup.setLngLat(coordinates).setHTML(popupHTML).addTo(map);

    if (e.features.length > 0) {

        if (dinoID) {
            map.removeFeatureState({
                source: "selection",
                id: dinoID
            });
        }
        dinoID = e.features[0].id;

        map.setFeatureState({
            source: 'selection',
            id: dinoID
        }, {
            hover: true
        });
    }
});

map.on("mouseleave", 'dinos', function() {
    clearHover();
});

function clearHover() {
     if (dinoID) {
        map.setFeatureState({
            source: "selection",
            id: dinoID
        }, {
            hover: false
        });
    }
    dinoID = null;
    map.getCanvas().style.cursor = '';
    popup.remove();   
}