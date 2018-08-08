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

	var xAxis = axes.append("g")
		.attr("class", "xAxis")
		.attr("transform", "translate(0," + yScale(0) + ")")
		.call(
			d3.axisBottom(xScale)
				// .ticks(10)
				// .tickFormat("")
		);

	var yAxis = axes.append("g")
		.attr("class", "yAxis")
		.attr("transform", "translate(" + xScale(0) + ", 0)")
		.call(
			d3.axisLeft(yScale)
				// .ticks(10)
				// .tickFormat("")
		);

	var onStartClock = () => {
	}

	var onStopClock = () => {
	}

	var onEditExpressions = () => {
	}

	var onUpdate = () => {
	}

	var onRender = () => {
		xAxis.attr("transform", translate(0, yScale(0)))
			.call(d3.axisBottom(xScale));

		yAxis.attr("transform", translate(xScale(0), 0))
			.call(d3.axisLeft(yScale));
	}

	var onMoveCamera = () => {
	}
	
	pubsub.subscribe("onUpdate", onUpdate);
	pubsub.subscribe("onRender", onRender);
	
	pubsub.subscribe("onMoveCamera", onMoveCamera);

	pubsub.subscribe("onStopClock", onStopClock);
	pubsub.subscribe("onStartClock", onStartClock);

	pubsub.subscribe("onEditExpressions", onEditExpressions);

}