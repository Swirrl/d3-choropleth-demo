
var width = 800;
var height = 800;

svg = d3.select("#map")
    .append('svg')
    .attr('preserveAspectRatio', 'xMaxYMax meet')
    .attr("display", "none")
    .attr("width", width)
    .attr("height", height)
    .attr('viewBox', '0 0 ' + width + ' ' + height);

function dataSource() {
    let set = d3.select('#dataset').property("value");
    let year = d3.select('#year').property("value");
    return 'data/' + set + 'LAD' + year + '.csv';
}

function ready(error, geojson, datarows) {
    // D3 expects polygon winding contrary to the GeoJSON right-hand rule,
    // so we need to rewind any polygons in the feature collection
    var rewoundFeatures = geojson.features.map(function (feature) {
        return turf.rewind(feature, {reverse: true});
    });
    geojson.features = rewoundFeatures;
    let data = Object.fromEntries(datarows);

    // let selectedScheme = d3.select('#colourSelector').property("value");
    let selectedScheme = 'interpolateRdPu';

    // find min and max the ol' fashioned way
    let min = Infinity, max = -Infinity;
    for (let v of Object.values(data)) {
        min = Math.min(v, min);
        max = Math.max(v, max);
    }

    let nbins = 7;
    let scale = d3.scaleThreshold()
        .domain(ss.jenks(Object.values(data), nbins))
        .range(d3.schemePuRd[nbins]);

    var projection = d3.geoMercator()
        .fitSize([width, height], geojson);

    var path = d3.geoPath().projection(projection);

    // Draw the map
    d3.select("#map").select("img").remove();
    svg.attr("display", null);
    svg.selectAll('*').remove();
    svg.append("g")
        .selectAll("path")
        .data(geojson.features)
        .enter().append("path")
        .attr("d", path)
        .attr("fill", function (d) {
            var geocode = d.properties["LAD23CD"];
            var value = data[geocode] || 0;
            return scale(value);
        })
        .style("stroke", "#000")
        .style("stroke-width", 0.5)
        .style('stroke-linejoin', 'miter');

}

function render() {

    d3.queue()
        .defer(d3.json, "mapshaped-districts.geojson")
        .defer(d3.csv, dataSource(), (d) => [d.GEOGRAPHY_CODE, +d.OBS_VALUE])
        .await(ready);

}

