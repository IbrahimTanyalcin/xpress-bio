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
    
    test("some non passing examples", async () => {
        expect.assertions(1);
        let 
            payload = `channel\0event\0namespace\u{0}payload`.split("").map(d => d.charCodeAt(0)),
            noChannel_v1 = `\0event\0namespace\u{0}payload`.split("").map(d => d.charCodeAt(0)),
            noChannel_v2 = `event\0namespace\u{0}payload`.split("").map(d => d.charCodeAt(0)),
            noEvent_v1 = `channel\0\0namespace\u{0}payload`.split("").map(d => d.charCodeAt(0)),
            noEvent_v2 = `channel\0namespace\u{0}payload`.split("").map(d => d.charCodeAt(0)),
            noNamespace_v1 = `channel\0event\0\u{0}payload`.split("").map(d => d.charCodeAt(0)),
            noNamespace_v2 = `channel\0event\u{0}payload`.split("").map(d => d.charCodeAt(0)),
            empty = [];
        expect([
            !!validate(new Uint8Array(payload)),
            validate(new Uint8Array(noChannel_v1)),
            validate(new Uint8Array(noChannel_v2)),
            validate(new Uint8Array(noEvent_v1)),
            validate(new Uint8Array(noEvent_v2)),
            validate(new Uint8Array(noNamespace_v1)),
            validate(new Uint8Array(noNamespace_v2)),
            validate(new Uint8Array(empty))
        ]).toEqual([true, false, false, false, false, false, false, false]);
    });

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
        expect.assertions(4);
        let 
            maxLen = 0x64,
            config = {maxLen},
            payload_payload = [...Array(maxLen - 24)].map(
                d => String.fromCharCode(Math.random() * 256 | 0)
            ).join(""),
            payload = `channel\0event\0namespace\u{0}${payload_payload}`.split("").map(d => d.charCodeAt(0)),
            uint8Payload = new Uint8Array(payload),
            bufferPayload = Buffer.from(new Uint8Array(payload));

        /* be careful Buffer.from("string") is by default utf-8 encoded,
        this means that for chars with charCode > 0x7F, they will be more 
        than 1 byte in utf-8 but in utf-16, which is what js encodes strings,
        until charcode is 0xFFFF, utf-16 uses 2 bytes and string length will
        reflect correctly char length. When Node's buffer encounters an array
        of number, it takes them as BYTES and leaves them as they are. But if
        you do Buffer.from("string"), it will encode it in utf-8 unless 
        instructed otherwise. To make it behave like as if an array of bytes 
        are passed, use "binary" as optional encoding or its newer alias
        "latin1".*/

        expect(await getHashes(Buffer.from(payload_payload, "latin1")))
        .toEqual(await getHashes(validate(bufferPayload, config).payload))

        expect(await getHashes(Buffer.from(payload_payload, "binary")))
        .toEqual(await getHashes(validate(bufferPayload, config).payload))

        expect(await getHashes(Buffer.from(payload_payload.split("").map(d => d.charCodeAt(0)))))
        .toEqual(await getHashes(validate(bufferPayload, config).payload))

        expect(await getHashes(Buffer.from(validate(uint8Payload, config).payload)))
        .toEqual(await getHashes(validate(bufferPayload, config).payload))
    })

    test("checking payload identity", async () => {
        expect.assertions(4);
        let 
            maxLen = 0x128,
            config = {maxLen},
            payload_payload = [...Array(maxLen - 24)].map(
                d => String.fromCharCode(Math.random() * 256 | 0)
            ).join(""),
            payload = `channel\0event\0namespace\u{0}${payload_payload}`.split("").map(d => d.charCodeAt(0)),
            uint8Payload = new Uint8Array(payload),
            bufferPayload = Buffer.from(new Uint8Array(payload));

        //if you pass Uint8Array, you get Uint8Array
        expect(validate(uint8Payload, config).payload instanceof Uint8Array).toBe(true);
        //if you pass Buffer you get buffer
        expect(validate(bufferPayload, config).payload instanceof Buffer).toBe(true);
        //if pass nodejsDeepCopy, you always get buffer
        expect(validate(uint8Payload, {...config, nodejsDeepCopy: true}).payload instanceof Buffer).toBe(true);
        expect(validate(bufferPayload, {...config, nodejsDeepCopy: true}).payload instanceof Buffer).toBe(true);
    })

    test("checking the keys", async () => {
        expect.assertions(1);
        let 
            payload = `channel\0event\0namespace\u{0}payload`.split("").map(d => d.charCodeAt(0));
        expect(
            Object.keys(validate(new Uint8Array(payload)))
        ).toEqual(["channel", "evt", "namespace", "payload"]);
    });

    test("checking if consecutive null bytes are correctly captured in the payload", async () => {
        expect.assertions(1);
        let 
            payload = `channel\0event\0namespace\u{0}\0\0\0\xAF\x7F\xFFpayload`.split("").map(d => d.charCodeAt(0));
        expect(
            validate(new Uint8Array(payload)).payload
        ).toEqual(new Uint8Array([0x0, 0x0, 0x0, 0xAF, 0x7F, 0xFF, 0x70, 0x61, 0x79, 0x6c, 0x6f, 0x61, 0x64]));
        //                        null null null ¯     \x7F  ÿ     p     a     y     l     o     a     d
    });

    test("can we handle 500 reasonably sized calls per second?", async () => {
        expect.assertions(1);
        let 
            maxLen = 0x6400, //25 kB
            config = {maxLen},
            payload_payload = [...Array(maxLen - 24)].map(
                d => String.fromCharCode(Math.random() * 256 | 0)
            ).join(""),
            payload = `channel\0event\0namespace\u{0}${payload_payload}`.split("").map(d => d.charCodeAt(0)),
            uint8Payload = new Uint8Array(payload),
            bufferPayload = Buffer.from(new Uint8Array(payload));
        const start = performance.now();
        for (let i = 0; i < 500; ++i) {
            validate(bufferPayload);
        }
        const end = performance.now();
        console.log(end - start);
        expect(end - start <= 1000).toBe(true);
    })
})
