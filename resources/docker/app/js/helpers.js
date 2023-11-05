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
		}
	}
);
