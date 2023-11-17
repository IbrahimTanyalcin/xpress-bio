import getIconContents from "./toolbar-contents.js";
function toolbar({name, attrs, styles, props, data, el}){
    const ch = ch2;
    const {values, d, IGVBrowsers} = data;
    const 
        config = {
            "borderRadius": "0.08px"
        },
        getRects = () => {
            el._gBCRs = Array.from(el.children)
            .map(d => (({width, height, left, top})=>(
                {width, height, left, top}
            ))(d.getBoundingClientRect()))
        },
        getRect = () => {
            el._gBCR = (({width, height, left, top})=>(
                {width, height, left, top}
            ))(el.getBoundingClientRect())
        },
        calcResize = ch.throttle(function(){
            getRects();
            getRect();
        }, {delay: 500});

    const contents = getIconContents(
        IGVBrowsers, values.data, d, calcResize
    );

    new ResizeObserver(calcResize)
    .observe(el, {box: "border-box"});
    
    ch`
    -> container:${el}
    style ${[
        ["display", "flex"],
        ["justify-content", "start"],
        ["align-items", "center"],
        ["flex-flow", "row wrap"],
        ["font-size", "2rem"],
        ["padding-left", "min(4rem, 5%)"],
        ["gap", "2rem"],
        ["overflow", "hidden"],
        ["cursor", "pointer"],
        ["color", "var(--font-color)"]
    ]}
    +> ${() => Array(contents.length).fill().map(d => ch[`div{
        "style":[
            ["flex-basis", "2rem"],
            ["text-align", "center"],
            ["mix-blend-mode", "color-dodge"]
        ]
    }`])}
    &> ${({values:v}) => (n, i, c) => {
        ch(n)`
        0> isHidden:${contents[i]?.hidden ?? false}
        style ${({values:v}) => [
            ["display", v.isHidden ? "none" : "block"],
            ["transform", v.isHidden ? "scale(0, 0)" : "scale(1, 1)"],
            ["opacity", v.isHidden ? "0" : "1"]
        ]}
        +> ${contents[i].html}
        on click@cb ${() => contents[i].cb}
        on pointerover@hoveranim ${() => (e) => {
            clearTimeout(v.highlight._timeout);
            const 
                highlight = contents[i].highlight ?? true,
                elGBCR = el._gBCR,
                elGBCRi = el._gBCRs[i],
                tX = elGBCRi.left - elGBCR.left + elGBCRi.width / 2,
                tY = elGBCRi.top - elGBCR.top + elGBCRi.height / 2,
                sX = elGBCRi.width * 1.25,
                sY = elGBCRi.height * 1.25;
            ch(v.highlight)
            .style([
                ["transform", `translate(${
                    v.highlight._tX = tX
                }px, ${
                    v.highlight._tY = tY
                }px) scale(${
                    v.highlight._sX = sX
                }, ${
                    v.highlight._sY = sY
                })`],
                ["opacity", highlight ? "0.9" : "0"],
                ["border-radius", highlight ? config.borderRadius : "0"]
            ]);
        }}
        on pointerout@hoveranim ${() => (e) => {
            v.highlight._timeout = setTimeout(() => {
                ch(v.highlight)
                .style([
                    ["transform", `translate(${
                        v.highlight._tX
                    }px, ${
                        v.highlight._tY
                    }px) scale(${0}, ${0})`],
                    ["opacity", "0"]
                ])
            }, 250)
        }}
        on pointerdown@hoveranim ${() => (e) => {
            ch(v.highlight)
            .style([
                ["transform", `translate(${
                    v.highlight._tX
                }px, ${
                    v.highlight._tY
                }px) scale(${
                    v.highlight._sX * 1.6
                }, ${
                    v.highlight._sY * 1.6
                })`]
            ])
        }}
        on pointerup@hoveranim ${() => (e) => {
            ch(v.highlight)
            .style([
                ["transform", `translate(${
                    v.highlight._tX
                }px, ${
                    v.highlight._tY
                }px) scale(${
                    v.highlight._sX
                }, ${
                    v.highlight._sY
                })`]
            ])
        }}
        `
    }}
    => ${({values:v}) => calcResize}
    +-> highlight:${ch.div}
    style ${[
        ["position", "absolute"],
        ["top", "0"],
        ["left", "0"],
        ["width", "1px"],
        ["height", "1px"],
        ["border-radius", config.borderRadius],
        ["background", "var(--secondary-color)"],
        ["transition", "transform 0.5s ease, opacity 0.25s ease, border-radius 0.25s ease"],
        ["transform", `translate(${0}px, ${0}px) scale(${0}, ${0})`],
        ["z-index", "-1"],
        ["opacity", "0"]
    ]}
    `
}
export const render = toolbar;