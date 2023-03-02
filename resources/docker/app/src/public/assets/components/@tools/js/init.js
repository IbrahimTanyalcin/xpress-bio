!async function({
    loadCSSAsync,
    loadScriptAsync,
    expandButton,
    toolsButton,
    side
}){
    await loadScriptAsync("static/components/@tools/js/chain.0.0.0.evergreen.umd.min.js");
    await loadScriptAsync("static/components/@tools/js/ch.js");
    await loadScriptAsync("static/components/@modal/js/modal.0.0.0.evergreen.umd.min.js");
    await loadCSSAsync("static/components/@tools/css/init.css");
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
                            await loadScriptAsync("static/components/@table/js/basictable.min.js");
                            await loadCSSAsync("static/components/@table/css/basictable.css");
                            await loadCSSAsync("static/components/@table/css/responsive-table-type-1.css");
                        }
                        toolRegister.get("table-viewer")(button);
                        datum.busy = 0;
                    },
                    busy: 0
                },
                {
                    name: "ai-asist", 
                    cls: ["fa", "fa-magic"],
                    atr: [["title", "ai-asist"]],
                    action: async function(button, datum){
                        if (datum.busy) {return}
                        datum.busy = 1;
                        if(!toolRegister.get("ai-asist")){
                            await loadScriptAsync("static/components/@chatGPT/js/init.js");
                        }
                        toolRegister.get("ai-asist")(button);
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
    }
    toolsButton.addEventListener("click", render, false);
    toolsButton.click();
}(taskq._exportPersist)