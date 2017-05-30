define(function(require){
    'use strict';

    const d3Array = require('d3-array');
    const d3Axis = require('d3-axis');
    const d3Collection = require('d3-collection');
    const d3Dispatch = require('d3-dispatch');
    const d3Ease = require('d3-ease');
    const d3Scale = require('d3-scale');
    const d3Shape = require('d3-shape');
    const d3Selection = require('d3-selection');
    const d3Transition = require('d3-transition');

    const {exportChart} = require('./helpers/exportChart');
    const colorHelper = require('./helpers/colors');
    const timeAxisHelper = require('./helpers/timeAxis');
    const {isInteger} = require('./helpers/common');

    const {
        axisTimeCombinations,
    } = require('./helpers/constants');

    const {
        formatIntegerValue,
        formatDecimalValue,
    } = require('./helpers/formatHelpers');

    /**
     * @typedef SparklineChartData
     * @type {Object[]}
     * @property {Number} value        Value of the group (required)
     * @property {String} name         Name of the group (required)
     *
     * @example
     * [
     *     {
     *         value: 1,
     *         date: '2011-01-06T00:00:00Z'
     *     },
     *     {
     *         value: 2,
     *         date: '2011-01-07T00:00:00Z'
     *     }
     */

    /**
     * Sparkline Chart reusable API module that allows us
     * rendering a sparkline configurable chart.
     *
     * @module Sparkline
     * @tutorial sparkline
     * @requires d3
     *
     * @example
     * var sparkLineChart = sparkline();
     *
     * sparkLineChart
     *     .width(200)
     *     .height(100);
     *
     * d3Selection.select('.css-selector')
     *     .datum(dataset)
     *     .call(sparkLineChart);
     *
     */
    return function module(){

        let margin = {
                left: 5,
                right: 5,
                top: 5,
                bottom: 5
            },
            width = 100,
            height = 30,

            xScale,
            yScale,
            xAxis, xMonthAxis, yAxis,
            xAxisPadding = {
                top: 0,
                left: 15,
                bottom: 20,
                right: 0
            },
            monthAxisPadding = 10,
            tickPadding = 5,

            areaGradient = ['#F5FDFF', '#F6FEFC'],
            lineGradient = colorHelper.colorGradients.greenBlueGradient,

            svg,
            chartWidth, chartHeight,
            data,

            hasArea = true,
            isAnimated = false,
            clipDuration = 3000,
            ease = d3Ease.easeQuadInOut,

            line,

            markerSize = 1.5,

            valueLabel = 'value',
            dateLabel = 'date',

            axes = false,
            forceAxisSettings = null,
            forcedXTicks = null,
            forcedXFormat = null,

            verticalTicks = 5,

            tooltipThreshold = 480,
            overlay,
            overlayColor = 'rgba(0, 0, 0, 0)',
            verticalMarkerContainer,
            verticalMarkerLine,

            horizontalGridLines,
            grid = false,
            baseLine,

            // getters
            getDate = ({date}) => date,
            getValue = ({value}) => value,

            // events
            dispatcher = d3Dispatch.dispatch('customMouseOver', 'customMouseOut', 'customMouseMove');

        /**
         * This function creates the graph using the selection and data provided
         *
         * @param {D3Selection} _selection A d3 selection that represents
         * the container(s) where the chart(s) will be rendered
         * @param {SparklineChartData} _data The data to attach and generate the chart
         */
        function exports(_selection) {
            _selection.each(function(_data){
                chartWidth = width - margin.left - margin.right;
                chartHeight = height - margin.top - margin.bottom;
                data = cleanData(_data);

                buildScales();
                buildSVG(this);
                buildAxis();
                drawAxis();
                createGradients();
                createMaskingClip();
                drawLine();
                drawArea();
                drawEndMarker();

                if (shouldShowTooltip()) {
                    drawVerticalMarker();
                    drawHoverOverlay();
                    addMouseEvents();
                }
            });
        }

        /**
         * Builds containers for the chart, the axis and a wrapper for all of them
         * NOTE: The order of drawing of this group elements is really important,
         * as everything else will be drawn on top of them
         * @private
         */
        function buildContainerGroups(){
            let container = svg
              .append('g')
                .classed('container-group', true)
                .attr('transform', `translate(${margin.left},${margin.top})`);

            container
                .append('g').classed('x-axis-group', true)
                .append('g').classed('axis x', true);
            container.selectAll('.x-axis-group')
                .append('g').classed('month-axis', true);
            container
                .append('g').classed('y-axis-group axis y', true);
            container
                .append('g').classed('grid-lines-group', true);
            container
                .append('g').classed('chart-group', true);
            container
                .append('g').classed('metadata-group', true);
        }

        /**
         * Creates the x, y and color scales of the chart
         * @private
         */
        function buildScales(){
            xScale = (axes ? d3Scale.scaleTime() : d3Scale.scaleLinear())
                .domain(d3Array.extent(data, getDate))
                .range([0, chartWidth]);

            yScale = d3Scale.scaleLinear()
                .domain(d3Array.extent(data, getValue))
                .range([chartHeight, 0])
        }

        /**
         * Builds the SVG element that will contain the chart
         * @param  {HTMLElement} container DOM element that will work as the container of the graph
         * @private
         */
        function buildSVG(container){
            if (!svg) {
                svg = d3Selection.select(container)
                    .append('svg')
                    .classed('britechart sparkline', true);

                buildContainerGroups();
            }

            svg
                .attr('width', width)
                .attr('height', height);
        }

        /**
         * Cleaning data adding the proper format
         * @param  {array} data Data
         * @private
         */
        function cleanData(data) {
            return data.map((d) => {
                d.date = new Date(d[dateLabel]);
                d.value = +d[valueLabel];

                return d;
            });
        }

        /**
         * Adds events to the container group if the environment is not mobile
         * Adding: mouseover, mouseout and mousemove
         */
        function addMouseEvents() {
            svg
                .on('mouseover', handleMouseOver)
                .on('mouseout', handleMouseOut)
                .on('mousemove', handleMouseMove);
        }

        /**
         * Adjusts the position of the y axis' ticks
         * @param  {D3Selection} selection Y axis group
         * @return void
         */
        function adjustYTickLabels(selection) {
            selection.selectAll('.tick text')
                .attr('transform', 'translate(0, -7)');
        }

        /**
         * Formats the value depending on its characteristics
         * @param  {Number} value Value to format
         * @return {Number}       Formatted value
         */
        function getFormattedValue(value) {
            let format;

            if (isInteger(value)) {
                format = formatIntegerValue;
            } else {
                format = formatDecimalValue;
            }

            return format(value);
        }

        /**
         * Creates the d3 x and y axis, setting orientations
         * @private
         */
        function buildAxis() {
            if (axes) {
                let dataTimeSpan = yScale.domain()[1] - yScale.domain()[0];
                let yTickNumber = dataTimeSpan < verticalTicks - 1 ? dataTimeSpan : verticalTicks;
                let minor, major;

                if (forceAxisSettings === 'custom' && typeof forcedXFormat === 'string') {
                    minor = {
                        tick: forcedXTicks,
                        format: d3TimeFormat.timeFormat(forcedXFormat)
                    };
                    major = null;
                } else {
                    ({minor, major} = timeAxisHelper.getXAxisSettings(data, width, forceAxisSettings));

                    xMonthAxis = d3Axis.axisBottom(xScale)
                        .ticks(major.tick)
                        .tickSize(0, 0)
                        .tickFormat(major.format);
                }

                xAxis = d3Axis.axisBottom(xScale)
                    .ticks(minor.tick)
                    .tickSize(10, 0)
                    .tickPadding(tickPadding)
                    .tickFormat(minor.format);

                yAxis = d3Axis.axisLeft(yScale)
                    .ticks(yTickNumber)
                    .tickSize([0])
                    .tickPadding(tickPadding)
                    .tickFormat(getFormattedValue);

                drawGridLines(minor.tick, yTickNumber);
            }
        }

        /**
         * Creates the gradient on the area below the line
         * @return {void}
         */
        function createGradients() {
            let metadataGroup = svg.select('.metadata-group');

            metadataGroup.append('linearGradient')
                .attr('id', 'sparkline-area-gradient')
                .attr('gradientUnits', 'userSpaceOnUse')
                .attr('x1', 0)
                .attr('x2', xScale(data[data.length - 1].date))
                .attr('y1', 0)
                .attr('y2', 0)
              .selectAll('stop')
                .data([
                    {offset: '0%', color: areaGradient[0]},
                    {offset: '100%', color: areaGradient[1]}
                ])
              .enter().append('stop')
                .attr('offset', ({offset}) => offset)
                .attr('stop-color', ({color}) => color);

            metadataGroup.append('linearGradient')
                .attr('id', 'sparkline-line-gradient')
                .attr('gradientUnits', 'userSpaceOnUse')
                .attr('x1', 0)
                .attr('x2', xScale(data[data.length - 1].date))
                .attr('y1', 0)
                .attr('y2', 0)
              .selectAll('stop')
                .data([
                    {offset: '0%', color: lineGradient[0]},
                    {offset: '100%', color: lineGradient[1]}
                ])
              .enter().append('stop')
                .attr('offset', ({offset}) => offset)
                .attr('stop-color', ({color}) => color);
        }

        /**
         * Creates a masking clip that would help us fake an animation if the
         * proper flag is true
         *
         * @return {void}
         */
        function createMaskingClip() {
            if (isAnimated) {
                svg.select('.metadata-group')
                    .append('clipPath')
                    .attr('id', 'maskingClip')
                  .append('rect')
                    .attr('width', 0)
                    .attr('height', height);

                d3Selection.select('#maskingClip rect')
                    .transition()
                    .ease(ease)
                    .duration(clipDuration)
                    .attr('width', width);
            }
        }

        /**
         * Draws the x and y axis on the svg object within their
         * respective groups
         * @private
         */
        function drawAxis(){
            if (!axes) return;

            svg.select('.x-axis-group .axis.x')
                .attr('transform', `translate(0, ${chartHeight})`)
                .call(xAxis);

            if (forceAxisSettings !== 'custom') {
                svg.select('.x-axis-group .month-axis')
                    .attr('transform', `translate(0, ${(chartHeight + xAxisPadding.bottom + monthAxisPadding)})`)
                    .call(xMonthAxis);
            }

            svg.select('.y-axis-group.axis.y')
                .transition()
                .ease(ease)
                .attr('transform', `translate(${-xAxisPadding.left}, 0)`)
                .call(yAxis)
                .call(adjustYTickLabels);
        }

        /**
         * Draws the area that will be placed below the line
         * @private
         */
        function drawArea(){
            let y0 = axes ? height - margin.bottom - margin.top : yScale(0);

            let area = d3Shape.area()
                .x(({date}) => xScale(date))
                .y0(() => y0)
                .y1(({value}) => yScale(value))
                .curve(d3Shape.curveNatural);

            svg.select('.chart-group')
              .append('path')
                .datum(data)
                .attr('class', 'sparkline-area')
                .attr('d', area)
                .attr('clip-path', 'url(#maskingClip)');
        }

        /**
         * Draws the line element within the chart group
         * @private
         */
        function drawLine(){
            line = d3Shape.line()
                .curve(d3Shape.curveNatural)
                .x(({date}) => xScale(date))
                .y(({value}) => yScale(value));

            svg.select('.chart-group')
              .append('path')
                .datum(data)
                .attr('class', 'line')
                .attr('d', line)
                .attr('clip-path', 'url(#maskingClip)')
                .attr('transform', grid ? 'translate(0, -2)' : 'none');
        }

        /**
         * Draws grid lines on the background of the chart
         * @return void
         */
        function drawGridLines(xTicks, yTicks){
            if (!grid) return;

            horizontalGridLines = svg.select('.grid-lines-group')
                .selectAll('line.horizontal-grid-line')
                .data(yScale.ticks(yTicks))
                .enter()
                    .append('line')
                    .attr('class', 'horizontal-grid-line')
                    .attr('x1', (-xAxisPadding.left - 30))
                    .attr('x2', chartWidth)
                    .attr('y1', (d) => yScale(d))
                    .attr('y2', (d) => yScale(d));

            //draw a horizontal line to extend x-axis till the edges
            baseLine = svg.select('.grid-lines-group')
                .selectAll('line.extended-x-line')
                .data([0])
                .enter()
              .append('line')
                .attr('class', 'extended-x-line')
                .attr('x1', (-xAxisPadding.left - 30))
                .attr('x2', chartWidth)
                .attr('y1', height - margin.bottom - margin.top)
                .attr('y2', height - margin.bottom - margin.top);
        }

        /**
         * Draws a marker at the end of the sparkline
         */
        function drawEndMarker(){
            svg.selectAll('.chart-group')
              .append('circle')
                .attr('class', 'sparkline-circle')
                .attr('cx', xScale(data[data.length - 1].date))
                .attr('cy', yScale(data[data.length - 1].value))
                .attr('r', markerSize);
        }

        /**
         * Draws an overlay element over the graph
         * @inner
         * @return void
         */
        function drawHoverOverlay(){
            overlay = svg.select('.metadata-group')
              .append('rect')
                .attr('class','overlay')
                .attr('y1', 0)
                .attr('y2', height)
                .attr('height', chartHeight)
                .attr('width', chartWidth)
                .attr('fill', overlayColor)
                .style('display', 'none');
        }

        /**
         * Creates the vertical marker
         * @return void
         */
        function drawVerticalMarker(){
            verticalMarkerContainer = svg.select('.metadata-group')
              .append('g')
                .attr('class', 'hover-marker vertical-marker-container')
                .attr('transform', 'translate(9999, 0)');

            verticalMarkerLine = verticalMarkerContainer.selectAll('path')
                .data([{
                    x1: 0,
                    y1: 0,
                    x2: 0,
                    y2: 0
                }])
                .enter()
              .append('line')
                .classed('vertical-marker', true)
                .attr('x1', 0)
                .attr('y1', chartHeight)
                .attr('x2', 0)
                .attr('y2', 0);
        }

        /**
         * Finds out which datapoint is closer to the given x position
         * @param  {Number} x0 Date value for data point
         * @param  {Object} d0 Previous datapoint
         * @param  {Object} d1 Next datapoint
         * @return {Object}    d0 or d1, the datapoint with closest date to x0
         */
        function findOutNearestDate(x0, d0, d1){
            return (new Date(x0).getTime() - new Date(d0.date).getTime()) > (new Date(d1.date).getTime() - new Date(x0).getTime()) ? d0 : d1;
        }

        /**
         * Extract X position on the graph from a given mouse event
         * @param  {Object} event D3 mouse event
         * @return {Number}       Position on the x axis of the mouse
         */
        function getMouseXPosition(event) {
            return d3Selection.mouse(event)[0];
        }

        /**
         * Finds out the data entry that is closer to the given position on pixels
         * @param  {Number} mouseX X position of the mouse
         * @return {Object}        Data entry that is closer to that x axis position
         */
        function getNearestDataPoint(mouseX) {
            let dateFromInvertedX = xScale.invert(mouseX);
            let bisectDate = d3Array.bisector(getDate).left;
            let dataEntryIndex = bisectDate(data, dateFromInvertedX, 1);
            let dataEntryForXPosition = data[dataEntryIndex];
            let previousDataEntryForXPosition = data[dataEntryIndex - 1];
            let nearestDataPoint;

            if (previousDataEntryForXPosition && dataEntryForXPosition) {
                nearestDataPoint = findOutNearestDate(dateFromInvertedX, dataEntryForXPosition, previousDataEntryForXPosition);
            } else {
                nearestDataPoint = dataEntryForXPosition;
            }

            return nearestDataPoint;
        }

        /**
         * MouseMove handler, calculates the nearest dataPoint to the cursor
         * and updates metadata related to it
         * @private
         */
        function handleMouseMove(){
            let xPositionOffset = -margin.left, //Arbitrary number, will love to know how to assess it
                dataPoint = getNearestDataPoint(getMouseXPosition(this) + xPositionOffset),
                dataPointXPosition, dataPointYPosition;

            if (dataPoint) {
                dataPointXPosition = xScale(new Date(dataPoint.date));
                dataPointYPosition = yScale(dataPoint.value);
                // More verticalMarker to that datapoint
                moveVerticalMarker(dataPointXPosition);
                // Add data points highlighting
                highlightDataPoints(dataPoint);
                // Emit event with xPosition for tooltip or similar feature
                dispatcher.call('customMouseMove', this, dataPoint, [dataPointXPosition, dataPointYPosition], [chartWidth, chartHeight]);
            }
        }

        /**
         * MouseOut handler, hides overlay and removes active class on verticalMarkerLine
         * It also resets the container of the vertical marker
         * @private
         */
        function handleMouseOut(data){
            overlay.style('display', 'none');
            verticalMarkerLine.classed('bc-is-active', false);
            verticalMarkerContainer.attr('transform', 'translate(9999, 0)');

            dispatcher.call('customMouseOut', this, data);
        }

        /**
         * Mouseover handler, shows overlay and adds active class to verticalMarkerLine
         * @private
         */
        function handleMouseOver(data){
            overlay.style('display', 'block');
            verticalMarkerLine.classed('bc-is-active', true);

            dispatcher.call('customMouseOver', this, data);
        }

        /**
         * Removes all the datapoints highlighter circles added to the marker container
         * @return void
         */
        function cleanDataPointHighlights(){
            verticalMarkerContainer.selectAll('.circle-container').remove();
        }

        /**
         * Creates coloured circles marking where the exact data y value is for a given data point
         * @param  {Object} dataPoint Data point to extract info from
         * @private
         */
        function highlightDataPoints(dataPoint) {
            cleanDataPointHighlights();

            let marker = verticalMarkerContainer
                            .append('g')
                            .classed('circle-container', true),
                circleSize = 12;

            marker.append('circle')
                .classed('data-point-highlighter', true)
                .attr('cx', circleSize)
                .attr('cy', 0)
                .attr('r', 5)
                .style('stroke', '#000');

            marker.attr('transform', `translate( ${(- circleSize)}, ${(yScale(dataPoint.value))} )` );
        }

        /**
         * Helper method to update the x position of the vertical marker
         * @param  {Object} dataPoint Data entry to extract info
         * @return void
         */
        function moveVerticalMarker(verticalMarkerXPosition){
            verticalMarkerContainer.attr('transform', `translate(${verticalMarkerXPosition},0)`);
        }

        /**
         * Determines if we should add the tooltip related logic depending on the
         * size of the chart and the tooltipThreshold variable value
         * @return {Boolean} Should we build the tooltip?
         */
        function shouldShowTooltip() {
            return width > tooltipThreshold;
        }

        // Accessors
        /**
         * Gets or Sets the dateLabel of the chart
         * @param  {Number} _x Desired dateLabel for the graph
         * @return { dateLabel | module} Current dateLabel or Chart module to chain calls
         * @public
         */
        exports.dateLabel = function(_x) {
            if (!arguments.length) {
                return dateLabel;
            }
            dateLabel = _x;

            return this;
        };

        /**
         * Gets or Sets the duration of the animation
         * @param  {Number} _x Desired animation duration for the graph
         * @return { dateLabel | module} Current animation duration or Chart module to chain calls
         * @public
         */
        exports.duration = function(_x) {
            if (!arguments.length) {
                return clipDuration;
            }
            clipDuration = _x;

            return this;
        };

        /**
         * Gets or Sets the areaGradient of the chart
         * @param  {String[]} _x Desired areaGradient for the graph
         * @return { areaGradient | module} Current areaGradient or Chart module to chain calls
         * @public
         */
        exports.areaGradient = function(_x) {
            if (!arguments.length) {
                return areaGradient;
            }
            areaGradient = _x;
            return this;
        };

        /**
         * Gets or Sets the lineGradient of the chart
         * @param  {String[]} _x Desired lineGradient for the graph
         * @return { lineGradient | module} Current lineGradient or Chart module to chain calls
         * @public
         */
        exports.lineGradient = function(_x) {
            if (!arguments.length) {
                return lineGradient;
            }
            lineGradient = _x;
            return this;
        };

        /**
         * Gets or Sets the height of the chart
         * @param  {Number} _x Desired width for the graph
         * @return { height | module} Current height or Chart module to chain calls
         * @public
         */
        exports.height = function(_x) {
            if (!arguments.length) {
                return height;
            }
            height = _x;

            return this;
        };

        /**
         * Gets or Sets the isAnimated property of the chart, making it to animate when render.
         * By default this is 'false'
         *
         * @param  {Boolean} _x Desired animation flag
         * @return { isAnimated | module} Current isAnimated flag or Chart module
         * @public
         */
        exports.isAnimated = function(_x) {
            if (!arguments.length) {
                return isAnimated;
            }
            isAnimated = _x;

            return this;
        };

        /**
         * Gets or Sets the margin of the chart
         * @param  {Object} _x Margin object to get/set
         * @return { margin | module} Current margin or Chart module to chain calls
         * @public
         */
        exports.margin = function(_x) {
            if (!arguments.length) {
                return margin;
            }
            margin = _x;

            return this;
        };

        /**
         * Gets or Sets the width of the chart
         * @param  {Number} _x Desired width for the graph
         * @return { width | module} Current width or Chart module to chain calls
         * @public
         */
        exports.width = function(_x) {
            if (!arguments.length) {
                return width;
            }
            width = _x;

            return this;
        };

        /**
         * Gets or Sets the valueLabel of the chart
         * @param  {Number} _x Desired valueLabel for the graph
         * @return { valueLabel | module} Current valueLabel or Chart module to chain calls
         * @public
         */
        exports.valueLabel = function(_x) {
            if (!arguments.length) {
                return valueLabel;
            }
            valueLabel = _x;

            return this;
        };

        /**
         * Exposes the ability to force the chart to show a certain x axis grouping
         * @param  {String} _x Desired format
         * @return { (String|Module) }    Current format or module to chain calls
         * @example
         *     line.forceAxisFormat(line.axisTimeCombinations.HOUR_DAY)
         */
        exports.forceAxisFormat = function(_x) {
            if (!arguments.length) {
              return forceAxisSettings;
            }
            forceAxisSettings = _x;

            return this;
        };

        /**
         * Exposes the ability to force the chart to show a certain x format
         * It requires a `forceAxisFormat` of 'custom' in order to work.
         * @param  {String} _x              Desired format for x axis
         * @return { (String|Module) }      Current format or module to chain calls
         */
        exports.forcedXFormat = function(_x) {
            if (!arguments.length) {
              return forcedXFormat;
            }
            forcedXFormat = _x;

            return this;
        };

        /**
         * Gets or Sets the number of verticalTicks of the yAxis on the chart
         * @param  {Number} _x Desired verticalTicks
         * @return { verticalTicks | module} Current verticalTicks or Chart module to chain calls
         * @public
         */
        exports.verticalTicks = function(_x) {
            if (!arguments.length) {
                return verticalTicks;
            }
            verticalTicks = _x;

            return this;
        };

        /**
         * Exposes the ability to force the chart to show a certain x ticks. It requires a `forceAxisFormat` of 'custom' in order to work.
         * NOTE: This value needs to be a multiple of 2, 5 or 10. They won't always work as expected, as D3 decides at the end
         * how many and where the ticks will appear.
         *
         * @param  {Number} _x              Desired number of x axis ticks (multiple of 2, 5 or 10)
         * @return { (Number|Module) }      Current number or ticks or module to chain calls
         */
        exports.forcedXTicks = function(_x) {
            if (!arguments.length) {
              return forcedXTicks;
            }
            forcedXTicks = _x;

            return this;
        };

        /**
         * Gets or Sets the axes display.
         *
         * @param  {Boolean} _x Desired display for the axes (true/false)
         * @return { Boolean | module} Current display of the axes or the Chart module to chain calls
         * @public
         */
        exports.axes = function(_x) {
            if (!arguments.length) {
                return axes;
            }
            axes = !!_x;

            if (axes) {
                margin = {
                    top: 25,
                    right: 5,
                    bottom: 60,
                    left: 70
                };
            }

            return this;
        };

        /**
         * Gets or Sets the grid display mode. Note: axes must be enabled to see the grid lines
         *
         * @param  {Boolean} _x Desired display mode for the grid
         * @return { Boolean | module} Current mode of the grid or Chart module to chain calls
         * @public
         */
        exports.grid = function(_x) {
            if (!arguments.length) {
                return grid;
            }
            grid = !!_x;

            return this;
        };

        /**
         * Gets or Sets the minimum width of the graph in order to show the tooltip
         * NOTE: This could also depend on the aspect ratio
         * @param  {Number} _x Desired tooltip threshold for the graph
         * @return { (Number | Module) } Current tooltip threshold or Chart module to chain calls
         * @public
         */
        exports.tooltipThreshold = function(_x) {
            if (!arguments.length) {
                return tooltipThreshold;
            }
            tooltipThreshold = _x;

            return this;
        };

        /**
         * Exposes an 'on' method that acts as a bridge with the event dispatcher
         * We are going to expose this events:
         * customMouseHover, customMouseMove and customMouseOut
         *
         * @return {module} Bar Chart
         * @public
         */
        exports.on = function() {
            let value = dispatcher.on.apply(dispatcher, arguments);

            return value === dispatcher ? exports : value;
        };

        /**
         * Chart exported to png and a download action is fired
         * @public
         */
        exports.exportChart = function(filename, title) {
            exportChart.call(exports, svg, filename, title);
        };

        /**
         * Exposes the constants to be used to force the x axis to respect a certain granularity
         * current options: MINUTE_HOUR, HOUR_DAY, DAY_MONTH, MONTH_YEAR
         * @example
         *     line.forceAxisFormat(line.axisTimeCombinations.HOUR_DAY)
         */
        exports.axisTimeCombinations = axisTimeCombinations;

        return exports;
    };

});
