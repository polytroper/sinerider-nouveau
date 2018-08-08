var math = require('mathjs');

var translate = (x, y) => {
	return "translate("+x+", "+y+")";
}

var rotate = a => {
	return "rotate("+(-a)+")";
}

var scale = s => {
	return "scale("+s+")";
}

var transform = (x, y, a = 0, s = 1) => {
	return translate(x, y) + ", " + rotate(a) + ", " + scale(s);
}

var lerp = (a, b, t) => {
	return b*t + a*(1-t);
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
	normalize,
	getQueryString,
	pointSquareDistance
}