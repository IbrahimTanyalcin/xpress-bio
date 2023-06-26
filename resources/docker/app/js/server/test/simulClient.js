const 
    http = require('node:http'),
    simulClient = (serverDetails) => new Promise((r, j) => {
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
                        !~res.headers
                        ?.["content-type"]
                        ?.indexOf("text/event-stream")
                    ) {
                        throw new Error("Event stream has wrong content-type")
                    }
                    res.__cliCookie = cookie;
                    clearInterval(timeout);
                    r(res)
                }
            )
        })
    } catch (err) {
        j(err)
    }
});
module.exports = simulClient;