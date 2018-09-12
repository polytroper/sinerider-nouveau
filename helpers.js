var math = require('mathjs');
var _ = require('lodash');
var Color = require('color');

var translate = (x, y) => {
	return `translate(${x}, ${y})`;
}

var rotate = a => {
	a = -a;
	return `rotate(${a})`;
}

var scale = s => {
	return `scale(${s})`;
}

var transform = (x, y, a = 0, s = 1) => {
	return translate(x, y) + ", " + rotate(a) + ", " + scale(s);
}

var lerp = (a, b, t) => {
	return b*t + a*(1-t);
}

let intsToRgb = (r, g, b) => {
	return `rgb(${r}, ${g}, ${b})`;
}

let floatsToRgb = (r, g, b) => {
	return intsToRgb(
		math.floor(r*255),
		math.floor(g*255),
		math.floor(b*255)
	);
}

let intToGrayscale = v => {
	return `rgb(${v}, ${v}, ${v})`;
}

let floatToGrayscale = v => {
	return intToGrayscale(math.floor(v*255));
}

let parseColor = c => {
	if (_.isNumber(c))
		return floatToGrayscale(c);

	if (_.isObject(c))
	{
		if (_.has(c, "_data"))
		{
			let a = c._data;
			return floatsToRgb(a[0], a[1], a[2]);
		}
	}

	return _.toString(c);
}

let normalize = (vector) => {
	var mag = Math.sqrt(vector.x*vector.x + vector.y*vector.y);
	vector.x /= mag;
	vector.y /= mag;
}

let getQueryString = (field, url) => {
    var href = url ? url : window.location.href;
    var reg = new RegExp( '[?&]' + field + '=([^&#]*)', 'i' );
    var string = reg.exec(href);
    return string ? string[1] : null;
}

let vectorLength = (x, y) => {
	return Math.sqrt(x*x+y*y);
}

let pointSquareDistance = (p, c, s) => {
	let pc = math.subtract(c, p);
	let dx = math.abs(math.re(pc));
	let dy = math.abs(math.im(pc));

	let edx = math.max(0, dx-s/2);
	let edy = math.max(0, dy-s/2);

	return vectorLength(edx, edy);
}

let isComplex = v => {
	if (!_.isObject(v))
		return false;

	if (!_.has(v, "re"))
		return false;

	if (!_.has(v, "im"))
		return false;

	return true;
}

function sqr(x) { return x * x }
function dist2(v, w) { return sqr(v.x - w.x) + sqr(v.y - w.y) }
function distToSegmentSquared(p, v, w) {
  var l2 = dist2(v, w);
  if (l2 == 0) return dist2(p, v);
  var t = ((p.x - v.x) * (w.x - v.x) + (p.y - v.y) * (w.y - v.y)) / l2;
  t = Math.max(0, Math.min(1, t));
  return dist2(p, { x: v.x + t * (w.x - v.x),
                    y: v.y + t * (w.y - v.y) });
}
function distToSegment(p, v, w) { return Math.sqrt(distToSegmentSquared(p, v, w)); }

module.exports = {
	translate,
	rotate,
	transform,
	lerp,
	floatToGrayscale,
	intToGrayscale,
	parseColor,
	normalize,
	getQueryString,
	pointSquareDistance,
	isComplex,
}