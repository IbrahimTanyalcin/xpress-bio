import {ws} from "wsagent";
import {throttle_v2} from "pre";
import {marked} from "marked";
import registerContentArea from "../../@table/js/registerContentArea.js";
import generateStyle from "../../@table/js/generateStyle.js";
import registerError from "../../@table/js/registerError.js";
import registerInfo from "../../@table/js/registerInfo.js";
import registerWarning from "../../@table/js/registerWarning.js";
import registerSuccess from "../../@table/js/registerSuccess.js";
let _logIfDebug = () => {};
const getMetaData = window._getXbMetaData = async function({igv = true, modal = true, stringify = false, seqLengthLimit = 1e2} = {igv: true, modal: true, stringify: false, seqLengthLimit: 1e2}){
    if(!igvData) {return []};
    let seqProms = [];
    const igvApplets = igv && igvData.map(d => {
        const 
            browser = d.browser,
            refFrame = browser?.getRulerTrackView?.()?.viewports[0]?.referenceFrame,
            isManagable = !["all"].includes(refFrame?.chr?.trim().toLowerCase()) && Math.abs(refFrame?.start - refFrame?.end) <= seqLengthLimit,
            viewportSequence = isManagable ? browser?.genome?.sequence?.getSequence(refFrame.chr, refFrame.start, refFrame.end) : void(0);
        seqProms.push(viewportSequence);
        return {
            toJSON: browser.toJSON(),
            toSVG: isManagable ? browser.toSVG() : void(0),
            viewportSequence: void(0),
            pinned: false
        }
    });
    const modals = [...document.querySelectorAll("[class|=modal-comp]:not(.modal-g-nome)")].map(d => {
        //querySelectorAll always returns a NodeList but you never know what vendors implement
        const inputs = [...(d?.querySelectorAll("bioinfo-input") ?? [])].map(inp => ({
            value: inp.value(),
            label: inp?.shadowRoot?.querySelector("[class=label]")?.textContent
        }));
        return {
            outerHTML: d.outerHTML,
            inputs
        }
    });
    await Promise.all(seqProms).then(seqs => seqs.forEach((seq, i) => igvApplets[i].viewportSequence = seq));
    //calculate approximate byteLength, assuming mostly single byte utf-8
    let approxPayloadSizeInBytes = 0;
    igvApplets.forEach(applet => {
        approxPayloadSizeInBytes += applet?.toSVG?.length || 0;
        approxPayloadSizeInBytes += applet?.viewportSequence?.length || 0;
        approxPayloadSizeInBytes += 100; //for pinned and rest
    })
    modals.forEach(modal => {
        approxPayloadSizeInBytes += modal?.outerHTML?.length || 0;
        approxPayloadSizeInBytes += modal?.inputs?.value?.length || 0;
        approxPayloadSizeInBytes += modal?.inputs?.label?.length || 0;
    })
    approxPayloadSizeInBytes += 50 //for outer keys igvApplets, modals etc.
    const result =  {igvApplets, modals, approxPayloadSizeInBytes};
    if (stringify) {return JSON.stringify(result)}
    return result;
};

/*Syntax highlighting*/
const highlight = (node) => {
    for (let code of node.querySelectorAll("code")) {
        Prism.highlightElement(code);
    }
    return node;
}

/*
Custom parser, in this case I am comparing the updated off canvas node
with the node in DOM, and only update/replace the lastchild
*/
const mdParser = ({current, incoming, parent, bubble, chat, component, prev}) => {
    _logIfDebug(`${current}${incoming}`);
    _logIfDebug(`----------------------------------------------------------------`)
    _logIfDebug(marked.parse(`${current}${incoming}`));
    const diffs = diff(highlight(ch2.dom`<div>${marked.parse(`${current}${incoming}`)}</div>`), parent.firstChild);
    for (const [newNode, oldNode] of diffs) {
        switch (true) {
            case !!(newNode && !oldNode): 
                (parent?.firstChild ?? parent).appendChild(newNode);
                break;
            case !!(newNode && oldNode):
                parent.firstChild.replaceChild(newNode, oldNode);
                break;
            default:
                break;
        }
    }
    if (!bubble.parentNode) {chat.appendChild(bubble)}
}

