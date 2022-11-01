const fs = require('fs/promises'),
      idt = d => d, //identity
      path = require('path'),
      {getStats} = require("../../../DNA-Nexus/test-express-node-js/resources/docker/app/js/getStats.js"),
      {getFiles} = require("../../../DNA-Nexus/test-express-node-js/resources/docker/app/js/getFiles.js"),
      {log} = require("../../../DNA-Nexus/test-express-node-js/resources/docker/app/js/helpers.js");

/**
 * @example
 * relocFilesBasedOnExt({
 *     targetDirs: "./someDir",
 *     destinationDirs: {
 *         ".A": "/home/ibowankenobi/testsGeneral/nodeTest/relocateFileTest/dirA",
 *         ".B": "/home/ibowankenobi/testsGeneral/nodeTest/relocateFileTest/dirB"
 *     },
 *     callback: (arg) => {console.log(arg)}
 * })
 * @example
 * relocFilesBasedOnExt({
 *   targetDirs: ["./relocateFileTest/someDir","./relocateFileTest/someDir2"],
 *   destinationDirs: {
 *       ".A": "/home/ibowankenobi/testsGeneral/nodeTest/relocateFileTest/dirA",
 *       ".B": function({dir, transformed}, i, a){return "./relocateFileTest/dirC"},
 *       ".Y": "./relocateFileTest"
 *   },
 *   transform: function(dir, i, dirs){return path.basename(dir);},
 *   validate: function({dir, transformed}, i, dirs){return /^someDir/.test(transformed);},
 *   callback: (arg) => {console.log(arg); return "hello world";}
 * })
 * 
 * @param {object} configObject An object with properties documented below
 * @param {string|string[]} configObject.targetDirs The directory to move the files from
 * @param {Function=} configObject.transform A function to transform directory names before validation
 * @param {Object.<string, string>} configObject.destinationDirs An object with keys as extensions (with dots) and values as either string or function
 * @param {Function=} configObject.validate A function to decide based on transformed values whether to proceed or not
 * @param {Function=} configObject.callback A function to execute after renamings have been done
 * @param {boolean|Function=} configObject.logger Optional logging function
 * @returns {{errors: Error[], erredFiles: string[], nFiles: string[], files: string[], dir: string, transformed: *, extVisited: string[], i: number}[]|*} Result of the callback function or a default array of objects 
 * ```javascript
 *  {
 *   errors: "list of errors that occured during renaming",
 *   erredFiles: "list of file paths that caused the errors, a convenience array instead of inspecting path variable from Error objects",
 *   nFiles: "new locations of files that are renamed", 
 *   files: "initial locations of all files", 
 *   dir: "directory where initial files resided in", 
 *   transformed: "transformed value of the dir path, dir path itself if left default", 
 *   extVisited: "an array of extensions of files that were renamed", 
 *   i: "`targetDirs` index of the directory"
 *  }[]
 * ```
 */

exports.relocFilesBasedOnExt = async function({
    targetDirs, 
    transform = idt,
    destinationDirs,
    validate = () => true,
    callback = idt,
    logger = true
}){
    let _log;
    switch (((typeof logger === "function") << 1) + !!logger) {
        case 3:
        case 2:
            _log = (msg) => {logger(msg); return msg}
            break;
        case 1:
            _log = (msg) => {log(msg); return msg};
            break;
        default:
            _log = (msg) => msg
    }
    if (typeof targetDirs === "string") {
        targetDirs = [targetDirs];
    }
    if (!(targetDirs instanceof Array)){
        throw new Error(_log("Target must be an array or string"));
    }
    if (typeof callback !== "function") {
        throw new Error(_log("Optional callback parameter must be a function, if provided"));
    }
    if (typeof validate !== "function") {
        throw new Error(_log("Optional validate parameter must be a function, if provided"));
    }

    const destDirs = Object.values(destinationDirs);
    const result = await getStats(...destDirs.filter(d => typeof d === "string")).then(stats => 
        stats.some((stat, i) => {
            if (!stat.isDirectory()) {
                throw (_log(`${destDirs[i]} is not a directory`));
            }
        })
    );
    const arrOfObj = await new Promise(async (res,rej) => {
        try {
            let validationFailed = 0;
            const transformedDirs = await targetDirs
            .map((dir, i, dirs) => {
                const transformed = transform(dir, i, dirs);
                if (!validate({dir, transformed}, i, dirs)) {
                    rej(_log(new Error(`Validation failed on dir:${dir}, index: ${i}, transformed: ${transformed}`)));
                    validationFailed = 1;
                }
                return {dir, transformed};
            });
            if (validationFailed) {return}
            transformedDirs.forEach(function ({dir, transformed}, i, a) {
                this.push(getFiles(dir, {relativeTo: "/"}).then(async files => {
                    files = files.map(d => "/" + d); //{relativeTo: '/'} strips the trailing fwdSlash from abspaths
                    const errors = [],
                        nFiles = [],
                        extVisited = [],
                        erredFiles = [];
                    return Promise.all(files.map(file => {
                        const ext = path.extname(file),
                            base = path.basename(file);
                        let dest = destinationDirs[ext];
                        if (!dest) {
                            //console.log("detected unknown ext: ", ext);
                            return
                        }
                        dest = typeof dest === "string" ? dest : dest({dir, transformed}, i , a);
                        dest = path.join(dest, base);
                        //nFiles.push(dest);
                        //console.log(`I will rename ${file} to ${dest}`);
                        return fs.rename(file, dest)
                            .then(undef => (
                                nFiles.push(dest),
                                extVisited.push(ext), 
                                undef))
                            .catch(err => (errors.push(err),erredFiles.push(file)));
                    }))
                    .then(arrOfUndefOrErr => ({errors, erredFiles, nFiles, files, dir, transformed, extVisited, i}));
                }));
                if (i === a.length - 1) {
                    res(Promise.all(this));
                }
            }, []);
        } catch (err) {
            rej(_log(err));
        }
    });
    return callback(arrOfObj);
}