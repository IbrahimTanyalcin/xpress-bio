import { bytesToHuman, loadCSSAsyncOnce, loadCSSAsyncOnceMulti, loadScriptAsyncOnce } from "./pre.js";
import registerContentArea from "../../components/@table/js/registerContentArea.js";
import registerWarning from "../../components/@table/js/registerWarning.js";
import registerSuccess from "../../components/@table/js/registerSuccess.js";
import registerError from "../../components/@table/js/registerError.js";
import registerInfo from "../../components/@table/js/registerInfo.js";
import generateStyle from "../../components/@table/js/generateStyle.js";
import renderTable from "../../components/@table/js/renderTable.js";
import { fadeInUp, fadeOutUp } from "./js-animations.js";
import { blastSubscriber } from "./post-main-blast.js";


const 
    ch = ch2,
    blastQuery = {value: null},
    IUPAC_nucl = /^[ATUCGRYSWKMBDHVN]+$/,
    animOpts = {duration: 400, delay: 0, ease:"ease-in-out", "fill": "both"};
let doNotShowIGVBlastHighlighWarning = 0;
(async() => {
    /*I can also wait here to make sure Modal is defined like in @tools/init.js, but I do not think it is necessary*/
    await loadScriptAsyncOnce("static/components/@tools/js/chain.0.0.0.evergreen.umd.min.js");
    await loadScriptAsyncOnce("static/components/@tools/js/ch.js");
    await Promise.all([
        loadScriptAsyncOnce("static/components/@table/js/basictable.min.js"),
        loadCSSAsyncOnceMulti({
            "static/components/@tools/css/init.css": null,
            "static/components/@table/css/basictable.css": null,
            "static/components/@table/css/responsive-table-type-1.css": null
        })
    ]);
    await ch.until(() => blastSubscriber).lastOp;
    generateStyle(Modal.className);
    blastQuery.value = renderBlastUI;
})()

function renderBlastUI(IGVBrowsers, data, datum){
    const 
        fastaFilenameFull = IGVBrowsers.methods.parseFilename(datum.oIGV.reference.fastaURL).full,
        fastaFilenameShort = IGVBrowsers.methods.shortenStringMiddle(fastaFilenameFull),
        modal = Modal({sty:[["background", "var(--bg-color)"]]});
    let contentArea, contentAreaID;
    ch(modal)`
    => ${({values:v}) => () => {
        registerError(modal);
        registerInfo(modal);
        registerWarning(modal);
        registerSuccess(modal);
        ({rndID: contentAreaID, node: contentArea} = registerContentArea(modal));
    }}
    `;

    ch`
    -> ${contentArea}
    style ${[
        ["align-items", "flex-start"],
        ["flex-wrap", "wrap"],
        ["row-gap", "1rem"],
        ["height", "unset"]
    ]}
    +-> input: ${ch.dom`
        <bioinfo-input 
            style="flex-grow:1; flex-basis: 100%;" 
            data-title="${fastaFilenameFull}"
            data-colors="hover,var(--page-color)" 
            data-label="Enter query for ${fastaFilenameShort}" 
            data-fadein
        ></bioinfo-input>
    `}
    style ${[
        ["margin", 0]
    ]}
    animate ...${fadeInUp({...animOpts, delay: 1200})}
    up ${0}
    +-> sendButton: ${ch.dom`
        <div class="button-container" style="opacity: 0; justify-content: center;">
            <button class="button-a-type-2" style="min-height: 10vmin;">
                RUN <i class="fa fa-send"></i>
            </button>
        </div>
    `}
    animate ...${fadeInUp({...animOpts, delay: 1000})}
    on click@send ${({values:v}) => async (e) => {
        const 
            inputValue = v.input.value(),
            blastOpts = "";
        if (!IUPAC_nucl.test(inputValue)) {
            await Swal.fire({
                icon: "error",
                title: "Invalid IUPAC code",
                text: `Only the letters ${[..."ATUCGRYSWKMBDHVN"].join(",")} are allowed.`,
                showCancelButton:false,
                confirmButtonText: "Ok"
            });
            return
        }
        if (inputValue.length < 20) { //twice the wordsize of backend value, think middle of normal distribution
            await Swal.fire({
                icon: "error",
                title: "Query too short",
                text: `Minimum word size is 10.`,
                showCancelButton:false,
                confirmButtonText: "Ok"
            });
            return
        }
        v.input.disable();
        await ch(v.sendButton).animate(...fadeOutUp(animOpts))`|> await ${() => () => v.sendButton.remove()}`.lastOp;
        let logger;
        ch(contentArea)`+> logger: ${logger = ch.dom`
            <cody-logger data-fadein data-colors="font,var(--bg-color-3),background,var(--font-color-light)">
                <dna-spinner data-strand-color="dimgray" data-node-color="orange" data-size="8"></dna-spinner>
            </cody-logger>
        `}`;
        const locationPromise = subscribeToLogs({subscriber: blastSubscriber, modal, channel: fastaFilenameFull, query: inputValue, blastOpts, logger});
        const response = await fetch('/blast/blastn', {
            method: 'POST',
            headers: {'Content-Type': 'application/json'},
            body: JSON.stringify({filename: fastaFilenameFull, query: inputValue, blastOpts})
        });
        if (!response.ok){
            return modal.issueError({msg: `There was an error with your query. Refer to the message board below for the details and retry in a new window.`})
           /*
            If I change my mind and display the error w/ Swal:
            await Swal.fire({
                icon: "error",
                title: "Retry",
                text: `There was an error with your query. Refer to the message board for the details and retry in a new window.`,
                showCancelButton:false,
                confirmButtonText: "Ok"
            }); */
        }
        const location = await locationPromise;
        if (location instanceof Error) {
            return modal.issueError({msg: `There was an error with generating results. Refer to the message board for the details and retry in a new window.`})
        }
        parseTable({subscriber: blastSubscriber, modal, channel: fastaFilenameFull, query: inputValue, blastOpts, logger, location, contentArea})
        .then((obj) => {
            /* console.log("obj is", obj); */
            logger.toggle();
            renderTable({...obj, onClickGo: highlightROI, query: inputValue, IGVBrowsers, breakpoint: 0, onPointerOut: showQueryWhenIdle});
            /*override styles set by renderTable */
            ch(contentArea)
            .style([
                ["top", "max(1.5rem, 5%)"],
                ["height", "calc(100% - max(1.5rem, 5%))"],
                ["display", "flex"],
                ["justify-content", "center"],
                ["align-items", "flex-start"],
                ["overflow-y", "scroll"]
            ])
            .select("table thead")
            .style("z-index", 1)
            .select("tr")
            .each((th, i) => {
                const info = obj.info[i];
                ch(th)`+-> ${[ch.dom`<br>`, ch.dom`<i title="${info}" style="text-align:center;" class="hoverable info fa fa-info-circle"></i>`]}`
                .on("click", function(){modal.issueInfo({msg: info})})
            })
            .up().up().select("tbody")
            .each((tr, i) => {
                if (obj.rows[i].direction === "F"){
                    ch(tr.firstElementChild).addClass("forward-strand");
                } else {
                    ch(tr.firstElementChild).addClass("reverse-strand");
                }
            })
        })
        .catch(err => modal.issueError({msg: (err?.message ?? err) || `There was an error during parsing/rendering of the blast table.`}));
    }}`;

}

