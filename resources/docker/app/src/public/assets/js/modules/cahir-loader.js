!function(){
    function cahirLoader(
        
    ) {
        taskq.load("/static/js/cahir.0.0.2.evergreen.umd.js")
        .then(() => {
            taskq.load("/static/js/cahir.collections.dom.js").then(async (res) => {
                res.init;
                const ch = ch2;
                /*
                //TODO: below modules load one by one, transfer them to below
                //BEWARE: import.meta.url and resolve seem to be optional and vendors
                //  might not always implement them so i wont rely on it. The implementation 
                //  below assumes import(specifier) will resolve it correctly from the
                //  import maps.
                const accessors = new Map([
                    ["simple-chat", "simpleChatGen"]
                ]);
                await Promise.all(
                    [...accessors.keys()].map(d => import(d))
                ).then(_imports => {
                    const entries = [...accessors.entries()];
                    _imports.forEach((_import, i) => {
                        accessors.set(entries[i][0], _import[entries[i][1]])
                    })
                });*/
                ch`
                adopt ${[
                    [
                        "igv-applet",
                        (await import(
                            "../../components/@igv/js/component-igv.js"
                        )).render
                    ],
                    [
                        "igv-toolbar",
                        (await import(
                            "../../components/@toolbar/js/component-toolbar.js"
                        )).render
                    ]
                ]}
                adopt ...${["dna-spinner", (await import("../../components/@dnaSpinner/js/dna-spinner.js")).dnaSpinnerGen(ch)]}
                <dna-spinner ${{}}/>
                adopt ...${["bioinfo-input", (await import("../../components/@bioinfoInput/js/bioinfo-input.js")).bioinfoInputGen(ch)]}
                <bioinfo-input ${{}}/>
                adopt ...${["cody-logger", (await import("../../components/@codyLogger/js/cody-logger.js")).codyLoggerGen(ch)]}
                <cody-logger ${{}}/>
                => ${() => () => {res(true)}}
                `
                /**
                TODO example for above:
                adopt ...${["simple-chat", accessors.get("simple-chat")(ch)]}
                <simple-chat ${{}}/> 
                */
            })
        })
    }
    cahirLoader._taskqId = "cahirLoader";
    cahirLoader._taskqWaitFor = [];
    taskq.push(cahirLoader);
}()