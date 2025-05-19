const 
    undef = void(0),
    {until_v2:until} = require("./helpers.js"),
    wk = new WeakMap(),
    accumulConst = 4;

function trigger(cb, interval) {
    this.value *= 2;
    this.timeout = setTimeout(() => {
        this.timeout = undef;
        cb?.();
    }, this.value * interval);
    this.accumulTimeout?.break();
    this.accumulTimeout = until(() => {
        /* console.log("running!", this.timeout, this.value); */
        if (this.value <= 0.5) {/* console.log("done!"); */ return !(this.accumulTimeout = undef)}
        this.value = Math.max(0.5, this.value / 2 | 0);
    }, {interval: this.interval})
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
/* 
    if returns truthy !!(0.5) it unpenalized, if falsey it wasnt penalized anyway
*/
exports.unpenalize = function(obj) {
    if (!wk.has(obj)){return}
    const counter = wk.get(obj);
    clearTimeout(counter.timeout);
    counter?.accumulTimeout?.break();
    return (counter.timeout = undef, counter.value = 0.5);
}
exports.isPenalized = function(obj){
    if (!wk.has(obj)){return false}
    return wk.get(obj).timeout !== undef;
}

exports.isReset = function(obj){
    if (!wk.has(obj)){return true}
    return wk.get(obj).value === 0.5;
}