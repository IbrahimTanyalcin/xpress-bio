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
                    fasta = parseFilename(fastaFull),
                    bam = parseFilename(bamFull);
                return {
                    reference: {
                        name: fasta.base,
                        fastaURL: "/static/fa/" + fastaFull,
                        indexURL: "/static/fai/" + fastaFull + ".fai",
                        tracks: [
                            {
                                type: "alignment",
                                format: "bam",
                                name: bam.base,
                                url: "/static/bam/" + bamFull,
                                indexURL: "/static/bai/" + bamFull + ".bai",
                                sort: {
                                    direction: "ASC"
                                }
                            }
                        ]
                    }
                }
            } catch {
                return new Error("IGV object error");
            }
        };
        const rmFile = async function(fileType, fileName, cb = interpolators.identityRaw){
            const res = await fetch(`/del/${fileType}/${fileName}`, {
                method: 'DELETE'
            });
            return cb(res);
        }
        ////////////////////////////////
        ////////////EXPORTS/////////////
        ////////////////////////////////
        taskq.export(gridFields, "gridFields")
             .export(createIGVObject, "createIGVObject")
             .export(rmFile, "rmFile");
        ////////////////////////////////
        ////////////EXPORTS/////////////
        ////////////////////////////////
    }
    pro._taskqId = "pro";
    pro._taskqWaitFor = ["LocalStorage","pre"];
    taskq.push(pro);
}()