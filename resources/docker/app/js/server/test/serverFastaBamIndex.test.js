const
    {rm : remove, readFile, copyFile} = require("fs/promises"),
    {fileExists} = require("../../fileExists"),
    {capture} = require('../../capture.js'),
    {until} = require("../../helpers.js"),
    {resolve, join} = require('path'),
    {constants} = require("node:fs"),
    http = require('node:http'),
    kill = require('tree-kill'),
    serverDetails = {
        started: false,
        host: void(0),
        port: void(0),
        oProcess: null,
        timeout: 20000
    },
    rootProcess = capture(
        `/bin/bash ${resolve(
            __dirname,
            "..","..","..",
            "bin",
            "start.sh"
        )}`,
        {
            ondata: ((
                data = "", 
                rgx = /(?:\s+|^)listening\s+on\s+host\s*:\s*(?:>\s*)?(?<host>[^:\s]+)\s*:\s*(?<port>[0-9]+)/im,
                groups = void(0)
            ) => (chunk, cmdStr, rest) => {
                data += chunk;
                if (
                    !serverDetails.started
                    && (groups = rgx.exec(data)?.groups)
                ){
                    serverDetails.started = true;
                    Object.assign(serverDetails, groups);
                }
            })(),
            onstart: function(str, rest){
                serverDetails.oProcess = this;
            }
        }
    )
    .catch((err) => console.log(err));

