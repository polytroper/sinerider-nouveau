var _ = require('lodash');
const d3 = require('d3');
const html = require('choo/html')
const Nanocomponent = require('nanocomponent')

class VictoryComponent extends Nanocomponent {
	constructor () {
		super();
	}

	update (state) {
		let u = false
		if (state.record != this.record) {
			this.record = state.record;
			u = true;
		}
		if (state.editing != this.editing) {
			this.editing = state.editing;
			u = true;
		}
		if (state.recordTime != this.recordTime) {
			this.recordTime = state.recordTime;
			u = true;
		}
		if (state.gifBlob != this.gifBlob) {
			this.gifBlob = state.gifBlob;
			u = true;
		}
		if (state.gifProgress != this.gifProgress) {
			this.gifProgress = state.gifProgress;
			u = true;
		}
		return u;
	}

	onClickGifLink (blob) {
		console.log("OPENING RENDERED GIF");
		window.open(URL.createObjectURL(blob));
	}

	createElement (state) {
		let {
			editing,

			record,
			setRecord,

			recordTime,
			setRecordTime,

			gifBlob,
			gifProgress,
		} = state;

		let cb = this.onClickGifLink;
		let onClickGifLink = gifBlob ? () => cb(gifBlob) : () => {};

		return html`
			<div class="recorderEnvelope">
				${!editing ? "" : html`
					<div class="recorderOuter">
						${!record ? "" : html`
						<div class="recorderInner">
							${gifProgress == 0 ? "" : html`
							<div class="recorderLink">
								<div class="recorderTime"
									onclick=${onClickGifLink}
									>
									<div>
										${(Math.round(gifProgress*100)) + "%"}
									</div>
								</div>
							</div>
							`}
							<input
								type="number"
								class="recorderTime"
								value="${recordTime}"
								oninput="${function(){setRecordTime(this.value)}}"
							/>
						</div>
						`}
						<div class="recorderToggle"
							onclick=${() => setRecord(!record)}
							style="color:${record ? "red" : "black"}"
							>
							<div>•</div>
						</div>
					</div>
				`}
			</div>
		`
	}
}

module.exports = VictoryComponent;