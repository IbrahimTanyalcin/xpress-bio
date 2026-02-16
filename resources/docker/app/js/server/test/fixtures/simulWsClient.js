const WebSocket = require('ws');
const {validate} = require('../../../validateWs.js');
const {wsSend8} = require('../../../helpers.js');

/**
@description Simulates a WebSocket client: obtains a session via simulClient,
then opens a WS connection to the specified path, waits for the namespace event.
@param {Object} serverDetails an object about server info
@param {string} serverDetails.host host
@param {string|number} serverDetails.port port
@param {number} [serverDetails.timeout] timeout in milliseconds
@param {Object} [options] optional config
@param {string|false} [options.origin] Origin header value. false = omit header entirely.
@param {number} [options.timeout] override timeout
@param {string} [options.path] WS path, default '/ws/ch1'
@returns {Promise<Object>} client object with {ws, channel, namespace, cookie, sseResponse, send, onEvent, close}
@example
const client = await simulWsClient(serverDetails);
client.send("user-chat", "hello");
client.onEvent("user-chat-all", (parsed) => console.log(parsed.payloadStr));
client.close();
*/
const simulWsClient = (serverDetails, options = {}) => new Promise((resolve, reject) => {
    const timeoutMs = options.timeout ?? serverDetails?.timeout ?? 15000;
    let settled = false;
    const timer = setTimeout(
        () => {
            if (settled) return;
            settled = true;
            reject(new Error("WS client simulation timed out"));
        },
        timeoutMs
    );

    simulClient(serverDetails).then(sseResponse => {
        const cookie = sseResponse.__cliCookie;
        const wsPath = options.path ?? '/ws/ch1';
        const wsUrl = `ws://${serverDetails.host}:${serverDetails.port}${wsPath}`;

        const headers = {Cookie: cookie};
        if (options.origin !== false) {
            headers.Origin = options.origin ?? `http://${serverDetails.host}:${serverDetails.port}`;
        }

        const ws = new WebSocket(wsUrl, {headers});
        const eventListeners = new Map();
        let channel, namespace;
        const decode = TextDecoder.prototype.decode.bind(new TextDecoder());

        ws.on('message', (data) => {
            const buf = Buffer.isBuffer(data) ? data : Buffer.from(data);
            const parsed = validate(buf);
            if (!parsed) return;

            if (!namespace && parsed.evt === 'namespace') {
                channel = parsed.channel;
                namespace = parsed.namespace;
                if (!settled) {
                    settled = true;
                    clearTimeout(timer);
                    resolve(client);
                }
                return;
            }

            const handlers = [
                ...(eventListeners.get(parsed.evt) || []),
                ...(eventListeners.get('*') || [])
            ];
            handlers.forEach(cb => cb({
                ...parsed,
                payloadStr: decode(parsed.payload)
            }));
        });

        ws.on('error', (err) => {
            if (!settled) {
                settled = true;
                clearTimeout(timer);
                sseResponse.destroy();
                reject(err);
            }
        });

        ws.on('unexpected-response', (req, res) => {
            if (!settled) {
                settled = true;
                clearTimeout(timer);
                const err = new Error(`WS upgrade rejected: ${res.statusCode}`);
                err.statusCode = res.statusCode;
                sseResponse.destroy();
                reject(err);
            }
        });

        const client = {
            ws,
            get channel() { return channel; },
            get namespace() { return namespace; },
            cookie,
            sseResponse,
            send(event, payload) {
                ws.send(wsSend8({
                    channel: channel,
                    event,
                    namespace: namespace,
                    payload
                }));
                return this;
            },
            onEvent(eventName, cb) {
                if (!eventListeners.has(eventName)) {
                    eventListeners.set(eventName, []);
                }
                eventListeners.get(eventName).push(cb);
                return this;
            },
            close() {
                ws.close();
                sseResponse.destroy();
                return this;
            }
        };
    }).catch(err => {
        if (!settled) {
            settled = true;
            clearTimeout(timer);
            reject(err);
        }
    });
});

module.exports = simulWsClient;
