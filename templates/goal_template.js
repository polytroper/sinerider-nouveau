var _ = require("lodash");
const math = require("mathjs");
const html = require("choo/html");
const Nanocomponent = require("nanocomponent");
const Tone = require("tone");

//create a synth and connect it to the master output (your speakers)
const synth = new Tone.Synth().toMaster();
const synthNotes = [
  "C",
  "C#",
  "D",
  "D#",
  "E",
  "F",
  "F#",
  "G",
  "G#",
  "A",
  "A#",
  "B"
];

const numberToNote = i => {
  i = Math.max(1, Math.min(i, 100));
  const octave = Math.ceil(i / 12);
  const note = synthNotes[(i - 1) % 12];
  return note + octave;
};

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

class GoalComponent extends Nanocomponent {
  constructor() {
    super();
    this.x = 0;
    this.y = 0;
    this.a = 0;
    this.transformString = "";
    this.complete = false;
  }

  updateCompletion(instance) {
    let { _physicsHits } = instance;
    let playerHit =
      true &&
      _.find(
        _physicsHits,
        v =>
          v.partner._physicsLayer == "player" ||
          v.partner._physicsLayer == "player_trigger"
      );
    // console.log("Updating completion of");
    // console.log(instance);

    if (playerHit) instance.complete = true;
  }

  update(state) {
    let { instance, camera, xScale, yScale } = state;

    this.updateCompletion(instance);

    let {
      p,
      a,
      color,
      complete,
      _physicsHits,
      note = null,
      duration = 1
    } = instance;

    let changed = false;

    let x = xScale(math.re(p));
    let y = yScale(math.im(p));

    let cameraScale = camera.scale;

    if (
      x != this.x ||
      y != this.y ||
      a != this.a ||
      cameraScale != this.cameraScale
    ) {
      this.x = x;
      this.y = y;
      this.a = a;
      this.cameraScale = cameraScale;
      this.transformString = transform(x, y, a, cameraScale / 20);
      changed = true;
    }

    if (!this.complete && complete != this.complete) {
      if (note != null) {
        if (_.isNumber(note)) note = numberToNote(note);

        console.log("Triggering synth note " + note);
        //play a middle 'C' for the duration of an 8th note
        synth.triggerAttackRelease(note, duration);
      }

      this.complete = complete;
      changed = true;
    }

    if (color != this.color) {
      this.color = color;
      changed = true;
    }

    return changed;
  }

  createBoxNode(instance) {
    const { complete, color = "green" } = instance;
    const transformString = this.transformString;

    return html`
			<g class="goal"
				transform="${transformString}"
				>
  			<rect class="goalSquare"
          x=-10
          y=-10
          width=20
          height=20
  				style="
  					fill: ${complete ? color : "white"};
  					stroke: black;
            stroke-width: 1;
  				"
  				/>
      </g>
		`;
  }

  createCircleNode(instance) {
    let { complete, color } = instance;
    const transformString = this.transformString;

    return html`
			<g class="goal"
				transform="${transformString}"
				>
  			<circle class="goalCircle"
          cx=0
          cy=0
          r=10
  				style="
  					fill: ${complete ? "green" : "white"};
  					stroke: black;
            stroke-width: 1;
  				"
  				/>
      </g>
		`;
  }

  createElement(state) {
    // console.log("Creating Goal Template ")
    // console.log(state);

    let { instance, camera, xScale, yScale } = state;

    let { p, a, color, ball } = instance;

    let transformString = this.transformString;

    return ball
      ? this.createCircleNode(instance)
      : this.createBoxNode(instance);
  }
}

module.exports = GoalComponent;
