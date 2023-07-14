const
    {capture} = require('../../capture.js'),
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
    nClients = 100,
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

describe(`testing download from URIs`, () => {
    beforeAll(async () => {
        await until(function(){
            return serverDetails.started;
        }, {interval: 500})
    })

    afterAll(async () => {
        kill(serverDetails.oProcess.pid);
        await rootProcess;
    })

    test(`URIs that are not allowed emit worker-bad-host event`, async () => {
        expect.assertions(1);
        const
            rawData = {value: ''},
            cliResponse = await simulClient(serverDetails);
        cliResponse.setEncoding('utf8');
        cliResponse.on('data', chunk => rawData.value += chunk)
        await reqDwnld({
            URI: `http://${serverDetails.host}:${serverDetails.port}/dl/nexus`,
            cliResponse,
            postData: JSON.stringify({payload: "https://nodejs.org/"})
        });
        const evtsMatchedAndOrdered = await validateSSE(
            rawData,
            /event:\s*worker-bad-host/mi
        );
        console.log(rawData.value);
        expect(evtsMatchedAndOrdered).toBe(true);
    }, serverDetails.timeout);

    test(`allowed URIs emit ordered events`, async () => {
        expect.assertions(1);
        const
            rawData = {value: ''},
            cliResponse = await simulClient(serverDetails);
        cliResponse.setEncoding('utf8');
        cliResponse.on('data', chunk => rawData.value += chunk)
        await reqDwnld({
            URI: `http://${serverDetails.host}:${serverDetails.port}/dl/nexus`,
            cliResponse,
            postData: JSON.stringify({payload: "https://gist.github.com/IbrahimTanyalcin/ecf5f91d86a07e31a038283148b4a52e/archive/35deaee01bcfd2c58c24df709f6d6b2a0edc0247.tar.gz"})
        });
        const evtsMatchedAndOrdered = await validateSSE(
            rawData,
            /event:\s*worker-dl-start/mi,
            /event:\s*worker-dl-success/mi,
            /*
            there is normally 'worker-dl-progress' event fired
            multiple times here, but github does not send
            'content-length' headers
            Also, if the 'example.fas' file is downloaded, server
            should send all clients a 'fa-file-stats' event right
            after 'worker-dl-end' event
            */
            new RegExp([
                "event:\\s*worker-dl-end\\n",
                "data:\\s*[A-Z0-9\\-]+?\\.tar\\.gz\\n\\n",
                "event:\\s*fa-file-stats\\n",
                "data:\\s*\\{\\n",
                "data:\\s*\"example\\.fas\":\\s*[0-9]+\\n",
                "data:\\s*\\}"
            ].join(""),"i")
        );
        console.log(rawData.value);
        expect(evtsMatchedAndOrdered).toBe(true);
    }, serverDetails.timeout);
});
