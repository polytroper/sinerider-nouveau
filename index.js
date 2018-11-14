var d3 = require("d3");
var _ = require("lodash");
var math = require("mathjs");

var lz = require("lz-string");
var pubsub = require("pubsub-js");
var autosizeInput = require("autosize-input");

var Ui = require("./ui");
var World = require("./world");
var Versions = require("./versions");
var loader = require("./loader");

var Nanocomponent = require("nanocomponent");

var FileSaver = require("file-saver");
var Gif = require("gif.js.optimized");

var {
  translate,
  rotate,
  transform,
  lerp,
  normalize,
  pointSquareDistance
} = require("./helpers");

const stepMode = false;

var parserVersion = "0.0.1";

var expressions = [];
var levelledExpressions = [];

var r2d = 180 / Math.PI;
var expressionKeyIndex = 0;

// var getWidth = () => width;
// var getHeight = () => height;
// var getAspect = () => aspect;

var record = false;
var getRecord = () => record;
var setRecord = v => {
  record = v;
  pubsub.publish("onSetRecord");
  onResize();
};

var recordResolution = 512;
var getRecordResolution = () => recordResolution;
var setRecordResolution = resolution => {
  resolution = math.min(resolution, 2048);
  console.log("Setting Record Resolution " + resolution);
  recordResolution = resolution;
  onResize();
};

var width = window.innerWidth;
var height = window.innerHeight;
var aspect = width / height;

var getWidth = () => (getRecord() ? recordResolution : window.innerWidth);
var getHeight = () => (getRecord() ? recordResolution : window.innerHeight);
var getAspect = () => getWidth() / getHeight();

var body = d3.select("body");

var container = body.append("div").attr("class", "container");

var gifCanvas = container
  .append("canvas")
  .attr("class", "gifCanvas")
  .style("display", "none")
  .attr("width", getWidth())
  .attr("height", getHeight());

var frameRate = 60;
var frameInterval = 1 / frameRate;
var frameIntervalMS = 1000 / frameRate;

var getFrameInterval = () => frameInterval;
var getFrameIntervalMS = () => frameIntervalMS;

var clockTime = 0;
var gravity = -9.8 / frameRate;
var macroState = 1;

var loadedIndirectly = false;

var getMacroState = () => macroState;
var getBuilding = () => macroState == 0;
var getEditing = () => macroState == 1;
var getRunning = () => macroState == 2;
var getClockTime = () => clockTime;
var getGravity = () => gravity;

var recordTime = 3;

var getRecording = () => record && getRunning();

var getRecordTime = () => recordTime;
var setRecordTime = v => {
  recordTime = v;
  pubsub.publish("onSetRecord");
};

var gif = null;
var gifBlob = null;
var gifProgress = 0;

var getGif = () => gif;
var getGifBlob = () => gifBlob;
var getGifProgress = () => gifProgress;

var sampler = null;
var defaultScope = {
  x: 0,
  t: 0,
  d3
};
var sampleScope;

var sceneObjectTypes = {
  image: {
    p: math.complex(0, 0),
    src: "http://polytrope.com/favicon.png",
    size: 1,
    anchor: 0,
    color: 0
  },
  goal: {
    p: math.complex(0, 0),
    v: math.complex(0, 0),
    a: 0,
    complete: false,
    color: "green",
    ball: false,
    _physicsOffset: math.complex(0, 0),
    _physicsHitCount: 0,
    _physicsHits: [],
    _physicsLayer: "goals",
    _physicsKinetic: v => (v.ball ? true : false),
    _physicsShape: v => (v.ball ? "circle" : "box"),
    _physicsSize: v => (v.ball ? math.complex(0.5, 0.5) : math.complex(1, 1)),
    _physicsRadius: 0.5
  },
  text: {
    p: math.complex(0, 0),
    v: "Text!",
    url: "",
    fontSize: 1,
    anchor: 0,
    color: 0
  },
  sled: {
    p: math.complex(0, 0),
    v: math.complex(0, 0),
    a: 0,
    _physicsUpright: math.complex(0, 1),
    _physicsOffset: math.complex(0, 0),
    _physicsHitCount: 0,
    _physicsHits: [],
    _physicsLayer: "player",
    _physicsKinetic: true,
    _physicsShape: "point",
    _physicsSubcolliders: [
      {
        _physicsParent: null,
        _physicsKinetic: false,
        _physicsLayer: "player_trigger",
        _physicsShape: "circle",
        _physicsOffset: math.complex(0, 0.6),
        _physicsRadius: 0.6
      }
    ]
  }
};

