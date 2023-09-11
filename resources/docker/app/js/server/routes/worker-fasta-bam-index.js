const {Worker} = require("node:worker_threads"),
      {until} = require("../../helpers.js"),
      path = require('path'),
      portKey = Symbol.for("customPort");
      

module.exports = function({express, app, info, files, serverSent}){
    const worker = new Worker(
        path.resolve(__dirname,"../workers/fasta-bam-index.js"), 
        {
            workerData: {
                isContainer : info.isContainer,
                rootFolder: info.rootFolder,
                staticFolder: info.serverConf.static,
                bin: info.dockerBinaries
            }
        }
    );
    until(() => worker[portKey])
    .then(port => {
        app
        .post('/samtools/index', function (req, res, next) {
            port.postMessage({...req.body, sessid: req.session.id});
            res.status(200).end();
        });
        port.on("message", function(message){
            const {type, payload, sessid, filename} = message;
            switch(type) {
                case "worker-fasta-bam-index-success":
                    break;
                case "worker-fasta-bam-index-fail":
                    break;
                case "worker-fasta-bam-index-pool-full":
                case "worker-fasta-bam-index-bad-filename":
                    break;
                case "worker-fasta-bam-index-fs-watcher-error":
                    break;
                case "worker-fasta-bam-index-generic-error":
                case "worker-fasta-bam-index-file-exists":
                    break;
            }
        });
    });
}