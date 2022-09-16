const path = require('path'),
	  {getFiles} = require("./getFiles.js"),
	  {getStats} = require("./getStats.js");

//TODO
exports.getFilesAndStats = function (abspath, {cacheKey = "__getfilesandstats", props = ["size"], memcache}){
	
	
	/* getFiles(path.join(info.rootFolder, info.serverConf.static, "fa"), {relativeTo: "/"})
	.then(faFiles => 
		getStats(faFiles.map(d => "/" + d))
		.then(faStats => faStats.map((d,i) => {
			return {[path.basename(faFiles[i])]: d.size}
		}))
		.then(ArrOfObj => ArrOfObj.reduce((ac,d) => Object.assign(ac,d),{}))
		.then(payload => serverSent
			.msg("streamOne", req.session.id,  {directive: "event", payload: "fa-file-stats"})
			.msg("streamOne", req.session.id, {payload})
		)
	); */
}