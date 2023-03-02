import parseTable from "./parseTable.js";
const rndGen = taskq._exportPersist.genHexStr,
    registerFileInput = (modal, contentArea) => {
        const rndID = rndGen(8, 2, "table-viewer-input-");
        ch(contentArea)`
            >> innerHTML ${`
                <div 
                    class="button-container" 
                    style="opacity: 0; justify-content: center; flex-grow: 1;"
                >
                    <input
                        type="file"
                        id="${rndID}"
                        accept=".tsv, .tab, .txt, text/plain, text/tab-separated-values"
                        style="
                            width: 0.1px;
                            height: 0.1px;
                            opacity: 0;
                            overflow: hidden;
                            position: absolute;
                            z-index: -1;
                        "
                    />
                    <label 
                        class="button-a-type-2" 
                        for="${rndID}"
                        style="min-height: 10vmin;"
                    >
                        Upload File &nbsp;
                        <i class="fa fa-file-text"></i>
                    </label>
                </div>
            `}
            first ${0}
            => ${() => () => ch.select(`#${rndID}`)
                .on("change", parseTable(modal, contentArea, ch.selected.parentElement))
            }
            up ${0}
            animate ...${[[],{duration:1000}]}
            |> await ${() => () => 
                ch.select(`#${rndID}`,document.body)
                .up()
                .addClass(["animated", "fadeInUp"])
            }
        `
    }

export default registerFileInput;