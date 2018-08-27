const _ = require('lodash')
const html = require('choo/html')
const Nanocomponent = require('nanocomponent')
const ExpressionComponent = require('./expression_template')

var Expression = new ExpressionComponent();

const RemoveExpressionRegion = state => {
	return html`
		<div class="removeExpressionRegion">
			
		</div>
	`
}

const BuildButton = state => {
	return html`
		<div class="buildButton">
			
		</div>
	`
}

const AddExpressionButton = state => {
	return html`
		<div class="addExpressionButton">
			
		</div>
	`
}

const StartButton = state => {
	return html`
		<div class="startButton">
			
		</div>
	`
}

class UiComponent extends Nanocomponent {
	constructor () {
		super();
	}

	createElement (state, emit) {
		let {
			expressions,
			macroState,

			getRunning,
			getEditing,
			getBuilding,
		} = state;

		return html`
			<div class="ui">
			</div>
		`
	}
}

module.exports = UiComponent;

/*
module.exports = (state, emit) => {
	let {
		expressions,
		macroState,

		getRunning,
		getEditing,
		getBuilding,
	} = state;

	return html`
		<div class="ui">
			<div class="overlayContainer">
				${getEditing() ? BuildButton() : ""}
				${getBuilding() ? RemoveExpressionRegion() : ""}
				${getBuilding() ? AddExpressionButton() : ""}
				${getEditing() ? StartButton() : ""}
			</div>
			<div class="bottomBar">
				<div class="expressions">
					${_.map(expressions, expression => Expression.render({
						expression,
						macroState,
					}))}
				</div>
			</div>
		</div>
	`
}
*/