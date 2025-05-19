const 
    {setTimeout:awaitableTimeout} = require("node:timers/promises"),
    genHexStr = require("../../genHexStr.js"),
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
        await awaitableTimeout(500, void(0));
    }, timeout)

    test("general use, are synchronous memcached calls eventually adding up?", async () => {
        expect.assertions(1);
        const
            interval =  250,
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
            interval =  250,
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

    test("does a higher limit work?", async () => {
        expect.assertions(1);
        const
            interval =  250,
            checkDelay = 250,
            wait = interval + checkDelay,
            oRouteClone = structuredClone(oRoute);
        oRouteClone.limits[0].limit = 2000;
        oRouteClone.limits[0].step = 2100;
        const limiter = new Limiter(cache, oRouteClone, {interval});
        limiters.add(limiter);
        const o1 = {};
        await awaitableTimeout(wait);
        /* 
            the weak bucket size of ratelimiter is shared and is 20, 
            normally a single limiter.trigger(o1) would suffice but
            since weak buckets are shared, it will return the previous
            objects
        */
        for(let i = 0; i < 20; ++i){
            limiter.trigger(o1)
        }
        await awaitableTimeout(wait);
        expect(limiter.trigger(o1)).toBe(o1);
    }, timeout)

    test("does timeout work?", async () => {
        expect.assertions(2);
        const
            interval =  250,
            checkDelay = 250,
            wait = interval + checkDelay,
            oRouteClone = structuredClone(oRoute);
        oRouteClone.limits[0].timeout = 2; //2s
        const limiter = new Limiter(cache, oRouteClone, {interval});
        limiters.add(limiter);
        const o1 = {};
        await awaitableTimeout(wait);
        for(let i = 0; i < 1000; ++i){
            limiter.trigger(o1)
        }
        await awaitableTimeout(wait);
        expect(limiter.trigger(o1)).toBe(o1);
        await awaitableTimeout(1500); //1500 + 500 + 500 = 2500ms > 2s, timeout should have reset by then
        expect(limiter.trigger(o1)).toBe(void(0));
    }, timeout)

    test("does global keys work?", async () => {
        expect.assertions(2);
        const
            interval =  250,
            checkDelay = 250,
            wait = interval + checkDelay,
            oRouteClone = structuredClone(oRoute),
            hLimit = (oRouteClone.limits[0].limit / 2 | 0) + 1;
        oRouteClone.limits[0].key = `ratelimiter-test-global-${genHexStr()}`;
        oRouteClone.limits[0].global = true;
        const 
            limiter = new Limiter(cache, oRouteClone, {interval}),
            limiter2 = new Limiter(cache, oRouteClone, {interval});
        limiters.add(limiter);
        limiters.add(limiter2);
        const o1 = {};
        await awaitableTimeout(wait);
        for(let i = 0; i < hLimit; ++i){ //a bit less than 30
            limiter.trigger(o1)
        }
        await awaitableTimeout(wait);
        expect(limiter.trigger(o1)).toBe(void(0));
        for(let i = 0; i < hLimit; ++i){ //a bit less than 30
            limiter.trigger(o1)
        }
        await awaitableTimeout(wait);
        expect(limiter2.trigger(o1)).toBe(o1);
    }, timeout)

    //passing a non object should throw
    test("general use, are synchronous memcached calls eventually adding up?", async () => {
        expect.assertions(1);
        const
            interval =  250,
            checkDelay = 250,
            wait = interval + checkDelay,
            limiter = new Limiter(cache, oRoute, {interval});
        limiters.add(limiter);
        const testString = "string";
        expect(() => limiter.trigger(testString)).toThrow();
    }, timeout);
})