describe(`testing fasta-bam indexing via samtools`, () => {
    
    /* md5sum testBai => 0effa687f28a96e0f494bf3187328c53*/
    
    const 
        destBadBamName = "jest.test.bad.bam",
        destBadBam = resolve(bamFolder, destBadBamName),
        destBamName = "jest.test.bam",
        destBam = resolve(bamFolder, destBamName),
        destBaiName = destBamName + ".bai",
        destBai = resolve(baiFolder, destBaiName),
        destFasName = "jest.test.fas",
        destFas = resolve(fastaFolder, destFasName),
        destFaiName = destFasName + ".fai",
        destFai = resolve(faiFolder, destFaiName),
        destBadExtNames = ["some-file.badext", "some-file"],
        destBamBadExts = destBadExtNames.map(d => resolve(bamFolder, d)),
        destFasBadExts = destBadExtNames.map(d => resolve(fastaFolder, d)),
        allFiles = [
            destBadBam, destBam, destBai, destFas, destFai, 
            destBamBadExts, destFasBadExts
        ],
        copyBam = (file = testBam, dest = destBam) => copyFile(
            file, 
            dest,
            constants.COPYFILE_EXCL
        ),
        copyFas = (file = testFa, dest = destFas) => copyFile(
            file, 
            dest,
            constants.COPYFILE_EXCL
        );

    beforeAll(async () => {
        await until(function(){
            return serverDetails.started;
        }, {interval: 500});
    })

    afterAll(async () => {
        kill(serverDetails.oProcess.pid);
        await rootProcess;
    })

    afterEach(async () => {
        const results = await cleanUpFiles(allFiles);
        if (results.some(d => !!d)){
            throw new Error([
                "Removal operation failed in ",
                "some of the files:\n",
                `${JSON.stringify(results)}`
            ].join(""))
        }
    })

    test(
        `test single bam:
            - watchers trigger worker#3
            - worker#3 creates bai from bam`,
        async () => {
            expect.assertions(1);
            await copyBam();
            await until(() => fileExists(destBai));
            expect(await compareHashes(testBai, destBai)).toBe(true);
        }
    , serverDetails.timeout)

    test(
        `test single fasta:
            - watchers trigger worker#3
            - worker#3 creates fai from fasta`,
        async () => {
            expect.assertions(1);
            await copyFas();
            await until(() => fileExists(destFai));
            expect(await compareHashes(testFai, destFai)).toBe(true);
        }
    , serverDetails.timeout)

    test("test fasta and bam concurrently", async () => {
        expect.assertions(1);
        await Promise.all([copyBam(), copyFas()]);
        await Promise.all([
            until(() => fileExists(destBai)),
            until(() => fileExists(destFai))
        ]);
        expect(await Promise.all([
            compareHashes(testBai, destBai),
            compareHashes(testFai, destFai)
        ])).toStrictEqual([true, true]);
    }, serverDetails.timeout)

    test(
        `examine sse data for bam files:
            - copying a new bam triggers
                start, success and end events in that order`,
        async () => {
            expect.assertions(1);
            const
                rawData = {value: ''},
                cliResponse = await simulClient(serverDetails);
            cliResponse.setEncoding('utf8');
            cliResponse.on('data', chunk => rawData.value += chunk);
            await copyBam();
            const evts = validateSSE(
                rawData,
                /event:\s*worker-fasta-bam-index-start/mi,
                /event:\s*worker-fasta-bam-index-success/mi,
                /event:\s*worker-fasta-bam-index-end/mi,
            );
            expect(await evts).toBe(true);
        }
    , serverDetails.timeout)

    test(
        `examine sse data for fasta files:
            - copying a new fasta triggers
                start, success and end events in that order`,
        async () => {
            expect.assertions(1);
            const
                rawData = {value: ''},
                cliResponse = await simulClient(serverDetails);
            cliResponse.setEncoding('utf8');
            cliResponse.on('data', chunk => rawData.value += chunk);
            await copyFas();
            const evts = validateSSE(
                rawData,
                /event:\s*worker-fasta-bam-index-start/mi,
                /event:\s*worker-fasta-bam-index-success/mi,
                /event:\s*worker-fasta-bam-index-end/mi,
            );
            expect(await evts).toBe(true);
        }
    , serverDetails.timeout)

    test(
        `examine sse data for faulty files:
            - trying to index a bam or fasta with
                the correct extension but incorrect 
                format, triggers error via samtools
                which is emitted as fail event`,
        async () => {
            expect.assertions(1);
            const
                rawData = {value: ''},
                cliResponse = await simulClient(serverDetails);
            cliResponse.setEncoding('utf8');
            cliResponse.on('data', chunk => rawData.value += chunk);
            await copyBam(badBam, destBadBam);
            const evts = validateSSE(
                rawData,
                /event:\s*worker-fasta-bam-index-start/mi,
                /event:\s*worker-fasta-bam-index-indexing-fail/mi,
                /event:\s*worker-fasta-bam-index-end/mi,
            );
            expect(await evts).toBe(true);
        }
    , serverDetails.timeout)

    test.each([
        ...destBamBadExts,
        ...destFasBadExts
    ].map((d,i) => [d, destBadExtNames[i % 2]]))(
        `examine sse data for bad extensions:
            - extensions supported are:
                [".fa", ".fas", ".fasta", ".bam"]
            - other extensions throw bad filename event
                IF submitted by a user through API
            - testing %s as %s`,
        async (destination, filename) => {
            expect.assertions(1);
            const
                rawData = {value: ''},
                cliResponse = await simulClient(serverDetails);
            cliResponse.setEncoding('utf8');
            cliResponse.on('data', chunk => rawData.value += chunk);
            await copyBam(fileWithBadExtension, destination);
            await reqDwnld({
                URI: `http://${serverDetails.host}:${serverDetails.port}/samtools/index`,
                cliResponse,
                postData: JSON.stringify({filename})
            })
            const evts = validateSSE(
                rawData,
                /event:\s*worker-fasta-bam-index-bad-filename/mi
            );
            expect(await evts).toBe(true);
        }
    , serverDetails.timeout)

    test(
        `examine sse data for surplus bam:
            - if a bai complement of bam file
                exist, without force option, file
                exists event fires`,
        async () => {
            expect.assertions(1);
            /* copy the file and make sure bai exists */
            await copyBam();
            await until(() => fileExists(destBai));
            const
                rawData = {value: ''},
                cliResponse = await simulClient(serverDetails);
            cliResponse.setEncoding('utf8');
            cliResponse.on('data', chunk => rawData.value += chunk);
            await reqDwnld({
                URI: `http://${serverDetails.host}:${serverDetails.port}/samtools/index`,
                cliResponse,
                postData: JSON.stringify({filename: destBamName})
            })
            const evts = validateSSE(
                rawData,
                /event:\s*worker-fasta-bam-index-file-exists/mi
            );
            expect(await evts).toBe(true);
        }
    , serverDetails.timeout)

    test(
        `examine sse data for surplus bam with force option`,
        async () => {
            expect.assertions(1);
            /* copy the file and make sure bai exists */
            await copyBam();
            await until(() => fileExists(destBai));
            const
                rawData = {value: ''},
                cliResponse = await simulClient(serverDetails);
            cliResponse.setEncoding('utf8');
            cliResponse.on('data', chunk => rawData.value += chunk);
            await reqDwnld({
                URI: `http://${serverDetails.host}:${serverDetails.port}/samtools/index`,
                cliResponse,
                postData: JSON.stringify({filename: destBamName, force: true})
            })
            const evts = validateSSE(
                rawData,
                /event:\s*worker-fasta-bam-index-start/mi,
                /event:\s*worker-fasta-bam-index-success/mi,
                /event:\s*worker-fasta-bam-index-end/mi,
            );
            expect(await evts).toBe(true);
        }
    , serverDetails.timeout)

    test.each([
        /* filename, force */
        [destBamName, false],
        [destBamName, true],
        [destFasName, false],
        [destFasName, true],
    ])(
        `examine sse data for %s (force: %s) that does not exist`,
        async (filename, force) => {
            expect.assertions(1);
            const
                rawData = {value: ''},
                cliResponse = await simulClient(serverDetails);
            cliResponse.setEncoding('utf8');
            cliResponse.on('data', chunk => rawData.value += chunk);
            await reqDwnld({
                URI: `http://${serverDetails.host}:${serverDetails.port}/samtools/index`,
                cliResponse,
                postData: JSON.stringify({filename, force})
            })
            const evts = validateSSE(
                rawData,
                /event:\s*worker-fasta-bam-index-file-does-not-exist/mi,
            );
            expect(await evts).toBe(true);
        }
    , serverDetails.timeout)

    test(
        `examine sse data for surplus fasta:
            - if a fai complement of fasta file
                exist, without force option, file
                exists event fires`,
        async () => {
            expect.assertions(1);
            /* copy the file and make sure fai exists */
            await copyFas();
            await until(() => fileExists(destFai));
            const
                rawData = {value: ''},
                cliResponse = await simulClient(serverDetails);
            cliResponse.setEncoding('utf8');
            cliResponse.on('data', chunk => rawData.value += chunk);
            await reqDwnld({
                URI: `http://${serverDetails.host}:${serverDetails.port}/samtools/index`,
                cliResponse,
                postData: JSON.stringify({filename: destFasName})
            })
            const evts = validateSSE(
                rawData,
                /event:\s*worker-fasta-bam-index-file-exists/mi
            );
            expect(await evts).toBe(true);
        }
    , serverDetails.timeout)

    test(
        `examine sse data for surplus fasta with force option`,
        async () => {
            expect.assertions(1);
            /* copy the file and make sure fai exists */
            await copyFas();
            await until(() => fileExists(destFai));
            const
                rawData = {value: ''},
                cliResponse = await simulClient(serverDetails);
            cliResponse.setEncoding('utf8');
            cliResponse.on('data', chunk => rawData.value += chunk);
            await reqDwnld({
                URI: `http://${serverDetails.host}:${serverDetails.port}/samtools/index`,
                cliResponse,
                postData: JSON.stringify({filename: destFasName, force: true})
            })
            const evts = validateSSE(
                rawData,
                /event:\s*worker-fasta-bam-index-start/mi,
                /event:\s*worker-fasta-bam-index-success/mi,
                /event:\s*worker-fasta-bam-index-end/mi,
            );
            expect(await evts).toBe(true);
        }
    , serverDetails.timeout)
});
