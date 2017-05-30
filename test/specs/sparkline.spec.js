define([
    'underscore',
    'jquery',
    'd3',
    'sparkline',
    'sparklineDataBuilder'
    ], function(
        _,
        $,
        d3,
        sparkline,
        dataBuilder
    ) {
    'use strict';

    describe('Sparkline Chart', () => {
        let dataset, containerFixture, f, sparklineChart;

        function aTestDataSet() {
            return new dataBuilder.SparklineDataBuilder();
        }

        function hasClass(element, className) {
            return _.contains(element.node().classList, className);
        }

        beforeEach(() => {
            dataset = aTestDataSet().with1Source().build();
            sparklineChart = sparkline().dateLabel('dateUTC').width(500);
            // DOM Fixture Setup
            f = jasmine.getFixtures();
            f.fixturesPath = 'base/test/fixtures/';
            f.load('testContainer.html');

            containerFixture = d3.select('.test-container').append('svg');
            containerFixture.datum(dataset.data).call(sparklineChart);
        });

        afterEach(() => {
            containerFixture.remove();
            f = jasmine.getFixtures();
            f.cleanUp();
            f.clearCache();
        });

        it('should render a sparkline chart with minimal requirements', () =>  {
            expect(containerFixture.select('.line').empty()).toBeFalsy();
        });

        it('should render container and chart groups', () => {
            expect(containerFixture.select('g.container-group').empty()).toBeFalsy();
            expect(containerFixture.select('g.chart-group').empty()).toBeFalsy();
            expect(containerFixture.select('g.x-axis-group').empty()).toBeFalsy();
            expect(containerFixture.select('g.y-axis-group').empty()).toBeFalsy();
            expect(containerFixture.select('g.grid-lines-group').empty()).toBeFalsy();
            expect(containerFixture.select('g.metadata-group').empty()).toBeFalsy();
        });

        it('should render a sparkline', () => {
            expect(containerFixture.selectAll('.sparkline').empty()).toEqual(false);
        });

        it('should create a gradient for the area', () => {
            expect(containerFixture.selectAll('#sparkline-area-gradient').empty()).toEqual(false);
        });

        it('should render the sparkline area', () => {
            expect(containerFixture.selectAll('.sparkline-area').empty()).toEqual(false);
        });

        it('should create a gradient for the line', () => {
            expect(containerFixture.selectAll('#sparkline-line-gradient').empty()).toEqual(false);
        });

        // Event Setting
        it('should trigger an event on hover', () => {
            let callback = jasmine.createSpy('hoverCallback'),
                container = containerFixture.selectAll('svg');

            sparklineChart.on('customMouseOver', callback);
            container.dispatch('mouseover');

            expect(callback.calls.count()).toBe(1);
        });

        it('should trigger an event on mouse out', () => {
            let callback = jasmine.createSpy('mouseOutCallback'),
                container = containerFixture.selectAll('svg');

            sparklineChart.on('customMouseOut', callback);
            container.dispatch('mouseout');
            expect(callback.calls.count()).toBe(1);
        });

        // Overlay
        it('should render an overlay to trigger the hover effect', () => {
            expect(containerFixture.select('.overlay').empty()).toBeFalsy();
        });

        it('should show the overlay when the mouse is hovering', () =>  {
            let container = containerFixture.selectAll('svg');

            expect(containerFixture.select('.overlay').style('display')).toBe('none');
            container.dispatch('mouseover');
            expect(containerFixture.select('.overlay').style('display')).toBe('block');
        });

        // Vertical Marker
        it('should render a vertical marker and its container', () => {
            expect(containerFixture.select('.hover-marker').empty()).toBeFalsy();
            expect(containerFixture.select('.vertical-marker').empty()).toBeFalsy();
        });

        it('should show a vertical line where the mouse is hovering', () =>  {
            let container = containerFixture.selectAll('svg'),
                verticalLine = containerFixture.select('.hover-marker line');

            container.dispatch('mouseover');
            expect(hasClass(verticalLine, 'bc-is-active')).toBe(true);
        });

        it('should hide the vertical marker when the mouse is out', () =>  {
            let container = containerFixture.selectAll('svg'),
                verticalLine = containerFixture.select('.hover-marker line');

            expect(hasClass(verticalLine, 'bc-is-active')).toBe(false);
            container.dispatch('mouseover');
            expect(hasClass(verticalLine, 'bc-is-active')).toBe(true);
            container.dispatch('mouseout');
            expect(hasClass(verticalLine, 'bc-is-active')).toBe(false);
        });

        describe('when isAnimated is true', () => {

            it('should create a masking clip', () => {
                sparklineChart.isAnimated(true);
                containerFixture.datum(dataset.data).call(sparklineChart);

                expect(containerFixture.selectAll('#maskingClip').empty()).toEqual(false);
            });
        });

        describe('API', () => {

            it('should provide margin getter and setter', () => {
                let defaultMargin = sparklineChart.margin(),
                    testMargin = {top: 4, right: 4, bottom: 4, left: 4},
                    newMargin;

                sparklineChart.margin(testMargin);
                newMargin = sparklineChart.margin();

                expect(defaultMargin).not.toBe(testMargin);
                expect(newMargin).toBe(testMargin);
            });

            it('should provide width getter and setter', () => {
                let defaultWidth = sparklineChart.width(),
                    testWidth = 200,
                    newWidth;

                sparklineChart.width(testWidth);
                newWidth = sparklineChart.width();

                expect(defaultWidth).not.toBe(testWidth);
                expect(newWidth).toBe(testWidth);
            });

            it('should provide height getter and setter', () => {
                let defaultHeight = sparklineChart.height(),
                    testHeight = 200,
                    newHeight;

                sparklineChart.height(testHeight);
                newHeight = sparklineChart.height();

                expect(defaultHeight).not.toBe(testHeight);
                expect(newHeight).toBe(testHeight);
            });

            it('should provide valueLabel getter and setter', () => {
                let defaultValueLabel = sparklineChart.valueLabel(),
                    testValueLabel = 'quantity',
                    newValueLabel;

                sparklineChart.valueLabel(testValueLabel);
                newValueLabel = sparklineChart.valueLabel();

                expect(defaultValueLabel).not.toBe(testValueLabel);
                expect(newValueLabel).toBe(testValueLabel);
            });

            it('should provide dateLabel getter and setter', () => {
                let defaultDateLabel = sparklineChart.dateLabel(),
                    testDateLabel = 'date',
                    newDateLabel;

                sparklineChart.valueLabel(testDateLabel);
                newDateLabel = sparklineChart.valueLabel();

                expect(defaultDateLabel).not.toBe(testDateLabel);
                expect(newDateLabel).toBe(testDateLabel);
            });

            it('should provide animation getter and setter', () => {
                let defaultAnimation = sparklineChart.isAnimated(),
                    testAnimation = true,
                    newAnimation;

                sparklineChart.isAnimated(testAnimation);
                newAnimation = sparklineChart.isAnimated();

                expect(defaultAnimation).not.toBe(testAnimation);
                expect(newAnimation).toBe(testAnimation);
            });

            it('should provide animation duration getter and setter', () => {
                let defaultAnimationDuration = sparklineChart.duration(),
                    testAnimationDuration = 2000,
                    newAnimationDuration;

                sparklineChart.duration(testAnimationDuration);
                newAnimationDuration = sparklineChart.duration();

                expect(defaultAnimationDuration).not.toBe(testAnimationDuration);
                expect(newAnimationDuration).toBe(testAnimationDuration);
            });

            it('should provide a lineGradient getter and setter', () => {
                let defaultGradient = sparklineChart.lineGradient(),
                    testGradient = ['#ffffff', '#fafefc'],
                    newGradient;

                sparklineChart.lineGradient(testGradient);
                newGradient = sparklineChart.lineGradient();

                expect(defaultGradient).not.toBe(testGradient);
                expect(newGradient).toBe(testGradient);
            });

            it('should provide an areaGradient getter and setter', () => {
                let defaultGradient = sparklineChart.areaGradient(),
                    testGradient = ['#ffffff', '#fafefc'],
                    newGradient;

                sparklineChart.areaGradient(testGradient);
                newGradient = sparklineChart.areaGradient();

                expect(defaultGradient).not.toBe(testGradient);
                expect(newGradient).toBe(testGradient);
            });

            it('should provide a forceAxisFormat getter and setter', () => {
                let defaultSchema = sparklineChart.forceAxisFormat(),
                    testFormat = sparklineChart.axisTimeCombinations.HOUR_DAY,
                    newSchema;

                sparklineChart.forceAxisFormat(testFormat);
                newSchema = sparklineChart.forceAxisFormat();

                expect(defaultSchema).not.toBe(testFormat);
                expect(newSchema).toBe(testFormat);
            });

            it('should provide a forcedXTicks getter and setter', () => {
                let defaultForcedXTicks = sparklineChart.forcedXTicks(),
                    testXTicks = 2,
                    newForcedXTicks;

                sparklineChart.forcedXTicks(testXTicks);
                newForcedXTicks = sparklineChart.forcedXTicks();

                expect(defaultForcedXTicks).not.toBe(testXTicks);
                expect(newForcedXTicks).toBe(testXTicks);
            });

            it('should provide a forcedXFormat getter and setter', () => {
                let defaultForcedXFormat = sparklineChart.forcedXFormat(),
                    testXFormat = '%d %b',
                    newForcedXFormat;

                sparklineChart.forcedXFormat(testXFormat);
                newForcedXFormat = sparklineChart.forcedXFormat();

                expect(defaultForcedXFormat).not.toBe(testXFormat);
                expect(newForcedXFormat).toBe(testXFormat);
            });

            it('should provide an axisTimeCombinations accessor', () => {
                let axisTimeCombinations = sparklineChart.axisTimeCombinations;

                expect(axisTimeCombinations).toEqual({
                    MINUTE_HOUR: 'minute-hour',
                    HOUR_DAY: 'hour-daymonth',
                    DAY_MONTH: 'day-month',
                    MONTH_YEAR: 'month-year'
                });
            });

            it('should provide grid display getter and setter', () => {
                let defaultGridMode = sparklineChart.grid(),
                    testValue = true,
                    newGridMode;

                sparklineChart.grid(testValue);
                newGridMode = sparklineChart.grid();

                expect(defaultGridMode).not.toBe(testValue);
                expect(newGridMode).toBe(testValue);
            });

            it('should provide axes display getter and setter', () => {
                let defaultAxesDisplay = sparklineChart.axes(),
                    testValue = true,
                    newAxesDisplay;

                sparklineChart.axes(testValue);
                newAxesDisplay = sparklineChart.axes();

                expect(defaultAxesDisplay).not.toBe(testValue);
                expect(newAxesDisplay).toBe(testValue);
            });

            it('should provide verticalTicks getter and setter', () => {
                let defaultVerticalTicks = sparklineChart.verticalTicks(),
                    testVerticalTicks = 3,
                    newVerticalTicks;

                sparklineChart.verticalTicks(testVerticalTicks);
                newVerticalTicks = sparklineChart.verticalTicks();

                expect(defaultVerticalTicks).not.toBe(testVerticalTicks);
                expect(newVerticalTicks).toBe(testVerticalTicks);
            });
        });

        describe('Export chart functionality', () => {

            it('should have exportChart defined', () => {
                expect(sparklineChart.exportChart).toBeDefined();
            });
        });

        describe('Grid', function() {

            beforeEach(() => {
                sparklineChart = sparkline().dateLabel('dateUTC').axes(true).grid(true);
                dataset = aTestDataSet().with1Source().build();

                // DOM Fixture Setup
                f = jasmine.getFixtures();
                f.fixturesPath = 'base/test/fixtures/';
                f.load('testContainer.html');

                containerFixture = d3.select('.test-container').append('svg');
                containerFixture.datum(dataset.data).call(sparklineChart);
            });

            afterEach(() => {
                containerFixture.remove();
                f = jasmine.getFixtures();
                f.cleanUp();
                f.clearCache();
            });

            describe('when grid is displayed', function() {
                it('should render the horizontal grid lines', () => {
                    expect(containerFixture.selectAll('.horizontal-grid-line').empty()).toBeFalsy();
                });
            });
        });
    });
});
