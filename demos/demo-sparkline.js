'use strict';

var d3Selection = require('d3-selection'),

    PubSub = require('pubsub-js'),

    sparklineChart = require('./../src/charts/sparkline'),
    miniTooltip = require('./../src/charts/mini-tooltip'),
    sparklineDataBuilder = require('./../test/fixtures/sparklineDataBuilder');
    require('./helpers/resizeHelper');

function createSparklineChart() {
    var sparkline = sparklineChart(),
        testDataSet = new sparklineDataBuilder.SparklineDataBuilder(),
        containerWidth = d3Selection.select('.js-sparkline-chart-container').node().getBoundingClientRect().width,
        container = d3Selection.select('.js-sparkline-chart-container'),
        dataset;

    d3Selection.select('#button').on('click', function() {
        sparkline.exportChart('sparkline.png', 'Britechart Sparkline Chart');
    });

    dataset = testDataSet.with1Source().build();

    var tooltip = miniTooltip();
    // Sparkline Chart Setup and start
    sparkline
        .dateLabel('dateUTC')
        .axes(true)
        .grid(true)
        .isAnimated(true)
        .duration(1000)
        .on('customMouseOver', tooltip.show)
        .on('customMouseMove', tooltip.update)
        .on('customMouseOut', tooltip.hide)
        .height(containerWidth / 2)
        .width(containerWidth);

    container.datum(dataset.data).call(sparkline);

    var tooltipContainer = d3Selection.select('.js-sparkline-chart-container .metadata-group');
    tooltipContainer.datum([]).call(tooltip);
}

// Show charts if container available
if (d3Selection.select('.js-sparkline-chart-container').node()){
    createSparklineChart();

    var redrawCharts = function(){
        d3Selection.selectAll('.sparkline').remove();

        createSparklineChart();
    };

    // Redraw charts on window resize
    PubSub.subscribe('resize', redrawCharts);
}
