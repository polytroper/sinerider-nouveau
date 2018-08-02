var d3 = require('d3');
var _ = require('lodash');
var math = require('mathjs');

var pubsub = require('pubsub-js');

var World = require('./world');
var Ui = require('./ui');

var {
	translate,
	rotate,
	transform,
	lerp,
	normalize
} = require('./helpers');

var state = {
	inputExpression: "sin(x-t)"
}

var r2d = 180/Math.PI;

var width = window.innerWidth;
var height = window.innerHeight;
var aspect = width/height;

var getWidth = () => width;
var getHeight = () => height;
var getAspect = () => aspect;

var body = d3.select("body")

var container = body.append("div")
		.attr("class", "container")
		.style("width", width)
		.style("height", height)

var frameRate = 60;
var frameInterval = 1/frameRate;
var frameIntervalMS = 1000/frameRate;

var getFrameInterval = () => frameInterval;
var getFrameIntervalMS = () => frameIntervalMS;

var clockTime = 0;
var running = false;
var gravity = -9.8/frameRate;

var getRunning = () => running;
var getClockTime = () => clockTime;
var getGravity = () => gravity;

var sampler = null;
var sampleScope = {
	x: 0,
	t: 0
}
var getInputExpression = () => state.inputExpression;

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
	let e = 0.05;
	let y0 = sampleGraph(x);
	let y1 = sampleGraph(x+e);
	return (y1-y0)/e;
}

var setInputExpression = expression => {
	state.inputExpression = expression;

		sampler = math.compile(state.inputExpression);
		sampleGraph(0);
	try {
	}
	catch (error) {
		sampler = null;
	}
	
	pubsub.publish("onSetInputExpression");
}

var update = () => {
	// console.log("Updating");
	if (running) {
		clockTime += frameInterval;
		sampleScope.t = getClockTime();
	}

	pubsub.publish("onUpdate");

	setTimeout(update, frameIntervalMS);
}
update();

var render = () => {
	// console.log("Rendering");
	pubsub.publish("onRender");
	requestAnimationFrame(render);
}
render();

var stopClock = () => {
	running = false;
	clockTime = 0;
	sampleScope.t = 0;

	pubsub.publish("onStopClock");
}

var startClock = () => {
	running = true;

	pubsub.publish("onStartClock");
}

var toggleClock = () => {
	if (running) stopClock();
	else startClock();
}

World({
	pubsub,
	container,

	getWidth,
	getHeight,
	getAspect,

	getRunning,
	getClockTime,
	getFrameInterval,
	getGravity,

	sampleGraph,
	sampleGraphSlope,
	sampleGraphVelocity,
});

Ui({
	pubsub,
	container,

	stopClock,
	startClock,
	toggleClock,

	getRunning,
	getClockTime,

	setInputExpression,
	getInputExpression,
});

setInputExpression("sin(x-sin(t))");