var sceneScope = {};
var sceneObjects = {};
_.each(sceneObjectTypes, (v, k) => (sceneObjects[k] = []));

var resetScope = () => {
  console.log("Resetting scope");
  sampleScope = _.cloneDeep(defaultScope);
  sampleScope.t = clockTime;
};
resetScope();

var isComplex = c => {
  if (!_.isObject(c)) return false;

  return _.has(c, "re") && _.has(c, "im");
};

var parseExpression = o => {
  // console.log(o);
  var expression = o.expression;
  var expressionIndex = _.indexOf(expressions, o);

  o.commentless = o.segments = o.expression.split("`");
  o.tagless = o.segments.join("");
  o.commentless = _.join(
    _.filter(_.split(o.tagless, "// "), (v, i) => i % 2 == 0),
    ""
  );
  o.preprocessed = o.commentless;
  o.unmodified = o.expression == o.original;

  o.segmentData = _.map(o.segments, (v, i) => ({
    index: i,
    str: v,
    set: s => setExpressionSegment(expressionIndex, i, s),
    hide: v == "" && i == o.segments.length - 1 && i % 2 == 1
  }));

  var evens = _.filter(o.segments, (v, i) => i % 2 == 0);
  var odds = _.filter(o.segments, (v, i) => i % 2 == 1);

  o.segmentPairs = _.zip(evens, odds);

  try {
    o.sampler = math.compile(o.preprocessed);
    var value = o.sampler.eval(sampleScope);

    if (isComplex(value)) o.sampleType = 1;
    else if (_.isString(value)) o.sampleType = 1;
    else if (_.isArray(value)) o.sampleType = 0;
    else if (_.isObject(value)) o.sampleType = 0;
    else if (_.isFunction(value)) o.sampleType = 0;
    else o.sampleType = 2;
  } catch (error) {
    o.sampler = null;
    o.sampleType = -1;
  }
};

var parseExpressions = () => {
  resetScope();
  console.log("Parsing...");
  _.each(expressions, (v, i) => parseExpression(v));
  console.log(sampleScope);
  console.log(expressions);

  for (let i = 0; i < 3; i++) {
    levelledExpressions[i] = _.filter(expressions, v => v.sampleType >= i);
  }
};

var evaluateExpression = o => {
  if (o.sampler == null) return;

  try {
    o.sampler.eval(sampleScope);
  } catch (error) {}
};

var evaluateExpressions = (level = 0) => {
  let e = levelledExpressions[level];
  for (let i = 0; i < e.length; i++) {
    evaluateExpression(e[i]);
  }
};

var getExpressionIndexByName = name => {
  return _.indexOf(expressions, v => _.startsWith(v.expression, name));
};

var getExpressionByName = name => {
  return _.find(expressions, v => _.startsWith(v.expression, name));
};

var getSceneObjects = (type = "") => {
  if (type == "") return sceneObjects;

  return sceneObjects[type];
};

var createSceneObject = v => {
  var defaults = _.cloneDeep(sceneObjectTypes[v.o]);
  _.each(defaults, (d, k) => {
    if (_.isFunction(d)) defaults[k] = d(v);
  });
  _.defaultsDeep(v, defaults);
  v._physicsParent = v;
  if (v._physicsSubcolliders) {
    _.each(v._physicsSubcolliders, d => {
      d._physicsParent = v;
      d._physicsHits = v._physicsHits;
    });
  }
  sceneObjects[v.o].push(v);
};

var tryCreateSceneObject = v => {
  // console.log("Trying to create scene object with:");
  // console.log(v);

  // if (_.isArray(v))
  if (v._data) {
    _.each(v._data, tryCreateSceneObject);
    return;
  }

  if (!_.isObject(v)) return;

  if (!_.has(v, "o")) return;

  if (!_.has(sceneObjects, v.o)) return;

  createSceneObject(v);
};

