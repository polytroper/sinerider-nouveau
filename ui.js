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

		stopClock,
		startClock,
		toggleClock,

		getRunning,
		getClockTime,

		getExpressions,

		setExpression,
		getExpression,

		addExpression,
		removeExpression,
	} = spec;

	var ui = container.append("div")
			.attr("class", "ui")
			.style("display", "flex")
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
	var bottomBar = ui.append("div")
			.style("align-self", "flex-end")
			.attr("class", "bottomBar")
			// .style("position", "absolute")
			.style("font-family", "Verdana")
			// .style("position", "relative")
			// .style("bottom", 0)
			// .style("width", "100%")
			// .style("height", "25px")
			.style("flex-grow", 1)
			.style("display", "flex")
			.style("flex-direction", "column")
			// .style("align-items", "stretch")
			// .style("align-content", "stretch")
/*
	var inputLabel = bottomBar.append("div")
			.attr("class", "inputLabel")
			.style("background", "#444")
			.style("display", "flex")
			.style("align-items", "center")
			.style("justify-content", "center")
			.style("font-size", "14px")
			.style("color", "white")
			.style("user-select", "none")
			.style("width", "30px")

	var inputLabelText = inputLabel.append("div")
			.text("Y=")
*/
	var expressions;
	var enterExpressions;
	var expressionHandles;
	var expressionAdders;
	var expressionRemovers;
	var expressionInputs;

	var setShowButton = (selection, show) => {
		selection.transition()
			.duration(200)
				.style("width", show ? 25 : 0)
	}

	var onOverExpression = (node, value) => {
		var selection = d3.select(node);
		var adder = selection.select(".expressionAdder");
		var remover = selection.select(".expressionRemover");

		setShowButton(adder, value);
		setShowButton(remover, value);
	}

	var onOverButton = (node, value) => {
		var selection = d3.select(node);
		var button = selection.select(".expressionRemover");
		// selection.transition()
			// .duration(100)
				// .style("background", () => value ? "#FFF" : "#666")
				// .style("color", () => value ? "#000" : "#FFF")

	}

	var refreshExpressions = () => {

		expressions = bottomBar.selectAll(".expression")
			.data(getExpressions());

		enterExpressions = expressions.enter()
			.append("div")
				.attr("class", "expression")
				.style("height", "25px")
				.style("display", "flex")
				.style("align-items", "stretch")
				.style("align-content", "stretch")
				.on("mouseover", (d, i, a) => onOverExpression(a[i], true))
				.on("mouseout", (d, i, a) => onOverExpression(a[i], false))

		expressionHandles = enterExpressions.append("div")
				.attr("class", "expressionHandle")
				.style("width", "25px")
				.style("display", "flex")
				.style("background", "#444")
				.style("cursor", "pointer")
				.style("align-items", "center")
				.style("justify-content", "center")
				.style("font-size", "14px")
				.style("color", "white")
				.style("user-select", "none")

		expressionHandles.append("div")
				.text("☰")

		expressionInputs = enterExpressions.append("input")
				.attr("class", "expressionInput")
				.style("flex-grow", 1)
				.style("display", "flex")
				.style("background", "white")
				.on("input", (d, i, a) => setExpression(i, a[i].value))
				// .property("value", (d, i) => i + ": "+d)

		expressionAdders = enterExpressions.append("div")
				.attr("class", "expressionAdder")
				.style("width", 0)
				.style("display", "flex")
				.style("background", "#666")
				.style("cursor", "pointer")
				.style("align-items", "center")
				.style("justify-content", "center")
				.style("font-size", "14px")
				.style("color", "white")
				.style("user-select", "none")
				.on("click", (d, i) => addExpression(i))
				.on("mouseover", (d, i, a) => onOverButton(a[i], true))
				.on("mouseout", (d, i, a) => onOverButton(a[i], false))

		expressionAdders.append("div")
				.text("+")

		expresssionRemovers = enterExpressions.append("div")
				.attr("class", "expressionRemover")
				.style("width", 0)
				.style("display", "flex")
				.style("background", "#666")
				.style("cursor", "pointer")
				.style("align-items", "center")
				.style("justify-content", "center")
				.style("font-size", "14px")
				.style("color", "white")
				.style("user-select", "none")
				.on("click", (d, i) => removeExpression(i))
				.on("mouseover", (d, i, a) => onOverButton(a[i], true))
				.on("mouseout", (d, i, a) => onOverButton(a[i], false))

		expresssionRemovers.append("div")
				.text("-")

		enterExpressions.merge(expressions)
				.select(".expressionInput")
				.property("value", (d, i) => d.expression)
			// .merge(expressionInputs)

		// console.log(getExpressions())

		expressions.exit().remove();
	}

/*
	var playButton = bottomBar.append("div")
			.attr("class", "playButton")
			.style("background", "green")
			.style("cursor", "pointer")
			.style("trasition", "background 0.2s")
			.style("width", "30px")
			.on("mouseover", () => playButton.style("background", "white"))
			.on("mouseout", () => playButton.style("background", "green"))
			.on("click", toggleClock)
*/

	var onStartClock = () => {
		d3.selectAll(".expressionInput")
				.property("disabled", true)
				.style("background", "#444")
				.style("color", "#FFF")
		/*
		inputBox.node().disabled = true;
		inputBox.style("background", "#444")
				.style("color", "#FFF")
		*/
	}

	var onStopClock = () => {
		d3.selectAll(".expressionInput")
				.property("disabled", false)
				.style("background", "#FFF")
				.style("color", "#222")
		/*
		inputBox.node().disabled = false;
		inputBox.node().focus();
		inputBox.style("background", "#FFF")
				.style("color", "#222")
		*/
	}

	var onUpdate = () => {
		// ui.style("width", getWidth())
			// .style("height", getHeight())
	}

	var onEditExpressions = () => {
		refreshExpressions();
		// inputBox.property("value", getInputExpression());
	}

	pubsub.subscribe("onUpdate", onUpdate);
	pubsub.subscribe("onEditExpressions", onEditExpressions);

	refreshExpressions();

	pubsub.subscribe("onStartClock", onStartClock);
	pubsub.subscribe("onStopClock", onStopClock);

	// pubsub.subscribe("onSetInputExpression", onSetInputExpression);
}