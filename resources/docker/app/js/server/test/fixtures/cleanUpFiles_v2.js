const
    path = require('path'),
    {rm : remove} = require("fs/promises"),
    {fileExists} = require("../../../fileExists");

/**
@description Remove files if they exist. Accepts variadic
arguments: individual path strings, arrays of path strings,
or nested arrays thereof. If the last argument is a plain 
Object whose keys overlap with the known option keys, it is
treated as a configuration object rather than a file path.
@param {...(string|string[]|Object)} files — absolute path 
strings (or arrays of them). The last argument may be an 
options object with the following keys:
@param {boolean} [files.dryRun=false] — if true, logs
the files that would be deleted without actually removing them
@param {string|RegExp|Array<string|RegExp>} [files.safeGuard] — 
a string, RegExp, or array thereof. If any file path matches
a safeGuard pattern, the function throws before deleting 
anything. Strings are tested with String.prototype.includes;
RegExp patterns are tested with RegExp.prototype.test (with
lastIndex reset to 0 to avoid global-flag statefulness).
@returns {Promise<Array<undefined|Error>>}
@example
cleanUpFiles_v2("/abs/file1.txt", "/abs/file2.txt")
cleanUpFiles_v2(["/abs/file1.txt"], ["/abs/file2.txt"], {dryRun: true})
cleanUpFiles_v2("/abs/file1.txt", {dryRun: true})
cleanUpFiles_v2("/abs/file1.txt", {safeGuard: ["/etc/", /^\/usr\//]})
*/

const 
    cleanUpFiles_v2 = async (...files) => {
        let opts = {dryRun : false, safeGuard: void(0)};
        if (files.length >= 2){
            const lastArg = files.at(-1);
            if (lastArg instanceof Object && !Array.isArray(lastArg) && typeof lastArg !== "string") {
                if (Object.keys(opts).some(opt => Object.hasOwn(lastArg, opt))) {
                    files = files.slice(0, -1);
                    Object.assign(opts, (({dryRun, safeGuard}) => ({dryRun, safeGuard}))(lastArg));
                }
            }
        }
        files = [files].flat(Infinity);
        if (files.some(file => !path.isAbsolute(file))){
            throw new Error(
                "Filenames given to cleanUpFiles_v2 must be absolute."
            )
        }
        // Compile safeguard matchers once, then fail-fast before any deletion
        const guards = [opts.safeGuard].flat(Infinity).filter(Boolean);
        if (guards.length) {
            const blocked = files.filter(file => guards.some(g => {
                if (g instanceof RegExp) { g.lastIndex = 0; return g.test(file); }
                return typeof g === "string" && file.includes(g);
            }));
            if (blocked.length) {
                throw new Error(
                    `[cleanUpFiles_v2:safeGuard] Refusing to delete:\n${blocked.join("\n")}`
                );
            }
        }
        return await Promise.all(
            files.map(async file => {
                try {
                    if (await fileExists(file)){
                        if (opts?.dryRun) {
                            console.log(`[cleanUpFiles_v2:dryRun] would delete: ${file}`);
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
module.exports = cleanUpFiles_v2;
