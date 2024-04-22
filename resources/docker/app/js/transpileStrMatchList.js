const
    {log} = require("./helpers.js");
/**
 * Gets [an array of] string(s) or object(s) and returns an object to match
 * against another string. If a string is passed it is assumed to be non-regexp
 * strings that starts with '^' use `startsWith` instead of `includes`
 * @param  {string|object|Array<String|Object>} args 
 * @param {string|string[]} args.value if the input is an object or array of object, each object should have a 'value' key
 * @param {boolean=} args.isRegExp 
 * @param {string=} args.RegExpFlags a string of regexp flags that will be used during `new RegExp(..., ...)`
 * @returns {boolean} true or false if any of the value(s) matched.
 * @example 
 * ```javascript
 * var y = transpileStrMatchList(
 *  {
 *      value: [
 *          "^som?eTest[A-Z]{3}$",
 *          "otherTesttt\\\\"
 *      ],
 *      isRegExp: true,
 *      RegExpFlags: "i"
 *  },
 *   "^let's see if this works"
 * )
 * y.match("sasdadotherTesttt\\") \\true
 * ```
 */
exports.transpileStrMatchList = function(...args){
    args = args.flat(Infinity);
    const tests = [];
    args.forEach(function(d,i){
        switch(true) {
            case d instanceof String:
            case typeof d === "string":
                tests.push((() => {
                    return (str) => {
                        const matcher = d;
                        if (matcher.startsWith("^")) {
                            return str.startsWith(matcher.slice(1))
                        }
                        return str.includes(matcher);
                    }
                })())
                break;
            case d instanceof Object:
                if (!d.value){
                    throw new Error(
                        `String match list object should have a 'value' key: ${JSON.stringify(d, null, "\t")}`
                    )
                }
                switch(((d.value instanceof Array) << 1) + (!!d?.isRegExp << 0)) {
                    case 3:
                        tests.push((() => {
                            const regexps = [];
                            d.value.forEach((_value, i) => {
                                regexps.push(
                                    new RegExp(_value, d?.RegExpFlags?.replace("g",function(m){
                                        !i && log(`g flags will be stripped off from ${JSON.stringify(d, null, "\t")}`);
                                        return "";
                                    }))
                                );
                            });
                            return (str) => regexps.some(regexp => regexp.test(str));
                        })())
                        break;
                    case 2:
                        tests.push((() => {
                            const matchers = [...d.value];
                            return (str) => matchers.some(matcher => {
                                if (matcher.startsWith("^")) {
                                    return str.startsWith(matcher.slice(1))
                                }
                                return str.includes(matcher);
                            })
                        })())
                        break;
                    case 1:
                        tests.push((() => {
                            const regexp = new RegExp(d.value, d?.RegExpFlags?.replace("g",function(m){
                                !i && log(`g flags will be stripped off from ${JSON.stringify(d, null, "\t")}`);
                                return "";
                            }));
                            return (str) => regexp.test(str);
                        })())
                        break;
                    case 0:
                        tests.push((() => {
                            return (str) => {
                                const matcher = d.value;
                                if (matcher.startsWith("^")) {
                                    return str.startsWith(matcher.slice(1))
                                }
                                return str.includes(matcher);
                            }
                        })())
                        break;
                    default:
                        throw new Error(
                            `There was a problem parsing ${JSON.stringify(d, null, "\t")}`
                        )
                }
                break;
            default:
                throw new Error(
                    `There was a problem parsing ${JSON.stringify(d, null, "\t")}`
                )
        }
    })
    return new Matcher(tests);
}

function Matcher(tests) {
    wLedger.set(this, tests);
}
const 
    wLedger = new WeakMap(),
    prt = Matcher.prototype;
prt.match = function(str) {
    return wLedger.get(this).some((test) => test(str))
}

