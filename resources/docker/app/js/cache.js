//Seems like modules are cached by default
//https://nodejs.org/dist/latest-v16.x/docs/api/modules.html#caching
//so no need to return early if obj is found in require.main
//https://nodejs.org/dist/latest-v16.x/docs/api/modules.html#the-module-wrapper
const {log} = require("./helpers.js");
exports.Cache = function (info){
	const 
		serverConf = info?.serverConf,
		memcachedConf = serverConf?.memcached?.conf,
		memcached = new (require("memcached"))("127.0.0.1:11211",{
			maxKeySize: memcachedConf?.maxKeySize ?? 500,
			maxExpiration: memcachedConf?.maxExpiration ?? 86400, //a day
			maxValue: memcachedConf?.maxValue ?? 1024,
			poolSize: memcachedConf?.poolSize ?? 10,
			timeout: memcachedConf?.timeout ?? 5000,
			retries: memcachedConf?.retries ?? 2,
			failures: memcachedConf?.failures ?? 2,
			retry: memcachedConf?.retry ?? 5000,
			idle: memcachedConf?.idle ?? 3000,
		});
		
	const 
		eventList = ["issue","failure","reconnecting","reconnect","remove"],
		traps = {
			get (key) {
				const memcached = this;
				return new Promise(function(res, rej){
					memcached.get(key, function(err, data) {
						err ? rej(err) : res(data);
					});
				});
			},
			set (key, val, lifetime) {
				const memcached = this;
				return new Promise(function(res, rej){
					memcached.set(key, val, lifetime || 60, function(err) {
						err ? rej(err) : res(true);
					});
				});
			},
			append (key, val) {
				const memcached = this;
				return new Promise(function(res, rej){
					memcached.append(key, val, function(err) {
						err ? rej(err) : res(true);
					});
				});
			},
			prepend (key, val) {
				const memcached = this;
				return new Promise(function(res, rej){
					memcached.prepend(key, val, function(err) {
						err ? rej(err) : res(true);
					});
				});
			},
			incr (key, val) {
				const memcached = this;
				return new Promise(function(res, rej){
					memcached.incr(key, val, function(err) {
						err ? rej(err) : res(true);
					});
				});
			},
			decr (key, val) {
				const memcached = this;
				return new Promise(function(res, rej){
					memcached.incr(key, val, function(err) {
						err ? rej(err) : res(true);
					});
				});
			},
			del (key) {
				const memcached = this;
				return new Promise(function(res, rej){
					memcached.del(key, function(err) {
						err ? rej(err) : res(true);
					});
				});
			},
			rm (key) {
				const memcached = this;
				return traps.del.call(memcached, ...arguments);
			}
		};
		if(memcachedConf?.logEvents){
			eventList.forEach((d,i) => {
				memcached.on(d, function(dets) {
					log(
						`${new Date().toUTCString()} PID: ${process.pid} PARENT: ${process.ppid}`,
						"Memcached Event: " + d + "; Details:",
						JSON.stringify(dets, null, "\t")
					);
				})
			})
		};
	return new Proxy(memcached, {
		get (target, prop, receiver) {
			/* if(prop === "end"){
				log("end is detected!");
				target.end();
				return;
			} */
			/* 
			TODO: create MAP with keys as prop and values as the bound function
			in the outer scope to reduce the amount new functions created. 
			*/
			return traps?.[prop]?.bind(memcached) 
				?? target?.[prop]?.bind(memcached);
		}
	});
}
		
