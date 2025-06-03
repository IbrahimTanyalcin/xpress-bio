const {randomUUID} = require('node:crypto');
module.exports = function({express, app, info, files, serverSent, ws}){
    app.post('/uuid', function (req, res, next) {
        if (!req?.session?.id) {
            return res.status(401).end("Cannot send unique id without session token");
        }
        const
            sessid =  req.session.id,
            uuid = randomUUID();
        res.setHeader('Set-Cookie', `xb_uuid=${uuid}; Path=/; Max-Age=5184000; HttpOnly; SameSite=Strict`).status(200).end();
        const oWS = ws.get("channel1", sessid);
        if (oWS) {
            oWS.xb_uuid = uuid;
            ws.msg({
                channel: "channel1",
                sessid,
                event: "server-g-nome-uuid",
                namespace: oWS.namespace,
                payload: "empty"
            })
        }
    });
}