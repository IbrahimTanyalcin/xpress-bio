const ch = new Chain({
    __init__: Chain.tagify({
        strTransform: str => str
            .trim()
            .replace(/^\|>/, "pipe")
            .replace(/^\|</, "rPipe")
            .replace(/^\$>/, "data")
            .replace(/^%>/, "filter")
            .replace(/^\*>/, "crt")
            .replace(/^&>/, "each")
            .replace(/^>>/, "set")
            .replace(/->/gi, "invoke")
            .replace(/^@>/, "select")
            .replace(/=>/gi, "runtime")
            .replace(/^x>/gi, "exec")
            .replace(/^[+]>/gi, "append")
    })(function (...args) {
        if (args.length <= 1) {
            this.selected = args[0];
            return this;
        }
        return this[args[0]](...args.slice(1))
    }),
    select: function(str, trgt){
        if (str instanceof Node) {
            return this(str);
        }
        trgt = trgt || this.selected;
        this.lastOp = this(trgt.querySelector(str));
        return this;
    },
    data: function (data) {
        if (data === void (0)) {
            return this.lastOp = this.__data__;
        }
        this.lastOp = this.__data__ = data;
        this.dataRoot = this.selected;
        return this;
    },
    datum: function (acc, trgt) {
        const that = this,
            idxs = [];
        let ndx = this.getIdx(acc, trgt, true),
            currNode = ndx.node;
        if (!this.dataRoot.contains(currNode)) {
            return void (0);
        } else if (this.dataRoot === currNode) {
            return this.__data__;
        }
        while (currNode !== this.dataRoot) {
            idxs.push(ndx);
            if (acc instanceof Function) {
                trgt = currNode.parentNode.parentNode;
            } else {
                acc = currNode.parentNode;
            }
            ndx = this.getIdx(acc, trgt);
            currNode = ndx.node;
        }
        return function (f = function (idxs) {
            let datum = that.__data__;
            for (let i = 0, l = idxs.length; i < l; ++i) {
                datum = datum[idxs[i].index]
            }
            return datum;
        }) {
            return f(idxs.reverse());
        }
    },
    getIdx: function (acc, trgt, useFilter = false) {
        let pNode,
            children,
            index,
            node,
            findIndex = 0;
        if (acc instanceof Function) {
            pNode = trgt || this.selected;
            findIndex = 1;
        } else if (acc instanceof Node) {
            pNode = acc.parentNode;
        } else {
            pNode = this.selected?.parentNode;
        }
        children = Array.from(pNode?.children ?? { length: 0 }).filter(d => !useFilter || this.__filter__(d, "getIdx"));
        index = children[findIndex ? "findIndex" : "indexOf"](acc ?? this.selected);
        node = children[index];
        return { node, index };
    },
    filter: function (f = (d, op) => d) {
        this.__filter__ = f;
        return this;
    },
    __filter__: (d, op) => d,
    set: function (k, v) {
        if (k instanceof Array) {
            if (k[0] instanceof Array) {
                this.lastOp = k.map(([k, v]) => { this.set(k, v); return v });
                return this;
            }
            [k, v] = k;
        }
        this.selected[k] = this.lastOp = v;
        return this;
    },
    get: function (k) {
        if (k instanceof Array) {
            return this.lastOp = k.map(_k => this.selected[_k])
        }
        return this.lastOp = this.selected[k];
    },
    call: function (a, ...args) {
        this.lastOp = this.selected[a].apply(this.selected, args);
        return this;
    },
    invoke: function (...args) {
        return this.lastOp = this(...args);
    },
    runtime: function (f, ...args){
        this.lastOp = f.apply(this, args);
        return this;
    },
    apply: function (a, args) {
        this.lastOp = this.selected[a].apply(this.selected, args);
        return this;
    },
    gatr: function (attr) {
        if (attr instanceof Array) {
        	  return this.lastOp = attr.map(k => this.gatr(k));
        }
        return this.lastOp = this.selected.getAttribute(attr);
    },
    gatrNS: function (attr, namespace) {
        if (attr instanceof Array) {
        	  return this.lastOp = attr.map(([k, ns]) => this.gatrNS(k, ns));
        }
        return this.lastOp = this.selected.getAttributeNS(namespace, attr);
    },
    satr: function (attr, val) {
        if (attr instanceof Array) {
        	  return this.lastOp = attr.map(([k, v]) => { this.satr(k, v); return v });
        }
        this.selected.setAttribute(attr, this.lastOp = val);
        return this;
    },
    satrNS: function (attr, val, namespace) {
        if (attr instanceof Array) {
            return this.lastOp = attr.map(([k, v, n]) => { this.satrNS(k, v, n); return v });
        }
        this.selected.setAttributeNS(namespace, attr, this.lastOp = val);
        return this;
    },
    unwrap: function(v) {
    	if (v instanceof Function){
        if (v.length === 2) {
          v = v.call(this, this.datum()(), this.dindex()());
        } else if (v.length === 1) {
          v = v.call(this, this.datum()());
        } else {
          v = v.call(this);
        }
      }
      this.lastOp = v;
      return this;
    },
    style: function (k, v) {
        if (k instanceof Array) {
            this.lastOp = k.map(([k, v]) => { 
            	return this.unwrap(v).rPipe("style",k).lastOp; 
            });
        } else {
            this.selected.style.setProperty(k, this.lastOp = this.unwrap(v).lastOp);
        }
        return this;
    },
    pipe: function (command, ...args) {
        args = args.flat();
        this[command].apply(this, [this.lastOp, ...args]);
        return this;
    },
    rPipe: function (command, ...args) {
        args = args.flat();
        this[command].apply(this, [...args, this.lastOp]);
        return this;
    },
    crt: function (tagName, count = 1) {
        if (tagName instanceof Array) {
            this.lastOp = tagName.map(d => document.createElement(d));
        } else {
            this.lastOp = Array.from({ length: count }).map(d => document.createElement(tagName));
        }
        return this;
    },
    crtText: function (data, count = 1) {
        if (data instanceof Array) {
            this.lastOp = data.map(d => document.createTextNode(d));
        } else {
            this.lastOp = Array.from({ length: count }).map(d => document.createTextNode(data));
        }
        return this;
    },
    crtFragment: function (count = 1) {
        this.lastOp = Array.from({ length: count }).map(d => document.createDocumentFragment());
        return this;
    },
    append: function (els) {
        (this.lastOp = els).forEach(d => this.selected.appendChild(d));
        return this;
    },
    sappend: function(els){
    		let lastEl;
      	(this.lastOp = els).forEach(d => lastEl = this.selected.appendChild(d));
        return this(lastEl);
    },
    shift: function (els) {
        (this.lastOp = els).forEach(d => this.selected.insertBefore(d, this.selected.firstElementChild));
        return this;
    },
    prepend: function (els) {
        (this.lastOp = els).forEach(d => this.selected.insertBefore(d, this.selected.firstElementChild));
        return this;
    },
    first: function () {
        return this(this.lastOp = this.selected.firstElementChild);
    },
    last: function () {
        return this(this.lastOp = this.selected.lastElementChild);
    },
    prev: function () {
        return this(this.lastOp = this.selected.previousElementSibling);
    },
    next: function () {
        return this(this.lastOp = this.selected.nextElementSibling);
    },
    pop: function () {
        if (this.selected.children.length) {
            this.lastOp = this.selected.removeChild(this.selected.lastElementChild);
        }
        return this;
    },
    rm: function (els, reverse) {
        if (typeof els?.[0] === "string") {
            let list = Array.from(this.selected.children).filter((d) => this.__filter__(d, "rm")),
                listLen = list.length,
                elsLen = els.length;
            if (reverse) {
                list = list.reverse();
            }
            for (let i = 0, j = 0; i < listLen && j < elsLen; ++i) {
                let node = list[i];
                if (node.parentNode && node.matches(els[j])) {
                    this.selected.removeChild(node);
                    ++j;
                    i = -1;
                } else if (i === listLen - 1) {
                    ++j;
                    i = -1;
                }
            }
        } else {
            els.forEach(node => node
                && this.selected?.contains(node)
                && this.selected.removeChild(node)
            )
        }
        this.lastOp = els;
        return this;
    },
    on: function (evt, f, opts = {}) {
        const that = this;
        let evtName,
            evtNS,
            wm,
            ns,
            ev,
            listener = this.lastOp = f;
        if (evt.includes("@", 1)) {
            if (!this.__eventMap__) {
                this.__eventMap__ = new WeakMap();
            }
            wm = this.__eventMap__;
            [evtName, evtNS] = evt.split("@");
            if (!wm.has(this.selected)) {
                wm.set(this.selected, new Map());
            }
            ns = wm.get(this.selected);
            if (!ns.has(evtNS)) {
                ns.set(evtNS, new Map());
            }
            ev = ns.get(evtNS);
            if (!ev.has(evtName)) {
                ev.set(evtName, new Map())
            }
            ev.get(evtName).set(listener, opts);
        }
        evt = evtName ?? evt;
        (opts.trgt ?? this.selected).addEventListener(evt, listener, opts);
        return this;
    },
    off: function (evt, f, opt) {
        let [evtName, evtNS] = evt.split("@");
        let temp;
        switch ((!!evtName << 1) + (!!evtNS << 0)) {
            case 0:
                this.lastOp = null;
                break;
            case 1:
                (temp = this.__eventMap__
                    .get(this.selected))
                    .get(evtNS)
                    ?.forEach((listeners, evtStr, thisMap) =>
                        listeners.forEach((_opt, _f, thatMap) => {
                            this.lastOp = _f;
                            this.selected.removeEventListener(evtStr, _f, _opt);
                            thatMap.delete(_f);
                        })
                    );
                temp.delete(evtNS);
                break;
            case 2:
            		this.selected.removeEventListener(evt, f, opt);
            		break;
            case 3:
                this.__eventMap__
                    .get(this.selected)
                    .forEach((evtMap, _evtNS, thisMap) => {
                  			if (evtNS !== _evtNS) {
                    			return
                  			}
                        evtMap.forEach((listeners, evtStr, thatMap) => {
                            if (evtStr === evtName) {
                                listeners.forEach((_opt, _f, thereMap) => {
                                    this.lastOp = _f;
                                    this.selected.removeEventListener(evtStr, _f, _opt);
                                    thereMap.delete(_f);
                                })
                            }
                        })
                    });
        }
        return this;
    },
    each: function (f) {
        const oSel = this.selected;
        (this.lastOp = Array.from(this.selected.children)).filter(d => this.__filter__(d, "each")).forEach((d, i, a) => {
            f.call(this, d, i, a);
        }, this);
        return this(oSel);
    },
    exec: function (f, ...args) {
        this.lastOp = f.apply(this, args);
        return this;
    },
    up: function () {
        return this(this.lastOp = this.selected.parentNode);
    },
    addClass: function (cls, trgt) {
    		trgt = trgt || this.selected;
        if (typeof cls === "function") {
            cls = cls.call(this);
        }
        if (cls instanceof Array) {
            trgt.classList.add(...cls);
        } else {
            trgt.classList.add(cls);
        }
        this.lastOp = cls;
        return this;
    },
    rmClass: function (cls, trgt) {
    		trgt = trgt || this.selected;
        if (typeof cls === "function") {
            cls = cls.call(this);
        }
        if (cls instanceof Array) {
            trgt.classList.remove(...cls);
        } else {
            trgt.classList.remove(cls);
        }
        this.lastOp = cls;
        return this;
    },
    toggleClass: function (cls, force, trgt) {
    		trgt = trgt || this.selected;
        if (typeof cls === "function") {
            cls = cls.call(this);
        }
        if (cls instanceof Array) {
            cls.forEach(t => trgt.classList.toggle(t, force));
        } else {
            trgt.classList.toggle(cls, force);
        }
        this.lastOp = cls;
        return this;
    },
    replace: function (cls, nToken, trgt) {
        trgt = trgt || this.selected;
        if (typeof cls === "function") {
            cls = cls.call(this);
        }
        if (cls instanceof Array) {
            cls.forEach(([oToken, nToken]) => trgt.classList.replace(oToken, nToken));
        } else {
            trgt.classList.replace(cls, nToken);
        }
        this.lastOp = cls;
        return this;
    },
    stash: function (v, ...args) {
        if (!this.__stash) {
            this.__stash = [];
        }
        if (typeof v === "function") {
            this.__stash.push(this.lastOp = v.apply(this, args));
        } else {
            this.__stash.push(this.lastOp = v);
        }
        return this;
    },
    save: function (v, ...args) {
        return this.stash(v, ...args);
    },
    stashPop: function (v, ...args) {
        if (typeof v === "function") {
            return this.lastOp = v.apply(this, [this.__stash.pop(), ...args]);
        }
        return this.lastOp = this.__stash.pop();
    },
    recall: function (v, ...args) {
        return this.stashPop(v, ...args);
    },
    animate: function (oKeyframes, opts = 1000) {
        const that = this,
            sel = this.selected;
        if (
            sel.__animation__
            && !["finished", "idle"].includes(sel?.__currentAnimation__?.playState)
        ) {
            this.lastOp = sel.__animation__ = sel.__animation__.then(() => {
                if (sel.__currentAnimation__.__cancelled__) {
                    throw new DOMException("Animation cancelled.", "AbortError");
                }
                return (sel.__currentAnimation__ = sel.animate(oKeyframes, opts)).finished
            })
        } else {
            this.lastOp = sel.__animation__ = (sel.__currentAnimation__ = sel.animate(oKeyframes, opts))
                .finished.catch(() => { })
        }
        return this;
    },
    cancelAnimate: function () {
        let currAnim = this.selected?.__currentAnimation__;
        if (currAnim) {
            (this.lastOp = currAnim).cancel();
            currAnim.__cancelled__ = true;
        }
        return this;
    },
    await: function (promise, cb) {
        this.lastOp = promise.then(cb.bind(this));
        return this;
    }
});