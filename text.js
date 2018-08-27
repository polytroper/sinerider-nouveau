var d3 = require('d3');
var _ = require('lodash');
var math = require('mathjs');
var Color = require('color');

var {
	translate,
	rotate,
	transform,
	lerp,
	floatToGrayscale,
	intToGrayscale,
	parseColor,
	normalize,
	pointSquareDistance
} = require('./helpers');

module.exports = spec => {
	var {
		pubsub,
		container,

		getInstances,

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

	// cameraPoints.push(position);

	var r2d = 180/Math.PI;

	container = container.append("g")
		.attr("class", "texts");

	var texts;
	
	var refreshTextTransforms = () => {
		container.selectAll(".text")
				.attr("transform", d => transform(xScale(math.re(d.p)), yScale(math.im(d.p)), 0, camera.scale/20))

		container.selectAll(".textNode")
				.style("fill", d => d.color)//parseColor(d.color))
				// .style("stroke", d => parseColor(d.color))
				.style("font-size", d => math.round(d.fontSize*20)+"px")
				.text(d => _.toString(d.v))
	}

	var refreshTexts = () => {
		var instances = getInstances();

		texts = container.selectAll(".text")
			.data(instances);
		texts.exit().remove();

		// var textNodes = container.selectAll(".textNode")

		var enterTexts = texts.enter()
			.append("g")
				.attr("class", "text")

		var textNodes = enterTexts.append("text")
				.attr("class", "textNode")
				// .attr("dx", "50%")
				// .attr("dy", "50%")
				.attr("text-anchor", "middle")
				.attr("alignment-baseline", "middle")
				.style("font-family", "Inconsolata")
				// .attr("width", 20)
				// .attr("height", 20)

		texts = enterTexts.merge(texts);
		
		texts.select(".textNode")
				.style("fill", d => parseColor(d.color))
				// .style("stroke", d => parseColor(d.color))
				.style("font-size", d => math.round(d.fontSize*20)+"px")
				// .style("strokeWidth", 1)
				.text(d => _.toString(d.v))

		refreshTextTransforms();
	}
/*

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
*/
/*
	var onStartClock = () => {
	}

	var onStopClock = () => {
		resetSledder();
	}
*/
	var onMoveCamera = () => {
		// refreshSledderTransform();
	}

	var onRender = () => {
		refreshTextTransforms();

		// d3.selectAll(".textNode")
			// .style("fill", d => d.complete ? "green" : "white")
	}

	var intersectPointInstance = (point, instance) => {
		var intersectX = math.abs(point.re - math.re(instance.p)) < 0.5;
		var intersectY = math.abs(point.im - math.im(instance.p)) < 0.5;
		return intersectX && intersectY;
	}

	var intersectCircleInstance = (point, radius, instance) => {
		return pointSquareDistance(point, instance.p, 1) < radius;
	}

	var getIntersections = (point, radius) => {
		var instances = getInstances();
		var intersections = _.filter(instances, v => intersectCircleInstance(point, radius, v));
		return intersections;
	}

	var onUpdate = () => {
		/*
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
			rotationVector.x = lerp(rotationVector.x, slopeVector.x, 0.1);
			rotationVector.y = lerp(rotationVector.y, slopeVector.y, 0.1);
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
		*/
	}
	
	pubsub.subscribe("onUpdate", onUpdate);
	pubsub.subscribe("onRender", onRender);

	pubsub.subscribe("onRefreshScene", refreshTexts);

	return {
	}
}