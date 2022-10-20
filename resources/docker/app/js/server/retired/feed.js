const {capture} = require("../../capture.js");

module.exports = function({express, app, info, files, serverSent}){
    let serverStart;
    function upTime(){
        const cache = require("../../cache.js").Cache(info);
        cache.get("serverStartTime").then(val => {
            if(val) {
                serverStart = val;
            } else {
                return cache.set("serverStartTime", serverStart = Date.now(), 86000);
            }
        }).then(() => {
            cache.end();
            setTimeout(upTime, 85000000);
        }).catch(err => console.log(err));
    }

    upTime();
    
    async function* runForever (){
        while(true){
            yield (await genFeed());
        }
    }

    async function genFeed(){
            return Promise.all([
                capture(
                        'echo "100 - $(top -bn1 | grep -iE \'^%cpu\' | cut -d "," -f 4 | sed -r s/[^0-9.]//g)" | bc', 
                        {logger: false, pipe: false}
                    )
                    .then(val => val.trim()),
                new Promise(r => setTimeout(() => r(Date.now() - serverStart), 3000)), //set the delay as well
                capture(
                        "df -h | grep -Ei '" 
                        + (+info.isContainer ? "overlay" : "dev\/sdd") 
                        + "' | tr -s ' ' | cut -d ' ' -f 3,4",
                        {logger: false, pipe: false}
                    )
                    .then(str => str.split(/\s+/g).filter(d => d)),
                Promise.resolve(serverSent.size("streamOne")),
            ]).then(arr => {

                /* capture(
                    "df -h | sort -h -k 2 | tr -s ' '",
                    {logger: false, pipe: false}
                )
                .then(str => console.log(str)); */


                let cpu, upTime, used, available, size;
                ({0: cpu, 1: upTime, 2: used, 3: available, 4: size} = arr.flat());
                return {cpu, upTime, used, available, size};
            });
    }

   (async () => {
        for await (const payload of runForever()){
            serverSent.msgAll("streamOne",{payload});
            /* .msgAll("streamOne",{directive:"event", payload: "buffer-force-flush"})
            .msgAll("streamOne",{payload: "a".repeat(1024 * 8)}); */
        }
    })();
    //console.log("I can proceed!");
}