const 
    {createParser: eventSourceParser} = require("eventsource-parser");
exports.promptParser1 = ({instance, adaptorsModelBody : extender, ws, oWS, window_id, decode = true, log = false}) => {
    const 
    seen = new Set([`${0}${0}`]),
    decoder = new TextDecoder(),
    logger = (() => {
        switch (((typeof log === "function") << 1) + !!log) {
            case 3:
            case 2:
                return log;
            case 1:
                return (event) => {
                    console.log('Received event!')
                    console.log('id: %s', event.id || '<none>')
                    console.log('name: %s', event.name || '<none>')
                    console.log('data: %s', event.data)
                }
            default:
                return false
        }
    })(),
    parser = new eventSourceParser({
        onEvent(event) {
            logger & logger(event);
            const data = JSON.parse(event.data);
            ws.msg({
                channel: oWS.name,
                sessid: oWS.sessid,
                event: `server-g-nome-promptsts${window_id ? `@${window_id}` : ""}`,
                namespace: oWS.namespace,
                payload: `${data.type}`
            })
            switch (data.type) {
                case "response.content_part.added":
                    if (seen.has(`${data.output_index}${data.content_index}`)) { return }
                    if (!["output_text", "refusal"].includes(data?.part?.type)) { return }
                    ws.msg({
                        channel: oWS.name,
                        sessid: oWS.sessid,
                        event: `server-g-nome-promptbgn${window_id ? `@${window_id}` : ""}`,
                        namespace: oWS.namespace,
                        payload: `New prompt content part started`
                    });
                    seen.add(`${data.output_index}${data.content_index}`);
                    break;
                case "response.output_text.delta": 
                case "response.refusal.delta": /** there is no response.refusal.added */
                    ws.msg({
                        channel: oWS.name,
                        sessid: oWS.sessid,
                        event: `server-g-nome-promptext${window_id ? `@${window_id}` : ""}`,
                        namespace: oWS.namespace,
                        payload: data.delta
                    });
                    break;
                case "response.output_text.done": /** there is no response.refusal.added */
                    instance.body = extender(
                        instance.body,
                        {role: "assistant", content: data.text}
                    );
                    break;
                case "response.failed":
                    ws.msg({
                        channel: oWS.name,
                        sessid: oWS.sessid,
                        event: `server-g-nome-err${window_id ? `@${window_id}` : ""}`,
                        namespace: oWS.namespace,
                        payload: `Error: ${data?.response?.message || data?.response?.code || "response.failed"}`
                    });
                    break;
                case "response.incomplete":
                    ws.msg({
                        channel: oWS.name,
                        sessid: oWS.sessid,
                        event: `server-g-nome-err${window_id ? `@${window_id}` : ""}`,
                        namespace: oWS.namespace,
                        payload: `Error: ${data?.response?.incomplete_details?.reason || data?.response?.status || "response.incomplete"}`
                    });
                    break;
                case "error":
                    ws.msg({
                        channel: oWS.name,
                        sessid: oWS.sessid,
                        event: `server-g-nome-err${window_id ? `@${window_id}` : ""}`,
                        namespace: oWS.namespace,
                        payload: `Error: ${data?.message || data?.code || "sse.remote.server.error"}`
                    });
                    break;
                case "response.output_item.added":
                case "response.output_item.done":
                case "response.content_part.done":
                case "response.refusal.done":
                case "response.function_call_arguments.delta":
                case "response.function_call_arguments.done":
                case "response.file_search_call.in_progress":
                case "response.file_search_call.searching":
                case "response.file_search_call.completed":
                case "response.web_search_call.in_progress":
                case "response.web_search_call.searching":
                case "response.web_search_call.completed":
                case "response.reasoning_summary_part.added":
                case "response.reasoning_summary_part.done":
                case "response.reasoning_summary_text.delta":
                case "response.reasoning_summary_text.done":
                case "response.image_generation_call.completed":
                case "response.image_generation_call.generating":
                case "response.image_generation_call.in_progress":
                case "response.image_generation_call.partial_image":
                case "response.mcp_call.arguments.delta":
                case "response.mcp_call.arguments.done":
                case "response.mcp_call.completed":
                case "response.mcp_call.failed":
                case "response.mcp_call.in_progress":
                case "response.mcp_list_tools.completed":
                case "response.mcp_list_tools.failed":
                case "response.mcp_list_tools.in_progress":
                case "response.output_text_annotation.added":
                case "response.queued":
                case "response.reasoning.delta":
                case "response.reasoning.done":
                case "response.reasoning_summary.delta":
                case "response.reasoning_summary.done":
                    break;
            }
        },
        onError(error) {
            /*console.error('Error parsing event:', error)
            if (error.type === 'invalid-field') {
                console.error('Field name:', error.field)
                console.error('Field value:', error.value)
                console.error('Line:', error.line)
            } else if (error.type === 'invalid-retry') {
                console.error('Invalid retry interval:', error.value)
            }*/
            ws.msg({
                channel: oWS.name,
                sessid: oWS.sessid,
                event: `server-g-nome-err${window_id ? `@${window_id}` : ""}`,
                namespace: oWS.namespace,
                payload: `Error parsing event: ${error.type || "sse.parser.error"}`
            });
        }
    });
    if (decode) {
        parser.feed = ((orig_feed) => {
            return (newChunk) => {
                return orig_feed.call(parser, decoder.decode(newChunk, {stream: true}));
            }
        })(parser.feed)
    }
    return parser;
}