var refreshScene = () => {
  resetScope();
  evaluateExpressions();

  // console.log("Refreshing scene");
  // console.log(sampleScope);

  _.each(sceneObjects, (v, k) => (v.length = 0));
  _.each(sampleScope, tryCreateSceneObject);

  sceneScope = _.cloneDeep(sampleScope);

  // console.log(sceneObjects);

  world.refreshScene();

  pubsub.publish("onRefreshScene");
};

var sampleGraph = x => {
  sampleScope.x = x;
  evaluateExpressions(2);
  var sample = sampleScope.Y;

  if (!_.isNumber(sample)) sample = sample ? 1 : 0;

  return sample;
};

var sampleGraphVelocity = x => {
  let a = sampleGraph(x);
  sampleScope.t -= frameInterval;
  let b = sampleGraph(x);
  sampleScope.t += frameInterval;
  return (a - b) / frameInterval;
};

var sampleGraphSlope = x => {
  let e = 0.01;
  let y0 = sampleGraph(x);
  let y1 = sampleGraph(x + e);
  return (y1 - y0) / e;
};

var createExpression = s => {
  let e = {
    expression: _.isArray(s) ? s[0] : s,
    original: _.isArray(s) ? s[1] : s,
    sampleType: 2,
    sampler: null,
    _key: (expressionKeyIndex++).toString()
  };
  return e;
};

var setExpression = (index, expression, setUrl = true, setOriginal = true) => {
  console.log("Setting expression " + index + " to " + expression);
  expressions[index].expression = expression;

  if (setOriginal) expressions[index].original = expression;

  parseExpressions();
  refreshScene();
  pubsub.publish("onEditExpressions");

  if (setUrl) refreshUrl();
};

var setExpressionSegment = (
  expressionIndex,
  segmentIndex,
  expressionSegment,
  setUrl = true
) => {
  console.log(
    "Setting Expression " + expressionIndex + " Segment " + segmentIndex
  );
  let e = expressions[expressionIndex];
  let segments = e.segments;
  expressionSegment = expressionSegment.split("`").join("");
  segments[segmentIndex] = expressionSegment;
  let expression = segments.join("`");
  setExpression(expressionIndex, expression, setUrl, false);
};

var setExpressions = (a, b = []) => {
  console.log(
    "Setting expressions: " + JSON.stringify(a) + ", " + JSON.stringify(b)
  );
  b.length = a.length;
  b = _.map(b, (v, i) => (v ? v : a[i]));
  expressions = _.map(_.zip(a, b), createExpression);

  parseExpressions();
  refreshScene();
  pubsub.publish("onEditExpressions");
};

var getExpression = index => {
  return expressions[index];
};

var getExpressions = () => {
  return expressions;
};

var getExpressionStrings = () => {
  return _.map(expressions, v => v.expression);
};

var getOriginalStrings = () => {
  return _.map(expressions, v => v.original);
};

var resetToOriginals = () => {
  setExpressions(getOriginalStrings());
  refreshUrl();
};

var addExpression = (index = 0, expression = "") => {
  console.log("Adding expression " + index + ": " + expression);

  expressions.splice(index, 0, createExpression(expression));

  parseExpressions();
  refreshScene();

  pubsub.publish("onEditExpressions");
  refreshUrl();
};

var removeExpression = index => {
  console.log(
    "Removing expression " + index + ": " + expressions[index].expression
  );

  expressions.splice(index, 1);

  parseExpressions();
  refreshScene();

  pubsub.publish("onEditExpressions");
  refreshUrl();
};

var moveExpression = (expression, newIndex) => {
  // console.log("Moving expression "+expression.expression+" to "+newIndex);
  // console.log(getExpressionStrings());
  var i = _.indexOf(expressions, expression);
  var l = expressions.length;

  newIndex = math.max(0, newIndex);
  newIndex = math.min(l - 1, newIndex);

  expressions.splice(newIndex, 0, expressions.splice(i, 1)[0]);

  parseExpressions();
  refreshScene();

  pubsub.publish("onEditExpressions");
  refreshUrl();
};

// Legacy!
var getQueryString = () => {
  var url = window.location.href;
  var s = url.split("?=");
  if (s.length > 1) return s[1];
  else return "";
};

var getIndirectString = () => {
  var url = window.location.href;
  var s = url.split("?");
  if (s.length > 1) {
    s = s[1].split("#");
    return _.first(s);
  } else return "";
};

