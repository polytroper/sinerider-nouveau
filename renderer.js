const _ = require("lodash");
const math = require("mathjs");
const {
  translate,
  rotate,
  transform,
  parseColor,
  lerp,
  normalize
} = require("./helpers");

const Renderer = spec => {
  const {
    xScale,
    yScale,
    camera,

    getWidth,
    getHeight,
    getAspect,

    getRunning,
    getEditing,
    getBuilding,

    samples
  } = spec;

  const images = [];

  const sledderImage = new Image();
  sledderImage.src = "./assets/rider_peeps.png";

  const renderAxes = ctx => {
    ctx.save();

    ctx.strokeStyle = "#ddd";
    ctx.lineWidth = 2;

    ctx.beginPath();

    ctx.moveTo(xScale(0), 0);
    ctx.lineTo(xScale(0), getHeight());

    ctx.moveTo(0, yScale(0));
    ctx.lineTo(getWidth(), yScale(0));

    ctx.stroke();

    ctx.restore();
  };

  const renderGraph = (ctx, instance) => {
    ctx.fillStyle = "#000";
    ctx.beginPath();

    ctx.moveTo(getWidth(), getHeight());
    ctx.lineTo(0, getHeight());

    for (let i = 0; i < samples.length; i++) {
      let x = samples[i][0];
      let y = samples[i][1];

      x = xScale(x);
      y = yScale(y);

      ctx.lineTo(x, y);
    }
    ctx.fill();
  };

  const renderSled = (ctx, instance) => {
    const x = xScale(math.re(instance.p));
    const y = yScale(math.im(instance.p));

    ctx.translate(x, y);
    ctx.scale(camera.scale, camera.scale);
    ctx.rotate(-instance.a);

    // DRAW
    var size = 1;
    ctx.drawImage(sledderImage, -size / 2, -size, size, size);
  };

  const renderGoal = (ctx, instance) => {
    const x = xScale(math.re(instance.p));
    const y = yScale(math.im(instance.p));

    ctx.translate(x, y);
    ctx.scale(camera.scale / 20, camera.scale / 20);
    ctx.rotate(-instance.a);

    ctx.strokeStyle = "#000";
    ctx.fillStyle = instance.complete ? instance.color : "#FFF";
    ctx.lineWidth = 1;

    if (instance.ball) {
      ctx.beginPath();
      ctx.arc(0, 0, 10, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
    } else {
      ctx.fillRect(-10, -10, 20, 20);
      ctx.strokeRect(-10, -10, 20, 20);
    }
  };

  const renderText = (ctx, instance) => {
    const x = xScale(math.re(instance.p));
    const y = yScale(math.im(instance.p));

    ctx.font = instance.fontSize + "px Courier";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillStyle = parseColor(instance.color);

    ctx.translate(x, y);
    ctx.scale(camera.scale, camera.scale);
    ctx.rotate(-instance.a);

    ctx.fillText(instance.v, 0, 0);
  };

  const renderImage = (ctx, instance) => {
    const size = instance.size;
    const anchorX = math.re(instance.anchor);
    const anchorY = math.im(instance.anchor);

    const x = xScale(math.re(instance.p));
    const y = yScale(math.im(instance.p));

    ctx.translate(x, y);
    ctx.scale(camera.scale, camera.scale);
    ctx.rotate(-instance.a);

    let image = _.find(images, v => (v.src = instance.src));

    if (!image) {
      image = new Image();
      image.src = instance.src;
      images.push(image);
    }

    ctx.drawImage(
      image,
      (-size * (anchorX + 1)) / 2,
      (-size * (-anchorY + 1)) / 2,
      size,
      size
    );
  };

  const renderers = {
    graph: renderGraph,
    sled: renderSled,
    goal: renderGoal,
    text: renderText,
    image: renderImage
  };

  const clear = ctx => {
    ctx.clearRect(0, 0, ctx.canvas.width, ctx.canvas.height);
  };

  const render = (ctx, instances) => {
    clear(ctx);

    renderAxes(ctx);

    for (let i = 0; i < instances.length; i++) {
      let instance = instances[i];
      if (renderers[instance.o]) {
        ctx.save();
        renderers[instance.o](ctx, instance);
        ctx.restore();
      }
    }
  };

  return render;
};

module.exports = Renderer;
