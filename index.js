var d3 = require('d3');
var _ = require('lodash');
var math = require('mathjs');

var lz = require('lz-string');
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
/*
var defaultState = {
	parserVersion: "0.1.0",
	expressions: [
		"test1=sin(t)*x",
		"test2=sin(x)*sin(t)",
		"Y=sin(x-t)"
	]
}

var state = _.cloneDeep(defaultState);
*/
var expressions = [];

var r2d = 180/Math.PI;

var width = window.innerWidth;
var height = window.innerHeight;
var aspect = width/height;

// var getWidth = () => width;
// var getHeight = () => height;
// var getAspect = () => aspect;

var getWidth = () => window.innerWidth;
var getHeight = () => window.innerHeight;
var getAspect = () => window.innerWidth/window.innerHeight;

var body = d3.select("body")

var container = body.append("div")
		.attr("class", "container")
		.style("display", "flex")
		.style("align-items", "stretch")
		.style("align-content", "stretch")
		.style("width", width)
		.style("height", height)
		.style("overflow", "hidden")

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
var defaultScope = {
	x: 0,
	t: 0
}
var sampleScope;

var sceneObjectTypes = {
	sledder: {
		p: math.complex(0, 0),
	},
	goal: {
		p: math.complex(0, 0),
		complete: false,
	},
	text: {
		p: math.complex(0, 0),
		value: "Text!",
	},
}

var sceneObjects = {}
_.each(sceneObjectTypes, (v, k) => sceneObjects[k] = []);

var resetScope = () => {
	console.log("Resetting scope");
	sampleScope = _.cloneDeep(defaultScope);
	sampleScope.t = clockTime;
}
resetScope();

var isComplex = c => {
	if (!_.isObject(c))
		return false;

	return _.has(c, "re") && _.has(c, "im");
}

var parseExpression = o => {
	console.log(o);
	var expression = o.expression;

	try {
		o.sampler = math.compile(expression);
		var value = o.sampler.eval(sampleScope);

		if (isComplex(value))
			o.sampleType = 1;
		else if (_.isObject(value))
			o.sampleType = 0;
		else
			o.sampleType = 2;
	}
	catch (error) {
		o.sampler = null;
		o.sampleType = -1;
	}
}

var parseExpressions = () => {
	resetScope();
	console.log("Parsing...");
	_.each(expressions, (v, i) => parseExpression(v));
}

var evaluateExpression = o => {
	if (o.sampler == null)
		return;

	try {
		o.sampler.eval(sampleScope);
	}
	catch (error) {
	}
}

var evaluateExpressions = (level = 0) => {
	_.each(expressions, v => {
		if (v.sampleType >= level)
			evaluateExpression(v);
	});
}

var getExpressionIndexByName = name => {
	return _.indexOf(expressions, v => _.startsWith(v.expression, name));
}

var getExpressionByName = name => {
	return _.find(expressions, v => _.startsWith(v.expression, name));
}

var getSceneObjects = (type = "") => {
	if (type == "")
		return sceneObjects;

	return sceneObjects[type];
}

var createSceneObject = v => {
	var defaults = sceneObjectTypes[v.o];
	var sceneObject = v;//_.cloneDeep(v);
	_.defaultsDeep(sceneObject, defaults);
	sceneObjects[v.o].push(sceneObject);
}

var tryCreateSceneObject = v => {
	console.log("Trying to create scene object with:");
	console.log(v);
	if (!_.isObject(v))
		return;

	if (!_.has(v, "o"))
		return;

	if (!_.has(sceneObjects, v.o))
		return;

	createSceneObject(v);
}

var refreshScene = () => {
	evaluateExpressions();

	console.log("Refreshing scene");
	console.log(sampleScope);

	_.each(sceneObjects, (v, k) => v.length = 0);
	_.each(sampleScope, tryCreateSceneObject);

	console.log(sceneObjects);

	pubsub.publish("onRefreshScene");
}

