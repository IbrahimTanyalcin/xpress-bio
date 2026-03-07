const
    path = require('path'),
    {rm : remove} = require("fs/promises"),
    {fileExists} = require("../../../fileExists");

/**
@description Remove files if they exist. Returns an array
with undefined for each successful deletion (or skip) and 
an Error object for each failure.
@param {string|string[]} files — an absolute path string,
an array of absolute path strings, or nested arrays thereof
@param {Object} [options]
@param {boolean} [options.dryRun=false] — if true, logs
the files that would be deleted without actually removing them
@returns {Promise<Array<undefined|Error>>}
*/
const 
    cleanUpFiles = async (files, {dryRun = false} = {}) => {
        files = [files].flat(Infinity);
        if (files.some(file => !path.isAbsolute(file))){
            throw new Error(
                "Filenames given to cleanUpFiles must be absolute."
            )
        }
        return await Promise.all(
            files.map(async file => {
                try {
                    if (await fileExists(file)){
                        if (dryRun) {
                            console.log(`[cleanUpFiles:dryRun] would delete: ${file}`);
                            return void(0);
                        }
                        await remove(file);
                    }
                    return void(0);
                } catch (err) {
                    return err;
                }
            }) 
        )
    }
module.exports = cleanUpFiles;