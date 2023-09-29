const {Worker} = require("node:worker_threads"),
      {until} = require("../../helpers.js"),
      path = require('path'),
      portKey = Symbol.for("customPort"),
      nameKey = Symbol.for("customName"),
      {getFiles} = require("../../getFiles.js"),
      {getStats} = require("../../getStats.js");

module.exports = function({express, app, info, files, serverSent}){
    const worker = new Worker(
        path.resolve(__dirname,"../workers/dl.js"), 
        {
            workerData: {
                isContainer : info.isContainer,
                rootFolder: info.rootFolder,
                staticFolder: info.serverConf.static,
                bin: info.dockerBinaries
            }
        }
    );
    worker[nameKey] = "worker-dl";
    until(() => worker[portKey])
    .then(port => {
        app
        .post('/dl/nexus', function (req, res, next) {
            port.postMessage({...req.body, sessid: req.session.id});
            res.status(200).end();
        });
        port.on("message", function(message){
            const {type, payload, sessid, percentage, updateFa, updateBam} = message;
            switch(type) {
                case "worker-pool-full":
                case "worker-bad-host":
                case "worker-bad-filename":
                case "worker-bad-link":
                case "worker-bad-extension":
                case "worker-connection-timedout":
                    serverSent
                        .msg("streamOne", sessid, {directive: "event", payload: type})
                        .msg("streamOne", sessid, {payload});
                    break;
                case "worker-dl-start":
                case "worker-dl-fail":
                case "worker-dl-end":
                    serverSent
                        .msgAll("streamOne",{directive: "event", payload: type})
                        .msgAll("streamOne",{payload})
                    break;
                case "worker-dl-success":
                    serverSent
                        .msgAll("streamOne",{directive: "event", payload: type})
                        .msgAll("streamOne",{payload});
                    if (updateBam) {
                        getFiles(path.join(info.rootFolder, info.serverConf.static, "bam"))
                        .then(bamFiles => 
                            serverSent
                            .msgAll("streamOne", {directive: "event", payload: "bam-file-list"})
                            .msgAll("streamOne", {payload: bamFiles})
                        );
                    }
                    if (updateFa) {
                        getFiles(path.join(info.rootFolder, info.serverConf.static, "fa"), {relativeTo: "/"})
                        .then(faFiles => 
                            getStats(faFiles.map(d => "/" + d))
                            .then(faStats => faStats.map((d,i) => {
                            return {[path.basename(faFiles[i])]: d.size}
                            }))
                            .then(ArrOfObj => ArrOfObj.reduce((ac,d) => Object.assign(ac,d),{}))
                            .then(payload => serverSent
                                .msgAll("streamOne", {directive: "event", payload: "fa-file-stats"})
                                .msgAll("streamOne", {payload})
                            )
                        );
                    }
                    break;
                case "worker-dl-progress":
                    serverSent
                        .msgAll("streamOne",{directive: "event", payload: type})
                        .msgAll("streamOne",{payload: {filename: payload, percentage}})
                    break;
                case "worker-file-delete-fail":
                    serverSent
                        .msg("streamOne", sessid, {directive: "event", payload: "file-delete-fail"})
                        .msg("streamOne", sessid, {payload});
                    break;
            }
        });
    });
}