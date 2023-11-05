import { IGVBrowsers } from "./post-main-visualize-action.js";
import { Annotations } from "./main-annotation-indexing.js";
!function(){
    function pro(
        flatten,
        appendChildren,
        parseFilename,
        interpolators
    ) {
        var carousel = document.querySelector("#panel-wrapper .carousel"),
            dropdown = document.getElementById("pwd-select-template"),
            dropdown2 = document.getElementById("pwd-select-template-2"),
            fragment = document.createDocumentFragment(),
            parser = new DOMParser();
        const gridFields = Array.from(document.getElementsByClassName("grid-main-container"))
        .map(d => Array.from(d.children))
        .flat()
        .map(d => {return {
            name: d.getAttribute("title")
                .toLowerCase()
                .replace(/(?:\s+|-)[A-Z]{1}/ig, m => m.slice(-1).toUpperCase()), 
            el: d.lastElementChild
        }})
        .reduce((o,d) => {
            return Object.defineProperty(o, d.name, {
                configurable: false, //this will throw error if you have 2 elements with the same title attribute
                set: function(content){
                    d.el.textContent = content;
                }
            })
        },{});
        const createIGVObject = function(){
            try {
                let fastaFull = dropdown2.value,
                    bamFull = dropdown.value,
                    fasta, bam;
                try { fasta = parseFilename(fastaFull)} catch {}
                try { bam = parseFilename(bamFull)} catch {}
                if (!fasta){throw new Error("At least a fasta is needed.")}
                return {
                    reference: {
                        name: fasta.base,
                        fastaURL: "/static/fa/" + fastaFull,
                        indexURL: "/static/fai/" + fastaFull + ".fai",
                        tracks: bam ? [
                            {
                                type: "alignment",
                                format: "bam",
                                name: bam.base,
                                url: "/static/bam/" + bamFull,
                                indexURL: "/static/bai/" + bamFull + ".bai",
                                sort: {
                                    direction: "ASC"
                                }
                            }/* ,
                            {
                                name: "GFF Test",
                                type: "annotation",
                                format: "gff",
                                url: "/static/bgz/GCF_003668045.3_CriGri-PICRH-1.0_genomic.gff.bgz",
                                indexURL: "/static/tbi/GCF_003668045.3_CriGri-PICRH-1.0_genomic.gff.bgz.tbi"
                            } */
                        ] : []
                    }
                }
            } catch {
                return new Error("IGV object error");
            }
        };
        const loadIGVTrack = function (browser, filename, config = {}) {
            if (!filename) {
                return Swal.fire("No file selected.")
            }
            const parsed = parseFilename(filename);
            let {
                    type, format, basename, baseurl, fullname,
                    baseurlIndex, extIndex, sortDirection
                } = config,
                track;
            switch (parsed.ext) {
                case ".bam":
                    track = {
                        type: type ?? "alignment",
                        format: format ?? "bam",
                        name: basename ?? parsed.base,
                        url: (baseurl ?? "/static/bam/")
                            + (fullname ?? filename),
                        indexURL: (baseurlIndex ?? "/static/bai/") 
                            + (fullname ?? filename) 
                            + (extIndex ?? ".bai"),
                        sort: {
                            direction: sortDirection ?? "ASC"
                        }
                    };
                    break;
                case ".gff":
                    return Swal.fire({
                        icon: "warning",
                        title: "GFF files can be large. Continue?",
                        text: "GFF files are not indexible like BGZ files. It means they take longer to load. You can continue loading this track or select the bgzipped version.",
                        allowEscapeKey: true,
                        allowOutsideClick: true,
                        backdrop: true,
                        showCancelButton: true,
                        confirmButtonText: "Continue"
                    }).then(result => {
                        if (!result.isConfirmed){return}
                        return browser.loadTrack({
                            type: type ?? "annotation",
                            format: format ?? "gff",
                            name: basename ?? parsed.base,
                            url: (baseurl ?? "/static/gff/") + (fullname ?? filename)
                        }).catch(err => Swal.fire(err.message))
                    })
                case ".bgz":
                    {
                        let indexFilename = Annotations.value.get(fullname ?? filename),
                            parsedIndex = parseFilename(indexFilename);
                        track = {
                            type: type ?? "annotation",
                            format: format ?? "gff",
                            name: basename ?? parsed.base,
                            url: (baseurl ?? "/static/bgz/") + (fullname ?? filename),
                            indexURL: (baseurlIndex ?? `/static/${parsedIndex.ext.slice(1)}/`) + indexFilename
                        }
                    }
                    break;
                default:
                    throw new Error("Unknown track extension: " + parsed.ext)
            }
            return browser.loadTrack(track).catch(err => Swal.fire(err.message))
        };
        const rmFile = async function(fileType, fileName, cb = interpolators.identityRaw){
            const res = await fetch(`/del/${fileType}/${fileName}`, {
                method: 'DELETE'
            });
            return cb(res);
        };
        const rmBrowser = async function(browser = igv?.browser || IGVBrowsers.browsers[0]){
            if (IGVBrowsers.browsers.length > 1) {
                return Swal.fire("Remove the IGV applet manually from its toolbar");
            }
            return igv?.removeBrowser(browser);
        };
        ////////////////////////////////
        ////////////EXPORTS/////////////
        ////////////////////////////////
        taskq.export(gridFields, "gridFields")
             .export(createIGVObject, "createIGVObject")
             .export(rmFile, "rmFile")
             .export(rmBrowser, "rmBrowser")
             .export(loadIGVTrack, "loadIGVTrack");
        ////////////////////////////////
        ////////////EXPORTS/////////////
        ////////////////////////////////
    }
    pro._taskqId = "pro";
    pro._taskqWaitFor = ["LocalStorage","pre"];
    taskq.push(pro);
}()