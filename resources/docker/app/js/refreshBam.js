const {getFiles} = require("./getFiles.js");

exports.refreshBam = function({info, serverSent}){
    return getFiles(path.join(info.rootFolder, info.serverConf.static, "bam"))
    .then(bamFiles => {
        serverSent
        .msg("streamOne", req.session.id,  {directive: "event", payload: "bam-file-list"})
        .msg("streamOne", req.session.id, {payload: bamFiles});
        return bamFiles;
    });
};