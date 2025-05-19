const
    {penalize, unpenalize, isPenalized, isReset} = require('../../penalizer.js'),
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
            oTest = {},
            cbTest = jest.fn();
        expect(penalize(oTest, {interval, cb: () => {(cbTest())}})).toBe(1);
        await awaitableTimeout(interval);
        expect(cbTest).toHaveBeenCalled();
        unpenalize(oTest);
    }, timeout)

    test("successive calls return the same counter, but gets doubled after timeout", async () => {
        expect.assertions(5);
        const
            interval = 200,
            oTest = {},
            cbTest = jest.fn();
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
            oTest = {},
            cbTest = jest.fn();
        expect(penalize(oTest, {interval, cb: () => {(cbTest())}})).toBe(1); // will cb in 200ms
        await awaitableTimeout(interval);

        expect(penalize(oTest, {interval, cb: () => {(cbTest())}})).toBe(2); //will cb in 400ms
        await awaitableTimeout(interval * 2);

        expect(penalize(oTest, {interval, cb: () => {(cbTest())}})).toBe(4); //will cb in 800ms
        expect(penalize(oTest, {interval, cb: () => {(cbTest())}})).toBe(4); //immediate call does not accumulate
        await awaitableTimeout(interval * 4);

        expect(penalize(oTest, {interval, cb: () => {(cbTest())}})).toBe(8);
        expect(cbTest).toHaveBeenCalledTimes(3);
        unpenalize(oTest);
    }, timeout)

    test("if the attack stops, penalty will slowly reset itself", async () => {
        expect.assertions(7);
        const
            interval = 20,
            oTest = {},
            cbTest = jest.fn();
        expect(penalize(oTest, {interval, cb: () => {(cbTest())}})).toBe(1); // will cb in (interval) ms
        await awaitableTimeout(interval);

        expect(penalize(oTest, {interval, cb: () => {(cbTest())}})).toBe(2); //will cb in (interval) * 2 ms
        await awaitableTimeout(interval * 2);

        expect(penalize(oTest, {interval, cb: () => {(cbTest())}})).toBe(4); //will cb in (interval) * 4 ms
        expect(penalize(oTest, {interval, cb: () => {(cbTest())}})).toBe(4); //immediate call does not accumulate
        await awaitableTimeout(interval * 4);

        expect(penalize(oTest, {interval, cb: () => {(cbTest())}})).toBe(8);
        expect(cbTest).toHaveBeenCalledTimes(3);

        /*  
            for an interval of 50:
            accumulation constant is 4, value is 8, 4 * 8 * 50 = 1600ms
            in 1600ms value will be 4, in 800ms, value will be 2,
            in 400ms value will be 1, in 200 ms value will be 0.5
            1600 + 800 + 400 + 200 = at 3000ms penalizing shall return 1.
        */
        await awaitableTimeout((4 * interval) * (8 + 4 + 2 + 1 + 0.5));
        expect(penalize(oTest, {interval, cb: () => {(cbTest())}})).toBe(1);
        unpenalize(oTest);
    }, timeout)

    test("does the unpenalize work correctly?", async () => {
        expect.assertions(5);
        const
            interval = 20,
            oTest = {},
            cbTest = jest.fn();
        expect(penalize(oTest, {interval, cb: () => {(cbTest())}})).toBe(1); // will cb in (interval) ms
        await awaitableTimeout(interval);

        expect(penalize(oTest, {interval, cb: () => {(cbTest())}})).toBe(2); //will cb in (interval) * 2 ms
        await awaitableTimeout(interval * 2);

        expect(penalize(oTest, {interval, cb: () => {(cbTest())}})).toBe(4); //will cb in (interval) * 4 ms
        expect(cbTest).toHaveBeenCalledTimes(2); //first and second calls to penalize fire till here

        /*  
            unpenalizing here should set the counter value to 0.5
        */
        unpenalize(oTest);
        expect(penalize(oTest, {interval, cb: () => {(cbTest())}})).toBe(1);

        //make sure there are no unhandled macrotasks/promises so jest does not complain
        unpenalize(oTest);
    }, timeout)

    test("does isPenalized work correctly?", async () => {
        expect.assertions(7);
        const
            interval = 20,
            oTest = {},
            cbTest = jest.fn(),
            epsilon = 5;
        expect(penalize(oTest, {interval, cb: () => {(cbTest())}})).toBe(1); // will cb in (interval) ms
        expect(isPenalized(oTest)).toBe(true);
        await awaitableTimeout(interval);

        expect(penalize(oTest, {interval, cb: () => {(cbTest())}})).toBe(2); //will cb in (interval) * 2 ms
        expect(isPenalized(oTest)).toBe(true);
        await awaitableTimeout(interval * 2 - epsilon);
        expect(isPenalized(oTest)).toBe(true);
        
        await awaitableTimeout(2 * epsilon);
        expect(isPenalized(oTest)).toBe(false);
        expect(cbTest).toHaveBeenCalledTimes(2); //first and second calls to penalize fire till here

        unpenalize(oTest);
    }, timeout)

    test("does isReset work correctly?", async () => {
        expect.assertions(4);
        const
            interval = 20,
            oTest = {},
            cbTest = jest.fn();
        expect(penalize(oTest, {interval, cb: () => {(cbTest())}})).toBe(1); // will cb in (interval) ms
        await awaitableTimeout(interval);

        expect(penalize(oTest, {interval, cb: () => {(cbTest())}})).toBe(2); //will cb in (interval) * 2 ms
        
        await awaitableTimeout((4 * interval) * (2 + 1 + 0.5));
        expect(cbTest).toHaveBeenCalledTimes(2); //first and second calls to penalize fire till here
        expect(isReset(oTest)).toBe(true);

        unpenalize(oTest);
    }, timeout)

    test("testing unpenalize, isPenalized, isReset on non registered objects", async () => {
        expect.assertions(4);
        const 
            undef = void(0),
            oTest = {};
        penalize(oTest, {interval:1000});
        expect(unpenalize(oTest)).toBe(0.5);
        expect(unpenalize({})).toBe(undef); // if never penalized, returns undef, otherwise 0.5

        expect(isPenalized({})).toBe(false);
        
        expect(isReset({})).toBe(true);
    }, timeout)
})
