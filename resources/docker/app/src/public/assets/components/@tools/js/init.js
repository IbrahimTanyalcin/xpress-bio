!async function({
    loadCSSAsync,
    loadCSSAsyncOnce,
    loadScriptAsync,
    loadScriptAsyncOnce,
    expandButton,
    toolsButton,
    side
}){
    await loadScriptAsyncOnce("static/components/@tools/js/chain.0.0.0.evergreen.umd.min.js");
    await loadScriptAsyncOnce("static/components/@tools/js/ch.js");
    await loadCSSAsyncOnce("static/components/@tools/css/init.css");
    await rafx.async().animate(function(){return (window || self || globalThis)?.Modal}).until(function(v){return v});
    const toolRegister = taskq._exportPersist.toolRegister = new Map();
    let renderBusy = 0;
    function render(){
        if (renderBusy) {
            return
        }
        renderBusy = 1;
        ch(side)`
            $> ${[
                {
                    name: "table-viewer", 
                    cls: ["fa", "fa-table"],
                    atr: [["title", "table-viewer"]],
                    action: async function(button, datum){
                        if (datum.busy) {return}
                        datum.busy = 1;
                        if(!toolRegister.get("table-viewer")){
                            await loadScriptAsync("static/components/@table/js/init.js", {type: "module"});
                            await loadScriptAsyncOnce("static/components/@table/js/basictable.min.js");
                            await loadCSSAsyncOnce("static/components/@table/css/basictable.css");
                            await loadCSSAsyncOnce("static/components/@table/css/responsive-table-type-1.css");
                        }
                        toolRegister.get("table-viewer")(button);
                        datum.busy = 0;
                    },
                    busy: 0
                },
                {
                    name: "g-nome", 
                    cls: ["fa", "fa-magic"],
                    atr: [["title", "g-nome"]],
                    action: async function(button, datum){
                        if (datum.busy) {return}
                        datum.busy = 1;
                        if(!toolRegister.get("g-nome")){
                            await Promise.all([
                                loadScriptAsyncOnce("static/js/localforage.min.js"),
                                loadScriptAsyncOnce("static/components/@simpleChat/js/simple-chat.0.0.9.fix.js", {type: "module"}),
                                loadScriptAsyncOnce("static/components/@manaOrb/js/mana-orb.0.0.10.es.fix.js", {type: "module"}),
                                loadScriptAsyncOnce("static/components/@chatGPT/js/init.js", {type: "module"})
                            ]);
                        }
                        toolRegister.get("g-nome")(button);
                        datum.busy = 0;
                    },
                    busy: 0
                },
                {
                    name: "chat-box", 
                    cls: ["fa", "fa-comment"],
                    atr: [["title", "chat anonymously"]],
                    action: async function(button, datum){
                        if (datum.busy) {return}
                        datum.busy = 1;
                        if(!toolRegister.get("chat-box")){
                            await Promise.all([
                                loadScriptAsyncOnce("static/components/@simpleChat/js/simple-chat.0.0.9.fix.js", {type: "module"}),
                                loadScriptAsyncOnce("static/components/@chatbox/js/init.js", {type: "module"}),
                            ]);
                        }
                        toolRegister.get("chat-box")(button);
                        datum.busy = 0;
                    },
                    busy: 0
                }
            ]}
            *> ${"div"} |> sappend ${0}
            stash ${() => () => ch.selected}
            style ${[
                ["width", "100%"], 
                ["height", "100%"],
                ["background", "var(--bg-color-transparent)"],
                ["opacity", 0],
                ["backdrop-filter", "blur(8px)"]
            ]}
            addClass ${["animated", "fadeInUp"]}
            *> ${"div"} |> sappend ${0}
            addClass ${"container"}
            style height ${"auto"}

            *> ${"div"} |> sappend ${0}

            *> ${"div"} |> sappend ${0}
            addClass ${"button-container"}
            >> innerHTML ${`
                <i 
                    class="close-button fa fa-close"
                    style="
                        transition: all 1s ease;
                        font-size: 2rem; 
                        color: var(--font-color); 
                        margin: 0.5rem;
                        margin-left: 0px;
                        padding: 0.5rem;
                        border-radius: 5px;
                        left: 5%;
                        position: relative;
                        border: 5px solid var(--font-color);
                        cursor: pointer;
                    "
                ></i>
            `}
            first ${0}
            on click ${() => () => {
                const toolsDiv = ch.recall();
                ch(toolsDiv)
                .animate([
                    {
                        opacity: 1
                    },
                    {
                        opacity: 0,
                        "-webkit-transform": "translate3d(0, 100%, 0)",
                        transform: "translate3d(0, 100%, 0)"
                    }
                ],{duration: 750})
                .pipe("await", () => {toolsDiv.remove(); renderBusy = 0;})
            }}
            up ${0} up ${0}
            *> ${"div"} |> sappend ${0}
            addClass ${"button-container"}
            style gap ${"10px"}
            *> ...${({thisArg, values}) => ["a", values[0].length]
            } |> append ${0}
            &> ${({thisArg,values}) => (node,i) => {
                thisArg(node)`>> outerHTML ${
                    `<a class="button-a-type-2" href="javascript:void(0);" rel="nofollow noopener">
                        <i 
                            class="${values[0][i].cls.join(" ")}"
                            style="
                                font-size: 3rem; 
                                color: var(--font-color); 
                                margin: 1rem;
                                padding: 1rem;
                                border-radius: 50%;
                                border: 5px solid var(--font-color);
                            "
                        ></i>
                        ${values[0][i].name}
                    </a>`
                }`
            }}
            &> ${({values}) => (node, i) => {
                ch(node).on("click", function(){
                    values[0][i].action(node, values[0][i]);
                })
            }}
        `
        
        const toolsDivContainer = side.querySelector(".animated.fadeInUp div");
        new ResizeObserver(ch2.throttle(function(entries){
            for (const entry of entries) {
                if(entry.target !== this){return}
                let {marginTop, marginBottom} = getComputedStyle(toolsDivContainer);
                marginTop = parseInt(marginTop) || 0;
                marginBottom = parseInt(marginBottom) || 0;
                const toolsDivHeight = marginTop + marginBottom + Math.ceil(entry.borderBoxSize[0]?.blockSize || 0);
                side.style.setProperty("--tools-div-height", toolsDivHeight);
                //console.log("resized toolbox");
            }
        }, {delay: 250, thisArg: toolsDivContainer})).observe(toolsDivContainer, {box: "border-box"});
    }
    toolsButton.addEventListener("click", render, false);
    toolsButton.click();
}(taskq._exportPersist)