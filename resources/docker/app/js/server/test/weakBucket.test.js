const
    {WeakBucket} = require('../../weakBucket.js');
describe(`testing weakBucket`, () => {

    beforeAll(async () => {
		void(0);
	});

    afterEach(async () => {
        void(0);
    });

    test("general use", async () => {
        expect.assertions(4);
        let 
            wb = new WeakBucket(10);
        for (let i = 0; i < 1000; ++i){
            wb.push({})
        }
        expect(wb.index === 9).toBe(true);
        expect(wb.bucket.length === 10).toBe(true);
        expect(wb.length === 10).toBe(true);
        expect(wb.bucket.filter(d => !(d instanceof WeakRef)).length === 0).toBe(true);
    })

    test("only objects can be pushed into weakbuckets", async () => {
        expect.assertions(7);
        let 
            wb = new WeakBucket(10);
        
        expect(() => {wb.push(5)}).toThrow();
        expect(() => {wb.push("5")}).toThrow();
        expect(() => {wb.push("a")}).toThrow();
        expect(() => {wb.push([1,2,3])}).not.toThrow();
        expect(() => {wb.push({a:1, b:2, c:3})}).not.toThrow();
        expect(() => {wb.push(new Number(5))}).not.toThrow();
        expect(() => {wb.push(new String("a"))}).not.toThrow();
    })

    test("pushing an object increments the index, max index can't be length", async () => {
        expect.assertions(4);
        let 
            len = 10;
            wb = new WeakBucket(len),
            idx = wb.index;
        wb.push({a:1, b:2, c:3})
      
        expect(wb.length).toBe(len);
        expect(wb.index === idx + 1).toBe(true);
        for (let i = 0; i < len; ++i){
            wb.push({a:1, b:2, c:3});
        }
        expect(wb.length).toBe(len);
        expect(wb.index < len).toBe(true);
    })

    test("stat function gives the most recent frequently pushed object", async () => {
        expect.assertions(4);
        let 
            len = 100;
            wb = new WeakBucket(len)
            o1 = {a:1, b:2, c:3},
            o1_ = {a:4, b:5, c:6},
            o2 = {u:11, v:22, w:33};
      
        for (let i = 0; i < len; ++i){
            wb.push(o1);
        }
        const stat1 = wb.stat();  //array of arrays where 0 is the object, 1 is the count [ [ { a: 1, b: 2, c: 3 }, 100 ] ]
        expect(stat1[0]).toEqual([o1, len]);
        
        //push o1_ less than len / 2 times
        const ltHalf = len / 2 - 1 | 0;
        for (let i = 0; i < ltHalf; ++i){
            wb.push(o1_);
        }
        const stat2 = wb.stat();
        expect(stat2[0]).toEqual([o1, len - ltHalf]);

        //push o2
        for (let i = 0; i < ltHalf + 2; ++i){
            wb.push(o2);
        }
        const stat3 = wb.stat();
        expect(stat3[0]).toEqual([o2, ltHalf + 2]);
        //o1 is flushed out
        expect(new Set(stat3.map(d => d[0]))).toEqual(new Set([o1_, o2]))
    })

})
