var d3 = require("d3");
var _ = require("lodash");
var math = require("mathjs");

var {
  r2d,
  translate,
  rotate,
  transform,
  lerp,
  normalize,
  isComplex,
  fetchImage,
  pointSquareDistance
} = require("./helpers");

module.exports = spec => {
  var {
    pubsub,
    container,
    loader,

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
    sampleGraphVelocity
  } = spec;

  container = container.append("g").attr("class", "sledders");

  var centerLocal = math.complex(0, 0.5);

  // cameraPoints.push(position);

  var sledderImage64 = "";

  loader("assets/rider_peeps.png", v => {
    sledderImage64 = v;
    refreshSledderImages();
  });

  var refreshSledderTransforms = () => {
    container.selectAll(".sledder").attr("transform", d => {
      return transform(
        xScale(math.re(d.p)),
        yScale(math.im(d.p)),
        d.a,
        camera.scale / 20
      );
    });
  };

  var refreshSledderImages = () => {
    container
      .selectAll(".sledder")
      .select(".sledderImage")
      .attr("xlink:xlink:href", sledderImage64);
    // .attr("xlink:href", "assets/rider_peeps.png")
  };

  var refreshSledders = () => {
    var instances = getInstances();

    var sledders = container.selectAll(".sledder").data(instances);
    sledders.exit().remove();

    var enterSledders = sledders
      .enter()
      .append("g")
      .attr("class", "sledder");

    var sledderImages = enterSledders
      .append("svg:image")
      .attr("class", "sledderImage")
      .attr("x", -15)
      .attr("y", -30)
      .attr("width", 30)
      .attr("height", 30);

    sledders = enterSledders.merge(sledders);

    refreshSledderTransforms();
    refreshSledderImages();
  };

  var onEditExpressions = () => {};

  var onSetMacroState = () => {};

  var onMoveCamera = () => {
    // refreshSledderTransform();
  };

  var render = () => {
    refreshSledderTransforms();
  };

  var onRefreshScene = () => {
    refreshSledders();
  };

  pubsub.subscribe("onSetMacroState", onSetMacroState);

  pubsub.subscribe("onRefreshScene", onRefreshScene);

  pubsub.subscribe("onEditExpressions", onEditExpressions);

  return {
    render
  };
};
