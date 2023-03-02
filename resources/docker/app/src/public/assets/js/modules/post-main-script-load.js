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
            }
        }).then(srcs => console.log(`script content delivered: ${srcs}`));
    }
    postMainScriptLoad._taskqId = "postMainScriptLoad";
    postMainScriptLoad._taskqWaitFor = ["main"];
    taskq.push(postMainScriptLoad);
}()