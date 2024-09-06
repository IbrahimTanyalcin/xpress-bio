import {es6exports} from "./main.js";
let IGVBrowsers = {browsers: new Set(), pinned: void(0), methods: {}};
!function(){
    async function postMainVisualizeAction(
        gridFields,
        helpButton,
        toolsButton,
        firstHexGrid,
        toggleClass,
        accessObjectProp,
        animate_class,
        notify,
        assign,
        fNOP,
        fNYI,
        draf,
        body,
        flatten,
        flattenRec,
        appendChildren,
        htmlEl,
        keepFirstNElements,
        shortenStringMiddle,
        parseFilename,
        genHexStr,
        actionButton,
        createIGVObject,
        selectedPanel,
        loadIGVTrack,
        dropdown
    ) {
        /* evtSource available in case it is needed */
        const evtSource = await rafx.async(es6exports).animate(function(v){
            return v?.evtSource;
        }).until(function(v){
            return v
        });
        
        let igvData;
        IGVBrowsers.methods.loadIGVTrack = loadIGVTrack;
        IGVBrowsers.methods.shortenStringMiddle = shortenStringMiddle;
        IGVBrowsers.methods.parseFilename = parseFilename;

        actionButton.addEventListener("click", function(){
            if(this._disabled){return}
            this._disabled = true;
            if (!this._igvLoaded){
                const that = this;
                Swal.fire({
                    title: "Loading IGV",
                    allowEscapeKey: false,
                    allowOutsideClick: false,
                    backdrop: false,
                    didOpen: () => {
                        Swal.showLoading();
                    }
                });
                taskq.load("/static/js/igv.js").then(function(res){
                    that._disabled = false;
                    that._igvLoaded = true;
                    Swal.close();
                    that.click();
                });
                return;
            }
            let oIGV = createIGVObject();
            if (oIGV instanceof Error) {
                Swal.fire("make sure you select a bam file");
                this._disabled = false;
                return;
            }
            Promise.resolve()
            .then(async () => {
                if (IGVBrowsers.browsers.size){
                    const result = await Swal.fire({
                        icon: "question",
                        title: "What would you like to do?",
                        allowEscapeKey: false,
                        allowOutsideClick: false,
                        backdrop: false,
                        showCancelButton: true,
                        cancelButtonText: "Add a new applet",
                        cancelButtonColor: "#3085d6",
                        confirmButtonText: "Append to pinned applet"
                    });
                    if (result.isConfirmed && IGVBrowsers.pinned) {
                        return loadIGVTrack(
                            IGVBrowsers.pinned, 
                            dropdown.value 
                            || dropdown.options[dropdown.selectedIndex]?.value
                        )
                    } else if (!result.isDismissed && !IGVBrowsers.pinned) {
                        return Swal.fire({
                            title: 'No Pins',
                            text: 'Pin an IGV applet first.',
                            imageUrl: '/static/img/applet-pin-demo.gif',
                            imageWidth: "calc(20vw, 320px)",
                            imageHeight: "auto",
                            imageAlt: 'Applet pin demo',
                        })
                    } 
                }
                igvData.push({
                    browser: void(0),
                    oIGV,
                    order: 0 //not used for the time being
                })
            })
            .then(() => this._disabled = false)
            .catch(err => {
                console.log(err);
                this._disabled = false;
            });
        }, false);

        const ch = ch2;
        ch`
        @> body:${body}
        @> head:${document.head}
        0> itemMargin: ${0}
        -> cont:${selectedPanel.firstElementChild}
        0> weakmap:${new WeakMap()}
        0> rm:${Symbol("toBeRemoved")}
        0> fragment:${ch.crtFragment(1).lastOp[0]}
        => ${({values}) => () => values.pickle = ch.pickle`
            -> ${values.cont}
            => ${() => () => values.data.sort(
                (a, b) => (a.order ?? 0) - (b.order ?? 0)
            )}
            => ${() => () => {
                values.data.filter(d => {
                    let node = values.weakmap.get(d);
                    if (node && !node[values.rm]){
                        ch(node)
                        .cancelAnimate({
                            commit: ["transform"]
                        })(values.cont);
                        return 0;
                    }
                    return 1;
                }).forEach((d,i) => {
                    values.weakmap.set(
                        d,
                        ch`
                        <igv-applet ${{ data: {values, d, IGVBrowsers} }}/>
                        +< ${values.cont}`.selected
                    )
                })
            }}
            -> ${values.cont}
            => ${() => () => {
                if (!values.data.length){return}
                values.dims = values.weakmap.get(values.data[0])
                    .getBoundingClientRect();
                values.children = Array.from(values.cont.children);
            }}
            &> ${() => (n,i,c) => {
                if (n[values.rm]) {return}
                if (!values.data.includes(n.dataRef)){
                    return ch(n).addClass("fadeOutDown")
                    .set(values.rm, true)
                    .animate([],{duration:1000})
                }
                ch`
                -> ${n}
                => ${() => () => {
                    const
                        iData = values.data.indexOf(n.dataRef),
                        iDiff = iData - i;
                    ch.animate([
                        {
                            transform: `translate(0px, ${
                                iDiff * (values.dims.height + values.itemMargin)
                            }px)`
                        }
                    ],{duration:1000, easing: "ease-in-out", fill: "both"})
                }}
                `
            }}
            => ${() => () => {
                const
                    nodes = values.data.map(d => values.weakmap.get(d)),
                    promises = nodes.map(n => ch(n).promiseAnimate());
                Promise.all(promises).then((results) => {
                    ch()`
                    -> ${values.fragment}
                    +> ${nodes}
                    &> ${() => (n) => ch(n)
                        .rmClass("fadeInUp")
                        .immediateAnimate([
                            {transform: "translate(0px, 0px)"}
                        ])
                    }
                    -> ${(values.cont.replaceChildren(), values.cont)}
                    prepend ${[values.fragment]}
                    `
                }).catch(() => {})
            }}
        `}
        => ${({values}) => () => {
            const callback = ch.throttle(({val, prop, oldVal}) => {
                ch(values.pickle)
            }, {delay: 100});
            values.data = window.igvData = igvData = ch.aref([], {
                cb: callback,
                cbChild: callback
            })
        }}
        => ${({values}) => () => ch(values.pickle)}
        `

    }
    postMainVisualizeAction._taskqId = "postMainVisualizeAction";
    postMainVisualizeAction._taskqWaitFor = ["main", "cahirLoader"];
    taskq.push(postMainVisualizeAction);
}()
export {IGVBrowsers};