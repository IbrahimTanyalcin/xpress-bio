const {Worker} = require("node:worker_threads"),
      {until, log} = require("../../helpers.js"),
      path = require('path'),
      portKey = Symbol.for("customPort"),
      nameKey = Symbol.for("customName"),
      {findExecutable} = require("../../findExecutable.js");

module.exports = async function({express, app, info, files, serverSent}){
    const blastn = await findExecutable(
        [info.serverConf?.executables?.blastn],
        {
            append: "blastn",
            finder: path.resolve(info.dockerBinaries, "funcs.sh"),
            functionName: "get_executable_path",
            onerror: ({paths}) => {
                log(
                    "Could not find the path to blastn.",
                    "Tried:",
                    `${paths.join("\n")}`
                );
                process.exit(1);
            }
        }
    );
    const worker = new Worker(
        path.resolve(__dirname,"../workers/blastn.js"), 
        {
            workerData: {
                isContainer : info.isContainer,
                rootFolder: info.rootFolder,
                staticFolder: info.serverConf.static,
                bin: info.dockerBinaries,
                blastn,
                blastnConf: info.serverConf?.blastn
            }
        }
    );
    worker[nameKey] = "worker-blastn";
    until(() => worker[portKey])
    .then(port => {
        app
        .post('/blast/blastn', function (req, res, next) {
            let status;
            try {
                if(req.body.type){
                    throw new Error("This field is reserved for internal use only.");
                }
                port.postMessage({...req.body, sessid: req.session.id});
                status = 200;
            } catch (err) {
                status = 400;
            } finally {
                res.status(status).end();
            }
        });
        port.on("message", function(message){
            const
                sseChannel = "streamOne", 
                {type, payload, filename, sessid, sessids = new Set(), location, blastOpts, query} = message;
            switch(type) {
                case "worker-blastn-bad-query":
                case "worker-blastn-file-unspecified":
                    serverSent
                        .msg(sseChannel, sessid, {directive: "event", payload: type})
                        .msg(sseChannel, sessid, {payload: {message: payload}});
                    break;
                /*
                    Event below is fired inside until loop with sessids as set,
                    and inside post.onmessage without sessids, and hence the 
                    (new Set([...]))
                */
                case "worker-blastn-query-exists":
                case "worker-blastn-query-success":
                    (new Set([sessid, ...sessids])).forEach(_sessid => {
                        serverSent
                            .msg(sseChannel, _sessid, {directive: "event", payload: type})
                            .msg(sseChannel, _sessid, {payload: {filename, location, message: payload, blastOpts, query}});
                    });
                    break;
                case "worker-blastn-pool-full":
                case "worker-blastn-makedb-pool-full":
                    serverSent
                        .msgAll(sseChannel, {directive: "event", payload: type})
                        .msgAll(sseChannel, {payload: {message: payload}});
                    break;
                case "worker-blastn-bad-filename":
                case "worker-blastn-file-does-not-exist":
                case "worker-blastn-db-not-ready":
                case "worker-blastn-db-creation-fail-or-timeout":
                case "worker-blastn-db-ready":
                case "worker-blastn-query-start":
                case "worker-blastn-query-fail":
                case "worker-blastn-query-end":
                    sessids.forEach(_sessid => {
                        serverSent
                            .msg(sseChannel, _sessid, {directive: "event", payload: type})
                            .msg(sseChannel, _sessid, {payload: {filename, message: payload, blastOpts, query}});
                    });
                    break;
                case "worker-blastn-db-creation-start":
                case "worker-blastn-db-creation-fail":
                case "worker-blastn-db-creation-success":
                case "worker-blastn-db-creation-end":
                    serverSent
                        .msgAll(sseChannel, {directive: "event", payload: type})
                        .msgAll(sseChannel, {payload: {filename, message: payload}});
                    break;
            }
        });
    });
}