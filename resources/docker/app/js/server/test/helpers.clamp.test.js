const
    {clamp} = require('../../helpers.js');
describe(`testing helpers.clamp`, () => {

    beforeAll(async () => {
		void(0);
	});

    afterEach(async () => {
        void(0);
    });

    test("standard usage", async () => {
        expect.assertions(1);
        const result = [
            clamp(2, 1, 5),
            clamp(-1, 1, 5, 10),
            clamp("not a number", 1, 5, 3),
            clamp(-100, -10, 50),
            clamp(100, -10, 50),
            clamp("not a number", -10, 10, 5),
            clamp("not a number", -10, 10, 500)
        ];
        expect(result).toEqual([
            2,
            1,
            3,
            -10,
            50,
            5,
            10
        ]);
    })

    test("out of bounds", async () => {
        expect.assertions(1);
        const result = [clamp(-20, 1, 5), clamp(20, 1, 5)];
        expect(result).toEqual([1, 5]);
    })

    test("NaN value", async () => {
        expect.assertions(1);
        const result = [clamp("not a number", -100, 100), clamp(NaN, -100, 100)];
        expect(result).toEqual([-100, -100]);
    })

    test("NaN with min not specified", async () => {
        expect.assertions(1);
        const result = [clamp("not a number"), clamp(NaN, {max: 100})];
        expect(result).toEqual([Number.MIN_SAFE_INTEGER, Number.MIN_SAFE_INTEGER]);
    })

    test("testing an object", async () => {
        expect.assertions(1);
        const result = [
            clamp("not a number", {min: -100, max: 100, def: 4}), 
            clamp(NaN, {min: -100, max: 100, def: -1000}),
            clamp(NaN, {max: 100, def: -1000}),
            clamp(NaN, {min: -100, def: 10000}),
            clamp(200, {max: 100, def: 1000}),
            clamp(200, {min: 5, max: 100, def: 1000}),
            clamp(200, {min: 5, def: "Not a number"}),
            clamp("not a number", {def: "Not a number"}),
            clamp(3, {min: 0, max: 5}),
            clamp("not a number", {min: 0, max:10, def: 1000}),
            clamp(Infinity, {min: 0, max:10, def: 1000}),
            clamp(-Infinity, {min: 0, max:10, def: 1000}),
            clamp(Infinity, {min: -1000, max:10}),
            clamp()
        ];
        expect(result).toEqual([
            4,
            -100,
            -1000,
            10000,
            100,
            100,
            200,
            Number.MIN_SAFE_INTEGER,
            3,
            10,
            10,
            0,
            10,
            Number.MIN_SAFE_INTEGER,
        ]);
    })

})
