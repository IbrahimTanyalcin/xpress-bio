let keepFirstNElements,
    bytesToHuman;
!function(){
    function pre() {
        var body = document.body,
            fNOP = function(){},
            fNYI = function(){alert("This option is not yet implemented.")},
            raf = window.requestAnimationFrame,
            draf = function(f){
                var args = Array.prototype.slice.call(arguments);
                raf(function(){
                    raf(function(){
                        f.apply(args[1],args.slice(2));
                    });
                });
            },
            notification = document.getElementById("notification-banner").firstElementChild,
            panels = body.getElementsByClassName("panel"),
            min = Math.min,
            max = Math.max,
            htmlEl = document.documentElement,
            epsilon = 1e-6;	
        /*
            Below will run infinitely if element is not in panels
            For those cases you can use Array.prototype.indexOf.call(panels, panel)
        */
        function getPanelIndex(panel){
            var i = 0;
            while(panels[i] !== panel){
                ++i;
            }
            return i;
        };
        function getNearestPanel(node){
            while(!~node.className.indexOf("panel")){
                node = node.parentElement;
            }
            return node;
        };
        function getNearestField(node){
            while(!~node.className.indexOf("pwd")){
                node = node.parentElement;
            }
            return node;
        };
        function reverseSeq(str){
            for(var strNew = "", i = 0, j; j = str[i] ; ++i){
                strNew = complement[j] + strNew;
            }
            return strNew;
        };
        function assign(target,sources){
            sources = Array.prototype.slice.call(arguments).slice(1);
            var d,
                i,
                l = sources.length,
                a,
                lA,
                j,
                k;
            for (i = 0; i < l; ++i){
                d = Object(sources[i]);
                a = Object.getOwnPropertyNames(d);
                lA = a.length;
                for (j = 0; j < lA; ++j) {
                    k = a[j];
                    target[k] = d[k];
                }
            }
            return target;
        };
        function strRepeat(chr,count){
            chr = chr || "";
            count = count || 0;
            var str = "";
            while(count--){
                str += chr;
            }
            return str;
        };
        
        function toggleClass(node,className,bool,chain){
            var classArr = node.className.split(" ").filter(function(d,i){return d;}),
                temp = classArr.indexOf(className),
                temp2 = !~temp;
            if (bool || bool === undefined && temp2) {
                temp2 && (node.className = classArr.concat(className).join(" "));
            } else {
                !temp2 && (node.className = classArr.reduce(function(ac,d,i,a){if(i !== temp ){ac += d + " ";} return ac;},""));
            }
            return chain || (chain = {
                toggleClass: function(className,bool){
                    return toggleClass(node,className,bool,chain);
                },
                node: node
            });
        };
        ////////////////////////////////
        //////////CHAINED AJAX//////////
        ////////////////////////////////
        function AjaxChain (){
            this.currentXHTP = undefined;
            this.queue = [];
            this.resetHistory();
            this.skipped = false;
        }
        AjaxChain.prototype.url = function(url,options){
            var that  = this;
            var xhtp = this.currentXHTP  = new XMLHttpRequest();
            xhtp._url = url = typeof url === "function" ? url() : url;
            setTimeout(function(){
                that.previousStart = (options && options.start) || that.previousStart;
                that.previousSuccess = (options && options.success) || that.previousSuccess;
                that.previousFail = (options && options.fail) || that.previousFail;
                xhtp.open("GET",url,true);
                try {
                    that._zoneSkipable = true;
                    that.previousStart.call(xhtp,that);
                } catch (e) {
                    console.log("Error while starting AjaxChain:");
                    console.log("message: " + e.message);
                } finally {
                    that._zoneSkipable = false;
                    if(that.skipped) {
                        that.skipped = false;
                        return;
                    }
                }
                xhtp.onload = function(progress){
                    var retValue = that.previousSuccess.call(this,that);
                    if (retValue) {
                        var next = that.queue.shift();
                        next && typeof next === "function" ? next() : void(0);
                    }
                }
                xhtp.onerror = function(){
                    that.previousFail.call(this,that,e);
                };
                xhtp.send();
            },(options && options.delay) || 50)
            return this;
        }
        AjaxChain.prototype.then = function(){
            this.queue.push(this.url.bind.apply(this.url,[this].concat(Array.prototype.slice.call(arguments))));
            return this;
        }
        AjaxChain.prototype.wait = function(f){
            var that = this;
            this.queue.push(
                function(){
                    var retValue = f.call(that);
                    if (typeof retValue === "boolean" && retValue) {
                        var next = that.queue.shift();
                        next && typeof next === "function" ? next() : void(0);
                    } else if (typeof retValue === "object") {
                        that.pause(retValue,function(){
                            var next = this.queue.shift();
                            next && typeof next === "function" ? next() : void(0);
                        });
                    }
                }
            );
            return this;
        }
        AjaxChain.prototype.skip = function(f,options){
            if(!this._zoneSkipable){
                console.log("Cannot skip AjaxChain outside 'start' callback.");
                return this;
            }
            var that = this,
                temp;
            this.skipped = true;
            this.currentXHTP.abort();
            typeof (temp = options && options.immediate) === "function" ? temp() : void(0);
            setTimeout(function(){
                var retValue = f.call(that,that);
                if (retValue) {
                    var next = that.queue.shift();
                    next && typeof next === "function" ? next() : void(0);
                } else {
                    typeof (temp = options && options.fail) === "function" ? temp() : void(0);
                }
            },(options && options.delay) || 50);
            return this;
        }
        AjaxChain.prototype.pause = function(retValue,trigger) {
            var that = this;
            if(retValue.flag || retValue.result || retValue.response) {
                trigger.call(this);
                return;
            }
            window.requestAnimationFrame(function(){
                that.pause(retValue,trigger);
            })
        }
        AjaxChain.prototype.poke = function(delay){
            var that = this;
            delay = (typeof delay !== "number") || (delay < 500) ? 500 : delay;
            setTimeout(function(){
                var next = that.queue.shift();
                next && typeof next === "function" ? next() : void(0);
            },delay);
            return this;
        }
        AjaxChain.prototype.flush = function(){
            this.currentXHTP = this.currentXHTP ? (this.currentXHTP.abort(),undefined) : undefined;
            this.queue = [];
            this.resetHistory();
            return this;
        }
        AjaxChain.prototype.fIdle = function(){};
        AjaxChain.prototype.resetHistory = function(){
            this.previousStart = this.fIdle;
            this.previousSuccess = this.fIdle;
            this.previousFail = this.fIdle;
        }
        ////////////////////////////////
        //////////CHAINED AJAX//////////
        ////////////////////////////////
        function notify(str,state){
            state = state === undefined ? true : state;
            var animKey = state ? "fadeInDown" : "fadeOutUp",
                animDel = animKey === "fadeInDown" ?  "fadeOutUp" : "fadeInDown",
                highlight = state ? true : false;
            notification._rafx && notification._rafx.break();
            notification._rafx = rafx.async(notification.parentNode)
            .then(function(node){
                return rafx.async().then(function(){
                    notification.textContent = str;
                    toggleClass(node,"highlight-1",false)
                    .toggleClass(animDel,false);
                    animate_class(node,animKey)
                }).skipFrames(60).then(function(){
                    toggleClass(node,"highlight-1",highlight);
                    return node;
                }); //returns main notification outer div
            });
        };
        window.test = notify;
        function animate_class(node, anim_class_str){
            toggleClass(node, anim_class_str, false);
            draf(function(){
                toggleClass(node,anim_class_str,true);
            });
            return animate_class;
        };
        function accessObjectProp(obj){ //reset i and isErrored to make accessObjectProp(obj) reusable
            obj = Object(obj);
            var isErrored = false;
            return function(){
                var props = [].slice.call(arguments),
                    length = props.length,
                    prop,
                    i = 0;
                while(i < length){
                    try {
                        prop = props[i];
                        if(obj.hasOwnProperty(prop)) {
                            obj = Object(obj[prop]);
                        } else {
                            throw new Error("no such property exists");
                        }
                    } catch (e) {
                        isErrored = true;
                        break;
                    }
                    ++i;
                }
                return function(f){
                    if (isErrored) {
                        return false;
                    }
                    if (typeof f === "function"){
                        return {value:f.call(obj,obj)};
                    }
                    return true;
                }
            }
        };
        ////////////////////////////////
        ///////REMOVE DIACRITICS////////
        ////////////////////////////////
        var NormalizeString = (function(str){
            return this.normalize(str);
        }).bind({
            db: "eyLDgSI6IkEiLCLEgiI6IkEiLCLhuq4iOiJBIiwi4bq2IjoiQSIsIuG6sCI6IkEiLCLhurIiOiJBIiwi4bq0IjoiQSIsIseNIjoiQSIsIsOCIjoiQSIsIuG6pCI6IkEiLCLhuqwiOiJBIiwi4bqmIjoiQSIsIuG6qCI6IkEiLCLhuqoiOiJBIiwiw4QiOiJBIiwix54iOiJBIiwiyKYiOiJBIiwix6AiOiJBIiwi4bqgIjoiQSIsIsiAIjoiQSIsIsOAIjoiQSIsIuG6oiI6IkEiLCLIgiI6IkEiLCLEgCI6IkEiLCLEhCI6IkEiLCLDhSI6IkEiLCLHuiI6IkEiLCLhuIAiOiJBIiwiyLoiOiJBIiwiw4MiOiJBIiwi6pyyIjoiQUEiLCLDhiI6IkFFIiwix7wiOiJBRSIsIseiIjoiQUUiLCLqnLQiOiJBTyIsIuqctiI6IkFVIiwi6py4IjoiQVYiLCLqnLoiOiJBViIsIuqcvCI6IkFZIiwi4biCIjoiQiIsIuG4hCI6IkIiLCLGgSI6IkIiLCLhuIYiOiJCIiwiyYMiOiJCIiwixoIiOiJCIiwixIYiOiJDIiwixIwiOiJDIiwiw4ciOiJDIiwi4biIIjoiQyIsIsSIIjoiQyIsIsSKIjoiQyIsIsaHIjoiQyIsIsi7IjoiQyIsIsSOIjoiRCIsIuG4kCI6IkQiLCLhuJIiOiJEIiwi4biKIjoiRCIsIuG4jCI6IkQiLCLGiiI6IkQiLCLhuI4iOiJEIiwix7IiOiJEIiwix4UiOiJEIiwixJAiOiJEIiwixosiOiJEIiwix7EiOiJEWiIsIseEIjoiRFoiLCLDiSI6IkUiLCLElCI6IkUiLCLEmiI6IkUiLCLIqCI6IkUiLCLhuJwiOiJFIiwiw4oiOiJFIiwi4bq+IjoiRSIsIuG7hiI6IkUiLCLhu4AiOiJFIiwi4buCIjoiRSIsIuG7hCI6IkUiLCLhuJgiOiJFIiwiw4siOiJFIiwixJYiOiJFIiwi4bq4IjoiRSIsIsiEIjoiRSIsIsOIIjoiRSIsIuG6uiI6IkUiLCLIhiI6IkUiLCLEkiI6IkUiLCLhuJYiOiJFIiwi4biUIjoiRSIsIsSYIjoiRSIsIsmGIjoiRSIsIuG6vCI6IkUiLCLhuJoiOiJFIiwi6p2qIjoiRVQiLCLhuJ4iOiJGIiwixpEiOiJGIiwix7QiOiJHIiwixJ4iOiJHIiwix6YiOiJHIiwixKIiOiJHIiwixJwiOiJHIiwixKAiOiJHIiwixpMiOiJHIiwi4bigIjoiRyIsIsekIjoiRyIsIuG4qiI6IkgiLCLIniI6IkgiLCLhuKgiOiJIIiwixKQiOiJIIiwi4rGnIjoiSCIsIuG4piI6IkgiLCLhuKIiOiJIIiwi4bikIjoiSCIsIsSmIjoiSCIsIsONIjoiSSIsIsSsIjoiSSIsIsePIjoiSSIsIsOOIjoiSSIsIsOPIjoiSSIsIuG4riI6IkkiLCLEsCI6IkkiLCLhu4oiOiJJIiwiyIgiOiJJIiwiw4wiOiJJIiwi4buIIjoiSSIsIsiKIjoiSSIsIsSqIjoiSSIsIsSuIjoiSSIsIsaXIjoiSSIsIsSoIjoiSSIsIuG4rCI6IkkiLCLqnbkiOiJEIiwi6p27IjoiRiIsIuqdvSI6IkciLCLqnoIiOiJSIiwi6p6EIjoiUyIsIuqehiI6IlQiLCLqnawiOiJJUyIsIsS0IjoiSiIsIsmIIjoiSiIsIuG4sCI6IksiLCLHqCI6IksiLCLEtiI6IksiLCLisakiOiJLIiwi6p2CIjoiSyIsIuG4siI6IksiLCLGmCI6IksiLCLhuLQiOiJLIiwi6p2AIjoiSyIsIuqdhCI6IksiLCLEuSI6IkwiLCLIvSI6IkwiLCLEvSI6IkwiLCLEuyI6IkwiLCLhuLwiOiJMIiwi4bi2IjoiTCIsIuG4uCI6IkwiLCLisaAiOiJMIiwi6p2IIjoiTCIsIuG4uiI6IkwiLCLEvyI6IkwiLCLisaIiOiJMIiwix4giOiJMIiwixYEiOiJMIiwix4ciOiJMSiIsIuG4viI6Ik0iLCLhuYAiOiJNIiwi4bmCIjoiTSIsIuKxriI6Ik0iLCLFgyI6Ik4iLCLFhyI6Ik4iLCLFhSI6Ik4iLCLhuYoiOiJOIiwi4bmEIjoiTiIsIuG5hiI6Ik4iLCLHuCI6Ik4iLCLGnSI6Ik4iLCLhuYgiOiJOIiwiyKAiOiJOIiwix4siOiJOIiwiw5EiOiJOIiwix4oiOiJOSiIsIsOTIjoiTyIsIsWOIjoiTyIsIseRIjoiTyIsIsOUIjoiTyIsIuG7kCI6Ik8iLCLhu5giOiJPIiwi4buSIjoiTyIsIuG7lCI6Ik8iLCLhu5YiOiJPIiwiw5YiOiJPIiwiyKoiOiJPIiwiyK4iOiJPIiwiyLAiOiJPIiwi4buMIjoiTyIsIsWQIjoiTyIsIsiMIjoiTyIsIsOSIjoiTyIsIuG7jiI6Ik8iLCLGoCI6Ik8iLCLhu5oiOiJPIiwi4buiIjoiTyIsIuG7nCI6Ik8iLCLhu54iOiJPIiwi4bugIjoiTyIsIsiOIjoiTyIsIuqdiiI6Ik8iLCLqnYwiOiJPIiwixYwiOiJPIiwi4bmSIjoiTyIsIuG5kCI6Ik8iLCLGnyI6Ik8iLCLHqiI6Ik8iLCLHrCI6Ik8iLCLDmCI6Ik8iLCLHviI6Ik8iLCLDlSI6Ik8iLCLhuYwiOiJPIiwi4bmOIjoiTyIsIsisIjoiTyIsIsaiIjoiT0kiLCLqnY4iOiJPTyIsIsaQIjoiRSIsIsaGIjoiTyIsIsiiIjoiT1UiLCLhuZQiOiJQIiwi4bmWIjoiUCIsIuqdkiI6IlAiLCLGpCI6IlAiLCLqnZQiOiJQIiwi4rGjIjoiUCIsIuqdkCI6IlAiLCLqnZgiOiJRIiwi6p2WIjoiUSIsIsWUIjoiUiIsIsWYIjoiUiIsIsWWIjoiUiIsIuG5mCI6IlIiLCLhuZoiOiJSIiwi4bmcIjoiUiIsIsiQIjoiUiIsIsiSIjoiUiIsIuG5niI6IlIiLCLJjCI6IlIiLCLisaQiOiJSIiwi6py+IjoiQyIsIsaOIjoiRSIsIsWaIjoiUyIsIuG5pCI6IlMiLCLFoCI6IlMiLCLhuaYiOiJTIiwixZ4iOiJTIiwixZwiOiJTIiwiyJgiOiJTIiwi4bmgIjoiUyIsIuG5oiI6IlMiLCLhuagiOiJTIiwixaQiOiJUIiwixaIiOiJUIiwi4bmwIjoiVCIsIsiaIjoiVCIsIsi+IjoiVCIsIuG5qiI6IlQiLCLhuawiOiJUIiwixqwiOiJUIiwi4bmuIjoiVCIsIsauIjoiVCIsIsWmIjoiVCIsIuKxryI6IkEiLCLqnoAiOiJMIiwixpwiOiJNIiwiyYUiOiJWIiwi6pyoIjoiVFoiLCLDmiI6IlUiLCLFrCI6IlUiLCLHkyI6IlUiLCLDmyI6IlUiLCLhubYiOiJVIiwiw5wiOiJVIiwix5ciOiJVIiwix5kiOiJVIiwix5siOiJVIiwix5UiOiJVIiwi4bmyIjoiVSIsIuG7pCI6IlUiLCLFsCI6IlUiLCLIlCI6IlUiLCLDmSI6IlUiLCLhu6YiOiJVIiwixq8iOiJVIiwi4buoIjoiVSIsIuG7sCI6IlUiLCLhu6oiOiJVIiwi4busIjoiVSIsIuG7riI6IlUiLCLIliI6IlUiLCLFqiI6IlUiLCLhuboiOiJVIiwixbIiOiJVIiwixa4iOiJVIiwixagiOiJVIiwi4bm4IjoiVSIsIuG5tCI6IlUiLCLqnZ4iOiJWIiwi4bm+IjoiViIsIsayIjoiViIsIuG5vCI6IlYiLCLqnaAiOiJWWSIsIuG6giI6IlciLCLFtCI6IlciLCLhuoQiOiJXIiwi4bqGIjoiVyIsIuG6iCI6IlciLCLhuoAiOiJXIiwi4rGyIjoiVyIsIuG6jCI6IlgiLCLhuooiOiJYIiwiw50iOiJZIiwixbYiOiJZIiwixbgiOiJZIiwi4bqOIjoiWSIsIuG7tCI6IlkiLCLhu7IiOiJZIiwixrMiOiJZIiwi4bu2IjoiWSIsIuG7viI6IlkiLCLIsiI6IlkiLCLJjiI6IlkiLCLhu7giOiJZIiwixbkiOiJaIiwixb0iOiJaIiwi4bqQIjoiWiIsIuKxqyI6IloiLCLFuyI6IloiLCLhupIiOiJaIiwiyKQiOiJaIiwi4bqUIjoiWiIsIsa1IjoiWiIsIsSyIjoiSUoiLCLFkiI6Ik9FIiwi4bSAIjoiQSIsIuG0gSI6IkFFIiwiypkiOiJCIiwi4bSDIjoiQiIsIuG0hCI6IkMiLCLhtIUiOiJEIiwi4bSHIjoiRSIsIuqcsCI6IkYiLCLJoiI6IkciLCLKmyI6IkciLCLKnCI6IkgiLCLJqiI6IkkiLCLKgSI6IlIiLCLhtIoiOiJKIiwi4bSLIjoiSyIsIsqfIjoiTCIsIuG0jCI6IkwiLCLhtI0iOiJNIiwiybQiOiJOIiwi4bSPIjoiTyIsIsm2IjoiT0UiLCLhtJAiOiJPIiwi4bSVIjoiT1UiLCLhtJgiOiJQIiwiyoAiOiJSIiwi4bSOIjoiTiIsIuG0mSI6IlIiLCLqnLEiOiJTIiwi4bSbIjoiVCIsIuKxuyI6IkUiLCLhtJoiOiJSIiwi4bScIjoiVSIsIuG0oCI6IlYiLCLhtKEiOiJXIiwiyo8iOiJZIiwi4bSiIjoiWiIsIsOhIjoiYSIsIsSDIjoiYSIsIuG6ryI6ImEiLCLhurciOiJhIiwi4bqxIjoiYSIsIuG6syI6ImEiLCLhurUiOiJhIiwix44iOiJhIiwiw6IiOiJhIiwi4bqlIjoiYSIsIuG6rSI6ImEiLCLhuqciOiJhIiwi4bqpIjoiYSIsIuG6qyI6ImEiLCLDpCI6ImEiLCLHnyI6ImEiLCLIpyI6ImEiLCLHoSI6ImEiLCLhuqEiOiJhIiwiyIEiOiJhIiwiw6AiOiJhIiwi4bqjIjoiYSIsIsiDIjoiYSIsIsSBIjoiYSIsIsSFIjoiYSIsIuG2jyI6ImEiLCLhupoiOiJhIiwiw6UiOiJhIiwix7siOiJhIiwi4biBIjoiYSIsIuKxpSI6ImEiLCLDoyI6ImEiLCLqnLMiOiJhYSIsIsOmIjoiYWUiLCLHvSI6ImFlIiwix6MiOiJhZSIsIuqctSI6ImFvIiwi6py3IjoiYXUiLCLqnLkiOiJhdiIsIuqcuyI6ImF2Iiwi6py9IjoiYXkiLCLhuIMiOiJiIiwi4biFIjoiYiIsIsmTIjoiYiIsIuG4hyI6ImIiLCLhtawiOiJiIiwi4baAIjoiYiIsIsaAIjoiYiIsIsaDIjoiYiIsIsm1IjoibyIsIsSHIjoiYyIsIsSNIjoiYyIsIsOnIjoiYyIsIuG4iSI6ImMiLCLEiSI6ImMiLCLJlSI6ImMiLCLEiyI6ImMiLCLGiCI6ImMiLCLIvCI6ImMiLCLEjyI6ImQiLCLhuJEiOiJkIiwi4biTIjoiZCIsIsihIjoiZCIsIuG4iyI6ImQiLCLhuI0iOiJkIiwiyZciOiJkIiwi4baRIjoiZCIsIuG4jyI6ImQiLCLhta0iOiJkIiwi4baBIjoiZCIsIsSRIjoiZCIsIsmWIjoiZCIsIsaMIjoiZCIsIsSxIjoiaSIsIsi3IjoiaiIsIsmfIjoiaiIsIsqEIjoiaiIsIsezIjoiZHoiLCLHhiI6ImR6Iiwiw6kiOiJlIiwixJUiOiJlIiwixJsiOiJlIiwiyKkiOiJlIiwi4bidIjoiZSIsIsOqIjoiZSIsIuG6vyI6ImUiLCLhu4ciOiJlIiwi4buBIjoiZSIsIuG7gyI6ImUiLCLhu4UiOiJlIiwi4biZIjoiZSIsIsOrIjoiZSIsIsSXIjoiZSIsIuG6uSI6ImUiLCLIhSI6ImUiLCLDqCI6ImUiLCLhursiOiJlIiwiyIciOiJlIiwixJMiOiJlIiwi4biXIjoiZSIsIuG4lSI6ImUiLCLisbgiOiJlIiwixJkiOiJlIiwi4baSIjoiZSIsIsmHIjoiZSIsIuG6vSI6ImUiLCLhuJsiOiJlIiwi6p2rIjoiZXQiLCLhuJ8iOiJmIiwixpIiOiJmIiwi4bWuIjoiZiIsIuG2giI6ImYiLCLHtSI6ImciLCLEnyI6ImciLCLHpyI6ImciLCLEoyI6ImciLCLEnSI6ImciLCLEoSI6ImciLCLJoCI6ImciLCLhuKEiOiJnIiwi4baDIjoiZyIsIselIjoiZyIsIuG4qyI6ImgiLCLInyI6ImgiLCLhuKkiOiJoIiwixKUiOiJoIiwi4rGoIjoiaCIsIuG4pyI6ImgiLCLhuKMiOiJoIiwi4bilIjoiaCIsIsmmIjoiaCIsIuG6liI6ImgiLCLEpyI6ImgiLCLGlSI6Imh2Iiwiw60iOiJpIiwixK0iOiJpIiwix5AiOiJpIiwiw64iOiJpIiwiw68iOiJpIiwi4bivIjoiaSIsIuG7iyI6ImkiLCLIiSI6ImkiLCLDrCI6ImkiLCLhu4kiOiJpIiwiyIsiOiJpIiwixKsiOiJpIiwixK8iOiJpIiwi4baWIjoiaSIsIsmoIjoiaSIsIsSpIjoiaSIsIuG4rSI6ImkiLCLqnboiOiJkIiwi6p28IjoiZiIsIuG1uSI6ImciLCLqnoMiOiJyIiwi6p6FIjoicyIsIuqehyI6InQiLCLqna0iOiJpcyIsIsewIjoiaiIsIsS1IjoiaiIsIsqdIjoiaiIsIsmJIjoiaiIsIuG4sSI6ImsiLCLHqSI6ImsiLCLEtyI6ImsiLCLisaoiOiJrIiwi6p2DIjoiayIsIuG4syI6ImsiLCLGmSI6ImsiLCLhuLUiOiJrIiwi4baEIjoiayIsIuqdgSI6ImsiLCLqnYUiOiJrIiwixLoiOiJsIiwixpoiOiJsIiwiyawiOiJsIiwixL4iOiJsIiwixLwiOiJsIiwi4bi9IjoibCIsIsi0IjoibCIsIuG4tyI6ImwiLCLhuLkiOiJsIiwi4rGhIjoibCIsIuqdiSI6ImwiLCLhuLsiOiJsIiwixYAiOiJsIiwiyasiOiJsIiwi4baFIjoibCIsIsmtIjoibCIsIsWCIjoibCIsIseJIjoibGoiLCLFvyI6InMiLCLhupwiOiJzIiwi4bqbIjoicyIsIuG6nSI6InMiLCLhuL8iOiJtIiwi4bmBIjoibSIsIuG5gyI6Im0iLCLJsSI6Im0iLCLhta8iOiJtIiwi4baGIjoibSIsIsWEIjoibiIsIsWIIjoibiIsIsWGIjoibiIsIuG5iyI6Im4iLCLItSI6Im4iLCLhuYUiOiJuIiwi4bmHIjoibiIsIse5IjoibiIsIsmyIjoibiIsIuG5iSI6Im4iLCLGniI6Im4iLCLhtbAiOiJuIiwi4baHIjoibiIsIsmzIjoibiIsIsOxIjoibiIsIseMIjoibmoiLCLDsyI6Im8iLCLFjyI6Im8iLCLHkiI6Im8iLCLDtCI6Im8iLCLhu5EiOiJvIiwi4buZIjoibyIsIuG7kyI6Im8iLCLhu5UiOiJvIiwi4buXIjoibyIsIsO2IjoibyIsIsirIjoibyIsIsivIjoibyIsIsixIjoibyIsIuG7jSI6Im8iLCLFkSI6Im8iLCLIjSI6Im8iLCLDsiI6Im8iLCLhu48iOiJvIiwixqEiOiJvIiwi4bubIjoibyIsIuG7oyI6Im8iLCLhu50iOiJvIiwi4bufIjoibyIsIuG7oSI6Im8iLCLIjyI6Im8iLCLqnYsiOiJvIiwi6p2NIjoibyIsIuKxuiI6Im8iLCLFjSI6Im8iLCLhuZMiOiJvIiwi4bmRIjoibyIsIserIjoibyIsIsetIjoibyIsIsO4IjoibyIsIse/IjoibyIsIsO1IjoibyIsIuG5jSI6Im8iLCLhuY8iOiJvIiwiyK0iOiJvIiwixqMiOiJvaSIsIuqdjyI6Im9vIiwiyZsiOiJlIiwi4baTIjoiZSIsIsmUIjoibyIsIuG2lyI6Im8iLCLIoyI6Im91Iiwi4bmVIjoicCIsIuG5lyI6InAiLCLqnZMiOiJwIiwixqUiOiJwIiwi4bWxIjoicCIsIuG2iCI6InAiLCLqnZUiOiJwIiwi4bW9IjoicCIsIuqdkSI6InAiLCLqnZkiOiJxIiwiyqAiOiJxIiwiyYsiOiJxIiwi6p2XIjoicSIsIsWVIjoiciIsIsWZIjoiciIsIsWXIjoiciIsIuG5mSI6InIiLCLhuZsiOiJyIiwi4bmdIjoiciIsIsiRIjoiciIsIsm+IjoiciIsIuG1syI6InIiLCLIkyI6InIiLCLhuZ8iOiJyIiwiybwiOiJyIiwi4bWyIjoiciIsIuG2iSI6InIiLCLJjSI6InIiLCLJvSI6InIiLCLihoQiOiJjIiwi6py/IjoiYyIsIsmYIjoiZSIsIsm/IjoiciIsIsWbIjoicyIsIuG5pSI6InMiLCLFoSI6InMiLCLhuaciOiJzIiwixZ8iOiJzIiwixZ0iOiJzIiwiyJkiOiJzIiwi4bmhIjoicyIsIuG5oyI6InMiLCLhuakiOiJzIiwiyoIiOiJzIiwi4bW0IjoicyIsIuG2iiI6InMiLCLIvyI6InMiLCLJoSI6ImciLCLhtJEiOiJvIiwi4bSTIjoibyIsIuG0nSI6InUiLCLFpSI6InQiLCLFoyI6InQiLCLhubEiOiJ0IiwiyJsiOiJ0IiwiyLYiOiJ0Iiwi4bqXIjoidCIsIuKxpiI6InQiLCLhuasiOiJ0Iiwi4bmtIjoidCIsIsatIjoidCIsIuG5ryI6InQiLCLhtbUiOiJ0IiwixqsiOiJ0IiwiyogiOiJ0IiwixaciOiJ0Iiwi4bW6IjoidGgiLCLJkCI6ImEiLCLhtIIiOiJhZSIsIsedIjoiZSIsIuG1tyI6ImciLCLJpSI6ImgiLCLKriI6ImgiLCLKryI6ImgiLCLhtIkiOiJpIiwiyp4iOiJrIiwi6p6BIjoibCIsIsmvIjoibSIsIsmwIjoibSIsIuG0lCI6Im9lIiwiybkiOiJyIiwiybsiOiJyIiwiyboiOiJyIiwi4rG5IjoiciIsIsqHIjoidCIsIsqMIjoidiIsIsqNIjoidyIsIsqOIjoieSIsIuqcqSI6InR6Iiwiw7oiOiJ1Iiwixa0iOiJ1Iiwix5QiOiJ1Iiwiw7siOiJ1Iiwi4bm3IjoidSIsIsO8IjoidSIsIseYIjoidSIsIseaIjoidSIsIsecIjoidSIsIseWIjoidSIsIuG5syI6InUiLCLhu6UiOiJ1IiwixbEiOiJ1IiwiyJUiOiJ1Iiwiw7kiOiJ1Iiwi4bunIjoidSIsIsawIjoidSIsIuG7qSI6InUiLCLhu7EiOiJ1Iiwi4burIjoidSIsIuG7rSI6InUiLCLhu68iOiJ1IiwiyJciOiJ1IiwixasiOiJ1Iiwi4bm7IjoidSIsIsWzIjoidSIsIuG2mSI6InUiLCLFryI6InUiLCLFqSI6InUiLCLhubkiOiJ1Iiwi4bm1IjoidSIsIuG1qyI6InVlIiwi6p24IjoidW0iLCLisbQiOiJ2Iiwi6p2fIjoidiIsIuG5vyI6InYiLCLKiyI6InYiLCLhtowiOiJ2Iiwi4rGxIjoidiIsIuG5vSI6InYiLCLqnaEiOiJ2eSIsIuG6gyI6InciLCLFtSI6InciLCLhuoUiOiJ3Iiwi4bqHIjoidyIsIuG6iSI6InciLCLhuoEiOiJ3Iiwi4rGzIjoidyIsIuG6mCI6InciLCLhuo0iOiJ4Iiwi4bqLIjoieCIsIuG2jSI6IngiLCLDvSI6InkiLCLFtyI6InkiLCLDvyI6InkiLCLhuo8iOiJ5Iiwi4bu1IjoieSIsIuG7syI6InkiLCLGtCI6InkiLCLhu7ciOiJ5Iiwi4bu/IjoieSIsIsizIjoieSIsIuG6mSI6InkiLCLJjyI6InkiLCLhu7kiOiJ5IiwixboiOiJ6Iiwixb4iOiJ6Iiwi4bqRIjoieiIsIsqRIjoieiIsIuKxrCI6InoiLCLFvCI6InoiLCLhupMiOiJ6IiwiyKUiOiJ6Iiwi4bqVIjoieiIsIuG1tiI6InoiLCLhto4iOiJ6IiwiypAiOiJ6IiwixrYiOiJ6IiwiyYAiOiJ6Iiwi76yAIjoiZmYiLCLvrIMiOiJmZmkiLCLvrIQiOiJmZmwiLCLvrIEiOiJmaSIsIu+sgiI6ImZsIiwixLMiOiJpaiIsIsWTIjoib2UiLCLvrIYiOiJzdCIsIuKCkCI6ImEiLCLigpEiOiJlIiwi4bWiIjoiaSIsIuKxvCI6ImoiLCLigpIiOiJvIiwi4bWjIjoiciIsIuG1pCI6InUiLCLhtaUiOiJ2Iiwi4oKTIjoieCJ9",
            get char_map() {
                delete this.char_map;
                return this.char_map = JSON.parse(decodeURIComponent(escape(atob(this.db))));
            },
            normalize: function(str){
                var that = this;
                return str.replace(/[^A-Za-z0-9\[\] ]/g,function(m,o,s){return that.char_map[m] || m;})
            }
        });
        ////////////////////////////////
        ///////REMOVE DIACRITICS////////
        ////////////////////////////////
        ////////////////////////////////
        /////////INTERPOLATORS//////////
        ////////////////////////////////
        var interpolators = {
            identityRaw: function(t){
                return t;
            },
            identity: function(t){
                t = Math.max(0,Math.min(1,t));
                return t;
            },
            cubicSlowInSlowOut: function(t){
                t = Math.max(0,Math.min(1,t));
                if(2*t<<0){
                    return 4*(t-1)*(t-1)*(t-1)+1;
                } else {
                    return 4*t*t*t;
                }
            },
            cubicFastInFastOut: function(t){
                t = Math.max(0,Math.min(1,t));
                return 4*(t-0.5)*(t-0.5)*(t-0.5)+0.5;
            },
            elastic: function(t){
                t = Math.max(0,Math.min(1,t));
                var range = 10.5*Math.PI;
                return (range - Math.sin(range*t)/t)/(range - 1);
            }
        };
        function animNumText(node,start,end,duration,fT){
            node._rafxText && node._rafxText.break();
            return node._rafxText = rafx.async()
                .animate(function(v,o){
                    var t = o.i / duration;
                    node.textContent = Math.round((start + o.diff * fT(t)) * 10) / 10;
                    return t;
                },{i:0,diff: end - start})
                .until(function(t,o){
                    o.i++;
                    return t >= 1;
                }).then(function(){
                    node.textContent = end;
                });
        }
        ////////////////////////////////
        /////////INTERPOLATORS//////////
        ////////////////////////////////
        ////////////////////////////////
        ///////////REUSABLES////////////
        ////////////////////////////////
        var spaceAround = /^\s+|\s+$/,
            nrDotNr = /^([0-9]+)\.([0-9]+)$/,
            nrCap = /^([0-9]+)([A-Z]+)$/,
            _nrCap = /([0-9]+)([A-Z]+)$/,
            allSpace = /\s+/g,
            reusableKeywords = {
                "spaceAround": new RegExp("spaceAround"),
                "nrDotNr": new RegExp("nrDotNr"),
                "nrCap": new RegExp("(?:^|\s+|[^_])nrCap"),
                "_nrCap": new RegExp("_nrCap"),
                "allSpace": new RegExp("allSpace"),
                "isNaN": new RegExp("(?:^|\s+|[^_])isNaN"),
                "_isNaN": new RegExp("_isNaN")
            },
            reusableKeywordsKeys = Object.keys(reusableKeywords),
            reusableKeywordsKeysLength = reusableKeywordsKeys.length;
        function appendChildren(node,arr){
            arr = Array.prototype.slice.call(arr);
            var frag = 
                appendChildren._frag = 
                    appendChildren._frag || document.createDocumentFragment();
            for (var i = 0, l = arr.length; i < l; ++i){
                frag.appendChild(arr[i]);
            }
            node.appendChild(frag);
            return appendChildren;
        }
        function _isNaN (nr) {
            return nr !== nr;
        }
        function flatten(arr){
            var emp = [];
            return emp.concat.apply(emp,arr);
        }
        function flattenRec (arr) {
            arr = flatten(arr);
            for (var i = 0, l = arr.length; i < l; ++i){
                if (arr[i] instanceof Array) {
                    return flattenRec(arr);
                }
            }
            return arr;
        }
        function codify(f, name, str, alreadyParsed){
            var str = str || "",
                alreadyParsed = alreadyParsed || [],
                name = name || "",
                l = alreadyParsed.length;
            str += name + normalize(f);
            for (var i = 0, k; i < reusableKeywordsKeysLength; ++i){
                k = reusableKeywordsKeys[i];
                if(!~alreadyParsed.indexOf(k) && reusableKeywords[k].test(str)){
                    if(!l){
                        str += "\n\n"
                        + "///////////////////////////////\n"
                        + "////////DEPENDENCIES///////////\n"
                        + "///////////////////////////////"
                    }
                    alreadyParsed.push(k);
                    return codify(reusableSelf[k], "\n\n//" + k + "\n", str, alreadyParsed);
                }
            }	
            return str;
        }
        function getExcessIndentation(str){
            var s = "",
                c = "",
                i = 2;
            while((c = str.slice(-i,-i + 1)) !== "\n"){
                ++i;
                s += c;
            }
            return s;
        }
        function normalize(o) {
            var str = o.toString();
            if(typeof o !== "function") {
                return str;
            }
            return str.replace(new RegExp("^" + getExcessIndentation(str),"gm"),"");
        }
        keepFirstNElements = function keepFirstNElements(el, n = 1){
            n = max(0, n);
            const c = el.children,
                  aC = Array.from(c);
            let i = 0;
            while(c.length > n) {
                el.removeChild(el.lastElementChild);
                ++i;
            }
            return aC.slice(-i);
        }
        function shortenStringMiddle(str, {length = 20, fill = "..."} = {}){
            length = max(0, length);
            const fLen = fill.length;
            if(str.length <= length) {
                return str;
            } else if (length < fLen) {
                return fill.slice(0, length);
            } else if(length === fLen) {
                return fill;
            }
            length = length - fLen + epsilon;
            const hLenL = length / 2 | 0,
                  hLenR = length - hLenL | 0;
            return str.slice(0, hLenL) + fill + str.slice(-hLenR);
        }
        bytesToHuman = function bytesToHuman(size) {
            var i = Math.max(0, Math.log2(size) / 10 | 0);
            return +( size / Math.pow(1024, i) ).toFixed(2) + ' ' + ['B', 'kB', 'MB', 'GB', 'TB'][i];
        }
        function parseFilename (name){
            var match = name.match(/([^\/\\]+?)(\.[^.]*)?$/i);
            return {
                base: match?.[1] ?? (()=>{throw new Error("cannot parse filename")})(), 
                ext: match?.[2] ?? ""
            };
        }
        var genHexStr = (function(){
            const ceil = Math.ceil,
                  log = Math.log,
                  min = Math.min,
                  rand = Math.random,
                  log10b16 = log(10) / log(16),
                  maxPow10 = Math.log(Number.MAX_SAFE_INTEGER) / Math.log(10) | 0;
            return function genHexStr(complexity = 6, reps =2, prefix = "", postfix = ""){
                let padding = "0".repeat(ceil(complexity * log10b16)),
                    ceiling = 10 ** min(maxPow10, complexity);
                return prefix 
                + Array.from({length: reps}, d => (
                    padding 
                    + (+(rand() * ceiling).toFixed(0)).toString(16)
                ).slice(-padding.length)).join("").replace(/^0/,"f")
                + postfix
            }
        })();
        var loadCSSAsync = function(src, attrs = {}){
            const link = document.createElement("link"),
                  registeredEvents = new Map;
            let loadsOnEvent = false;
            link.setAttribute("rel", "stylesheet");
            link.setAttribute("type", "text/css");
            link.setAttribute("media", "invalid");
            Object.entries(attrs).forEach(([k,v],i) => {
              if (k.indexOf("load-on-")) {
                return link.setAttribute(k, v);
              }
              loadsOnEvent = true;
              let eventName = k.slice(8);
              const listener = function(e){
                e && e?.stopPropagation();
                console.log(`dynamic css loading started: ${src}`);
                [...registeredEvents].forEach(([v,[e,l]]) => v.removeEventListener(e, l));
                link.setAttribute("href", src);
                (document.head || document.getElementsByTagName("head")[0])
                .appendChild(link);
                setTimeout(() => link.removeAttribute("media"), 17);
              };
              registeredEvents.set(v, [eventName,listener]);
              v.addEventListener(eventName, listener);
            });
            if (loadsOnEvent) {
                return Promise.resolve(src);
            }
            link.setAttribute("href", src);
            (document.head || document.getElementsByTagName("head")[0])
            .appendChild(link);
            return new Promise((res,rej) =>
                setTimeout(() => (link.removeAttribute("media"), res(src)), 17)
            );
        };
        var loadCSSAsyncMulti = function (srcObj) {
            const promises = [];
            Object.entries(srcObj).forEach(([src, attrs]) => 
                promises.push(loadCSSAsync(src, attrs ?? {}))
            );
            return Promise.all(promises);
        }
        var loadScriptAsync = function(src, attrs = {}){
            const script = document.createElement("script"),
                  registeredEvents = new Map;
            let loadsOnEvent = false;
            script.setAttribute("type", "text/javascript");
            script.async = true;
            return new Promise((res,rej) => {
                script.onload = () => res(src);
                script.onerror = () => rej(src);
                Object.entries(attrs).forEach(([k,v],i) => {
                    if (k.indexOf("load-on-")) {
                        return script.setAttribute(k, v);
                    }
                    loadsOnEvent = true;
                    let eventName = k.slice(8);
                    const listener = function(e){
                        e && e?.stopPropagation();
                        console.log(`dynamic script loading started: ${src}`);
                        [...registeredEvents].forEach(([v,[e,l]]) => v.removeEventListener(e, l));
                        script.src = src;
                        (document.head || document.getElementsByTagName("head")[0])
                        .appendChild(script);
                    };
                    registeredEvents.set(v, [eventName,listener]);
                    v.addEventListener(eventName, listener);
                });
                if (loadsOnEvent) {return};
                script.src = src;
                (document.head || document.getElementsByTagName("head")[0])
                .appendChild(script);
            });
        };
        var loadScriptAsyncMulti = function (srcObj) {
            const promises = [];
            Object.entries(srcObj).forEach(([src, attrs]) => 
                promises.push(loadScriptAsync(src, attrs ?? {}))
            );
            return Promise.all(promises);
        };
        var reusableSelf = {
            "spaceAround": spaceAround,
            "nrDotNr": nrDotNr,
            "nrCap": nrCap,
            "_nrCap": _nrCap,
            "allSpace": allSpace,
            "isNaN": isNaN,
            "_isNaN": _isNaN
        };
        ////////////////////////////////
        ////////////EXPORTS/////////////
        ////////////////////////////////
        taskq.export(AjaxChain,"AjaxChain")
             .export(toggleClass,"toggleClass")
             .export(accessObjectProp,"accessObjectProp")
             .export(animate_class,"animate_class")
             .export(notify,"notify")
             .export(assign,"assign")
             .export(notification,"notification")
             .export(panels,"panels")
             .export(fNOP,"fNOP")
             .export(fNYI,"fNYI")
             .export(draf,"draf")
             .export(body,"body")
             .export(getNearestField,"getNearestField")
             .export(interpolators, "interpolators")
             .export(interpolators.cubicSlowInSlowOut,"cubic")
             .export(animNumText,"animNumText")
             .export(spaceAround,"spaceAround")
             .export(codify,"codify")
             .export(flatten,"flatten")
             .export(flattenRec,"flattenRec")
             .export(appendChildren,"appendChildren")
             .export(min,"min")
             .export(max,"max")
             .export(htmlEl, "htmlEl")
             .export(keepFirstNElements, "keepFirstNElements")
             .export(shortenStringMiddle, "shortenStringMiddle")
             .export(bytesToHuman, "bytesToHuman")
             .export(parseFilename, "parseFilename")
             .export(genHexStr, "genHexStr")
             .export(loadCSSAsync, "loadCSSAsync")
             .export(loadCSSAsyncMulti, "loadCSSAsyncMulti")
             .export(loadScriptAsync, "loadScriptAsync")
             .export(loadScriptAsyncMulti, "loadScriptAsyncMulti");
        taskq._exportPersist = taskq._exportPersist || {
            loadCSSAsync: loadCSSAsync,
            loadScriptAsync: loadScriptAsync,
            genHexStr
        };
        ////////////////////////////////
        ////////////EXPORTS/////////////
        ////////////////////////////////
    }
    pre._taskqId = "pre";
    pre._taskqWaitFor = ["LocalStorage"];
    taskq.push(pre);
}();
export {keepFirstNElements, bytesToHuman};