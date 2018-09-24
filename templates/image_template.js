var _ = require('lodash');
const math = require('mathjs');
const html = require('choo/html');
const Nanocomponent = require('nanocomponent')

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
} = require('../helpers');

class ImageComponent extends Nanocomponent {
	constructor () {
		super();
		this.x = 0;
		this.y = 0;
		this.a = 0;
		this.transformString = "";
		this.url = "";
		this.src = "";
	}

	update (state) {
		let {
			instance,
			camera,
			xScale,
			yScale,
		} = state;

		let {
			p,
			a,
			v,
			url,
			src,
			color,
			fontSize,
		} = instance;

		let changed = false;

		let x = xScale(math.re(p));
		let y = yScale(math.im(p));

		let cameraScale = camera.scale;

		if (x != this.x ||
			y != this.y ||
			a != this.a ||
			cameraScale != this.cameraScale
		) {
			this.x = x;
			this.y = y;
			this.a = a;
			this.cameraScale = cameraScale;
			this.transformString = transform(x, y, a, cameraScale/20);
			changed = true;
		}

		if (v != this.v) {
			this.v = v;
			changed = true;
		}

		if (url != this.url) {
			this.url = url;
			changed = true;
		}

		if (src != this.src) {
			this.src = src;
			changed = true;
		}

		return changed;
	}

	onClick (url) {
		console.log("Navigating to "+url);

		if (_.startsWith(url, "/")) {
		}
		else if (_.startsWith(url, "https://")) {
		}
		else if (_.startsWith(url, "http://")) {
		}
		else {
			url = "https://"+url;
		}
		window.location.href = url;
	}


	wrapWithLink (node, url) {
		let transformString = this.transformString;

		let onClick = this.onClick;

		return html`
			<g class="image"
				transform="${transformString}"
				onclick=${() => onClick(url)}
				style="
					cursor: pointer;
				"
				>
				${node}
			</g>
		`
	}

	wrapWithGroup (node) {
		let transformString = this.transformString;

		return html`
			<g class="image"
				transform="${transformString}"
				>
				${node}
			</g>
		`
	}

	createImageNode (instance) {
		let {
			v,
			color,
			fontSize,
			url,
			src,
		} = instance;

		return html`
			<image class="imageNode"
				alignment-baseline="middle"
				style="
					font-size:${math.round(fontSize*20)}px;
					fill:${parseColor(color)};
				"
				>
				${v}
			</text>
		`
	}

	createElement (state) {
		// console.log("Creating Text Template ")
		// console.log(state);

		let {
			instance,
			camera,
			xScale,
			yScale,
		} = state;

		let {
			p,
			a,
			v,
			url,
			src,
			color,
			fontSize,
		} = instance;

		let transformString = this.transformString;

		let textNode = this.createImageNode(instance);

		return url == "" ?
			this.wrapWithGroup(textNode) :
			this.wrapWithLink(textNode, url)
	}
}

module.exports = ImageComponent;