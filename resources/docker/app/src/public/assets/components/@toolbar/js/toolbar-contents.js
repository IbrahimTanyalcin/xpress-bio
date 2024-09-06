import { Annotations } from "../../../js/modules/main-annotation-indexing.js";
const ch = ch2;
let blastQuery = null;
export default function (IGVBrowsers, data, datum, resize) {
    const 
        min = Math.min,
        max = Math.max,
        toggle = (names = [], onoff = true) => Promise.all(
            names
            .map(d => 
                ch(icons[d].parentElement)
                .cancelAnimate({commit: ["transform", "opacity"]})
                .exec(function() {
                    if (!onoff){return}
                    /*
                    REGRESSION CHROME UPDATE: 
                    new chrome 119 does NOT read from animation state,
                    although getComputedStyle($0).display will return "block",
                    explicitly not setting style object to block will cause
                    pointer events to not fire! This needs a bug report.
                    */
                    return ch.style("display","block")
                    .immediateAnimate([{display : "block"}])
                })
                .animate([{
                    transform: onoff ? "scale(1, 1)" : "scale(0, 0)",
                    opacity: onoff ? "1" : "0"
                }],{duration: 250, ease: "ease-in-out", fill: "both"})
                .immediateAnimate([{display : onoff ? "block" : "none"}])
                .promiseAnimate()
            )
        ).catch(() => {}),
        resetPinStyle = ch.throttle((el) => {
            Array.from(
                document.querySelectorAll(".igv-toolbar-pin")
            ).forEach(
                d => (d !== el) && ch(d).style("background", "transparent")
            )
        });
    const icons = {
        delete: ch.dom`<span title="delete applet" class="delete-icon"><i class="fa fa-trash-o"></i></span>`,
        tracks: ch.dom`<span title="add tracks"><i class="fa fa-road"></i></span>`,
        pin: ch.dom`<span title="pin applet" style="border-radius: 4px;" class="igv-toolbar-pin"><i class="fa fa-crosshairs"></i></span>`,
        up: ch.dom`<span title="move up"><i class="fa fa-caret-up"></i></span>`,
        down: ch.dom`<span title="move down"><i class="fa fa-caret-down"></i></span>`,
        annot: ch.dom`
            <div
                title = "add annotations" 
                style = "font-size: 1rem; line-height: 2rem; max-height: 2rem; max-width: 10rem; margin: 0px;"
                class="custom-dropdown"
            >
                <select
                onclick="this.setAttribute('data-value', this.value)"
                onchange="this.setAttribute('data-value', this.value)"
                class="pwd-select-template-annots"
                data-value=""
                >
                    <option selected></option>
                ${
                    Array.from(Annotations.value?.keys?.() ?? [])
                    .map((d, i) => ch[`option{
                        "prop": [
                            ["textContent", "${
                                IGVBrowsers.methods.shortenStringMiddle(d)
                            }"],
                            ["value", "${d}"]
                        ],
                        "attr": [["value", "${d}"],["title", "${d}"]]
                    }`].outerHTML)
                }
                </select>
                <label class="floating-label">Annotations</label>
            </div>
        `,
        add: ch.dom`<span title="add selected tracks"><i class="fa fa-plus-square"></i></span>`,
        back: ch.dom`<span title="go back"><i class="fa fa-long-arrow-left"></i></span>`,
        search: ch.dom`<span title="run blast query"><i class="fa fa-search"></i></span>`,
        refresh: ch.dom`<span title="clear regions of interest"><i class="fa fa-refresh"></i></span>`
    },
    deck1 = ["delete", "tracks", "pin", "search", "refresh", "up", "down"],
    deck2 = ["annot", "add", "back"];
    return [
        {
            html: icons.delete,
            cb: () => {
                IGVBrowsers.browsers.delete(datum.browser);
                data[data.indexOf(datum)] = null;
                setTimeout(() => igv?.removeBrowser(datum.browser), 2000);
            }
        },
        {
            html: icons.tracks,
            cb: async () => {
                await toggle(deck1, false);
                await toggle(deck2, true);
                resize();
            }
        },
        {
            html: icons.pin,
            cb: () => {ch(icons.pin)`
                style background ${() => {
                    if (IGVBrowsers.pinned === datum.browser) {
                        IGVBrowsers.pinned = void(0);
                        return "transparent"
                    }
                    IGVBrowsers.pinned = datum.browser;
                    resetPinStyle(icons.pin);
                    return "var(--success-color-transparent)"
                }}
            `}
        },
        {
            html: icons.search,
            cb: async () => {
                if (icons.search._busy){return}
                icons.search._busy = true;
                if (!blastQuery) {
                    blastQuery = (await import("/static/js/modules/module-blast-query.js")).default;
                    await ch.until(() => blastQuery?.value).lastOp;
                }
                blastQuery.value(IGVBrowsers, data, datum); //pass datum etc.
                icons.search._busy = false;
            }
        },
        {
            html: icons.refresh,
            cb: ch.throttle(async () => {
                datum.browser.clearROIs();
            })
        },
        {
            html: icons.up,
            cb: () => {
                const 
                    i = data.indexOf(datum),
                    prev = data[i - 1];
                if (!prev) {return}
                [data[i], data[i - 1]] = [prev, datum]
            }
        },
        {
            html: icons.down,
            cb: () => {
                const 
                    i = data.indexOf(datum),
                    next = data[i + 1];
                if (!next) {return}
                [data[i + 1], data[i]] = [datum, next]
            }
        },
        {
            html: icons.annot,
            cb: () => {
            },
            highlight: false,
            hidden: true
        },
        {
            html: icons.add,
            cb: () => {
                const slctEl = icons.annot.firstElementChild;
                IGVBrowsers.methods.loadIGVTrack(
                    datum.browser,
                    slctEl.value || slctEl.options[slctEl.selectedIndex]?.value
                )
            },
            hidden: true
        },
        {
            html: icons.back,
            cb: async () => {
                await toggle(deck2, false);
                await toggle(deck1, true);
                resize();
            },
            hidden: true
        }
    ]
}