
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

    let g = svg.append('g')
    g.append('use')
        .classed('detail', true)
        .attr('href', mapNode.attr('href'))
        .attr('clip-path', `url(#${clipPath.attr('id')})`)
        .attr('x', -bx).attr('y', -by)
        .attr('transform', 'scale(2, 2)')
    g.append('rect')
        .classed('detail-outline', true)
        .attr('width', bradius*2).attr('height', bradius*2)
        .attr('vector-effect', 'non-scaling-stroke')
        .attr('stroke', '#000')
        .attr('stroke-width', 1)
        .attr('fill', 'none')
        .attr('transform', 'scale(2, 2)')

    return g
}

function choroplethLegend(svg, scale, props) {
    window.horrible = scale
    console.log(scale)
    let g = svg.append('g')
    let gBins = g.append('g').classed('bins', true)
    let binCount = scale.range().length
    let binWidth = props.width / binCount
    for (let bin in scale.range()) {
        let binColour = scale.range()[bin]
        gBins.append('rect')
            .attr('x', binWidth * bin)
            .attr('width', binWidth)
            .attr('height', props.binHeight)
            .attr('fill', binColour)
    }
    let gLabels = g.append('g').classed('labels', true)
    for (let point in scale.domain()) {
        let pointValue = scale.domain()[point]
        gLabels.append('text')
            .attr('x', binWidth * point)
            .attr('dy', props.binHeight)
            .attr('text-anchor', 'middle')
            .text(pointValue)
    }
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
        .attr('viewBox', '0 0 ' + width + ' ' + height)
        .attr('class', 'map-display')

    let defs = svg.append('defs');

    let mapDef = defs.append("g").attr('id', 'map-features');
    mapDef
        .selectAll("path")
        .data(geojson.features)
        .enter().append("path")
        .attr('vector-effect', 'non-scaling-stroke')
        .attr("d", path)
        .attr("fill", function (d) {
            var geocode = d.properties["LAD23CD"];
            var value = data[geocode] || 0;
            return scale(value);
        })
        .style("stroke", "#000")
        .style("stroke-width", 0.5)
        .style('stroke-linejoin', 'miter')
        .attr('x', 0).attr('y', 0)

    let mapNode = svg.append('g')
        // .attr('class', 'debug-rect')
        .append('use').attr('href', `#${mapDef.attr('id')}`);

    let legendNode =
        choroplethLegend(svg, scale, { width: width*0.75, binHeight: 15 })
        .classed('choropleth-legend', true)
    let legendSize = legendNode.node().getBBox();
    let legendBinSize = legendNode.select('.bins').node().getBBox();
    legendNode
        .attr('transform', `translate(${width/2-legendBinSize.width/2}, ${height-legendSize.height})`);

    let titleNode = svg.append('g');
    titleNode
        .append('text')
        .text(mapTitle())
        .attr('width', width/2);
    titleNode.attr('transform', `translate(0, ${titleNode.select('text').node().getBBox().height})`)

    let dy = 10;
    for (let insetName in insetBounds) {
        insetZoom(svg, projection, mapNode, insetBounds[insetName])
            .classed('inset-zoom', true)
            .attr('transform', `translate(${width-50}, ${dy})`)
            .append('text').text(insetName).attr('dy', -1)
        dy += 50;
    }

}

function render() {
    Promise.all([
        d3.json("mapshaped-districts.geojson"),
        d3.csv(dataSource(), (d) => [d.GEOGRAPHY_CODE, +d.OBS_VALUE]),
    ]).then((res) => ready(...res));
}

