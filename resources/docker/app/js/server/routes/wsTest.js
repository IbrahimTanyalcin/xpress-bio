const {Worker} = require("node:worker_threads"),
      {until, log} = require("../../helpers.js"),
      path = require('path'),
      portKey = Symbol.for("customPort"),
      nameKey = Symbol.for("customName");

module.exports = async function({express, app, info, files, serverSent, ws}){
    //console.log("running!");
    //console.log("ws subscriber is", ws.subscriber);
    const subscription = ws.subscriber().subscribe("channel1");
    subscription.on("some-event", function(data){
        ws.logIfDebug("wsTest some-event event data received", data);

        /**
         * when client send below
         * 
         * const payload = new TextEncoder().encode(`channel2\0some-event\0ns_271af8519991260f31ab30c696dd\0some bigger payload with spaces!!!`)
         * ws.send(payload)
         * 
         * the data above will be something like
         * 
         *  data received {
                sessid: 'DCHb9fB3KOceKFxGjbEUDL6-IAP-X1Qm',
                channel: 'channel1',
                evt: 'some-event',
                namespace: 'ns_271af8519991260f31ab30c696dd',
                payload: <Buffer 73 6f 6d 65 20 62 69 67 67 65 72 20 70 61 79 6c 6f 61 64 20 77 69 74 68 20 73 70 61 63 65 73 21 21 21>
            }

            channel can change above and is not checked, no need because of path.
         * 
         */

        ws.msg({
            channel: "channel1", 
            sessid:data.sessid,
            event: data.evt,
            namespace: data.namespace,
            payload: {value: "some-value", anotherKey: "another key!!!", "cryptic_key": "è and é"}
        });
    })
}