/**
 * @description subscribes to the display messages via codyLogger
 * @param {Object} Options all the information needed for subscriptions
 * @param {Object} Options.subscriber reference to blast subscriber
 * @param {Object} Options.modal reference to the draggable modal window
 * @param {string} Options.channel the full file name, corresponds to fastaFilenameFull
 * @param {string} Options.query the query string from the bioinfo-input component
 * @param {string} Options.blastOpts the blast options, empty string by default
 * */
function subscribeToLogs({subscriber, modal, channel, query, blastOpts, logger}) {
    logger.css(`
        .fa-download:before {
            content: "\\f019";
        }
    `);
    let _r,_j;
    const 
        blastSubscription = subscriber.subscribe(channel, () => !document.contains(modal)),
        locationPromise = new Promise((r,j) => (_r = r, _j = j));
    Object.entries({
        "worker-blastn-db-creation-start": void(0),
        "worker-blastn-db-creation-end": void(0),
        "worker-blastn-db-creation-success": "var(--success-color)",
        "worker-blastn-db-creation-fail": "var(--error-color)"
    }).forEach(([evt, color]) => {
        blastSubscription.on(evt, ({message:msg}) => logger.add(msg, color));
    })

    Object.entries({
        "worker-blastn-bad-filename": "var(--error-color)",
        "worker-blastn-file-does-not-exist": "var(--error-color)",
        "worker-blastn-db-not-ready": void(0),
        "worker-blastn-db-creation-fail-or-timeout": "var(--error-color)",
        "worker-blastn-db-ready": void(0),
        "worker-blastn-query-start": void(0),
        "worker-blastn-query-fail": "var(--error-color)",
        "worker-blastn-query-end": void(0)
    }).forEach(([evt, color]) => {
        blastSubscription.on(`${evt}@${query}_${blastOpts}`, ({message:msg}) => {
            logger.add(msg, color);
            if ([
                "worker-blastn-bad-filename",
                "worker-blastn-file-does-not-exist",
                "worker-blastn-db-creation-fail-or-timeout",
                "worker-blastn-query-end"
            ].includes(evt)) {
                logger.spinner();
                blastSubscription.destroy();
            }
        });
    })

    Object.entries({
        "worker-blastn-query-exists": "var(--success-color)",
        "worker-blastn-query-success": "var(--success-color)",
    }).forEach(([evt, color]) => {
        blastSubscription.on(`${evt}@${query}_${blastOpts}`, ({message:msg, location}) => {
            if([
                "worker-blastn-query-exists"
            ].includes(evt)) {
                logger.spinner();
                blastSubscription.destroy();
            }
            logger.add(msg, color);
            logger.add(`
                Output format 6: <a href="${location}" download="${channel}_${query.slice(0,Math.min(query.length, 5))}_${Date.now()}.txt"><i class="fa fa-download"></i></a>
                <a href="${location}" rel="noopener noreferrer nofollow" target="_blank">${location}</a>
            `);
            const locationDefault = location.slice(0, -4) + "_default.txt";
            logger.add(`
                Default format: <a href="${locationDefault}" download="${channel}_${query.slice(0,Math.min(query.length, 5))}_${Date.now()}_default.txt"><i class="fa fa-download"></i></a>
                <a href="${locationDefault}" rel="noopener noreferrer nofollow" target="_blank">${locationDefault}</a>
            `);
            _r(location);
        });
    })

    return locationPromise.catch(err => {
        logger.add((err?.message ?? err) || "Unknown Error", "var(--error-color)");
        return err
    });
}

