const 
    {resolve, join} = require('path'),
    rootFolder = resolve(__dirname, "..", "..", ".."),
    staticFolder = join(rootFolder, "src", "public", "assets"),
    fixturesFolder = resolve(__dirname, "fixtures");
Object.assign(
    global,
    {
        simulClient: require("./fixtures/simulClient.js"),
        reqDwnld: require("./fixtures/reqDwnld.js"),
        validateSSE: require("./fixtures/validateSSE.js"),
        compareHashes: require("./fixtures/compareHashes.js"),
        cleanUpFiles: require("./fixtures/cleanUpFiles.js"),
        rootFolder,
        staticFolder,
        fixturesFolder,
        ...(Object.entries({
            "bam": "bam", "bai": "bai", "fasta": "fa", "fai": "fai"
        })
        .reduce((ac,[name, folder]) => (
            ac[name + "Folder"] = join(staticFolder, folder), 
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