/*Rudimentary diffing. Good for this case.*/
const diff = (d1, d2) => {
    if (!d2) { return [[d1, ]]}
    const _new = Array.from(d1?.childNodes || []),
            _old = Array.from(d2?.childNodes || []),
            _comp = _new.map(function(c, i){ return [c, _old[i]]});
    const diffs = []
    for (let [c1, c2] of _comp){
        if(c1.isEqualNode(c2)){continue}
        diffs.push([c1, c2]);
    }
    return diffs;
}

/*Execute code snippets */
/*window._runCodeCSPFriendly = */function runCodeCSPFriendly(code) {
    const wrappedCode = `(function(){\n${code}\n})();`;
    const blob = new Blob([wrappedCode], { type: 'text/javascript' });
    const blobUrl = URL.createObjectURL(blob);

    const script = document.createElement('script');
    script.src = blobUrl;

    script.onload = () => {
      URL.revokeObjectURL(blobUrl);
      script.remove();
    };

    script.onerror = (err) => {
      console.error('runCodeCSPFriendly Script load error', err);
      URL.revokeObjectURL(blobUrl);
      script.remove();
    };

    document.head.appendChild(script);
}

!async function({toolRegister, genHexStr}){
    toolRegister.set("g-nome", async function(button){
        const modal = Modal({sty:[["background", "var(--bg-color)"],["opacity", 0.95]], cls: "modal-g-nome"});
        const {rndID: contentAreaID, node: contentArea} = registerContentArea(modal);
        generateStyle(Modal.className);
        registerError(modal);
        registerInfo(modal);
        registerWarning(modal);
        registerSuccess(modal);

        const ch = ch2;
        const
            window_id = genHexStr(4,2),
            chat = ch.dom`<simple-chat data-title="g-nome" data-color="font,#1b3b3b" data-hide-header data-width-ratio="1"></simple-chat>`,
            decoder = new TextDecoder,
            decode = TextDecoder.prototype.decode.bind(decoder);
        ch(contentArea)`style ${[["left", "0%"], ["width", "100%"]]} +> ${chat}`;

        /**
         * below ws.promiseReady returns ws[Symbol<init>] and extracts logIfDebug.
         * There is a small chance that ws connection gets interrupted due to server
         * restart etc. where the dev changes the config["web-socket"].debug which 
         * causes ws agent to reconnect later and return a new ws object with new
         * namespace event and init object which can have a different logIfDebug.
         * In that case this chat window will keep using the old logIfDebug. The
         * remedy is to close and reopen chat. I do not think it is worth updating
         * the new value of logIfDebug via a method similar to ws.info etc.
         */
        let [{logIfDebug} = {logIfDebug: () => {}},,,prismCSS ] = await Promise.all([
            ws.promiseReady("/ws/ch1"),
            chat.ready(),
            customElements.whenDefined("simple-chat"),
            fetch("/static/css/prism.1.29.0.css").then(res => res.text())
        ]);
        //assign logIfDebug to its outer scope mirror so functions there like mdParser can use it.
        _logIfDebug = logIfDebug;

        /**
         * WATCH OUT: prototype functions are defined on the component
         * NOT when it is defined, but when the first of its kind is
         * ADDED to the DOM. It is a trade off I made that causes me to
         * trip frequently.
         */
        chat.css(`
            :host {
                --font-color: var(--font-color-g-nome);
                --bg-color: var(--bg-color-g-nome);
            }
        `);
        ch(chat.shadowRoot)`+> ${ch.dom`<style>
            .server-g-nome-ui {
                position: relative;
                & .overlay {
                    position: absolute;
                    inset: 0;
                    display: flex;
                    justify-content: center;
                    align-items: center;
                    overflow: hidden;
                    background: rgb(0,0,0,0.75);
                    backdrop-filter: blur(2px);
                    opacity: 0;
                    pointer-events: none;
                    transition: opacity 1s ease;
                }
                & footer {
                    width: 100%;
                    display: flex;
                    flex-flow: row wrap;
                    align-items: center;
                    gap: 1em;
                    flex-direction: row-reverse;
                    padding-right: 0.75rem;
                    & button {
                        all: unset;
                        font-size: 2em;
                        border-radius: 4px;
                        cursor: pointer;
                        display: inline-flex;
                        align-items:center;
                        justify-content: center;
                        background: var(--bg-color-3);
                        color: var(--page-color);
                        padding: 0.25rem;
                        &:is(:focus-visible, :hover):not(:disabled) {
                            outline-style: solid;
                            color: var(--primary-color);
                            &:has(.fa-check-circle) {
                                color: var(--success-color-light);
                            }
                        }
                        &:disabled {
                            opacity: 0.4;
                        }
                    }
                }
            }
            ul.disclaimer {
                padding-inline-start: 1rem;
            }
            select, input {
                -webkit-appearance: none;
                -moz-appearance: none;
                -ms-appearance: none;
                appearance: none;
                outline: 0;
                box-shadow: none;
                border: 0 !important;
                background: var(--bg-color-3);
                background-image: none;
                flex: 1;
                padding: 0.5em;
                color: var(--page-color);
                cursor: pointer;
                font-size: 1em;
                font-family: 'Open Sans', sans-serif;
                max-width: 100%;
                text-overflow: ellipsis;
            }
            input {
                cursor: auto;
                text-overflow: clip;
            }
            select::-ms-expand {
                display: none;
            }
            select option:disabled, input:disabled {
                color: var(--bg-color);
                opacity: 0.4;
            }
            .custom-dropdown, .custom-password {
                position: relative;
                display: flex;
                margin: 5px;
                height: 3em;
                line-height: 3;
                background: var(--bg-color-3);
                overflow: hidden;
                border-radius: 0.25em;
            }
            .custom-password input {
                padding-right: 3em;
            }
            .custom-password button {
                position: absolute;
                top: 0;
                right: 0;
                border-top-left-radius: 0;
                border-top-right-radius: 0;
                padding: 0;
                height: 100%;
                line-height: 3;
                border: none;
                aspect-ratio: 1 / 1;
                /*width: 2rem;*/
                display: flex;
                align-items: center;
                justify-content: center;
                background: var(--bg-color-3);;
                color: var(--page-color);
                font-weight: bold;
                cursor: pointer;
                transition: background 0.23s, opacity 0.23s;
            }
            .custom-dropdown::after, .custom-password button:after {
                font-family: FontAwesome;
                content: '\\f0ab';
                color: var(--page-color);
                position: absolute;
                top: 0;
                right: 0;
                padding: 0 1em;
                background: var(--bg-color-3);
                pointer-events: none;
                transition: 0.25s all ease;
            }
            .custom-password button:after {
                inset: 0;
            }
            .custom-password:has(input[type="password"]) button:after {
                content: '\\f06e';
            }
            .custom-password:has(input[type="text"]) button:after {
                content: '\\f070';
            }
            .custom-dropdown:hover::after, .custom-password button:hover:after, .custom-password button:focus-visible:after {
                color: var(--primary-color);
            }
            .custom-password button:hover:after, .custom-password button:focus-visible:after {
                box-shadow: 0 0 0 2px rgba(0, 0, 0, 0.25);
            }
            .floating-label {
                position: absolute;
                transition: all 0.5s ease;
                top: 0em;
                font-size: 1em;
                text-indent: 1em;
                color: var(--page-color);
                pointer-events: none;
            }
            select:has(option:checked:not([value=""])) + label.floating-label {
                top: -0.9em;
                font-size: 0.8em;
                color: var(--bg-color-2);
            }
            .status {
                min-height: 3em;
                & p {
                    animation: fadein-translate-y 0.4s ease-in-out 0s 1 normal forwards running;
                    padding: 0.5em;
                    background: var(--shadow-color);
                    margin: 5px;
                    &.success {
                        color: var(--success-color-light);
                    }
                    &.info {
                        color: var(--info-color-light);
                    }
                    &.warning {
                        color: var(--warning-color-light);
                    }
                    &.error {
                        color: var(--error-color);
                    }
                }
            }
            .fa-trash:before {
                content: "\\f1f8";
            }
            .fa-check-circle:before {
                content: "\\f058";
            }
        </style>`}`;
        
        ch(chat.shadowRoot)`+> ${ch.dom`<style>${prismCSS}</style>`}`;

        const 
            channel = ws.channelFor("/ws/ch1"),
            subscription = ws.subscriber().subscribe(channel, () => !document.contains(chat)),
            avatar = /*ch.dom*/`
                <mana-orb data-from="0,0" data-to="1,1" data-duration="8s" data-filter-scale="2" data-colors="background,transparent,stroke,orange" data-width-ratio="1" data-aspect-ratio="1" data-href-texture="/static/img/orange-clouds.png" data-update-delay="20" data-stroke-width="1" data-progress="1">
                    <g>
                        <rect transform="rotate(45)" x=".64" y="-.069" width=".32" height=".32" rx=".025" ry=".025"></rect>
                        <rect transform="rotate(45)" x=".64" y="-.42" width=".32" height=".32" rx=".025" ry=".025"></rect>
                        <rect transform="rotate(45)" x=".29" y="-.069" width=".32" height=".32" rx=".025" ry=".025"></rect>
                    </g>
                </mana-orb>`,
            avatarFixed = ch.dom`
                <svg viewBox="0 0 1 1" style="width: 100%;aspect-ratio:1;">
                    <g style="fill: var(--primary-color);">
                        <rect transform="rotate(45)" x=".64" y="-.069" width=".32" height=".32" rx=".025" ry=".025"></rect>
                        <rect transform="rotate(45)" x=".64" y="-.42" width=".32" height=".32" rx=".025" ry=".025"></rect>
                        <rect transform="rotate(45)" x=".29" y="-.069" width=".32" height=".32" rx=".025" ry=".025"></rect>
                    </g>
                </svg>`,
            fixAvatar = window.fixAvatar = (bubble) => {
                bubble?.querySelector(".msg-img")?.firstElementChild?.replaceWith(avatarFixed.cloneNode(true));
                return bubble;
            },
            parser = ({current, incoming, parent, bubble, chat, component}) => {
                ch(parent)`+-> ${ch.span} >> textContent ${incoming} style ${[["word-break","break-word"], ["white-space", "pre-wrap"]]} -> ${bubble} +< ${chat}`
            },
            symbols = {
                busy: Symbol("busy"), freeze: Symbol("freeze"), uiBubble: Symbol("uiBubble"), status: Symbol("status"), disable: Symbol("disable"),
                enable: Symbol("enable")
            };
        
        /**
         * You can send generic message like below.
         * if payload is an object, it is stringified
         */
        /* ws.sendMessage({
            path: "/ws/ch1",
            event: "some-event",
            payload: {name: "some-name", key: "val"}
        }) */

        subscription.on(`server-g-nome-ui@${window_id}`, ({channel, event, namespace, payload, ws:_ws}) => {
            //subscription.off("server-g-nome-ui@${window_id}"); no need, we might need to have multiple server-g-nome-ui events
            logIfDebug("server-g-nome-ui fired", "payload => ", payload);
            chat.addBubble({
                content: decode(payload),
                side: "left",
                name: "g-nome",
                avatar,
                //cb: ({bubble}) => setTimeout(() => bubble.querySelector("mana-orb").pause(), 250000),
                cb: ({bubble}) => {
                    //trigger resize and disable by default;
                    setTimeout(() => chat.showTyping().hideTyping().disable(), 500);
                    ch`
                    0> state:${"password"}
                    0> overlay: ${bubble.getElementsByClassName("overlay")[0]}
                    0> status: ${bubble.getElementsByClassName("status")[0]}
                    0> model: ${bubble.querySelector("[name='model-selector']")}
                    0> checkButton: ${bubble.querySelector("footer button:has(.fa-check-circle)")}
                    0> trashButton: ${bubble.querySelector("footer button:has(.fa-trash)")}
                    0> password: ${bubble.querySelector("input[name='api-key']")}
                    @> ...${[".custom-password button",bubble]} on click ${({values}) => function(){
                        this.previousElementSibling.setAttribute(
                            "type",
                            values.state === "password"
                            ? (values.state = "text")
                            : (values.state = "password")
                        );
                    }} 
                    -> ${bubble} >> ...${({values:v}) => [
                        symbols.busy, 
                        (isBusy) => ch(v.overlay).style([
                            ["pointer-events", isBusy ? "auto" : "none"], 
                            ["opacity", isBusy ? 1 : 0]
                        ])
                    ]}
                    >> ...${({values:v}) => [
                        symbols.freeze,
                        () => {
                            v.overlay.remove();
                            bubble.querySelector(".server-g-nome-ui").classList.remove("active");
                            bubble.querySelectorAll("input, select, button").forEach(el => el.setAttribute("disabled",""));
                            bubble.style.opacity = 0.5;
                            chat[symbols.uiBubble] = void(0);
                        }
                    ]}
                    >> ...${({values:v}) => [
                        symbols.status,
                        ({msg = "", type = "info"}) => {
                            v.status.replaceChildren();
                            v.status.appendChild(ch.dom`<p class="${type}">${msg}</p>`);
                        }
                    ]}
                    >> ...${({values:v}) => [
                        symbols.disable,
                        ({chat:_chat = false, check = false, trash = false, password = false} = {chat: true, check: true, trash: true, password: true}) => {
                            logIfDebug("disabling: ", `chat:${_chat}`, `check:${check}`, `trash:${trash}`, `password:${password}`);
                            _chat && chat.disable();
                            check && v.checkButton?.setAttribute("disabled", "");
                            trash && v.trashButton?.setAttribute("disabled", "");
                            password && v.password?.setAttribute("disabled", "");
                        }
                    ]}
                    >> ...${({values:v}) => [
                        symbols.enable,
                        ({chat:_chat = false, check = false, trash = false, password = false} = {chat: true, check: true, trash: true, password: true}) => {
                            logIfDebug("enabling: ", `chat:${_chat}`, `check:${check}`, `trash:${trash}`, `password:${password}`);
                            _chat && chat.enable();
                            check && v.checkButton?.removeAttribute("disabled");
                            trash && v.trashButton?.removeAttribute("disabled");
                            password && v.password?.removeAttribute("disabled");
                        }
                    ]}
                    -> ${({values:v}) => v.model}
                    on change ${() => function() {
                        bubble[symbols.disable]();
                        if (!this.value){return bubble[symbols.status]({msg: "Choose a model to check/register token", type: "warning"})}
                        ws.sendMessage({
                            path: "/ws/ch1",
                            event: "user-g-nome-check-token",
                            payload: {value: this.value, window_id}
                        })
                    }}
                    -> ${({values:v}) => v.checkButton}
                    on click ${({values:v}) => function(){
                        if(v.password?.value && !v.password?.value?.trim()){
                            return bubble[symbols.status]({msg: "Tokens cannot only contain whitespace", type: "error"})
                        }
                        ws.sendMessage({
                            path: "/ws/ch1",
                            event: "user-g-nome-check-token",
                            payload: {value: v.model.value, window_id, token: v.password.value}
                        })
                        v.password.value = "";
                    }}
                    -> ${({values:v}) => v.trashButton}
                    on click ${({values:v}) => function(){
                        ws.sendMessage({
                            path: "/ws/ch1",
                            event: "user-g-nome-check-token",
                            payload: {value: v.model.value, window_id, deleteToken: true}
                        })
                    }}
                    `
                    chat[symbols.uiBubble] = bubble;
                    bubble[symbols.busy](true);
                },
                parser: chat.defDangerousParser
            });
        });

        /*
        Event alone fires namespaced ones too. Check @post-main-ws-agent.js
        subscription.on("server-g-nome-err", ({channel, event, namespace, payload, ws}) => {
            modal.issueError({msg: decode(payload), fadeout: 10000});
        });*/
        subscription.on(`server-g-nome-err@${window_id}`, ({channel, event, namespace, payload, ws}) => {
            modal.issueError({msg: decode(payload), fadeout: 10000});
        });

        subscription.on(`server-g-nome-no-uuid@${window_id}`, async ({channel, event, namespace, payload, ws}) => {
            logIfDebug("server-g-nome-no-uuid fired. Fetching uuid.");
            try {
                const res = await fetch('/uuid', {method: 'POST'});
                if (!res.ok) {throw new Error(`Failed to fetch uuid, http status: ${res.status}`)}
            } catch (err) {
                modal.issueError({msg: err?.message || err, fadeout: 10000});
            }
        });

        subscription.on(`server-g-nome-uuid@${window_id}`, async ({channel, event, namespace, payload, ws}) => {
            logIfDebug("server-g-nome-uuid fired");

            let timeout = setTimeout(() => {
                logIfDebug("server-g-nome-uuid timedout!");
                modelSelector?.break();
                modal.issueError({msg: "Could not maintain connection, close this window and try again", fadeout: 10000});
            }, 5000),
            modelSelector = ch.until(function(){
                return chat?.[symbols.uiBubble]?.querySelector("select[name='model-selector']")
            }, {interval: 50}).lastOp;
            modelSelector = await modelSelector;
            modelSelector?.removeAttribute("disabled");
            clearTimeout(timeout);
            if (modelSelector) {
                chat[symbols.uiBubble][symbols.busy](false);
            }

            logIfDebug("server-g-nome-uuid done");
        });

        subscription.on(`server-g-nome-enbl-chk@${window_id}`, async ({channel, event, namespace, payload, ws}) => {
            logIfDebug("server-g-nome-enbl-chk fired");
            const gNomeUI = chat?.[symbols.uiBubble];
            gNomeUI?.[symbols.enable]?.({check:1, password: 1});
        });

        subscription.on(`server-g-nome-chk-rply@${window_id}`, async ({channel, event, namespace, payload, ws:_ws}) => {
            try {
                payload = JSON.parse(decode(payload));
            } catch (err) {
                return modal.issueError({msg: err?.message || err, fadeout: 10000});
            }
            const gNomeUI = chat?.[symbols.uiBubble];
            gNomeUI?.[symbols.status]?.(payload);
            if (payload?.disableDelete) {
                gNomeUI?.[symbols.disable]?.({trash: 1})
            } else {
                gNomeUI?.[symbols.enable]?.({trash: 1})
            }
            payload?.enableChat ? chat.enable() : chat.disable();
        });


        let model = void(0), prompt_id = void(0), bytesToTokens = 4;
        /*This function gets invoked everytime you click on the send button*/
        chat.onsend(async function({files, text}){
            if(!files.length && !text){return}
            this.disable();
            let meta = {},
                bytesSent = 0,
                metaData;
            try {
                metaData = await getMetaData({stringify: false});
                bytesSent += metaData.approxPayloadSizeInBytes;
            } catch (err) {
                chat.enable();
                return modal.issueError({msg: err?.message || err, fadeout: 10000});
            }
            /**
             * if sending for the first time, attach outerHTML to meta data
             * otherwise add only meta data without outerHTML. Use !model
             * to determine if operation was initated successfully before
             */
            if(!model){
                let htmlStr = document.body.outerHTML;
                if (htmlStr > 1e4) {
                    htmlStr = htmlStr.slice(0, 9000) + htmlStr.slice(-1000);
                }
                bytesSent += htmlStr.length;
                meta = {outerHTML: htmlStr, data: metaData};
            } else {
                meta = {data: metaData}
            }
            bytesSent += text?.length ?? 0;
            if (bytesSent / bytesToTokens >= 40000) {
                chat.enable();
                return modal.issueError({msg: "Reduce your token size by closing igv applets or blast windows", fadeout: 10000});
            }
            if (!model) {
                if (!(model = chat?.[symbols.uiBubble]?.querySelector("[name='model-selector']")?.value)) {
                    return modal.issueError({msg: "Could not obtain model from UI", fadeout: 10000});
                }
                fixAvatar(chat?.[symbols.uiBubble])?.[symbols.freeze]();
            }
            this.addBubble({content: `${text}`, side:"right", name: "You", parser});
            chat.extendBubble({content: ` [Sent approx. ${bytesSent / bytesToTokens | 0} tokens]`});
            ws.sendMessage({
                path: "/ws/ch1",
                event: "user-g-nome-prompt",
                payload: {model, prompt_id, prompt: text, window_id, meta}
            })
            this.clear();
        });

        subscription.on(`server-g-nome-prompt@${window_id}`, async ({channel, event, namespace, payload, ws:_ws}) => {
            try {
                payload = (decode(payload));
            } catch (err) {
                return modal.issueError({msg: err?.message || err, fadeout: 10000});
            }
            logIfDebug("setting prompt id to ", payload);
            prompt_id = payload;
        });

        subscription.on(`server-g-nome-promptbsy@${window_id}`, async({channel, event, namespace, payload, ws:_ws}) => {
            try {
                payload = (decode(payload));
            } catch (err) {
                return modal.issueError({msg: err?.message || err, fadeout: 10000});
            }
            modal.issueError({msg: payload, fadeout: 10000});
            chat.enable();
        });

        subscription.on(`server-g-nome-promptbgn@${window_id}`, async({channel, event, namespace, payload, ws:_ws}) => {
            chat.addBubble({
                content: "",
                side: "left",
                name: "g-nome",
                avatar
            });
        });
        subscription.on(`server-g-nome-promptext@${window_id}`, async({channel, event, namespace, payload, ws:_ws}) => {
            try {
                payload = (decode(payload));
            } catch (err) {
                return modal.issueError({msg: err?.message || err, fadeout: 10000});
            }
            chat.extendBubble({content: payload, parser: mdParser});
        });
        subscription.on(`server-g-nome-promptend@${window_id}`, async({channel, event, namespace, payload, ws:_ws}) => {
            chat.extendBubble({content: "", parser: mdParser, cb: ({bubble}) => {
                fixAvatar(bubble);
                bubble.querySelectorAll(":is(code, pre) + button[data-run]").forEach(btn => {
                    if (btn._attached) {return}
                    const code = btn.previousElementSibling;
                    if (!code){return}
                    btn.addEventListener("click", function(e){
                        //console.log("RUNNING:\n", code?.textContent);
                        runCodeCSPFriendly(code?.textContent);
                    });
                    btn._attached = true;
                });
                bubble.querySelectorAll(":is(code, pre) + p > button[data-run]").forEach(btn => {
                    if (btn._attached) {return}
                    const code = btn?.parentElement?.previousElementSibling;
                    if (!code){return}
                    btn.addEventListener("click", function(e){
                        //console.log("RUNNING:\n", code?.textContent);
                        runCodeCSPFriendly(code?.textContent);
                    });
                    btn._attached = true;
                })
            }});
            chat.showTyping("0, ").enable();
        });
        subscription.on(`server-g-nome-promptsts@${window_id}`, async({channel, event, namespace, payload, ws:_ws}) => {
            chat.showTyping(`Infinity,${decode(payload)}`);
        });

        ws.sendMessage({
            path: "/ws/ch1",
            event: "user-g-nome-preflight",
            payload: {window_id}
        })
    })
}(taskq._exportPersist)