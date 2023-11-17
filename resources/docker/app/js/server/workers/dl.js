const {relocFilesBasedOnExt} = require("../../relocFilesBasedOnExt.js"),
      {workerData, parentPort} = require("node:worker_threads"),
      {log, until, rmIndent} = require("../../helpers.js"),
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
          safeResource = `https://gist.github.com/
            IbrahimTanyalcin/
            ecf5f91d86a07e31a038283148b4a52e/
            archive/
            35deaee01bcfd2c58c24df709f6d6b2a0edc0247.tar.gz
          `.replace(/\s+/gi,""),
          rgxPrcnt = /[0-9]+\.[0-9]+%/gi,
          {unlink, rm : remove} = require("fs/promises"),
          dirRoot = path.resolve(workerData.rootFolder, workerData.staticFolder),
          fileTypes = {
            fasta: [".fa", ".fas", ".fasta"],
            fastaIndex: [".fai"],
            bam: [".bam"],
            bamIndex: [".bai"],
            annot: [".gff", ".bgz", ".tbi", ".csi"]
          },
          extMap = {
            ".bai": path.resolve(dirRoot, "bai"), 
            ".bam": path.resolve(dirRoot, "bam"), 
            ".fa": path.resolve(dirRoot, "fa"), 
            ".fas": path.resolve(dirRoot, "fa"), 
            ".fasta": path.resolve(dirRoot, "fa"), 
            ".fai": path.resolve(dirRoot, "fai"),
            ".tar": path.resolve(dirRoot, "gz"),
            ".gz": path.resolve(dirRoot, "gz"),
            ".z": path.resolve(dirRoot, "gz"),
            ".tgz": path.resolve(dirRoot, "gz"),
            ".taz": path.resolve(dirRoot, "gz"),
            ".lz4": path.resolve(dirRoot, "gz"),
            ".gff": path.resolve(dirRoot, "gff"),
            ".bgz": path.resolve(dirRoot, "bgz"),
            ".tbi": path.resolve(dirRoot, "tbi"),
            ".csi": path.resolve(dirRoot, "csi")
          },
          extArr = Object.keys(extMap),
          isCompressed = ((...exts) => ext => !!~exts.indexOf(ext))(".tar", ".gz", ".z", ".tgz", ".taz", ".lz4"),
          rgxHttpStats = /^\s*HTTP[^\s]*\s+(?<status>[0-5]{3})\s*(?<statusText>[A-Z]+)?\s*$/gim,
          rgxHttpFilename = /^content-disposition\s*:\s*attachment\s*;\s*filename\s*=\s*"?(?<filename>[^"\r\n]+)"?\s*$/gim;
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
        if(!rgxNexus.test(payload) && payload !== safeResource) {
            port.postMessage({type: "worker-bad-host", payload: "URI is not a DNAnexus link", sessid});
            return decr();
        }
        const {status, statusText, filename = "", timedout = ""} = await capture(
                `curl -fsSL -I --connect-timeout 20 ${payload}`, 
                {logger: false, pipe: false, onerror: oErr => oErr.rej(oErr.err)}
            )
            .then((val = "") => {
                return [...val.matchAll(rgxHttpStats),...val.matchAll(rgxHttpFilename)]
                .map(d => d.groups)
                .reduce((ac,d) => {return {...ac, ...d}},{});
            })
            .catch(err => {
                if ([28].includes(err?.code)) {
                    return {timedout: true}
                }
                return {};
            }),
            extName = path.extname(filename);
        if (timedout) {
            port.postMessage({
                type: "worker-connection-timedout", 
                payload: "Could not reach the server. Make sure your network has access", 
                sessid
            });
            return decr();
        }
        if (!filename) {
            port.postMessage({type: "worker-bad-filename", payload: "Filename empty or broken link", sessid});
            return decr();
        }
        /*
        https://datatracker.ietf.org/doc/html/rfc7540#section-8.1.2.4
        HTTP/2 does not define statusText
        HTTP/1.1 does define statusText
        unless I force cURL to use '--http1.1'
        statusText needs to be dropped
        */
        if (+status !== 200 /*|| statusText !== "OK"*/) {
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
            + (fileIsCompressed ? `--rm 1 ${Object.values(fileTypes).flat(Infinity).map(d => `'${d}'`).join(" ")}` : "0"),
            {logger: false, pipe: false, ondata: function(data = ""){
                data.match(rgxPrcnt)?.forEach(d => port.postMessage({type: "worker-dl-progress", payload: filename, percentage: d}));
            }}
        )
        .then(val => {
            if (!fileIsCompressed){
                return port.postMessage({
                    type: "worker-dl-success", 
                    payload: filename, 
                    updateFa: fileTypes.fasta.includes(extName),
                    updateBam: fileTypes.bam.includes(extName),
                    updateAnnot: fileTypes.annot.includes(extName)
                }); //postMessage returns undefined
            }
            //downloadX returns entire stdout history separated with \r
            //last line of downloadX is the random hex folder
            const lastLine = val.split("\r").pop();
            return relocFilesBasedOnExt({
                targetDirs: lastLine,
                transform: (dir,i,dirs) => path.basename(dir),
                destinationDirs: Object.assign({}, ...extArr.filter(d => !isCompressed(d)).map(d => ({[d]: extMap[d]}))),
                validate: ({transformed, dir}, i, dirs) => /^H[A-F0-9]{32}$/i.test(transformed),
                callback: (arrOfObj) => {
                    arrOfObj.forEach(({errors, erredFiles, nFiles, files, dir, transformed, extVisited}, i, a) => {
                        port.postMessage({
                            type: "worker-dl-success", 
                            payload: nFiles, 
                            updateFa: extVisited.some(function(d){return this.includes(d);}, fileTypes.fasta),
                            updateBam: extVisited.some(function(d){return this.includes(d);}, fileTypes.bam),
                            updateAnnot: extVisited.some(function(d){return this.includes(d);}, fileTypes.annot)
                        });
                        remove(dir, {recursive: true});
                    });
                }
            });
        })
        .catch(err => {
            //console.log(err);
            port.postMessage({type: "worker-dl-fail", payload: filename});
            unlink(filepath).catch(err => port.postMessage({
                type: "worker-file-delete-fail",
                sessid,
                payload: {
                    fileType: "",
                    fileName: filename,
                    message: rmIndent`There was an error downloading ${filename}. 
                        The file can either not be removed or does not exist.`
                }
            }));
        });
        port.postMessage({type: "worker-dl-end", payload: filename});
        decr();
    });
    const loop = until(function(){
        //port.postMessage("Ping!");
        
        return false;
    },{interval: 1000});
});
