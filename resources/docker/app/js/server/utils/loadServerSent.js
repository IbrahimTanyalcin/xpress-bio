const
    {log, serverSend} = require("../../helpers.js"),
    genHexStr = require("../../genHexStr");
module.exports = async function ({express, app, info, files}) {
    const undef = void(0),
          sse = {
            responses:{}, //Object of keys as 'names', values as Maps
            storage: {} //Objects to store 
          },
          sseKey = genHexStr(8, 3, "sse_");
    Object.entries(info?.serverConf?.["server-sent"]?.mounts ?? {}).forEach(([mount, oMount]) => {
        if(oMount?.isRegExp){
            mount = new RegExp(mount, oMount.RegExpFlags);
        }
        const mountRouter = express.Router();
        Object.entries(oMount?.routes ?? {}).forEach(([route, oRoute]) => {
            log("PROCESSING ::SERVER-SENT::", route); 
            const routeRouter = express.Router(),
                  retry = oRoute?.retry || 5000,
                  name = oRoute?.name ?? (()=>{throw new Error(
                    `'name' field is missing in ${JSON.stringify(oRoute, null, "\t")}`
                  )})(),
                  nMap = sse.responses[name] = new Map(),
                  destroy = function(){
                    clearTimeout(this?.timeout);
                    this?.response?.end?.();
                    return nMap.delete(this?.sessid);
                  },
                  //0 documentation nodejs, what are the args on cb for writable streams??
                  //Check 'Passing arguments and this to listeners' section on Node JS 16 docs
                  //'this' seems to refer to where the 'on' is attached 
                  onClose = function(){
                    //console.log("Connection is closing", this[sseKey].sessid);
                    nMap.get(this[sseKey].sessid)?.destroy?.();
                  },
                  onError = function(err){
                    info?.serverConf?.["server-sent"]?.logEvents && log(err);
                    nMap.get(this[sseKey].sessid)?.destroy?.();
                  };
            if(oRoute?.isRegExp){
                route = new RegExp(route, oRoute.RegExpFlags);
            }
            (oRoute?.method.toLowerCase() || "get").split("|").forEach(method => {
                routeRouter[method](route, function(req, res, next){
                    const sessid = req.session.id;
                    //console.log("SESSID isss", sessid);
                    if(nMap.has(sessid)){
                        req._isDuplicate = true;
                        next();
                        return
                    }
                    //trigger session to be saved if 'saveUninitialized' was false
                    req.session.sseInit = true; 
                    nMap.set(
                        sessid, 
                        req[sseKey] = {
                            response: res
                            .status(200)
                            .set({
                                'Content-Type': 'text/event-stream',
                                'Connection': 'keep-alive',
                                'Cache-Control': 'no-cache'
                            }),
                            timeout: req.session.cookie.maxAge
                            ? setTimeout(function(){
                                nMap.delete(sessid); res.end();
                            }, req.session.cookie.maxAge)
                            : undef,
                            createdAt: Date.now(),
                            sessid,
                            destroy,
                            name,
                            nMap
                        }
                    );
                    req
                    .on('close', onClose)
                    .on('error', onError);
                    res.flushHeaders();
                    res.write(serverSend({directive: "retry", payload: retry}));
                    next();
                });
            });
            mountRouter.use(mount, routeRouter);
        });
        app.use(mountRouter);
    });
    return new Proxy(
        sse.responses, 
        [
            "defineProperty", 
            "deleteProperty", 
            "getOwnPropertyDescriptor",
            "getPrototypeOf",
            "set",
            "setPrototypeOf"
        ].reduce((ac,d) => Object.defineProperty(ac,d,{
            configurable: false,
            writable: false,
            value: function(){
                throw new Error("You cannot modify this object");
            }
        }),{
            get (trgt, prop, rec) {
                switch (prop) {
                    case "get":
                    case "find":
                        return (...args) => {
                            if (args.length < 2) {
                                throw new Error("Provide namespace and sessionid");
                            } 
                            return trgt[args[0]]?.get(args[1]);
                        }
                    case "getAll":
                    case "findAll":
                        return (name) => {
                            name ?? (()=>{throw new Error(
                                `Provide a namespace.`
                            )})();
                            return [...trgt[name]?.values() ?? []];
                        }
                    case "has":
                        return (...args) => {
                            if(args.length < 2) {
                                throw new Error("Provide namespace and sessionid");
                            }
                            return trgt[args[0]]?.has(args[1]);
                        }
                    case "hasAll":
                        return function(name) {
                            name ?? (()=>{throw new Error(
                                `Provide a namespace.`
                            )})();
                            return !!(trgt[name]?.values() ?? []).length;
                        }
                    case "delete":
                    case "del":
                    case "remove":
                    case "rm":
                        return function(...args) {
                            return this.get(...args)?.destroy?.();
                        }
                    case "deleteAll":
                    case "delAll":
                    case "removeAll":
                    case "rmAll":
                        return function(name) {
                            return this.getAll(name).map(function(d){
                                return d?.destroy?.();
                            });
                        }
                    case "store":
                    case "save":
                        return function(key, val = undef) {
                            key ?? (()=>{throw new Error(
                                `A key name is required.`
                            )})();
                            sse.storage[key] = val;
                            return this;
                        }
                    case "recall":
                        return (key) => {
                            return sse.storage[key];
                        }
                    case "send":
                    case "message":
                    case "msg":
                        return function(name, sessid, oPayload){
                            if (arguments.length < 3) {
                                throw new Error("Provide namespace, sessionid and payload object");
                            }
                            this.get(name, sessid)?.response?.write(serverSend(oPayload));
                            return this;
                        }
                    case "sendAll":
                    case "messageAll":
                    case "msgAll":
                        return function(name, oPayload){
                            if (arguments.length < 2) {
                                throw new Error("Provide namespace and payload object");
                            }
                            const message = serverSend(oPayload);
                            this.getAll(name).forEach(function(o){
                                o?.response?.write(message);
                            });
                            return this;
                        }
                    case "size":
                        return function(name){
                            name ?? (()=>{throw new Error(
                                `Provide a namespace.`
                            )})();
                            return trgt[name]?.size ?? 0;
                        }
                }
            },
        })
    );
}