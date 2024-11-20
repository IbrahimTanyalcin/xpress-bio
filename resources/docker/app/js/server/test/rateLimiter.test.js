const 
    {setTimeout:awaitableTimeout} = require("node:timers/promises"),
    timeout = 10000,
    mockInfo = {
        serverConf: {
            "memcached": {
                "conf": {
                    "logEvents": true,
                    "poolSize": 50
                }
            },
            "web-socket": {
                "conf": {
                    "logEvents": true
                },
                "mounts": {
                    "/ws": {
                        "routes": {
                            "/ch1{/*any}": {
                                //oRoute
                                "isRegExp": false,
                                "name": "channel1",
                                "limits": [
                                    {
                                        "key": "wsLimit",
                                        "global": false,
                                        "timeout": 30,
                                        "limit": "30",
                                        "message": "You exceeded the websocket requests",
                                        "step": 1
                                    }
                                ]
                            }
                        }
                    }
                }
            }
        }
    },
    oRoute = mockInfo.serverConf["web-socket"].mounts["/ws"].routes["/ch1{/*any}"],
    {Limiter} = require("../../rateLimiter.js"),
    cache = require("../../cache.js").Cache(mockInfo),
    limiters = new Set();

describe(`testing websocket rateLimiter`, () => {

    beforeAll(async () => {
		void(0);
	});

    afterEach(async () => {
        void(0);
    });

    afterAll(async () => {
        //wait for limiters untillables to terminate
        await Promise.all([...limiters.values()].map(limiter => limiter.terminate()))
        cache.end();
        //wait for remaining memcache operations if any
        await awaitableTimeout(1000, void(0));
    }, timeout)

    test("general use, are synchronous memcached calls eventually adding up?", async () => {
        expect.assertions(1);
        const
            interval =  1000,
            checkDelay = 250,
            wait = interval + checkDelay,
            limiter = new Limiter(cache, oRoute, {interval});
        limiters.add(limiter);
        const o1 = {};
        await awaitableTimeout(wait);
        for(let i = 0; i < 1000; ++i){
            limiter.trigger(o1)
        }
        await awaitableTimeout(wait);
        expect(limiter.trigger(o1)).toBe(o1);
    }, timeout);

    test("does a higher limit work?", async () => {
        expect.assertions(1);
        const
            interval =  1000,
            checkDelay = 250,
            wait = interval + checkDelay,
            oRouteClone = structuredClone(oRoute);
        oRouteClone.limits[0].limit = 2000;
        const limiter = new Limiter(cache, oRouteClone, {interval});
        limiters.add(limiter);
        const o1 = {};
        await awaitableTimeout(wait);
        for(let i = 0; i < 1000; ++i){
            limiter.trigger(o1)
        }
        await awaitableTimeout(wait);
        expect(limiter.trigger(o1)).toBe(void(0));
    }, timeout)

    //test step, timeout, global, passing a non object should throw

})
