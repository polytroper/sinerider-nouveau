const html = require('choo/html')
const Nanocomponent = require('nanocomponent')

class VictoryComponent extends Nanocomponent {
	constructor () {
		super();
		this.json = false;
	}

	update (state) {
		if (state.json != this.json) {
			this.json = state.json;
			return true;
		}
		return false;
	}

	onClickVictoryButton (url) {
		console.log("Navigating to "+this.url);
		window.open(this.url);
	}

	createElement (state) {
		let {
			json,
			show,
		} = state;
		this.url = url;

		return html`
			<div class="jsonEnvelope">
				${!show ? "" : html`
					<div class="jsonOuter">
						<div class="jsonInner">
							<textarea class="jsonText" value="${JSON.stringify(json)}"/>
						</div>
					</div>
				`}
			</div>
		`
	}
}

module.exports = VictoryComponent;