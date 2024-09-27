const 
    {resolve, join} = require('path'),
    rootFolder = resolve(__dirname, "..", "..", ".."),
    binFolder = resolve(rootFolder, "bin"),
    staticFolder = join(rootFolder, "src", "public", "assets"),
    testFolder = __dirname,
    fixturesFolder = resolve(__dirname, "fixtures"),
    tempFolder = resolve(__dirname, "temp");
Object.assign(
    global,
    {
        simulClient: require("./fixtures/simulClient.js"),
        reqDwnld: require("./fixtures/reqDwnld.js"),
        validateSSE: require("./fixtures/validateSSE.js"),
        compareHashes: require("./fixtures/compareHashes.js"),
        getHashes: require("./fixtures/getHashes.js"),
        cleanUpFiles: require("./fixtures/cleanUpFiles.js"),
        cleanUpFolders: require("./fixtures/cleanUpFolders.js"),
        rootFolder,
        binFolder,
        staticFolder,
        testFolder,
        fixturesFolder,
        tempFolder,
        ...(Object.entries({
            "bam": "bam", "bai": "bai", "fasta": "fa", "fai": "fai", "blastDb": ["blast", "db"], "blastQuery": ["blast", "query"]
        })
        .reduce((ac,[name, folder]) => (
            ac[name + "Folder"] = folder instanceof Array ? join(staticFolder, ...folder) : join(staticFolder, folder), 
            ac
        ),{})),
        badBam: resolve(fixturesFolder, "not.a.bam.test.bam"),
        testBam: resolve(fixturesFolder, "test.bam"),
        testFa: resolve(fixturesFolder, "example.fas"),
        testBai: resolve(fixturesFolder, "test.bam.bai"),
        testFai: resolve(fixturesFolder, "example.fas.fai"),
        fileWithBadExtension: resolve(fixturesFolder, "some-file.badext")
    }
)