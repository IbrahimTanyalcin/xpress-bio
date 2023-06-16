const
    {constants} = require('fs'),
    {resolve, join} = require('path'),
    {unlink, rm : remove, access} = require("fs/promises");
describe('init', () => {
    const 
        {createFolders} = require("../../createFolders"),
        /*
        custom logs dependent upon console won't do here,
        as JEST will monkey patch console.log
        */
        log = console.log.bind(console),
        cleanUp = {value: void(0)},
        mockNames = ["some-folder", "some-other-folder"],
        fHelper = (...args) => createFolders(...args)
        .then(folderNames => {
            return Promise.all(folderNames.map(d => 
                access(
                    d,
                    constants.F_OK | constants.R_OK
                ).then(undef => d)
                .catch(err => {throw err.message})
            ))
        }); 

    beforeAll(async () => {
       log("General setup");
		void(0);
	});

    afterEach(async () => {
        log(`Clean-up for::<${cleanUp.value}>`);
        await Promise.all(mockNames.map(d => access(
                join(__dirname, d),
                constants.F_OK | constants.R_OK
            )
            .then(() => remove(join(__dirname, d), {recursive: true}))
            .catch((err) => {
                console.log(err.message);
            })
        ))
    });

    test("create a single folder", async () => {
        cleanUp.value = "create a single folder";
        expect.assertions(1);
        let result = await fHelper(__dirname, mockNames[0]);
        expect(result).toEqual([
            join(__dirname, mockNames[0])
        ]);
    })

    test("create multiple folders", async () => {
        cleanUp.value = "create a multiple folders";
        expect.assertions(1);
        let result = await fHelper(__dirname, mockNames);
        expect(result).toEqual(
            mockNames.map(d => join(__dirname, d))
        );
    })

    test("create nested folders with recursive", async () => {
        cleanUp.value = "create nested folders";
        expect.assertions(1);
        let result = await fHelper(
            __dirname, 
            mockNames.map(d => [d, "nested"]),
            {recursive: true}
        );
        expect(result).toEqual(
            mockNames.map(d => join(__dirname, d, "nested"))
        );
    })

    test("parent can be supplied as an array", async () => {
        cleanUp.value = "create a multiple folders";
        expect.assertions(1);
        let result = await fHelper([__filename, ".."], mockNames);
        expect(result).toEqual(
            mockNames.map(d => join(__dirname, d))
        );
    })

    test("optional base can be supplied", async () => {
        cleanUp.value = "optional base can be supplied";
        expect.assertions(1);
        let result = await fHelper(".", mockNames, {base: __dirname});
        expect(result).toEqual(
            mockNames.map(d => join(__dirname, d))
        );
    })

    test("logging can be turned off", async () => {
        cleanUp.value = "logging can be turned off";
        expect.assertions(1);
        let result;
        //pre-create the folders first, then test logging
        for (let rep of Array.from({length: 2})){
            result = await fHelper(
                __dirname, 
                mockNames,
                {log: false}
            );
        }
        expect(result).toEqual(
            mockNames.map(d => join(__dirname, d))
        );
    })

    test.failing("folder names cannot be absolute", async () => {
        cleanUp.value = "folder names cannot be absolute";
        let result;
        try {
            result = await fHelper(__dirname, __filename);
        } catch (err) {
            console.log(err.message);
            throw err;
        }
    })

    test.failing("parent must be a dir", async () => {
        cleanUp.value = "parent must be a dir";
        let result;
        try {
            result = await fHelper(__filename, ".");
        } catch (err) {
            console.log(err.message);
            throw err;
        }
    })

    test.failing("nested folders require recursive flag", async () => {
        cleanUp.value = "nested folders require recursive flag";
        let result;
        try {
            result = await fHelper(__dirname, join(mockNames[0], "some-nested-folder"));
        } catch (err) {
            console.log(err.message);
            throw err;
        }
    })

    test.failing("dryRun option does not create folders", async () => {
        cleanUp.value = "dryRun option does not create folders";
        try {
            await fHelper(
                __dirname, 
                mockNames[0],
                {dryRun:true}   
            );
            await access(
                join(__dirname, mockNames[0]),
                constants.F_OK | constants.R_OK
            )
        } catch (err) {
            console.log(err.message);
            throw err;
        }
    })
})
