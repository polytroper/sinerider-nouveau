var d3 = require('d3');
var _ = require('lodash');
var autosizeInput = require('autosize-input');

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
		setExpressionSegment,
		resetToOriginals,

		addExpression,
		removeExpression,
		moveExpression,
	} = spec;

	var ui = container.append("div")
			.attr("class", "ui")

	var overlayContainer = ui.append("div")
			.attr("class", "overlayContainer")

	var bottomBar = ui.append("div")
			.attr("class", "bottomBar")

	// var dragContainer = ui.append("div")
			// .attr("class", "dragContainer")

	// var bottomExpander = bottomBar.append("div")
			// .attr("class", "bottomExpander")

	var removeExpressionRegion = overlayContainer.append("div")
			.attr("class", "removeExpressionRegion")

	removeExpressionRegion.append("div")
			.attr("class", "removeExpressionRegionText")
			.text("drag here to remove")

	var addExpressionButton = overlayContainer.append("div")
			.attr("class", "addExpressionButton")
			.on("click", () => addExpression(0, ""))

	addExpressionButton.append("div")
			.text("+")

	var resetExpressionsButton = overlayContainer.append("div")
			.attr("class", "addExpressionButton")
			.on("click", () => resetToOriginals())

	resetExpressionsButton.append("div")
			.text("<<")

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
	var dragEnvelope;
	var dragExpression;

	var expressions;
	var enterExpressions;
	var expressionEnvelopes;
	var expressionHandles;
	var buildExpressionInputs;
	var editExpressionInputs;

	var showResetButton = () => getEditing && _.every(getExpressions(), v => v.unmodified);
	
	var showSegment = d => !getBuilding() && d.length > 0;

	var showExpression = d => getBuilding() || d.segments.length > 1;

	var calculateInputWidth = (w, i) => w*6.7+(i%2 == 0 ? 4 : 10);

	var calculateBottomBarHeight = () => {
		var displayedExpressions = _.filter(getExpressions(), showExpression)
		return displayedExpressions.length*25;
	}

	var refreshExpressionPositions = () => {
		var h = 0;
		var topValues = _.map(getExpressions, () => 0);
		_.each(getExpressions(), (v, i) => {
			topValues[i] = h;
			h += showExpression(v) ? 25 : 0;
		});

		d3.selectAll(".expression")
				.order()
				.style("top", (d, i, a) => topValues[_.indexOf(getExpressions(), d)])
	}

	var refreshExpressions = () => {
		expressions = bottomBar.selectAll(".expression")
			.data(getExpressions(), d => d._key);

		enterExpressions = expressions.enter()
			.append("div")
				.attr("class", "expression")

		enterExpressions.merge(expressions).order();

		expressionEnvelopes = enterExpressions
			.append("div")
				.attr("class", "expressionEnvelope")

		expressionHandles = expressionEnvelopes.append("div")
				.attr("class", "expressionHandle")

		expressionHandles.call(
			d3.drag()
				.container(bottomBar.node())
				.subject(() => ({x: 0, y: 0}))
				.filter(getBuilding)
				.on("start", function(d, i, a){
					i = _.indexOf(getExpressions(), d);

					dragIndex = i;
					dragStartY = d3.mouse(bottomBar.node())[1];
					dragOffsetY = d3.mouse(this)[1];

					// d3.select(this.parentNode.parentNode).raise();

					// dragEnvelope = d3.select(this.parentNode);
					// dragEnvelope.remove();
					// bottomBar.append(dragEnvelope);

					removeExpressionRegion.transition()
							.duration(200)
							.style("opacity", 0.5)
				})
				.on("drag", function(d, i, a){
					dragY = d3.mouse(bottomBar.node())[1];
					i = _.indexOf(getExpressions(), d);

					dragDeltaY = dragY-dragStartY;

					var targetIndex = Math.floor(dragY/25);
					targetIndex = Math.max(0, targetIndex);

					if (targetIndex != i)
						moveExpression(d, targetIndex);

					var originY = i*25;

					d3.select(this.parentNode)
							.style("top", dragY-originY-dragOffsetY)

					removeY = d3.mouse(removeExpressionRegion.node())[1];

					d3.select(this)
							.style("background", (removeY < 100) ? "#822" : "#444")
				})
				.on("end", function(d, i, a){
					i = _.indexOf(getExpressions(), d);

					dragIndex = -1;

					// dragEnvelope.remove();
					// bottomBar.append(dragEnvelope);

					removeExpressionRegion.transition()
							.duration(200)
							.style("opacity", 0)

					d3.select(this.parentNode)
						.style("top", 0)

					removeY = d3.mouse(removeExpressionRegion.node())[1];

					if (removeY < 100)
						removeExpression(i);
					else
						refreshExpressions();
				})
			)

		expressionHandles.append("div")
				.text("☰")

		expressionEnvelopes.append("div")
				.attr("class", "buildExpressionEnvelope")

		expressionEnvelopes.append("div")
				.attr("class", "editExpressionEnvelope")

		expressionEnvelopes.append("div")
				.attr("class", "playExpressionEnvelope")

		buildExpressionInputs = expressionEnvelopes
			.select(".buildExpressionEnvelope")
			.append("input")
				.attr("class", "buildExpressionInput")
				.attr("spellcheck", "false")
				.attr("autocorrect", "off")
				.attr("autocomplete", "off")
				.attr("autocapitalize", "off")
				.on("input", function(d, i, a){setExpression(_.indexOf(getExpressions(), d), this.value)})

		d3.selectAll(".buildExpressionInput")
				.property("value", function(d, i, a){return d.expression;})

		expressionEnvelopes.select(".editExpressionEnvelope")
			.append("div")
				.attr("class", "editExpressionSegments")
				
		expressionEnvelopes.select(".editExpressionEnvelope")
			.append("div")
				.attr("class", "editExpressionTail")

		editExpressionInputs = enterExpressions.merge(expressions)
			.select(".expressionEnvelope")
			.select(".editExpressionEnvelope")
			.select(".editExpressionSegments")
			.selectAll(".editExpressionInput")
				.data(d => d.segmentData)

		editExpressionInputs.exit().remove();

		var enterEditExpressionInputs = editExpressionInputs.enter()
			.append("input")
				.attr("class", "editExpressionInput")
				.attr("spellcheck", "false")
				.attr("autocorrect", "off")
				.attr("autocomplete", "off")
				.attr("autocapitalize", "off")
				.style("border-width", (d, i) => (i%2 == 0 ? "0px" : "1px"))
				.on("input", function(d){d.set(this.value);})
		
		enterEditExpressionInputs.merge(editExpressionInputs)
				.style("display", d => d.hide ? "none" : "flex")
				.property("disabled", function(d, i, a){return i%2 == 0;})
				.property("value", function(d, i, a){return d.str;})
				.each(function(){autosizeInput(this)})

		if (dragIndex < 0) {
			// refreshExpressionPositions();
		}

		expressions.exit().remove();

		resetExpressionsButton.style("display", showResetButton() ? "none" : "flex")

		playExpressionText = expressionEnvelopes
			.select(".playExpressionEnvelope")
			.append("input")
				.attr("class", "playExpressionText")
				.property("disabled", true)

		d3.selectAll(".playExpressionText")
				.property("value", function(d, i, a){return d.preprocessed;})

		d3.selectAll(".buildExpressionEnvelope")
				.style("display", getBuilding() ? "flex" : "none")

		d3.selectAll(".editExpressionEnvelope")
				.style("display", getEditing() ? "flex" : "none")

		d3.selectAll(".playExpressionEnvelope")
				.style("display", getRunning() ? "flex" : "none")

		d3.selectAll(".expression")
				.style("display", d => showExpression(d) ? "flex" : "none")
	}

	var onSetMacroState = () => {
		// refreshExpressionPositions();
		
		d3.selectAll(".expression")
				.style("display", d => showExpression(d) ? "flex" : "none")

		d3.selectAll(".buildExpressionEnvelope")
				.style("display", getBuilding() ? "flex" : "none")

		d3.selectAll(".editExpressionEnvelope")
				.style("display", getEditing() ? "flex" : "none")

		d3.selectAll(".playExpressionEnvelope")
				.style("display", getRunning() ? "flex" : "none")

		playButton.attr("class", getRunning() ? "stopButton" : "startButton")
				.style("display", getBuilding() ? "none" : "flex")

		buildButton.style("display", getRunning() ? "none" : "flex")

		addExpressionButton.style("display", !getBuilding() ? "none" : "flex");

		resetExpressionsButton.style("display", showResetButton() ? "none" : "flex");

		bottomBar.style("opacity", getRunning() ? 0.5 : 1);
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