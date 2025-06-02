import {ws} from "wsagent";
import {throttle_v2} from "pre";
import registerContentArea from "../../@table/js/registerContentArea.js";
import generateStyle from "../../@table/js/generateStyle.js";
import registerError from "../../@table/js/registerError.js";
import registerInfo from "../../@table/js/registerInfo.js";
import registerWarning from "../../@table/js/registerWarning.js";
import registerSuccess from "../../@table/js/registerSuccess.js";
!async function({toolRegister, genHexStr}){
    toolRegister.set("g-nome", async function(button){
        const modal = Modal({sty:[["background", "var(--bg-color)"],["opacity", 0.95]]});
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
        let [{logIfDebug} = {logIfDebug: () => {}}, ] = await Promise.all([
            ws.promiseReady("/ws/ch1"),
            chat.ready(),
            customElements.whenDefined("simple-chat")
        ]);

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
                                color: var(--success-color);
                            }
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
            .fa-trash:before {
                content: "\\f1f8";
            }
            .fa-check-circle:before {
                content: "\\f058";
            }
        </style>`}`;
        
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
            parser = ({current, incoming, parent, bubble, chat, component}) => {
                ch(parent)`+-> ${ch.span} >> textContent ${incoming} style ${[["word-break","break-word"], ["white-space", "pre-wrap"]]} -> ${bubble} +< ${chat}`
            },
            symbols = {busy: Symbol("busy"), freeze: Symbol("freeze")};
        
        /**
         * You can send generic message like below.
         * if payload is an object, it is stringified
         */
        /* ws.sendMessage({
            path: "/ws/ch1",
            event: "some-event",
            payload: {name: "some-name", key: "val"}
        }) */

        subscription.on(`server-g-nome-ui@${window_id}`, ({channel, event, namespace, payload, ws}) => {
            //subscription.off("server-g-nome-ui@${window_id}"); no need, we might need to have multiple server-g-nome-ui events
            logIfDebug("server-g-nome-ui fired", "payload => ", payload);
            chat.addBubble({
                content: decode(payload),
                side: "left",
                name: "g-nome",
                avatar,
                //cb: ({bubble}) => setTimeout(() => bubble.querySelector("mana-orb").pause(), 250000),
                cb: ({bubble}) => {
                    //trigger resize;
                    setTimeout(() => chat.showTyping().hideTyping(), 500);
                    ch`
                    0> state:${"password"} 
                    @> ...${[".custom-password button",bubble]} on click ${({values}) => function(){
                        this.previousElementSibling.setAttribute(
                            "type",
                            values.state === "password"
                            ? (values.state = "text")
                            : (values.state = "password")
                        );
                    }} 
                    0> overlay: ${bubble.getElementsByClassName("overlay")[0]}
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
                            bubble.querySelectorAll("input, select, button").forEach(el => el.setAttribute("disabled",""));
                            bubble.style.opacity = 0.5;
                        }
                    ]}
                    `
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

        /*This function gets invoked everytime you click on the send button*/
        chat.onsend(function({files, text}){
            if(!files.length && !text){return}
            this.addBubble({content: `${text}`, side:"right", name: "You",
            parser
            });
            this.clear()/* .disable() */;
        });

        ws.sendMessage({
            path: "/ws/ch1",
            event: "user-g-nome-preflight",
            payload: {window_id}
        })
    })
}(taskq._exportPersist)