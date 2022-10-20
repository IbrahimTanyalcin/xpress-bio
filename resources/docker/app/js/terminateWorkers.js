const portKey = Symbol.for("customPort"),
      {log} = require("./helpers.js");

module.exports = function(workers){
    for (let worker of workers) {
        log(
            "Terminating worker thread and closing port",
            `{threadId: ${worker.threadId}}`
        );
        worker[portKey]?.close?.(); //avoiding async ops within exit handler
        worker.terminate().then((signal) => log(`Worker termination ${signal}`)); //then might not execute
    }
}