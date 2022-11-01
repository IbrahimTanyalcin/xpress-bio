const {workerData, parentPort} = require("node:worker_threads"),
      {log, until} = require("../../helpers.js"),
      {capture} = require("../../capture.js"),
      path = require("path");

(new Promise(res => {
    parentPort.once("message", function(message){
        /*
            process.pid of the parent is exactly the same here.
            so process refers to the parent, NOT the worker
        */
        let {port, threadId} = message;
        port.on("close",function(){
            log(
                `Worker port-2 closing`,
                `{threadId: ${threadId}}`
            );
        });
        res(port);
    });
})).then(port => {
    /* ############################
    ######WORKER CODE HERE######
    ############################ */
    const rgxNexus = /^https:\/\/dl\.dnanex\.us\//i,
          rgxPrcnt = /[0-9]+\.[0-9]+%/gi,
          {unlink} = require("fs/promises"),
          dirRoot = path.resolve(workerData.rootFolder, workerData.staticFolder),
          extMap = {
            ".bai": path.resolve(dirRoot, "bai"), 
            ".bam": path.resolve(dirRoot, "bam"), 
            ".fa": path.resolve(dirRoot, "fa"), 
            ".fasta": path.resolve(dirRoot, "fa"), 
            ".fai": path.resolve(dirRoot, "fai"),
            ".tar": path.resolve(dirRoot, "gz"),
            ".gz": path.resolve(dirRoot, "gz"),
            ".z": path.resolve(dirRoot, "gz"),
            ".tgz": path.resolve(dirRoot, "gz"),
            ".taz": path.resolve(dirRoot, "gz")
          },
          extArr = Object.keys(extMap),
          isCompressed = ((...exts) => ext => !!~exts.indexOf(ext))(".tar", ".gz", ".z", ".tgz", ".taz"),
          rgxHttpStats = /^\s*HTTP[^\s]*\s+(?<status>[0-5]{3})\s+(?<statusText>[A-Z]+)\s*$/gim,
          rgxHttpFilename = /^content-disposition\s*:\s*attachment\s*;\s*filename\s*=\s*"(?<filename>[^"]+)"\s*$/gim;
    let dlPool = 0,
        dlBlock = 0,
        dlPoolMax = 10,
        dlBlockMax = 3,
        decr = () => {--dlPool;--dlBlock;};
    port.on("message", async function(message){
        if (dlPool >= dlPoolMax) {
            port.postMessage({type: "worker-pool-full", payload: "Maximum download queue reached, wait until others are finished", sessid});
            return
        }
        ++dlPool;
        await until(function(){
            if(dlBlock < dlBlockMax) {
                return ++dlBlock;
            }
            return false;
        },{interval: 1000});
        //payload is URI
        const {payload, sessid} = message;
        if(!rgxNexus.test(payload)) {
            port.postMessage({type: "worker-bad-host", payload: "URI is not a DNAnexus link", sessid});
            return decr();
        }
        const {status, statusText, filename = ""} = await capture(
                `curl -fsSL -I ${payload}`, 
                {logger: false, pipe: false}
            )
            .then((val = "") => {
                return [...val.matchAll(rgxHttpStats),...val.matchAll(rgxHttpFilename)]
                .map(d => d.groups)
                .reduce((ac,d) => {return {...d,...ac}},{});
            })
            .catch(err => {
                return {};
            }),
            extName = path.extname(filename);
        if (!filename) {
            port.postMessage({type: "worker-bad-filename", payload: "Filename empty or broken link", sessid});
            return decr();
        }
        if (+status !== 200 || statusText !== "OK") {
            port.postMessage({type: "worker-bad-link", payload: "Make sure the link is not broken or you are authorized to download", sessid});
            return decr();
        }
        if (!~extArr.indexOf(extName)) {
            port.postMessage({type: "worker-bad-extension", payload: `You can only download ${extArr} files`, sessid});
            return decr();
        }
        const filepath = path.resolve(extMap[extName], filename),
              fileIsCompressed = isCompressed(extName);
        port.postMessage({type: "worker-dl-start", payload: filename});
        await capture(
            `/bin/bash ${path.resolve(workerData.bin,"downloadX.sh")} `
            + `${payload} ${filepath} `
            + (fileIsCompressed ? "--rm 1 '.bai' '.bam' '.fa' '.fasta' '.fai'" : "0"),
            {logger: false, pipe: false, ondata: function(data = ""){
                data.match(rgxPrcnt)?.forEach(d => port.postMessage({type: "worker-dl-progress", payload: filename, percentage: d}));
            }}
        )
        .then(val => {
            if (!fileIsCompressed){
                return port.postMessage({
                    type: "worker-dl-success", 
                    payload: filename, 
                    updateFa: [".fa", ".fasta"].includes(extName),
                    updateBam: [".bam"].includes(extName)
                }); //postMessage returns undefined
            }
            console.log("VAL IS: ", path.basename(val));
            return relocFilesBasedOnExt({
                targetDirs: val, //single path string or array of path strings
                transform: (fName,i,a) => path.extname(fName),
                destinationDirs: Object.assign({}, extArr.filter(d => !isCompressed(d)).map(d => ({[d]: extMap[d]}))),
                validate: (transformed) => /^H[A-F0-9]{32}$/gi.test(transformed),
            }); //returns undefined on clean exit or throws error on error
        })
        .catch(err => {
            port.postMessage({type: "worker-dl-fail", payload: filename});
            unlink(filepath);
        });
        port.postMessage({type: "worker-dl-end", payload: filename});
        decr();
    });
    const loop = until(function(){
        //port.postMessage("Ping!");
        
        return false;
    },{interval: 1000});
});
