const 
    path = require('path'),
    {constants} = require("fs"),
    {findDir} = require("./findDir.js");

async function fileExists (
    fName, 
    {
        base = "./", 
        depth = 1, 
        fsConstants = constants.F_OK | constants.R_OK
    } = {}
) {
    return findDir(
        path.resolve(base),
        fName,
        {fsConstants, depth}
    )
    .then(absDirName => path.join(absDirName, fName))
    .catch(err => false)
}

exports.fileExists = fileExists;