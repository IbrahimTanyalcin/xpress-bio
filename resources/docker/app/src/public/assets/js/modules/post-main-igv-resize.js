!function(){
    function postMainIGVResize(
        panelWrapper
    ) {
        new ResizeObserver(function (entries, observer) {
            redrawIGV();
        })
        .observe(panelWrapper, {box: "border-box"});
        console.log("igv-resize-observer started");

        var undef = void(0),
            throttleFlag = undef,
            throttleDelay = 1000;
        function redrawIGV () {
            clearTimeout(throttleFlag);
            if (throttleFlag !== undef){
                return throttleFlag = setTimeout(()=> {throttleFlag = undef; redrawIGV();}, 0);
            }
            throttleFlag = setTimeout(function(){
                if (typeof igv !== "undefined") {
                    igv?.browser?.visibilityChange();
                    console.log(`igv redrawn due to viewport change ${(new Date()).toUTCString()}`);
                }
                throttleFlag = undef;
            }, throttleDelay);
        }
    }
    postMainIGVResize._taskqId = "postMainIGVResize";
    postMainIGVResize._taskqWaitFor = ["main"];
    taskq.push(postMainIGVResize);
}()