const http = require('node:http');

/**
@description requests an URI to be downloaded
@param {Object} uriDetails an object about URI information
@param {Object<http.IncomingMessage>} uriDetails.cliResponse stream object
that has a __cliCookie property attached that points to a session
@param {string} uriDetails.postData usually a stringified JSON obj
@param {string} uriDetails.URI the URI to be downloaded
@returns {Promise<http.IncomingMessage>} an `http.IncomingMessage` type from
Node that is a response object
@example
const dlResponse = await reqDwnld(uriDetails);
console.log(dlResponse.statusCode) //hopefully 200
*/
const reqDwnld = ({cliResponse, postData, URI}) => new Promise((r, j) => {
    const reqStream = http.request(
        URI, 
        {
            headers: {
                Cookie: cliResponse.__cliCookie,
                'Content-Type': 'application/json'
            },
            method: "POST"
        },
        res => r(res)
    );
    reqStream.on('error', e => j(e));
    reqStream.write(postData);
    reqStream.end();
});
module.exports = reqDwnld;