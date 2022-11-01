!function(){
    function hexgrid() {
        [...document.querySelectorAll(".grid-main[data-grid-type=hexagon]")]
        .forEach(function (grid) {
            const container = grid.firstElementChild;
            refresh(container); //init value
            new MutationObserver(this.cbMut.bind(container)).observe(container, this.configMut);
            new ResizeObserver(this.cbResize.bind(container)).observe(container, this.configResize);
        }, {
            cbMut: function (mList, obs) {
                [...mList]
                .filter(d => d.type = "childList")
                .forEach(d => {
                    //console.log("Child added!");
                    refresh(this);
                })
            },
            configMut: {childList: true},
            cbResize: function (entries) {
                //no need to do anything with entry
                //no need for entry's contentBoxSize or contentBoxSize[0] or entry.contentRect
                //console.log("Resize Detected!");
                refresh(this);
            },
            configResize: {box: "border-box"}
        });

        var undef = void(0),
            throttleFlag = undef,
            throttleDelay = 250,
            epsilon = 1e-6;
        function refresh (elem) {
            clearTimeout(throttleFlag);
            if (throttleFlag !== undef){
                return throttleFlag = setTimeout(()=> {throttleFlag = undef; refresh(elem);}, 0);
            }
            throttleFlag = setTimeout(function(){
                //console.log("updating!");
                const styl = getComputedStyle(elem.parentElement),
                      w = parseInt(styl.width),
                      s = +styl.getPropertyValue("--s"),
                      m = +styl.getPropertyValue("--m"),
                      f = s * 1.732 + 4 * m - 1, //f comes out as 'calc(...'
                      hexW = s + m,
                      rowOffset = (s / 2 + m) / 2, //average for 2 rows, (2*m or m ?)
                      rowW = w - rowOffset,
                      rowH = f / 2,
                      elemPerRow = rowW / hexW | 0 || 1,
                      rowCount = Math.ceil(elem.children.length / elemPerRow + epsilon);
                //console.log({w, s, m, f, hexW, rowOffset, rowW, rowH, elemPerRow, rowCount});
                elem.style.minHeight = Math.ceil(rowCount * rowH) + "px";
                throttleFlag = undef;
            }, throttleDelay);
        }
    }
    hexgrid._taskqId = "hexgrid";
    hexgrid._taskqWaitFor = ["main"];
    taskq.push(hexgrid);
}()