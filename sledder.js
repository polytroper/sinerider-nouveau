var d3 = require('d3');
var _ = require('lodash');
var math = require('mathjs');

var {
	translate,
	rotate,
	transform,
	lerp,
	normalize,
	pointSquareDistance
} = require('./helpers');

module.exports = spec => {
	var {
		pubsub,
		container,

		getInstances,
		getIntersections,

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
	} = spec;

	var position = [0, 0];
	var velocity = [0, 0];
	var centerLocal = math.complex(0, 0.5);
	var center = math.complex(0, 0.5);

	var rotation = 0;

	cameraPoints.push(position);

	var r2d = 180/Math.PI;

	var sledder = container.append("g")
			.attr("class", "sledder")

	sledder.append("svg:image")
		.attr('x', -15)
		.attr('y', -30)
		.attr('width', 30)
		.attr('height', 30)
		.attr("xlink:href", "assets/rider_peeps.png")
/*
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
*/
	var refreshSledders = () => {

	}

	var refreshSledderTransform = () => {
		sledder.attr("transform", transform(xScale(position[0]), yScale(position[1]), rotation, camera.scale/20));
	}

	var setSledderTransform = (x, y, a) => {
		position[0] = x;
		position[1] = y;
		rotation = a;
		sledder.attr("transform", transform(xScale(position[0]), yScale(position[1]), rotation, camera.scale/20))
	}

	var setSledderVelocity = (x, y) => {
		velocity[0] = x;
		velocity[1] = y;
	}

	var resetSledder = () => {
		let y = sampleGraph(0);
		let s = sampleGraphSlope(y);
		let a = r2d*Math.atan(s);
		console.log("Sledder Angle is "+a+", slope is "+s)
		setSledderTransform(0, y, a);
		setSledderVelocity(0, 0);
	}

	var onEditExpressions = () => {
		resetSledder();
	}

	var onSetMacroState = () => {
		resetSledder();
	}

	var onMoveCamera = () => {
		// refreshSledderTransform();
	}

	var onRender = () => {
		refreshSledderTransform();
	}

	var onRefreshScene = () => {

	}

	var onUpdate = () => {
		if (!getRunning()) return;

		var frameInterval = getFrameInterval();
		var gravity = getGravity();

		// Move me
		position[0] += velocity[0]*frameInterval;
		position[1] += velocity[1]*frameInterval;

		// Gravity
		velocity[1] += gravity;

		// Am I below ground? If so, it's THE REAL PHYSICS TIME
		var gy = sampleGraph(position[0]);
		var slope = sampleGraphSlope(position[0]);
		var buffer = 0;//.01;
		if (position[1] <= gy-buffer) {

			// Get slope/normal vectors of ground
			var slopeVector = {
				x: 1,
				y: slope
			};
			normalize(slopeVector); // make this a unit vector...
			// console.log(slopeVector)

			var rotationVector = {
				x: math.cos(rotation/r2d),
				y: math.sin(rotation/r2d)
			}
			// console.log(rotationVector)
			
			// normal!
			var normalVector = {
				x: slopeVector.y,
				y: -slopeVector.x
			}
			// console.log(normalVector)

			// Rotation vector ease to Normal!
			rotationVector.x = lerp(rotationVector.x, slopeVector.x, 0.15);
			rotationVector.y = lerp(rotationVector.y, slopeVector.y, 0.15);
			normalize(rotationVector);

			rotation = math.atan2(rotationVector.y, rotationVector.x)*r2d;

			// Project Sledder velocity to ground vector
			// var scalar = velocity[0]*slopeVector.x + velocity[1]*slopeVector.y; // dot product
			var scalar = math.dot([velocity[0], velocity[1]], [slopeVector.x, slopeVector.y]);
			velocity[0] = slopeVector.x*scalar;
			velocity[1] = math.max(velocity[1], slopeVector.y*scalar);

			// GROUND'S VELOCITY ITSELF
			var groundVelY = sampleGraphVelocity(position[0]);

			// Project onto normal vector, add to Sledder

			scalar = math.dot([0, groundVelY], [normalVector.x, normalVector.y]);
			velocity[0] += normalVector.x*scalar;
			velocity[1] += normalVector.y*scalar;

			// depenetration!
			scalar = math.dot([0, gy-position[1]], [normalVector.x, normalVector.y]);
			position[0] += scalar*normalVector.x;
			position[1] += scalar*normalVector.y;
		}

		var p = math.complex(position[0], position[1]);
		var rotator = math.complex(math.cos(rotation/r2d), math.sin(rotation/r2d));
		center = math.add(math.multiply(centerLocal, rotator), p);

		var intersections = getIntersections(center, 0.5);
		_.each(intersections, v => v.complete = true);
	}
	
	pubsub.subscribe("onUpdate", onUpdate);
	pubsub.subscribe("onRender", onRender);

	pubsub.subscribe("onMoveCamera", onMoveCamera);

	pubsub.subscribe("onSetMacroState", onSetMacroState);

	pubsub.subscribe("onRefreshScene", onRefreshScene);

	pubsub.subscribe("onEditExpressions", onEditExpressions);
}