const 
    undef = void(0),
    {until} = require("./helpers.js"),
    /* {md5} = require("../../md5.js"),
    {until} = require("./helpers.js"),
    timeoutKey = Symbol(),
    accumulKey = Symbol(), */
    wk = new WeakMap(),
    accumulConst = 4;

function trigger(cb, interval) {
    this.value *= 2;
    this.timeout = setTimeout(() => {
        this.timeout = undef;
        cb?.();
    }, this.value * interval);
    /* clearTimeout(this.accumulTimeout); */
    /* this.accumulTimeout = setTimeout(() => {
        this.accumulTimeout = undef;
        this.value = Math.max(0.5, this.value / 2 | 0);
    }, this.value * interval * accumulConst) */
    this.accumulTimeout?.break();
    this.accumulTimeout = until((timeout) => {
        console.log("running!", timeout, this.timeout, this.value);
        if (this.timeout && (timeout !== this.timeout)){console.log("not executing!"); return true}
        if (this.value <= 0.5) {console.log("done!"); return !(this.accumulTimeout = undef)}
        this.value = Math.max(0.5, this.value / 2 | 0);
    }, {interval: this.interval, args: [this.timeout]})
}
exports.penalize = function(obj, {interval = 5000, cb, callback} = {interval: 5000}) { 
    let counter;
    if (wk.has(obj)) {
        counter = wk.get(obj);
    } else {
        counter = {
            value: 0.5, 
            accumulTimeout: undef, 
            timeout: undef, 
            trigger: null,
            interval: null
        }
        counter.trigger = trigger.bind(counter);
        counter.interval = {valueOf: () => counter.value * interval * accumulConst}
        wk.set(obj, counter);
    }
    if (!counter.timeout) {
        counter.trigger(cb ?? callback, interval);
    }
    return counter.value;
}
exports.unpenalize = function(obj) {
    if (!wk.has(obj)){return}
    const counter = wk.get(obj);
    clearTimeout(counter.timeout);
    clearTimeout(counter.accumulTimeout);
}