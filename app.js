d3.json("datasets/fossils.json").then(function(data) {
    console.log(data[0]);
});

d3.json("datasets/gts_tree.json").then(function(data) {
    console.log(data[0]);
});

d3.csv("datasets/dinosaurs.csv").then(function(data) {
    console.log(data[0]);
});

d3.tsv("datasets/gts.csv").then(function(data) {
    console.log(data);

    data.forEach((item, index) => console.log(index, item['type']))

});