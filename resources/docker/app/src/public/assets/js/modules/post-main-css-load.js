!function(){
    function postMainCSSLoad(
        loadCSSAsync,
        loadCSSAsyncMulti,
        themeButton
    ) {
        loadCSSAsyncMulti({
            "static/css/fontawesome.css": null,
            "static/css/animate.css": null,
            "static/css/main.css": null,
            "static/css/hexgrid.css": null,
            "static/css/switch.css": null,
            "static/css/sweetalert-dark.css": {
                rel: "inactive-stylesheet",
                "load-on-click": themeButton
            },
            "static/css/help.css": null,
            "static/css/delete-icon.css": null
        }).then(srcs => console.log(`css content delivered: ${srcs}`));
    }
    postMainCSSLoad._taskqId = "postMainCSSLoad";
    postMainCSSLoad._taskqWaitFor = ["main"];
    taskq.push(postMainCSSLoad);
}()