var getDataString = () => {
  var url = window.location.href;
  var s = url.split("#");
  if (s.length > 1) return s[1];
  else return "";
};

var getDomainString = () => {
  var url = window.location.href;
  return _.first(_.split(_.first(_.split(url, "?")), "#"));
};

var loadState = json => {
  console.log("Loading State");
  console.log(json);

  Versions.upgrade(json, parserVersion);

  let e = json["expressions"];
  let o = json["originals"];

  if (!o && e) o = _.clone(e);
  if (!e && o) e = _.clone(o);

  setExpressions(e, o);

  pubsub.publish("onLoadState");

  return true;
};

var serialize = (compress = true, pretty = false) => {
  var state = {
    version: parserVersion,
    expressions: getExpressionStrings(),
    originals: getOriginalStrings()
  };

  var stateString;

  if (pretty) stateString = JSON.stringify(state, null, "\t");
  else stateString = JSON.stringify(state);

  if (compress) stateString = lz.compressToBase64(stateString);

  return stateString;
};

var deserializeData = dataString => {
  console.log("Attempting to deserialize Data String: " + dataString);

  if (dataString == "") return false;

  try {
    var stateString = lz.decompressFromBase64(dataString);

    console.log("Attempting to load State String: ");
    var json = JSON.parse(stateString);

    return loadState(json);
  } catch (error) {
    setExpressions([
      "Something is wrong with this link. I can't load it :(",
      "ERROR: " + error.toString()
    ]);
    return false;
  }
};

var deserializeIndirect = indirectString => {
  console.log("Attempting to deserialize Indirect String: " + indirectString);
  d3.json(indirectString).then(loadState);
};

var loadFromUrl = () => {
  var s;

  // Legacy!
  var queryString = getQueryString();
  if (queryString != "") {
    deserializeData(queryString);
    return true;
  }

  var indirectString = getIndirectString();
  if (indirectString != "") {
    loadedIndirectly = true;
    deserializeIndirect(indirectString);
    return true;
  }

  var dataString = getDataString();
  if (dataString != "") {
    deserializeData(dataString);
    return true;
  }

  return false;
};

var refreshUrl = () => {
  if (loadedIndirectly) return;

  var url = window.location.href;

  if (url.includes("?")) url = url.slice(0, url.indexOf("?"));

  if (url.includes("#")) url = url.slice(0, url.indexOf("#"));

  url += "#" + serialize();

  window.history.replaceState({}, "SineRider", url);
};

var getVictoryUrl = () => {
  let url = _.has(sceneScope, "url");
  url = url ? sceneScope["url"].toString() : "";
  return url;
};

var saveData = () => {
  var s = serialize(false, true);
  console.log("Saving data: " + s);
  var blob = new Blob([s], { type: "text/plain;charset=utf-8" });
  FileSaver.saveAs(blob, "world.sinerider");
};

var blah = 0;

var recordFrame = cb => {
  // console.log("RECORDING FRAME");
  var t = getClockTime();
  var svg = d3.select("svg").node();
  // console.log(node);

  /*
	var img = new Image(),
		serialized = new XMLSerializer().serializeToString(node),
		svg = new Blob([serialized], {type: "image/svg+xml"}),
		url = URL.createObjectURL(svg);
	*/

  // get svg data
  var img = new Image();
  var xml = new XMLSerializer().serializeToString(svg);

  // make it base64
  var svg64 = btoa(xml);
  var b64Start = "data:image/svg+xml;base64,";

  // prepend a "header"
  var image64 = b64Start + svg64;

  img.onload = function() {
    if (blah < 3) {
      // console.log("Opening URL");
      // console.log(url);
      // window.open(url);
      blah++;
    }
    ctx = gifCanvas.node().getContext("2d");
    ctx.fillStyle = "white";
    ctx.fillRect(0, 0, getWidth(), getHeight());
    ctx.drawImage(img, 0, 0);
    gif.addFrame(ctx, {
      delay: frameIntervalMS,
      copy: true
    });
    cb();
  };

  img.src = image64;
};

