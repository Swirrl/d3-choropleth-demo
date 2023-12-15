
// A4
let width = 210;
let height = 297;
let choroplethBins = 7;

// in long/lat: just specify width to keep it square despite the projection
let insetBounds = {
    "London": {width: 0.7, center: [-0.1275, 51.5]},
    "Midlands": {width: 0.7, center: [-1.69, 52.63]},
    "Northwest": {width: 0.7, center: [-2.59, 53.6]},
}

function dataSource() {
    let set = d3.select('#dataset').property("value");
    let year = d3.select('#year').property("value");
    return 'data/' + set + 'LAD' + year + '.csv';
}

function mapTitle() {
    let set = d3.select('#dataset').text();
    let year = d3.select('#year').text();
    return `${set} ${year}`;
}

function insetZoom(svg, projection, mapNode, bounds) {
    let c = projection(bounds.center)
    let bx = projection([bounds.center[0] - bounds.width, bounds.center[1]])[0]
    let bradius = c[0] - bx
    let by = c[1] - bradius
    let clipPath = svg.select('defs')
        .append('clipPath')
        .attr('id', 'inset-zoom-' + svg.select('defs').node().children.length);
    clipPath.append('rect')
        .attr('id', 'r-' + clipPath.attr('id'))
        .attr('x', bx).attr('y', by)
        .attr('width', bradius*2).attr('height', bradius*2)

    let g = svg.append('g');

    g.append('use').attr('href', mapNode.attr('href'))
        .attr('clip-path', `url(#${clipPath.attr('id')})`)
        .attr('x', -bx).attr('y', -by)
        .attr('transform', 'scale(2, 2)')

    return g
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

    d3.select("#map").selectAll("*").remove();
    svg = d3.select("#map").append('svg');

    svg
        // .attr("width", width)
        // .attr("height", height)
        .attr('preserveAspectRatio', 'xMidYMax meet')
        .attr('viewBox', '0 0 ' + width + ' ' + height);

    let defs = svg.append('defs');

    let mapDef = defs.append("g").attr('id', 'map-features');
    mapDef
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
        .style("stroke-width", 0.1)
        .style('stroke-linejoin', 'miter')
        .attr('x', 0).attr('y', 0)

    let mapNode = svg.append('g').append('use').attr('href', `#${mapDef.attr('id')}`);

    svg.append('g')
        .append('rect')
        .attr('x', mapNode.node().getBBox().x)
        .attr('y', mapNode.node().getBBox().y)
        .attr('width', mapNode.node().getBBox().width)
        .attr('height', mapNode.node().getBBox().height)
        .attr('fill', 'none')
        .attr('stroke', '#f0f')
        .attr('stroke-width', 1);

    svg.append('g')
        .append('rect')
        .attr('width', width)
        .attr('height', height)
        .attr('fill', 'none')
        .attr('stroke', '#f0f')
        .attr('stroke-width', 1);

    let legend = d3.legendColor()
        .shapeWidth(width/choroplethBins/2)
        .shapeHeight(10)
        .orient("horizontal")
        .labelFormat(d3.format(".0f"))
        .labels(d3.legendHelpers.thresholdLabels)
        .scale(scale);
    let legendNode = svg.append('g')
        .call(legend);
    let legendSize = legendNode.node().getBBox();
    legendNode.attr('transform', `translate(${width-legendSize.width}, ${height-legendSize.height})`);

    let titleNode = svg.append('g');
    titleNode
        .append('text')
        .text(mapTitle());
    titleNode.attr('transform', `translate(0, ${titleNode.select('text').node().getBBox().height})`)

    let dy = 10;
    for (let insetName in insetBounds) {
        insetZoom(svg, projection, mapNode, insetBounds[insetName])
            .attr('transform', `translate(${width-50}, ${dy})`)
            .append('text').text(insetName)
        dy += 50;
    }

}

function render() {
    Promise.all([
        d3.json("mapshaped-districts.geojson"),
        d3.csv(dataSource(), (d) => [d.GEOGRAPHY_CODE, +d.OBS_VALUE]),
    ]).then((res) => ready(...res));
}

