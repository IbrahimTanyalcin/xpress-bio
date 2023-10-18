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
        /* 
            for those who wanna update this script, the mechanism relies on the
            fact that Webkit or any browser vendor has to implement a directed
            acyclic graph before running modules. If this is case, which RFC's
            are not clearly mentioning, then async attribute should not break 
            things. If async makes a problem, you will receive an error in
            browser's inspector. Please check it and if you can reproduce it,
            then we should remove the async attribute. Uncomment the log below
            console.log("evtSource is", evtSource);
        */
        evtSource.addEventListener("worker-fasta-bam-index-start", function(e){
            const {filename, message} = JSON.parse(e.data),
                  hexDiv = document.createElement("div");
            samtoolsIdxMap.get(filename)?.remove();
            toggleClass(hexDiv, "hexgrid-pulse");
            hexDiv.setAttribute("title", filename);
            hexDiv.innerHTML = `
                <span><i class="fa fa-tag"></i></span>
                <span>${shortenStringMiddle(filename, {length: 20})}</span>
            `
            samtoolsIdxMap.set(filename, hexDiv);
            firstHexGrid.appendChild(hexDiv);
        });
        evtSource.addEventListener(
            "worker-fasta-bam-index-success",
            function(e){
                const {filename, message} = JSON.parse(e.data),
                    hexDiv = samtoolsIdxMap.get(filename);
                if(!hexDiv){return}
                hexDiv.style.background = `var(--success-color)`;
            }
        );
        evtSource.addEventListener(
            "worker-fasta-bam-index-indexing-fail",
            function(e){
                const {filename, message} = JSON.parse(e.data),
                    hexDiv = samtoolsIdxMap.get(filename);
                if(!hexDiv){return}
                hexDiv.style.background = `var(--error-color)`;
            }
        );
        evtSource.addEventListener(
            "worker-fasta-bam-index-end",
            function(e){
                const {filename, message} = JSON.parse(e.data);
                setTimeout(() => {
                    samtoolsIdxMap.get(filename)?.remove?.()
                },3000)
            }
        );

        [
            "worker-fasta-bam-index-pool-full",
            "worker-fasta-bam-index-fs-watcher-error",
            "worker-fasta-bam-index-bad-filename",
            "worker-fasta-bam-index-file-does-not-exist",
            "worker-fasta-bam-index-file-exists"
        ].forEach(
            (evt) => evtSource.addEventListener(evt, this),
            function(e){
                let message;
                try {
                    message = JSON.parse(e.data).message;
                } catch {
                    message = e.data;
                }
                Swal.fire(message);
            }
        )
    }
    postMainSamtoolsIndexing._taskqId = "postMainSamtoolsIndexing";
    postMainSamtoolsIndexing._taskqWaitFor = ["main"];
    taskq.push(postMainSamtoolsIndexing);
}()