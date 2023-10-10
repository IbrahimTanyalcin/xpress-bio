import { es6exports} from "./main.js";
!function(){
    async function postMainSamtoolsIndexing(
        gridFields,
        helpButton,
        toolsButton,
        firstHexGrid,
        toggleClass,
        accessObjectProp,
        animate_class,
        notify,
        assign,
        fNOP,
        fNYI,
        draf,
        body,
        flatten,
        flattenRec,
        appendChildren,
        htmlEl,
        keepFirstNElements,
        shortenStringMiddle,
        parseFilename,
        genHexStr
    ) {
        
        const samtoolsIdxMap = new Map();
        const evtSource = await rafx.async(es6exports).animate(function(v){
            return v?.evtSource;
        }).until(function(v){
            return v
        });
        console.log("evtSource is", evtSource);
        evtSource.addEventListener("worker-fasta-bam-index-start", function(e){
            /* const filename = e.data,
                  hexDiv = document.createElement("div"),
                  icon = document.createElement("span"),
                  content = document.createElement("span");
            toggleClass(icon, "hexgrid-bg-progress");
            toggleClass(content, "hexgrid-bg-progress");
            hexDiv.appendChild(icon);
            hexDiv.appendChild(content);
            hexDiv.setAttribute("title", filename);
            icon.innerHTML = `<i class="fa fa-cloud-download"></i>`;
            content.textContent = shortenStringMiddle(filename, {length: 20});
            dlMap.set(filename, hexDiv);
            firstHexGrid.appendChild(hexDiv); */
        });
    }
    postMainSamtoolsIndexing._taskqId = "postMainSamtoolsIndexing";
    postMainSamtoolsIndexing._taskqWaitFor = ["main"];
    taskq.push(postMainSamtoolsIndexing);
}()