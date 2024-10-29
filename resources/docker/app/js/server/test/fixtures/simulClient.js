const http = require('node:http');

/**
@description simulates a client navigating to '/',
saving a session cookie and openning
a live TCP connection for server-sent events
@param {Object} serverDetails an object about server info
path to the directiory under which the folders
will be created.
@param {string} serverDetails.host host
@param {string|number} serverDetails.port port
@param {number} serverDetails.timeout timeout in milliseconds
@returns {Promise<http.IncomingMessage>} an `http.IncomingMessage` type from
Node that has an extra `__cliCookie` array as property
@example
const cliResponse = await simulClient(serverDetails);
*/
const simulClient = (serverDetails) => new Promise((r, j) => {
    let timeout = setTimeout(
        ()=> j(new Error (
            "Client request simulation timedout"
        )),
        serverDetails?.timeout ?? 5000
    );
    try {
        http.get(`http://${serverDetails.host}:${serverDetails.port}`, (res) => {
            if (res.statusCode !== 200) {
                throw new Error("Base route non 200 status")
            }
            const 
                headers = new Map(Object.entries(res.headers)),
                cookie = headers.get("set-cookie")?.map(d => d.split(';')[0]);
            http.get(
                `http://${serverDetails.host}:${serverDetails.port}/estream/subscribe`, 
                {headers: {cookie}},
                (res) => {
                    if (res.statusCode !== 200) {
                        throw new Error("Event stream non 200 status")
                    } else if (
                        !res.headers
                        ?.["content-type"]
                        ?.toString()
                        ?.toLowerCase()
                        ?.includes("text/event-stream")
                    ) {
                        throw new Error("Event stream has wrong content-type")
                    }
                    res.__cliCookie = cookie;
                    clearTimeout(timeout);
                    r(res)
                }
            )
        })
    } catch (err) {
        j(err)
    }
});
module.exports = simulClient;