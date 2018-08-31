var _ = require('lodash');
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

	onClickVictoryButton (url) {
		console.log("Navigating to "+url);
		window.open(url);
	}

	createElement (state) {
		let {
			victory,
			domain,
			url,
		} = state;

		var fullUrl = _.startsWith(url, "/") ? domain+"?"+url : url;

		return html`
			<div class="victoryEnvelope">
				${!victory ? "" : html`
					<div class="victoryOuter">
						<div class="victoryInner">
							<div class="victoryHeading">
								Complete!
							</div>
							${url == "" ? "" : html`
								<div class="victoryNextLevel">
									<div class="victoryUrl">
										${"Next Level: " + url}
									</div>
									<div class="victoryButton"
										 onclick=${() => this.onClickVictoryButton(fullUrl)}
										>
										<div>
											GO
										</div>
									</div>
								</div>
							`}
						</div>
					</div>
				`}
			</div>
		`
	}
}

module.exports = VictoryComponent;