var sampleGraph = x => {
	// resetScope();

	sampleScope.x = x;
	evaluateExpressions(2);
	var sample = sampleScope.Y;

	if (!_.isNumber(sample))
		sample = sample ? 1 : 0;

	return sample;
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

var createExpression = s => ({
	expression: s,
	sampleType: 2,
	sampler: null,
});

var setExpression = (index, expression, setUrl = true) => {
	console.log("Setting expression "+index+" to "+expression);
	expressions[index].expression = expression;
	
	parseExpressions();
	refreshScene();
	pubsub.publish("onEditExpressions");

	if (setUrl) refreshUrl();
}

var setExpressions = a => {
	expressions = _.map(a, createExpression);

	parseExpressions();
	refreshScene();
	pubsub.publish("onEditExpressions");
}

var getExpression = index => {
	return expressions[index];
}

var getExpressions = () => {
	return expressions;
}

var getExpressionStrings = () => {
	return _.map(expressions, v => v.expression);
}

var addExpression = (index, expression = "") => {
	console.log("Adding expression "+index+": "+expression);

	expressions.splice(index, 0, createExpression(expression));

	parseExpressions();
	refreshScene();

	pubsub.publish("onEditExpressions");
	refreshUrl();
}

var removeExpression = (index) => {
	console.log("Removing expression "+index+": "+expressions[index].expression);

	expressions.splice(index, 1);

	parseExpressions();
	refreshScene();

	pubsub.publish("onEditExpressions");
	refreshUrl();
}

var getQueryString = () => {
	var url = window.location.href;
	var s = url.split("?=");
	if (s.length > 1)
		return s[1];
	else
		return "";
}

var loadState = json => {
	// let defaults = _.cloneDeep(defaultState);
	// _.assign(state, defaults);
	// _.assign(state, json);
	setExpressions(json.expressions);

	pubsub.publish("onLoadState");

	return true;
}

var serialize = () => {
	var state = {
		version: "0.0.0",
		expressions: getExpressionStrings()
	}

    var stateString = JSON.stringify(state);
    stateString = lz.compressToBase64(stateString);

	return stateString;
}

var deserialize = queryString => {
	console.log("Attempting to deserialize Query String: "+queryString)

    if (queryString == "")
    	return false;

    try {
	    var stateString = lz.decompressFromBase64(queryString);

	    console.log("Attempting to load State String: ");
	    var json = JSON.parse(stateString);

	    return loadState(json);
    }
    catch (error) {
    	setExpressions(["Something is wrong with this link. I can't load it :("]);
    	return false;
    }
}

var loadFromUrl = () => {
	var s = getQueryString();
	deserialize(s)
	return s != "";
}

var refreshUrl = () => {
	var url = window.location.href;
	
	if (url.includes("?"))
		url = url.slice(0, url.indexOf("?"));

	url += "?=" + serialize();
	
	window.history.replaceState({}, "SineRider", url);
}

var update = () => {
	// console.log("Updating");
	if (running) {
		clockTime += frameInterval;
		sampleScope.t = getClockTime();
	}

	evaluateExpressions(1);

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

	refreshScene();

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

var onPressEnter = () => {
	toggleClock();
}

var keyCodes = {
	13: onPressEnter,
}

var onPressKey = () => {
	var k = d3.event.keyCode;
	if (keyCodes[k]) {
		console.log("Pressing Key "+k+", firing callback");
		keyCodes[k]();
	}
	else console.log("Pressing Key "+k);
}

body.on("keypress", onPressKey);

setExpressions([
	"test1=sin(t)*x",
	"test2=sin(x)*sin(t)",
	"Y=sin(x-t)"
]);

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
	getSceneObjects,

	sampleGraph,
	sampleGraphSlope,
	sampleGraphVelocity,
});

Ui({
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
});

if (!loadFromUrl())
	console.log("No URL state to load");
	// loadState(defaultState);

