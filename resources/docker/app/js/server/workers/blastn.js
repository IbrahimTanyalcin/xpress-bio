const {workerData, parentPort} = require("node:worker_threads"),
      {log, until, sanitizeFilename} = require("../../helpers.js"),
      {capture} = require("../../capture.js"),
      {fileExists} = require("../../fileExists.js"),
      genHexStr = require("../../genHexStr.js"),
      {getFiles} = require("../../getFiles.js"),
      {getStats} = require("../../getStats.js"),
      strHash = require("../../strHash.js"),
      {unlink} = require("fs/promises"),
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
        enu = ["", null, void(0)], //empty string, null or undefined
        IUPAC_nucl = /^[ATUCGRYSWKMBDHVN]+$/i,
        blastn = workerData.blastn,
        dirRoot = path.resolve(
            workerData.rootFolder, 
            workerData.staticFolder
        ),
        fastaFolder = path.resolve(dirRoot, "fa"),
        tempFolder = path.resolve(dirRoot, "temp"),
        annotGffFolder = path.resolve(dirRoot, "gff"),
        blastFolder = path.resolve(dirRoot, "blast"),
        blastDbFolder = path.resolve(blastFolder, "db"),
        blastQueryFolder = path.resolve(blastFolder, "query"),
        getInputDbFolder = (baseFileName) => path.resolve(blastDbFolder, baseFileName),
        getOutputFolder = (baseFileName) => path.resolve(blastQueryFolder, baseFileName),
        queryUri = (foldername, filename) => `/static/blast/query/${foldername}/${filename}`,
        queryLocation = (foldername, filename) => path.resolve(getOutputFolder(foldername), filename),
        configs = {
            fasta: {
                inputFolder: fastaFolder,
                inputDbFolder: getInputDbFolder,
                outputFolder: getOutputFolder,
                selfExt: [".fa", ".fas", ".fasta"],
                command: blastn
            },
            gff: {
                inputFolder: annotGffFolder,
                //place these along side real blast folders like assets/blast/somefile.gff/afa54ea12cae4.txt etc.
                inputDbFolder: getInputDbFolder,
                outputFolder: getOutputFolder,
                selfExt: ".gff",
                command: null
            }
        },
        blastnDbReady = new Set(), //[baseFileName,...]
        blastnDbStack = new Map( //[baseFileName => [AbortController|null],...]
            (await Promise.all([
                ...(await getFiles(configs.fasta.inputFolder))
                .map(async d => 
                    await fileExists(d, {base: blastDbFolder})
                    ? false
                    : [d, [null]]
                )
            ])).filter(d => d)
        ), 
        currBlastnStackItems = new Map(), //[baseFileName => [AbortController|null],...]
        evtStack = new Map(), //[md5key => obj]
        extArr = [".fa", ".fas", ".fasta"],
        setShift = set => {
            const [firstItem] = set;
            set.delete(firstItem);
            return firstItem;
        },
        mapShift = map => {
            const [firstItem] = map;
            map.delete(firstItem?.[0]);
            return firstItem;
        };
    port.on("message", async function(message){
        switch (message.type) {
            case "worker-fasta-bam-index-blast-db-request":
                if (!blastnDbStack.has(message.filename)){
                    blastnDbStack.set(message.filename,[null]);
                }
                break;
            case "blast-db-set-delete-request":
                blastnDbReady.delete(message.filename);
                break;
            default:
                //deal with API calls here
                let {filename = "", query = "", blastOpts = "", sessid = ""} = message;
                if (enu.includes(sessid) || enu.includes(query)){return} //no curl or other requests without sess cookie for this service
                if (!IUPAC_nucl.test(query)) {
                    return port.postMessage({
                        type: "worker-blastn-bad-query", 
                        payload: `Query sequence can only contain IUPAC nuleotide codes.`,
                        sessid
                    });
                }
                filename = path.basename(sanitizeFilename(filename));
                if (enu.includes(filename)){
                    return port.postMessage({
                        type: "worker-blastn-file-unspecified", 
                        payload: `You must specify a filename.`,
                        sessid
                    });
                }
                let [key] = await strHash(`${filename}_${query}_${blastOpts}`);
                if (evtStack.has(key)) {
                    evtStack.get(key).sessids.add(sessid);
                    return;
                }
                let queryFileName = `${key}.txt`;
                if (await fileExists(queryLocation(filename, queryFileName))) {
                    return port.postMessage({
                        type: "worker-blastn-query-exists", 
                        payload: `The file ${queryFileName} already exists.`,
                        filename: filename,
                        query,
                        blastOpts,
                        sessid,
                        location: queryUri(filename, queryFileName)
                    });
                }
                evtStack.set(key, {
                    key, filename, query, sessid, sessids: new Set([sessid]), childProcess: null, blastOpts
                });
        }
    });
    let 
        idxPool = 0,
        idxBlock = 0,
        idxPoolMax = 100,
        idxBlockMax = 5,
        decr = () => {--idxPool;--idxBlock;};
    const loop = until(async function(){
        if (!evtStack.size){return}
        if (idxPool >= idxPoolMax) {
            return port.postMessage({
                type: "worker-blastn-pool-full", 
                payload: [
                    "Maximum blastn queue reached,",
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
            const item = mapShift(evtStack);
            if(!item){return decr()}
            const
                [, {filename:fileName, query, blastOpts, sessid, key, sessids}] = item,
                baseFileName = path.basename(fileName),
                makeblastdb_ac = new AbortController(), //might or might not be used
                makeblastdb_ac_timeout = 2 * 60 * 1000,
                makeblastdb_ac_timeout_id = setTimeout(
                    () => makeblastdb_ac.abort(new Error("TimeoutError")), //DOMException does not exist in Node 16, starts from 17. Substitude with Error
                    makeblastdb_ac_timeout
                ),
                extName = path.extname(baseFileName),
                isFasta = configs.fasta.selfExt.includes(extName),
                queryFileName = `${key}.txt`,
                config = Object.values(configs).find(d => [].concat(d?.selfExt ?? []).includes(extName));
            let input, inputDb, output;
            if(!extArr.includes(extName)){
                decr();
                return port.postMessage({
                    type: "worker-blastn-bad-filename", 
                    payload: `The file ${baseFileName} is not searchable by blastn, skipping.`,
                    filename: baseFileName,
                    query,
                    blastOpts,
                    sessid,
                    sessids
                });
            }
            input = await fileExists(baseFileName,{base: config.inputFolder});
            if(!input) {
                decr();
                return port.postMessage({
                    type: "worker-blastn-file-does-not-exist", 
                    payload: `The file ${baseFileName} does not exist.`,
                    filename: baseFileName,
                    query,
                    blastOpts,
                    sessid,
                    sessids
                });
            }
            if(isFasta && !blastnDbReady.has(baseFileName)){
                port.postMessage({
                    type: "worker-blastn-db-not-ready", 
                    payload: `The blastdb for ${baseFileName} is not ready.`,
                    filename: baseFileName,
                    query,
                    blastOpts,
                    sessid,
                    sessids
                });

                /**
                 * If blastbDbStack is only '.set(...)' based on the existence
                 * of /blast/db/x.fasta/ folder, and if blastnDbReady Set was not pre-
                 * populated, and if the folders are there, the until loop won't
                 * resolve. blastnDbReady either needs to be pre-populated 
                 * or the makeblastdb loop (2nd until loop) needs to check existence 
                 * and set blastnDbReady to true if the folder is there.This is a 
                 * 'lazy' version of pre-populating
                 */
                blastnDbStack.set(baseFileName, [makeblastdb_ac]);

                const dbReady = await until(function(){
                    makeblastdb_ac.signal.aborted && dbReady.break();
                    return blastnDbReady.has(baseFileName);
                },{interval: 500});
                if (makeblastdb_ac.signal.aborted) {
                    decr();
                    return port.postMessage({
                        type: "worker-blastn-db-creation-fail-or-timeout", 
                        payload: makeblastdb_ac.signal.reason?.message === "TimeoutError"
                            ? `Blastn db creation timedout for ${baseFileName}.`
                            : `Blastn could not create a db for ${baseFileName}.`,
                        filename: baseFileName,
                        query,
                        blastOpts,
                        sessid,
                        sessids
                    });
                }
            }
            clearTimeout(makeblastdb_ac_timeout_id);
            isFasta && port.postMessage({
                type: "worker-blastn-db-ready", 
                payload: `The blastdb for ${baseFileName} is ready.`,
                filename: baseFileName,
                query,
                blastOpts,
                sessid,
                sessids
            });
            output = queryLocation(baseFileName, queryFileName);
            if(await fileExists(output)) {
                decr();
                return port.postMessage({
                    type: "worker-blastn-query-exists", 
                    payload: `The file ${queryFileName} already exists.`,
                    filename: baseFileName,
                    query,
                    blastOpts,
                    sessid,
                    sessids,
                    location: queryUri(baseFileName, queryFileName) //careful, baseFileName acts as a folder name here
                });
            }
            inputDb = path.join(config.inputDbFolder(baseFileName), baseFileName); //blast/db/example.fasta/example.fasta.*, ...
            isFasta && await capture(
                ((tempDir) => {
                    const 
                        tempFile = path.resolve(tempDir, genHexStr(8, 3, "temp_")),
                        tempFileDefault = path.resolve(tempDir, genHexStr(8, 3, "temp_")),
                        outputDefault = output.slice(0,-4) + "_default.txt";
                    return [
                        `set -o pipefail;`,
                        `mkdir -p ${tempDir}`,
                        `&&`,
                        `echo -e ">query\\n${query}" | tee >(blastn -query - -db ${inputDb} -out ${tempFile}`,
                        `-outfmt "6 qseqid sseqid pident length mismatch gapopen qstart qend sstart send evalue bitscore"`,
                        `-word_size 10 -max_target_seqs 5)`,
                        `| blastn -query - -db ${inputDb} -out ${tempFileDefault} -word_size 10 -max_target_seqs 5`,
                        `&&`,
                        `mkdir -p ${config.outputFolder(baseFileName)}`,
                        `&&`,
                        `mv ${tempFile} ${output}`,
                        `&&`,
                        `mv ${tempFileDefault} ${outputDefault}`
                    ].join(" ")
                })(path.resolve(tempFolder, "blast", "query")),
                {
                    shell: "/bin/bash",
                    pipe: false,
                    logger: false,
                    onstart: function(pChild) {
                        port.postMessage({
                            type: "worker-blastn-query-start", 
                            payload: `Blastn query on ${baseFileName} started.`,
                            filename: baseFileName,
                            query,
                            blastOpts,
                            sessid,
                            sessids
                        });
                    },
                    onerror: ({res, rej, err}) => {
                        /* console.log(err?.message); */
                        port.postMessage({
                            type: "worker-blastn-query-fail", 
                            payload: [
                                `Blastn query on ${baseFileName} failed. Error:`,
                                `${err?.message}`
                            ].join("\n"),
                            filename: baseFileName,
                            query,
                            blastOpts,
                            sessid,
                            sessids
                        });
                    }
                }
            )
            .then(() => {
                port.postMessage({
                    type: "worker-blastn-query-success", 
                    payload: `Blastn query on ${baseFileName} finished.`,
                    filename: baseFileName,
                    query,
                    blastOpts,
                    sessid,
                    sessids,
                    location: queryUri(baseFileName, queryFileName)
                });
            })
            .catch(() => {});
            //isGff && await someFunctionCall({...}))
            port.postMessage({
                type: "worker-blastn-query-end", 
                payload: `Blastn query on ${baseFileName} ended.`,
                filename: baseFileName,
                query,
                blastOpts,
                sessid,
                sessids
            });
            decr();
        })
        return false;
    },{interval: 1000});
    
    let 
        blastnPool = 0,
        blastnBlock = 0,
        blastnPoolMax = 20,
        blastnBlockMax = 2,
        decrBlastn = () => {--blastnPool;--blastnBlock;};
    const loopBlastn = until(async function(){
        if (!blastnDbStack.size){return}
        if (blastnPool >= blastnPoolMax) {
            return port.postMessage({
                type: "worker-blastn-makedb-pool-full", 
                payload: [
                    "Maximum makeblastdb of type nucl queue reached,", 
                    "will be processed once others are finished"
                ].join(" ")
            });
        }

        await until(() => blastnBlock < blastnBlockMax, {interval: 1000});
        Array.from({length: blastnBlockMax - blastnBlock}).forEach(async () => {
            ++blastnPool;
            ++blastnBlock;
            const item = mapShift(blastnDbStack);
            if(!item){return decrBlastn()}
            const 
                [baseFileName, acs = []] = item,
                ext = path.extname(baseFileName);
            if(!configs.fasta.selfExt.includes(ext)){return decrBlastn()}
            if (blastnDbReady.has(baseFileName)) {
                return decrBlastn();
            }
            /**
             * Non atomic part within these async functions is checking the 
             * existance of the folder below. Normal tendency is to put
             * cheap & atomic tests first and return early if possible,
             * but if that logic is followed, folder check will come
             * after them. Since right after all the checks capture (exec) is
             * called and the assumption is checks are done so it is 
             * necessary to create the database is wrong because an async
             * and non-atomic procedure like checking folder existence 
             * has intercaladed. So, against my instincts, I think it is 
             * better to put the async checks first, then the instant
             * atomic checks and move right into capture. The exception is
             * checking blastDbReady quickly because moving it below does 
             * not make sense since if the folder is not there, blastDbReady
             * Set cannot have the filename entry. 
             */
            if (await fileExists(baseFileName, {base: blastDbFolder})) {
                if (!blastnDbReady.has(baseFileName)){
                    blastnDbReady.add(baseFileName);
                }
                return decrBlastn();
            }
            if(currBlastnStackItems.has(baseFileName)) {
                currBlastnStackItems.get(baseFileName).push(...acs)
                return decrBlastn();
            }
            currBlastnStackItems.set(baseFileName, acs);
            await capture(
                ((tempDir, destDir) => { //tempDir looks like 'temp/blast/db/example.fas' assuming baseFileName was 'example.fas', beware that 'example.fas' is a directory here
                    const fastaFile = path.resolve(configs.fasta.inputFolder, baseFileName);
                    return [
                        `mkdir -p ${tempDir}`,
                        `&&`,
                        `makeblastdb -in ${fastaFile}`,
                        `-dbtype nucl -out ${path.join(tempDir, baseFileName)}`, //temp/blast/db/example.fasta/example.fasta.ndb, temp/blast/db/example.fasta/example.fasta.nsq, ...
                        `&&`,
                        `mv ${tempDir} ${destDir}`
                    ].join(" ")
                })(path.resolve(tempFolder, "blast", "db", baseFileName), configs.fasta.inputDbFolder(baseFileName)), //temp/blast/db/example.fasta, blast/db/example.fasta
                {
                    shell: "/bin/bash",
                    pipe: false,
                    logger: false,
                    onstart: function(pChild) {
                        port.postMessage({
                            type: "worker-blastn-db-creation-start", 
                            payload: `Blast database creation for ${baseFileName} started.`,
                            filename: baseFileName
                        });
                    },
                    onerror: ({res, rej, err}) => {
                        acs.forEach(d => d?.abort());
                        currBlastnStackItems.delete(baseFileName);
                        port.postMessage({
                            type: "worker-blastn-db-creation-fail", 
                            payload: [
                                `Blast database creation for ${baseFileName} failed. Error:`,
                                `${err?.message}`
                            ].join("\n"),
                            filename: baseFileName
                        });
                    }
                }
            )
            .then(() => {
                blastnDbReady.add(baseFileName);
                currBlastnStackItems.delete(baseFileName);
                port.postMessage({
                    type: "worker-blastn-db-creation-success", 
                    payload: `Blast database creation for ${baseFileName} finished.`,
                    filename: baseFileName
                });
            })
            .catch(() => {});
            port.postMessage({
                type: "worker-blastn-db-creation-end", 
                payload: `Blast database creation for ${baseFileName} ended.`,
                filename: baseFileName
            });
            decrBlastn();
        });
        return false;
    },{interval: 1000});

    /**            d * h * m * s * ms*/
    let minAgeMs = 1 * 4 * 60 * 60 * 1000,
        defAgeMs = 2 * 24 * 60 * 60 * 1000,
        maxAgeMs = Math.max(minAgeMs, +(workerData?.blastnConf?.maxAgeMs ?? defAgeMs) || 0),
        maxInterval = 0x7FFFFFFF; //largest 32 bit signed integer, approx. 24.8 days, cant be bigger
    const loopClearQueries = until(async function(){
        try {
            const 
                queries = (await getFiles(blastQueryFolder, {relativeTo: "/", depth: 2})).map(d => "/" + d),
                stats = await getStats(queries),
                now = Date.now();
            await Promise.all(queries.filter((query, i) => now - stats[i].birthtimeMs >= maxAgeMs).map(query => {
                return unlink(query);
            }));
        } catch (err) {
            //pass
        } finally {
            return false;
        }
    }, {interval: Math.min(maxInterval, maxAgeMs / 2)});
});
