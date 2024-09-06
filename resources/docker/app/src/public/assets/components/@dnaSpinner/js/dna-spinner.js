function dnaSpinnerGen (ch) {
    return function dnaSpinner({name, attrs, styles, props, data, el, proto}) {
        if (!el.initialized){
            proto.initialized = true;
            proto.remove = function(){
            return ch(this).animate([{
                transform: "translate(0%, -100%)",
                opacity: 0
            }], {duration:1000, easing: "ease-in-out", fill: "both"}).lastOp.then(() => (this.parentNode.removeChild(this), this))
            }
        }
        const shadow = el.attachShadow({ mode: "open" });
        ch(el)`
        => ${({values:v}) => () => {
            v.nodeColor = ch.gatr("data-node-color") || "orange";
            v.strandColor = ch.gatr("data-strand-color") || "white";
            v.size = ch.gatr("data-size") || 4;
            v.sizeUnits = ch.gatr("data-size-units") || "rem";
            v.fractionStrand = +ch.gatr("data-fraction-strand") || 130;
            v.fractionNode = +ch.gatr("data-fraction-node") || 130;
            v.fractionGap = +ch.gatr("data-fraction-gap") || 130;
            v.fadein = el.fadein = (ch.gatr("data-fadein") ?? null) !== null ? 1 : 0;
        }}
        -> ${shadow}
        => ${({values:v}) => () => {
            ch`
            +> ${ch.dom`
            <style data-for="dna-spinner">
                *,
                *:after,
                *:before {
                box-sizing: border-box;
                }
                .dna {
                height: ${v.size}${v.sizeUnits};
                aspect-ratio: 2/5;
                display: grid;
                transform-style: preserve-3d;
                transform: rotateX(0deg);
                rotate: 45deg;
                gap: ${v.size / v.fractionGap}${v.sizeUnits};
                animation: rotate 14s infinite linear${v.fadein ? ", fadein-translate-y 0.75s ease-in-out 0s 1 normal forwards running" : ""};
                }
    
                @keyframes spin {
                to {
                    transform: rotateY(360deg);
                }
                }
    
                .strand {
                --speed: 2;
                --delay: calc(sin((var(--index) / var(--total)) * 45deg) * var(--speed) * -1s);
                width: 100%;
                transform-style: preserve-3d;
                display: flex;
                justify-content: space-between;
                }
    
                .strand__node {
                background: var(--bg, white);
                height: 100%;
                aspect-ratio: 1;
                border-radius: 50%;
                animation: jump calc(var(--speed) * 1s) var(--delay, 0) infinite ease-in-out;
                border: ${v.size / v.fractionNode}${v.sizeUnits} solid ${v.nodeColor};
                }
    
                .strand:before {
                content: "";
                position: absolute;
                top: 50%;
                left: 50%;
                width: 94%;
                height: 30%;
                background: var(--bg-strand, white);
                transform: translate3d(-50%, -50%, -2px);
                transform-origin: center;
                animation: scale calc(var(--speed) * 1s) var(--delay, 0) infinite linear;
                border: ${v.size / v.fractionStrand}${v.sizeUnits} solid ${v.strandColor};
                }
    
                @keyframes scale {
                25%, 75% {
                    transform: translate3d(-50%, -50%, -2px) scaleX(0);
                }
                0%, 50%, 100% {
                    transform: translate3d(-50%, -50%, -2px) scaleX(1);	
                }
                }
    
                .strand__node:first-of-type {
                --destination: calc((${v.size}${v.sizeUnits} * (2 / 5)) - 100%);
                /* 	background: hsl(120 80% 50%); */
                }
                .strand__node:last-of-type {
                --destination: calc((-${v.size}${v.sizeUnits} * (2 / 5)) + 100%);
                animation-direction: reverse;
                /* 	background: hsl(210 80% 50%); */
                }
    
                .strand__node:after {
                display: none;
                content: "";
                height: 15%;
                aspect-ratio: 1;
                background: var(--bg, white);
                position: absolute;
                border-radius: 50%;
                top: 50%;
                left: 50%;
                transform: translate(-50%, -50%) rotate(0deg) translateY(450%);
                animation: orbit calc(var(--speed) * 0.35s) var(--delay, 0) infinite linear;
                }
    
                @keyframes orbit {
                100% {
                    transform: translate(-50%, -50%) rotate(360deg) translateY(450%);
                }
                }
    
                @keyframes jump {
                25% {
                    translate: 0 0 1px;
                    opacity: 1;
                }
                50% {
                    transform: translateX(var(--destination));
                    opacity: 1;
                }
                75% {
                    translate: 0 0 -1px;
                    opacity: 0.1;
                }
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
                </style>
            `}`
        }}
        +-> ${ch.dom`
            <div class="dna" style="--total: 13;">
            <div class="strand" style="--index: 1;">
                <div class="strand__node"></div>
                <div class="strand__node"></div>
            </div>
            <div class="strand" style="--index: 2;">
                <div class="strand__node"></div>
                <div class="strand__node"></div>
            </div>
            <div class="strand" style="--index: 3;">
                <div class="strand__node"></div>
                <div class="strand__node"></div>
            </div>
            <div class="strand" style="--index: 4;">
                <div class="strand__node"></div>
                <div class="strand__node"></div>
            </div>
            <div class="strand" style="--index: 5;">
                <div class="strand__node"></div>
                <div class="strand__node"></div>
            </div>
            <div class="strand" style="--index: 6;">
                <div class="strand__node"></div>
                <div class="strand__node"></div>
            </div>
            <div class="strand" style="--index: 7;">
                <div class="strand__node"></div>
                <div class="strand__node"></div>
            </div>
            <div class="strand" style="--index: 8;">
                <div class="strand__node"></div>
                <div class="strand__node"></div>
            </div>
            <div class="strand" style="--index: 9;">
                <div class="strand__node"></div>
                <div class="strand__node"></div>
            </div>
            <div class="strand" style="--index: 10;">
                <div class="strand__node"></div>
                <div class="strand__node"></div>
            </div>
            <div class="strand" style="--index: 11;">
                <div class="strand__node"></div>
                <div class="strand__node"></div>
            </div>
            <div class="strand" style="--index: 12;">
                <div class="strand__node"></div>
                <div class="strand__node"></div>
            </div>
            <div class="strand" style="--index: 13;">
                <div class="strand__node"></div>
                <div class="strand__node"></div>
            </div>
            </div>
        `}
        &> ${({values:v}) => (strand) => {
            ch(strand).style("--bg-strand", v.strandColor).each((node) => {
                ch(node).style("--bg", v.nodeColor)
            })
        }}
        `
    }
}

export {dnaSpinnerGen};