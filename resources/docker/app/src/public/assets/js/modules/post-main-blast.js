import { es6exports} from "./main.js";
import Subscriber from "../subscriber.0.0.3.evergreen.es.js";
let blastSubscriber;
!function(){
    async function postMainBlast(
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
        /* console.log("subscriber is", Subscriber); */
        blastSubscriber = new Subscriber();
        const 
            blastDbMap = new Map(),
            ch = ch2,
            evtSource = await ch.until(() => es6exports.evtSource).lastOp;
        /* 
        */
        
        evtSource.addEventListener("worker-blastn-db-creation-start", function(e){
            const {filename, message} = JSON.parse(e.data);
            blastDbMap.get(filename)?.remove();
            ch(firstHexGrid)`
            +-> hexDiv:${ch.dom`
                <div class="hexgrid-pulse" title="${filename}">
                    <span><i class="fa fa-database"></i></span>
                    <span>${shortenStringMiddle(filename, {length: 20})}</span>
                </div>
            `}
            => ${({values}) => () => blastDbMap.set(filename, values.hexDiv)}`;
            blastSubscriber.dispatch(filename, "worker-blastn-db-creation-start", {message});
        });
        evtSource.addEventListener("worker-blastn-db-creation-success", function(e){
            const {filename, message} = JSON.parse(e.data),
                hexDiv = blastDbMap.get(filename);
            if(!hexDiv){return}
            hexDiv.style.background = `var(--success-color)`;
            blastSubscriber.dispatch(filename, "worker-blastn-db-creation-success", {message});
        });
        evtSource.addEventListener("worker-blastn-db-creation-fail", function(e){
            const {filename, message} = JSON.parse(e.data),
                hexDiv = blastDbMap.get(filename);
            if(!hexDiv){return}
            hexDiv.style.background = `var(--error-color)`;
            blastSubscriber.dispatch(filename, "worker-blastn-db-creation-fail", {message});
        });
        evtSource.addEventListener("worker-blastn-db-creation-end", function(e){
            const {filename, message} = JSON.parse(e.data);
            setTimeout(() => {
                blastDbMap.get(filename)?.remove?.()
            },3000);
            blastSubscriber.dispatch(filename, "worker-blastn-db-creation-end", {message});
        });


        [
            "worker-blastn-bad-filename",
            "worker-blastn-file-does-not-exist",
            "worker-blastn-db-not-ready",
            "worker-blastn-db-creation-fail-or-timeout",
            "worker-blastn-db-ready",
            "worker-blastn-query-start",
            "worker-blastn-query-fail",
            "worker-blastn-query-end"
        ].forEach((evt) => {
            evtSource.addEventListener(evt, function(e){
                const {filename, message, blastOpts, query} = JSON.parse(e.data);
                /* console.log("Do I fire:", evt, filename, message, query, blastOpts); */
                blastSubscriber.dispatch(filename, `${evt}@${query}_${blastOpts}`, {message});
            });
        });

        [
            "worker-blastn-query-exists",
            "worker-blastn-query-success"
        ].forEach((evt) => {
            evtSource.addEventListener(evt, function(e){
                const {filename, location, message, blastOpts, query} = JSON.parse(e.data);
                /* console.log("Do I fire:", evt, filename, message, query, blastOpts, location); */
                blastSubscriber.dispatch(filename, `${evt}@${query}_${blastOpts}`, {message, location});
            });
        });

        [
            "worker-blastn-bad-query",
            "worker-blastn-file-unspecified"
        ].forEach(function(evt) {
            evtSource.addEventListener(evt, (e) => {
                /* console.log("Do I fire:", evt); */
                const {message} = JSON.parse(e.data);
                Swal.fire({
                    icon: "error",
                    title: this[evt],
                    text: message,
                    showCancelButton:false,
                    confirmButtonText: "Ok"
                });
            });
        }, {
            "worker-blastn-bad-query": "Bad query",
            "worker-blastn-file-unspecified": "Filename not specified"
        });

        [
            "worker-blastn-makedb-pool-full"
        ].forEach(
            (evt) => evtSource.addEventListener(evt, this),
            ch.throttle(function(e){
                let message;
                try {
                    message = JSON.parse(e.data).message;
                } catch {
                    message = e.data;
                }
                Swal.fire(message);
            }, {delay: 60 * 1000})
        );
    }
    postMainBlast._taskqId = "postMainBlast";
    postMainBlast._taskqWaitFor = ["main", "cahirLoader"];
    taskq.push(postMainBlast);
}();

export {blastSubscriber}