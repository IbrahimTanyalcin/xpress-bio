const
    {resolve, join} = require('path');
describe(`testing fileExists`, () => {
    const 
        {fileExists} = require("../../fileExists"),
        absPath = resolve(__dirname, "..", "..", "getInfo.js"),
        rootFolder = resolve(__dirname, "..", "..", "..");

    beforeAll(async () => {
		void(0);
	});

    afterEach(async () => {
        void(0);
    });

    test("check a file that exists", async () => {
        expect.assertions(1);
        let result = await fileExists("getInfo.js", {
            base: join(__dirname, "..", "..")
        });
        expect(result).toEqual(absPath);
    })

    test.failing("check default depth of 1 fail", async () => {
        expect.assertions(1);
        let result = await fileExists("getInfo.js", {
            base: join(__dirname, ".."),
        });
        expect(result).toEqual(absPath);
    })

    test("set depth to 2 to correct above", async () => {
        expect.assertions(1);
        let result = await fileExists("getInfo.js", {
            base: join(__dirname, ".."),
            depth: 2
        });
        expect(result).toEqual(absPath);
    })

    test("check a file that does NOT exists", async () => {
        expect.assertions(1);
        let result = await fileExists("this.file.does.not.exist.js", {
            base: join(__dirname, "..", "..")
        });
        expect(result).toEqual(false);
    })

    test("default base behavior", async () => {
        expect.assertions(1);
        const fileName = "package.json";
        if(process.cwd() !== rootFolder){
            process.chdir(rootFolder)
        }
        let result = await fileExists(fileName);
        expect(result).toEqual(resolve(rootFolder, fileName));
    })
})
