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
                => ${() => () => {res(true)}}
                `
            })
        })
    }
    cahirLoader._taskqId = "cahirLoader";
    cahirLoader._taskqWaitFor = [];
    taskq.push(cahirLoader);
}()