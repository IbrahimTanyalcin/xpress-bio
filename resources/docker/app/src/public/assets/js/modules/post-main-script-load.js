!function(){
    function postMainScriptLoad(
        loadScriptAsync,
        loadScriptAsyncMulti,
        helpButton,
        toolsButton
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
            "static/components/@modal/js/modal.0.0.0.evergreen.umd.min.js": null
        }).then(srcs => console.log(`script content delivered: ${srcs}`));
    }
    postMainScriptLoad._taskqId = "postMainScriptLoad";
    postMainScriptLoad._taskqWaitFor = ["main"];
    taskq.push(postMainScriptLoad);
}()