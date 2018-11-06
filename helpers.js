var math = require("mathjs");
var _ = require("lodash");
var Color = require("color");

const r2d = 180 / Math.PI;
const d2r = Math.PI / 180;

const dot = (x0, y0, x1, y1) => x0 * x1 + y0 * y1;

var translate = (x, y) => {
  return `translate(${x}, ${y})`;
};

var rotate = a => {
  a = -a * r2d;
  return `rotate(${a})`;
};

var scale = s => {
  return `scale(${s})`;
};

var transform = (x, y, a = 0, s = 1) => {
  return translate(x, y) + ", " + rotate(a) + ", " + scale(s);
};

var lerp = (a, b, t) => {
  return b * t + a * (1 - t);
};

const clamp = (a, b, t) => {
  return Math.max(a, Math.min(t, b));
};

let intsToRgb = (r, g, b) => {
  return `rgb(${r}, ${g}, ${b})`;
};

let floatsToRgb = (r, g, b) => {
  return intsToRgb(
    math.floor(r * 255),
    math.floor(g * 255),
    math.floor(b * 255)
  );
};

let intToGrayscale = v => {
  return `rgb(${v}, ${v}, ${v})`;
};

let floatToGrayscale = v => {
  return intToGrayscale(math.floor(v * 255));
};

let parseColor = c => {
  if (_.isNumber(c)) return floatToGrayscale(c);

  if (_.isObject(c)) {
    if (_.has(c, "_data")) {
      let a = c._data;
      return floatsToRgb(a[0], a[1], a[2]);
    }
  }

  return _.toString(c);
};

let truncate = (v, n = 1) => {
  let e = math.pow(10, n);
  return math.round(v * e) / e;
};

let normalize = vector => {
  var mag = Math.sqrt(vector.x * vector.x + vector.y * vector.y);
  vector.x /= mag;
  vector.y /= mag;
};

let getQueryString = (field, url) => {
  var href = url ? url : window.location.href;
  var reg = new RegExp("[?&]" + field + "=([^&#]*)", "i");
  var string = reg.exec(href);
  return string ? string[1] : null;
};

let vectorLength = (x, y) => {
  return Math.sqrt(x * x + y * y);
};

let pointSquareDistance = (p, c, s) => {
  let pc = math.subtract(c, p);
  let dx = math.abs(math.re(pc));
  let dy = math.abs(math.im(pc));

  let edx = math.max(0, dx - s / 2);
  let edy = math.max(0, dy - s / 2);

  return vectorLength(edx, edy);
};

let isComplex = v => {
  if (!_.isObject(v)) return false;

  if (!_.has(v, "re")) return false;

  if (!_.has(v, "im")) return false;

  return true;
};

let incrementalInsert = (array, value, index) => {
  while (array.length < index) array.push(null);

  if (array.length == index) array.push(value);
  else array[index] = value;
};

var fetchImage = function(url, callback) {
  // console.log("Base64 Encoding Image at "+url);
  var xhr = new XMLHttpRequest();
  xhr.onload = function() {
    // console.log("XHR Request Loaded for Image at "+url);
    var reader = new FileReader();
    reader.onloadend = function() {
      // console.log("Base64 Encoding Completed for Image at "+url);
      // console.log(reader.result);
      callback(reader.result);
    };
    reader.readAsDataURL(xhr.response);
  };
  xhr.open("GET", url);
  xhr.responseType = "blob";
  xhr.send();
};

function sqr(x) {
  return x * x;
}
function distanceSquared(ax, ay, bx, by) {
  return sqr(ax - bx) + sqr(ay - by);
}
function distance(ax, ay, bx, by) {
  return Math.sqrt(distanceSquared(ax, ay, bx, by));
}

const projectPointToSegmentReturns = {
  x: 0,
  y: 0,
  d: 0
};
function projectPointToSegment(px, py, ax, ay, bx, by) {
  const l2 = distanceSquared(ax, ay, bx, by);
  if (l2 == 0) {
    projectPointToSegmentReturns.x = ax;
    projectPointToSegmentReturns.y = ay;
    projectPointToSegmentReturns.d = distance(px, py, ax, ay);
    return projectPointToSegmentReturns;
  }

  let t = ((px - ax) * (bx - ax) + (py - ay) * (by - ay)) / l2;
  t = Math.max(0, Math.min(1, t));

  const sx = ax + t * (bx - ax);
  const sy = ay + t * (by - ay);
  const d = distance(px, py, sx, sy);

  projectPointToSegmentReturns.x = sx;
  projectPointToSegmentReturns.y = sy;
  projectPointToSegmentReturns.d = d;
  return projectPointToSegmentReturns;
}

const rotatePointReturns = [0, 0];

const rotatePoint = (x, y, a) => {
  const ca = Math.cos(a);
  const sa = Math.sin(a);
  rotatePointReturns[0] = x * ca - y * sa;
  rotatePointReturns[1] = x * sa + y * ca;
  return rotatePointReturns;
};

module.exports = {
  r2d,
  d2r,
  dot,
  rotatePoint,
  translate,
  rotate,
  transform,
  lerp,
  clamp,
  floatToGrayscale,
  intToGrayscale,
  parseColor,
  truncate,
  normalize,
  getQueryString,
  pointSquareDistance,
  incrementalInsert,
  fetchImage,
  isComplex,
  distance,
  distanceSquared,
  projectPointToSegment
};
