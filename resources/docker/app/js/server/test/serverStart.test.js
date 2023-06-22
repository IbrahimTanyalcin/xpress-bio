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
        oProcess: null
    };
capture(
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
        kill(serverDetails.oProcess.pid)
    })

    test("check host and port", async () => {
        expect.assertions(2);
        console.log(
            `Jest detected server: 
                host: ${serverDetails.host}
                port: ${serverDetails.port}`
        );
        expect(serverDetails.host).toBeTruthy()
        expect(serverDetails.port).toBeTruthy()
    })

    test("can we make a call to '/'", async () => {
        expect.assertions(1);
        return new Promise(r => {
            http.get(`http://${serverDetails.host}:${serverDetails.port}`, (res) => {
                r(res)
            });
        }).then(response => {
            expect(response.statusCode).toBe(200);
        })
    })

    test("can we make a static call", async () => {
        expect.assertions(2);
        return new Promise(r => {
            http.get(`http://${serverDetails.host}:${serverDetails.port}/static/js/taskq.js`, (res) => {
                r(res)
            });
        }).then(response => {
            expect(response.statusCode).toBe(200);
            const headers = new Map(Object.entries(response.headers))
            expect(headers.has("x-timestamp")).toBeTruthy();
        })
    })
});
