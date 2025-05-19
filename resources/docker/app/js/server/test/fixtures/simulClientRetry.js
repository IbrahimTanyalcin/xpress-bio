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
const cliResponse = await simulClientRetry(serverDetails);
*/
const simulClientRetry = (serverDetails) => new Promise(async (r, j) => {
    try {
        let retry = serverDetails?.retry ?? 3;
        if (!retry){
            throw new Error("Maximum amount of retries were reached")
        }
        let delay = serverDetails?.delay ?? 0,
            iteration = serverDetails?.iteration ?? 0,
            retryPenalty = serverDetails?.retryPenalty ?? 100;
        await new Promise((r) => setTimeout(r, delay));
        await new Promise((r) => setTimeout(r, iteration * retryPenalty));
        console.log("AWAITING FINISHED!");
        let timeout = setTimeout(
                ()=> j(new Error (
                    "Client request simulation timedout"
                )),
                /* serverDetails?.timeout ?? */ 5000
            ),
            agent = serverDetails?.agent ?? new http.Agent({keepAlive: false, timeout: serverDetails?.timeout ?? 120000});
        const handleRetry = (err) => {
            clearTimeout(timeout); // Clear timeout before retrying
            console.log(`Retrying due to error: ${err.message}. Attempts left: ${retry - 1}`);
            // Retry with decremented retry count and backoff
            r(simulClientRetry({ ...serverDetails, agent, iteration: ++iteration, retry: --retry, delay: 0}));
        };
        http.get(`http://${serverDetails.host}:${serverDetails.port}`, {agent}, (res) => {
            if (res.statusCode !== 200) {
                return handleRetry(new Error("Base route non 200 status"));
            }
            const 
                headers = new Map(Object.entries(res.headers)),
                cookie = headers.get("set-cookie")?.map(d => d.split(';')[0]);
            http.get(
                `http://${serverDetails.host}:${serverDetails.port}/estream/subscribe`, 
                {headers: {cookie}, agent},
                (res) => {
                    if (res.statusCode !== 200) {
                        return handleRetry(new Error("Event stream non 200 status"));
                    } else if (
                        !res.headers
                        ?.["content-type"]
                        ?.toString()
                        ?.toLowerCase()
                        ?.includes("text/event-stream")
                    ) {
                        return handleRetry(new Error("Event stream has wrong content-type"));
                    }
                    res.__cliCookie = cookie;
                    clearTimeout(timeout);
                    r(res)
                }
            ).on("error", (err) => {
                console.log("Inner REQ ERR:", err);
                handleRetry(err)
            })
        }).on("error", (err) => {
            console.log("Outer REQ ERR:", err);
            handleRetry(err)
        })
    } catch (err) {
        j(err)
    }
});
module.exports = simulClientRetry;