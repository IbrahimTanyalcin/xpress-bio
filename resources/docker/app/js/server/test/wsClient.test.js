const
    {capture} = require('../../capture.js'),
    {until} = require("../../helpers.js"),
    {resolve} = require('path'),
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

describe('WebSocket client tests', () => {
    beforeAll(async () => {
        await until(function(){
            return serverDetails.started;
        }, {interval: 500})
    });

    afterAll(async () => {
        kill(serverDetails.oProcess.pid);
        await rootProcess;
    });

    describe('PART 1: two clients exchange chat messages and ACKs', () => {
        test('both clients receive the other\'s message and an ACK', async () => {
            expect.assertions(4);

            const client1 = await simulWsClient(serverDetails);
            const client2 = await simulWsClient(serverDetails);

            // Fire-and-forget: trigger chat ready on both
            client1.send("user-chat-ready", "empty");
            client2.send("user-chat-ready", "empty");

            // Collect user-chat-all messages received by each client
            const client1Received = [];
            const client2Received = [];

            let timedout = void(0);
            const allDone = new Promise((resolve) => {
                const checkDone = () => {
                    if (client1Received.length >= 2 && client2Received.length >= 2) {
                        resolve();
                        clearTimeout(timedout);
                    }
                };

                client1.onEvent("user-chat-all", (parsed) => {
                    client1Received.push(parsed.payloadStr);
                    // When client1 sees client2's message, reply ACK
                    if (parsed.payloadStr === "cli-2") {
                        client1.send("user-chat", "ACK");
                    }
                    checkDone();
                });

                client2.onEvent("user-chat-all", (parsed) => {
                    client2Received.push(parsed.payloadStr);
                    // When client2 sees client1's message, reply ACK
                    if (parsed.payloadStr === "cli-1") {
                        client2.send("user-chat", "ACK");
                    }
                    checkDone();
                });
            });

            // Initiate the chat exchange
            client1.send("user-chat", "cli-1");
            client2.send("user-chat", "cli-2");

            // Wait for all 4 messages (2 per client) or timeout
            await Promise.race([
                allDone,
                new Promise((_, rej) => timedout = setTimeout(
                    () => rej(new Error(
                        `Chat exchange timed out. `
                        + `client1 received: [${client1Received}], `
                        + `client2 received: [${client2Received}]`
                    )),
                    15000
                ))
            ]);

            // client1 should have received "cli-2" and "ACK"
            expect(client1Received).toContain("cli-2");
            expect(client1Received).toContain("ACK");

            // client2 should have received "cli-1" and "ACK"
            expect(client2Received).toContain("cli-1");
            expect(client2Received).toContain("ACK");

            client1.close();
            client2.close();
        }, 20000);
    });

    describe('PART 2: WebSocket origin check guardrails', () => {
        test('connection with bad origin is rejected with 403', async () => {
            expect.assertions(1);
            try {
                const client = await simulWsClient(serverDetails, {
                    origin: "http://evil.com",
                    timeout: 5000
                });
                client.close();
                // Should not reach here
                expect(true).toBe(false);
            } catch (err) {
                expect(err.statusCode).toBe(403);
            }
        }, 10000);

        test('connection with no origin header is rejected with 403', async () => {
            expect.assertions(1);
            try {
                const client = await simulWsClient(serverDetails, {
                    origin: false,
                    timeout: 5000
                });
                client.close();
                // Should not reach here
                expect(true).toBe(false);
            } catch (err) {
                expect(err.statusCode).toBe(403);
            }
        }, 10000);

        test('connection with valid origin succeeds and receives namespace', async () => {
            expect.assertions(2);
            const client = await simulWsClient(serverDetails);
            expect(client.channel).toBe("channel1");
            expect(client.namespace).toBeTruthy();
            client.close();
        }, 10000);
    });
});
