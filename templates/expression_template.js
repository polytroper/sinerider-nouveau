const _ = require('lodash')
const html = require('choo/html')
const Nanocomponent = require('nanocomponent')
const autosizeInput = require('autosize-input');

const BuildExpression = state => {
	let {
		expression,
		
	} = state;

	return html`
		<div class="buildExpression">
			<input class="buildExpressionInput" value="${expression}"/>
		</div>
	`
}

/*
const EditExpressionSegment = state => {
	let {
		str,
		index,
	} = state;
//			<input class="editExpressionInput" value="${str}"/>
//			<div class="editExpressionExpander">${str}</div>

	return html`
		<div class="editExpressionSegment">
			<input class="editExpressionInput" value="${str}" disabled="${index%2==0}" /input>
		</div>
	`

}
*/

class EditExpressionSegmentComponent extends Nanocomponent {
	constructor () {
		super();
	}

	afterupdate (el) {
		console.log("UPDATING");
		autosizeInput(el);
	}

	update (state, emit) {
		console.log("UPDATING");
		if (textValue !== this.textValue) {
			this.textValue = textValue
			this.element.childNodes[0].value = this.textValue   // Directly update the element
		}
		return false                           // Don't call createElement again
	}

	createElement (state, emit) {
		let {
			str,
			index,
		} = state;

		return html`
			<div class="editExpressionSegment">
				<input class="editExpressionInput" value="${str}" disabled="${index%2==0}" /input>
			</div>
		`
	}
}

const EditExpressionSegment = new EditExpressionSegmentComponent();

const EditExpression = state => {
	let {
		expression,
		segmentData,
		
	} = state;

	return html`
		<div class="editExpression">
			<div class="editExpressionSegments">
				${_.map(segmentData, d => EditExpressionSegment.render(d))}
			</div>
			<div class="editExpressionTail">
			</div>
		</div>
	`
}

const PlayExpression = state => {
	let {
		expression,

	} = state;

	return html`
		<div class="playExpression">
			${expression}
		</div>
	`
}

/*
module.exports = (state, emit) => {
	let {
		expression,
		macroState,
	} = state;

	return html`
		<div class="expression">
			<div class="expressionEnvelope">
				<div class="expressionHandle">
					<div class="expressionHandleText">
						☰
					</div>
				</div>
				<div class="expressionTextEnvelope">
					${([
						BuildExpression,
						EditExpression,
						PlayExpression,
					])[macroState](expression)}
				</div>
			</div>
		</div>
	`
}
*/

/*
class EditExpression extends Nanocomponent {
	constructor () {
		super()

	}
	createElement (state, emit) {
		let {
			expression,
			segmentData,
		} = state;

		return html`
			<div class="editExpression">
				<div class="editExpressionSegments">
					${_.map(segmentData, EditExpressionSegment)}
				</div>
				<div class="editExpressionTail">
				</div>
			</div>
		`
	}
}
*/

class Expression extends Nanocomponent {
	constructor () {
		super()

	}

	createElement (state, emit) {
		let {
			expression,
			macroState,
		} = state;

		return html`
			<div class="expression">
				<div class="expressionEnvelope">
					<div class="expressionHandle">
						<div class="expressionHandleText">
							☰
						</div>
					</div>
					<div class="expressionTextEnvelope">
						${([
							BuildExpression,
							EditExpression,
							PlayExpression,
						])[macroState](expression)}
					</div>
				</div>
			</div>
		`
	}
}

module.exports = Expression;