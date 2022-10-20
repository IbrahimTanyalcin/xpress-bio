const {MessageChannel} = require("node:worker_threads"),
      portKey = Symbol.for("customPort"),
      {log} = require("./helpers.js");

module.exports = function(info){
    return function(worker){
        let threadId = worker.threadId;
        log(
            `Worker being registered`,
            `{threadId: ${threadId}}`
        );
        const {port1, port2} = new MessageChannel();
        port1
        /* .on("message", function(message){
            console.log("message received", message);
        }) */
        .on("close", function(){
            log(
                `Worker port-1 closing`,
                `{threadId: ${threadId}}`
            );
        });
        worker[portKey] = port1;
        worker.postMessage({port: port2, threadId}, [port2]);
        worker.on("exit", function(){
            info.workers.delete(worker);
            log(
                `Worker exiting`,
                `{threadId: ${threadId}}`
            );
        })
        info.workers.add(worker);
    }
}


