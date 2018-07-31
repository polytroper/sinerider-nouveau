var d3 = require('d3');
var _ = require('lodash');
var math = require('mathjs');

var state = {
	inputExpression: "sin(x-t)"
}

var translate = (x, y) => {
	return "translate("+x+", "+y+")";
}

var rotate = a => {
	return "rotate("+(-a)+")";
}

var transform = (x, y, a) => {
	return translate(x, y) + ", " + rotate(a);
}

var lerp = (a, b, t) => {
	return b*t + a*(1-t);
}

let normalize = (vector) => {
	var mag = Math.sqrt(vector.x*vector.x + vector.y*vector.y);
	vector.x /= mag;
	vector.y /= mag;
}

var r2d = 180/Math.PI;

var width = window.innerWidth;
var height = window.innerHeight;
var aspect = height/width;

var body = d3.select("body")

var container = body.append("div")
		.attr("class", "container")
		.style("width", "100%")
		.style("height", "100%")

var svg = container.append("svg")
		.attr("class", "world")
		.style("position", "absolute")
		.style("background", "#EFF")
		// .style("background", "#6DF")
		.attr("width", width)
		.attr("height", height)

var ui = container.append("div")
		.attr("class", "ui")
		.style("position", "absolute")
		.style("width", "100%")
		.style("height", "100%")

var yScale = d3.scaleLinear()
	.range([0, height])

var xScale = d3.scaleLinear()
	.range([width, 0])

var cameraSizeX = -10;
var cameraSizeY = cameraSizeX*aspect;

var refreshCamera = () => {

	xScale.domain([-cameraSizeX, cameraSizeX]);
	yScale.domain([-cameraSizeY, cameraSizeY]);
}

refreshCamera();

var axes = svg.append("g")
		.attr("class", "axes")

var xAxis = axes.append("g")
	.attr("class", "xAxis")
	.attr("transform", "translate(0," + (height/2) + ")")
	.call(
		d3.axisBottom(xScale)
			// .ticks(10)
			// .tickFormat("")
	);

var yAxis = axes.append("g")
	.attr("class", "yAxis")
	.attr("transform", "translate(" + (width/2) + ", 0)")
	.call(
		d3.axisLeft(yScale)
			// .ticks(10)
			// .tickFormat("")
	);

var sampleCount = 128;

var samples = [];
samples.length = sampleCount;

var sampleScope = {
	x: 0,
	t: 0
}

var sampler = null;

var graph = svg.append("g")
		.attr("class", "graph")

var graphAreaGenerator = d3.area()
	.x(d => xScale(d[0]))
	.y0(height)
	.y1(d => yScale(d[1]));

var graphArea = graph.append("path")
		.datum(samples)
		.attr("fill", "black")
		// .attr("stroke-linejoin", "round")
		// .attr("stroke-linecap", "round")
		// .attr("stroke-width", 1.5)

var graphLineGenerator = d3.line()
	.x(d => xScale(d[0]))
	.y(d => yScale(d[1]))

var graphLine = graph.append("path")
		.datum(samples)
		.attr("fill", "none")
		.attr("stroke", "black")
		.attr("stroke-linejoin", "round")
		.attr("stroke-linecap", "round")
		.attr("stroke-width", 0)


var sampleGraph = x => {
	if (sampler == null)
		return 0;

	sampleScope.x = x;
	return sampler.eval(sampleScope);
}

var sampleGraphVelocity = x => {
	let a = sampleGraph(x);
	sampleScope.t -= frameInterval;
	let b = sampleGraph(x);
	sampleScope.t += frameInterval;
	return (a-b)/frameInterval;
}

var sampleGraphSlope = x => {
	let e = 0.01;
	let y0 = sampleGraph(x);
	let y1 = sampleGraph(x+e);
	return (y1-y0)/e;
}

var refreshSamples = () => {
	for (var i = 0; i < sampleCount; i++) {
		let c = i/(sampleCount-1);
		let x = lerp(-cameraSizeX, cameraSizeX, c);
		let y = sampleGraph(x);

		samples[i] = [x, y];
	}
	graphLine.attr("d", graphLineGenerator);
	graphArea.attr("d", graphAreaGenerator);
}

var sledder = svg.append("g")
		.attr("class", "sledder")

var sledderBody = sledder.append("g")
		.attr("class", "sledder")
		.attr("transform", translate(0, -10))

sledderBody.append("circle")
		.attr("r", 10)
		.attr("cx", 0)
		.attr("cy", 0)
		.attr("fill", "white")
		.attr("stroke", "black")
		.attr("strokeWidth", 1)

