var d3 = require('d3');
var _ = require('lodash');
var math = require('mathjs');

var {
	translate,
	rotate,
	transform,
	lerp,
	normalize
} = require('./helpers');

module.exports = spec => {
	var {
		pubsub,
		container,

		getWidth,
		getHeight,
		getAspect,

		xScale,
		yScale,
		camera,
	} = spec;

	var axes = container.append("g")
			.attr("class", "axes")

	var tickInts = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];
/*
	var xAxis = axes.append("g")
		.attr("class", "xAxis")
		.attr("transform", "translate(0," + yScale(0) + ")")
		.call(
			d3.axisBottom(xScale)
				.ticks(0)
				// .tickFormat("")
				// .tickValues(tickInts)
		);

	var yAxis = axes.append("g")
		.attr("class", "yAxis")
		.attr("transform", "translate(" + xScale(0) + ", 0)")
		.call(
			d3.axisLeft(yScale)
				.ticks(0)
				// .tickFormat("")
				// .tickValues(tickInts)
		);
*/

	var xAxis = axes.append("g")
			.attr("class", "xAxis")
			.attr("transform", "translate(0," + yScale(0) + ")")

	var yAxis = axes.append("g")
			.attr("class", "yAxis")
			.attr("transform", "translate(" + xScale(0) + ", 0)")
		
	var xPath = xAxis.append("path")
			.attr("stroke", "#EEE")
			.attr("stroke-width", 1)
			.attr("d", d3.line()([[0, 0], [getWidth(), 0]]))
		
	var yPath = yAxis.append("path")
			.attr("stroke", "#EEE")
			.attr("stroke-width", 1)
			.attr("d", d3.line()([[0, 0], [0, getHeight()]]))

	var onStartClock = () => {
	}

	var onStopClock = () => {
	}

	var onEditExpressions = () => {
	}

	var onUpdate = () => {
	}

	var onRender = () => {
		/*
		xAxis.attr("transform", translate(0, yScale(0)))
			.call(
				d3.axisBottom(xScale)
					.ticks(0)
					// .tickFormat("")
					// .tickValues(tickInts)
			);

		yAxis.attr("transform", translate(xScale(0), 0))
			.call(
				d3.axisLeft(yScale)
					.ticks(0)
					// .tickFormat("")
					// .tickValues(tickInts)
			);
		*/

		// xPath.attr("d", xLine);
		xAxis.attr("transform", "translate(0," + yScale(0) + ")");
		yAxis.attr("transform", "translate(" + xScale(0) + ", 0)");
	}

	var onResize = () => {
		xPath.attr("d", d3.line()([[0, 0], [getWidth(), 0]]));
		yPath.attr("d", d3.line()([[0, 0], [0, getHeight()]]));
	}
	
	pubsub.subscribe("onUpdate", onUpdate);
	pubsub.subscribe("onRender", onRender);

	pubsub.subscribe("onResize", onResize);

	pubsub.subscribe("onStopClock", onStopClock);
	pubsub.subscribe("onStartClock", onStartClock);

	pubsub.subscribe("onEditExpressions", onEditExpressions);

}