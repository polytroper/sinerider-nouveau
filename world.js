const d3 = require("d3");
const _ = require("lodash");
const math = require("mathjs");

const PhysicsContext = require("./physics");
const Axes = require("./axes");
const Graph = require("./graph");
const Sledder = require("./sledder");
const Goal = require("./goal");
const Text = require("./text");
const Image = require("./image");

const morph = require("nanomorph");

const WorldComponent = require("./templates/world_template");
const worldComponent = new WorldComponent();

const {
  translate,
  rotate,
  transform,
  lerp,
  normalize,
  isComplex
} = require("./helpers");

module.exports = spec => {
  var {
    pubsub,
    container,
    loader,

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

    getRecord,
    getRecording,
    getRecordTime,

    getGif,
    recordFrame,

    sampleGraph,
    sampleGraphSlope,
    sampleGraphVelocity
  } = spec;

  var physics = PhysicsContext();

  var sceneComponentStates = [];

  var yScale = d3.scaleLinear().range([getHeight(), 0]);
  var xScale = d3.scaleLinear().range([0, getWidth()]);

  const graphInstance = {
    sample: sampleGraph,
    sampleSlope: sampleGraphSlope,
    sampleVelocity: sampleGraphVelocity,
    _physicsHits: [],
    _physicsHitCount: 0,
    _physicsShape: "graph",
    _physicsLayer: "world",
    _physicsKinetic: false,
    _physicsKinematic: true,
    _physicsParent: null
  };
  graphInstance._physicsParent = graphInstance;

  var camera = {
    position: [0, 0],
    size: [10 * getAspect(), 10],
    scale: getHeight() / 10
  };

  var cameraTarget = {
    position: [0, 0],
    size: [10 * getAspect(), 10],
    scale: getHeight() / 10
  };

  var cameraSmoothing = 0.02;

  var cameraPoints = [[0, 0]];
  var sceneIdCounter = 0;

  var svg = container
    .append("svg")
    .attr("class", "world")
    .style("position", "absolute")
    .attr("width", getWidth())
    .attr("height", getHeight())
    .style("overflow", "hidden");

  var refreshCameraPoints = () => {
    let sledders = getSceneObjects("sled");

    // +1 for the origin
    while (cameraPoints.length < sledders.length + 1) cameraPoints.push([0, 0]);
    while (cameraPoints.length > sledders.length + 1) cameraPoints.pop();

    _.each(sledders, (v, i) => {
      // +1 for the origin
      cameraPoints[i + 1][0] = math.re(v.p);
      cameraPoints[i + 1][1] = math.im(v.p);
    });
  };

  var refreshScales = () => {
    let p = camera.position;
    let s = camera.size;

    let xMin = p[0] - s[0];
    let xMax = p[0] + s[0];
    let yMin = p[1] - s[1];
    let yMax = p[1] + s[1];

    xScale.domain([xMin, xMax]);
    yScale.domain([yMin, yMax]);
  };

  var setCameraPosition = (x, y) => {
    camera.position[0] = x;
    camera.position[1] = y;
    refreshScales();
  };

  var smoothCamera = () => {
    camera.position[0] = lerp(
      camera.position[0],
      cameraTarget.position[0],
      cameraSmoothing
    );
    camera.position[1] = lerp(
      camera.position[1],
      cameraTarget.position[1],
      cameraSmoothing
    );

    camera.size[0] = lerp(
      camera.size[0],
      cameraTarget.size[0],
      cameraSmoothing
    );
    camera.size[1] = lerp(
      camera.size[1],
      cameraTarget.size[1],
      cameraSmoothing
    );

    camera.scale = getHeight() / (camera.size[1] * 2);

    refreshScales();
  };

  var jumpCamera = () => {
    camera.position[0] = cameraTarget.position[0];
    camera.position[1] = cameraTarget.position[1];

    camera.size[0] = cameraTarget.size[0];
    camera.size[1] = cameraTarget.size[1];

    camera.scale = getHeight() / (camera.size[1] * 2);

    refreshScales();
  };

  var followCameraPoints = () => {
    var min = _.reduce(cameraPoints, (a, v) => [
      math.min(a[0], v[0]),
      math.min(a[1], v[1])
    ]);
    var max = _.reduce(cameraPoints, (a, v) => [
      math.max(a[0], v[0]),
      math.max(a[1], v[1])
    ]);

    var x = (min[0] + max[0]) / 2;
    var y = (min[1] + max[1]) / 2;

    cameraTarget.position[0] = x;
    cameraTarget.position[1] = y;

    var spanX = max[0] - min[0];
    var spanY = max[1] - min[1];
    var spanMax = math.max(spanX, spanY);

    var size = math.max(10, spanMax);

    cameraTarget.size[0] = size * getAspect();
    cameraTarget.size[1] = size;

    cameraTarget.scale = getHeight() / (size * 2);

    // pubsub.publish("onMoveCamera");
  };

  var onSetMacroState = () => {
    jumpCamera();
    refreshWorldTemplate();
  };

  var onUpdate = () => {
    refreshCameraPoints();
    followCameraPoints();

    if (getRunning()) smoothCamera();
    else jumpCamera();

    if (getRunning()) {
      let physicsInstances = _.flatten(_.values(getSceneObjects()));
      physicsInstances = _.filter(physicsInstances, v =>
        _.has(v, "_physicsLayer")
      );

      physicsInstances.push(graphInstance);
      physics(physicsInstances, getFrameInterval(), getGravity());
    }
  };

  var render = () => {
    axes.render();
    graph.render();
    images.render();
    sledder.render();

    refreshWorldTemplate();
  };

  var onEditExpressions = () => {};

  var refreshScene = () => {
    _.each(getSceneObjects("sled"), instance => {
      let x = math.re(instance.p);
      let y;
      let a;
      let s = sampleGraphSlope(x);

      // console.log("Resetting sledder "+index);
      // console.log(instance.p);

      if (isComplex(instance.p)) {
        y = instance.p.im;
        a = Math.atan(s);
      } else {
        y = sampleGraph(x);
        instance.p = math.complex(x, y);
        a = Math.atan(s);
      }

      instance._physicsUpright.re = -math.sin(a);
      instance._physicsUpright.im = math.cos(a);

      // math.im(instance.p) = y;

      instance.a = a;

      instance.v.re = 0;
      instance.v.im = 0;
    });

    let sceneObjectArray = _.flatten(_.values(getSceneObjects()));

    // Temporary step while transitioning to Nanocomponent:
    // Filter for only the scene object types that currently have a Nanocomponent implementation
    let supportedComponentTypes = ["text", "goal"];
    sceneObjectArray = _.filter(sceneObjectArray, v =>
      _.includes(supportedComponentTypes, v.o)
    );

    sceneComponentStates = _.map(sceneObjectArray, (v, i) => ({
      arguments: {
        instance: v,
        camera,
        xScale,
        yScale
      },
      type: v.o,
      id: _.toString(sceneIdCounter++)
    }));
    refreshWorldTemplate();
  };

  var onResize = () => {
    yScale.range([getHeight(), 0]);
    xScale.range([0, getWidth()]);

    svg.attr("width", getWidth());
    svg.attr("height", getHeight());
  };

  refreshScales();

  pubsub.subscribe("onUpdate", onUpdate);

  pubsub.subscribe("onSetMacroState", onSetMacroState);

  pubsub.subscribe("onEditExpressions", onEditExpressions);
  // pubsub.subscribe("onRefreshScene", onRefreshScene);

  pubsub.subscribe("onResize", onResize);

  var axes = Axes({
    pubsub,
    container: svg,
    loader,

    getWidth,
    getHeight,
    getAspect,

    xScale,
    yScale,
    camera
  });

  var images = Image({
    pubsub,
    container: svg,
    loader,
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
    sampleGraphVelocity
  });

  var graph = Graph({
    pubsub,
    container: svg,
    loader,

    getWidth,
    getHeight,
    getAspect,

    xScale,
    yScale,
    camera,

    getRunning,
    getClockTime,

    sampleGraph
  });

  var worldTemplateNode = svg.append("g").node();
  var refreshWorldTemplate = () =>
    morph(
      worldTemplateNode,
      worldComponent.render({
        scene: sceneComponentStates,
        camera,
        xScale,
        yScale
      })
    );
  refreshWorldTemplate();

  var sledder = Sledder({
    pubsub,
    container: svg,
    loader,
    getInstances: () => getSceneObjects("sled"),

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
  });

  return {
    render,
    refreshScene
  };
};