sledderBody.append("circle")
		.attr("r", 2)
		.attr("cx", 6)
		.attr("cy", -3)

sledderBody.append("line")
		.attr("x1", 2)
		.attr("y1", 4)
		.attr("x2", 9)
		.attr("y2", 4)
		.attr("stroke", "black")
		.attr("strokeWidth", 2)

var sledderX = 0;
var sledderY = 0;
var sledderA = 0;

var sledderVX = 0;
var sledderVY = 0;

var refreshSledderTransform = () => {
	sledder.attr("transform", transform(xScale(sledderX), yScale(sledderY), sledderA));
}

var setSledderTransform = (x, y, a) => {
	sledderX = x;
	sledderY = y;
	sledderA = a;
	sledder.attr("transform", transform(xScale(sledderX), yScale(sledderY), sledderA))
}
var setSledderVelocity = (x, y) => {
	sledderVX = x;
	sledderVY = y;
}

var resetSledder = () => {
	let y = sampleGraph(0);
	let a = r2d*Math.atan(sampleGraphSlope(y));
	setSledderTransform(0, y, a);
	setSledderVelocity(0, 0);
}

var setInputExpression = expression => {
	state.inputExpression = expression;
	try {
		sampler = math.compile(expression);
		sampleGraph(0);
	}
	catch (error) {
		sampler = null;
	}
	refreshSamples();
	resetSledder();
}

setInputExpression("sin(x-sin(t))");

var render = () => {
	// console.log("Rendering");
	requestAnimationFrame(render);

}
render();

var frameRate = 60;
var frameInterval = 1/frameRate;
var frameIntervalMS = 1000/frameRate;

var gravity = -9.8/frameRate;
var running = false;

var updateSledder = () => {

	// Move me
	sledderX += sledderVX*frameInterval;
	sledderY += sledderVY*frameInterval;

	// Gravity
	sledderVY += gravity;

	// Am I below ground? If so, it's THE REAL PHYSICS TIME
	var gy = sampleGraph(sledderX);
	var slope = sampleGraphSlope(sledderX);
	var buffer = 0;
	if (sledderY <= gy-buffer) {

		// To ground!
		sledderY = gy;

		// Get slope/normal vectors of ground
		var slopeVector = {
			x: 1,
			y: slope
		};
		normalize(slopeVector); // make this a unit vector...
		// console.log(slopeVector)

		var rotationVector = {
			x: math.cos(sledderA/r2d),
			y: math.sin(sledderA/r2d)
		}
		// console.log(rotationVector)
		
		// normal!
		var normalVector = {
			x: slopeVector.y,
			y: -slopeVector.x
		}
		// console.log(normalVector)

		// Rotation vector ease to Normal!
		rotationVector.x = lerp(rotationVector.x, slopeVector.x, 0.1);
		rotationVector.y = lerp(rotationVector.y, slopeVector.y, 0.1);
		normalize(rotationVector);

		sledderA = Math.atan2(rotationVector.y, rotationVector.x)*r2d;
		// sledderA = math.atan2(rotationVector.y, rotationVector.x)*r2d;

		// Project Sledder velocity to ground vector
		var scalar = sledderVX*slopeVector.x + sledderVY*slopeVector.y; // dot product
		sledderVX = slopeVector.x*scalar;
		sledderVY = slopeVector.y*scalar;

		// GROUND'S VELOCITY ITSELF
		var groundVelY = sampleGraphVelocity(sledderX);

		// Project onto normal vector, add to Sledder
		scalar = 0*normalVector.x + groundVelY*normalVector.y;
		sledderVX += normalVector.x*scalar;
		sledderVY += normalVector.y*scalar;
	}

	refreshSledderTransform();
}

var update = () => {
	// console.log("Updating");
	if (running) {
		sampleScope.t += frameInterval;
		refreshSamples();
		updateSledder();
	}

	setTimeout(update, frameIntervalMS);
}
update();

var startClock = () => {
	running = true;
}

var stopClock = () => {
	running = false;
	sampleScope.t = 0;
	resetSledder();
	refreshSamples();
}

var toggleClock = () => {
	if (running) stopClock();
	else startClock();
}

var bottomBar = container.append("div")
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
		.property("value", state.inputExpression)
		.on("change", () => setInputExpression(inputBox.node().value))

var playButton = bottomBar.append("div")
		.attr("class", "playButton")
		.style("background", "green")
		// .style("flex-grow", 1)
		.style("cursor", "pointer")
		.style("trasition", "background 0.2s")
		.style("width", "30px")
		.on("mouseover", () => playButton.style("background", "white"))
		.on("mouseout", () => playButton.style("background", "green"))
		.on("click", toggleClock)
