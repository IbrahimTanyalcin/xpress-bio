(async function(){
    const 
        util = require("util"),
        ARGV = process.argv.slice(2),
        {getInfo} = require("../js/getInfo.js"),
        {log} = require("../js/helpers.js"),
        info = await getInfo(process.env, ARGV),
        cache = require("../js/cache.js").Cache(info);
    log(util.types.isProxy(cache)); //check whether the obj is Proxy
    log(JSON.stringify(info,null,"\t"));
    /* cache.set("abc", 10, 1000).then((data) => {log("data is: ", data)}).catch(err => log(err));
    cache.get("abc").then((data) => log("retreived: ", data)).catch(err => log(err)); */

    cache.set("abcdefgh", 16, 1000).then((data) => {log("data is: ", data)})
    .then(function(){
        return cache
            .get("abcdefgh")
            .then((data) => log("retreived: ", data));
    })
    .then(function(){
        cache.end();
    })
    .catch(err => log(err));
})();