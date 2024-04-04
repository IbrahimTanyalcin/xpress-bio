const 
    {transpileStrMatchList} = require("../../transpileStrMatchList.js"),
    genHexStr = require("../../genHexStr.js"),
    {safeResources} = require("../../safeResources.js");

describe(`transpileStrMatchList is usually used as URI matcher`, () => {

    test("basic usage", async () => {
        expect.assertions(3);
        const matcher = transpileStrMatchList(
            {
                value: [
                    "^som?eTest[A-Z]{3}$",
                    "otherTesttt\\\\"
                ],
                isRegExp: true,
                RegExpFlags: "i"
            },
            "^let's see if this works"
        );
        expect(matcher.match("sasdadotherTesttt\\")).toBe(true);
        expect(matcher.match("let's see if this works")).toBe(true);
        expect(matcher.match("some padding let's see if this works")).toBe(false);
    })

    test("testing array of values from 'workers/dl.js'", async () => {
        expect.assertions(5);
        const matcher = transpileStrMatchList([
            {
                value: "^https:\\\/\\\/dl\\.dnanex\\.us\\\/",
                isRegExp: true,
                RegExpFlags: "i"
            },
            "^https://dl.dnanex.us/",
            `https://gist.github.com/IbrahimTanyalcin/ecf5f91d86a07e31a038283148b4a52e/archive/35deaee01bcfd2c58c24df709f6d6b2a0edc0247.tar.gz`
        ]);
        expect(matcher.match("https://dl.dnanex.us")).toBe(false);
        expect(matcher.match("https://dl.dnanex.us/xyz")).toBe(true);
        expect(matcher.match("paddinghttps://dl.dnanex.us/xyz")).toBe(false);
        expect(matcher.match("https://gist.github.com/IbrahimTanyalcin/ecf5f91d86a07e31a038283148b4a52e/archive/35deaee01bcfd2c58c24df709f6d6b2a0edc0247.tar.gz")).toBe(true);
        expect(matcher.match("paddinghttps://gist.github.com/IbrahimTanyalcin/ecf5f91d86a07e31a038283148b4a52e/archive/35deaee01bcfd2c58c24df709f6d6b2a0edc0247.tar.gz")).toBe(true);
    })

    test("testing array of objects", async () => {
        expect.assertions(15);
        const rnd = genHexStr(8,4);
        const matcher = transpileStrMatchList([
            new String(rnd),
            {
                value: [
                    "^abc",
                    "cBa$"
                ],
                isRegExp: true,
            },
            {
                value: "xYz",
            },
            {
                value: [
                    "^DEF",
                    "fed"
                ]
            },
            "this string uses 'include'",
            "^where as this one uses 'startsWith'"
        ]);
        expect(matcher.match("xabc")).toBe(false);
        expect(matcher.match("abc")).toBe(true);
        expect(matcher.match("aBc")).toBe(false);
        expect(matcher.match("xxxxcBa")).toBe(true);
        expect(matcher.match("xxxxcba")).toBe(false);
        expect(matcher.match("cBa")).toBe(true);
        expect(matcher.match("xyz")).toBe(false);
        expect(matcher.match("xYz")).toBe(true);
        expect(matcher.match("def")).toBe(false);
        expect(matcher.match("DEF")).toBe(true);
        expect(matcher.match(" DEF")).toBe(false);
        expect(matcher.match("fedex")).toBe(true);
        expect(matcher.match("exfed   ")).toBe(true);
        expect(matcher.match("but where as this one uses 'startsWith'")).toBe(false);
        expect(matcher.match("check it out: this string uses 'include'!!")).toBe(true);
    })

    test("testing single argument as primitive string", async () => {
        expect.assertions(4);
        const 
            matcher = transpileStrMatchList("single argument as string"),
            matcher2 = transpileStrMatchList("^single argument as string");
        expect(matcher.match("this is a single argument as string")).toBe(true);
        expect(matcher2.match("this is a single argument as string")).toBe(false);
        /*
            re-run the same matchers to check if somewhere we mistakenly used global
            flag so that when the same matcher is called, it does return false,
            reset 'lastIndex' property and rewind to the beginning of the string.
        */
        expect(matcher.match("this is a single argument as string")).toBe(true);
        expect(matcher2.match("this is a single argument as string")).toBe(false);
    })

    test("testing when combined with safeResources and -j/--jsonconf option of the app", async () => {
        expect.assertions(14);
        const 
            matcher = transpileStrMatchList(safeResources, [
                {
                    value: [
                        "^https:\\\/\\\/dl\\.dnanex\\.us\\\/"
                    ],
                    isRegExp: true,
                    RegExpFlags: "ig" //setting g flag on purpose to make sure it is stripped off
                }
            ]),
            matcher2 = transpileStrMatchList(
                [
                    [
                        {
                            value: "^https:\\\/\\\/dl\\.dnanex\\.us\\\/",
                            isRegExp: true,
                            RegExpFlags: "i"
                        },
                        {
                            value: [
                                "^https://mail.google.com/",
                                "^https://mail-test.google.com/"
                            ]
                        }
                    ], 
                    "^https://drive.google.com/"
                ],
                safeResources
            );
        expect(matcher.match("https://dl.dnanex.us/")).toBe(true);
        expect(matcher.match("https://dl.dnanex.us/")).toBe(true); //did we strip the g flag, otherwise this will return false
        expect(matcher.match("https://dl.dnanex.us")).toBe(false);
        expect(matcher.match(" https://dl.dnanex.us/")).toBe(false);
        expect(matcher.match(`https://gist.github.com/IbrahimTanyalcin/ecf5f91d86a07e31a038283148b4a52e/archive/35deaee01bcfd2c58c24df709f6d6b2a0edc0247.tar.gz`)).toBe(true);
        expect(matcher.match(`https://drive.usercontent.google.com/u/0/uc?id=19TgtJQ18GVHMMsTwfCn_f2yxZDMPxENE&export=download`)).toBe(true);
        expect(matcher2.match("https://dl.dnanex.us/")).toBe(true);
        expect(matcher2.match("https://mail.google.com/")).toBe(true);
        expect(matcher2.match("https://mail.google.com")).toBe(false);
        expect(matcher2.match("https://mail-test.google.com/")).toBe(true);
        expect(matcher2.match("https://drive.google.com/")).toBe(true);
        expect(matcher2.match(" https://drive.google.com/")).toBe(false);
        expect(matcher2.match(`https://gist.github.com/IbrahimTanyalcin/ecf5f91d86a07e31a038283148b4a52e/archive/35deaee01bcfd2c58c24df709f6d6b2a0edc0247.tar.gz`)).toBe(true);
        expect(matcher2.match(`https://drive.usercontent.google.com/u/0/uc?id=19TgtJQ18GVHMMsTwfCn_f2yxZDMPxENE&export=download`)).toBe(true);
    })
})