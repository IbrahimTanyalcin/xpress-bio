!function(){
    function cahirLoader(
        
    ) {
        taskq.load("/static/js/cahir.0.0.2.evergreen.umd.js")
        .then(() => {
            taskq.load("/static/js/cahir.collections.dom.js").then(async (res) => {
                res.init;
                const ch = ch2;
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
            })
        })
    }
    cahirLoader._taskqId = "cahirLoader";
    cahirLoader._taskqWaitFor = [];
    taskq.push(cahirLoader);
}()