function codyLoggerGen(ch) {
    return function codyLogger({name, attrs, styles, props, data, el, proto}) {
        if (!el.initialized){
            proto.initialized = true;
            proto.remove = function(){
            return ch(this).animate([{
                transform: "translate(0%, -100%)",
                opacity: 0
            }], {duration:1000, easing: "ease-in-out", fill: "both"}).lastOp.then(() => (this.parentNode.removeChild(this), this))
            }
            proto.add = function(msg, color){
                const 
                    shadow = this.shadowRoot,
                    codeWrapper = shadow.querySelector(".code-wrapper");
                ch(codeWrapper)`+> ${ch.dom`<span class="data-log-event"${color ? ` style="color:${color};"` : ""}>${msg}</span>`}`;
                return this;
            }
            proto.spinner = function(str){
                const 
                    shadow = this.shadowRoot,
                    spinnerWrapper = shadow.querySelector(".spinner-wrapper"),
                    oldSpinner = spinnerWrapper.firstElementChild;
                if (!str) {
                    if (oldSpinner) {
                        if (oldSpinner instanceof HTMLSlotElement){
                            oldSpinner.assignedElements().forEach(d => d.remove())
                        } else {
                            oldSpinner.remove()
                        }
                    }
                    return this;
                }
                const newSpinner = str instanceof Node ? str : ch.dom`${str}`;
                if (oldSpinner){
                    ch(oldSpinner).replaceWith(newSpinner)
                } else {
                    ch(spinnerWrapper).append(newSpinner);
                }
                return this;
            }
            proto.css = function (str, pos) {
                const 
                    shadow = this.shadowRoot,
                    style = shadow.querySelector("style[data-for=cody-logger]"),
                    sheet = style.sheet;
                pos = pos ?? sheet.cssRules.length;
                sheet.insertRule(str, pos);
                return this;
            }
        }
        const shadow = el.attachShadow({ mode: "open" });
        let state = 0,
            toggle,
            calcResize,
            pathAnims = [
                [
                {strokeDasharray: "0 0 0.428 0.572"},
                {strokeDasharray: "0 0.286 0.428 0.286"},
                {strokeDasharray: "0 0.572 0.428 0"}
                ],
                [
                {strokeDasharray: "0 0 0.428 0.572"},
                {strokeDasharray: "0 0.286 0.428 0.286"},
                {strokeDasharray: "0 0.680 0.320 0"}
                ],
                [
                {strokeDasharray: "0 0 0.428 0.572"},
                {strokeDasharray: "0 0.286 0.428 0.286"},
                {strokeDasharray: "0 0.740 0.260 0"}
                ]
            ];
        ch(el)`
        => ${({values:v}) => () => {
            v.colors = el.colors = Object.fromEntries(
            (ch.gatr("data-colors") ?? "")
            .split(",")
            .filter(Boolean)
            .reduce((ac,d,i,a) => {
                if(!(i % 2)){
                ac.push([d, a[i+1]])
                }
                return ac;
            },[]));
            v.borderRadius = ch.gatr("data-border-radius");
            v.backgroundOpacity = ch.gatr("data-background-opacity");
            v.headingBackgroundOpacity = ch.gatr("data-heading-background-opacity");
            v.widthRatio = ch.gatr("data-width-ratio");
            v.padding = ch.gatr("data-padding");
            v.fadein = el.fadein = (ch.gatr("data-fadein") ?? null) !== null ? 1 : 0;
        }}
        => ${({values:v}) => () => {
            calcResize = v.calcResize = ch.throttle(function(){
                const parent = el?.parentElement;
                if(!parent){return}
                const
                scrollBarWidth = parent.offsetWidth - parent.clientWidth,
                {width:w} = el?.parentElement?.getBoundingClientRect();
                ch(el).style("--currWidth", (w - scrollBarWidth) * (+v.widthRatio || 0.95));
            }, {delay: 500});
            (v.robserver = new ResizeObserver(calcResize)).observe(el?.parentElement, {box: "border-box"});
        }}
        => ${({values:v}) => () => calcResize()}
        -> ${shadow}
        => ${({values:v}) => () => {
            ch`
            +> ${ch.dom`
            <style data-for="cody-logger">
                *,
                *:after,
                *:before {
                    box-sizing: border-box;
                }
                :where(:host, .pre-wrapper){
                    scrollbar-width: thin;
                    scrollbar-color: #555 #f5f5f5;
                }
                :where(:host, .pre-wrapper)::-webkit-scrollbar-track {
                    -webkit-box-shadow: inset 0 0 6px rgba(0,0,0,0.3);
                    border-radius: 10px;
                    background-color: #F5F5F5;
                }
                :where(:host, .pre-wrapper)::-webkit-scrollbar {
                    width: 8px;
                    height: 8px;
                    background-color: #F5F5F5;
                }
                :where(:host, .pre-wrapper)::-webkit-scrollbar-thumb {
                    border-radius: 10px;
                    -webkit-box-shadow: inset 0 0 6px rgba(0,0,0,0.3);
                    background-color: #555;
                }
                :where(:host, .pre-wrapper)::-webkit-scrollbar-button {
                    background-color: #ccc;
                    display: none;
                }
                :where(:host, .pre-wrapper)::-webkit-scrollbar-corner {
                    background-color: #f5f5f5;
                }
                :where(:host, .pre-wrapper)::-webkit-resizer {
                    background-color: #ccc;
                }
                :host {
                    box-sizing: border-box;
                    width: calc(var(--currWidth) * 1px);
                    margin: auto;
                    padding: ${v.padding || "var(--padding, 4px)"};
                    overflow-y: auto;
                    color: ${v.colors.font || "var(--font-color, DarkSlateGray)"};
                    background-color: ${v.colors.background || "var(--bg-color, #f9f9f9)"};
                    border-radius: ${v.borderRadius || "var(--border-radius, 4px)"};
                    display: grid;
                    position: relative;
                    transition: all 1s ease;
                    font-size: 1rem;
                    container: component-container;
                    container-type: inline-size;
                    grid-template-columns: repeat(4, 1fr);
                    grid-template-rows: 3rem auto;
                    grid-template-areas:
                        "h h h h"
                        "c c c c";
                    ${
                    v.fadein 
                    ? "animation: fadein-translate-y 0.4s ease-in-out 0s 1 normal forwards running;"
                    : ""
                    }
                }
                svg, path {
                    transition: all 1s ease;
                }
                .pre-wrapper:after, .header:after {
                    display: block;
                    position: absolute;
                    inset: 0;
                    pointer-events: none;
                    content: '';
                    transition: opacity 1s ease;
                    z-index: -1;
                }
                .pre-wrapper:after {
                    opacity: ${v.backgroundOpacity || "var(--bg-opacity, 0.75)"};
                }
                .header {
                    position: relative;
                    grid-area: h;
                    display: flex;
                    color: ${v.colors.heading || "var(--heading-color, #9098a9)"};
                    flex-direction: column-reverse;
                    cursor: pointer;
                    --state: 1;
                }
                .header:after {
                    background: ${v.colors.shadow || "var(--shadow-color, #c8ccd4)"};
                    outline: ${v.padding || "var(--padding, 4px)"} solid ${v.colors.shadow || "var(--shadow-color, #c8ccd4)"};
                    opacity: ${v.headingBackgroundOpacity || "var(--heading-bg-opacity, 0.75)"};
                    z-index: 0;
                }
                .header > svg {
                    display: block;
                    position: absolute;
                    inset: 0;
                    pointer-events: none;
                    width: 100%;
                    height: 100%;
                    transform: translate(0px, -0px);
                } 
                path {
                    fill: none;
                    stroke: ${v.colors.heading || "var(--heading-color, #9098a9)"};
                    stroke-width: 1;
                    stroke-opacity: 0.6;
                    stroke-dasharray: 1;
                    stroke-linejoin: round;
                    stroke-linecap: miter;
                    animation: 0.4s linear 1 anim-path-length both;
                    opacity: 0;
                }
                path.path-small {
                    stroke-width: 2;
                }
                .header-entry{
                    display: flex;
                    flex-basis: 50%;
                    flex-grow: 0;
                    max-height: 50%;
                    flex-wrap: nowrap;
                    overflow: hidden;
                }
                .header-entry > span {
                    display: inline-block;
                }
                .label {
                    flex-basis: 75%;
                    flex-grow: 3;
                    flex-shrink: 3;
                    max-width: 75%;
                    white-space: nowrap;
                    overflow: hidden;
                    text-overflow: ellipsis;
                }
                .icon {
                    flex-basis: 25%;
                    flex-grow: 1;
                    flex-shrink: 1;
                    text-align: center;
                    white-space: nowrap;
                    line-height: 1.5rem;
                    opacity: 0.6;
                    user-select: none;
                }
                .pre-wrapper {
                    grid-area: c;
                    white-space: nowrap;
                    counter-reset: line;
                    overflow-x: auto;
                    margin: 0;
                    margin-top: ${v.padding || "var(--padding, 4px)"};
                }
                .code-wrapper {
                    display: block;
                }
                .data-log-event {
                    display: block;
                    animation: fadein-translate-y 0.4s ease-in-out 0s 1 normal forwards running;
                }
                .data-log-event:before {
                    counter-increment: line; 
                    content: counter(line) " "; 
                    padding-right: 10px;
                    color: ${v.colors.heading || "var(--heading-color, #9098a9)"};
                }
                .fa {
                    display: inline-block;
                    font: normal normal normal 14px/1 FontAwesome;
                    font-size: inherit;
                    text-rendering: auto;
                    -webkit-font-smoothing: antialiased;
                    -moz-osx-font-smoothing: grayscale;
                }
                .icon i {
                    transition: all 1s ease;
                }
                .fa-chevron-left:before {
                    content: "\\f053";
                }
                i.fa-chevron-left {
                    transform: translate(calc(var(--state) * 150%), 0%);
                }
                .fa-chevron-right:before {
                    content: "\\f054";
                }
                i.fa-chevron-right {
                    transform: translate(calc(var(--state) * -150%), 0%);
                }
                .spinner-wrapper {
                    display: flex;
                    justify-content: center;
                    align-items: center;
                    text-align: center;
                    overflow: hidden;
                }
                @keyframes fadein-translate-y {
                    0% {
                    visibility: visible;
                    transform: translate(0%, 50%);
                    opacity: 0;
                    }
                    100% {
                    transform: translate(0%,0%);
                    opacity: 1;
                    visibility: visible;
                    }
                }
                @container component-container (max-width: 2080px) {
                    path.path-wide {
                    opacity: 1;
                    }
                    path:not(.path-wide){
                    opacity: 0;
                    }
                }
                @container component-container (max-width: 960px) {
                    path.path-normal {
                    opacity: 1;
                    }
                    path:not(.path-normal){
                    opacity: 0;
                    }
                }
                @container component-container (max-width: 480px) {
                    path.path-small {
                    opacity: 1;
                    }
                    path:not(.path-small){
                    opacity: 0;
                    }
                }
                @container component-container (max-width: 240px) {
                    .fa {
                    font-size: 0.5rem !important;
                    }
                    .icon {
                    line-height: 1rem;
                    }
                }
                @container component-container (max-width: 100px) {
                    .fa {
                    font-size: 0rem !important;
                    }
                    .icon {
                    opacity: 0;
                    }
                    svg {
                    opacity: 0;
                    }
                }
                </style>
            `}`
        }}
        +> ${ch.dom`
            <div class="header">
                <svg
                viewBox="-2 -2 132 36"
                preserveAspectRatio="none"
            >
                <path class="path-small" pathLength="1"
                d="M 2,32 L 106,32 L 122,32 L 130,24 L 122,16 L 106,16 L 98,24 L 106,32"
                ></path>
                <path class="path-normal" pathLength="1"
                d="M 2,32 L 110,32 L 117,32 L 121,24 L 117,16 L 110,16 L 106,24 L 110,32"
                ></path>
                <path class="path-wide" pathLength="1"
                d="M 0,32 L 112,32 L 115,32 L 117,24 L 115,16 L 112,16 L 110,24 L 112,32"
                ></path>
            </svg>
            <div class="header-entry">
                <span class="label">Hide Messages</span>
                <span class="icon">
                <i class="fa fa-chevron-left"></i>
                <i class="fa fa-chevron-right"></i>
                </span>
            </div>
            </div>
        `}
        +> ${ch.dom`
            <pre class="pre-wrapper content">
                <div class="spinner-wrapper">
                    <slot></slot>
                </div>
                <code class="code-wrapper">
                </code>
            </pre>
        `}
        => ${({values:v}) => () => {
            v.header = shadow.querySelector(".header");
            v.headerMessage = shadow.querySelector(".header-entry > .label");
            v.svg = shadow.querySelector("svg");
            v.pre = shadow.querySelector("pre");
            ch(v.header)
            .on("click", toggle = v.toggle = el.toggle = ch.throttle(function(){
                state = state ? 0 : 1;
                ch(v.header).style("--state", state)
                (v.svg)
                .each((path, index) => {
                    ch(path)
                    .cancelAnimate({commit: ["strokeDasharray"]})
                    .animate(pathAnims[index]?.slice()?.[state ? "reverse" : "slice"](), {duration: 400, fill:"both", easing: "linear"})
                })
                (v.headerMessage)
                .set("textContent", ["Show Messages", "Hide Messages"][state])
                (v.pre)
                .animate([
                    {
                    transform: `translate(0px, ${(1 - state) * -100}px)`,
                    opacity: state,
                    display: ["none", "block"][state]
                    }
                ], {duration: 400, fill:"both", easing: "ease-in-out"})
            }, {delay: 50}))
        }}
        => ${({values:v}) => () => v.toggle()}
        `
    }
}

export {codyLoggerGen}