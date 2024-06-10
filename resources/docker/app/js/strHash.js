const
    {createHash} = require('node:crypto');

let defaultHasher;

const 
    isOpt = (x) => typeof x !== "string",
    /**
    @description Calculates the hashes of file(s) or buffer(s)
    @param {string[]} args string(s). Can accept arbitrary number of args
    @param {Object} [options] options, not required. Should be the last arg if included.
    @param {Function<stream.Transform>} [options.hasher=createHash("md5")] hasher, defaults to md5
    @param {string} [options.digest="hex"] digest parameter, defaults to 'hex'
    @returns {Promise<string[]>} array of digests
    */
    strHash = async (...args) => {
        let temp;
        const 
            strs = args.filter(arg => !isOpt(arg)),
            opts = (isOpt(temp = args.slice(-1)[0]) ? temp : {}) ?? {},
            {
                hasher = defaultHasher || (defaultHasher = createHash("md5")), 
                digest = "hex"
            } = opts;
        return await Promise.all(
            strs.map(async d => hasher.copy().update(d).digest(digest))
        );
    }
module.exports = strHash;