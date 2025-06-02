const {Worker} = require("node:worker_threads"),
      {until, log, throttle_v2: throttle} = require("../../helpers.js"),
      path = require('path'),
      portKey = Symbol.for("customPort"),
      nameKey = Symbol.for("customName");

module.exports = async function({express, app, info, files, serverSent, ws}){
    const 
        subscription = ws.subscriber().subscribe("channel1"),
        decode = TextDecoder.prototype.decode.bind(new TextDecoder);
    
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
        ws.msg({
            channel: "channel1", 
            sessid:data.sessid,
            event: `server-g-nome-ui@${decodedPayload.window_id}`,
            namespace: data.namespace,
            payload: `
                <div class="server-g-nome-ui">
                    <h3>Disclaimer</h3>
                    <hr>
                    <ul class="disclaimer">
                        <li><b>G-NOME</b> is in alpha stage. Unless you use your own API keys, reviewers can see your history.</li>
                        <li><b>DO NOT</b> run g-nome on sensitive or proprieatary sequences.</li>
                    </ul>
                    <div>
                        <div class="custom-dropdown">
                            <select name="mode-selector">
                                <option value ="" selected></option>
                                <option value="ChatGPT 4o">ChatGPT 4-0</option>
                                <option value="Gemini 2.5 Pro">Gemini 2.5 Pro</option>
                            </select>
                            <label class="floating-label">Choose a model</label>
                        </div>
                        <div class="custom-password">
                            <input name="api-key" type="password"></input>
                            <button></button>
                        </div>
                    </div>
                    <div class="overlay">
                        <dna-spinner data-strand-color="dimgray" data-node-color="orange" data-size="8"></dna-spinner>
                    </div>
                    <footer>
                        <button><i class="fa fa-check-circle"></i></button>
                        <button><i class="fa fa-trash"></i></button>
                    </footer>
                </div>
            `
        });
    });
}