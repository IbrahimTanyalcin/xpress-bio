const 
    {md5} = require("../../md5.js"),
    {until} = require("./helpers.js"),
    wk = new WeakMap();
exports.limiter = function(cache, oRoute) {
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
            cache.get(key).then(val => counter.value = val)
        },{interval: timeout});
        return [key, counter];
    })))
}

const proto = exports.limiter.prototype;
proto.trigger = function() {
    const _map = wk.get(this),
          len = _map.size,
          keys = [..._map.keys];
    for (let i = 0, counter; i < len; ++i) {
        counter =  _map.get(keys[i]);
        if (counter.value > counter.limit) {
            return new Error(counter.message)
        }
        _map.get(keys[i]).trigger();
    }
}