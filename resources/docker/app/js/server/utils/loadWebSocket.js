const 
    path = require('path'),
    WebSocket = require('ws'),
    isAlive = Symbol("isAlive"),
    genHexStr = require("../../genHexStr"),
    {log, until} = require("../../helpers.js"),
    { match } = require('path-to-regexp');

module.exports = async function ({server, express, app, info, files, session, serverSent, memcached}) {
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
        wss = new WebSocket.WebSocketServer({noServer: true}),
        offStates = [WebSocket.CLOSED, WebSocket.CLOSING],
        wsClients = {
            responses: {}, //channelName: Map(sessid => ws[wsKey] = {ws:ws, })
            storage: {}
        },
        wsKey = genHexStr(8, 3, "ws_"),
        destroy = function(){
            clearTimeout(this?.timeout);
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
        Object.entries(info?.serverConf?.["web-socket"]?.mounts ?? {}).forEach(([mount, oMount]) => {
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
                    channel: name, 
                    info: oRoute, 
                    clients: nMap
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
        const sessid = req.session.id;
        if (oChannel.clients.has(sessid)) {
            console.log("deduping connections!")
            return ws.terminate();
        } else {
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
                    name: oChannel.info.name,
                    nMap: oChannel.clients,
                    clients: oChannel.clients
                }
            )
        }
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
            console.log('msg=>', msg, msg.toString());
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
                    channel = oChannel?.channel;
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