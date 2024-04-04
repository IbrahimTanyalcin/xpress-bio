const
    path = require('path'),
    {rm : remove} = require("fs/promises"),
    {getStats} = require("../../../getStats"),
    {fileExists} = require("../../../fileExists");

/**
@description remove folders if exist
@param {string|string[]} folders a pathstring or
an array ofpath strings
@returns {Array} an array with undefined or error 
object for each folder
*/
const 
    cleanUpFolders = async (folders) => {
        folders = [folders].flat(Infinity);
        if (folders.some(folder => !path.isAbsolute(folder))){
            throw new Error(
                "Foldernames given to cleanUpFolders must be absolute."
            )
        }
        if (folders.some(folder => folder.length <= 6)){
            throw new Error(
                "The path length is too short. For safety reasons re-check you are not removing a system critical folder."
            )
        }
        const stats = await getStats(folders);
        if (stats.some((stat, i) => !stat.isDirectory())) {
            throw new Error(`${folders[i]} is not a directory`);
        }
        return await Promise.all(
            folders.map(async (folder, i) => {
                try {
                    if (await fileExists(folder)){
                        console.log("Will remove the ", folder);
                        await remove(folder, {recursive: true});
                    }
                    return void(0);
                } catch (err) {
                    return err;
                }
            }) 
        )
    }
module.exports = cleanUpFolders;