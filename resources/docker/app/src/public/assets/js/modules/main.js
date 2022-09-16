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
        createIGVObject
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
                        carousel.style.transform = "translate(-50%,0%) scale(0.4,0.4)";
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
            selectedPanel = panels[0];
        
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
            uploadButton.addEventListener("click",fNYI,false);
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
                    return igv.createBrowser(selectedPanel, oIGV)
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
                gridFields.uptimeInMinutes = oPayload.upTime;
                gridFields.cpuUsage = oPayload.cpu;
            });
            evtSource.addEventListener("bam-file-list", function(e){
                const oPayload = JSON.parse(e.data);
                keepFirstNElements(dropdown, 1);
                appendChildren(dropdown, oPayload.map(d => {
                    const el = document.createElement("option");
                    el.textContent = shortenStringMiddle(d, {length: 20});
                    el.value = d;
                    el.setAttribute("value", d);
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