module.exports = async function ({express, app, info, files, serverSent}) {
    const undef = void(0);
    if(info?.serverConf?.memcached) {
        var {md5} = require("../../md5.js"),
            cache = require("../../cache.js").Cache(info);
    }
    Object.entries(info?.serverConf?.memcached?.mounts ?? {}).forEach(([mount, oMount]) => {
        if(oMount?.isRegExp){
            mount = new RegExp(mount, oMount.RegExpFlags);
        }
        const mountRouter = express.Router();
        Object.entries(oMount?.routes ?? {}).forEach(([route, oRoute]) => {
            const routeRouter = express.Router();
            if(oRoute?.isRegExp){
                route = new RegExp(route, oRoute.RegExpFlags);
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
                console.log("mounting",oLimit?.method.toLowerCase(), route );
                (oLimit?.method.toLowerCase() || "get").split("|").forEach(method => {
                    routeRouter[method](route, function(req, res, next){
                        cache
                        .get(key)
                        .then(keyVal => {
                            //console.log("BEING CALLED", route, keyVal);
                            let flow = Promise.resolve(keyVal);
                            if (keyVal === undef){
                                keyVal = 1;
                                flow = flow.then(oldVal => cache.set(key, keyVal, timeout));
                            }
                            res.header({
                                "X-RateLimit-Limit": limit,
                                "X-RateLimit-Remaining": limit - keyVal
                            });
                            if(keyVal > limit) {
                                res.status(429).send({
                                    "http-status": 429, 
                                    message
                                });
                            }
                            flow.then(() => cache.incr(key, step));
                            next();
                        })
                        .catch((err) => {next(err)});
                    });
                });
            });
            mountRouter.use(mount, routeRouter);
        });
        app.use(mountRouter);
    });
    return cache;
}