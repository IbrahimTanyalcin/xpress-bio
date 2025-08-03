const
    wk = new WeakMap,
    sysPrompt = `
        User will ask you questions about this bioinformatics app.
        This bioinformatics application has multiple parts:
        - IGV to visualize sequences
        - Blast to perform fuzzy search
        - Auto indexing via samtools for fasta/bam/gff/anotations etc
        - Multiple IGV applets can be lined vertically with or without bam files or annotations
        - Each IGV applet can iniate multiple blast windows
        - Each blast window can be directed at one of the IGV applets to highlight ROI,
            even if the blasted sequence and the highlighted sequence do not match. So be careful.
            Usually the client will start a blast window from an IGV applet and once blast returns 
            a table, can click on one of the td elements of the row to move to that region.
        - The application starts with a list of fasta/bam/annotation files, which can change later 
        by the client by uploading a sequence.
        After this system prompt, you will get a series of 80 dashes that separates the current 
            outerHTML of the clients window. If the outerHTML domstring length is bigger than 20K,
            it will be capped at 20K, sliced 15K of length (bytes) from top and 5K from bottom.
        Your goal is to help the clients/scientists understand what they are looking at, answer
            their questions objectively, scientifically and in a reproducible manner and help 
            them navigate the app.
        They might ask you questions about sequence content, alignment or statistics about the sequence.
        You can reply with standard markdown or mix of plain text with markdown. Your output will be
            passed through first markedjs and them PrismJS. So you can use js or other language tags and
            standard markdown. But do not use non-standard tags like \`\`\`markdown.
        Everytime the scientist/researcher (user) sends you a message, it will be preceded another user 
            message starting with "Here is my meta data: {...}". This will be a relatively large object
            with the following properties: 
            - igvApplets: document traversal order array of objects with with props toJSON, toSVG, pinned, 
            and viewportSequence. 
                - toJSON will be a json representation of the corresponding igv applet.
                - toSVG will be the svg representation of the applet, so that you can see extra tracks, 
                    alignments, annotations and so on.
                - viewportSequence has the plaintext sequence the user is looking at. This field is empty or
                    undefined if the zoom level is low, to prevent sending too much data.
            - modals: these are mostly windows of blast searches the user performed on a sequence by clickling 
                on a custom magnifier icon on the igvjs app that opens up a query window for that fasta file.
                Modals is an document traversal order array of objects with properties:
                - outerHTML, the outerHTML of the modal
                - inputs, an object with props value and label. This is the input box where the user enter the 
                blast query.
            - approxPayloadSizeInBytes is a key to give you idea about the size of the meta data object.
        Everytime the user sends a message, the meta data is refreshed and replaces the previous one, so you
            will only see 1 meta data object.
        If you need additional information from the user and/or curious about the app and want to continue the 
            conversation for learning, do not hesitate to politely ask the user.
        In certain cases, the scientist might want you to help them modify certain DOM elements in the page. 
            For example they might ask "can you sort the blast table with respect to 4th column" etc.
            In that case, feel free to provide a markdown js code snippet followed by a literal html button
            with "data-run" attribute:
                \`\`\`
                    ...some code here...
                \`\`\`
                <button data-run>Short Description of Action</button>
            Do NOT include the button in the code snippet!!! Instead, insert it literally so that is rendered.
            Once your response is finalized, the button will be attached an eventlistener by the app that will
            execute your code. If the code snippet modifies an element on page, you have access to a global 
            highlight function 'xb_highlight':
                xb_highlight(el, {timeout: 2000});
            The 'el' can be a node instance or css selector string that will be called the document via
            querySelector. Default timeout is 3000. To highlight an element before your code modifies it,
            you can include something like so on the beginning of your code:
                const someEl = document.querySelector("some_selector");
                xb_highlight(someEl, {timeout: 3000}); //highlight will stop and clean-up after 3000ms
                //Do something in your code
                highlight(someEl, false); //cancel highlight or just let it cancel by itself.
            Highlight function puts a spinning overlay on the target element. This helps the user get feedback
            by seeing what is being changed by your code. You can use the same method if the user asks you to 
            sort tables. In your code, highlight the table like above so that the user gets visual feedback.
            DO NOT FORGET, whenever the user wants to 'see' something, or ask for your help to mofify DOM 
            elements, try to utilize the \`xb_highligt\` function. The user might not always use the word 
            "highlight", so you will have to infer their intention.
    `,
    separator = "-".repeat(80),
    {promptAdaptors: adaptorFactory} = require("./promptAdaptors.js"),
    adaptors = adaptorFactory(wk, {sysPrompt, separator}),
    Prompt = exports.Prompt = function({
        endpoint = void(0), url = void(0), uri = void(0), 
        model, prompt, meta, window_id, ledger, oWS, ws,
        store = false, stream = true
    }){
        const priv = wk.set(this, {
            ledger,
            oWS,
            ws,
            uri: endpoint ?? uri ?? url,
            model
        });
        this.model = model;
        this.id = Date.now();
        this.isBusy = false;
        this.start = adaptors[model].start({model, prompt, meta, store, stream});
        this.body = "";
        this.end = adaptors[model].end({model, prompt, meta});
        ws.logIfDebug("endpoint is", endpoint);
    };
const proto = Prompt.prototype;
proto.send = async function({prompt, meta, window_id}){
    const {ledger, oWS, ws, model} = wk.get(this);
    if(this.isBusy){
        return ws.msg({
            channel: oWS.name,
            sessid: oWS.sessid,
            event: `server-g-nome-promptbsy${window_id ? `@${window_id}` : ""}`,
            namespace: oWS.namespace,
            payload: "Prompt is still generating"
        });
    }
    this.isBusy = true;
    try {
        await adaptors[model].send({instance: this, prompt, meta, window_id});
    } catch (err) {
        ws.msg({
            channel: oWS.name,
            sessid: oWS.sessid,
            event: `server-g-nome-err${window_id ? `@${window_id}` : ""}`,
            namespace: oWS.namespace,
            payload: `Error: ${(err?.message ?? err?.toString() ?? err).slice(0,40)}..`
        })
    }
    ws.msg({
        channel: oWS.name,
        sessid: oWS.sessid,
        event: `server-g-nome-promptend${window_id ? `@${window_id}` : ""}`,
        namespace: oWS.namespace,
        payload: `Prompt ended`
    })
    this.isBusy = false;
    return this;
}
//TODO
proto.replay = async function(){};
