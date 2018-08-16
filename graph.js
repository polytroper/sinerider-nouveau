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

		getRunning,
		getClockTime,

		sampleGraph,
	} = spec;
// (((x-16)/3)^2-6)*(x < 24)
	var sampleCount = 256;

	var samples = [];
	samples.length = sampleCount;

	var graph = container.append("g")
			.attr("class", "graph")

	var graphAreaGenerator = d3.area()
		.x(d => xScale(d[0]))
		.y0(d => getHeight())
		.y1(d => yScale(d[1]))
		.curve(d3.curveNatural)

	var graphArea = graph.append("path")
			.datum(samples)
			.attr("fill", "black")
			// .attr("shape-rendering", "optimizeSpeed")
			// .attr("stroke-linejoin", "round")
			// .attr("stroke-linecap", "round")
			// .attr("stroke-width", 1.5)

	var graphLineGenerator = d3.line()
		.x(d => xScale(d[0]))
		.y(d => yScale(d[1]))
		.curve(d3.curveNatural)

	var graphLine = graph.append("path")
			.datum(samples)
			.attr("fill", "none")
			.attr("stroke", "black")
			// .attr("shape-rendering", "optimizeSpeed")
			.attr("stroke-linejoin", "round")
			.attr("stroke-linecap", "round")
			.attr("stroke-width", 3)
/*
*/
	var refreshSamples = () => {
		for (var i = 0; i < sampleCount; i++) {
			let xMin = camera.position[0]-camera.size[0];
			let xMax = camera.position[0]+camera.size[0];

			let c = i/(sampleCount-1);
			let x = lerp(xMin, xMax, c);
			let y = sampleGraph(x);

			samples[i] = [x, y];
		}
	}

	var onStartClock = () => {
	}

	var onSetMacroState = () => {
		refreshSamples();
	}

	var onMoveCamera = () => {
		// refreshSamples();
	}

	var onEditExpressions = () => {
		refreshSamples();
	}

	var onUpdate = () => {
		refreshSamples();
		if (getRunning()) {
			// refreshSamples();
		}
	}

	var onRender = () => {
		// graphLine.attr("d", graphLineGenerator);
		graphArea.attr("d", graphAreaGenerator);
	}

	refreshSamples();

	pubsub.subscribe("onSetMacroState", onSetMacroState);

	pubsub.subscribe("onUpdate", onUpdate);
	pubsub.subscribe("onRender", onRender);

	pubsub.subscribe("onMoveCamera", onMoveCamera);
	pubsub.subscribe("onEditExpressions", onEditExpressions);
}