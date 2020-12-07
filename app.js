
mapboxgl.accessToken = 'pk.eyJ1IjoidGhvbWJsciIsImEiOiJja2dxbmdseTkwNnVpMnlxd2RjcXF2bHd2In0.-nQuV-bVYgtHWJls-534pw';

var map = new mapboxgl.Map({
    container: 'map',
    style: 'mapbox://styles/mapbox/outdoors-v11', // stylesheet location
    center: [4.3528, 50.8466], // starting position [lng, lat]
    zoom: 0.5, // starting zoom
    maxZoom: 9
});

// background: linear-gradient(to right, #ffd194, #70e1f5);
let colorblind = false;
function toggleColorblind() {
    if (colorblind) {
        document.body.style.background = "linear-gradient(to right, #ffd194, #70e1f5)";
        document.getElementById('color-switch').style.color = '#394a56';
        this.map.setPaintProperty('dinos', 'circle-color', 
            ['case',
                ['boolean', ['feature-state', 'hover'], false],
                [
                    'interpolate', ['linear'],
                    ['get', 'percentage'],
                    0, "#fee6ce",
                    100, "#e6550d"
                ],
                [
                    'interpolate', ['linear'],
                    ['get', 'percentage'],
                    0, "#deebf7",
                    100, "#3182bd"
                ]
            ]
        );
        colorblind = false;
    } else {
        document.body.style.background = "linear-gradient(to right, #de77ae, #7fbc41)";
        document.getElementById('color-switch').style.color = 'white';
        this.map.setPaintProperty('dinos', 'circle-color', 
            ['case',
                ['boolean', ['feature-state', 'hover'], false],
                [
                    'interpolate', ['linear'],
                    ['get', 'percentage'],
                    0, "#f7f7f7",
                    100, "#c51b7d"
                ],
                [
                    'interpolate', ['linear'],
                    ['get', 'percentage'],
                    0, "#f7f7f7",
                    100, "#4d9221"
                ]
            ]
        );
        colorblind = true;
    }
}


function getGeoJSON(points) {
    const diets = {'carnivorous': 'Carnivore', 'herbivorous': 'Herbivore'};
    const zones = {'land': 'Terrestre', 'aquatic': 'Aquatique', 'air': 'Volant'};
    let features = Array();
    for (let i = 0; i < points.length; i++) {

        let species = points[i]["species"];
        let n = Math.floor((Math.random() * 3) + 1);
        let picture = `images/${species}/${species}${n}.png`;
        let percent = percentage(points[i]['distance']);
        let profile = `<div id="dino-${i}">
                            <strong>${points[i]["name"]}</strong>
                            <img src="${picture}" alt="foo" class="avatar">
                            <p><strong>Affinité: ${percent}%</strong></p>
                            <p>Age: ${points[i]["age"]} Ma</p>
                            <p>Taille: ${points[i]["size"]} m</p>
                            <p>Poids: ${points[i]["weight"]} kg</p>
                            <p>Vitesse: ${points[i]["speed"]} kmh</p>
                            <p>Mail: ${points[i]["mail"]}</p>
                        </div>`;
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
                                `<div> ${profile} <button onclick='compare("dino-" + ${i})' class='compare-button'> Comparer </button> </div>`

                        }
                    }
        features.push(point);
    }
    return features;
}

// Add or remove a dino in the comparison zone
function compare(dinoNum) {

    let popupp = document.getElementById(dinoNum);
    let compProfile = document.getElementById(dinoNum + "-comp");

    if (typeof (compProfile) != 'undefined' && compProfile != null) {
        // The profile is already in the comparison zone
        compProfile.remove();
        popupp.nextElementSibling.innerText = "Comparer";
    } else {
        // We add the profile in the comparison zone
        let comparisonZone = document.getElementById("comparison");
        popupp.nextElementSibling.innerText = "Annuler comparaison";
        let clone = popupp.cloneNode(true);
        clone.id += "-comp";
        comparisonZone.appendChild(clone);
    }
}

