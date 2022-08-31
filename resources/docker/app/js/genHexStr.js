module.exports = (function(){
    const ceil = Math.ceil,
          log = Math.log,
          min = Math.min,
          rand = Math.random,
          log10b16 = log(10) / log(16),
          maxPow10 = Math.log(Number.MAX_SAFE_INTEGER) / Math.log(10) | 0;
    return function genHexStr(complexity = 6, reps =2, prefix = "", postfix = ""){
        let padding = "0".repeat(ceil(complexity * log10b16)),
            ceiling = 10 ** min(maxPow10, complexity);
        return prefix 
        + Array.from({length: reps}, d => (
            padding 
            + (+(rand() * ceiling).toFixed(0)).toString(16)
        ).slice(-padding.length)).join("").replace(/^0/,"f")
        + postfix
    }
})();