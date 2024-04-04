const
    {resolve} = require('path'),
    {readdir} = require("fs/promises");

/**
 * 
 * @param {string} path relative or absolute path to directory
 * @param {object} [options] An options object
 * @param {string} [options.base] The base path to start search from, this can be relative or absolute
 * @returns {Promise<string[]>} Returns a promise that resolves to an array of the absolute foldernames
 */
const getDirs = async function(
    path,
    {
        base = "./"
    } = {}
) {
    try {
        path = resolve(base, path);
        const dirents = await readdir(path, {withFileTypes: true});
        return dirents.filter(d => d.isDirectory()).map(d => resolve(path, d.name));
    } catch (err) {
        throw err
    }
}

exports.getDirs = getDirs;