exports.promptParser2 = ({instance, adaptorsModelBody : extender, ws, oWS, window_id, decode = true, log = false}) => {
    let ssePayloadIdx = -1,
        accum = "";
    const 
    seen = new Set([-1, 0]),
    decoder = new TextDecoder(),
    logger = (() => {
        switch (((typeof log === "function") << 1) + !!log) {
            case 3:
            case 2:
                return log;
            case 1:
                return (event) => {
                    console.log('Received event!')
                    console.log('id: %s', event.id || '<none>')
                    console.log('name: %s', event.name || '<none>')
                    console.log('data: %s', event.data)
                }
            default:
                return false
        }
    })(),
    parser = new eventSourceParser({
        onEvent(event) {
            logger & logger(event);
            let data = event?.data?.trim();
            if (data === "[DONE]") {
                //console.log("DONE ENCOUNTERED!", accum);
                instance.body = extender(
                    instance.body,
                    {role: "assistant", content: accum}
                );
                return
            } else {
                data = JSON.parse(data);
            }
            ws.msg({
                channel: oWS.name,
                sessid: oWS.sessid,
                event: `server-g-nome-promptsts${window_id ? `@${window_id}` : ""}`,
                namespace: oWS.namespace,
                payload: `chunk ${++ssePayloadIdx}`
            })
            switch (true) {
                case Array.isArray(data?.choices) && !seen.has(data.choices.length - 1):
                    ws.msg({
                        channel: oWS.name,
                        sessid: oWS.sessid,
                        event: `server-g-nome-promptbgn${window_id ? `@${window_id}` : ""}`,
                        namespace: oWS.namespace,
                        payload: `New prompt content part started`
                    });
                    seen.add(data.choices.length - 1);
                    break;
                case !!data?.choices?.[0]?.delta?.content:
                    const delta = data.choices[0].delta.content;
                    ws.msg({
                        channel: oWS.name,
                        sessid: oWS.sessid,
                        event: `server-g-nome-promptext${window_id ? `@${window_id}` : ""}`,
                        namespace: oWS.namespace,
                        payload: delta
                    });
                    accum += delta;
                    break;
            }
        },
        onError(error) {
            ws.msg({
                channel: oWS.name,
                sessid: oWS.sessid,
                event: `server-g-nome-err${window_id ? `@${window_id}` : ""}`,
                namespace: oWS.namespace,
                payload: `Error parsing event: ${error.type || "sse.parser.error"}`
            });
        }
    });
    if (decode) {
        parser.feed = ((orig_feed) => {
            return (newChunk) => {
                return orig_feed.call(parser, decoder.decode(newChunk, {stream: true}));
            }
        })(parser.feed)
    }
    return parser;
}