import { keepFirstNElements, bytesToHuman } from "../../../js/modules/pre.js";
import renderTable from "./renderTable.js";
const rndGen = taskq._exportPersist.genHexStr,
    resetInput = (input, modal, msg) => {
        modal.issueError({msg});
        return input.value = "";
    },
    parseTable = (modal, contentArea, upload) => async function(e){
        const file = this?.files?.[0];
        if(!file?.size){
            return resetInput(this, modal, "Cannot import empty files");
        }
        if(!["text/plain", "text/tab-separated-values"].includes(file?.type)){
            return resetInput(this, modal, "Only text or tab-delimited files are allowed");
        }
        ch(upload)
        .rmClass(["fadeInUp"])
        .addClass(["infinite", "heartBeat"]);
        const reader = new FileReader,
            result = await new Promise((res, rej) => {
                reader.onload = () => {
                    modal.issueSuccess({msg: `Loaded ${bytesToHuman(file.size)} of data`});
                    res(reader.result)
                };
                reader.onerror = (err) => {
                    resetInput(this, modal, `Error: ${err?.message ?? "unknown"}`);
                    rej(err);
                };
                reader.onloadend = () => ch(upload).rmClass(["infinite", "heartBeat"]);
                reader.readAsText(file);
            });
        if(!result){
            return resetInput(this, modal, "Could not read file contents");
        }
        const lines = result?.split(/\n|\r\n/gi),
            colsRaw = lines?.[0],
            cols = colsRaw?.split(/\t/gi);
        if((lines?.length ?? 0) < 2 || (cols?.length ?? 0) < 2) {
            return resetInput(this, modal, "Data must have at least 2 columns and 2 rows");
        }
        const colKeys = {
            ...[...colsRaw.matchAll(/(?<sequence>\bseq(?:[0-9]+)?\b)/gi)]
            .reduce((ac,d) => ({...ac, ...d.groups}),{}),
             ...[...colsRaw.matchAll(/(?<position>\bpos(?:[0-9]+)?\b)/gi)]
            .reduce((ac,d) => ({...ac, ...d.groups}),{}),
        };
        Object.entries(colKeys).forEach(function([k,v]){colKeys[k + "-index"] = this.indexOf(v)}, cols);
        if([void(0)].includes(Object.values(colKeys))) {
            return resetInput(this, modal, "Could not locate 'sequence' and 'position' columns");
        }
        keepFirstNElements(contentArea, -1);
        //modal.result = colKeys;
        renderTable({
            cols, 
            rows: lines
                .slice(1)
                .map(line => line.split(/\t/gi)), 
            keys: colKeys, 
            contentArea, 
            modal
        });
    }

export default parseTable;