var update = () => {
  let recording = getRecording();

  if (getRunning()) {
    clockTime += frameInterval;
    sampleScope.t = getClockTime();
  }

  evaluateExpressions(1);

  world.update();
  ui.update();

  if (stepMode) {
  } else if (recording) {
    /*
		pubsub.publish("onRender");

		pubsub.publish("onRenderGif", () => {
			setTimeout(update, 0);

			if (clockTime >= getRecordTime())
				setMacroState(1);
		});
*/
  } else setTimeout(update, frameIntervalMS);
};

var render = () => {
  if (getRecording()) {
    recordFrame(() => {
      if (clockTime >= getRecordTime()) setMacroState(1);

      update();
      requestAnimationFrame(render);
    });
  } else requestAnimationFrame(render);

  world.render();
  ui.render();
};

var setMacroState = s => {
  let wasRecording = getRecording();

  macroState = s;
  macroState = math.max(macroState, 0);
  macroState = math.min(macroState, 2);

  if (macroState == 0) {
    loadedIndirectly = false;
    resetToOriginals();
  }

  if (macroState == 2 && getRecord()) {
    console.log("BEGIN RECORDING");

    gif = new Gif({
      repeat: 0,
      // transparent: 'rgba(0, 0, 0, 0)', //still does not handle transparency correctly
      workers: 4,
      workerScript: "gif.worker.js",
      dither: "FloydSteinberg-serpentine",
      width: getWidth(),
      height: getHeight(),
      quality: 15
    });

    gifProgress = 0;
    gifBlob = null;

    gif.on("progress", function(p) {
      console.log("RENDER PROGRESS");
      gifProgress = p;

      pubsub.publish("onGifProgress");
    });

    gif.on("finished", function(blob) {
      console.log("RENDER COMPLETE");
      gifBlob = blob;
      pubsub.publish("onGifProgress");
    });

    pubsub.publish("onGifProgress");
  }

  if (wasRecording) {
    console.log("RENDERING RECORDING");
    pubsub.publish("onGifProgress");
    gif.render();
    gif = null;
  }

  clockTime = 0;
  sampleScope.t = 0;

  refreshScene();

  pubsub.publish("onSetMacroState");
};

var forwardMacroState = () => {
  setMacroState(macroState + 1);
};

var backwardMacroState = () => {
  setMacroState(macroState - 1);
};

var alternateMacroState = () => {};

var toggleClock = () => {
  if (getRunning()) backwardMacroState();
  else forwardMacroState();
};

var toggleBuilder = () => {
  if (getBuilding()) forwardMacroState();
  else backwardMacroState();
};

var getVictory = () => {
  if (!getRunning()) return false;

  let goals = getSceneObjects("goal");

  if (goals.length == 0) return false;

  let victory = _.every(goals, d => d.complete);

  return victory;
};

var onPressSpace = event => {
  if (getRunning() && stepMode) update();
};

var onPressEnter = event => {
  var shift = event.shiftKey;
  if (shift) toggleBuilder();
  else toggleClock();
};

var onPressS = event => {
  var control = event.ctrlKey;
  if (control) saveData();
};

var keyCodes = {
  Return: onPressEnter,
  Enter: onPressEnter,
  KeyS: onPressS,
  Space: onPressSpace
};

var onPressKey = () => {
  var k = d3.event.code;
  if (keyCodes[k]) {
    console.log("Pressing Key " + k + ", firing callback");
    keyCodes[k](d3.event);
  } else console.log("Pressing Key " + k);
};

var onResize = () => {
  gifCanvas.attr("width", getWidth()).attr("height", getHeight());

  pubsub.publish("onResize");
};

body.on("keypress", onPressKey);

window.addEventListener("resize", onResize);

var onRecordGifFrame = () => {};

pubsub.subscribe("onRecordGifFrame", onRecordGifFrame);

var welcomes = [
  "Welcome!",
  "Hola",
  "hi",
  "Sup",
  "oh hey",
  "Watch out!!",
  "Step right up!",
  "Tell your friends",
  "Is it hot in here?",
  "Enjoy responsibly.",
  "Enjoy irresponsibly.",
  "Be careful out there?",
  "Guaranteed effective!",
  "No warranty provided",
  "Best served chilled",
  "Lifetime warranty!",
  "Now with less salt",
  "You have arrived.",
  "go sledder go!!",
  "Wear a helmet"
];

var getRandomWelcome = () => {
  return _.shuffle(welcomes)[0];
};

