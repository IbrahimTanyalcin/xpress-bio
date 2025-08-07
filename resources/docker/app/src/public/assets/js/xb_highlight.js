(function (global, factory) {
    typeof exports === 'object' && typeof module !== 'undefined' ? module.exports = factory() :
    typeof define === 'function' && define.amd ? define(factory) :
    (global = typeof globalThis !== 'undefined' ? globalThis : global || self, global.xb_highlight = factory());
})(this, (function () { 'use strict';


	let outerBarcode;
	const style = document.head.querySelector('style[data-xb-highlight]');
	if (!style) {
	  const genHexStr = (function(){
		const ceil = Math.ceil,
			  log = Math.log,
			  min = Math.min,
			  rand = Math.random,
			  log10b16 = log(10) / log(16),
			  maxPow10 = Math.log(Number.MAX_SAFE_INTEGER) / Math.log(10) | 0;
		return function genHexStr(complexity = 6, reps =2, prefix = "", postfix = ""){
		  let padding = "0".repeat(ceil(complexity * log10b16)),
			  ceiling = 10 ** min(maxPow10, complexity);
		  return prefix 
			+ Array.from({length: reps}, d => (
			padding 
			+ (+(rand() * ceiling).toFixed(0)).toString(16)
		  ).slice(-padding.length)).join("").replace(/^0/,"f")
			+ postfix
		}
	  })();
	   outerBarcode = genHexStr(8,2, "xb-highlight-");
	   const borderAngle = `--${outerBarcode}-border-angle`,
			 animName = `${outerBarcode}-bg-spin`,
			 styleStr = `
		.${outerBarcode} {
			${borderAngle}: 0turn;
			--gradient-border: conic-gradient(from var(${borderAngle}), var(--xb-highlight-stop-1, transparent 25%), var(--xb-highlight-stop-2, orange), var(--xb-highlight-stop-3, orange 50%), var(--xb-highlight-stop-4, transparent));
			background: var(--gradient-border) border-box;
			background-position: center center;
			background-repeat: no-repeat;
			animation: ${animName} calc(var(--xb-speed, 3) * 1s) linear infinite;
			transition: top 0.25s ease, left 0.25s ease;
		}

		@keyframes ${animName} {
			to {
				${borderAngle}: 1turn;
			}
		}
		@property ${borderAngle} {
			syntax: "<angle>";
			inherits: true;
			initial-value: 0turn;
		}
	   `;
		const style = document.createElement("style");
		style.textContent = styleStr;
		style.setAttribute("data-xb-highlight", outerBarcode);
		document.head.appendChild(style);
	} else {
		outerBarcode = style.getAttribute("data-xb-highlight");
	}

    
   const sTimeout = Symbol("timeout"),
		 sOverlay = Symbol("overlay"),
		 until_v2 = ((_tmo, _res) => {
			async function* until (f, interval, breaker, pauser, resolver){
				let cond = false;
				while(!breaker.value && !cond){
					yield cond = await nPromise(f, interval, pauser, resolver);
				}
			}
			function nPromise(f, interval, pauser, resolver) {
				return new Promise(res => {
					f[_res] = res;
					f[_tmo] = setTimeout(() => {
						if(!pauser.value){return res(f())}
						resolver.value = () => res(f());
					}, interval)
				})
			}
			return function (f, {thisArg = "", args = [], interval = 0} = {}) {
				const that = thisArg ?? this,
					  breaker = {value: false},
					  pauser = {value: false},
					  resolver = {value: void(0)},
					  _f = function(){
						return f.call(that, ...args);
					  },
					  _until = (async () => {
						let lastVal;
						for await (lastVal of until(_f, interval, breaker, pauser, resolver)){}
						return lastVal;
					  })();
				_until.break = (executeCurrent, lastVal) => {
					breaker.value = true;
					if (!executeCurrent) {
						clearTimeout(_f[_tmo]);
						_f[_res]?.(lastVal);
					}
				};
				_until.pause = () => {pauser.value = true};
				_until.resume = () => {pauser.value = false; resolver?.value?.()};
				return _until;
			}
		})(Symbol(), Symbol());
   //"transparent 25%, #08f, #f03 99%, transparent"
    return function xb_highlight(el, {timeout = 3000, speed = 3, padding = 6, zIndex = 9999, borderRadius= 4, stop = "transparent 25%, orange, orange 50%, transparent"} = {timeout: 3000, speed: 3, padding: 6, zIndex: 9999, borderRadius: 4, stop: "transparent 25%, orange, orange 50%, transparent"}) {
        //el?.classList?.add(outerBarcode);
        if (!(el instanceof Node)) {
            el = document.querySelector(el);
        }
        clearTimeout(el?.[sTimeout]);
        el?.[sOverlay]?.parentNode && el?.[sOverlay]?.remove();
        if ([null, false].includes(arguments[1])) { return }
        timeout = Math.min(0x7FFFFFFF, timeout);
        const 
            rect = el.getBoundingClientRect(),
            overlay = document.createElement('div'),
            sty = overlay.style;
        Object.assign(sty, {
            position: "absolute",
            top: `${rect.top - padding}px`, 
            left: `${rect.left - padding}px`,
            width: `${rect.width + 2 * padding}px`,
            height: `${rect.height + 2 * padding}px`,
            borderRadius: `${borderRadius}px`,
            pointerEvents: 'none',
            zIndex: zIndex,
            clipPath: `inset(0px round 0)`
        });
        sty.setProperty("--xb-speed", speed);
        stop
            .replace(/[^-a-zA-Z0-9#%., ()]/g, '')
            .split(",")
            .forEach((stop, i) => sty.setProperty(`--xb-highlight-stop-${i + 1}`, stop));
        const {left: x, top: y, width: w, height: h} = rect;
        
        overlay.style.clipPath = `polygon(
            0% 0%, 0% 100%, ${padding}px 100%, ${padding}px ${padding}px,
            ${padding + w}px ${padding}px, ${padding + w}px ${padding + h}px,
            ${padding}px ${padding + h}px,
            ${padding}px 100%,
            100% 100%,
            100% 0%
        )`;
        
        overlay.classList.add(outerBarcode);
        el[sOverlay] = el?.ownerDocument?.body?.appendChild(overlay);
        el[sTimeout] = setTimeout(() => {
            el[sOverlay] = void(0);
            overlay?.parentNode && overlay?.remove()
        }, timeout);

		until_v2(function(){
			//console.log("overlay updatepos running");
			const rect = el.getBoundingClientRect(),
				scrollY = window.scrollY ?? window.pageYOffset ?? Math.max(document.documentElement.scrollTop ?? 0, document.body.scrollTop ?? 0) ?? 0,
				scrollX = window.scrollX ?? window.pageXOffset ?? Math.max(document.documentElement.scrollLeft ?? 0, document.body.scrollLeft ?? 0) ?? 0;
			sty.top = `${rect.top + scrollY - padding}px`;
			sty.left = `${rect.left + scrollX - padding}px`;
			return !this?.parentNode
		}, {thisArg: overlay, interval: 250})
    }
}));