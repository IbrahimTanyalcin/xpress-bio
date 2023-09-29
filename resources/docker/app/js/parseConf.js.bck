
const 
	{log, atob, oMerge} = require("./helpers.js"); 
module.exports = async ({conf, fields})=>{
	let defaultConf,
		pipeContents,
		envContents = process.env?.XPRESS_BIO_FIELDS,
		flag = (!!conf << 2) + (!!fields << 1) + !!envContents;
	try {
		defaultConf = require("./server/server.config.json");
	} catch {
		defaultConf = {};
	}
	switch(flag) {
		case 7:
		case 6:
		case 3:
		case 2:
			const {slurpAnonPipeBase64toJSON} = require("./slurpAnonPipeBase64toJSON.js");
			if ((pipeContents = await slurpAnonPipeBase64toJSON(fields)) instanceof Error){
				log("\x1b[31m", pipeContents, "\x1b[0m");
				process.exit(1);
			}
			if (flag === 7) {
				return oMerge(defaultConf, JSON.parse(atob(conf)), JSON.parse(atob(envContents)), pipeContents);
			} else if (flag === 6) {
				return oMerge(defaultConf, JSON.parse(atob(conf)), pipeContents);
			} else if (flag === 3) {
				return oMerge(defaultConf, JSON.parse(atob(envContents)), pipeContents);
			}
			return oMerge(defaultConf, pipeContents);
		case 5:
			return oMerge(defaultConf, JSON.parse(atob(conf)), JSON.parse(atob(envContents)));
		case 4:
			return oMerge(defaultConf, JSON.parse(atob(conf)));
		case 1: 
			return oMerge(defaultConf, JSON.parse(atob(envContents)));
		case 0:
			return defaultConf;
		default:
			log("\x1b[31m",
				"---app/js/getInfo.js---",
				"Configuration options could not be parsed",
				"Recheck --jsonconf/-j, --fields/-f options and",
				"app/js/server/server.config.json",
			"\x1b[0m");
			process.exit(1);
	}
};