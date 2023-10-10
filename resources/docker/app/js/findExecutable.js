const 
    path = require('path'),
    {capture} = require("./capture.js"),
    undef = void(0);

/**
 * Given a file to source and a function to call, 
 * resolves with the first path that returns 0 from 'type'.
 * Else resolves with 'undefined'
 * @param {string|string[]} paths a pathstring or array of pathstrings
 * @param {object} options an options object
 * @param {string} [options.prepend] a path segment to prepend each path string
 * @param {string} [options.append] a path segment to append each path string. This is usually the tool's name
 * @param {string} options.finder path to bash script that returns 1 or 0
 * @param {string} options.functionName name of the function to be called from finder
 * @param {Function} [options.onerror] Callback on error
 * @param {{res, rej, err, paths}} [options.onerror.params] Parameter object passed to onerror
 * @param {Function} [options.onerror.params.res] Promise resolver of upstream capture
 * @param {Function} [options.onerror.params.rej] Promise rejector of upstream capture
 * @param {Error} [options.onerror.params.err] Error occured during capture
 * @param {string[]} [options.onerror.params.paths] Array of path strings
 * @returns {Promise<string|undefined>} if finder had success, pathstring to executable, else 'undefined'
 */
async function findExecutable (paths, {
    prepend = "",
    append = "",
    finder = null,
    functionName = null,
    onerror = null
} = {}) {
    (finder && functionName) ?? (() => {
        throw new Error([
            `You must specify a bash script as 'finder' with`,
            `a 'functionName'`
        ].join("\n"))
    })();
    paths = [paths]
        .flat(Infinity)
        .filter(d => d)
        .map(p => `"${path.resolve(prepend, p, append)}"`);
    if (append) {
        paths.unshift(`"${append}"`)
    }
    return capture(
        `source ${finder} && ${functionName} ${paths.join(" ")}`,
        {
            shell: "/bin/bash",
            pipe: false,
            logger: false,
            onerror: ({res, rej, err}) => {
                onerror?.({res, rej, err, paths});
                res(undef)
            }
        }
    )
}

exports.findExecutable = findExecutable;