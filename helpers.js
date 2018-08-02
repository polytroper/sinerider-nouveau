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

module.exports = {
	translate,
	rotate,
	transform,
	lerp,
	normalize
}