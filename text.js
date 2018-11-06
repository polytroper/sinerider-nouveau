var d3 = require("d3");
var _ = require("lodash");
var math = require("mathjs");
var Color = require("color");

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
} = require("./helpers");

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
    sampleGraphVelocity
  } = spec;

  // cameraPoints.push(position);

  var r2d = 180 / Math.PI;

  container = container.append("g").attr("class", "texts");

  var texts;

  var refreshTextTransforms = () => {
    container
      .selectAll(".text")
      .attr("transform", d =>
        transform(
          xScale(math.re(d.p)),
          yScale(math.im(d.p)),
          0,
          camera.scale / 20
        )
      );

    container
      .selectAll(".textNode")
      .style("fill", d => d.color) //parseColor(d.color))
      // .style("stroke", d => parseColor(d.color))
      .style("font-size", d => d.fontSize * 20)
      .text(d => _.toString(d.v));
  };

  var refreshTexts = () => {
    var instances = getInstances();

    texts = container.selectAll(".text").data(instances);
    texts.exit().remove();

    // var textNodes = container.selectAll(".textNode")

    var enterTexts = texts
      .enter()
      .append("g")
      .attr("class", "text");

    var textNodes = enterTexts
      .append("text")
      .attr("class", "textNode")
      // .attr("dx", "50%")
      // .attr("dy", "50%")
      .attr("text-anchor", "middle")
      .attr("alignment-baseline", "middle")
      .style("font-family", "Courier");
    // .attr("width", 20)
    // .attr("height", 20)

    texts = enterTexts.merge(texts);

    texts
      .select(".textNode")
      .style("fill", d => parseColor(d.color))
      // .style("stroke", d => parseColor(d.color))
      .style("font-size", d => d.fontSize * 20)
      // .style("strokeWidth", 1)
      .text(d => _.toString(d.v));

    refreshTextTransforms();
  };
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
  };

  var onRender = () => {
    refreshTextTransforms();

    // d3.selectAll(".textNode")
    // .style("fill", d => d.complete ? "green" : "white")
  };

  var intersectPointInstance = (point, instance) => {
    var intersectX = math.abs(point.re - math.re(instance.p)) < 0.5;
    var intersectY = math.abs(point.im - math.im(instance.p)) < 0.5;
    return intersectX && intersectY;
  };

  var intersectCircleInstance = (point, radius, instance) => {
    return pointSquareDistance(point, instance.p, 1) < radius;
  };

  var getIntersections = (point, radius) => {
    var instances = getInstances();
    var intersections = _.filter(instances, v =>
      intersectCircleInstance(point, radius, v)
    );
    return intersections;
  };

  var onUpdate = () => {};

  pubsub.subscribe("onUpdate", onUpdate);
  pubsub.subscribe("onRender", onRender);

  pubsub.subscribe("onRefreshScene", refreshTexts);

  return {};
};
