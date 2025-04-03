//Seems like modules are cached by default
//https://nodejs.org/dist/latest-v16.x/docs/api/modules.html#caching
//so no need to return early if obj is found in require.main
//https://nodejs.org/dist/latest-v16.x/docs/api/modules.html#the-module-wrapper
const 
	encode = TextEncoder.prototype.encode.bind(new TextEncoder),
	_TA = new Set([
        Object.getPrototypeOf(Uint8Array.prototype).constructor, //TypedArray
        Object.getPrototypeOf(Uint8ClampedArray.prototype).constructor, //TypedArray
        Uint8Array.prototype.constructor, //Uint8Array
        Uint8ClampedArray.prototype.constructor, //Uint8ClampedArray
        Object.getPrototypeOf(Uint16Array.prototype).constructor, //TypedArray
        Uint16Array.prototype.constructor, //Uint16Array
        Object.getPrototypeOf(Uint32Array.prototype).constructor, //TypedArray
        Uint32Array.prototype.constructor, //Uint32Array
        /* Object.getPrototypeOf(Buffer).constructor -> Gives Function*/
        Buffer.prototype.constructor
    ].filter(Boolean)),
	_TA8 = new Set([
		Object.getPrototypeOf(Uint8Array.prototype).constructor,
		Object.getPrototypeOf(Uint8ClampedArray.prototype).constructor,
		Uint8Array.prototype.constructor,
		Uint8ClampedArray.prototype.constructor,
		Buffer.prototype.constructor
	]),
	isTA = (iter) => {
		if(_TA.has(iter?.constructor)){return true}
		return false;
	},
	isTA8 = (iter) => {
		if(_TA8.has(iter?.constructor)){return true}
		return false;
	};
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
		isTA: {
			enumerable: true,
			configurable: true,
			writable: true,
			value: isTA
		},
		isTA8: {
			enumerable: true,
			configurable: true,
			writable: true,
			value: isTA8
		},
		encode: {
			enumerable: true,
			configurable: true,
			writable: true,
			value: encode
		},
		/* 
			not checking if isTA8 or isTA, as these 4 functions below can be
			run many times at runtime and throw. Checking things will slow it
		*/
		uint16to8LE: {
			enumerable: true,
			configurable: true,
			writable: true,
			value: (ta16) => {
				const 
					len = ta16.length,
					buff = Buffer.allocUnsafe(len * 2);
				for (let i =0; i < len; ++i){
					buff.writeUInt16LE(ta16[i], i * 2);
				}
				return buff;
			}
		},
		uint32to8LE: {
			enumerable: true,
			configurable: true,
			writable: true,
			value: (ta32) => {
				const 
					len = ta32.length,
					buff = Buffer.allocUnsafe(len * 4);
				for (let i =0; i < len; ++i){
					buff.writeUInt32LE(ta32[i], i * 4);
				}
				return buff;
			}
		},
		uint8LEto16: {
			enumerable: true,
			configurable: true,
			writable: true,
			value: (ta8) => {
				const 
					len = ta8.length,
					uint16 = new Uint16Array(Math.ceil(len / 2));
				for (let i =0, j = 0; i < len; i += 2, ++j){
					uint16[j] = ta8[i+1] << 8 | ta8[i]
				}
				return uint16
			}
		},
		uint8LEto32: {
			enumerable: true,
			configurable: true,
			writable: true,
			value: (ta8) => {
				const 
					len = ta8.length,
					uint32 = new Uint32Array(Math.ceil(len / 4));
				for (let i =0, j = 0; i < len; i += 4, ++j){
					uint32[j] = ta8[i+3] << 24 | ta8[i+2] << 16 | ta8[i+1] << 8 | ta8[i]
				}
				return uint32
			}
		},
		/* 
			if you wanna send Uint16 or Uint32 see above 2 functions
		*/
		wsSend8 : {
			enumerable: true,
			configurable: true,
			writable: true,
			value: ({channel, event, namespace, payload, stringify = [null, "\t"]}) => {
				if (
					typeof channel !== "string"
					|| typeof event !== "string"
					|| typeof namespace !== "string"
				){
					throw new Error("channel, event and namespace must be strings");
				}
				if (!isTA8(payload)) {
					switch (typeof payload) {
						case "string":
						case "number":
							payload = Buffer.from(encode(payload))
							break;
						case "object":
							if (isTA(payload)) {
								throw new Error("Typed arrays other than Buffer and Uint8 are not supported");
							}
							payload = Buffer.from(encode(JSON.stringify(payload, ...stringify)))
							break;
						default:
							throw new Error("There was a problem with parsing the payload");
					}
				}
				if (!(payload instanceof Buffer)) {
					payload = Buffer.from(payload)
				}
				let header = Buffer.from(encode(`${channel}\0${event}\0${namespace}\0`)),
					hlen = header.length,
					buff = Buffer.allocUnsafe(header.length + payload.length, 0, "binary");
				header.copy(buff, 0);
				payload.copy(buff, hlen)
				return buff
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
		throttle_v2: {
			enumerable: true,
			configurable: true,
			writable: true,
			value: function(f, {thisArg = void(0), delay=100, defer=true} = {}){
				const 
					that = this,
					settle = (args) => {
						resolver?.(f.apply(thisArg, args));
						resolver = prom = null;
						tmstmp = performance.now();
					};
				let timeout,
					prom,
					resolver,
					tmstmp = performance.now();
				return /*this.lastOp = */function(...args) {
					clearTimeout(timeout);
					thisArg = thisArg ?? that;
					let elapsed = performance.now() - tmstmp;
					if (resolver) {
						if (defer || (!defer && elapsed < delay)) {
							timeout = setTimeout(() => {
								settle(args);
							}, delay);
						} else {
							settle(args);
						}
						return prom;
					}
					return prom = new Promise(res => {
						resolver = res;
						timeout = setTimeout(() => {
							settle(args);
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
