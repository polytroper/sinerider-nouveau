var d3 = require('d3');
var _ = require('lodash');
var math = require('mathjs');

var {
	translate,
	rotate,
	transform,
	lerp,
	normalize,
	isComplex,
	pointSquareDistance,
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

	container = container.append("g")
			.attr("class", "sledders");

	var centerLocal = math.complex(0, 0.5);

	// cameraPoints.push(position);

	var r2d = 180/Math.PI;

	var sledderToUrl = function(url, callback) {
		// console.log("Base64 Encoding Image at "+url);
		var xhr = new XMLHttpRequest();
		xhr.onload = function() {
			// console.log("XHR Request Loaded for Image at "+url);
			var reader = new FileReader();
			reader.onloadend = function() {
				// console.log("Base64 Encoding Completed for Image at "+url);
				// console.log(reader.result);
				callback(reader.result);
			}
			reader.readAsDataURL(xhr.response);
		};
		xhr.open('GET', url);
		xhr.responseType = 'blob';
		xhr.send();
	}

	var sledderImage64 = "";

	sledderToUrl("assets/rider_peeps.png", v => {
		sledderImage64 = v;
		refreshSledderImages();
	});


	var refreshSledderTransforms = () => {
		container.selectAll(".sledder")
				.attr("transform", d => {
					return transform(xScale(math.re(d.p)), yScale(math.im(d.p)), d.a, camera.scale/20);
				});
	}

	var refreshSledderImages = () => {
		container.selectAll(".sledder").select(".sledderImage")
				.attr("xlink:xlink:href", sledderImage64)
				// .attr("xlink:href", "assets/rider_peeps.png")
	}

	var refreshSledders = () => {
		var instances = getInstances();

		var sledders = container.selectAll(".sledder")
			.data(instances);
		sledders.exit().remove();

		var enterSledders = sledders.enter()
			.append("g")
				.attr("class", "sledder")

		var sledderImages = enterSledders.append("svg:image")
				.attr("class", "sledderImage")
				.attr("x", -15)
				.attr("y", -30)
				.attr("width", 30)
				.attr("height", 30)

		sledders = enterSledders.merge(sledders);
		
		refreshSledderTransforms();
		refreshSledderImages();
	}

	var resetSledder = (instance, index) => {
		let x = math.re(instance.p);
		let y;
		let a;
		let s = sampleGraphSlope(x);

		// console.log("Resetting sledder "+index);
		// console.log(instance.p);

		if (isComplex(instance.p)) {
			y = instance.p.im;
			a = r2d*Math.atan(s);
		}
		else {
			y = sampleGraph(x);
			instance.p = math.complex(x, y);
			a = r2d*Math.atan(s);
		}
		

		// math.im(instance.p) = y;

		instance.a = a;

		instance.v.re = 0;
		instance.v.im = 0;
	}

	var resetSledders = () => {
		var instances = getInstances();
		_.each(instances, resetSledder);
	}

	var onEditExpressions = () => {
		resetSledders();
	}

	var onSetMacroState = () => {
		resetSledders();
	}

	var onMoveCamera = () => {
		// refreshSledderTransform();
	}

	var onRender = () => {
		refreshSledderTransforms();
	}

	var onRefreshScene = () => {
		refreshSledders();
	}

	var updateInstance = (instance, index) => {
		var frameInterval = getFrameInterval();
		var gravity = getGravity();

		if (!isComplex(instance.p))
			instance.p = math.complex(instance.p, 0);
			// instance.p = math.complex(math.re(instance.p), math.im(instance.p));

		if (!isComplex(instance.v))
			instance.v = math.complex(instance.v, 0);

		var position = instance.p;//math.complex(math.re(instance.p), math.im(instance.p));
		var velocity = instance.v;//math.complex(math.re(instance.v), math.im(instance.v));

		// Move me
		position.re += velocity.re*frameInterval;
		position.im += velocity.im*frameInterval;

		// Gravity
		velocity.im += gravity;

		// Am I below ground? If so, it's THE REAL PHYSICS TIME
		var gy = sampleGraph(position.re);
		var slope = sampleGraphSlope(position.re);
		var buffer = 0;//.01;
		if (position.im <= gy-buffer) {

			// Get slope/normal vectors of ground
			var slopeVector = {
				x: 1,
				y: slope
			};
			normalize(slopeVector); // make this a unit vector...
			// console.log(slopeVector)

			var rotationVector = {
				x: math.cos(instance.a/r2d),
				y: math.sin(instance.a/r2d)
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

			instance.a = math.atan2(rotationVector.y, rotationVector.x)*r2d;

			// Project Sledder velocity to ground vector
			// var scalar = velocity.re*slopeVector.x + velocity.im*slopeVector.y; // dot product
			var scalar = math.dot([velocity.re, velocity.im], [slopeVector.x, slopeVector.y]);
			velocity.re = slopeVector.x*scalar;
			velocity.im = math.max(velocity.im, slopeVector.y*scalar);

			// GROUND'S VELOCITY ITSELF
			var groundVelY = sampleGraphVelocity(position.re);

			// Project onto normal vector, add to Sledder

			scalar = math.dot([0, groundVelY], [normalVector.x, normalVector.y]);
			velocity.re += normalVector.x*scalar;
			velocity.im += normalVector.y*scalar;

			// depenetration!
			scalar = math.dot([0, gy-position.im], [normalVector.x, normalVector.y]);
			position.re += scalar*normalVector.x;
			position.im += scalar*normalVector.y;
		}

		var rotator = math.complex(math.cos(instance.a/r2d), math.sin(instance.a/r2d));
		var center = math.add(math.multiply(centerLocal, rotator), position);

		// instance.p = position;
		// instance.v = velocity;

		var intersections = getIntersections(center, 0.5);
		_.each(intersections, v => v.complete = true);

	}

	var onUpdate = () => {
		var instances = getInstances();

		if (!getRunning()) return;

		_.each(instances, updateInstance);
	}
	
	pubsub.subscribe("onUpdate", onUpdate);
	pubsub.subscribe("onRender", onRender);

	pubsub.subscribe("onSetMacroState", onSetMacroState);

	pubsub.subscribe("onRefreshScene", onRefreshScene);

	pubsub.subscribe("onEditExpressions", onEditExpressions);
}