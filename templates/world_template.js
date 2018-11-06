var _ = require("lodash");
const math = require("mathjs");
const html = require("choo/html");
const Nanocomponent = require("nanocomponent");
const Nanomap = require("nanomap");

var TextComponent = require("./text_template");
var GoalComponent = require("./goal_template");

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
} = require("../helpers");

const componentMapper = new Nanomap(
  { gc: true },
  {
    text: TextComponent,
    goal: GoalComponent,
    default: TextComponent
  }
);

class WorldComponent extends Nanocomponent {
  constructor() {
    super();
  }

  update(state) {
    let { scene, camera, xScale, yScale } = state;

    // console.log("Refreshing World:");
    // console.log(scene);

    let changed = true;

    // If we ever have actual rendering conditionals, they go here
    if (true) {
      changed = true;
    }

    return changed;
  }

  createElement(state) {
    // console.log("Creating World Element");
    // console.log(state);

    let { scene, camera, xScale, yScale } = state;

    return html`
			<g class="world">
				${scene.map(componentMapper)}
			</g>
		`;
  }
}

module.exports = WorldComponent;
