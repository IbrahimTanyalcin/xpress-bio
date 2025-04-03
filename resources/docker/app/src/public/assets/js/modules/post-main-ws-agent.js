import Subscriber from "../subscriber.0.0.3.evergreen.es.js";
let ws;
let wsSubscriber;
//console.log("post-main-ws-agent outer scope executed ", performance.now());
!function(){
    async function postMainWsAgent(
        /**taskq variables come here */
    ) {
        //console.log("post-main-ws-agent inner scope executed ", performance.now());
        wsSubscriber = new Subscriber();
        const 
            ch = ch2;
        function WS() {
            const priv = wk.set(this, {
                /**
                 * path: {
                 *  agent: ws instance,
                 *  subscription: subscription instance,
                 *  reconnect: function
                 * }
                 */
            });
        }
        WS.concatUint8 = function(a, b){
            let c = new Uint8Array(a.length + b.length);
            c.set(a, 0); c.set(b, a.length);
            return c;
        }
        WS.isTA8 = function(a) {
            return a instanceof Uint8Array || a instanceof Uint8ClampedArray
        }
        WS.isTA = function(a) {
            return ArrayBuffer.isView(a)
        }
        WS.toBinary = function({channel, event, namespace, payload, stringify = [null, "\t"]}){
            if (
                typeof channel !== "string"
                || typeof event !== "string"
                || typeof namespace !== "string"
            ){
                throw new Error("channel, event and namespace must be strings");
            }
            if (!WS.isTA8(payload)) {
                switch (typeof payload) {
                    case "string":
                    case "number":
                        payload = encode(payload)
                        break;
                    case "object":
                        if (WS.isTA(payload)) {
                            throw new Error("Typed arrays other than Buffer and Uint8 are not supported");
                        }
                        payload = encode(JSON.stringify(payload, ...stringify))
                        break;
                    default:
                        throw new Error("There was a problem with parsing the payload");
                }
            }
            let header = encode(`${channel}\0${event}\0${namespace}\0`);
            return WS.concatUint8(header, payload);
        }
        WS.parse = function validate(iter, {sep = 0} = {sep: 0}) {
            let 
                flag = 1, //1 => channel, 2 => event, 4 => namespace
                len = 0,
                channel,
                event,
                namespace,
                payload,
                temp = "",
                i = -1;
            LOOP:
            for (let byte of iter){
                ++i; byte &= 0xFF;
                if (byte === sep) {
                    switch (flag) {
                        case 1:
                            channel = temp;
                            temp = "", len = 0;
                            flag <<= 1;
                            continue LOOP;
                        case 2: 
                            event = temp;
                            temp = "", len = 0;
                            flag <<= 1;
                            continue LOOP;
                        case 4:
                            namespace = temp;
                            temp = "", len = 0;
                            flag <<= 1;
                            payload = iter.subarray(i + 1);
                            break LOOP;
                        default:
                            throw new Error("Error parsing websocket payload from server");
                    }
                }
                if (flag < 8) {
                    temp += String.fromCharCode(byte);
                    ++len;
                }
            }
            if (!channel || !event || !namespace) {
                throw new Error("Websocket fields empty from server");
            }
            return {channel, event, namespace, payload}
        };
        const 
            enu = ["", null, void(0)],
            proto = WS.prototype,
            wk = new WeakMap,
            decoder = new TextDecoder,
            decode = TextDecoder.prototype.decode.bind(decoder),
            encoder = new TextEncoder,
            encode = TextEncoder.prototype.encode.bind(encoder),
            init = Symbol("init"),
            safeSend = Symbol("safeSend"),
            readyStates = new Set([WebSocket.CONNECTING, WebSocket.OPEN]),
            dontReconnectStates = new Map([
                [4000, "applet closed connection"]
            ]),
            fSafeSend = function(payload) {
                this?.readyState === WebSocket.OPEN && this?.send?.(payload);
            };
        let agents = [];
        proto.getAgent = proto.connect = function(path) {
            const priv = wk.get(this);
            if (!priv[path]){priv[path] = {}}
            if (readyStates.has(priv[path]?.agent?.readyState)){
                return priv[path].agent;
            }
            const
                liveAgents =  agents.map(d => d?.deref()).filter(d => d && readyStates.has(d.readyState)),
                agent = liveAgents.find(d => new URL(d.url).pathname === path);
            agents = liveAgents.map(d => new WeakRef(d));
            if (agent) {return priv[path].agent = agent}
            return priv[path].agent = this.createAgent(path);
        }
        proto.createAgent = function(path) {
            const 
                that = this,
                _url = new URL(path, location.origin),
                ws = new WebSocket(_url),
                priv = wk.get(that);
            if (!priv[path]){priv[path] = {}}
            const pathConfig = priv[path];
            ws.binaryType = "arraybuffer";
            //ws.onopen = () => console.log("connection opened");
            ws.onmessage = (evt) => {
                //console.log("message from server", new TextDecoder().decode(evt.data));
                const {channel, event, namespace, payload} = WS.parse(new Uint8Array(evt.data));
                if (!pathConfig.subscription) {

                    /**
                     * in case I get confused on subscriber behavior:
                     * //fires:
                     * pathConfig.subscription.on("whatever", ()=> console.log("..."));
                     * wsSubscriber.dispatch(channel, `whatever`)
                     * //fires both
                     * pathConfig.subscription.on(`someevent@${namespace}`, ()=> console.log("..."));
                     * pathConfig.subscription.on(`@${namespace}`, ()=> console.log("..."));
                     * wsSubscriber.dispatch(channel, `@${namespace}`)
                     * //fires
                     * pathConfig.subscription.on(`namespace@${namespace}`, ()=> console.log("..."));
                     * wsSubscriber.dispatch(channel, `namespace`)
                     * //does NOT fire! because the default namespace is empty string and 
                     * //does not match dispatched events namespace ${namespace}
                     * pathConfig.subscription.on("namespace", () => console.log("..."));
                     * wsSubscriber.dispatch(channel, `namespace@${namespace}`)
                     */

                    pathConfig.subscription = wsSubscriber.subscribe(channel);
                    pathConfig.subscription.on("namespace", ({channel, event, namespace, payload, ws}) => {
                        let JSONParsed = 0
                        try {
                            /**
                             * Server-client negotiates fields separated by null byte, that is '\0'
                             * the above notation is in octal and can be an issue when incoming payload 
                             * is only 1 element Uint8Array => [0]. This array will converted to string
                             * without commas because length is 1 and JSON.parse will convert it to 0.
                             * However, decode will convert [0] to "\x00" which then JSON.parse will
                             * correctly fail. That's why decode is necessary. This is only done for
                             * namespace event. Rest is up to the implementer.
                             */
                            payload = JSON.parse(decode(payload));
                            JSONParsed = 1;
                        } catch (err) {
                            /*
                            below creates the issue of ws[init].payload or 
                            ws[init].payload.payload if payload wasnt json parsable
                            payload = {payload};
                            */
                        }
                        ws[init] = {channel, event, namespace, payload,
                            logIfDebug: payload?.wsDebug ? console.log.bind(console) : () => {}
                            /**,delay: payload?.delay */
                        };
                        ws[init].logIfDebug(
                            "namespace event fired!\n",
                            `JSON parse of payload ${JSONParsed ? "succeeded" : "failed"}.\n`,
                            "setting init object:\n",
                            ws[init]
                        );
                    });
                }
                wsSubscriber.dispatch(channel, `${event}`, {channel, event, namespace, payload, ws})
            };

            ch.until(() => ws[init]).lastOp
            .then(({delay = 5000}) => {
                if (pathConfig.reconnect) {
                    return ws.onclose = pathConfig.reconnect;
                }
                ws.onclose = pathConfig.reconnect = ch.throttle((evt) => {
                    //const delay = ws[init] || 5000;
                    if (dontReconnectStates.has(evt?.code)) {return console.log(dontReconnectStates.get(evt.code), path)}
                    console.log(`websocket connection for ${path} was closed. Retrying once every ${delay}ms`);
                    /**
                     * if evt.code is 1006, it means permanent network failure, 
                     * but no need to inform, we are reconnecting at this point anyway
                     */
                    that.getAgent(path);
                } ,{delay});
            });
            if (pathConfig.reconnect) {
                ws.onclose = pathConfig.reconnect;
            } else {
                ws.onclose = ch.throttle((evt) => {
                    if (dontReconnectStates.has(evt?.code)) {return console.log(dontReconnectStates.get(evt.code), path)};
                    console.log(`initial websocket connection for ${path} was closed. Retrying once every 5000ms`);
                    that.getAgent(path);
                } ,{delay: 5000}); 
            }
            ws.onerror = (evt) => console.log(`websocket error for ${path}`);
            ws[safeSend] = fSafeSend;
            agents.push(new WeakRef(ws));
            return ws;
        }
        proto.removeAgent = function (path, terminate = true) {
            const liveAgents =  agents.map(d => d?.deref()).filter(d => d && readyStates.has(d.readyState));
            agents = liveAgents.filter(d => {
                if(new URL(d.url).pathname !== path) {
                    return true
                }
                if (terminate) {
                    d.close(4000, dontReconnectStates.get(4000))
                }
                return false;
            }).map(d => new WeakRef(d));
            return this;
        }
        proto.sendMessage = function({path, channel, event, namespace, payload, stringify = [null, "\t"]}){
            const agent = this.getAgent(path);
            channel ||= agent[init].channel;
            event ||= agent[init].event;
            namespace ||= agent[init].namespace;
            agent[safeSend](WS.toBinary({channel, event, namespace, payload, stringify}));
            return this;
        }
        proto.channelFor = function(path){
            const agent = this.getAgent(path);
            return agent?.[init]?.channel;
        }
        ws = new WS();
        ws.subscriber = () => wsSubscriber;
        ws.subscription = (path) => {
            const priv = wk.get(ws);
            return priv?.[path]?.subscription
        }
        ws.info = (path) => {const agent = ws.getAgent(path); JSON.parse(JSON.stringify(agent[init]))};
        ws.promiseReady = (path, {interval = 50} = {}) => {
            return ch.until(() => {
                return ws.getAgent(path)?.[init]
            }, {interval}).lastOp;
        }
    }
    postMainWsAgent._taskqId = "postMainWsAgent";
    postMainWsAgent._taskqWaitFor = ["main", "cahirLoader"];
    taskq.push(postMainWsAgent);
}();

export {ws, wsSubscriber}