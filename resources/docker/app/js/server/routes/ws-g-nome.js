const {Worker} = require("node:worker_threads"),
      {until, log, throttle_v2: throttle} = require("../../helpers.js"),
      path = require('path'),
      {Prompt} = require("../../Prompt.js"),
      {promptOAuth2} = require("../../promptOAuth2.js"),
      portKey = Symbol.for("customPort"),
      nameKey = Symbol.for("customName");

module.exports = async function({express, app, info, files, serverSent, ws, memcache: cache}){
    const 
        subscription = ws.subscriber().subscribe("channel1"),
        decode = TextDecoder.prototype.decode.bind(new TextDecoder);

    const
        systemTokensRaw = Object.assign.apply(
            null, [
                {},
                ...["apikeys", "apikey", "tokens", "token", "secrets", "secret"]
                .sort().map(d => typeof info.serverConf[d] === "object" ? info.serverConf[d] : void(0))
            ]
        ), //{open-AI:....., OPENAI: ......, "   OPENAI":......., gemini:.....}
        systemTokens = Object.fromEntries(Object.entries(systemTokensRaw)
            .map(([k,v]) => [k.trim().toLowerCase(), v])
        ),
        systemTokensKeys = Object.keys(systemTokens).sort(),
        wkGnomeMap = new WeakMap();
    
    /**TODO 
     * Some of the ws.logIfDebug calls in this route are not related to web-sockets. 
     * These need to be toggled via a different config in the server.config.json
     * something like: "g-nome": { debug: false}
     * then an internal function in this route should handle logging
    */
    ws.logIfDebug("SYSTEMTOKENS", systemTokens);
    ws.logIfDebug("SYSTEMTOKENKEYS", systemTokensKeys);
    
    
    const relayError = function(err, {data, window_id = void(0)}){
        ws.msg({
            channel: "channel1",
            sessid:data.sessid,
            event: `server-g-nome-err${window_id ? `@${window_id}` : ""}`,
            namespace: data.namespace,
            payload: `Error: ${(err?.message ?? err?.toString() ?? err).slice(0,40)}..`
        })
    }
    subscription.on("user-g-nome-preflight", function(data){
        ws.logIfDebug("user-g-nome-preflight", data);
        let decodedPayload
        try {
            decodedPayload = JSON.parse(decode(data.payload));
        } catch (err) {
            relayError(err, {data});
            return;
        }
        const oWS = ws.get("channel1", data.sessid);
        if (!oWS.xb_uuid){
            ws.logIfDebug(`
                no cookies found on client,
                firing server-g-nome-no-uuid@${decodedPayload.window_id}.
                oWS.sessid=> `, oWS.sessid
            );
            ws.msg({
                channel: "channel1",
                sessid: data.sessid,
                event: `server-g-nome-no-uuid@${decodedPayload.window_id}`,
                namespace: data.namespace,
                payload: "empty"
            })
        } else {
            ws.logIfDebug(`
                found cookies on client,
                firing server-g-nome-uuid@${decodedPayload.window_id}.
                oWS.sessid=> `, oWS.sessid
            );
            ws.msg({
                channel: "channel1",
                sessid: data.sessid,
                event: `server-g-nome-uuid@${decodedPayload.window_id}`,
                namespace: data.namespace,
                payload: "empty"
            })
        }
        ws.msg({
            channel: "channel1", 
            sessid:data.sessid,
            event: `server-g-nome-ui@${decodedPayload.window_id}`,
            namespace: data.namespace,
            payload: `
                <div class="server-g-nome-ui active">
                    <h3>Disclaimer</h3>
                    <hr>
                    <ul class="disclaimer">
                        <li><b>G-NOME</b> is in alpha stage. Unless you use your own API keys, reviewers can see your history.</li>
                        <li><b>DO NOT</b> run g-nome on sensitive or proprieatary sequences.</li>
                    </ul>
                    <div>
                        <div class="custom-dropdown">
                            <select disabled name="model-selector">
                                <option value ="" selected></option>
                                <option value="ChatGPT 4o">ChatGPT 4o</option>
                                <option disabled value="Gemini 2.5 Pro">Gemini 2.5 Pro - Coming Soon!</option>
                                <option value="Kong API - ChatGPT 4o">Kong API - 4o</option>
                            </select>
                            <label class="floating-label">Choose a model</label>
                        </div>
                        <div class="custom-password">
                            <input disabled name="api-key" type="password"></input>
                            <button></button>
                        </div>
                    </div>
                    <div class="status"></div>
                    <footer>
                        <button disabled><i class="fa fa-check-circle"></i></button>
                        <button disabled><i class="fa fa-trash"></i></button>
                    </footer>
                    <div class="overlay">
                        <dna-spinner data-strand-color="dimgray" data-node-color="orange" data-size="8"></dna-spinner>
                    </div>
                </div>
            `
        });
    });

    const 
        tokenFamilies = {
            "openai": ["openai", "open-ai", "chatgpt", "chat-gpt", "gpt-4", "gpt4","gpt-4.5", "gpt4.5"],
            "gemini": ["gemini", "gemini-pro", "gemini2.5", "gemini-2.5"],
            "kong-api": ["kong-api", "kongApi", "kongapi", "kong_Api", "kong_api"]
        },
        tokenFlagToConfig = [
            {
                added: {msg: "Failed adding your token.", enableChat: false, disableDelete: true, type: "error"},
                removed: {msg: "Successfully removed your token.", enableChat: false, disableDelete: true, type: "success"},
                noop: {msg: "No tokens exist, you will need to add one.", enableChat: false, disableDelete: true, type: "info"}
            }, //FLAG = 0, NO TOKENS
            {
                added: {msg: "Failed adding your token. Falling back to system token.", enableChat: true, disableDelete: true, type: "error"},
                removed: {msg: "Successfully removed your token. Falling back to system token.", enableChat: true, disableDelete: true, type: "success"},
                noop: {msg: "Falling back to system token.", enableChat: true, disableDelete: true, type: "info"}
            }, //FLAG = 1, ONLY SYSTEM TOKEN
            {
                added: {msg: "Heads up! Successfully added your token.", enableChat: true, disableDelete: false, type: "success"},
                removed: {msg: "Failed removing token.", enableChat: true, disableDelete: false, type: "error"},
                noop: {msg: "Heads up! Found user token.", enableChat: true, disableDelete: false, type: "info"}
            }, //FLAG = 2, ONLY USER TOKEN
            {
                added: {msg: "Added your token. It will be used in place of the system token.", enableChat: true, disableDelete: false, type: "success"},
                removed: {msg: "Failed removing token. Your token remains along side system token.", enableChat: true, disableDelete: false, type: "error"},
                noop: {msg: "Heads up! Found user token, which will be used in place of the system token.", enableChat: true, disableDelete: false, type: "info"}
            } //FLAG = 3, BOTH TOKENS
        ],
        availableModels = Object.assign(Object.create(null), {
            "ChatGPT 4o": {
                name: "gpt-4o",
                family: tokenFamilies.openai,
                config: {}
            },
            "Gemini 2.5 Pro": {
                name: "gemini-2.5-pro-preview-05-06",
                family: tokenFamilies.gemini,
                config: {}
            },
            "Kong API - ChatGPT 4o": {
                name: "kong-api-gpt-4o",
                family: tokenFamilies["kong-api"],
                config: {}
            }
        }),
        visitedTokens = new Map();
    //start OAuth2 and popute access tokens via setting value 
    promptOAuth2({tokens: systemTokens, keys: systemTokensKeys, families: tokenFamilies, visitedTokens, ws, availableModels});
    subscription.on("user-g-nome-check-token", async function(data){
        let decodedPayload //{value: "ChatGPT 4o", window_id: afdc1234}
        try {
            decodedPayload = JSON.parse(decode(data.payload));
        } catch (err) {
            relayError(err, {data});
            return;
        }
        ws.logIfDebug("user-g-nome-check-token fired, decodedPayload => ", decodedPayload);
        if (!availableModels?.[decodedPayload?.value]) {
            return relayError(new Error("invalid model"), {data, window_id: decodedPayload?.window_id})
        }
        const oWS = ws.get("channel1", data.sessid);
        if (!oWS.xb_uuid){
            return relayError(new Error("invalid user id"), {data, window_id: decodedPayload?.window_id})
        }
        if (decodedPayload?.deleteToken && decodedPayload?.token) {
            return relayError(
                new Error("cannot delete and add token at the same time"),
                {data, window_id: decodedPayload?.window_id}
            )
        }
        if (decodedPayload?.token && !decodedPayload?.token?.trim()) {
            return relayError(new Error("tokens cannot only contain whitespace"), {data, window_id: decodedPayload?.window_id})
        }
        ws.msg({
            channel: "channel1",
            sessid: data.sessid,
            event: `server-g-nome-enbl-chk@${decodedPayload.window_id}`,
            namespace: data.namespace,
            payload: "empty"
        })
        let {name: model, family, config} = availableModels[decodedPayload.value];
        let systemToken;
        if(visitedTokens.has(model)) {
            systemToken = visitedTokens.get(model);
            ws.logIfDebug("found token: ", systemToken);
        } else {
            ws.logIfDebug("searching token.");
            systemToken = systemTokens[systemTokensKeys.find(d => family.some(f => d.startsWith(f)))];
            if (typeof systemToken === "object") {
                ws.logIfDebug("object detected, assigning to model config");
                Object.assign(config, systemToken, {value: void(0)});
                systemToken = systemToken.value;
            }
            visitedTokens.set(model, systemToken);
        }
        ws.logIfDebug("State of availableModels: ", availableModels);
        let userToken,
            userTokenState;

        try {
            if (decodedPayload?.deleteToken) {
                await cache.del(`${oWS.xb_uuid}:${model}`);
                userToken = await cache.get(`${oWS.xb_uuid}:${model}`);
                userTokenState = "removed";
            } else if (decodedPayload?.token) {
                ////console.log("token is: ", decodedPayload?.token);
                if(decodedPayload?.token?.length > 1024) { throw new Error("token too long") }
                await cache.set(`${oWS.xb_uuid}:${model}`, decodedPayload?.token?.trim(), 2591000); //max memcached ttl can be 1 month = 2592000s !
                ////console.log("set:", `${oWS.xb_uuid}:${model}`, decodedPayload?.token);
                //userToken = decodedPayload?.token; -> make a real check
                userToken = await cache.get(`${oWS.xb_uuid}:${model}`);
                ////console.log("got back this: ", userToken);
                userTokenState = "added";
            } else {
                userToken = await cache.get(`${oWS.xb_uuid}:${model}`);
                userTokenState = "noop";
            }
        } catch (err) {
            return relayError(err, {data, window_id: decodedPayload?.window_id});
        }
        
        ws.msg({
            channel: "channel1",
            sessid: data.sessid,
            event: `server-g-nome-chk-rply@${decodedPayload.window_id}`,
            namespace: data.namespace,
            payload: tokenFlagToConfig[(!!userToken << 1) + (!!systemToken)][userTokenState]
        });

        if(!wkGnomeMap.has(oWS)) {
            wkGnomeMap.set(oWS, {
                tokens: new Map(),
                procs: new Map(),
                prompts: new Map()
            });
        }
        wkGnomeMap.get(oWS).tokens.set(model, userToken ?? systemToken);

        ws.logIfDebug("systemToken is ", systemToken);
        ws.logIfDebug("is systemToken falsey ? =>", !!systemToken ? "no" : "yes")
    });

    subscription.on("user-g-nome-prompt", async function(data){
        let decodedPayload //{model: "ChatGPT 4o", window_id: afdc1234, prompt: "........."}
        try {
            decodedPayload = JSON.parse(decode(data.payload));
        } catch (err) {
            return relayError(err, {data});
        }
        let window_id = decodedPayload?.window_id;
        ws.logIfDebug("user-g-nome-prompt fired, decodedPayload => "/*, decodedPayload*/);
        if (!availableModels?.[decodedPayload?.model]) {
            return relayError(new Error("invalid model"), {data, window_id})
        }
        const oWS = ws.get("channel1", data.sessid),
              ledger = wkGnomeMap.get(oWS),
              model = availableModels?.[decodedPayload?.model]?.name;
        if (!ledger?.tokens.get(model)) {
            return relayError(new Error("no token"), {data, window_id})
        }
        ////console.log("ledger is", ledger);
        const 
            prompt_id = decodedPayload?.prompt_id,
            config = availableModels?.[decodedPayload?.model]?.config ?? {},
            prompt = decodedPayload?.prompt,
            meta = decodedPayload?.meta;
        let promptInstance;
        if (prompt_id && ledger.prompts.has(`${prompt_id}`)) { //Map keys enforce ===
            ws.logIfDebug("found prompt instance!");
            promptInstance = ledger.prompts.get(prompt_id)
        } else {
            ws.logIfDebug("creating prompt instance!");
            promptInstance = new Prompt({...config, ws, oWS, ledger, model, meta});
            ledger.prompts.set(`${promptInstance.id}`, promptInstance);
            ////console.log("ledger.prompts.get => ", ledger.prompts.get(promptInstance.id));
            ws.msg({
                channel: "channel1",
                sessid: data.sessid,
                event: `server-g-nome-prompt@${decodedPayload.window_id}`,
                namespace: data.namespace,
                payload: promptInstance.id
            });
        }
        if (typeof meta === "object") {
            meta.outerHTML = void(0);
        }
        ws.logIfDebug("TYPEOF METADATA", typeof meta?.data);
        promptInstance.send({/*model,*/ prompt, meta, window_id});
    })
}