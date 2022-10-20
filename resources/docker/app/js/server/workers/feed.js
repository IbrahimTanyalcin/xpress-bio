const {workerData, parentPort} = require("node:worker_threads"),
      {log, until} = require("../../helpers.js"),
      {capture} = require("../../capture.js");

(new Promise(res => {
    parentPort.once("message", function(message){
        /*
            process.pid of the parent is exactly the same here.
            so process refers to the parent, NOT the worker
        */
        let {port, threadId} = message;
        port.on("close",function(){
            log(
                `Worker port-2 closing`,
                `{threadId: ${threadId}}`
            );
        });
        res(port);
    });
})).then(port => {
    /* ############################
    ######WORKER CODE HERE######
    ############################ */
    let serverStart = Date.now();
    until(function(){
        return Promise.all([
            capture(
                    'echo "100 - $(top -bn1 | grep -iE \'^%cpu\' | cut -d "," -f 4 | sed -r s/[^0-9.]//g)" | bc', 
                    {logger: false, pipe: false}
                )
                .then(val => val.trim()),
            Date.now() - serverStart,
            capture(
                    `df -h | sort -h -k 2 | awk '$6 == "/"' | tail -1 | tr -s ' ' | cut -d ' ' -f 3,4`,
                    {logger: false, pipe: false}
                )
                .then(str => str.split(/\s+/g).filter(d => d))
        ]).then(arr => {
            let cpu, upTime, used, available;
            ({0: cpu, 1: upTime, 2: used, 3: available} = arr.flat());
            port.postMessage({cpu, upTime, used, available});
            return false;
        });
    },{interval: 1000});
});
