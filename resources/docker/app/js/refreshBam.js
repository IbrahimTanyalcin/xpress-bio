const path = require('path'),
      {getFiles} = require("./getFiles.js");

exports.refreshBam = function({info, serverSent}){
    return getFiles(path.join(info.rootFolder, info.serverConf.static, "bam"))
    .then(bamFiles => {
        serverSent
        .msgAll("streamOne", {directive: "event", payload: "bam-file-list"})
        .msgAll("streamOne", {payload: bamFiles});
        return bamFiles;
    });
};