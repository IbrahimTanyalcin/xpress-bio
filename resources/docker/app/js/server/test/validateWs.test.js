const
    {validate} = require('../../validateWs.js');
describe(`testing validateWs`, () => {

    beforeAll(async () => {
		void(0);
	});

    afterEach(async () => {
        void(0);
    });

    test("a passing example", async () => {
        expect.assertions(1);
        let 
            payload = `channel\0event\0namespace\u{0}payload`.split("").map(d => d.charCodeAt(0)),
            uint8Payload = new Uint8Array(payload),
            uint8ClampedPayload = new Uint8ClampedArray(payload),
            bufferPayload = Buffer.from(new Uint8Array(payload)),
            expectedUint8 = {
                channel: "channel", evt: "event", namespace: "namespace",
                payload: new TextEncoder().encode("payload")
            },
            expectedUint8Clamped = {
                channel: "channel", evt: "event", namespace: "namespace",
                payload: new Uint8ClampedArray("payload".split("").map(d => d.charCodeAt(0)))
            },
            expectedBuffer = {
                channel: "channel", evt: "event", namespace: "namespace",
                payload: Buffer.from(new TextEncoder().encode("payload"))
            };
        expect([
            validate(payload),
            validate(uint8Payload),
            validate(uint8ClampedPayload),
            validate(bufferPayload)
        ]).toEqual([false, expectedUint8, expectedUint8Clamped, expectedBuffer]);
    })
    
    test("long channel errors", async () => {
        expect.assertions(2);
        //These will FAIL, channel 33 chars
        let 
            payload = `channelllllllllllllllllllllllllll\0event\0namespace\u{0}payload`.split("").map(d => d.charCodeAt(0)),
            uint8Payload = new Uint8Array(payload),
            uint8ClampedPayload = new Uint8ClampedArray(payload),
            bufferPayload = Buffer.from(new Uint8Array(payload));
        expect([
            validate(payload),
            validate(uint8Payload),
            validate(uint8ClampedPayload),
            validate(bufferPayload)
        ]).toStrictEqual([false, false, false, false]);

        //These shall PASS, max channel length is 32
        payload = `channellllllllllllllllllllllllll\0event\0namespace\u{0}payload`.split("").map(d => d.charCodeAt(0)),
        uint8Payload = new Uint8Array(payload),
        uint8ClampedPayload = new Uint8ClampedArray(payload),
        bufferPayload = Buffer.from(new Uint8Array(payload));

        expect([
            validate(uint8Payload)?.channel,
            validate(uint8ClampedPayload)?.channel,
            validate(bufferPayload)?.channel
        ]).toStrictEqual([...Array(3)].map(d => "channellllllllllllllllllllllllll"));
    })

    test("long event errors", async () => {
        expect.assertions(2);
        //These will FAIL, event 33 chars
        let 
            payload = `channel\0eventtttttttttttttttttttttttttttt\0namespace\u{0}payload`.split("").map(d => d.charCodeAt(0)),
            uint8Payload = new Uint8Array(payload),
            uint8ClampedPayload = new Uint8ClampedArray(payload),
            bufferPayload = Buffer.from(new Uint8Array(payload));
        expect([
            validate(payload),
            validate(uint8Payload),
            validate(uint8ClampedPayload),
            validate(bufferPayload)
        ]).toStrictEqual([false, false, false, false]);

        //These shall PASS, max event length is 32
        payload = `channel\0eventttttttttttttttttttttttttttt\0namespace\u{0}payload`.split("").map(d => d.charCodeAt(0)),
        uint8Payload = new Uint8Array(payload),
        uint8ClampedPayload = new Uint8ClampedArray(payload),
        bufferPayload = Buffer.from(new Uint8Array(payload));

        expect([
            validate(uint8Payload)?.evt,
            validate(uint8ClampedPayload)?.evt,
            validate(bufferPayload)?.evt
        ]).toStrictEqual([...Array(3)].map(d => "eventttttttttttttttttttttttttttt"));
    })

    test("long namespace errors", async () => {
        expect.assertions(2);
        //These will FAIL, namespace 33 chars
        let 
            payload = `channel\0event\0namespaceeeeeeeeeeeeeeeeeeeeeeeee\u{0}payload`.split("").map(d => d.charCodeAt(0)),
            uint8Payload = new Uint8Array(payload),
            uint8ClampedPayload = new Uint8ClampedArray(payload),
            bufferPayload = Buffer.from(new Uint8Array(payload));
        expect([
            validate(payload),
            validate(uint8Payload),
            validate(uint8ClampedPayload),
            validate(bufferPayload)
        ]).toStrictEqual([false, false, false, false]);

        //These shall PASS, max namespace length is 32
        payload = `channel\0event\0namespaceeeeeeeeeeeeeeeeeeeeeeee\u{0}payload`.split("").map(d => d.charCodeAt(0)),
        uint8Payload = new Uint8Array(payload),
        uint8ClampedPayload = new Uint8ClampedArray(payload),
        bufferPayload = Buffer.from(new Uint8Array(payload));

        expect([
            validate(uint8Payload)?.namespace,
            validate(uint8ClampedPayload)?.namespace,
            validate(bufferPayload)?.namespace
        ]).toStrictEqual([...Array(3)].map(d => "namespaceeeeeeeeeeeeeeeeeeeeeeee"));
    })

    test("long payload errors", async () => {
        expect.assertions(2);
        /* 
            There is double work below, fromCharCode -> charCodeAt.
            An alternative would be:
            payload = new String(`....join("")}`);
            payload[Symbol.iterator] = function*(){
                for (let letter of [...this.toString()]) {
                    yield letter.charCodeAt(0);
                }
            }
            uint8Payload = new Uint8Array(payload)
        */ 
        /* 
            These will FAIL, they are above specified payload length
            maxLen - 16 + 1 is removing the length of channel, event and namespace
            including the nullbytes. +1 is to deliberately exceed the limit.
        */
        let 
            maxLen = 0x64000,
            config = {maxLen},
            payload = `channel\0event\0namespace\u{0}${[...Array(maxLen - 24 + 1)].map(
                d => String.fromCharCode(Math.random() * 256 | 0)
            ).join("")}`.split("").map(d => d.charCodeAt(0)),
            uint8Payload = new Uint8Array(payload),
            uint8ClampedPayload = new Uint8ClampedArray(payload),
            bufferPayload = Buffer.from(new Uint8Array(payload));
        expect([
            validate(payload, config),
            validate(uint8Payload, config),
            validate(uint8ClampedPayload, config),
            validate(bufferPayload, config)
        ]).toStrictEqual([false, false, false, false]);

        //These shall PASS, payload length is -le maxLen
        let bufferCopy = uint8Payload.buffer.slice(0,-1);
        uint8Payload = new Uint8Array(bufferCopy),
        uint8ClampedPayload = new Uint8ClampedArray(bufferCopy),
        bufferPayload = Buffer.from(new Uint8Array(bufferCopy));
        //console.log(uint8Payload.length);
        expect([
            validate(uint8Payload, config)?.payload?.length,
            validate(uint8ClampedPayload, config)?.payload?.length,
            validate(bufferPayload, config)?.payload?.length
        ]).toStrictEqual([...Array(3)].map(d => maxLen - 24));
    })
    
    test("checking payload integrity", async () => {
        expect.assertions(1);
        let 
            maxLen = 0x64,
            config = {maxLen},
            payload_payload = [...Array(maxLen - 24)].map(
                d => String.fromCharCode(Math.random() * 256 | 0)
            ).join(""),
            payload = `channel\0event\0namespace\u{0}${payload_payload}`.split("").map(d => d.charCodeAt(0)),
            uint8Payload = new Uint8Array(payload),
            uint8ClampedPayload = new Uint8ClampedArray(payload),
            bufferPayload = Buffer.from(new Uint8Array(payload));
       /*  expect([
            validate(payload, config),
            validate(uint8Payload, config),
            validate(uint8ClampedPayload, config),
            validate(bufferPayload, config)
        ]).toStrictEqual([false, false, false, false]); */

        /* console.log("uint8", await getHashes(uint8Payload));
        console.log("buffer", await getHashes(bufferPayload));
        console.log("buffer", await getHashes(Buffer.from(uint8Payload.buffer.slice(0,-1))));
        console.log(
            await getHashes(new Uint8Array([]), uint8Payload, uint8ClampedPayload, bufferPayload)
        ); */
        //expect(true).toBe(true);

        console.log(0x64 - 24, payload_payload.length);
        console.log(payload_payload);
        console.log(payload_payload.split("").map(d => d.charCodeAt(0).toString(16)));
        console.log("validation", validate(bufferPayload, config).payload, validate(bufferPayload, config).payload.length);
        console.log("buffer", Buffer.from(payload_payload, "latin1"), Buffer.from(payload_payload, "latin1").length);

        expect(await getHashes(Buffer.from(payload_payload, "latin1")))
        .toEqual(await getHashes(validate(bufferPayload, config).payload))
    })
    //test- identity, performance, keys, sequence null bytes
    /* test("standard usage", async () => {
        expect.assertions(1);
        const result = tryKeys({a:1, b:2, c:3}, "key1", "key2", "c", "a");
        expect(result).toEqual(3);
    })

    test("test the options object", async () => {
        expect.assertions(1);
        const result = tryKeys({a:1, b:2, c:3}, "key1", "key2", "c", "a", {returnKey: 1});
        expect(result).toEqual("c");
    })

    test("can I pass the keys as array?", async () => {
        expect.assertions(1);
        const result = tryKeys({a:1, b:2, c:3}, ["key1", "key2", "c", "a"], {returnKey: 1});
        expect(result).toEqual("c");
    })

    test("can I pass everything as an array?", async () => {
        expect.assertions(1);
        const result = tryKeys({a:1, b:2, c:3}, ["key1", "key2", "c", "a", {returnKey: 1}]);
        expect(result).toEqual("c");
    })

    test("can I pass them as irregular arrays?", async () => {
        expect.assertions(1);
        const result = tryKeys({a:1, b:2, c:3}, ["key1", "key2"], ["c", "a", {returnKey: 1}]);
        expect(result).toEqual("c");
    })

    test("test the coercion", async () => {
        expect.assertions(1);
        const result = tryKeys(3, "key1", "valueOf", "c", "a", {returnKey: 0});
        expect(result).toEqual(Number.prototype.valueOf);
    })

    test("test the transform", async () => {
        expect.assertions(1);
        const result = tryKeys({a:1, b:2, c:3}, "key1", "key2", "c", "a", {returnKey: 1, transform: (x) => x> 2});
        expect(result).toEqual("c");
    })

    test("test the transform-2", async () => {
        expect.assertions(1);
        const result = tryKeys({a:1, b:2, c:3}, "key1", "key2", "c", "a", {returnKey: 1, transform: (x) => x<= 1});
        expect(result).toEqual("a");
    })

    test("test the default value", async () => {
        expect.assertions(1);
        const result = tryKeys({a:1, b:2, c:3}, "key1", "key2", "key3");
        expect(result).toEqual(void(0));
    })

    test("test the default value with default key", async () => {
        expect.assertions(1);
        const result = tryKeys({a:1, b:2, c:3}, "key1", "key2", "key3", {returnKey: 1});
        expect(result).toEqual(void(0));
    })

    test("test the default value when specified", async () => {
        expect.assertions(1);
        const result = tryKeys({a:1, b:2, c:3}, "key1", "key2", "key3", {default: "defaultValue"});
        expect(result).toEqual("defaultValue");
    })

    test("test the default key when specified", async () => {
        expect.assertions(1);
        const result = tryKeys({a:1, b:2, c:3}, "key1", "key2", "key3", {defaultKey: "defaultKey", returnKey: 1});
        expect(result).toEqual("defaultKey");
    }) */

})
