const
    {constants} = require('fs'),
    {resolve, join, basename} = require('path'),
    {until} = require("../../helpers.js"),
    {getDirs} = require("../../getDirs.js"),
    {capture} = require('../../capture.js'),
    {fileExists} = require("../../fileExists"),
    {createFolders} = require("../../createFolders"),
    {unlink, rm : remove, access} = require("fs/promises");
describe(`testing app/bin/downloadX.sh`, () => {
    /*
        custom logs dependent upon console won't do here,
        as JEST will monkey patch console.log
    */
    const
        scriptName = "downloadX.sh",
        sh = resolve(binFolder, scriptName),
        timeout = 20000,
        archive = "https://gist.github.com/IbrahimTanyalcin/efbbc63ab7295a0f7f9cd2092fb915fd/archive/53428dc74007356d528efd86b0ab6271a6271eab.tar.gz",
        rawPath = "https://gist.githubusercontent.com/IbrahimTanyalcin/efbbc63ab7295a0f7f9cd2092fb915fd/raw/53428dc74007356d528efd86b0ab6271a6271eab/",
        preComputedHashes = {fas: "c872ae017ec1c37a4ddb384412347f26", fai: "15711f3e8c9512a599d2fada387db164"},
        rawFileNames = {fas: "example-2.fas", fai: "example-2.fas.fai", digest: "md5digest", archive: "archive.tar.gz", libcurl: "libcurl.c"},
        allTempFiles = Object.values(rawFileNames).map(d => resolve(tempFolder, d)),
        rawFiles = Object.fromEntries(Object.entries(rawFileNames).map(([k,v]) => [k, `${rawPath}${v}`])),
        log = console.log.bind(console),
        cleanUp = {value: void(0)},
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
        await fHelper(testFolder, "temp");
	});

    afterAll(async () => {
        log("Removing 'test/temp' folder");
        await cleanUpFolders(tempFolder);
    })

    afterEach(async () => {
        const results = await cleanUpFiles(allTempFiles);
        if (results.some(d => !!d)) {
            throw new Error([
                "Removal operation failed in ",
                "some of the files:\n",
                `${JSON.stringify(results)}`
            ].join(""))
        }
    })

    test("an archive can be downloaded", async () => {
        expect.assertions(1);
        const dest = resolve(tempFolder, rawFileNames.archive);
        await capture(`/bin/bash ${sh} ${archive} ${dest}`);
        expect(await fileExists(dest)).toBeTruthy();
    }, timeout);

    test("can we extract part of the archive?", async() => {
        expect.assertions(2);
        const 
            dest = resolve(tempFolder, rawFileNames.archive),
            folder = await capture(`/bin/bash ${sh} ${archive} ${dest} --rm 1 ".fas" ".fai"`),
            fullFolder = resolve(tempFolder, folder.split("\r").pop()),
            fullFas = resolve(fullFolder, rawFileNames.fas),
            fullFai = resolve(fullFolder, rawFileNames.fai);
        expect(await fileExists(fullFas)).toBeTruthy();
        expect(await fileExists(fullFai)).toBeTruthy();
    }, timeout);

    test("can we extract files that don't have extension from the archive? [This extracts everything else too!]", async() => {
        expect.assertions(3);
        const 
            dest = resolve(tempFolder, rawFileNames.archive),
            folder = await capture(`/bin/bash ${sh} ${archive} ${dest} --rm 1 ""`),
            fullFolder = resolve(tempFolder, folder.split("\r").pop()),
            fullFas = resolve(fullFolder, rawFileNames.fas),
            fullFai = resolve(fullFolder, rawFileNames.fai),
            fullDigest = resolve(fullFolder, rawFileNames.digest);
        expect(await fileExists(fullFas)).toBeTruthy();
        expect(await fileExists(fullFai)).toBeTruthy();
        expect(await fileExists(fullDigest)).toBeTruthy();
    }, timeout);

    test("can we download raw files", async () => {
        expect.assertions(1);
        const dest = resolve(tempFolder, rawFileNames.fai);
        await capture(`/bin/bash ${sh} ${rawFiles.fai} ${dest}`);
        expect(await getHashes(dest)).toEqual([preComputedHashes.fai]);
    }, timeout);

    test("does the --atomic argument create a temporary folder?", async () => {
        expect.assertions(2);
        let tempFolderDetected = false,
            watcher = until(async () => {
                if((await getDirs(tempFolder)).some(d => basename(d).startsWith("temp."))) {
                    return tempFolderDetected = true;
                }
            }, {interval: 50});
        const dest = resolve(tempFolder, rawFileNames.fas);
        await capture(`/bin/bash ${sh} ${rawFiles.fas} --atomic ${tempFolder} ${dest}`);
        watcher.break();
        expect(await getHashes(dest)).toEqual([preComputedHashes.fas]);
        expect(tempFolderDetected).toBe(true);
    }, timeout * 2);

    /* 
        Here I am using the --libcurl option to 
        generate a libcurl.c file and checking its existence 
    */
    test("can we pass additional args to curl?", async () => {
        expect.assertions(2);
        const 
            dest = resolve(tempFolder, rawFileNames.fai),
            libcurl = resolve(tempFolder, rawFileNames.libcurl);
        await capture(`/bin/bash ${sh} ${rawFiles.fai} --atomic ${tempFolder} ${dest} -- --libcurl "${libcurl}"`);
        expect(await getHashes(dest)).toEqual([preComputedHashes.fai]);
        expect(await fileExists(libcurl)).toBeTruthy();
    }, timeout);
})