async function parseTable ({subscriber, modal, channel, query, blastOpts, logger, location, contentArea}) {
    const 
        result = await fetch(location).then(res => res.text()),
        size = new Blob([result]).size;
    if(!size){
        throw new Error("Blastn could not find any regions.");
    }
    modal.issueSuccess({msg: `Loaded ${bytesToHuman(size)} of data`});

    const 
        lines = result?.split(/\n|\r\n/gi), //original blast outfmt 6 lacks the direction, that one is custom
        cols = "direction qseqid sseqid pident length mismatch gapopen qstart qend sstart send evalue bitscore".split(/\s+/),
        colKeys = {sequence: "sseqid", position: "sstart", "sequence-index": 2, "position-index": 9},
        info = [
            "query match strand (F/R)", //direction
            "query id",
            "sequence id",
            "percent identity",
            "alignment length",
            "mismatch count",
            "gapopen count",
            "start of alignment within the query",
            "end of alignment within the query",
            "start of alignment within the reference",
            "end of alignment within the reference",
            //https://www.metagenomics.wiki/tools/blast/evalue
            "nr of expected hits of similar quality that could be found by chance (lower is better)",
            "size of database in which the current match could be found by chance (higher is better)"
        ];
    
    return {
        cols, 
        rows: lines.filter(d=>d).map(line => {
            const 
                row = line.split(/\t/gi),
                start = +row[8],
                end = +row[9],
                direction = start < end ? "F" : "R",
                cells = ["", ...row];
            cells.direction = direction;
            return cells
        }), 
        keys: colKeys, 
        contentArea, 
        modal,
        info
    }
}

async function highlightROI({searchStr, browser, index, modal, table, cols, rows, keys, ...options}){
    const 
        IGVBrowsers = options.IGVBrowsers,
        row = rows[index],
        chr = row[2],
        start = +row[9],
        end = +row[10],
        qstart = +row[7],
        qend = +row[8],
        query = options.query,
        ql = +query.length;
    if (
        !doNotShowIGVBlastHighlighWarning 
        && IGVBrowsers?.pinned 
        && IGVBrowsers.pinned?.config?.fastaURL !== browser?.config?.fastaURL
    ){
        const swalResult = await Swal.fire({
            icon: "warning",
            title: "Fasta Mismatch",
            text: `The pinned igv applet that you are trying to highlight blast regions is using a different fasta file. Continue?`,
            confirmButtonText: "Yes and do not show this again",
            showCancelButton:true
        });
        if(swalResult.isConfirmed){
            doNotShowIGVBlastHighlighWarning = 1;
        } else {return}
    }
    let realstart, realend, reverse;
    if (start < end) {
        realstart = start - qstart + 1;
        realend = end + ql - qend;
    } else {
        reverse = true;
        realstart = start + qstart - 1;
        realend = end - ql + qend;
    }
    //console.log({browser, IGVBrowsers, chr, start, end, qstart, qend, ql, realstart, realend});
    browser.loadROI([
        {
            name: IGVBrowsers.methods.shortenStringMiddle(query),
            color: reverse ? "#D8000C55" : "#3955",
            features:[{
                chr,
                start: Math.min(realstart, realend),
                end: Math.max(realstart, realend)
            }]
        }
    ]).then(async () => {
        await browser.search(searchStr);
        await browser.zoomIn();
    });
}

async function showQueryWhenIdle ({rowInfoEl, index, modal, table, cols, rows, keys, ...options}) {
    const 
        IGVBrowsers = options.IGVBrowsers,
        query = options.query;
    if (modal.__width >= 240) {
        rowInfoEl.textContent = IGVBrowsers.methods.shortenStringMiddle(query, {length: 17});
    }
}

export default blastQuery;