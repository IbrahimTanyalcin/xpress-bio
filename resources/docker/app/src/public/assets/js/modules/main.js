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
        genHexStr
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
            clearButton = document.getElementById("pwd-clear"),
            expandButton = document.getElementById("pwd-expand"),
            uploadButton = document.getElementById("pwd-upload"),
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
            firstHexGrid = document.querySelector(".grid-main-container");
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
            clearButton.addEventListener("click",function(){
            },false);
            expandButton.addEventListener("click",function(){
                if(this._status) {
                    this._status = false;
                    this.firstChild.textContent = "analyze ";
                    toggleClass(this.firstElementChild,"fa-expand",true)
                        .toggleClass("fa-compress",false);
                    toggleClass(panelWrapper,"smaller",false);
                    toggleClass(side,"expanded",false);
                } else {
                    this._status = true;
                    this.firstChild.textContent = "hide ";
                    toggleClass(this.firstElementChild,"fa-expand",false)
                        .toggleClass("fa-compress",true);
                    toggleClass(panelWrapper,"smaller",true);
                    toggleClass(side,"expanded",true);
                }
                zoomPanel();
            },false);
            uploadButton.addEventListener("click",function(e){
                const rgxNexus = /^https:\/\/dl\.dnanex\.us\//gi;
                Swal.fire({
                    input: 'url',
                    inputLabel: 'DNAnexus URL',
                    inputPlaceholder: 'Enter the URL'
                })
                .then(url => {
                    if (!url.isConfirmed) {
                        return;
                    }
                    if (!rgxNexus.test(url.value)){
                        return Swal.fire("Submitted link must be a DNAnexus link");
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
                htmlEl.setAttribute("data-theme", this.checked ? "dark" : "light");
                if (!this._styleTagDark) {
                    this._styleTagDark = document.querySelector("link[href*=sweetalert-dark]");
                }
                this._styleTagDark.setAttribute(
                    "rel", 
                    this.checked ? "stylesheet" : "inactive-stylesheet"
                );
            });
            dropdown.addEventListener("change",function(){
                /* var index = this.selectedIndex,
                    opt = this.options[index];
                selectedPanel && toggleClass(selectedPanel,"selected",false);
                selectedPanel = panels[index - 1];
                zoomPanel(); */
            },false);
            actionButton.addEventListener("click", function(){
                if(this._disabled){return}
                this._disabled = true;
                let oIGV = createIGVObject();
                if (oIGV instanceof Error) {
                    Swal.fire("make sure you select a bam file");
                    this._disabled = false;
                    return;
                }
                Promise.resolve()
                .then(() => {
                    if(igv.browser) {
                        return igv.browser.loadSessionObject(oIGV)
                        .then(() => {
                            console.log("igv redrawn");
                            this._disabled = false;
                        });
                    }
                    return igv.createBrowser(selectedPanel.firstElementChild, oIGV)
                    .then(browser => {
                        igv.browser = browser;
                        console.log("igv rendered");
                        this._disabled = false;
                    })
                })
                .catch(err => {
                    console.log(err);
                    this._disabled = false;
                });
            }, false);
        })
        .then(function(){
            const evtSource = new EventSource('/estream/subscribe');
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
                const oPayload = JSON.parse(e.data);
                keepFirstNElements(dropdown, 1);
                appendChildren(dropdown, oPayload.map(d => {
                    const el = document.createElement("option");
                    el.textContent = shortenStringMiddle(d, {length: 20});
                    el.value = d;
                    el.setAttribute("value", d);
                    el.setAttribute("title", d);
                    return el;
                }));
            });
            evtSource.addEventListener("fa-file-stats", function(e){
                const oPayload = JSON.parse(e.data);
                keepFirstNElements(dropdown2, 0);
                appendChildren(dropdown2, Object.entries(oPayload).map(([fName, size],i) => {
                    const el = document.createElement("option");
                    el.textContent = shortenStringMiddle(fName, {length: 20});
                    el.value = fName;
                    el.setAttribute("value", fName);
                    el.setAttribute("title", fName);
                    if(!i){
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
            evtSource.addEventListener("file-not-found", function(e){
                Swal.fire(e.data);
            });
            evtSource.addEventListener("worker-bad-host", function(e){
                Swal.fire(e.data);
            });
            evtSource.addEventListener("worker-pool-full", function(e){
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
        })
        .then(function(){
            setTimeout(function(){notify("Ready",false)},0);
        })
        .catch(function(e){
            console.log(e);
        });
    }
    main._taskqId = "main";
    main._taskqWaitFor = ["LocalStorage","pre","pro"];
    taskq.push(main);
}();