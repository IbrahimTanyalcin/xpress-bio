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

    test("test server-sent events", async () => {
        expect.assertions(2);
        return new Promise(r => {
            http.get(`http://${serverDetails.host}:${serverDetails.port}/estream/subscribe`, (res) => {
                r(res)
            });
        }).then(response => {
            expect(response.statusCode).toBe(200);
            expect(
                response.headers
                ?.["content-type"]
                ?.toString()
                ?.toLowerCase()
                ?.includes("text/event-stream")
            ).toBeTruthy();
        })
    })

    test("server-sent events should create a stream", async () => {
        expect.assertions(3);
        return new Promise(r => {
            http.get(`http://${serverDetails.host}:${serverDetails.port}/estream/subscribe`, (res) => {
                r(res)
            });
        }).then(async (response) => {
            expect(response.statusCode).toBe(200);
            expect(
                response.headers
                ?.["content-type"]
                ?.toString()
                ?.toLowerCase()
                ?.includes("text/event-stream")
            ).toBeTruthy();
            const evtHaystack = await new Promise(res => {
                let rawData = '',
                    matchers = [
                        /event:\s*connection(?:-|\s+)established/mi,
                        /data:\s*connection(?:-|\s+)established/mi,
                        /event:\s*bam-file-list/mi,
                        /event:\s*fa-file-stats/mi,
                        /data:\s*(?:\{|\})/mi,
                    ];
                response.setEncoding('utf8');
                response.on('data', (chunk) => { 
                    rawData += chunk; 
                    if(matchers.every(d => d.test(rawData))){
                        res("all-found");
                    }
                });
            });
            expect(evtHaystack).toBe("all-found");
        })
    }, 10000)
    
    test("server-sent events should not allow multiple sockets for same session",async () => {
        expect.assertions(2);
        const cliResponse = await simulClient(serverDetails);
        await new Promise(r => http.get(
            `http://${serverDetails.host}:${serverDetails.port}/estream/subscribe`, 
            {headers: {Cookie: cliResponse.__cliCookie}},
            (res) => {
                r(res)
            }
        )).then(async (res) => {
            let rawData = '';
            res.setEncoding('utf8');
            res.on("data",(chunk) => {
                rawData += chunk;
            });
            return await until(() => {
                try {
                    return {res, ...JSON.parse(rawData)}
                } catch {
                    return false
                }
            })
        }).then(({res, message}) => {
            expect(res.statusCode).toBe(429);
            expect(message).toBe("You already have a live TCP connection.")
        })
    });
});
