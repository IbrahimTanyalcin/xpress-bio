const
    {createHash} = require('node:crypto'),
    {readFile} = require("fs/promises");

let defaultHasher;
/**
@description compares the hashes of 2 buffers without encoding
@param {Buffer|string} buff1 buffer 1 WITHOUT encoding
@param {Buffer|string} buff2 buffer 2 WITHOUT encoding
@param {object} [options] options
@param {Function<stream.Transform>} [options.hasher] hasher, defaults to md5
@param {string} [options.digest] digest parameter, defaults to 'hex'
@returns {boolean} true/false
*/
const 
    compareHashes = async (buff1, buff2, {
        hasher = defaultHasher || (defaultHasher = createHash("md5")), 
        digest = "hex"
    } = {}) => {
        [buff1, buff2] = await Promise.all(
            [buff1, buff2].map(async d => {
                if (typeof d === "string"){
                    return await readFile(d, {
                        encoding: void(0)
                    })
                }
                return d;
            })
        );
        const 
            hash1 = hasher.copy().update(buff1).digest(digest),
            hash2 = hasher.copy().update(buff2).digest(digest);
        return hash1 === hash2
    }
module.exports = compareHashes;