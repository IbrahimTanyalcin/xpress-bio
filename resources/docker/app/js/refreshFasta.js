const path = require('path'),
      {getFiles} = require("./getFiles.js"),
      {getStats} = require("./getStats.js");

exports.refreshFasta = function({info, serverSent}){
    return getFiles(path.join(info.rootFolder, info.serverConf.static, "fa"), {relativeTo: "/"})
    .then(faFiles => 
        getStats(faFiles.map(d => "/" + d))
        .then(faStats => faStats.map((d,i) => {
        return {[path.basename(faFiles[i])]: d.size}
        }))
        .then(ArrOfObj => ArrOfObj.reduce((ac,d) => Object.assign(ac,d),{}))
        .then(payload => {
            serverSent
            .msgAll("streamOne", {directive: "event", payload: "fa-file-stats"})
            .msgAll("streamOne", {payload});
            return payload;
        })
    );
};