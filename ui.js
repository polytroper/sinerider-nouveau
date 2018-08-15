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
		setExpressionSegment,
		resetToOriginals,

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
			.attr("class", "bottomExpander")
			// .style("position", "absolute")
			.style("flex-grow", 1)

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

		enterExpressions.merge(expressions).order();

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

		expressionEnvelopes.append("div")
				.attr("class", "buildExpressionEnvelope")
				.style("flex-grow", 1)
				.style("display", "flex")
				.style("background", "white")

		expressionEnvelopes.append("div")
				.attr("class", "editExpressionEnvelope")
				.style("flex-grow", 1)
				.style("display", "flex")
				.style("background", "white")

		expressionEnvelopes.append("div")
				.attr("class", "playExpressionEnvelope")
				.style("flex-grow", 1)
				.style("display", "flex")
				.style("background", "white")

		buildExpressionInputs = expressionEnvelopes
			.select(".buildExpressionEnvelope")
			.append("input")
				.attr("class", "buildExpressionInput")
				.attr("spellcheck", "false")
				.attr("autocorrect", "off")
				.attr("autocomplete", "off")
				.attr("autocapitalize", "off")
				.style("flex-grow", 1)
				.style("background", "white")
				.on("input", function(d, i, a){setExpression(_.indexOf(getExpressions(), d), this.value)})

		d3.selectAll(".buildExpressionInput")
				.property("value", function(d, i, a){return d.expression;})

		expressionEnvelopes.select(".editExpressionEnvelope")
			.append("div")
				.attr("class", "editExpressionSegments")
				.style("display", "flex")
				.style("flex-grow", 0)
				
		expressionEnvelopes.select(".editExpressionEnvelope")
			.append("div")
				.attr("class", "editExpressionTail")
				.style("flex-shrink", 1)
				.style("flex-grow", 1)
				.style("background", "white")

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
				.style("flex-grow", 0)
				.style("flex-basis", "content")
				.style("text-align", "center")
				.style("padding", "0px 0px")
				.style("margin", "2px 0px")
				.style("background", "white")
				.style("border-style", "dashed")
				.style("border-color", "#E4E4E4")
				.style("border-width", (d, i) => (i%2 == 0 ? "0px" : "1px"))
				.style("font-family", "Courier")
				.on("input", function(d){d.set(this.value);})
		
		enterEditExpressionInputs.merge(editExpressionInputs)
				.style("width", (d, i) => calculateInputWidth(d.str.length, i))
				.style("display", d => d.hide ? "none" : "flex")
				.property("disabled", function(d, i, a){return i%2 == 0;})
				.property("value", function(d, i, a){return d.str;})
				// .style("width", function(d, i, a){return d.str.length*6+10;})

		if (dragIndex < 0) {
			refreshExpressionPositions();
		}

		bottomExpander.style("height", calculateBottomBarHeight());

		expressions.exit().remove();

		resetExpressionsButton.style("display", showResetButton() ? "none" : "flex")

		playExpressionText = expressionEnvelopes
			.select(".playExpressionEnvelope")
			.append("input")
				.attr("class", "playExpressionText")
				.property("disabled", true)
				.style("flex-grow", 1)
				.style("color", "#FFF")
				.style("background", "#666")
				.style("padding", "0px 4px")
				.style("border", "1px inset #888")
				.style("font-family", "Courier")
				// .style("font-size", "12px")

		d3.selectAll(".playExpressionText")
				.property("value", function(d, i, a){return d.preprocessed;})

		d3.selectAll(".buildExpressionEnvelope")
				.style("display", getBuilding() ? "flex" : "none")

		d3.selectAll(".editExpressionEnvelope")
				.style("display", getEditing() ? "flex" : "none")

		d3.selectAll(".playExpressionEnvelope")
				.style("display", getRunning() ? "flex" : "none")
	}

	var onSetMacroState = () => {
		refreshExpressionPositions();
		
		d3.selectAll(".expression")
				.style("display", d => showExpression(d) ? "flex" : "none")
				// .style("position", d => (getBuilding() || d.segments.length > 1) ? "static" : "absolute")

		d3.selectAll(".buildExpressionEnvelope")
				.style("display", getBuilding() ? "flex" : "none")

		d3.selectAll(".editExpressionEnvelope")
				.style("display", getEditing() ? "flex" : "none")

		d3.selectAll(".playExpressionEnvelope")
				.style("display", getRunning() ? "flex" : "none")

		// d3.selectAll(".editExpressionInput")
				// .style("display", d => (d.str.length > 0) ? "flex" : "none")

		playButton.attr("class", getRunning() ? "stopButton" : "startButton")
				.style("display", getBuilding() ? "none" : "flex")

		buildButton.style("display", getRunning() ? "none" : "flex")

		addExpressionButton.style("display", !getBuilding() ? "none" : "flex");

		resetExpressionsButton.style("display", showResetButton() ? "none" : "flex");

		bottomExpander.style("height", calculateBottomBarHeight());
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