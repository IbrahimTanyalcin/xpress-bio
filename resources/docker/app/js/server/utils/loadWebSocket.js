const 
    path = require('path'),
    WebSocket = require('ws'),
    isAlive = Symbol("isAlive"),
    safeSend = Symbol("safeSend"),
    { match } = require('path-to-regexp'),
    genHexStr = require("../../genHexStr"),
    {validate} = require("../../validateWs.js"),
    {Limiter} = require("../../rateLimiter.js"),
    {log, until, clamp, encode, wsSend8} = require("../../helpers.js"),
    {penalize, unpenalize, isPenalized} = require("../../penalizer.js"),
    rateLimitKey = Symbol.for("xpressbio.ratelimit");
    
module.exports = async function ({server, express, app, info, files, session, serverSent, memcache}) {
    const Subscriber = (await import("@ibowankenobi/subscriber/dist/subscriber.0.0.3.evergreen.es.min.js")).default;
    /* console.log(Subscriber, (new Subscriber()).subscribe("some-channel"));

    const 
    subscriber = new Subscriber(),
    subscription = subscriber.subscribe("my-channel");
    subscription.on("my-event@my-namespace", () => console.log("Hello World! - Subscriber!!!"));
    subscriber.dispatch("my-channel", "my-event"); // Hello World! */


    if(!info?.serverConf?.["web-socket"]) {
        log("no web-socket config found, skipping.");
        return new Proxy({}, {
            get (trgt, prop, rec) {
                if (prop === "then") {
                    /* 
                        await will check the then property,
                        so it needs to return itself, otherwise will throw.
                    */
                    return rec;
                }
                throw new Error("No web socket servers. Did you forget to specify web socket config?");
            }
        })
    }
    const 
        undef = void(0),
        wsConf = info?.serverConf?.["web-socket"],
        penaltyInterval = clamp(
            wsConf?.conf?.penalty ?? wsConf?.penalty,
            {
                min: 1000,
                max: 3600000,
                def: 60000
            }
        ),
        wsDebug = !!((wsConf?.conf?.debug ?? wsConf?.debug) || false),
        logIfDebug = wsDebug ? console.log.bind(console) : () => {},
        rateLimitInterval = 5000,
        wss = new WebSocket.WebSocketServer({noServer: true}),
        wsStates = [ WebSocket.CONNECTING, WebSocket.OPEN, WebSocket.CLOSING, WebSocket.CLOSED ],
        wsOPEN = WebSocket.OPEN,
        wsClients = {
            responses: {}, //channelName: Map(sessid => ws[wsKey] = {ws:ws, })
            storage: {}
        },
        wsKey = genHexStr(8, 3, "ws_"),
        wsSubscriber = new Subscriber(),
        destroy = function(){
            clearTimeout(this?.timeout);
            clearTimeout(this?.ws?.[rateLimitKey]);
            unpenalize(this?.ws);
            this?.ws?.terminate?.();
            return this?.clients?.delete(this?.sessid);
            //for each channel dispacth channel @namespace to induce garbage collection ??
        },
        onClose = function(){
            this[wsKey]?.destroy?.();
        },
        onError = function(err){
            this[wsKey]?.destroy?.();
        },
        fSafeSend = function(payload) {
            this?.readyState === WebSocket.OPEN && this?.send?.(payload);
        };
    let channelMatchers = [];
    try {
        Object.entries(wsConf?.mounts ?? {}).forEach(([mount, oMount]) => {
            Object.entries(oMount?.routes ?? {}).forEach(([route, oRoute]) => {
                const 
                    matcher = match(path.join(mount, route).replaceAll("\\", "\/").replace(/\/+/g, "\/")),
                    name = oRoute.name;
                if(!name){
                    throw new Error("Each web socket channel must have a name parameter");
                }
                const nMap = wsClients.responses[name] = new Map();
                channelMatchers.push({
                    matcher, 
                    info: oRoute, 
                    clients: nMap,
                    limiter: new Limiter(memcache, oRoute, {interval: rateLimitInterval})
                });
            })
        })
    } catch (err) {
        log(
            `Error were detected while compiling:`,
            `${err?.message ?? "no err.message provided"}`
        );
        throw err;
    }

    wss.on('connection', function(ws, req, oChannel) {
        logIfDebug("connection event fired.");
        const sessid = req.session.id;
        if (oChannel.clients.has(sessid)) {
            logIfDebug("deduping connections!")
            return ws.terminate();
        }
        const 
            channelName = oChannel.info.name,
            namespace = genHexStr(8, 4, "ns_");
        ws[safeSend] = fSafeSend;
        oChannel.clients.set(
            sessid,
            ws[wsKey] = {
                response: ws,
                ws,
                timeout: req.session.cookie.maxAge
                ? setTimeout(function(){
                    ws[wsKey]?.destroy?.();
                }, req.session.cookie.maxAge)
                : undef,
                createdAt: Date.now(),
                sessid,
                destroy,
                name: channelName,
                namespace,
                nMap: oChannel.clients,
                clients: oChannel.clients
            }
        );
        logIfDebug('connection object added to clients Map', oChannel);
        ws[isAlive] = 1;
        const heartbeat = until(() => {
            logIfDebug("HEARTBEAT!"/*, WebSocket.CLOSED, WebSocket.CLOSING*/);
            if (!ws[isAlive]){
                logIfDebug("BREAKING heartbeat!");
                heartbeat.break();
                ws[wsKey]?.destroy?.();
            }
            ws[isAlive] = 0;
            ws.readyState === wsOPEN && ws.ping();
        }, {interval: 40000});
        /* 
            fire a 'namespace'event where the client grabs it, and uses it
            for the rest of the session. Sending random or wrong namespace
            causes rateLimiting.
        */
        ws[safeSend](encode(`${channelName}\0namespace\0${namespace}\0${JSON.stringify({wsDebug})}`));
        /* 
            message sent from the servers side fits the below form, to be used with subscriber
            ^(?<channel>[\w\-]+),(?<event>[\w\-]*)@?(?<namespace>[\w\-]*),(?<data>.*)$ 
            in BINARY!
        */
        ws.on('pong', () => ws[isAlive] = 1)
        ws.on('message', function(msg){
            if (isPenalized(ws)){return}
            let temp, structMsg;
            if (!(structMsg = validate(msg))){
                ws.pause();
                return penalize(ws, {interval: penaltyInterval, cb: () => {ws.resume()}});
            }
            if (structMsg.namespace !== namespace){
                ws.pause();
                return penalize(ws, {interval: penaltyInterval, cb: () => {ws.resume()}});
            }
            if((temp = oChannel.limiter.trigger(ws)) && !isPenalized(temp)) { //if truthy, temp is a ws object
                temp.pause();
                penalize(temp, {interval: penaltyInterval, cb: ((temp) => () => {temp.resume()})(temp)});
                return temp[rateLimitKey] = setTimeout(((temp) => () => !isPenalized(temp) && temp.resume())(temp), rateLimitInterval)
            }
            wsSubscriber.dispatch(channelName, `${structMsg.evt}`, {sessid, ...structMsg});
        })
        ws.on('close', onClose)
        ws.on('error', onError)
    });

    server.on('upgrade', function(req, socket, head){
        logIfDebug("upgrade event fired.");
        let pathname;
        try {
            pathname = new URL(req.url, `http://${req?.headers?.host ?? process?.env?.HOST ?? 'localhost'}`).pathname;
        } catch (err) {
            socket.write("HTTP/1.1 400 Bad Request\r\n\r\n");
            return socket.destroy();
        }
        session(req, {}, function(){
            if (req.session) {
                logIfDebug("ws session middleware found session object.", req.url, channelMatchers);
                let oChannel = channelMatchers.find(({matcher, channel}) => matcher(pathname)),
                    channel = oChannel?.info?.name;
                if (channel) {
                    return wss.handleUpgrade(req, socket, head, function(ws){
                        logIfDebug("channel matched, about to fire emit connection event.");
                        wss.emit('connection', ws, req, /* oChannel?.info */ oChannel);
                    })
                }
            }
            logIfDebug("no channels could be matched or no session object on the upgrade request!");
            socket.write("HTTP/1.1 400 Bad Request\r\n\r\n");
            socket.destroy();
        })
    })

    /* 
        slighlty different than loadServerSent.js, there namespace refers to channel
        here, namespace refers to the inital unique hexstring the client receives.
        The equivalent of namespace of serverSent is channel in here
    */
    return new Proxy(
        wsClients.responses, 
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
                                throw new Error("Provide channel and sessionid");
                            } 
                            return trgt[args[0]]?.get(args[1]);
                        }
                    case "getAll":
                    case "findAll":
                        return (name) => {
                            name ?? (()=>{throw new Error(
                                `Provide a channel.`
                            )})();
                            return [...trgt[name]?.values() ?? []];
                        }
                    case "has":
                        return (...args) => {
                            if(args.length < 2) {
                                throw new Error("Provide channel and sessionid");
                            }
                            return trgt[args[0]]?.has(args[1]);
                        }
                    case "hasAll":
                        return function(name) {
                            name ?? (()=>{throw new Error(
                                `Provide a channel.`
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
                            wsClients.storage[key] = val;
                            return this;
                        }
                    case "recall":
                        return (key) => {
                            return wsClients.storage[key];
                        }
                    case "send":
                    case "message":
                    case "msg":
                        return function({channel, sessid, event, namespace, payload, stringify = [null, "\t"]}){
                            if ([channel, sessid, event, namespace, payload].includes(undef)) {
                                throw new Error("Channel, sessionid, event, namespace or payload cannot be empty");
                            }
                            this.get(channel, sessid)?.ws[safeSend](wsSend8({channel, event, namespace, payload, stringify}))
                            return this;
                        }
                    case "sendAll":
                    case "messageAll":
                    case "msgAll":
                        return function({channel, event, payload, stringify = [null, "\t"]}){
                            if ([channel, event, payload].includes(undef)) {
                                throw new Error("Channel, sessionid, event, namespace or payload cannot be empty");
                            }
                            this.getAll(channel).forEach(function(o){
                                o?.ws[safeSend](wsSend8({channel, event, namespace: o.namespace, payload, stringify}));
                            });
                            return this;
                        }
                    case "size":
                        return function(name){
                            name ?? (()=>{throw new Error(
                                `Provide a channel.`
                            )})();
                            return trgt[name]?.size ?? 0;
                        }
                    case "subscriber":
                        return function(){
                            return wsSubscriber;
                        }
                    case "logIfDebug":
                        return logIfDebug
                }
            },
        })
    );
}