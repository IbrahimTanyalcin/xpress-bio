const
    express = require('express'),
    app = express(),
    path = require('path'),
    {getFiles} = require("../getFiles.js"),
    {findDir} = require("../findDir.js"),
    {log, catcher} = require("../helpers.js"),
    {getPort} = require("../getPort.js"),
    {execute} = require("../execute.js");

async function render (info) {
    //__dirname is local to the module, in this case: app/js/server
    const undef = void(0);
    return getFiles(path.join(info.rootFolder, info.serverConf.public), {depth: 4, relativeTo: __dirname})
    .then(files => {
        files = Object.assign(
            {},
            ...files.map(d => {return {[path.basename(d)] : path.resolve(__dirname, d)} })
        );
        
        log(
            "Requestable files:",
            JSON.stringify(files,null,"\t")
        );
        
        return Promise.resolve(
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
        ).then(routeFiles => {
            if(info?.serverConf?.memcached) {
                var {md5} = require("../md5.js"),
                    cache = require("../cache.js").Cache(info);
            }
            Object.entries(info?.serverConf?.memcached?.mounts ?? {}).forEach(([mount, oMount]) => {
                if(oMount?.isRegExp){
                    mount = new RegExp(oMount.isRegExp, oMount.RegExpFlags);
                }
                const mountRouter = express.Router();
                Object.entries(oMount?.routes ?? {}).forEach(([route, oRoute]) => {
                    const routeRouter = express.Router();
                    if(oRoute?.isRegExp){
                        route = new RegExp(oRoute.isRegExp, oRoute.RegExpFlags);
                    }
                    oRoute?.limits.forEach(oLimit => {
                        oLimit?.key ?? (()=>{throw new Error(
                            `'key' field is missing in ${JSON.stringify(oLimit, null, "\t")}`
                        )})();
                        const key = oLimit?.global 
                                ? oLimit.key 
                                : md5(performance.now() + " " + Math.random()) + "_" + oLimit.key,
                              timeout = oLimit?.timeout || 60,
                              limit = +oLimit.limit || 1,
                              message = oLimit?.message ?? "You have exceeded the request limit",
                              step = +oLimit?.step || 1;
                        routeRouter[oLimit?.method.toLowerCase() || "get"](route, function(req, res, next){
                            cache
                            .get(key)
                            .then(keyVal => {
                                console.log("BEING CALLED", route, keyVal);
                                let flow = Promise.resolve(keyVal);
                                if (keyVal === undef){
                                    keyVal = 0;
                                    flow = flow.then(oldVal => cache.set(key, keyVal, timeout));
                                }
                                res.header({
                                    "X-RateLimit-Limit": limit,
                                    "X-RateLimit-Remaining": limit - keyVal
                                });
                                if(keyVal > limit) {
                                    return flow.then(() => {
                                        cache.end(); 
                                        res.status(429).send({
                                            "http-status": 429, 
                                            message
                                        });
                                    });
                                }
                                return flow.then(() => cache.incr(key, step))
                                .then(() => {
                                    cache.end(); 
                                    next()
                                });
                            })
                            .catch((err) => {cache.end(); next(err)});
                        })
                    });
                    mountRouter.use(mount, routeRouter);
                });
                app.use(mountRouter);
            });
            return routeFiles;
        }).then(routeFiles => {
            log("loading routes:", JSON.stringify(routeFiles));
            routeFiles.forEach(routeFile => require("./" + routeFile)(express, app, info, files));
            return routeFiles;
        }).then(function(routeFiles){
            const host = +info.isContainer <= 0
                ? "127.0.0.1"
                : "0.0.0.0";
            return getPort(info)
            .then(port => {
                app.listen(
                    port,
                    host
                );
                log("listening on host:", `${host}:${port}`);
                return {routeFiles, files, host, port};
            });
        }).catch(catcher);


        /* setTimeout(function(){
            log('EXITING!');
            execute("pkill -fc nodemon")
            .then(res => process.exit(0))
            .catch(err => console.log("child process likely could not terminate parent (nodemon):", err)); 
            process.exit(0);
        }, 3000);  */
    });   
}

exports.render = render;