const {workerData, parentPort} = require("node:worker_threads"),
      { watch } = require('node:fs/promises'),
      {log, until} = require("../../helpers.js"),
      {capture} = require("../../capture.js"),
      {fileExists} = require("../../fileExists.js"),
      {getFiles} = require("../../getFiles.js"),
      genHexStr = require("../../genHexStr.js"),
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
        bgzip = workerData.bgzip,
        tabix = workerData.tabix,
        dirRoot = path.resolve(
            workerData.rootFolder, 
            workerData.staticFolder
        ),
        bamFolder = path.resolve(dirRoot, "bam"),
        bamIndexFolder =  path.resolve(dirRoot, "bai"),
        fastaFolder = path.resolve(dirRoot, "fa"),
        fastaIndexFolder = path.resolve(dirRoot, "fai"),
        annotGffFolder = path.resolve(dirRoot, "gff"),
        annotBgzFolder = path.resolve(dirRoot, "bgz"),
        annotTbiIndexFolder = path.resolve(dirRoot, "tbi"),
        annotCsiIndexFolder = path.resolve(dirRoot, "csi"),
        configs = {
            bam: {
                inputFolder: bamFolder,
                outputFolder: bamIndexFolder,
                ext: ".bai",
                command: "index"
            },
            fasta: {
                inputFolder: fastaFolder,
                outputFolder: fastaIndexFolder,
                ext: ".fai",
                command: "faidx"
            },
            gff: {
                inputFolder: annotGffFolder,
                outputFolder: annotBgzFolder,
                ext: ".bgz",
                command: "bgzip"
            },
            bgz: {
                inputFolder: annotBgzFolder,
                outputFolder: [annotTbiIndexFolder, annotCsiIndexFolder],
                ext: [".tbi", ".csi"],
                command: "tabix"
            }
        },
        extArr = [".fa", ".fas", ".fasta", ".bam", ".gff", ".bgz"],
        watchMap = [
            path.resolve(dirRoot, "bam"),
            path.resolve(dirRoot, "fa"),
            path.resolve(dirRoot, "gff"),
            path.resolve(dirRoot, "bgz")
        ],
        watchers = watchMap.map(dir =>
            watch(dir, { signal, persistent: true})
        ),
        /* below can accept a string or object.
        It is prepopulated with values on server start,
        filtered by fasta/bam/gff/bgz files that do not have indexes */
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
                ),
                ...(await getFiles(annotGffFolder))
                .map(async d => 
                    await fileExists(d + ".bgz", {base: annotBgzFolder})
                    ? false
                    : d
                ),
                ...(await getFiles(annotBgzFolder))
                .map(async d => 
                    await fileExists(d + ".tbi", {base: annotTbiIndexFolder})
                    || await fileExists(d + ".csi", {base: annotCsiIndexFolder})
                    ? false
                    : d
                ),
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
                config = (() => {
                    switch(true) {
                        case (extName === ".bam"):
                            return configs.bam
                        case ([".fa", ".fas", ".fasta"].includes(extName)):
                            return configs.fasta
                        case (extName === ".gff"):
                            return configs.gff
                        case (extName === ".bgz"):
                            return configs.bgz
                    }
                })();
            let input, output; //derived from baseFileName for samtools
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
                    base: config.inputFolder
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
            output = [config.outputFolder].flat(Infinity)
                .map(
                    function(d, i) {return path.resolve(d, baseFileName + this[i])},
                    [config.ext].flat(Infinity)
                );
            for (let pathstr of output) {
                let baseOutput = path.basename(pathstr);
                if(await fileExists(pathstr) && !reIndex) {
                    decr();
                    return port.postMessage({
                        type: "worker-fasta-bam-index-file-exists", 
                        payload: `The file ${baseOutput} already exists.`,
                        sessid,
                        filename: baseOutput
                    });
                }
            }
            await capture(
                (() => {
                    switch (config.command) {
                        case "index":
                        case "faidx":
                            return `${samtools} ${config.command} "${input}" -o "${output}"`
                        case "tabix":
                            return `(${tabix} -p gff "${input}" && mv "${input}.tbi" "${output[0]}") || (${tabix} -p gff --csi "${input}" && mv "${input}.csi" "${output[1]}")`
                        case "bgzip":
                            const temp = path.resolve(dirRoot, "gz", genHexStr(8, 3, "temp_"));
                            return `(grep "^#" "${input}"; grep -v "^#" "${input}" | sort -t "$(echo -e '\\t')" -k1,1 -k4,4n) | ${bgzip} > "${temp}" && mv "${temp}" "${output}"`
                    }
                })(),
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
                    filename: baseFileName,
                    updateAnnot: ["tabix", "bgzip"].includes(config.command)
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
