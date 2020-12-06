
mapboxgl.accessToken = 'pk.eyJ1IjoidGhvbWJsciIsImEiOiJja2dxbmdseTkwNnVpMnlxd2RjcXF2bHd2In0.-nQuV-bVYgtHWJls-534pw';

var map = new mapboxgl.Map({
    container: 'map',
    style: 'mapbox://styles/mapbox/outdoors-v11', // stylesheet location
    center: [4.3528, 50.8466], // starting position [lng, lat]
    zoom: 2, // starting zoom
    maxZoom: 9
});


function getGeoJSON(points) {
    const diets = {'carnivorous': 'Carnivore', 'herbivorous': 'Herbivore'};
    const zones = {'land': 'Terrestre', 'aquatic': 'Aquatique', 'air': 'Volant'};
    let features = Array();
    for(let i = 0; i < points.length; i++) {
        let species = points[i]["species"];
        let n = Math.floor((Math.random() * 3) + 1);
        let picture = `images/${species}/${species}${n}.png`;
        let percent = percentage(points[i]['distance']);
        let point = {type : "Feature",
                        geometry : {
                            type : "Point",
                            coordinates : [points[i]["longitude"], points[i]["latitude"]]
                        },
                        properties : {
                            name : points[i]["name"],
                            distance : points[i]["distance"],
                            percentage: percent,
                            popup : 
                                `<strong>${points[i]["name"]}</strong>
                                <img src="${picture}" alt="foo" class="avatar">
                                <p><strong>Affinité: ${percent}%</strong><p>
                                <p>Age: ${points[i]["age"]} Ma</p>
                                <p>Taille: ${points[i]["size"]} m</p>
                                <p>Poids: ${points[i]["weight"]} kg</p>
                                <p>Vitesse: ${points[i]["speed"]} kmh</p>
                                <p>Alimentation: ${diets[points[i]['diet']]}</p>
                                <p>Habitat: ${zones[points[i]['zone']]}</p>`
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
    species: "indifferent"
};

/*
Return the "distance" between a given dino specified by point and the preferences
*/
function distanceFromPreference(point) {
    /*var ddiet;
    if (preference['diet'] == "indifferent") {
        ddiet = 0;
    } else {
        // NB. false will be interpreted as 0
        ddiet = preference['diet'] != point['diet'];
    }
    var dspecies;
    if (preference['species'] == 'indifferent') {
        dspecies = 0;
    } else {
        dspecies = preference['species'] != point['species'];
    }*/
    // Each component is normalized by its maximum theoretical value
    return Math.sqrt(
        (useAge * (preference['age'] - point['age'])/240 )**2
        + (useSize * (preference['size'] - point['size'])/35 )**2
        + (useWeight * (preference['weight'] - point['weight'])/60000 )**2
        + (useSpeed * (preference['speed'] - point['speed'])/110 )**2
        //+ ddiet
        //+ dspecies
        //+ zoneDistance(point)
        );
}

function zoneDistance(point) {
    // N.B. When none of the zone checkboxes are ticked, this will return 1
    if(useLand && point['zone']=="land") {
        return 0;
    } else if(useSea && point['zone']=="aquatic") {
        return 0;
    } else if(useAir && point['zone']=="air") {
        return 0;
    }
    return 1;
}

function percentage(distance) {
    // the 3 is for  diet, zone and species, which are always counted in order to avoid dividing by 0.
    let n = useAge + useSize + useWeight + useSpeed;
    if (n==0) {
        return 0;
    }
    return Math.round(100*(n-distance)/n);
}

predDiet = function(dino) {
    if (preference['diet'] == "indifferent") {
        return true;
    } else {
        return preference['diet'] == dino['diet'];
    }
}

predZone = function(dino) {
    if (useLand && dino['zone']=="land") {
        return true;
    } else if (useSea && dino['zone']=="aquatic") {
        return true;
    } else if (useAir && dino['zone']=="air") {
        return true;
    } else {
        return false;
    }
}

predSpecies = function(dino) {
    if (preference['species'] == "indifferent") {
        return true;
    } else {
        return preference['species'] == dino['species'];
    }
}

/*
Update the points shown on map only showing the 15 closest points to the preference and fly to the closest one.
*/
function updateSelection() {
    console.log(preference);
    fossils.forEach(function(point, index) {
        fossils[index]['distance'] = distanceFromPreference(point);
    });
    let filtered = fossils.filter(
        (dino) => predDiet(dino) && predZone(dino) && predSpecies(dino)
    );
    let mapped = filtered.map(function(point, i) {
        return { index: i, value : point['distance']};
    });
    mapped.sort(function(a,b) {return (a.value - b.value);});
    let sorted = (mapped.slice(0,15)).map(function(el) {
        return filtered[el.index];
    });
    clearHover();
    if (showAllDinos) {
        showPointsOnMap(filtered);
    } else {
        showPointsOnMap(sorted);
    }
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

var ageCheckbox = document.getElementById("ageCheckbox");
var useAge = true;
var ageSlider = document.getElementById("ageSlider");
var ageLabel = document.getElementById("ageLabel");
ageSlider.oninput = function() {
    ageLabel.innerHTML = this.value + " Ma";
    preference['age'] = parseInt(this.value,10);
    updateSelection();
}
ageCheckbox.onclick = function() {
    useAge = this.checked;
    updateSelection();
}

var sizeCheckbox = document.getElementById("sizeCheckbox");
var useSize = true;
var sizeSlider = document.getElementById("sizeSlider");
var sizeLabel = document.getElementById("sizeLabel")
sizeSlider.oninput = function() {
    sizeLabel.innerHTML = this.value + " m";
    preference['size'] = parseInt(this.value,10);
    updateSelection();
}
sizeCheckbox.onclick = function() {
    useSize = this.checked;
    updateSelection();
}

var weightCheckbox = document.getElementById("weightCheckbox");
var useWeight = true;
var weightSlider = document.getElementById("weightSlider");
var weightLabel = document.getElementById("weightLabel");
weightSlider.oninput = function() {
    weightLabel.innerHTML = this.value + " kg";
    preference['weight'] = parseInt(this.value,10);
    updateSelection();
}
weightCheckbox.onclick = function() {
    useWeight = this.checked;
    updateSelection();
}

var speedCheckbox = document.getElementById("speedCheckbox");
var useSpeed = true;
var speedSlider = document.getElementById("speedSlider");
var speedLabel = document.getElementById("speedLabel");
speedSlider.oninput = function() {
    speedLabel.innerHTML = this.value + " kmh";
    preference['speed'] = parseInt(this.value,10);
    updateSelection();
}
speedCheckbox.onclick = function() {
    useSpeed = this.checked;
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

var landCheckbox = document.getElementById("landCheckbox");
var useLand = true;
landCheckbox.onclick = function() {
    useLand = this.checked;
    updateSelection();
}
var seaCheckbox = document.getElementById("seaCheckbox");
var useSea = true;
seaCheckbox.onclick = function() {
    useSea = this.checked;
    updateSelection();
}
var airCheckbox = document.getElementById("airCheckbox");
var useAir = true;
airCheckbox.onclick = function() {
    useAir = this.checked;
    updateSelection();
}

const species = ["indifférent"];
var speciesSelect = document.getElementById('species');
speciesSelect.onchange = function() {
    if(this.value == "indifférent") {
        preference['species'] = "indifferent";
    } else {
        preference['species'] = this.value;
    }
    updateSelection();
}

var showAllDinosCheckbox = document.getElementById('showAllDinos');
var showAllDinos = false;
showAllDinosCheckbox.onclick = function() {
    showAllDinos = this.checked;
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
            "circle-opacity": ['*', 0.7, ['^', 2, ['*', -5, ['get', 'distance']]]],
            "circle-stroke-width": 1,
            "circle-stroke-color": "#000",
            'circle-radius': ['case',
                // The radius of the circle decreases exponentially with the distance to the preference, with a maximum of 10 (20 if hovered)
                ['boolean', ['feature-state', 'hover'], false],
                    ['+', 2, ['*', 20, ['^', 2, ['*', -4, ['get', 'distance']]]]],
                    ['+', 2, ['*', 10, ['^', 2, ['*', -4, ['get', 'distance']]]]]
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

function capitalize(string) {
    return string.replace(/^\w/, (c) => c.toUpperCase());
}

d3.csv("datasets/dinosaurs.csv").then(function(data) {
    console.log(data);
    data.forEach(function(item) {
        species.push(item['dinosaur']);
    })
    console.log(species);
    let speciesOptions = species.map(
        (value) => `<option value="${value}">${capitalize(value)}</option>`);
    speciesSelect.innerHTML = speciesOptions.join();
});

d3.tsv("datasets/gts.tsv").then(function(data) {
    // data.forEach((item, index) => console.log(index, item['type']))
});


// Code for displaying the popup when hovering a circle on the map.
var dinoID = null;

map.on("mousemove", 'dinos', (e) => {
    map.getCanvas().style.cursor = 'pointer';

    //var dinoName = e.features[0].properties.name;
    let popupHTML = e.features[0].properties.popup;
    let coordinates = e.features[0].geometry.coordinates.slice();

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