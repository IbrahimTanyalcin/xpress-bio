const
    path = require('path'),
    {getFiles} = require("../../getFiles.js"),
    {findDir} = require("../../findDir.js"),
    {log} = require("../../helpers.js");

module.exports = async function ({express, app, info, files, serverSent, ws}) {
    const routeFiles = await Promise.resolve(
        info.serverConf?.routes
        ? getFiles(
            path.join(info.rootFolder, info.serverConf.routes), 
            {depth: 1, relativeTo: __dirname}
        )
        : (
            log(
                "could not find 'routes' key on conf object",
                "searching upwards recusively"
            ),
            findDir(__dirname, "/routes", {depth: 5})
            .then(dir => path.join(dir, "/routes"))
            .then(dir => {
                log(`found ${dir}, getting files`);
                return getFiles(dir, {depth: 1, relativeTo: __dirname})
            })
        )
    );
    log("loading routes:", JSON.stringify(routeFiles));
    return Promise.all(routeFiles.map(routeFile => require("./" + routeFile)({express, app, info, files, serverSent, ws})))
    .then(() => routeFiles);
}