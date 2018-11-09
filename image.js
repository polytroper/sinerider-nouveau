var d3 = require("d3");
var _ = require("lodash");
var math = require("mathjs");

var {
  translate,
  rotate,
  transform,
  lerp,
  floatToGrayscale,
  intToGrayscale,
  parseColor,
  normalize,
  fetchImage,
  pointSquareDistance
} = require("./helpers");

module.exports = spec => {
  var {
    pubsub,
    container,
    loader,

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

  container = container.append("g").attr("class", "images");

  var images;

  var calculateSize = d => d.size * 32;

  var calculateOffsetX = d => {
    let anchorX = math.re(d.anchor);
    let size = calculateSize(d);
    return lerp(-size, 0, 1 - (anchorX + 1) / 2);
  };

  var calculateOffsetY = d => {
    let anchorY = math.im(d.anchor);
    let size = calculateSize(d);
    return lerp(-size, 0, (anchorY + 1) / 2);
  };

  var refreshImageTransforms = () => {
    container
      .selectAll(".image")
      .attr("transform", d =>
        transform(
          xScale(math.re(d.p)),
          yScale(math.im(d.p)),
          0,
          camera.scale / 20
        )
      );

    // container.selectAll(".imageNode")
  };

  var fetchImageData = d => {
    if (d.url != d._url) {
      d.url = d._url;

      fetchImage("assets/rider_peeps.png", v => {
        sledderImage64 = v;
        refreshSledderImages();
      });
    }
  };

  var loadImageAsset = d => {
    loader(d.url).then(v => {});
  };

  var refreshImageAssets = () => {
    images.select(".imageNode").attr("xlink:href", d => d.url);
  };

  var refreshImages = () => {
    var instances = getInstances();

    images = container.selectAll(".image").data(instances);
    images.exit().remove();

    // var imageNodes = container.selectAll(".imageNode")

    var enterImages = images
      .enter()
      .append("g")
      .attr("class", "image");

    var imageNodes = enterImages
      .append("image")
      .attr("class", "imageNode")
      .attr("image-anchor", "middle")
      .attr("alignment-baseline", "middle")
      .attr("crossorigin", "anonymous");

    images = enterImages.merge(images);

    images
      .select(".imageNode")
      .style("font-size", d => math.round(d.fontSize * 20) + "px")
      .attr("xlink:href", d => d.src)
      .attr("x", calculateOffsetX)
      .attr("y", calculateOffsetY)
      .attr("width", calculateSize)
      .attr("height", calculateSize);

    refreshImageTransforms();
  };

  var render = () => {
    refreshImageTransforms();
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

  pubsub.subscribe("onRefreshScene", refreshImages);

  return {
    render
  };
};
