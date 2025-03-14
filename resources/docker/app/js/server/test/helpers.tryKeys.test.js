const
    {tryKeys} = require('../../helpers.js');
describe(`testing helpers.tryKeys`, () => {

    beforeAll(async () => {
		void(0);
	});

    afterEach(async () => {
        void(0);
    });

    test("standard usage", async () => {
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
    })

})
