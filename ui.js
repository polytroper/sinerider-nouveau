var d3 = require('d3');
var _ = require('lodash');

// var Inputs = require('./inputs');

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

		toggleClock,
		toggleBuilder,

		getRunning,
		getEditing,
		getBuilding,
		getMacroState,

		getClockTime,

		setExpression,
		getExpression,
		getExpressions,

		addExpression,
		removeExpression,
		moveExpression,
	} = spec;

	var ui = container.append("div")
			.attr("class", "ui")
			.style("display", "flex")
			.style("flex-direction", "column")
			.style("position", "absolute")
			.style("flex-grow", 0)
			.style("align-items", "stretch")
			.style("align-content", "stretch")

			.style("width", getWidth())
			.style("height", getHeight())
			.style("overflow", "hidden")
/*
	var bottom = ui.append("div")
			.attr("class", "bottom")
			.style("flex-grow", 1)
			.style("display", "flex")
			// .style("align-items", "stretch")
			.style("justify-content", "bottom")
			// .style("flex-direction", "column-reverse")
*/

	var overlayContainer = ui.append("div")
			.attr("class", "overlayContainer")

	var bottomBar = ui.append("div")
			.attr("class", "bottomBar")
			// .style("position", "absolute")
			.style("font-family", "Verdana")
			.style("position", "relative")
			// .style("bottom", 0)
			// .style("width", "100%")
			// .style("height", "25px")
			.style("display", "flex")
			// .style("flex-grow", 1)
			.style("flex-direction", "column")
			.style("align-items", "stretch")
			// .style("align-content", "stretch")

	var bottomExpander = bottomBar.append("div")
			// .style("position", "absolute")
			// .style("flex-grow", 1)

	var removeExpressionRegion = overlayContainer.append("div")
			.attr("class", "removeExpressionRegion")
			.style("height", 100)
			.style("opacity", 0)

	removeExpressionRegion.append("div")
			.attr("class", "removeExpressionRegionText")
			.text("drag here to remove")

	var addExpressionButton = overlayContainer.append("div")
			.attr("class", "addExpressionButton")
			.on("click", () => addExpression(0, ""))

	addExpressionButton.append("div")
			.text("+")

	var playButton = overlayContainer.append("div")
			.attr("class", "startButton")
			.on("click", toggleClock)

	var buildButton = overlayContainer.append("div")
			.attr("class", "buildButton")
			.on("click", toggleBuilder)

	buildButton.append("div")
			.text("≈")

	var expressionHeight = 25;

	var dragIndex = -1;
	var dragStartY = 0;
	var dragDeltaY = 0;
	var dragOffsetY = 0;
	var dragY = 0;

//	var dragSubject = 

	var expressions;
	var enterExpressions;
	var expressionEnvelopes;
	var expressionHandles;
	var expressionInputs;

	var refreshExpressions = () => {
		expressions = bottomBar.selectAll(".expression")
			.data(getExpressions(), d => d._key);

		enterExpressions = expressions.enter()
			.append("div")
				.attr("class", "expression")
				.style("height", "25px")
				.style("display", "flex")
				.style("flex-grow", 1)
				.style("position", "absolute")
				.style("left", 0)
				.style("right", 0)
				.style("align-self", "stretch")
				.style("align-items", "stretch")
				.style("align-content", "stretch")
				// .on("mouseover", (d, i, a) => onOverExpression(a[i], true))
				// .on("mouseout", (d, i, a) => onOverExpression(a[i], false))

		expressionEnvelopes = enterExpressions
			.append("div")
				.attr("class", "expressionEnvelope")
				.style("height", "25px")
				.style("display", "flex")
				.style("flex-grow", 1)
				.style("position", "relative")
				.style("align-items", "stretch")
				.style("align-content", "stretch")

		expressionHandles = expressionEnvelopes.append("div")
				.attr("class", "expressionHandle")
				.style("width", "25px")
				.style("display", "flex")
				.style("background", "#444")
				.style("cursor", "pointer")
				.style("align-items", "center")
				.style("justify-content", "center")
				.style("font-size", "14px")
				.style("color", "#888")
				.style("user-select", "none")

		expressionHandles.call(
			d3.drag()
				.container(bottomBar.node())
				.subject(() => ({x: 0, y: 0}))
				.filter(getBuilding)
				.on("start", function(d, i, a){
					i = _.indexOf(getExpressions(), d);

					dragIndex = i;
					dragStartY = d3.mouse(bottomBar.node())[1];
					dragOffsetY = dragStartY-dragIndex*25;

					d3.select(this.parentNode.parentNode).raise();

					removeExpressionRegion.transition()
							.duration(200)
							.style("opacity", 0.5)
				})
				.on("drag", function(d, i, a){
					dragY = d3.mouse(bottomBar.node())[1];
					i = _.indexOf(getExpressions(), d);

					dragDeltaY = dragY-dragStartY;

					var targetIndex = Math.floor(dragY/25);

					if (targetIndex != i)
						moveExpression(d, targetIndex);

					enterExpressions.merge(expressions)
							// .transition()
							// .duration(200)
							.style("top", (dd, ii, aa) => 25*ii)

					d3.select(this.parentNode.parentNode)
							.raise()
							.style("top", dragY-dragOffsetY)

					removeY = d3.mouse(removeExpressionRegion.node())[1];

					d3.select(this)
						.style("background", (removeY < 100) ? "#822" : "#444")
				})
				.on("end", function(d, i, a){
					i = _.indexOf(getExpressions(), d);

					dragIndex = -1;

					removeExpressionRegion.transition()
							.duration(200)
							.style("opacity", 0)

					removeY = d3.mouse(removeExpressionRegion.node())[1];

					if (removeY < 100)
						removeExpression(i);
					else
						refreshExpressions();
				})
			)

		expressionHandles.append("div")
				.text("☰")

		expressionInputs = expressionEnvelopes.append("input")
				.attr("class", "expressionInput")
				.style("flex-grow", 1)
				.style("display", "flex")
				.style("background", "white")
				.on("input", function(d, i, a){setExpression(_.indexOf(getExpressions(), d), this.value)})
				// .property("value", (d, i) => i + ": "+d)

		d3.selectAll(".expressionInput")
				.property("value", function(d, i, a){return d.expression;})

		enterExpressions.merge(expressions).order();

		if (dragIndex < 0) {
			enterExpressions.merge(expressions)
					.order()
					.style("top", (d, i, a) => 25*i)
		}

		bottomExpander.style("height", getExpressions().length*25);

		expressions.exit().remove();

	}

	var onSetMacroState = () => {
		d3.selectAll(".expressionInput")
				.property("disabled", getRunning())
				.style("background", getRunning() ? "#444" : "#FFF")
				.style("color", getRunning() ? "#FFF" : "#222")

		playButton.attr("class", getRunning() ? "stopButton" : "startButton")
				.style("display", getBuilding() ? "none" : "flex")

		buildButton.style("display", getRunning() ? "none" : "flex")

		addExpressionButton.style("display", !getBuilding() ? "none" : "flex");
	}

	var onUpdate = () => {
		// ui.style("width", getWidth())
			// .style("height", getHeight())
	}

	var onEditExpressions = () => {
		refreshExpressions();
	}

	pubsub.subscribe("onUpdate", onUpdate);
	pubsub.subscribe("onEditExpressions", onEditExpressions);

	refreshExpressions();
	onSetMacroState();

	pubsub.subscribe("onSetMacroState", onSetMacroState);

	// pubsub.subscribe("onSetInputExpression", onSetInputExpression);
}