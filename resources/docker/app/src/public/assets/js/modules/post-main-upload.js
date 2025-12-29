import { es6exports} from "./main.js";
!function(){
    async function postMainUpload(
        parseFilename,
        uploadButton
    ) {
        const
            ch = ch2,
            [evtSource, dlMap] = await Promise.all([
                ch.until(() => es6exports.evtSource).lastOp, 
                ch.until(() => es6exports.dlMap).lastOp
            ]).catch((e) => console.error("There was an error resolving dependencies for post-main-upload.js. Error:\n\n", e));
        
        const warnEl = window.toWarn = function(el, message = "") {
            Swal.showValidationMessage(message);
            xb_highlight(el, {timeout:10000, stop: "transparent 25%, var(--error-color), var(--error-color) 50%, transparent"});
            ["click", "focus"].forEach((type) => {
                el.addEventListener(type, function(){
                    Swal.resetValidationMessage();
                    xb_highlight(el, {timeout:0})
                } ,{once: true})
            })
            return el;
        }
        
        let renderUploadHEAD = ({url, cb} = {}) => Swal.fire({
            input: 'url',
            inputLabel: 'Enter URL below',
            inputPlaceholder: 'https://...',
            didOpen: () => {
                ch`
                    0> urlInput:${Swal.getInput()}
                    => ${({values:v}) => () => url && (v.urlInput.value = url)}
                    => ${({values:v}) => () => cb?.(v)}
                `
            }
        })
        .then(result => {
            if (!result.isConfirmed) {
                return;
            }
            const parsed = parseFilename(result.value);
            if (dlMap.has(parsed.base + parsed.ext)){
                return Swal.fire("Duplicate filename already in progress");
            }
            return fetch('/dl/nexus', {
                method: 'POST',
                headers: {'Content-Type': 'application/json'},
                body: JSON.stringify({payload: result.value})
                });
        });
        let renderUploadNOHEAD = ({filename, url, cb} = {}) => Swal.fire({
            input: 'url',
            inputLabel: 'Enter URL below',
            inputPlaceholder: 'https://...',
            html: `<bioinfo-input 
                style="flex-grow:1; flex-basis: 100%;" 
                data-title="*.fasta, *.bam, *.tar.gz etc."
                data-colors="hover,var(--page-color)" 
                data-label="Filename with extension" 
                data-fadein
                data-anycase
                tabindex="0"
            ></bioinfo-input>`,
            preConfirm: () => {
                const filenameComponent = Swal.getHtmlContainer().querySelector("bioinfo-input"),
                      filename = filenameComponent?.value(),
                      url = Swal.getInput()?.value;
                if (!filename) {
                    warnEl(filenameComponent, "filename cannot be empty");
                    return false;
                }
                return {filename, url}
            },
            footer: `<cody-logger style="display:none;" data-fadein data-name-help></cody-logger >`,
            didOpen: () => {
                ch`
                    0> utils: ${{wait: (ms) => new Promise(r => setTimeout(r, ms))}}
                    0> footer:${Swal.getFooter()}
                    0> urlInput:${Swal.getInput()}
                    => ${({values:v}) => () => url && (v.urlInput.value = url)}
                    0> ${({values:v}) => v.help = v.footer.querySelector("[data-name-help]")}
                    0> ${({values:v}) => v.label = v.help.shadowRoot.querySelector(".header-entry .label")}
                    0> ${({values:v}) => v.filename = Swal.getHtmlContainer().querySelector("bioinfo-input")}
                    0> ${({values:v}) => v.filenameInput = v.filename?.shadowRoot?.querySelector("input")}
                    => ${({values:v}) => () => {
                        v.filename?.addEventListener("focus", () => {v.filenameInput?.focus()});
                        filename && (v.filenameInput.value = filename);
                    }}
                    -> ${({values:v}) => v.footer} style ${[["padding", 0], ["flex-wrap", "wrap"]]}
                    => ${({values:v}) => async () => {
                        await v.utils.wait(100) //cody-logger toggle throttled to 50ms
                        await v.help.toggle();
                        v.label.textContent = "Help"
                        v.help.add(`Example links
                            <ul>
                                <li>
                                    <b>NCBI</b>:
                                    <a rel="noopener noreferrer nofollow" target="_blank" href="https://eutils.ncbi.nlm.nih.gov/entrez/eutils/efetch.fcgi?db=nuccore&id=NM_014491.4&rettype=fasta&retmode=text">
                                    https://eutils.ncbi.nlm.nih.gov/entrez/eutils/efetch.fcgi?db=nuccore&id=NM_014491.4&rettype=fasta&retmode=text
                                    </a>
                                </li>
                                <li>
                                    <b>Google drive</b>:
                                    <a rel="noopener noreferrer nofollow" target="_blank" href="https://drive.usercontent.google.com/u/0/uc?id=11TbI4TJJiD7lP86VFBeWMmiCa2YAEGpN&export=download">
                                        https://drive.usercontent.google.com/u/0/uc?id=11TbI4TJJiD7lP86VFBeWMmiCa2YAEGpN&export=download
                                    </a>
                                </li>
                                <li>
                                    <b>Github</b>:
                                    <a rel="noopener noreferrer nofollow" target="_blank" href="https://gist.githubusercontent.com/IbrahimTanyalcin/efbbc63ab7295a0f7f9cd2092fb915fd/raw/53428dc74007356d528efd86b0ab6271a6271eab/example-2.fas">
                                        https://gist.githubusercontent.com/IbrahimTanyalcin/efbbc63ab7295a0f7f9cd2092fb915fd/raw/53428dc74007356d528efd86b0ab6271a6271eab/example-2.fas
                                    </a>
                                </li>
                            </ul>
                        `).add(`Example filenames
                            <ul>
                                <li><b>Fasta</b>: *.fasta, *.fas, *.fa</li>
                                <li><b>Fasta Index</b>: *.fai</li>
                                <li><b>Bam</b>: *.bam</li>
                                <li><b>Bam Index</b>: *.bai</li>
                                <li><b>Annotation</b>: *.gff, *.bgz</li>
                                <li><b>Annotation Index</b>: *.tbi, *.csi</li>
                                <li><b>Compressed Files</b>: *.tar, *.gz, *.tar.gz, *.gz.tar, *.tar.z, *.tgz, *.taz, *.z, *.lz4, *.tar.lz4, *.lz4.tar</li>
                            </ul>
                        `);
                        await v.utils.wait(500);
                        ch(v.help).style("display", "grid");
                    }}
                    => ${({values:v}) => () => cb?.(v)}
                `;
            }
        })
        .then((result) => {
            if (!result.isConfirmed) {
                return;
            }
            const {filename, url} = result.value;
            const parsed = parseFilename(filename);
            if (dlMap.has(parsed.base + parsed.ext)){
                return Swal.fire("Duplicate filename already in progress");
            }
            return fetch('/dl/nexus', {
                method: 'POST',
                headers: {'Content-Type': 'application/json'},
                body: JSON.stringify({payload: url, custom_filename: filename})
            });
        });

        uploadButton.addEventListener("click",async function(e){
            let result;
            result = await Swal.fire({
                icon: "question",
                text: "Does the server hosting the resource support HEAD requests? If unknown, select 'No'",
                showDenyButton: true, 
                showCancelButton: false,
                confirmButtonText: "Yes",
                denyButtonText: "No",
                focusConfirm: false,
                allowOutsideClick: true,
                allowEscapeKey: true,
                backdrop: true
            });
            if (result.isConfirmed) {
                renderUploadHEAD();
            } else if (result.isDenied) {
                renderUploadNOHEAD();
            }
        },false);
        evtSource.addEventListener("worker-url-not-parsable", function(e){
            const oPayload = JSON.parse(e.data); //{message:"...", url: "https...", custom_filename?: "..."}
            if (Object.hasOwn(oPayload, "custom_filename")) {
                return renderUploadNOHEAD({
                    filename: oPayload.custom_filename,
                    url: oPayload.url,
                    cb: function(opts){
                        warnEl(opts.urlInput, oPayload.message)
                    }
                })
            }
            return renderUploadHEAD({
                url: oPayload.url,
                cb: function(opts){
                    warnEl(opts.urlInput, oPayload.message)
                }
            });
        });
        evtSource.addEventListener("worker-dl-bad-custom-filename", function(e){
            const oPayload = JSON.parse(e.data); //{message:"....", url: "https...", custom_filename: Falsey}
            return renderUploadNOHEAD({
                filename: "",
                url: oPayload.url,
                cb: function(opts){
                    warnEl(opts.filenameInput, oPayload.message)
                }
            })
        });
        evtSource.addEventListener("worker-bad-extension", async function(e){
            let {data} = e;
            try {
                data = JSON.parse(data);
                if (Object.hasOwn(data, "custom_filename")) {
                    let result = await Swal.fire({
                        icon: "warning",
                        text: data?.message ?? "no-msg::bad-extension",
                        showDenyButton: false, 
                        showCancelButton: true,
                        confirmButtonText: "Retry",
                        focusConfirm: true,
                        allowOutsideClick: true,
                        allowEscapeKey: true,
                        backdrop: true
                    });
                    if (result.isConfirmed) {
                        return renderUploadNOHEAD({
                            filename: data.custom_filename,
                            url: data.url,
                            cb: function(opts){
                                warnEl(opts.filenameInput, "Fix the filename with proper extension.")
                            }
                        })
                    }
                    /*if (result.isConfirmed) {
                    } else if (result.isDenied) { //deny button clicked
                    } else if (result.isDismissed)  { //cancel button clicked
                    } else {}*/
                } else {
                    Swal.fire(data?.message ?? "no-msg::bad-extension");
                }
            } catch (err) {
                Swal.fire(data);
            }
        });
    }
    postMainUpload._taskqId = "postMainUpload";
    postMainUpload._taskqWaitFor = ["main", "cahirLoader"];
    taskq.push(postMainUpload);
}();