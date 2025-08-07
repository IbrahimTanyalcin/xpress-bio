const 
    defSysPrompt = `Default System Prompt`,
    defSeparator = "-".repeat(80),
    {promptParser1, promptParser2} = require("./promptParser.js");
exports.promptAdaptors = (wk, {sysPrompt = `Default System Prompt`, separator = defSeparator} = {sysPrompt: defSysPrompt, separator: defSeparator}) => {
    if (!(wk instanceof WeakMap)) {
        throw new TypeError("promptAdaptors factory function gets a WeakMap as first argument")
    }
    
    function start1 ({model, prompt, meta, store, stream}){
        return `{
            "model": "${model}",
            "store": ${store},
            "stream": ${stream},
            "input": [
                {
                    "role": "system",
                    "content": ${JSON.stringify(`
                        ${sysPrompt}
                        ${separator}
                        ${meta?.outerHTML ?? ""}
                    `)}
                },
        `;
    }
    
    function body1 (current, ...incoming){
        if (incoming.length) {
            return `${current ? `${current}, ` : ""}${incoming.map(d => JSON.stringify(d)).join(",")}`
        }
        return current;
    }
    
    function end1 ({model, prompt, meta}){
        return `]}`;
    }
    
    async function send1 ({instance, prompt, meta, window_id}){
        const {ledger, oWS, ws, model, uri} = wk.get(instance);
        ws.msg({
            channel: oWS.name,
            sessid: oWS.sessid,
            event: `server-g-nome-promptbgn${window_id ? `@${window_id}` : ""}`,
            namespace: oWS.namespace,
            payload: `Prompt started`
        })
        if (!prompt) {
            return ws.msg({
                channel: oWS.name,
                sessid: oWS.sessid,
                event: `server-g-nome-promptext${window_id ? `@${window_id}` : ""}`,
                namespace: oWS.namespace,
                payload: `Did you forget to type something?`
            })
        }
        /* 
         * There is double transpiling below, because metadata always has to be relocated
         * to the head of the conversation, right before user prompt. I could have chosen
         * to record the length of initial instance.body and stringify user prompt once
         * and slice from start and end and reassign, because I think it won't make a much
         * of a difference under mid scale server load.
         */
        const payload = `${instance.start}${
            adaptors[model].body(
                instance.body,
                {
                    role: "user",
                    content: `Here is my meta data:  ${JSON.stringify(meta?.data ?? {})}`
                },
                {role: "user", content: prompt}
            )
        }${instance.end}`;
        instance.body = adaptors[model].body(
            instance.body,
            {role: "user", content: prompt}
        );
        if (ws.wsDebug) {
            try {
                JSON.parse(payload);
                console.log(`JSON PARSE WORKED! LENGTH: ${payload.length}`, payload);
            } catch (err) {
                console.log('JSON PARSE FAILED!', err);
            }
        }
        ws.logIfDebug("TOKEN IS", ledger.tokens.get(model), "URI is", uri);
        

        const res = await fetch(
            uri,
            {
                method: 'POST',
                headers: {
                    "Authorization": `Bearer ${ledger.tokens.get(model)}`,
                    "Content-Type": "application/json"
                },
                body: payload
            }
        );
        ws.logIfDebug(`Status: ${res.status} ${res.statusText}`);
        if (!res.ok) throw new Error(`${res.status} ${res.statusText}`);
        ws.logIfDebug("FETCH WORKED!");
        const parser = promptParser1({instance, adaptorsModelBody : adaptors[model].body, ws, oWS, window_id, log: ws.logIfDebug});
        for await (const chunk of res.body) {
            parser.feed(chunk);
        }
        

        let term;
        if (res?.headers?.get("x-ratelimit-remaining-tokens")) {
            term = `\n\n  [${
                res?.headers?.get?.("x-ratelimit-remaining-tokens") ?? "unknown"
            } tokens remaining. Reset in ${
                res?.headers?.get?.("x-ratelimit-reset-tokens") ?? "unknown"
            } (s)]`;
        } else {
            term = `\n\n  [End]`;
        }
        return ws.msg({
            channel: oWS.name,
            sessid: oWS.sessid,
            event: `server-g-nome-promptext${window_id ? `@${window_id}` : ""}`,
            namespace: oWS.namespace,
            payload: term
        })
    }

    function start2 ({model, prompt, meta, store, stream}){
        //extend the replace/^ with | to accomodate other providers using gpt-4o or similar
        return `{
            "model": "${model.replace(/^kong-api-/i, "")}",
            "store": ${store},
            "stream": ${stream},
            "messages": [
                {
                    "role": "system",
                    "content": ${JSON.stringify(`
                        ${sysPrompt}
                        ${separator}
                        ${meta?.outerHTML ?? ""}
                    `)}
                },
        `;
    }

    async function send2 ({instance, prompt, meta, window_id}){
        const {ledger, oWS, ws, model, uri} = wk.get(instance);
        ws.msg({
            channel: oWS.name,
            sessid: oWS.sessid,
            event: `server-g-nome-promptbgn${window_id ? `@${window_id}` : ""}`,
            namespace: oWS.namespace,
            payload: `Prompt started`
        })
        if (!prompt) {
            return ws.msg({
                channel: oWS.name,
                sessid: oWS.sessid,
                event: `server-g-nome-promptext${window_id ? `@${window_id}` : ""}`,
                namespace: oWS.namespace,
                payload: `Did you forget to type something?`
            })
        }
        /* 
         * There is double transpiling below, because metadata always has to be relocated
         * to the head of the conversation, right before user prompt. I could have chosen
         * to record the length of initial instance.body and stringify user prompt once
         * and slice from start and end and reassign, because I think it won't make a much
         * of a difference under mid scale server load.
         */
        const payload = `${instance.start}${
            adaptors[model].body(
                instance.body,
                {
                    role: "user",
                    content: `Here is my meta data:  ${JSON.stringify(meta?.data ?? {})}`
                },
                {role: "user", content: prompt}
            )
        }${instance.end}`;
        instance.body = adaptors[model].body(
            instance.body,
            {role: "user", content: prompt}
        );
        if (ws.wsDebug) {
            try {
                JSON.parse(payload);
                console.log(`JSON PARSE WORKED! LENGTH: ${payload.length}`, payload);
            } catch (err) {
                console.log('JSON PARSE FAILED!', err);
            }
        }
        ws.logIfDebug("TOKEN IS", ledger.tokens.get(model), "URI is", uri);

        const res = await fetch(
            uri,
            {
                method: 'POST',
                headers: {
                    "Authorization": `Bearer ${ledger.tokens.get(model).value}`,
                    "Content-Type": "application/json"
                },
                body: payload
            }
        );
        ws.logIfDebug(`Status: ${res.status} ${res.statusText}`);
        if (!res.ok) throw new Error(`${res.status} ${res.statusText}`);
        ws.logIfDebug("FETCH WORKED!");
        //you can do log: true below to force logging
        const parser = promptParser2({instance, adaptorsModelBody : adaptors[model].body, ws, oWS, window_id, log: ws.logIfDebug});
        for await (const chunk of res.body) {
            parser.feed(chunk);
        }
        

        let term;
        if (res?.headers?.get("x-ratelimit-remaining-tokens")) {
            term = `\n\n  [${
                res?.headers?.get?.("x-ratelimit-remaining-tokens") ?? "unknown"
            } tokens remaining. Reset in ${
                res?.headers?.get?.("x-ratelimit-reset-tokens") ?? "unknown"
            } (s) End]`;
        } else {
            term = `\n\n  [End]`;
        }
        return ws.msg({
            channel: oWS.name,
            sessid: oWS.sessid,
            event: `server-g-nome-promptext${window_id ? `@${window_id}` : ""}`,
            namespace: oWS.namespace,
            payload: term
        })
    }

    const adaptors = {
        "gpt-4o": {
            start: start1,
            body: body1,
            end: end1,
            send:send1
        },
        "gemini-2.5-pro-preview-05-06": {
    
        },
        "kong-api-gpt-4o": {
            start: start2,
            body: body1,
            end: end1,
            send: send2
        }
    }
    return adaptors;
}