var loadDefault = () => {
  setExpressions([
    'url = "/worlds/constants.sinerider"',
    'sled={o:"sled", p:0}',
    'goal_ball={o:"goal", p:-8+0.5i, ball: true, note: "C3"}',
    'goal_notes=["C4", "G4", "F4", "E4", "D4", "C4"]',
    'make_goal_box(n)={o: "goal", p: n*(1-i), note: goal_notes[n], color: d3.interpolatePlasma((n-1)/5)}',
    "goal_boxes=map(range(1, 6), make_goal_box)",
    'press_enter={o:"text", p:-4+1/2i, v:"Press ENTER"}',
    'welcome={o:"text", p:10-2i, v:"' + getRandomWelcome() + '"}',
    // 'begin_link={o:"text", p:80-30i, v:"Click here to begin", fontSize: 5, color:"white", url: "/?/worlds/constants.sinerider"}',
    // 'about_link={o:"text", p:92-38i, v:"About SineRider", fontSize: 3, color:"white", url: "/about.html"}',
    'sine={o:"text", p:48-10i, v:"Sine", fontSize: 8}',
    'rider={o:"text", p:68-16i, v:"Rider", fontSize: 8, color:"white"}',
    'img = {o:"image", p: 77-10i, anchor:-i, size:12, src:"assets/randall_tree.png"}',
    "a=-sin(x/32)*64/(abs(x/24)+1)",
    "b=8/(1+((x-60)/4)^2)",
    "c=1-1/(1+t)",
    "Y=`(a+b)`*c"
  ]);
};

const world = World({
  pubsub,
  container,
  loader,

  getWidth,
  getHeight,
  getAspect,

  getRunning,
  getEditing,
  getBuilding,
  getMacroState,

  getClockTime,
  getFrameInterval,
  getGravity,
  getSceneObjects,

  getRecord,
  getRecordTime,
  getRecording,

  getGif,
  recordFrame,

  sampleGraph,
  sampleGraphSlope,
  sampleGraphVelocity
});

const ui = Ui({
  pubsub,
  container,
  loader,

  getWidth,
  getHeight,
  getAspect,

  toggleClock,
  toggleBuilder,

  getRunning,
  getEditing,
  getBuilding,
  getMacroState,

  getVictory,
  getVictoryUrl,
  getDomainString,

  getRecord,
  setRecord,
  getRecordTime,
  setRecordTime,
  getRecordResolution,
  setRecordResolution,
  getRecording,
  recordFrame,
  getGifBlob,
  getGifProgress,

  getClockTime,

  setExpression,
  getExpression,
  getExpressions,
  setExpressionSegment,
  resetToOriginals,

  addExpression,
  removeExpression,
  moveExpression
});

if (!loadFromUrl()) loadDefault();
// console.log("No URL state to load");
// loadState(defaultState);

update();
render();

const choo = require("choo");
const html = require("choo/html");
const app = choo();

console.log(app);

const UiComponent = require("./templates/ui_template");
const ui_template = new UiComponent();

app.use((state, emitter) => {
  state.macroState = macroState;
  state.expressions = expressions;

  state.getRunning = getRunning;
  state.getEditing = getEditing;
  state.getBuilding = getBuilding;

  emitter.on("addExpression", () => {
    emitter.emit("render");
  });
});

// container.append('div')
// .attr('class', 'ui')

class AppComponent extends Nanocomponent {
  constructor() {
    super();
  }

  createElement(state, emit) {
    let { expression, macroState } = state;

    return html`
			<div class="container" id="chooContainer" style="width:${getWidth()}; height:${getHeight()};">
				${ui_template.render(state, emit)}
			</div>
		`;
  }
}

/*
const main_view = (state, emit) => {
	return html`
		<div class="container" id="chooContainer" style="width:${getWidth()}; height:${getHeight()};">
			${ui_template(state, emit)}
		</div>
	`
}
*/
app.route("/", ui_template.render);

// app.mount('.ui');

pubsub.subscribe("onEditExpressions", app.emit("onEditExpressions"));
pubsub.subscribe("onSetMacroState", app.emit("render"));

var editExpressionInputs = document.querySelectorAll(".editExpressionInput");
console.log("Resizing " + editExpressionInputs.length + " inputs");
_.each(editExpressionInputs, autosizeInput);

// d3.select("#chooContainer").node().raise();
