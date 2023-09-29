const {workerData, parentPort} = require("node:worker_threads"),
      { watch } = require('node:fs/promises'),
      {log, until} = require("../../helpers.js"),
      {capture} = require("../../capture.js"),
      {fileExists} = require("../../fileExists.js"),
      {getFiles} = require("../../getFiles.js"),
      path = require("path");

(new Promise(res => {
    parentPort.once("message", function(message){
        /*
            process.pid of the parent is exactly the same here.
            so process refers to the parent, NOT the worker
        */
        let {port, threadId} = message;
        const ac = new AbortController();
        port.on("close",function(){
            log(
                `Worker port-2 closing`,
                `{threadId: ${threadId}}`
            );
            ac.abort();
        });
        res([port, ac.signal]);
    });
})).then(async ([port, signal]) => {
    /* ############################
    ######WORKER CODE HERE######
    ############################ */
    const
        samtools = workerData.samtools,
        dirRoot = path.resolve(
            workerData.rootFolder, 
            workerData.staticFolder
        ),
        bamFolder = path.resolve(dirRoot, "bam"),
        bamIndexFolder =  path.resolve(dirRoot, "bai"),
        fastaFolder = path.resolve(dirRoot, "fa"),
        fastaIndexFolder = path.resolve(dirRoot, "fai"),
        extArr = [".fa", ".fas", ".fasta", ".bam"],
        watchMap = [
            path.resolve(dirRoot, "bam"),
            path.resolve(dirRoot, "fa")
        ],
        watchers = watchMap.map(dir =>
            watch(dir, { signal, persistent: true})
        ),
        /* below can accept a string or object.
        It is prepopulated with values on server start,
        filtered by fasta/bam files that do not have indexes */
        evtStack = new Set(
            (await Promise.all([
                ...(await getFiles(bamFolder))
                .map(async d => 
                    await fileExists(d + ".bai", {base: bamIndexFolder})
                    ? false
                    : d
                ),
                ...(await getFiles(fastaFolder))
                .map(async d => 
                    await fileExists(d + ".fai", {base: fastaIndexFolder})
                    ? false
                    : d
                )
            ])).filter(d => d)
        ), 
        setShift = set => {
            const [firstItem] = set;
            set.delete(firstItem);
            return firstItem;
        };
    let 
        idxPool = 0,
        idxBlock = 0,
        idxPoolMax = 1000,
        idxBlockMax = 5,
        decr = () => {--idxPool;--idxBlock;};
    watchers.forEach(async watcher => {
        try {
            for await (const {eventType = "", filename = ""} of watcher) {
                evtStack.add(filename);
            }
        } catch (err) {
            if (err?.name === 'AbortError') {
                return log(
                    `file system watcher @${"somedir"} is aborting`
                );
            }
            port.postMessage({
                type: "worker-fasta-bam-index-fs-watcher-error",
                payload: [
                    `file system watcher @${"somedir"}`,
                    `crashed unexpectedy:\n`,
                    `error.message: ${err?.message}`
                ].join(" ")
            })
        }
    });
    port.on("message", async function(message){
        //deal with API calls here
        const {filename, force, sessid} = message;
        evtStack.add({
            filename, force, sessid
        });
    });
    const loop = until(async function(){
        /* console.log(evtStack); */
        if (!evtStack.size){return}
        if (idxPool >= idxPoolMax) {
            return port.postMessage({
                type: "worker-fasta-bam-index-pool-full", 
                payload: [
                    "Maximum index queue reached,", 
                    "will be processed once others are finished"
                ].join(" ")
            });
        }
        
        await until(function(){
            if(idxBlock < idxBlockMax) {
                return true;
            }
            return false;
        },{interval: 1000});
        Array.from({length: idxBlockMax - idxBlock}).forEach(async () => {
            ++idxPool;
            ++idxBlock;
            const item = setShift(evtStack);
            if(!item){return decr()}
            const
                [fileName, reIndex, sessid] = item instanceof Object 
                    ? [
                        item?.filename ?? "unknown_file", 
                        item?.force ?? false,
                        item?.sessid ?? ""
                    ]
                    : [item, false, void(0)],
                baseFileName = path.basename(fileName),
                extName = path.extname(baseFileName),
                isBam = extName === ".bam";
            let input, output, baseOutput; //derived from baseFileName for samtools
            if(!extArr.includes(extName)){
                decr();
                return port.postMessage({
                    type: "worker-fasta-bam-index-bad-filename", 
                    payload: `The file ${baseFileName} is not indexible, skipping.`,
                    sessid,
                    filename: baseFileName
                });
            }
            input = await fileExists(
                baseFileName,
                {
                    base: isBam ? bamFolder : fastaFolder
                }
            );
            if(!input) {
                decr();
                return port.postMessage({
                    type: "worker-fasta-bam-index-file-does-not-exist", 
                    payload: `The file ${baseFileName} does not exist.`,
                    filename: baseFileName,
                    sessid
                });
            }
            /* 
            path.resolve processes from RIGHT to LEFT UNTIL
            an abspath is formed. FileExists will disregard
            base parameter if the first arg is already abs.
            This means, whatever the fs watcher is returning,
            the result will be normalized.
            */
            output = path.resolve(
                isBam ? bamIndexFolder : fastaIndexFolder,
                baseFileName + (isBam ? ".bai" : ".fai")
            );
            baseOutput = path.basename(output);
            if(await fileExists(output) && !reIndex) {
                decr();
                return port.postMessage({
                    type: "worker-fasta-bam-index-file-exists", 
                    payload: `The file ${baseOutput} already exists.`,
                    sessid,
                    filename: baseOutput
                });
            }
            await capture(
                `${samtools} ${isBam ? "index" : "faidx"} ${input} -o ${output}`,
                {
                    shell: "/bin/bash",
                    pipe: false,
                    logger: false,
                    onstart: function(pChild) {
                        port.postMessage({
                            type: "worker-fasta-bam-index-start", 
                            payload: `Indexing of ${baseFileName} started.`,
                            filename: baseFileName
                        });
                    },
                    onerror: ({res, rej, err}) => {
                        /* console.log(err?.message); */
                        port.postMessage({
                            type: "worker-fasta-bam-index-indexing-fail", 
                            payload: [
                                `Indexing of ${baseFileName} failed. Error:`,
                                `${err?.message}`
                            ].join("\n"),
                            filename: baseFileName
                        });
                    }
                }
            )
            .then(() => {
                port.postMessage({
                    type: "worker-fasta-bam-index-success", 
                    payload: `Indexing of ${baseFileName} finished.`,
                    filename: baseFileName
                });
            })
            .catch(() => {});
            port.postMessage({
                type: "worker-fasta-bam-index-end", 
                payload: `Indexing of ${baseFileName} ended.`,
                filename: baseFileName
            });
            decr();
        })
        return false;
    },{interval: 1000});
});
