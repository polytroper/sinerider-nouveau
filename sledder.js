var d3 = require('d3');
var _ = require('lodash');
var math = require('mathjs');

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

	var rotation = 0;

	cameraPoints.push(position);

	var r2d = 180/Math.PI;

	var sledder = container.append("g")
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

	var onSetInputExpression = () => {
		resetSledder();
	}

	var onStartClock = () => {
	}

	var onStopClock = () => {
		resetSledder();
	}

	var onMoveCamera = () => {
		// refreshSledderTransform();
	}

	var onRender = () => {
		refreshSledderTransform();
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
		var buffer = 0;
		if (position[1] <= gy-buffer) {

			// To ground!
			position[1] = gy;

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
			rotationVector.x = lerp(rotationVector.x, slopeVector.x, 0.1);
			rotationVector.y = lerp(rotationVector.y, slopeVector.y, 0.1);
			normalize(rotationVector);

			rotation = math.atan2(rotationVector.y, rotationVector.x)*r2d;

			// Project Sledder velocity to ground vector
			var scalar = velocity[0]*slopeVector.x + velocity[1]*slopeVector.y; // dot product
			velocity[0] = slopeVector.x*scalar;
			velocity[1] = slopeVector.y*scalar;

			// GROUND'S VELOCITY ITSELF
			var groundVelY = sampleGraphVelocity(position[0]);

			// Project onto normal vector, add to Sledder
			scalar = 0*normalVector.x + groundVelY*normalVector.y;
			velocity[0] += normalVector.x*scalar;
			velocity[1] += normalVector.y*scalar;
		}
	}
	
	pubsub.subscribe("onUpdate", onUpdate);
	pubsub.subscribe("onRender", onRender);

	pubsub.subscribe("onMoveCamera", onMoveCamera);

	pubsub.subscribe("onStopClock", onStopClock);
	pubsub.subscribe("onStartClock", onStartClock);

	pubsub.subscribe("onSetInputExpression", onSetInputExpression);
}