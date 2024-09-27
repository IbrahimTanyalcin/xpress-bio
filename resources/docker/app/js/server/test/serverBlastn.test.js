const
    {capture} = require('../../capture.js'),
    {getDirs} = require("../../getDirs.js"),
    {until} = require("../../helpers.js"),
    {resolve, join, basename} = require('path'),
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

describe(`checking if the blastn functionality works`, () => {
    const
        /*
            Refer to serverAtomic.test.js for some context
        */
        googleDriveFas = "https://drive.usercontent.google.com/u/0/uc?id=11TbI4TJJiD7lP86VFBeWMmiCa2YAEGpN&export=download",
        preComputedHashes = {
            fas: "11feaa3b6a3d71cb4fff314e5dcbc467", 
            fai: "ff8f7970f5b2a3ca8a4ff5ff026bff1b",
            query: "c2f592c3b94a92f1d8b855f2249bd389"
        },
        rawFileNames = {
            fas: "human.chrX.0to1Mb.fas",
            fai: "human.chrX.0to1Mb.fas.fai",
            query: "1da4bc949c7399f1208587e1e618dad8.txt"
        },
        allTempFiles = [
            resolve(fastaFolder, rawFileNames.fas),
            resolve(faiFolder, rawFileNames.fai)
        ],
        allTempFolders = [
            resolve(blastDbFolder, rawFileNames.fas),
            resolve(blastQueryFolder, rawFileNames.fas)
        ],
        cleanAll = async function(){
            const results = await Promise.all([
                cleanUpFiles(allTempFiles).catch(() => []), 
                cleanUpFolders(allTempFolders).catch(() => [])
            ]).then(arr => arr.flat());
            if (results.some(d => !!d)) {
                throw new Error([
                    "Removal operation failed in ",
                    "some of the files:\n",
                    `${JSON.stringify(results)}`
                ].join(""))
            }
        },
        log = console.log.bind(console); 

    beforeAll(async () => {
        await until(function(){
            return serverDetails.started;
        }, {interval: 500});
        await cleanAll();
    })

    afterAll(async () => {
        await cleanAll();
        kill(serverDetails.oProcess.pid);
        await rootProcess;
    })

    afterEach(async () => {
    })

    /*
        AFAIK, when it comes to tests that are async, Jest does not seem to guarantee order. That is, the
        tests are executed in order, but async functions that are registered for each test do not seem to wait
        for each other. For that reason, the test below has 3 parts: 
        part1 - download the sequence and generate auxiliary indexes etc.
        part2 - use the API to request blast query
        part3 - check the has of the generated file. Only the output format 6 is tested because the default
            format has timestamp which causes the hash to change.
    */
    test("can we download the fasta, create the fasta index and the blast database?", async() => {
        expect.assertions(5); //5 assertions total, part1 - 3, part2 - 1, part3 -1
        const
            rawData = {value: ''},
            cliResponse = await simulClient(serverDetails);
        cliResponse.setEncoding('utf8');
        cliResponse.on('data', chunk => rawData.value += chunk)
        /*
        ###############################################################################
        ###################################</PART1>####################################
        ###############################################################################
        */
        await reqDwnld({
            URI: `http://${serverDetails.host}:${serverDetails.port}/dl/nexus`,
            cliResponse,
            postData: JSON.stringify({payload: googleDriveFas})
        });
        const evtsMatchedAndOrdered = validateSSE(
            rawData,
            /event:\s*worker-dl-start/mi,
            /event:\s*worker-dl-success/mi,
            /event:\s*worker-dl-end/mi
        ),
        indexingComplete = validateSSE(
            rawData,
            /event:\s*worker-fasta-bam-index-end/mi,
        ),
        blastDBComplete = validateSSE(
            rawData,
            /event:\s*worker-blastn-db-creation-start/mi,
            /event:\s*worker-blastn-db-creation-success/mi,
            /event:\s*worker-blastn-db-creation-end/mi,
        ),
        validateTimeout1 = setTimeout(() => {
            evtsMatchedAndOrdered.break();
            indexingComplete.break();
            blastDBComplete.break();
            console.log(rawData.value);
        }, serverDetails.timeout * 3);
        expect(await evtsMatchedAndOrdered).toBe(true);
        expect(await indexingComplete).toBe(true);
        expect(await blastDBComplete).toBe(true);
        clearTimeout(validateTimeout1);
        /*
        ###############################################################################
        ###################################</PART2>####################################
        ###############################################################################
        */
        await reqDwnld({
            URI: `http://${serverDetails.host}:${serverDetails.port}/blast/blastn`,
            cliResponse,
            postData: JSON.stringify({filename: "human.chrX.0to1Mb.fas", query: "TTTAGGAGGACCCAGAGGACCAGGAGATTATG", blastOpts: ""})
        });
        const blastQueryComplete = validateSSE(
            rawData,
            /event:\s*worker-blastn-query-start/mi,
            /event:\s*worker-blastn-query-success/mi,
            /event:\s*worker-blastn-query-end/mi,
        ),
        validateTimeout2 = setTimeout(() => {
            blastQueryComplete.break();
            console.log(rawData.value);
        }, serverDetails.timeout * 3);
        expect(await blastQueryComplete).toBe(true);
        clearTimeout(validateTimeout2);
        /*
        ###############################################################################
        ###################################</PART3>####################################
        ###############################################################################
        */
        expect(await getHashes(
            ...allTempFiles, 
            resolve(blastQueryFolder, rawFileNames.fas, rawFileNames.query)
        ))
        .toEqual(Object.values(preComputedHashes))
    }, serverDetails.timeout * 6);

    /* test("can we make a call to the blastn API", async() => {
        expect.assertions(1);
        const
            rawData = {value: ''},
            cliResponse = await simulClient(serverDetails);
        cliResponse.setEncoding('utf8');
        cliResponse.on('data', chunk => rawData.value += chunk)
        await reqDwnld({
            URI: `http://${serverDetails.host}:${serverDetails.port}/blast/blastn`,
            cliResponse,
            postData: JSON.stringify({filename: "human.chrX.0to1Mb.fas", query: "TTTAGGAGGACCCAGAGGACCAGGAGATTATG", blastOpts: ""})
        });
        const blastQueryComplete = validateSSE(
            rawData,
            /event:\s*worker-blastn-query-start/mi,
            /event:\s*worker-blastn-query-success/mi,
            /event:\s*worker-blastn-query-end/mi,
        ),
        validateTimeout = setTimeout(() => {
            blastQueryComplete.break();
            console.log(rawData.value);
        }, serverDetails.timeout * 3);
        expect(await blastQueryComplete).toBe(true);
        clearTimeout(validateTimeout);
    }, serverDetails.timeout * 3);

    test("placeholder-test", async() => {
        expect.assertions(1);
        expect(true).toBe(true);
    }); */
});
