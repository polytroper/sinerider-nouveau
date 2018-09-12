const _ = require("lodash");

const upgraders = {
	"0.0.0": json => {
		json.version = "0.0.1";

		let sledder = "sledder={o:\"sled\", p:0}";

		if (json.originals)
			json.originals.unshift(sledder);

		if (json.expressions)
			json.expressions.unshift(sledder);
	},
	"0.0.1": json => {
		json.version = "0.0.2";

	},
	"0.0.2": json => {
		json.version = "0.0.3";

	}
}

const upgrade = (json, version) => {
	if (!upgraders[version]) {
		console.log("Unable to upgrade from "+json.version+" to given version "+version);

	}

	while (json.version != version && upgraders[json.version]) {
		console.log("Upgrading from "+json.version+" toward version "+version);
		upgraders[json.version](json);
	}

	if (json.version != version)
		console.log("Was unable to upgrade this data from "+json.version+" toward version "+version);
	else 
		console.log("Data's version "+json.version+" matches given version "+version);
}

module.exports = {
	upgrade
}