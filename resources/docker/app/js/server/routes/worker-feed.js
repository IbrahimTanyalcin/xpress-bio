const {Worker} = require("node:worker_threads"),
      {until} = require("../../helpers.js"),
      path = require('path'),
      portKey = Symbol.for("customPort");
      

module.exports = function({express, app, info, files, serverSent}){
    const worker = new Worker(
        path.resolve(__dirname,"../workers/feed.js"), 
        {
            workerData: {
                isContainer : info.isContainer
            }
        }
    );
    until(() => worker[portKey])
    .then(port => {
        port.on("message", function(message){
            serverSent.msgAll("streamOne",{payload: {size: serverSent.size("streamOne"), ...message}});
        });
    });
}