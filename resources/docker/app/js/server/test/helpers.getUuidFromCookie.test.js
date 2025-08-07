const
    {getUuidFromCookie} = require('../../helpers.js'),
    {randomUUID, randomBytes} = require('node:crypto');
describe(`testing helpers.getUuidFromCookie`, () => {

    beforeAll(async () => {
		void(0);
	});

    afterEach(async () => {
        void(0);
    });

    test("standard usage", async () => {
        expect.assertions(1);
        const result = [
            "xb_uuid=ABCDEF1234567890",
            "foo=bar; xb_uuid=abc123def456ghi7; theme=dark",
            "xb_uuid=ABC123; other=val",
            "other1=val1; xb_uuid=xyzXYZ7897897897; other2=val2",
            "  xb_uuid =  0000000000000000  ",
            "foo=bar;xb_uuid=ZZZZZZZZZZZZZZZZ;baz=qux",
            "foo=bar;   xb_uuid=abcdEFGHijklMNOP   ; other=value",
        ].map(d => getUuidFromCookie(d));
        expect(result).toEqual([
            "ABCDEF1234567890",
            "abc123def456ghi7",
            void(0),
            "xyzXYZ7897897897",
            "0000000000000000",
            "ZZZZZZZZZZZZZZZZ",
            "abcdEFGHijklMNOP"
        ].map(d => d?.toLowerCase()));
    })

    test("if multiple entries are there, return the last", async () => {
        expect.assertions(1);
        const result = [
            "xb_uuid=FIRST1234567890; something=else; xb_uuid=LAST0987654321",
            "xb_uuid=FIRST1234567890; something=else; xb_uuid=LAST0987654321Atleast16chars",
            "xb_uuid=abc; xb_uuid=def; xb_uuid=GHIJKLMNOPQRSTUV",
            "xb_uuid=abc; xb_uuid=def; xb_uuid=GHIJKLMNOPQRSTUV   ; xb_uuid=--12345--GHIJKLMNOPQRSTUV",
            "xb_uuid=abc; xb_uuid=$$$!!illegalCharrrrrdef; xb_uuid=GHIJKLMNOPQRSTUV   ; xb_uuid=--12345--GHIJKLMNOPQRSTUV",
            "xb_uuid=abc; xb_uuid=$$$!!illegalCharrrrrdef; xb_uuid=GHIJKLMNOPQRSTUV   ; xb_uuid=--12345--GHI_illegalChar!!!_JKLMNOPQRSTUV",
            "xb_uuid=abc; xb_uuid=$$$!!illegalCharrrrrdef; xb_uuid=GHIJKLMNOPQRSTUV   ; xb_uuid=--12345--GHI__JKLMNOPQRSTUV",
        ].map(d => getUuidFromCookie(d))
        
        expect(result).toEqual([
            void(0),
            "LAST0987654321Atleast16chars",
            "GHIJKLMNOPQRSTUV",
            "--12345--GHIJKLMNOPQRSTUV",
            "--12345--GHIJKLMNOPQRSTUV",
            "GHIJKLMNOPQRSTUV",
            "--12345--GHI__JKLMNOPQRSTUV"
        ].map(d => d?.toLowerCase()))
    })

    test("if multiple entries are there, return the last even if multiline string", async () => {
        expect.assertions(1);
        const result = [
            `xb_uuid=FIRST1234567890; something=else; 
                 xb_uuid=LAST0987654321
            `,
            `xb_uuid=FIRST1234567890;
            something=else; xb_uuid=LAST0987654321Atleast16chars
            `,
            `xb_uuid=abc; 
            xb_uuid=def; xb_uuid=GHIJKLMNOPQRSTUV`,
            `
                xb_uuid=abc; 
                xb_uuid=def; 
                xb_uuid=GHIJKLMNOPQRSTUV   ; 
                xb_uuid=--12345--GHIJKLMNOPQRSTUV
            `,
            `xb_uuid=abc; xb_uuid=$$$!!illegalCharrrrrdef; 
            xb_uuid=GHIJKLMNOPQRSTUV   
            xb_uuid=--12345--GHIJKLMNOPQRSTUV
            `,
            `xb_uuid=abc; xb_uuid=$$$!!illegalCharrrrrdef 
            xb_uuid=GHIJKLMNOPQRSTUV   ; xb_uuid=--12345--GHI_illegalChar!!!_JKLMNOPQRSTUV`,
            `xb_uuid=abc    
             xb_uuid=$$$!!illegalCharrrrrdef   
             xb_uuid=GHIJKLMNOPQRSTUV   
                  xb_uuid=--12345--GHI__JKLMNOPQRSTUV
            `,
        ].map(d => getUuidFromCookie(d))
        
        expect(result).toEqual([
            void(0),
            "LAST0987654321Atleast16chars",
            "GHIJKLMNOPQRSTUV",
            "--12345--GHIJKLMNOPQRSTUV",
            "--12345--GHIJKLMNOPQRSTUV",
            "GHIJKLMNOPQRSTUV",
            "--12345--GHI__JKLMNOPQRSTUV"
        ].map(d => d?.toLowerCase()))
    })

    test("Lowercase / mixed case should work", async () => {
        expect.assertions(1);
        const result = [
            "Xb_UuId=abcd1234efgh5678",
            "foo=bar;XB_UUID=AbCdEfGhIjKlMnOp"
        ].map(d => getUuidFromCookie(d))
        
        expect(result).toEqual([
            "abcd1234efgh5678",
            "abcdefghijklmnop"
        ].map(d => d?.toLowerCase()))
    })

    test("invalid cases should return undefined", async () => {
        expect.assertions(1);
        const result = [
            "",
            "foo=bar; theme=dark",
            "xb_uuid=",
            "xb_uuid=tooShort",
            "xb_uuid=" + "tooLong".repeat(100),
            "xb_uuid=!!!invalid$$$value###"
        ].map(d => getUuidFromCookie(d))
        
        expect(result).toEqual(Array(6).fill(void(0)))
    })

    test("this uuid extractor is compatible with crypto.randomUUID and crypto.randomBytes", async () => {
        expect.assertions(1);
        const rnd1 = randomUUID(),
              rnd2 = randomUUID(),
              hex8 = randomBytes(4).toString("hex"),
              hex16 = randomBytes(8).toString("hex"),
              hex32 = randomBytes(16).toString("hex"),
              hex256 = randomBytes(128).toString("hex"),
              hex512 = randomBytes(256).toString("hex");
        const result = [
            `xb_uuid=${rnd1}`,
            `XB_UUID=${rnd1}`,
            `xb_uuid=${rnd1};  Xb_uuid=    ${rnd2}`,
            `
                xb_uuid=${rnd1}
                xb_uuid=${rnd2}
            `.toUpperCase(),
            `xb_uuid=  ${hex8}  `,
            `xb_uuid=  ${hex16}  `,
            `xb_uuid=  ${hex32}  `,
            `xb_uuid=  ${hex32}  ; xb_uuid=  ${hex256}`,
            `xb_uuid=${hex256};`,
            `xb_uuid=${hex512};`,
        ].map(d => getUuidFromCookie(d))
        
        expect(result).toEqual([
            rnd1,
            rnd1,
            rnd2,
            rnd2,
            void(0),
            hex16,
            hex32,
            hex256,
            hex256,
            void(0)
        ])
    })
})
