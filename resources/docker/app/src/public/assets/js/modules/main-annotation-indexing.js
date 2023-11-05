import {keepFirstNElements, shortenStringMiddle} from "./pre.js"
const Annotations = {value: void(0)}; //Annotations

export default function(evtSource) {
    evtSource.addEventListener("annot-file-list",function(e){
        Annotations.value = new Map(
            Object.entries(JSON.parse(e.data))
        );
        const list = Array.from(Annotations.value.keys() ?? []);
        Array.from(document.querySelectorAll(
            ".pwd-select-template-annots"
        )).forEach(slctEl => {
            const preVal = slctEl.value || slctEl.options[slctEl.selectedIndex]?.value;
            keepFirstNElements(slctEl, 1);
            ch2(slctEl)`
            +> ${list.map(d => {
                const opt = ch2.option
                ch2(opt)
                .satr([["value", d], ["title", d]])
                .set([["textContent", shortenStringMiddle(d, {length: 20})],["value", d]])
                .exec(() => {
                    if (preVal === d) {
                        ch2.satr("selected","");
                        ch2(slctEl).satr("data-value", d);
                    }
                })(slctEl);
                return opt;
            })}`
        })
    });
}

export {Annotations};