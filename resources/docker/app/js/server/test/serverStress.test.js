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

describe(`testing cold server start`, () => {
    beforeAll(async () => {
        await until(function(){
            return serverDetails.started;
        }, {interval: 500})
    })

    afterAll(async () => {
        kill(serverDetails.oProcess.pid);
        await rootProcess;
    })

    /*
    default memcached conf in /etc/memcached.conf is about
    64mb of memory. 30 clients should be ok. To support up to 
    1000s of clients, increase it to something like 2048 etc.
    Also the default poolsize option in server config has been 
    increased to 100
    */
    test(`are we able to handle ${nClients} clients?`, async () => {
        expect.assertions(2);
        return Promise.allSettled(
            [...Array(nClients)]
            .map(d => simulClient(serverDetails))
        ).then(async (results) => {
            expect(results.map(d => d.value?.statusCode))
            .toEqual([...Array(nClients)].map(d => 200));
            const [{value:lastCli}] = results.slice(-1);
            let rawData = '';
            lastCli.setEncoding('utf8');
            lastCli.on('data', chunk => rawData += chunk)
            //check if we really have n clients live
            return await until(function(){
                return this.test(rawData)
            },{
                thisArg: new RegExp(
                    `data:\\s*\\x22?size\\x22?\\s*:\\s*${nClients}`,
                    "mi"
                ), 
                interval: 100
            })
        }).then(val => expect(val).toBe(true))
    }, serverDetails.timeout);
});
