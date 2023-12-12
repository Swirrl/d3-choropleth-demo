
let width = 800;
let height = 800;
let choroplethBins = 7;

function dataSource() {
    let set = d3.select('#dataset').property("value");
    let year = d3.select('#year').property("value");
    return 'data/' + set + 'LAD' + year + '.csv';
}

function ready(geojson, datarows) {
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

    let scaleDomain = ss.jenks(Object.values(data), choroplethBins);
    let scale = d3.scaleThreshold()
        .domain(scaleDomain)
        .range(d3.schemePuRd[choroplethBins]);

    var projection = d3.geoMercator()
        .fitSize([width, height], geojson);

    var path = d3.geoPath().projection(projection);

    // Draw the map
    d3.select("#map").selectAll("*").remove();
    svg = d3.select("#map").append('svg');
    svg
        .attr('preserveAspectRatio', 'xMaxYMax meet')
        .attr("width", width)
        .attr("height", height)
        .attr('viewBox', '0 0 ' + width + ' ' + height)

        .append("g")
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

    let legend = d3.legendColor()
        .labelFormat(d3.format(".0f"))
        .labels(d3.legendHelpers.thresholdLabels)
        .scale(scale);
    let legendNode = svg.append('g')
        .call(legend);
    let legendSize = legendNode.node().getBBox();
    legendNode.attr('transform', `translate(${width-legendSize.width}, ${height-legendSize.height})`);
}

function render() {
    Promise.all([
        d3.json("mapshaped-districts.geojson"),
        d3.csv(dataSource(), (d) => [d.GEOGRAPHY_CODE, +d.OBS_VALUE]),
    ]).then((res) => ready(...res));
}

