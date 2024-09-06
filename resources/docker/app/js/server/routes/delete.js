module.exports = async function({express, app, info, files, serverSent}){
    const path = require('path'),
        {constants} = require('fs'),
        {unlink, rm : remove, access} = require("fs/promises"),
        {sanitizeFilename, rmIndent} = require("../../helpers.js"),
        {getFiles} = require("../../getFiles.js"),
        dirRoot = path.resolve(info.rootFolder, info.serverConf.static),
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
            ".taz": path.resolve(dirRoot, "gz"),
            ".lz4": path.resolve(dirRoot, "gz"),
            ".n*": path.resolve(dirRoot, "blast", "db"),
            "md5sum.txt": path.resolve(dirRoot, "blast", "query")
        },
        extArr = Object.keys(extMap),
        useRm = ["blast-db", "blast-query-folder"],
        doNotFireSuccess = ["blast-db", "blast-query-folder"],
        doNotFireFail = ["blast-db", "blast-query-folder"],
        portKey = Symbol.for("customPort"),
        nameKey = Symbol.for("customName"),
        deleteFile = function({dir, fileType, req, res, next}) {
            const {refreshFasta} = require('../../refreshFasta.js'),
                  {refreshBam} = require('../../refreshBam.js');
            let fName = path.basename(sanitizeFilename(req.params.fName)),
                fileName = path.resolve(dir, fName);
            if (files[fName] || ~(info.serverConf?.["x-options"]?.["+rm"]?.indexOf(fName) ?? -1)) {
                next({
                    fileType,
                    fileName: fName,
                    message: "You cannot delete initial datasets."
                });
                return
            }
            if (!fName) {
                next({
                    fileType,
                    fileName: fName,
                    message: "You cannot delete folders."
                });
                return
            }
            access(fileName, constants.F_OK | constants.R_OK)
            .then(() => {
                if (useRm.includes(fileType)) {return remove(fileName, {recursive: true})}
                return unlink(fileName)
            })
            .then(() => {
                switch (fileType) {
                    case "blast-db":
                        const workerBlastn = [...info.workers].filter(d => d[nameKey] === "worker-blastn")[0];
                        if(!workerBlastn){break}
                        workerBlastn[portKey].postMessage({
                            type: "blast-db-set-delete-request",
                            payload: "Requesting blastn db flag deletion from blastnDbReady set",
                            filename: fName
                        })
                        break;
                    default:
                }
                if (!doNotFireSuccess.includes(fileType)) {
                    serverSent
                    .msg("streamOne", req.session.id,  {directive: "event", payload: "file-delete-success"})
                    .msg("streamOne", req.session.id, {payload: {
                        fileType, 
                        fileName: fName, 
                        message: `${fName} has been removed.`
                    }});
                }
                if (fileType === "reference") {
                    refreshFasta({info, serverSent});
                } else if (fileType === "alignment") {
                    refreshBam({info, serverSent});
                }
                res.status(200).end();
            })
            .catch((err) => {/* console.log(err); */ return next({
                fileType,
                fileName: fName,
                message: rmIndent`${fileType || fName ? fileType + ":" + fName + " ": "File "}
                    does not exist or cannot be removed.`
            })});
        };
        /* ,
        initFastaFiles = await getFiles(extMap[".fa"], {relativeTo: "/"})
            .then(faFiles => faFiles.map(d => "/" + d)),
        initBamFiles = await getFiles(extMap[".bam"], {relativeTo: "/"})
            .then(bamFiles => bamFiles.map(d => "/" + d)); */

    app.delete("/del/:fType/:fName", function(req, res, next){
        if(!req?.session?.id){
            next({
                fileType: "",
                fileName: "",
                message: "A user session is required for this function."
            });
            return;
        }
        switch(req.params.fType) {
            case "reference":
            case "ref":
            case "fa":
            case "fasta":
            case "genome":
                deleteFile({dir: extMap[".fa"], fileType: "reference", req, res, next});
                break;
            case "bam":
            case "alignment":
            case "align":
            case "read":
            case "map":
                deleteFile({dir: extMap[".bam"], fileType: "alignment", req, res, next});
                break;
            case "faindex":
            case "fastaindex":
            case "fai":
                deleteFile({dir: extMap[".fai"], fileType: "fasta-index", req, res, next});
                break;
            case "bamindex":
            case "bai":
                deleteFile({dir: extMap[".bai"], fileType: "bam-index", req, res, next});
                break;
            case "blastdb":
            case "blast-db":
                deleteFile({dir: extMap[".n*"], fileType: "blast-db", req, res, next});
                break;
            case "blastQueryFolder":
            case "blast-query-folder":
                deleteFile({dir: extMap["md5sum.txt"], fileType: "blast-query-folder", req, res, next});
                break;
            default:
                next({
                    fileType: "",
                    fileName: "",
                    message: "You can only remove reference/alignment files."
                });
        }
    }, function(err, req, res, next){
        if (!doNotFireFail.includes(err?.fileType)) {
            serverSent
            .msg("streamOne", req.session.id,  {directive: "event", payload: "file-delete-fail"})
            .msg("streamOne", req.session.id, {
                payload: err instanceof Error 
                    ? {
                        fileType: "",
                        fileName: "",
                        message: "There was an error removing the file."
                    } : err
            });
        }
        res.status(400).end();
    });
}