const
    {penalize, unpenalize, isPenalized} = require('../../penalizer.js'),
    {setTimeout:awaitableTimeout} = require("node:timers/promises"),
    timeout = 10000;
describe(`testing penalizer`, () => {

    beforeAll(async () => {
		void(0);
	});

    afterEach(async () => {
        void(0);
    });

    test("general use, penalizer stores object in a weakmap and accrues increasing penalty on succesive calls", async () => {
        expect.assertions(2);
        const
            interval = 200,
            oTest = {}
            cbTest = jest.fn(),
        expect(penalize(oTest, {interval, cb: () => {(cbTest())}})).toBe(1);
        await awaitableTimeout(interval);
        expect(cbTest).toHaveBeenCalled();
        unpenalize(oTest);
    }, timeout)

    test("successive calls return the same counter, but gets doubled after timeout", async () => {
        expect.assertions(5);
        const
            interval = 200,
            oTest = {}
            cbTest = jest.fn(),
        expect(penalize(oTest, {interval, cb: () => {(cbTest())}})).toBe(1);
        expect(penalize(oTest, {interval, cb: () => {(cbTest())}})).toBe(1); //still 1 after immediate reinvoke
        await awaitableTimeout(interval / 2 + 1);
        expect(penalize(oTest, {interval, cb: () => {(cbTest())}})).toBe(1); //still 1 before timeout
        await awaitableTimeout(interval / 2 + 1);
        expect(cbTest).toHaveBeenCalled();
        expect(penalize(oTest, {interval, cb: () => {(cbTest())}})).toBe(2);
        unpenalize(oTest);
    }, timeout)

    test("if the attack persists, penalty will accumulate", async () => {
        expect.assertions(6);
        const
            interval = 200,
            oTest = {}
            cbTest = jest.fn(),
        expect(penalize(oTest, {interval, cb: () => {(cbTest())}})).toBe(1); // will cb in 200ms
        await awaitableTimeout(interval);
        //expect(cbTest).toHaveBeenCalled();
        expect(penalize(oTest, {interval, cb: () => {(cbTest())}})).toBe(2); //will cb in 400ms
        await awaitableTimeout(interval * 2);
        //expect(cbTest).toHaveBeenCalled();
        expect(penalize(oTest, {interval, cb: () => {(cbTest())}})).toBe(4); //will cb in 800ms
        expect(penalize(oTest, {interval, cb: () => {(cbTest())}})).toBe(4); //immediate call does not accumulate
        await awaitableTimeout(interval * 4);
        //expect(cbTest).toHaveBeenCalled();
        expect(penalize(oTest, {interval, cb: () => {(cbTest())}})).toBe(8);
        expect(cbTest).toHaveBeenCalledTimes(3);
        unpenalize(oTest);
    }, timeout)
})
