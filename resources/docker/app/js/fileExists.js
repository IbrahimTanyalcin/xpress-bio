const 
    path = require('path'),
    {constants} = require("fs"),
    {findDir} = require("./findDir.js");
/**
 * 
 * @param {string} fName The filename to be searched
 * @param {object} [options] An options object
 * @param {string} [options.base] The base path to start search from
 * @param {number} [options.depth] Number of depth to recursively look up
 * @param {number} [options.constants] File System flag constants, defaults to
 * F_OK | R_OK
 * @returns {Promise<string|boolean>} Returns the absolute filename or 
 * false if not found
 */

async function fileExists (
    fName, 
    {
        base = "./", 
        depth = 1, 
        fsConstants = constants.F_OK | constants.R_OK
    } = {}
) {
    if (path.isAbsolute(fName)){
        fName = path.basename(fName);
        base = path.dirname(fName);
    }
    return findDir(
        path.resolve(base),
        fName,
        {fsConstants, depth}
    )
    .then(absDirName => path.join(absDirName, fName))
    .catch(err => false)
}

exports.fileExists = fileExists;