const html = require('choo/html')
const Nanocomponent = require('nanocomponent')

class VictoryComponent extends Nanocomponent {
	constructor () {
		super();
		this.victory = false;
	}

	update (state) {
		if (state.victory != this.victory) {
			this.victory = state.victory;
			return true;
		}
		return false;
	}


	createElement (state) {
		let {
			victory,
		} = state;

		return html`
			<div class="victoryEnvelope">
				${!victory ? "" : html`
					<div class="victoryOuter">
						<div class="victoryInner">
							YOU WIN
						</div>
					</div>
				`}
			</div>
		`
	}
}

module.exports = VictoryComponent;