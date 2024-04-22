let es6exports = {};
!function(){
    function main(
        _storage,
        AjaxChain,
        toggleClass,
        accessObjectProp,
        animate_class,
        notify,
        assign,
        notification,
        panels,
        fNOP,
        fNYI,
        draf,
        body,
        getNearestField,
        cubic,
        animNumText,
        codify,
        min,
        max,
        htmlEl,
        gridFields,
        keepFirstNElements,
        appendChildren,
        shortenStringMiddle,
        bytesToHuman,
        parseFilename,
        createIGVObject,
        genHexStr,
        rmFile,
        rmBrowser
    ){
        if(!_storage.checkLocalStorage()){
            
        } else {
            //if anything needs storage
        }
        var isWarning = /warning/i,
            zoomPanel = function(index){
                index = index ?? Array.prototype.indexOf.call(panels, selectedPanel);
                zoomPanel._rafx && zoomPanel._rafx.break();
                return zoomPanel._rafx = rafx.async()
                    .then(function(){
                        /* FOR COMPATIBILITY TO TRIGGER REPAINT
                        carousel.style.transform = "translate(-50%,0%) scale(0.4,0.4)"; 
                        */
                    })
                    .animate(function(v,o){
                        if(o.i % 5){return}
                        o.prev = o.now;
                        o.now = carousel.clientWidth;
                        return o.prev === o.now;
                    },{i:0,prev:null,now:null})
                    .until(function(v,o){
                        o.i++;
                        return v;
                    })
                    .then(function(){
                        //var index = dropdown.selectedIndex - 1;
                        return -100 * max(0,index) * panels[0].clientWidth / carousel.clientWidth;
                    })
                    .then(function(translate){
                        carousel.style.transform = "translate(" + translate + "%,0%) scale(1,1)";
                    })
                    .skipFrames(45)
                    .then(function(){
                        toggleClass(selectedPanel,"selected",true);
                    });
            },
            //clearButton = document.getElementById("pwd-clear"),
            expandButton = document.getElementById("pwd-expand"),
            uploadButton = document.getElementById("pwd-upload"),
            toolsButton = document.getElementById("pwd-tools"),
            actionButton = document.getElementById("pwd-action"),
            themeButton = document.getElementById("theme-switch"),
            dropdown = document.getElementById("pwd-select-template"),
            dropdown2 = document.getElementById("pwd-select-template-2"),
            panelWrapper = document.getElementById("panel-wrapper"),
            panelMetrics = document.getElementById("panel-metrics"),
            carousel = panelWrapper.firstElementChild,
            side = document.getElementById("side"),
            headerTemplate = panelMetrics.querySelector("#pwd-header"),
            selectedPanel = panels[0],
            firstHexGrid = document.querySelector(".grid-main-container"),
            helpButton = document.querySelector("div[name='help-container']"),
            deleteButtons = new Map(Array.from(document.querySelectorAll(".delete-icon")).map(node =>
                [document.getElementById(node.dataset.for), node]
            ));
        const dlMap = new Map(); //download Map
        
        rafx.async().then(function(){
            setTimeout(function(){notify("Just a sec..")},0);
        })
        .then(function(){
            carousel.addEventListener(
                "click",
                function(e){
                    //e.clientX, .clientY, .targetTouches[].clientX/Y, doc.elementFromPoint...
                },
                false
            );
            //make sure ie property resizes 
            window.addEventListener("resize",rafx.throttle(function(){
                zoomPanel();
            },null,12),false) //5 times max per second
            //zoom in to the selected panel
            zoomPanel();
        })
        .then(function(){
            /* clearButton.addEventListener("click",function(){
            },false); */
            expandButton.addEventListener("click",function(){
                if(this._status) {
                    this._status = false;
                    this.firstChild.textContent = "analyze ";
                    toggleClass(this.firstElementChild,"fa-expand",true)
                        .toggleClass("fa-compress",false);
                    /* toggleClass(panelWrapper,"smaller",false); // uncomment for enabling shrinking*/
                    toggleClass(side,"expanded",false);
                } else {
                    this._status = true;
                    this.firstChild.textContent = "hide ";
                    toggleClass(this.firstElementChild,"fa-expand",false)
                        .toggleClass("fa-compress",true);
                    /* toggleClass(panelWrapper,"smaller",true); // uncomment for enabling shrinking*/
                    toggleClass(side,"expanded",true);
                }
               /*  zoomPanel(); //uncomment for enabling shrinking*/
            },false);
            uploadButton.addEventListener("click",function(e){
                Swal.fire({
                    input: 'url',
                    inputLabel: 'Enter URL below',
                    inputPlaceholder: 'https://...'
                })
                .then(url => {
                    if (!url.isConfirmed) {
                        return;
                    }
                    const parsed = parseFilename(url.value);
                    if (dlMap.has(parsed.base + parsed.ext)){
                        return Swal.fire("Duplicate filename already in progress");
                    }
                    return fetch('/dl/nexus', {
                        method: 'POST',
                        headers: {'Content-Type': 'application/json'},
                        body: JSON.stringify({payload: url.value})
                      });
                });
            },false);
            themeButton.addEventListener("change", function(e){
                if (this._disabled){return}
                const that = this;
                this._disabled = true;
                rafx.async()
                .do(() => {
                    if (!that._styleTagDark) {
                        return rafx.skipFrames(15).then(() => 
                            that._styleTagDark = document.querySelector("link[href*=sweetalert-dark]")
                        );
                    }
                    return that._styleTagDark;
                })
                .until(v => v)
                .then(() => {
                    htmlEl.setAttribute("data-theme", that.checked ? "dark" : "light");
                    that._styleTagDark.setAttribute(
                        "rel", 
                        that.checked ? "stylesheet" : "inactive-stylesheet"
                    );
                    that._disabled = false;
                });
            });
            dropdown.addEventListener("change",function(){
                /* var index = this.selectedIndex,
                    opt = this.options[index];
                selectedPanel && toggleClass(selectedPanel,"selected",false);
                selectedPanel = panels[index - 1];
                zoomPanel(); */
            },false);
            deleteButtons.forEach((slave, master) => {
                slave.addEventListener("click", async function(){
                    if(!master.value){
                        Swal.fire("make sure you select a file");
                        return;
                    }
                    const result = await Swal.fire({
                        icon: "warning",
                        title: "Proceed?",
                        text: `Are you sure you want to delete ${master.value}?`,
                        showCancelButton:true
                    });
                    if(!result.isConfirmed){
                        return;
                    }
                    switch (master) {
                        case dropdown:  //bam
                            rmFile("bam", master.value);
                            break;
                        case dropdown2: //fasta
                            rmFile("fa", master.value);
                            break;
                    }
                }, false);
            });
        })
        .then(function(){
            const doneObj = {value: void(0), done: false};
            Promise.all([
                import("./main-annotation-indexing.js").then(f => ({enableAnnotations: f.default}))
            ])
            .then(objs => Object.assign({}, ...objs))
            .then(dyImports => {
                doneObj.value = dyImports;
                doneObj.done = true;
            })
            return doneObj;
        })
        .then(function(dyImports){
            const evtSource 
                = es6exports.evtSource 
                = new EventSource('/estream/subscribe');
            let connectionLost;
            evtSource.addEventListener("message", function(e){
                const oPayload = JSON.parse(e.data);
                gridFields.availableDiskSpace = oPayload.available;
                gridFields.usedDiskSpace = oPayload.used;
                gridFields.numberOfUsers = oPayload.size;
                gridFields.uptimeInMinutes = (oPayload.upTime / 60 / 1000 | 0) + "mins" ;
                gridFields.cpuUsage = oPayload.cpu + "%";
            });
            evtSource.addEventListener("bam-file-list", function(e){
                const oPayload = JSON.parse(e.data),
                      preVal = dropdown.value || dropdown.options[dropdown.selectedIndex]?.value;
                keepFirstNElements(dropdown, 1);
                appendChildren(dropdown, oPayload.map(d => {
                    const el = document.createElement("option");
                    el.textContent = shortenStringMiddle(d, {length: 20});
                    el.value = d;
                    el.setAttribute("value", d);
                    el.setAttribute("title", d);
                    if (preVal === d) {
                        dropdown.setAttribute("data-value", d);
                        el.setAttribute("selected","");
                    }
                    return el;
                }));
            });
            evtSource.addEventListener("fa-file-stats", function(e){
                const oPayload = JSON.parse(e.data),
                      preVal = dropdown2.value || dropdown2.options[dropdown2.selectedIndex]?.value;
                keepFirstNElements(dropdown2, 0);
                appendChildren(dropdown2, Object.entries(oPayload).map(([fName, size],i) => {
                    const el = document.createElement("option");
                    el.textContent = shortenStringMiddle(fName, {length: 20});
                    el.value = fName;
                    el.setAttribute("value", fName);
                    el.setAttribute("title", fName);
                    if(!i || preVal === fName){
                        dropdown2.setAttribute("data-value", fName);
                        el.setAttribute("selected","");
                        headerTemplate.textContent = "File size: " + bytesToHuman(size);
                    }
                    return el;
                }));
                dropdown2.removeEventListener("change", dropdown2._pwdChange);
                dropdown2.addEventListener("change", dropdown2._pwdChange = function(e){
                    headerTemplate.textContent = "File size: " + bytesToHuman(oPayload[this.value]);
                });
            });
            dyImports.enableAnnotations(evtSource);
            evtSource.addEventListener("error", function(e){
                if (connectionLost) {return}
                connectionLost = true;
                notify("server connection lost, retrying");
            });
            evtSource.addEventListener("connection-established", function(e){
                connectionLost = false;
                notify("",false);
            });
            evtSource.addEventListener("connection-surplus", function(e){
                Swal.fire(e.data);
            });
            evtSource.addEventListener("file-not-found", async function(e){
                const result = await Swal.fire({
                    icon: "warning",
                    title: "404",
                    text: `${e.data}`,
                    showCancelButton:true,
                    cancelButtonText: "remove IGV"
                });
                if(!result.isDismissed){
                    return;
                }
                rmBrowser().then(() => igv && (igv.browser = void(0)));
            });
            evtSource.addEventListener("worker-bad-host", function(e){
                Swal.fire(e.data);
            });
            evtSource.addEventListener("worker-pool-full", function(e){
                Swal.fire(e.data);
            });
            evtSource.addEventListener("worker-connection-timedout", function(e){
                Swal.fire(e.data);
            });
            evtSource.addEventListener("worker-bad-filename", function(e){
                Swal.fire(e.data);
            });
            evtSource.addEventListener("worker-bad-link", function(e){
                Swal.fire(e.data);
            });
            evtSource.addEventListener("worker-bad-extension", function(e){
                Swal.fire(e.data);
            });
            evtSource.addEventListener("worker-dl-start", function(e){
                const filename = e.data,
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
                firstHexGrid.appendChild(hexDiv);
            });
            evtSource.addEventListener("worker-dl-end", function(e){
                const filename = e.data,
                      hexDiv = dlMap.get(filename);
                if (hexDiv) {
                    dlMap.delete(filename);
                    hexDiv.parentNode?.removeChild(hexDiv);
                }
            });
            evtSource.addEventListener("worker-dl-progress", function(e){
                const {filename, percentage} = JSON.parse(e.data),
                      hexDiv = dlMap.get(filename);
                if(!hexDiv){return}
                hexDiv.style.background = `linear-gradient(to right, #22ff55aa 0%, #22ff55aa ${percentage}, transparent ${percentage})`;
            });
            /* 
            RESOLVED IN FAVOR OF X-Accel-Buffering: no, which cancels Nginx's 8kb buffer
            evtSource.addEventListener("buffer-force-flush", function(e){
                console.log("RECEIVED PIPE BUFFER");
            }); */
            evtSource.addEventListener("file-delete-success", function(e){
                const oPayload = JSON.parse(e.data);
                Swal.fire(oPayload.message)
                .then(() => {
                    if(~oPayload?.fileType.indexOf("-index")) {
                        return
                    }
                    if (oPayload?.fileType === "reference"){
                        rmFile("fai", oPayload?.fileName + ".fai");
                    } else if (oPayload?.fileType === "alignment") {
                        rmFile("bai", oPayload?.fileName + ".bai");
                    }
                });
            });
            evtSource.addEventListener("file-delete-fail", function(e){
                const oPayload = JSON.parse(e.data);
                Swal.fire(oPayload.message);
            });
        })
        .then(function(){
            setTimeout(function(){notify("Ready",false)},0);
        })
        .catch(function(e){
            console.log(e);
        });

        ////////////////////////////////
        ////////////EXPORTS/////////////
        ////////////////////////////////
        taskq.export(panelWrapper, "panelWrapper")
             .export(themeButton, "themeButton")
             .export(helpButton, "helpButton")
             .export(toolsButton, "toolsButton")
             .export(firstHexGrid, "firstHexGrid")
             .export(actionButton, "actionButton")
             .export(selectedPanel, "selectedPanel") //panels[0] is for IGV by default
             .export(dropdown, "dropdown"); //orignally used for bam files
        taskq._exportPersist.helpButton = helpButton;
        taskq._exportPersist.expandButton = expandButton;
        taskq._exportPersist.toolsButton = toolsButton;
        taskq._exportPersist.side = side;
        ////////////////////////////////
        ////////////EXPORTS/////////////
        ////////////////////////////////
    }
    main._taskqId = "main";
    main._taskqWaitFor = ["LocalStorage","pre","pro"];
    taskq.push(main);
}();
export {es6exports};