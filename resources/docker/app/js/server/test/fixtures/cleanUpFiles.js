const
    path = require('path'),
    {rm : remove} = require("fs/promises"),
    {fileExists} = require("../../../fileExists");

/**
@description remove files if exist
@param {string|string[]} files a pathstring or
an array ofpath strings
@returns {Array} an array with undefined or error 
object for each file
*/
const 
    cleanUpFiles = async (files) => {
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