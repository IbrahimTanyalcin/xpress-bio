//Seems like modules are cached by default
//https://nodejs.org/dist/latest-v16.x/docs/api/modules.html#caching
//so no need to return early if obj is found in require.main
//https://nodejs.org/dist/latest-v16.x/docs/api/modules.html#the-module-wrapper
Object.defineProperties(
	exports,
	{
		select: {
			enumerable: true,
			configurable: true,
			writable: true,
			value: function(process){
				return {
					on: function(evt, handler){
						process.on(evt, handler);
						return this;
					}
				}
			}
		},
		signalReceiver: {
			enumerable: true,
			configurable: true,
			writable: true,
			value:(signal) => {
				console.log(`Received ${signal}`);
				if (signal === "SIGINT") {
					process.exit(1);
				}
			}
		},
		catcher: {
			enumerable: true,
			configurable: true,
			writable: true,
			value: err => {
				console.log("Execution failed.");
				console.log(err); // do not just log the message, stringified err has row/col values
				//process.exitCode = 1; - this will not terminate gracefully coz of bash's tail anyway
				process.exit(1);
			}
		},
		log: {
			enumerable: true,
			configurable: true,
			writable: true,
			value: (...args) => {
				args.unshift("\u02C5".repeat(80)); //down caret
				args.push("\u02C4".repeat(80)); //up caret
				console.log("\n");
				args.forEach(d => d
					.toString()
					.split(/\n|\r\n/gi)
					.forEach(dd => console.log("> " + dd))
				);
				console.log("\n");
			}
		},
		atob: {
			enumerable: true,
			configurable: true,
			writable: true,
			value:(base64) => {
				return Buffer.from(base64, "base64").toString();
			}
		},
		btoa: {
			enumerable: true,
			configurable: true,
			writable: true,
			value:(str) => {
				return Buffer.from(str).toString("base64");
			}
		},
		serverSend: {
			enumerable: true,
			configurable: true,
			writable: true,
			value: ({directive = "data", payload, stringify = [null, "\t"]}) => {
				switch (
						((payload instanceof Object) << 1) 
						+ ((directive === "data") << 0)
				) {
					case 3:
						return JSON.stringify(payload, ...stringify)
							.trimEnd().split("\n").map(d => "data: " + d).join("\n") + "\n\n";
					case 2:
						return directive + ": " + JSON.stringify(payload, ...stringify)
							.trimEnd().replace(/\s+/g," ") + "\n";
					case 1:
						return String(payload)
							.trimEnd().split("\n").map(d => "data: " + d).join("\n") + "\n\n";
					case 0: 
						return directive + ": " + String(payload).trimEnd().replace(/\s+/g," ") + "\n";
					default:
						throw new Error("There was a problem with parsing the payload");
				}
			}
		},
		sanitizeFilename: {
			enumerable: true,
			configurable: true,
			writable: true,
			value: (() => {
				const illegalChars = /[\x00-\x1f\\/<>:"`|?*%]/gi;
				return fileName => fileName.replace(illegalChars,"");
			})()
		},
		nTimes: {
			enumerable: true,
			configurable: true,
			writable: true,
			value:(f, {times = 1, thisArg = "", args = []} = {}) => {
				times = Math.max(0, times);
				let counter = 0;
				return function (...aargs) {
					let that = thisArg ?? this;
					if(counter++ < times) {
						f.apply(that, [...args,...aargs]);
					}
				}
			}
		},
		once: {
			enumerable: true,
			configurable: true,
			writable: true,
			value:(f, {thisArg = "", args = []} = {}) => {
				let counter = 0;
				return function (...aargs) {
					let that = thisArg ?? this;
					if(!counter++) {
						f.apply(that, [...args,...aargs]);
					}
				}
			}
		},
		until: {
			enumerable: true,
			configurable: true,
			writable: true,
			value:(() => {
				async function* until (f, interval, breaker){
					let cond = false;
					while(!breaker.value && !cond){
						yield cond = await nPromise(f, interval);
					}
				}
				function nPromise(f, interval) {
					return new Promise(res => {
						setTimeout(()=> res(f()), interval)
					})
				}
				return (f, {thisArg = "", args = [], interval = 0} = {}) => {
					const that = thisArg ?? this,
						  breaker = {value: false},
						  _f = function(){
							return f.call(that, ...args);
						  },
						  _until = (async () => {
							let lastVal;
							for await (lastVal of until(_f, interval, breaker)){}
							return lastVal;
						  })();
					_until.break = function(){
						breaker.value = true;
					};
					return _until;
				}
			})()
		},
		until_v2: {
			enumerable: true,
			configurable: true,
			writable: true,
			value: ((_tmo, _res) => {
				async function* until (f, interval, breaker, pauser, resolver){
					let cond = false;
					while(!breaker.value && !cond){
						yield cond = await nPromise(f, interval, pauser, resolver);
					}
				}
				function nPromise(f, interval, pauser, resolver) {
					return new Promise(res => {
						f[_res] = res;
						f[_tmo] = setTimeout(() => {
							if(!pauser.value){return res(f())}
							resolver.value = () => res(f());
						}, interval)
					})
				}
				return function (f, {thisArg = "", args = [], interval = 0} = {}) {
					const that = thisArg ?? this,
						  breaker = {value: false},
						  pauser = {value: false},
						  resolver = {value: void(0)},
						  _f = function(){
							return f.call(that, ...args);
						  },
						  _until = (async () => {
							let lastVal;
							for await (lastVal of until(_f, interval, breaker, pauser, resolver)){}
							return lastVal;
						  })();
					_until.break = (executeCurrent, lastVal) => {
						breaker.value = true;
						if (!executeCurrent) {
							clearTimeout(_f[_tmo]);
							_f[_res]?.(lastVal);
						}
					};
					_until.pause = () => {pauser.value = true};
					_until.resume = () => {pauser.value = false; resolver?.value?.()};
					return _until;
				}
			})(Symbol(), Symbol())
		},
		rmIndent: {
			enumerable: true,
			configurable: true,
			writable: true,
			value: function rmIndent(strs,...exps){
				return strs.map(function(str,i){return str.replace(this,"")}, /^\s+/gim).reduce((ac,d,i) => ac += d + (exps[i] ?? ''),"")
			}
		},
		oMerge: {
			enumerable: true,
			configurable: true,
			writable: true,
			value: function (target, ...sources) {
				return sources.reduce((ac,d) => merge2(ac,d), target);
				function merge2(a,b){
					const m = JSON.parse(JSON.stringify(a));
					if (typeof (b ?? 0) !== "object"){return m};
					(new Set(Object.keys(m).concat(Object.keys(b)))).forEach(k => {
						if (m[k] instanceof Object && b[k] instanceof Object) {
						   m[k] = merge2(m[k], b[k]);
						} else {
						   m[k] = b[k] ?? m[k] 
						}
					})
					return m;
				}
			}
		},
		throttle: {
			enumerable: true,
			configurable: true,
			writable: true,
			value: function(f, {thisArg = void(0), delay=100} = {}){
				const that = this;
				let timeout,
					prom,
					resolver;
				return function(...args) {
					clearTimeout(timeout);
					thisArg = thisArg ?? that;
					if (resolver) {
						timeout = setTimeout(() => {
							resolver?.(f.apply(thisArg, args));
							resolver = prom = null;
						}, delay);
						return prom;
					}
					return prom = new Promise(res => {
						resolver = res;
						timeout = setTimeout(() => {
							res(f.apply(thisArg, args));
							resolver = prom = null;
						}, delay);
					})
				}
			}
		},
		/**
		 * Clamps a number between 2 values
		 * @param {*} value The value to be clamped
		 * @param {*=} [min] The min value. If it is an object, it is destructured to extract fields. If cannot be coerced to number, it is Number.MIN_SAFE_INTEGER.
		 * @param {*=} [max] The max value. If cannot be coerced to number, it is Number.MAX_SAFE_INTEGER
		 * @param {*=} [def] The default value. If cannot be converted to number, it will be assigned the value of min.
		 * @returns {Number} The clamped number
		 * @example clamp("hmm", -100,20,3) //3
		 */
		clamp: {
			enumerable: true,
			configurable: true,
			writable: true,
			value: function (value, min = Number.MIN_SAFE_INTEGER, max = Number.MAX_SAFE_INTEGER, def){
				if (typeof min === "object") {({min, max, def} = min);}
				if ((min = +min) !== min){min = Number.MIN_SAFE_INTEGER}
				if ((max = +max) !== max){max = Number.MAX_SAFE_INTEGER}
				if (max < min){ max ^= min; min ^= max; max ^= min;}  
				if ((def = +def) !== def){def = min}
				if ((value = +value) !== value){value = def}
				return Math.max(min, Math.min(value, max))
			}
		},
		/**
		 * Tries the given keys in an object, returns as soon as one of them passes
		 * @param {object} obj The object to be tried against
		 * @param {string|string[]} keys An array of string keys to be tried on the object
		 * @param {object=} [options] An options object
		 * @param {*} [options.default] default value to be returned if all keys fail
		 * @param {*} [options.defaultKey] default key to be returned if all keys fail
		 * @param {Boolean} [options.returnKey] return key instead of value (object[key]) if this option is truthy
		 * @param {Function} [options.transform] a transform function to be applied on the object[key]. Default is not null and not undefined.
		 * @returns {*} The tried object[key] or the key itself if the test passes, otherwise default value or key
		 * @example tryKey({a:1, b:2, c:3}, "hmm", "a", "b", {transform: (x) => x === 2, returnKey: true}) //"b"
		 */
		tryKeys: {
			enumerable: true,
			configurable: true,
			writable: true,
			value: function (o,...args) {
				args = args.flat(Infinity);
				let len = args.length,
					opts = {},
					defVal = void(0),
					defKey = void(0),
					transform = (x) => x !== null && x !== void(0);
				if (typeof args[len - 1] === "object") {
					opts = args[len - 1] ?? {};
					args = args.slice(0, --len);
					if (typeof opts?.transform === "function"){
						transform = opts.transform
					}
					defVal = opts?.default ?? defVal
					defKey = opts?.defaultKey ?? defKey
				}
				if (!args.length) {return opts?.returnKey ? defKey : defVal}
				let tempVal, tempKey;
				for (let i =0; i < len; ++i){
					if (transform((tempVal = o?.[tempKey = args[i]]), tempKey, i, o)) {
						if (opts?.returnKey) {return tempKey}
						return tempVal
					}
				}
				return opts?.returnKey ? defKey : defVal;
			}
		}
	}
);
