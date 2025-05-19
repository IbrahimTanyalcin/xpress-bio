const {Worker} = require("node:worker_threads"),
      {until, log, throttle_v2: throttle} = require("../../helpers.js"),
      path = require('path'),
      portKey = Symbol.for("customPort"),
      nameKey = Symbol.for("customName");

module.exports = async function({express, app, info, files, serverSent, ws}){
    //console.log("running!");
    //console.log("ws subscriber is", ws.subscriber);
    const subscription = ws.subscriber().subscribe("channel1");
    subscription.on("user-chat-ready", function(data){
        ws.logIfDebug("user-chat-ready received", data);
        ws.msg({
            channel: "channel1", 
            sessid:data.sessid,
            event: "server-chat-ready-response",
            namespace: data.namespace,
            payload: `
                <div>
                    <h3>Disclaimer</h3>
                    <hr>
                    This is an <b>anonymous</b> chat environment for sharing ideas, workflows and collaborate on app state. 
                    If your <code>xpress-bio</code> instance is <b>public</b>, do <b>NOT</b> share sensitive data.
                </div>
            `
        });
    });
    subscription.on("user-chat", function(data){
        ws.logIfDebug("wsChatBox user-chat event data received", data);

        // example sending message to single client
        /* ws.msg({
            channel: "channel1", 
            sessid:data.sessid,
            event: data.evt,
            namespace: data.namespace,
            payload: {value: "some-value", anotherKey: "another key!!!", "cryptic_key": "è and é"}
        });*/

        // example sending message to everyone
       /* ws.msgAll({
            channel: "channel1",
            event: "user-chat-all",
            payload: data.payload
        }) */

        const allClients = ws.getAll("channel1");
        ws.logIfDebug(`current number of clients: ${allClients.length}`);
        //ws.getAll("channel1")
        allClients
        .filter(oWS => oWS.sessid !== data.sessid)
        .forEach(oWS => {
            ws.logIfDebug("sending user chat to:", oWS.sessid);
            ws.msg({
                channel: "channel1", 
                sessid:oWS.sessid,
                event: "user-chat-all",
                namespace: oWS.namespace,
                payload: data.payload
            })
        })
    })

    subscription.on("user-chat-typing", throttle(function(data){
        ws.logIfDebug("some user is typing...");
        ws.getAll("channel1")
        .filter(oWS => oWS.sessid !== data.sessid)
        .forEach(oWS => {
            ws.msg({
                channel: "channel1", 
                sessid:oWS.sessid,
                event: "user-chat-typing",
                namespace: oWS.namespace,
                payload: "empty"
            })
        })
    }, {delay: 500, defer: false}))
}