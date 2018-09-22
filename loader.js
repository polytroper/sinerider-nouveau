const _ = require("lodash");

const assets = {}
const requests = {}

const fetch = (url, callback) => {
	// console.log("Base64 Encoding Image at "+url);
	var xhr = new XMLHttpRequest();
	xhr.onload = function() {
		// console.log("XHR Request Loaded for Image at "+url);
		var reader = new FileReader();
		reader.onloadend = function() {
			// console.log("Base64 Encoding Completed for Image at "+url);
			// console.log(reader.result);
			callback(url, reader.result);
		}
		reader.readAsDataURL(xhr.response);
	};
	xhr.open('GET', url);
	xhr.responseType = 'blob';
	xhr.send();
}

const loaded = (url, data) => {
	assets[url] = data;
	_.each(requests[url], cb => cb(data));
	_.unset(requests, url);
}

const request = (url, callback) => {
	// if (assets[url] == "") {
	// }

	if (_.has(assets, url)) {
		callback(assets[url]);
		return;
	}
	else {
		if (_.has(requests, url)) {
			requests[url].push(callback);
			return;
		}
		else {
			requests[url] = [callback];
			fetch(url, loaded);
			return;
		}
	}
}

module.exports = request;