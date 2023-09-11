const {workerData, parentPort} = require("node:worker_threads"),
      { watch } = require('node:fs/promises'),
      {log, until} = require("../../helpers.js"),
      {capture} = require("../../capture.js"),
      {fileExists} = require("../../fileExists.js"),
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
})).then(([port, signal]) => {
    /* ############################
    ######WORKER CODE HERE######
    ############################ */
    const
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
        //below can accept a string or object.
        evtStack = new Set(), //prepopulate with values on server start. filtered by fasta/bam files that do not have indexes
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
                    `file system watcher @${dir} is aborting`
                );
            }
            port.postMessage({
                type: "worker-fasta-bam-index-fs-watcher-error",
                payload: [
                    `file system watcher @${dir}`,
                    `crashed unexpectedy:\n`,
                    `error.message: ${err?.message}`
                ].join(" ")
            })
        }
    });
    port.on("message", async function(message){
        //deal with API calls here
    });
    const loop = until(async function(){
        if (!evtStack.size){return}
        if (idxPool >= idxPoolMax) {
            return port.postMessage({
                type: "worker-fasta-bam-index-pool-full", 
                payload: "Maximum index queue reached, wait until others are finished"
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
                [fileName, reIndex] = item instanceof Object 
                    ? [
                        item?.filename = "unknown_file", 
                        item?.force = false
                    ]
                    : [item, false],
                extName = path.extname(item);
            if(!extArr.includes(extName)){
                decr();
                return port.postMessage({
                    type: "worker-fasta-bam-index-bad-filename", 
                    payload: `The file ${fileName} is not indexible, skipping.`
                });
            }
            if(!await fileExists(
                fileName,
                {
                    base: extName === ".bam"
                        ? bamFolder
                        : fastaFolder
                }
            )) {
                decr();
                return port.postMessage({
                    type: "worker-fasta-bam-index-generic-error", 
                    payload: `The file ${fileName} does not exist.`
                });
            }
            if(await fileExists(
                fileName + extName === ".bam" ? ".bai" : ".fai",
                {
                    base: extName === ".bam"
                        ? bamIndexFolder
                        : fastaIndexFolder
                }
            ) && !reIndex) {
                decr();
                return port.postMessage({
                    type: "worker-fasta-bam-index-file-exists", 
                    payload: `The file ${fileName} already exists.`
                });
            }
            //handle bam or fasta indexing
        })
        return false;
    },{interval: 1000});
});
