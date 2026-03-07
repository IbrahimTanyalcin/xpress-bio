const
    {writeFile, utimes} = require("fs/promises"),
    {capture} = require('../../capture.js'),
    {until} = require("../../helpers.js"),
    genHexStr = require("../../genHexStr.js"),
    {resolve, join} = require('path'),
    {setTimeout: awaitableTimeout} = require("node:timers/promises"),
    kill = require('tree-kill'),
    restartRgx = /\[nodemon\]\s*restarting\s+due\s+to\s+changes/im,
    listeningRgx = /(?:\s+|^)listening\s+on\s+host\s*:\s*(?:>\s*)?(?<host>[^:\s]+)\s*:\s*(?<port>[0-9]+)/im,
    serverOutput = {data: ""},
    serverDetails = {
        started: false,
        host: void(0),
        port: void(0),
        oProcess: null,
        timeout: 30000
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
                rgx = listeningRgx,
                groups = void(0)
            ) => (chunk, cmdStr, rest) => {
                serverOutput.data += chunk;
                if (
                    !serverDetails.started
                    && (groups = rgx.exec(serverOutput.data)?.groups)
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

describe(`testing nodemon --ignore and restart behavior`, () => {
    const
        rndSuffix = genHexStr(8, 3),
        tempFileName = `whatever_${rndSuffix}.txt`,
        tempFilePath = resolve(staticFolder, "js", tempFileName),
        restartTxtPath = resolve(__dirname, "..", "restart.txt"),
        log = console.log.bind(console),
        noRestartWait = 5000;

    beforeAll(async () => {
        await until(function(){
            return serverDetails.started;
        }, {interval: 500});
    });

    afterAll(async () => {
        await cleanUpFiles([tempFilePath], {dryRun: false});
        kill(serverDetails.oProcess.pid);
        await rootProcess;
    });

    test(
        `creating a .txt file under src/public/assets/js/ should NOT trigger nodemon restart`,
        async () => {
            expect.assertions(1);
            const snapshotLen = serverOutput.data.length;
            await writeFile(tempFilePath, "nodemon-ignore-test");
            /* 
                wait a reasonable amount of time — if nodemon were going 
                to restart, it would do so within a few seconds 
            */
            await awaitableTimeout(noRestartWait);
            const newOutput = serverOutput.data.slice(snapshotLen);
            expect(restartRgx.test(newOutput)).toBe(false);
        },
        serverDetails.timeout
    );

    test(
        `touching js/server/restart.txt should trigger nodemon restart`,
        async () => {
            expect.assertions(1);
            const snapshotLen = serverOutput.data.length;
            /* touch restart.txt by updating its timestamps */
            const now = new Date();
            await utimes(restartTxtPath, now, now);
            /* wait for nodemon to print the restart message */
            const restarted = until(function(){
                const newOutput = serverOutput.data.slice(snapshotLen);
                return restartRgx.test(newOutput);
            }, {interval: 500});
            const validateTimeout = setTimeout(() => {
                restarted.break();
                log("Timed out waiting for nodemon restart. Output since touch:\n", 
                    serverOutput.data.slice(snapshotLen));
            }, serverDetails.timeout);
            expect(await restarted).toBe(true);
            clearTimeout(validateTimeout);
        },
        serverDetails.timeout
    );
});
