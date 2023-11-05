const {Worker} = require("node:worker_threads"),
      {until, log} = require("../../helpers.js"),
      path = require('path'),
      portKey = Symbol.for("customPort"),
      {findExecutable} = require("../../findExecutable.js"),
      {updateAnnotF} = require("../../updateAnnot.js");

module.exports = async function({express, app, info, files, serverSent}){
    const samtools = await findExecutable(
        [info.serverConf?.executables?.samtools],
        {
            append: "samtools",
            finder: path.resolve(info.dockerBinaries, "funcs.sh"),
            functionName: "get_executable_path",
            onerror: ({paths}) => {
                log(
                    "Could not find the path to samtools.",
                    "Tried:",
                    `${paths.join("\n")}`
                );
                process.exit(1);
            }
        }
    ),
    bgzip = await findExecutable(
        [info.serverConf?.executables?.bgzip],
        {
            append: "bgzip",
            finder: path.resolve(info.dockerBinaries, "funcs.sh"),
            functionName: "get_executable_path",
            onerror: ({paths}) => {
                log(
                    "Could not find the path to bgzip.",
                    "Tried:",
                    `${paths.join("\n")}`
                );
                process.exit(1);
            }
        }
    ),
    tabix = await findExecutable(
        [info.serverConf?.executables?.tabix],
        {
            append: "tabix",
            finder: path.resolve(info.dockerBinaries, "funcs.sh"),
            functionName: "get_executable_path",
            onerror: ({paths}) => {
                log(
                    "Could not find the path to tabix.",
                    "Tried:",
                    `${paths.join("\n")}`
                );
                process.exit(1);
            }
        }
    );
    const worker = new Worker(
        path.resolve(__dirname,"../workers/fasta-bam-index.js"), 
        {
            workerData: {
                isContainer : info.isContainer,
                rootFolder: info.rootFolder,
                staticFolder: info.serverConf.static,
                bin: info.dockerBinaries,
                samtools,
                bgzip,
                tabix
            }
        }
    );
    until(() => worker[portKey])
    .then(port => {
        app
        .post('/samtools/index', function (req, res, next) {
            let status;
            try {
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
                {type, payload, sessid, filename, updateAnnot} = message;
            switch(type) {
                case "worker-fasta-bam-index-start":
                case "worker-fasta-bam-index-success":
                case "worker-fasta-bam-index-indexing-fail":
                case "worker-fasta-bam-index-end":
                    serverSent
                        .msgAll(sseChannel, {directive: "event", payload: type})
                        .msgAll(sseChannel, {
                            payload: {filename, message: payload}
                        });
                    if (updateAnnot) {
                        updateAnnotF(info, serverSent, {channel: sseChannel});
                    }
                    break;
                case "worker-fasta-bam-index-pool-full":
                case "worker-fasta-bam-index-fs-watcher-error":
                    serverSent
                        .msgAll(sseChannel, {directive: "event", payload: type})
                        .msgAll(sseChannel, {payload})
                    break;
                case "worker-fasta-bam-index-bad-filename":
                case "worker-fasta-bam-index-file-does-not-exist":
                case "worker-fasta-bam-index-file-exists":
                    if(!sessid){return}
                    serverSent
                        .msg(sseChannel, sessid, {directive: "event", payload: type})
                        .msg(sseChannel, sessid, {
                            payload: {filename, message: payload}
                        });
                    break;
            }
        });
    });
}