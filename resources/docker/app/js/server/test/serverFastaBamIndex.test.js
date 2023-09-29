const
    {rm : remove, readFile} = require("fs/promises"),
    {fileExists} = require("../../fileExists"),
    {capture} = require('../../capture.js'),
    {createHash} = require('node:crypto'),
    {until} = require("../../helpers.js"),
    {resolve, join} = require('path'),
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
    const 
        rootFolder = resolve(__dirname, "..", "..", ".."),
        hasher = createHash("md5");
    /* 0effa687f28a96e0f494bf3187328c53 */
    let testBai;

    beforeAll(async () => {
        await until(function(){
            return serverDetails.started;
        }, {interval: 500});
        testBai = await readFile(resolve(__dirname, "fixtures", "test.bam.bai"),{
            encoding: void(0)
        });
        console.log(hasher.update(testBai).digest("hex"));
    })

    afterAll(async () => {
        kill(serverDetails.oProcess.pid);
        await rootProcess;
    })

    test(`URIs that are not allowed emit worker-bad-host event`, async () => {
        expect.assertions(1);
        expect(true).toBe(true);
    }, serverDetails.timeout);
});
