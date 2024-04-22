const
    {capture} = require('../../capture.js'),
    {until, btoa} = require("../../helpers.js"),
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
        )} -j ${btoa(JSON.stringify({
            uriWhiteList: [
            ],
            uriBlackList: [
                "^https://www.google.com",
                `^https://gist.github.com/`
            ]
        }))}`,
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

describe(`testing uri blacklisting functionality via -j/--jsonconf`, () => {
    beforeAll(async () => {
        await until(function(){
            return serverDetails.started;
        }, {interval: 500})
    })

    afterAll(async () => {
        kill(serverDetails.oProcess.pid);
        await rootProcess;
    })

    test(`If a URI matches one of the items in blacklist, worker-bad-host event is fired`, async () => {
        expect.assertions(1);
        const
            rawData = {value: ''},
            cliResponse = await simulClient(serverDetails);
        cliResponse.setEncoding('utf8');
        cliResponse.on('data', chunk => rawData.value += chunk)
        await reqDwnld({
            URI: `http://${serverDetails.host}:${serverDetails.port}/dl/nexus`,
            cliResponse,
            postData: JSON.stringify({payload: "https://www.google.com/"})
        });
        const evtsMatchedAndOrdered = await validateSSE(
            rawData,
            /event:\s*worker-bad-host/mi,
            /data:\s*URI\s+is\s+in\s+the\s+blacklist/mi
        );
        console.log(rawData.value);
        expect(evtsMatchedAndOrdered).toBe(true);
    }, serverDetails.timeout);

    test(`Blacklists are evaluated after whitelists so if you add a safe resource, it will fire worker-bad-host event`, async () => {
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
            /event:\s*worker-bad-host/mi,
            /data:\s*URI\s+is\s+in\s+the\s+blacklist/mi
        );
        console.log(rawData.value);
        expect(evtsMatchedAndOrdered).toBe(true);
    }, serverDetails.timeout);
});
