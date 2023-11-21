const
	path = require('path'),
	{throttle} = require("./helpers.js"),
	{getFiles} = require("./getFiles.js");

const 
	updateAnnot = async function (
		info, serverSent, {sessid = void(0), channel = "streamOne"} = {}
	){
		const 
			static = path.join(info.rootFolder, info.serverConf.static),
			folders = ["gff", "bgz"],
			foldersIndex = ["tbi", "csi"],
			filesObj = await Promise.all(
				folders.map(d => getFiles(path.join(static, d)))
			)
			.then(results => results.flat(Infinity))
			.then(async files => {
				const indexes = await Promise.all(
					foldersIndex.map(
						d => getFiles(path.join(static, d))
					)
				)
				.then(results => results.flat(Infinity));
				return files.reduce((ac, d, i) => {
					switch(true) {
						case (indexes.includes(d + ".tbi")):
							ac[d] = d + ".tbi";
							break;
						case (indexes.includes(d + ".csi")):
							ac[d] = d + ".csi";
							break;
						default: 
							ac[d] = "";
					}
					return ac;
				},{})
			});
	
		/*
		TODO: implement a cache system in the outerscope of this function
		so that you can 'diff' and decide whether to broadcast or not. Needs:
		Map to String (Array.from(Map)) -> JSON.stringify -> cache
		*/
		if (sessid) {
			serverSent
			.msg(channel, sessid, {directive: "event", payload: "annot-file-list"})
			.msg(channel, sessid, {payload: filesObj})
		} else {
			serverSent
			.msgAll(channel, {directive: "event", payload: "annot-file-list"})
			.msgAll(channel, {payload: filesObj})
		}
		//console.log("files are", filesObj);
	},
	updateAnnotT = throttle(updateAnnot, {delay: 3000});

exports.updateAnnotF = updateAnnotT;
exports.updateAnnotFnt = updateAnnot; //no throttle