function showPointsOnMap(points) {
    let featurecollection = { type: "FeatureCollection", features: getGeoJSON(points) };
    map.getSource('selection').setData(featurecollection);
}

const container = map.getCanvasContainer();

const svg = d3.select(container)
    .append("svg")
    .attr("id", "points_container");

var fossils;
var filteredFossils;
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
    // Each component is normalized by its maximum theoretical value
    return Math.sqrt(
        (useAge * (preference['age'] - point['age'])/240 )**2
        + (useSize * (preference['size'] - point['size'])/35 )**2
        + (useWeight * (preference['weight'] - point['weight'])/60000 )**2
        + (useSpeed * (preference['speed'] - point['speed'])/110 )**2
        );
}

function percentage(distance) {
    // the 3 is for  diet, zone and species, which are always counted in order to avoid dividing by 0.
    let n = useAge + useSize + useWeight + useSpeed;
    if (n==0) {
        return 0;
    }
    return Math.round(100* ((n-distance)/n )**4 );
    //return 2 ** (-4*distance);
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

    // Clear the comparison zone
    document.getElementById("comparison").innerHTML = '';

    //console.log(preference);
    
    let mapped = filteredFossils.map(function(point, i) {
        return { index: i, value : point['distance']};
    });
    mapped.sort(function(a,b) {return (a.value - b.value);});
    let sorted = (mapped.slice(0,15)).map(function(el) {
        return filteredFossils[el.index];
    });
    
    //console.log("clear");
    clearHover();
    if (showAllDinos) {
        showPointsOnMap(filteredFossils);
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

function updateFilter() {
    fossils.forEach(function (point, index) {
        fossils[index]['distance'] = distanceFromPreference(point);
    });
    filteredFossils = fossils.filter(
        (dino) => predDiet(dino) && predZone(dino) && predSpecies(dino)
    );
    updateSelection();
}

var popup = new mapboxgl.Popup({
    closeButton: false,
    //closeOnClick: false
});

// Code for the sliders

var ageCheckbox = document.getElementById("ageCheckbox");
var useAge = true;
var ageSlider = document.getElementById("ageSlider");
var ageLabel = document.getElementById("ageLabel");
ageSlider.oninput = function () {
    ageLabel.innerHTML = this.value + " Ma";
    preference['age'] = parseInt(this.value, 10);
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
sizeSlider.oninput = function () {
    sizeLabel.innerHTML = this.value + " m";
    preference['size'] = parseInt(this.value, 10);
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
weightSlider.oninput = function () {
    weightLabel.innerHTML = this.value + " kg";
    preference['weight'] = parseInt(this.value, 10);
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
speedSlider.oninput = function () {
    speedLabel.innerHTML = this.value + " kmh";
    preference['speed'] = parseInt(this.value, 10);
    updateSelection();
}
speedCheckbox.onclick = function() {
    useSpeed = this.checked;
    updateSelection();
}


var dietSlider = document.getElementById("dietSlider");
var dietLabel = document.getElementById("dietLabel");
dietSlider.oninput = function () {
    const labels = ["Carnivore", "Indifférent", "Herbivore"];
    const values = ["carnivorous", "indifferent", "herbivorous"];
    dietLabel.innerHTML = labels[parseInt(this.value)];
    preference['diet'] = values[parseInt(this.value)];
    updateFilter();
}

var landCheckbox = document.getElementById("landCheckbox");
var useLand = true;
landCheckbox.onclick = function() {
    useLand = this.checked;
    updateFilter();
}
var seaCheckbox = document.getElementById("seaCheckbox");
var useSea = true;
seaCheckbox.onclick = function() {
    useSea = this.checked;
    updateFilter();
}
var airCheckbox = document.getElementById("airCheckbox");
var useAir = true;
airCheckbox.onclick = function() {
    useAir = this.checked;
    updateFilter();
}

const species = ["indifférent"];
var speciesSelect = document.getElementById('species');
speciesSelect.onchange = function() {
    if(this.value == "indifférent") {
        preference['species'] = "indifferent";
    } else {
        preference['species'] = this.value;
    }
    updateFilter();
}

var showAllDinosCheckbox = document.getElementById('showAllDinos');
var showAllDinos = false;
showAllDinosCheckbox.onclick = function() {
    showAllDinos = this.checked;
    updateSelection();
}

// Code for adding the circles on the map

map.on("load", function () {
    map.addSource('selection', { type: 'geojson', data: default_points, generateId: true })
    map.addLayer({
        id : "dinos",
        type : "circle",
        source : 'selection',
        paint : {
            "circle-opacity": ['*', 0.9, ['^', 2, ['*', -2, ['get', 'distance']]]],
            "circle-stroke-width": 1,
            "circle-stroke-color": "#000",
            'circle-radius': ['case',
                // The radius of the circle decreases exponentially with the distance to the preference, with a maximum of 10 (20 if hovered)
                ['boolean', ['feature-state', 'hover'], false],
                    ['+', 2, ['*', 0.1, ['get', 'percentage']]],
                    ['+', 2, ['*', 0.05, ['get', 'percentage']]]
            ],
            "circle-color": ['case',
                ['boolean', ['feature-state', 'hover'], false],
                [
                    'interpolate', ['linear'],
                    ['get', 'percentage'],
                    0, "#fee6ce",
                    100, "#e6550d"
                ],
                [
                    'interpolate', ['linear'],
                    ['get', 'percentage'],
                    0, "#deebf7",
                    100, "#3182bd"
                ]
            ]
        }
    })
});

// Code for loading the datasets.

/**
 * N.B. dinos.json is essentially fossils.json, brought to life!
 * It contains only the essential data from fossils.json (name, position, etc) along with values for size, weight, speed, age, etc... generated at random based on the data in dinosaurs.csv and gts.tsv
 */
d3.json("datasets/dinos.json").then(function (data) {
    console.log(data);
    fossils = data;
    fossils.forEach(function (item, index) {
        fossils[index]['distance'] = 0.4;
    })
    console.log(fossils)
    default_points = { type: "FeatureCollection", features: getGeoJSON(data) };
    console.log(default_points);
});


// Code for displaying the popup when clicking a circle on the map.
var dinoID = null;

function capitalize(string) {
    return string.replace(/^\w/, (c) => c.toUpperCase());
}
// Get the name of all the species in the dataset and add them as option to the species selector
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


map.on("click", 'dinos', (e) => {
    // I don't think this is the right way to do this. It's very hacky.
    // - a worried maintainer
    var popupHTML = null;
    let compProfile = document.getElementById("dino-" + e.features[0].id + "-comp");

    // Check if the the dino is already in the comparison zone and change the comparison button
    // Not the best way to do that, it's better to update the marker's content after we click on the comparison button 
    if (typeof (compProfile) != 'undefined' && compProfile != null) {
        popupHTML = e.features[0].properties.popup.replace('Comparer', 'Annuler Comparaison');
    } else {
        popupHTML = e.features[0].properties.popup;
    }

    let coordinates = e.features[0].geometry.coordinates.slice();
    //console.log("fr" + popupHTML);
    //popup.remove();
    popup.setLngLat(coordinates).setHTML(popupHTML).addTo(map);
    //map.flyTo({center: coordinates});
});


// Change the cursor to a pointer when the mouse is over the places layer.
map.on('mouseenter', 'dinos', function (e) {
    map.getCanvas().style.cursor = 'pointer';
    
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

// Change it back to a pointer when it leaves.
map.on('mouseleave', 'dinos', function () {
    map.getCanvas().style.cursor = '';
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
    //popup.remove();
}



