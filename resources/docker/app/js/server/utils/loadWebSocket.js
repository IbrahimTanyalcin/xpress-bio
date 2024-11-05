const 
    path = require('path'),
    WebSocket = require('ws'),
    isAlive = Symbol("isAlive"),
    { match } = require('path-to-regexp'),
    genHexStr = require("../../genHexStr"),
    {Limiter} = require("../../rateLimiter.js"),
    {log, until, clamp} = require("../../helpers.js"),
    {penalize, unpenalize, isPenalized} = require("../../penalizer.js"),
    rateLimitKey = Symbol.for("xpressbio.ratelimit");
    
module.exports = async function ({server, express, app, info, files, session, serverSent, memcache}) {
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
        rateLimitInterval = 5000,
        wss = new WebSocket.WebSocketServer({noServer: true}),
        offStates = [WebSocket.CLOSED, WebSocket.CLOSING],
        wsClients = {
            responses: {}, //channelName: Map(sessid => ws[wsKey] = {ws:ws, })
            storage: {}
        },
        wsKey = genHexStr(8, 3, "ws_"),
        destroy = function(){
            clearTimeout(this?.timeout);
            clearTimeout(this?.ws?.[rateLimitKey]);
            unpenalize(this?.ws);
            this?.ws?.terminate?.();
            return this?.clients?.delete(this?.sessid);
        },
        onClose = function(){
            //console.log("Connection is closing", this[wsKey].sessid);
            this[wsKey].nMap.get(this[wsKey].sessid)?.destroy?.();
        },
        onError = function(err){
            //console.log("Connection errorred", this[wsKey].sessid)
            this[wsKey].nMap.get(this[wsKey].sessid)?.destroy?.();
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
        console.log("TEST CONNECTION");
        const sessid = req.session.id;
        if (oChannel.clients.has(sessid)) {
            console.log("deduping connections!")
            return ws.terminate();
        }
        const channelName = oChannel.info.name;
        oChannel.clients.set(
            sessid,
            ws[wsKey] = {
                response: ws,
                ws,
                timeout: req.session.cookie.maxAge
                ? setTimeout(function(){
                    oChannel.clients.delete(sessid);
                    ws.terminate();
                }, req.session.cookie.maxAge)
                : undef,
                createdAt: Date.now(),
                sessid,
                destroy,
                name: channelName,
                nMap: oChannel.clients,
                clients: oChannel.clients
            }
        );
        console.log('connection', oChannel);
        ws[isAlive] = 1;
        const heartbeat = until(() => {
            console.log("HEARTBEAT!", WebSocket.CLOSED, WebSocket.CLOSING);
            if (!ws[isAlive] /* || offStates.includes(ws.readyState) */){
                console.log("BREAKING!");
                heartbeat.break();
                ws.terminate();
            }
            ws[isAlive] = 0;
            ws.ping();
        }, {interval: 40000});
        ws.send("Here some message from the server");
        /* 
            message sent from the servers side fits the below form, to be used with subscriber
            ^(?<channel>[\w\-]+),(?<event>[\w\-]*)@?(?<namespace>[\w\-]*),(?<data>.*)$ 
            in BINARY!
        */
        ws.on('pong', () => ws[isAlive] = 1)
        ws.on('message', function(msg){
            let temp, structMsg;
            /* parse/validate the message here */
            /* if validation fails RETURN AND penalize here */
            /* validation should return {event, namespace, payload}, channel is known from channelName
            if (temp = validate(msg)){
                structMsg = {...temp, channel: channelName}
            }
            */
            if(temp = oChannel.limiter.trigger(ws)) {
                ws.pause();
                penalize(ws, {interval: penaltyInterval, cb: () => {ws.resume()}});
                return ws[rateLimitKey] = setTimeout(() => !isPenalized(ws) && ws.resume(), rateLimitInterval)
            }
            console.log('msg=>', msg, msg.toString());
            /* validation passed, do
            subscriber.dispatch(channelName, `${structMsg.event}@${structMsg.namespace}`, structMsg)
            */
        })
        ws.on('close', /* function(){
            console.log('close');
        } */ onClose)
        ws.on('error', /* function(){
            console.log('error');
        } */onError)
    });

    server.on('upgrade', function(req, socket, head){
        console.log("test here");
        let pathname;
        try {
            pathname = new URL(req.url, `http://${req?.headers?.host ?? process?.env?.HOST ?? 'localhost'}`).pathname;
        } catch (err) {
            socket.write("HTTP/1.1 400 Bad Request\r\n\r\n");
            socket.destroy();
            return;
        }
        session(req, {}, function(){
            if (req.session) {
                console.log("test here-2", req.url, channelMatchers);
                let oChannel = channelMatchers.find(({matcher, channel}) => matcher(pathname)),
                    channel = oChannel?.info?.name;
                if(!channel){
                    console.log("no matchers!!!");
                    socket.write("HTTP/1.1 400 Bad Request\r\n\r\n");
                    socket.destroy();
                }
                wss.handleUpgrade(req, socket, head, function(ws){
                    console.log("test here-4");
                    wss.emit('connection', ws, req, /* oChannel?.info */ oChannel);
                })
            } else {
                console.log("test here-3");
                socket.write("HTTP/1.1 400 Bad Request\r\n\r\n");
                socket.destroy();
            }
        })
    })
}