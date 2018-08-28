var d3 = require('d3');
var _ = require('lodash');
var math = require('mathjs');

var Axes = require('./axes');
var Graph = require('./graph');
var Sledder = require('./sledder');
var Goal = require('./goal');
var Text = require('./text');
var Image = require('./image');

var {
	translate,
	rotate,
	transform,
	lerp,
	normalize,
	getSceneObjects,
} = require('./helpers');

module.exports = spec => {
	var {
		pubsub,
		container,

		getSceneObjects,

		getWidth,
		getHeight,
		getAspect,
		
		getRunning,
		getEditing,
		getBuilding,
		getClockTime,
		getFrameInterval,
		getGravity,

		sampleGraph,
		sampleGraphSlope,
		sampleGraphVelocity,
	} = spec;

	var yScale = d3.scaleLinear()
		.range([getHeight(), 0])

	var xScale = d3.scaleLinear()
		.range([0, getWidth()])

	var camera = {
		position: [0, 0],
		size: [10*getAspect(), 10],
		scale: getHeight()/10
	}

	var cameraTarget = {
		position: [0, 0],
		size: [10*getAspect(), 10],
		scale: getHeight()/10
	}

	var cameraSmoothing = 0.02;

	var cameraPoints = [[0, 0]];

	var svg = container.append("svg")
			.attr("class", "world")
			.style("position", "absolute")
			.attr("width", getWidth())
			.attr("height", getHeight())
			.style("overflow", "hidden")

	var refreshScales = () => {
		let p = camera.position;
		let s = camera.size;

		let xMin = p[0]-s[0];
		let xMax = p[0]+s[0];
		let yMin = p[1]-s[1];
		let yMax = p[1]+s[1];

		xScale.domain([xMin, xMax]);
		yScale.domain([yMin, yMax]);
	}

	var setCameraPosition = (x, y) => {
		camera.position[0] = x;
		camera.position[1] = y;
		refreshScales();
	}

	var smoothCamera = () => {
		camera.position[0] = lerp(camera.position[0], cameraTarget.position[0], cameraSmoothing);
		camera.position[1] = lerp(camera.position[1], cameraTarget.position[1], cameraSmoothing);

		camera.size[0] = lerp(camera.size[0], cameraTarget.size[0], cameraSmoothing);
		camera.size[1] = lerp(camera.size[1], cameraTarget.size[1], cameraSmoothing);

		camera.scale = getHeight()/(camera.size[1]*2);

		refreshScales();
	}

	var jumpCamera = () => {
		camera.position[0] = cameraTarget.position[0];
		camera.position[1] = cameraTarget.position[1];

		camera.size[0] = cameraTarget.size[0];
		camera.size[1] = cameraTarget.size[1];

		camera.scale = getHeight()/(camera.size[1]*2);

		refreshScales();
	}

	var followCameraPoints = () => {
		var min = _.reduce(cameraPoints, (a, v) => [math.min(a[0], v[0]), math.min(a[1], v[1])]);
		var max = _.reduce(cameraPoints, (a, v) => [math.max(a[0], v[0]), math.max(a[1], v[1])]);

		var x = (min[0] + max[0])/2;
		var y = (min[1] + max[1])/2;

		cameraTarget.position[0] = x;
		cameraTarget.position[1] = y;

		var spanX = max[0]-min[0];
		var spanY = max[1]-min[1];
		var spanMax = math.max(spanX, spanY);

		var size = math.max(10, spanMax);

		cameraTarget.size[0] = size*getAspect();
		cameraTarget.size[1] = size;

		cameraTarget.scale = getHeight()/(size*2);

		// pubsub.publish("onMoveCamera");
	}

	var onSetMacroState = () => {
		jumpCamera();
	}

	var onUpdate = () => {
		followCameraPoints();

		if (getRunning())
			smoothCamera();
		else
			jumpCamera();
	}

	var onRender = () => {
	}

	var onEditExpressions = () => {
	}

	var onRefreshScene = () => {
	}

	var onResize = () => {
		yScale.range([getHeight(), 0])
		xScale.range([0, getWidth()])

		svg.attr("width", getWidth())
		svg.attr("height", getHeight())
	}

	refreshScales();

	pubsub.subscribe("onUpdate", onUpdate);
	pubsub.subscribe("onRender", onRender);

	pubsub.subscribe("onSetMacroState", onSetMacroState);

	pubsub.subscribe("onEditExpressions", onEditExpressions);
	pubsub.subscribe("onRefreshScene", onRefreshScene);

	pubsub.subscribe("onResize", onResize);

	var axes = Axes({
		pubsub,
		container: svg,

		getWidth,
		getHeight,
		getAspect,

		xScale,
		yScale,
		camera,
	});

	var images = Image({
		pubsub,
		container: svg,
		getInstances: () => getSceneObjects("image"),

		xScale,
		yScale,
		camera,

		cameraPoints,

		getRunning,
		getFrameInterval,
		getGravity,

		sampleGraph,
		sampleGraphSlope,
		sampleGraphVelocity,
	});

	var graph = Graph({
		pubsub,
		container: svg,

		getWidth,
		getHeight,
		getAspect,

		xScale,
		yScale,
		camera,

		getRunning,
		getClockTime,

		sampleGraph,
	});

	// lol hack
	var goals;

	var sledder = Sledder({
		pubsub,
		container: svg,
		getInstances: () => getSceneObjects("sledder"),
		getIntersections: (point, radius) => goals.getIntersections(point, radius),

		xScale,
		yScale,
		camera,

		cameraPoints,

		getRunning,
		getFrameInterval,
		getGravity,

		sampleGraph,
		sampleGraphSlope,
		sampleGraphVelocity,
	});

	var texts = Text({
		pubsub,
		container: svg,
		getInstances: () => getSceneObjects("text"),

		xScale,
		yScale,
		camera,

		cameraPoints,

		getRunning,
		getFrameInterval,
		getGravity,

		sampleGraph,
		sampleGraphSlope,
		sampleGraphVelocity,
	});

	goals = Goal({
		pubsub,
		container: svg,
		getInstances: () => getSceneObjects("goal"),

		xScale,
		yScale,
		camera,

		cameraPoints,

		getRunning,
		getFrameInterval,
		getGravity,

		sampleGraph,
		sampleGraphSlope,
		sampleGraphVelocity,
	});
}