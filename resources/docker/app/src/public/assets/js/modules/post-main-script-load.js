!function(){
    function postMainScriptLoad(
        loadScriptAsync,
        loadScriptAsyncMulti,
        helpButton,
        toolsButton,
        loadScriptAsyncOnceMulti,
    ) {
        loadScriptAsyncMulti({
            "static/js/conditional-help-tour.js": {
                "load-on-click": helpButton
            },
            "static/components/@tools/js/init.js": {
                "load-on-click": toolsButton
            },
            "static/js/subscriber.0.0.3.evergreen.es.js": {
                "type": "module"
            },
            "static/components/@modal/js/modal.0.0.0.evergreen.umd.min.js": null,
            "static/js/xb_highlight.js": null
        }).then(srcs => console.log(`script content delivered: ${srcs}`));
        loadScriptAsyncOnceMulti({
            "static/components/@manaOrb/js/mana-orb.0.0.10.es.fix.js": {
                type: "module"
            }
        }).catch((err) => console.log("There was an error loading (loadScriptAsyncOnceMulti): ", err));
    }
    postMainScriptLoad._taskqId = "postMainScriptLoad";
    postMainScriptLoad._taskqWaitFor = ["main"];
    taskq.push(postMainScriptLoad);
}()