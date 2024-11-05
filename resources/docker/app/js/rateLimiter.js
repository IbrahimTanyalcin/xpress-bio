const 
    undef = void(0),
    {md5} = require("./md5.js"),
    {until} = require("./helpers.js"),
    {WeakBucket} = require("./weakBucket.js"),
    wk = new WeakMap(),
    wb = new WeakBucket(20);
exports.Limiter = function(cache, oRoute, {interval} = {interval: 5000}) {
    wk.set(this, new Map(oRoute?.limits.map(oLimit => {
        oLimit?.key ?? (()=>{throw new Error(
            `'key' field is missing in ${JSON.stringify(oLimit, null, "\t")}`
        )})();
        const key = oLimit?.global 
                ? oLimit.key 
                : md5(performance.now() + " " + Math.random()) + "_" + oLimit.key,
                timeout = oLimit?.timeout || 60,
                limit = +oLimit.limit || 1,
                message = oLimit?.message ?? "You have exceeded the request limit",
                step = +oLimit?.step || 1,
                trigger = function(){
                    cache.incr(key, step);
                };
        let counter = {value: 0, limit, message, trigger};
        until(function(){
            cache.get(key).then(val => {
                if (val === undef) {cache.set(key, 0, timeout)}
                counter.value = val ?? 0
            })
        },{interval});
        return [key, counter];
    })))
}

const proto = exports.Limiter.prototype;
proto.trigger = function(ws) {
    wb.push(ws);
    const _map = wk.get(this);
    for (let counter of _map.values()) {
        if (counter.value > counter.limit) {
            return wb.stat()?.at(0)?.at(0);
        }
        counter.trigger();
    }
}