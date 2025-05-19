const
    {wsSend8, encode, uint16to8LE, uint32to8LE, uint8LEto16, uint8LEto32} = require('../../helpers.js');
describe(`testing wsSend8`, () => {

    beforeAll(async () => {
		void(0);
	});

    afterEach(async () => {
        void(0);
    });
    
    test("some passing examples", async () => {
        expect.assertions(1);
        const 
            channel = "someChannel",
            event = "someEvent",
            namespace = "someNamespace",
            payloadStr = "hello",
            payloadUint8 = encode(payloadStr),/* [104, 101, 108, 108, 112] */
            payloadBuff = Buffer.from(payloadUint8),
            fullPayload = Buffer.from(encode(`${channel}\0${event}\0${namespace}\0${payloadStr}`));
        expect([
            wsSend8({channel, event, namespace, payload: payloadStr}),
            wsSend8({channel, event, namespace, payload: payloadUint8}),
            wsSend8({channel, event, namespace, payload: payloadBuff})
        ]).toEqual([fullPayload, fullPayload, fullPayload]);
    });

    test("channel, event and namespace must be strings", async () => {
        expect.assertions(6);
        const 
            channel = "someChannel",
            event = "someEvent",
            namespace = "someNamespace",
            badChannel = 1,
            badChannel2 = Object(),
            badEvent = 1,
            badEvent2 = Object(),
            badNamespace = 1,
            badNamespace2 = Object(),
            payloadStr = "hello",
            payloadUint8 = encode(payloadStr),/* [104, 101, 108, 108, 112] */
            payloadBuff = Buffer.from(payloadUint8),
            fullPayload = Buffer.from(encode(`${channel}\0${event}\0${namespace}\0${payloadStr}`));
        expect(() => wsSend8({channel: badChannel, event, namespace, payload: payloadBuff})).toThrow();
        expect(() => wsSend8({channel: badChannel2, event, namespace, payload: payloadBuff})).toThrow();
        expect(() => wsSend8({channel, event: badEvent, namespace, payload: payloadBuff})).toThrow();
        expect(() => wsSend8({channel, event: badEvent2, namespace, payload: payloadBuff})).toThrow();
        expect(() => wsSend8({channel, event, namespace: badNamespace, payload: payloadBuff})).toThrow();
        expect(() => wsSend8({channel, event, namespace: badNamespace2, payload: payloadBuff})).toThrow();
    });

    test("only strings, Node Buffers and Uint8 arrays are accepted as payloads", async () => {
        expect.assertions(8);
        const 
            channel = "someChannel",
            event = "someEvent",
            namespace = "someNamespace",
            payloadStr = "\x00\x0Fÿ", /* [0x00, 0x0F, 0xFF] UTF-8: 00 0f c3 bf*/
            payloadUint8 = encode(payloadStr), /* [0x00, 0x0F, 0xFF] UTF-8: 00 0f c3 bf*/
            payloadBuff = Buffer.from(payloadUint8),
            fullPayload = Buffer.from(encode(`${channel}\0${event}\0${namespace}\0${payloadStr}`)),
            uInt16 = new Uint16Array(payloadBuff), 
            uInt32 = new Uint32Array(payloadBuff),
            uInt16LE = uint8LEto16(payloadBuff),
            uInt16Arr = new Uint16Array(uInt16LE.buffer.slice(uInt16LE.byteOffset, uInt16LE.byteOffset + uInt16LE.byteLength)),
            uInt8Of16 = uint16to8LE(uInt16Arr);
            
            console.log(uInt16LE); //[ 3840, 49091 ]
            console.log(payloadBuff); //<Buffer 00 0f c3 bf>
            //----------------0---------------------2-----------ArrayBuffer-------------undefined--------------------undefined-----------------4----------------------2--------------------------2------------------
            console.log(uInt16LE.byteOffset, uInt16LE.length, uInt16LE.buffer, uInt16LE.buffer.byteOffset , uInt16LE.buffer.length, uInt16LE.byteLength, uInt16LE.BYTES_PER_ELEMENT, Uint16Array.BYTES_PER_ELEMENT); //0, 2, ArrayBuffer, undefined, 4, 2, 2
            console.log(uInt16Arr); //Uint16Array(2) [ 3840, 49091 ]
            console.log(uInt8Of16); //<Buffer 00 0f c3 bf>
            console.log(uInt16); //Uint16Array(4) [ 0, 15, 195, 191 ] 
           
        expect(wsSend8({channel, event, namespace, payload: payloadStr})).toEqual(fullPayload);
        expect(wsSend8({channel, event, namespace, payload: payloadUint8})).toEqual(fullPayload);
        expect(wsSend8({channel, event, namespace, payload: payloadBuff})).toEqual(fullPayload);
        expect(wsSend8({channel, event, namespace, payload: uInt8Of16})).toEqual(fullPayload);
        expect(() => wsSend8({channel, event, namespace, payload: uInt16})).toThrow();
        expect(() => wsSend8({channel, event, namespace, payload: uInt32})).toThrow();
        expect(() => wsSend8({channel, event, namespace, payload: uInt32})).toThrow();
        expect(() => wsSend8({channel, event, namespace, payload: uInt16LE})).toThrow();
    });
})