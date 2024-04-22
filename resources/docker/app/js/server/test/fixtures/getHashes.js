const
    {createHash} = require('node:crypto'),
    {readFile} = require("fs/promises"),
    {Buffer} = require("node:buffer");

let defaultHasher;

const 
    isOpt = (x) => typeof x !== "string" && !Buffer.isBuffer(x),
    /**
    @description Calculates the hashes of file(s) or buffer(s)
    @param {...(string|Buffer)} args buffer(s) without encoding or path string(s). Can accept arbitrary number of args
    @param {Object} [options] options, not required. Should be the last arg if included.
    @param {Function<stream.Transform>} [options.hasher=createHash("md5")] hasher, defaults to md5
    @param {string} [options.digest="hex"] digest parameter, defaults to 'hex'
    @returns {Promise<string[]>} array of digests
    */
    getHashes = async (...args) => {
        let temp;
        const 
            buffs = args.filter(arg => !isOpt(arg)),
            opts = (isOpt(temp = args.slice(-1)[0]) ? temp : {}) ?? {},
            {
                hasher = defaultHasher || (defaultHasher = createHash("md5")), 
                digest = "hex"
            } = opts;
        return await Promise.all(
            buffs.map(async d => {
                let content = d;
                if (typeof d === "string"){
                    content = await readFile(d, {
                        encoding: void(0)
                    });
                }
                return hasher.copy().update(content).digest(digest)
            })
        );
    }
module.exports = getHashes;