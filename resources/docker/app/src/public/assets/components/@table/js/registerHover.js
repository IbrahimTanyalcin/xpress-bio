import copyTextToClipboard from "../../../js/modules/copyTextToClipboard.js"; 

const rndGen = taskq._exportPersist.genHexStr,
    registerHover = ({modal, table, cols, rows, keys}) => {
        const showValue = rndGen(8, 2, "table-viewer-show-value-"),
            copyToClipboard = rndGen(8, 2, "table-viewer-copy-clipboard-"),
            igvGoTo = rndGen(8, 2, "table-viewer-igv-go-to-"),
            rowInfo = rndGen(8, 2, "table-viewer-row-info-");
        let doNotShowIGVMissingWarning = 0,
            doNotShowIGVSearchWarning = 0;
        table.__hover = ch`
        -> ${document.createElement("div")}
        style ${[
            ["text-align", "center"]
        ]}
        >> innerHTML ${`
            <div class="hoverable" title="show value" id="${showValue}">
                <i class="fa fa-eye"></i>
            </div>
            <div class="hoverable" title="copy" id="${copyToClipboard}">
                <i class="fa fa-copy"></i>
            </div>
            <div class="hoverable" title="search in igv" id="${igvGoTo}">
                <i class="fa fa-search"></i>
            </div>
        `}
        `.selected;

        ch`
        @> ${"#" + showValue}
        on click ...${[
            function(e) {
                const td = this.closest("td");
                if(!td){return}
                modal.issueInfo({msg: td.getAttribute("title"), fadeout: 30000});
            }
        ]}
        up ${0}
        @> ${"#" + copyToClipboard}
        on click ...${[
            function() {
                const td = this.closest("td");
                if(!td){return}
                copyTextToClipboard(td.getAttribute("title"));
            }
        ]}
        up ${0}
        @> ${"#" + igvGoTo}
        on click ...${[
            async function() {
                if ((typeof igv === "undefined") || !igv.browser){
                    if (doNotShowIGVMissingWarning){return}
                    const result = await Swal.fire({
                        icon: "warning",
                        title: "No IGV browser",
                        text: `Initiate IGV before searching for loci`,
                        confirmButtonText: "Don't show this again",
                        showCancelButton:true
                    });
                    if(result.isConfirmed){
                        doNotShowIGVMissingWarning = 1;
                    }
                    return
                }
                try {
                    if(isNaN(rowInfoEl.__position)) {
                        throw new TypeError(`Column ${keys["position-index"] + 1} cannot be coerced to a number`);
                    }
                    let bpLength = igv?.browser?.genome?.chromosomes?.[rowInfoEl.__identifier]?.bpLength ?? Infinity,
                        searchStrStart = `${Math.max(0, Math.min(+rowInfoEl.__position - 150, bpLength))}`,
                        searchStrEnd = `${Math.min(+rowInfoEl.__position + 150, bpLength)}`,
                        searchStr = `${rowInfoEl.__identifier}:${searchStrStart}-${searchStrEnd}`;
                    await igv.browser.search(searchStr)
                    .then(async (x)=> {
                        if (x ?? 1) {return}
                        if (doNotShowIGVSearchWarning){return}
                        const result = await Swal.fire({
                            icon: "warning",
                            title: "No such region",
                            text: `The region could not be found`,
                            confirmButtonText: "Do not show this again",
                            showCancelButton:true
                        });
                        if(result.isConfirmed){
                            doNotShowIGVSearchWarning = 1;
                        }
                    })
                    .catch((err) => {throw err})
                } catch (err) {
                    const result = await Swal.fire({
                        icon: "error",
                        title: err?.name ?? "Error",
                        text: `${err?.message ?? "There was an error while searching for loci"}`,
                        showCancelButton:false,
                        confirmButtonText: "Ok"
                    });
                }
            }
        ]}
        `

        const rowInfoEl = ch(modal)`
        *> ${"div"} |> sappend ${0}
        satr id ${rowInfo}
        style ${[
            ["position", "absolute"],
            ["top", 0],
            ["left", 0],
            ["height", "5%"],
            ["width", "100%"],
            ["display", "flex"],
            ["font-size", "1rem"],
            ["text-align", "left"],
            ["text-indent", "1rem"],
            ["min-height", "1.5rem"],
            ["align-items", "center"],
            ["background", "var(--border-color)"],
            ["color", "var(--font-color-light)"]
        ]}
        `.selected;

        ch(table)`
        $> ${
            [
                (() => {
                    let busy = 0,
                        prev = null;
                    return (e) => {
                        if (busy) {return}
                        busy = 1;
                        window.requestAnimationFrame(() => busy = 0);
                        let x = e?.clientX ?? e.targetTouches[0].clientX,
                            y = e?.clientY ?? e.targetTouches[0].clientY,
                            el = document.elementFromPoint(x, y),
                            td = el.closest("td");
                        if (!td) {return}
                        if (td === prev) {return}
                        prev?.removeAttribute("title");
                        prev = td;
                        ch(td).satr("title", td.textContent);
                        if (table.isResponsive) {
                            ch.prepend([table.__hover]);
                        } else {
                            ch.append([table.__hover]);
                        }
                        //rowInfoEl.textContent = ch.up().get("__index");
                        const idx = ch.up().get("__index"),
                            row = rows[idx],
                            identifier = row[keys["sequence-index"]],
                            position = row[keys["position-index"]],
                            goto = `${identifier}:${position}`;
                        rowInfoEl.__identifier = identifier;
                        rowInfoEl.__position = position;
                        rowInfoEl.__goto = goto;
                        rowInfoEl.textContent = `row #${idx + 1}, ${goto}`;
                    }
                })(),
                (e) => {
                    if (e?.type === "mouseout" && table.contains(e.relatedTarget)) {
                        return
                    }
                    //ch(table.__hover).up().rm([table.__hover]); -> causes scroll issues
                    rowInfoEl.textContent 
                    = rowInfoEl.__goto 
                    = rowInfoEl.__identifier
                    = rowInfoEl.__position
                    = "";
                }
            ]
        }
        on mousemove ${({values}) => values[0][0]}
        on touchmove ${({values}) => values[0][0]}
        on mouseout ${({values}) => values[0][1]}
        on touchend ${({values}) => values[0][1]}
        `
    }

export default registerHover;