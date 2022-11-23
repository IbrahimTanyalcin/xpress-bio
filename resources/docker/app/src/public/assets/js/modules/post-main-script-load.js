!function(){
    function postMainScriptLoad(
        loadScriptAsync,
        loadScriptAsyncMulti,
        helpButton
    ) {
        loadScriptAsyncMulti({
            "static/js/conditional-help-tour.js": {
                "load-on-click": helpButton
            }
        }).then(srcs => console.log(`script content delivered: ${srcs}`));
    }
    postMainScriptLoad._taskqId = "postMainScriptLoad";
    postMainScriptLoad._taskqWaitFor = ["main"];
    taskq.push(postMainScriptLoad);
}()