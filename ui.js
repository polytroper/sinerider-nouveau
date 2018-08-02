var d3 = require('d3');
var _ = require('lodash');

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

		stopClock,
		startClock,
		toggleClock,

		getRunning,
		getClockTime,

		setInputExpression,
		getInputExpression,
	} = spec;

	var ui = container.append("div")
			.attr("class", "ui")
			.style("position", "absolute")
			.style("width", "100%")
			.style("height", "100%")

	var bottomBar = ui.append("div")
			.attr("class", "bottomBar")
			.style("font-family", "Verdana")
			.style("position", "absolute")
			.style("bottom", 0)
			.style("width", "100%")
			.style("height", "25px")
			.style("display", "flex")
			.style("align-items", "stretch")
			.style("align-content", "stretch")

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

	var inputBox = bottomBar.append("input")
			.attr("class", "inputBox")
			.style("flex-grow", 1)
			.style("background", "white")
			.property("value", getInputExpression())
			.on("change", () => setInputExpression(inputBox.node().value))

	var playButton = bottomBar.append("div")
			.attr("class", "playButton")
			.style("background", "green")
			.style("cursor", "pointer")
			.style("trasition", "background 0.2s")
			.style("width", "30px")
			.on("mouseover", () => playButton.style("background", "white"))
			.on("mouseout", () => playButton.style("background", "green"))
			.on("click", toggleClock)

	var onStartClock = () => {
		inputBox.node().disabled = true;
		inputBox.style("background", "#444")
				.style("color", "#FFF")
	}

	var onStopClock = () => {
		inputBox.node().disabled = false;
		inputBox.style("background", "#FFF")
				.style("color", "#222")
	}

	var onUpdate = () => {
	}

	var onSetInputExpression = () => {
		inputBox.property("value", getInputExpression());
	}

	pubsub.subscribe("onUpdate", onUpdate);

	pubsub.subscribe("onStartClock", onStartClock);
	pubsub.subscribe("onStopClock", onStopClock);

	pubsub.subscribe("onSetInputExpression", onSetInputExpression);
}