import {ws} from "wsagent";
import {throttle_v2} from "pre";
import registerContentArea from "../../@table/js/registerContentArea.js";
!async function({toolRegister}){
    toolRegister.set("chat-box", async function(button){
        const modal = Modal({sty:[["background", "var(--bg-color)"]]});
        const {rndID: contentAreaID, node: contentArea} = registerContentArea(modal);
        const ch = ch2;
        const chat = ch.dom`<simple-chat data-title="chat-box" data-color="font,#1b3b3b" data-hide-header></simple-chat>`;
        const 
            decoder = new TextDecoder,
            decode = TextDecoder.prototype.decode.bind(decoder);
        ch(contentArea)`+> ${chat}`;

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
                --font-color: var(--font-color-chat-box);
            }
        `);
        const 
            channel = ws.channelFor("/ws/ch1"),
            subscription = ws.subscriber().subscribe(channel, () => !document.contains(chat)),
            parser = ({current, incoming, parent, bubble, chat, component}) => {
                ch(parent)`+-> ${ch.span} >> textContent ${incoming} style ${[["word-break","break-word"], ["white-space", "pre-wrap"]]} -> ${bubble} +< ${chat}`
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

        subscription.on("server-chat-ready-response", ({channel, event, namespace, payload, ws}) => {
            subscription.off("server-chat-ready-response");
            logIfDebug("server-chat-ready-response fired", "payload => ", payload);
            chat.addBubble({
                content: decode(payload),
                side: "left",
                name: "xpress-bio",
                parser: chat.defDangerousParser
            });
        });

        subscription.on("user-chat-all", ({channel, event, namespace, payload, ws}) => {
            logIfDebug("user-chat-all fired", "payload => ", payload);
            chat.addBubble({
                content: decode(payload),
                side: "left",
                parser
            });
        });

        subscription.on("user-chat-typing", throttle_v2(() => {
            chat.showTyping("3000,user")
        }, {delay: 500, defer: false}));

        /*This function gets invoked everytime you click on the send button*/
        chat.onsend(function({files, text}){
            if(!files.length && !text){return}
            this.addBubble({content: `${text}`, side:"right", name: "You",
            parser
            });
            this.clear()/* .disable() */;
            ws.sendMessage({
                path: "/ws/ch1",
                event: "user-chat",
                payload: text
            })
        });

        chat.shadowRoot.querySelector(".msger-input").addEventListener("keypress", throttle_v2(
            function(){
                ws.sendMessage({
                    path: "/ws/ch1",
                    event: "user-chat-typing",
                    payload: "empty"
                })
            }
        , {delay: 500, defer: false}))

        ws.sendMessage({
            path: "/ws/ch1",
            event: "user-chat-ready",
            payload: "empty"
        })

    })
}(taskq._exportPersist)