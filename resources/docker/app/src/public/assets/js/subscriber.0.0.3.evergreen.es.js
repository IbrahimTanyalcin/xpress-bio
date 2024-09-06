const subscriberWeakMap = new WeakMap();
const enu = ["", null, void(0)];

function Subscriber () {
    subscriberWeakMap.set(this, new Map());
}

const proto$1 = Subscriber.prototype;

function SubscriptionState (subscription, gc, subscriptionSet) {
    this.gc = gc;
    this.destroy = this.remove = () => {
        subscriptionSet.delete(subscription);
        this.destroy = null;
        return this.isDestroyed = true;
    };
    this.isDestroyed = false;
}

const 
    subscriptionWeakMap = new WeakMap(),
    subscriptionStateWeakMap = new WeakMap();

function Subscription (gc = () => false, subscriptionSet) {
    subscriptionStateWeakMap.set(this, new SubscriptionState(this, gc, subscriptionSet));
    subscriptionWeakMap.set(this, new Map());
}

const proto = Subscription.prototype;

proto$1.subscribe = function (channelstr, gc = () => false) {
    if (enu.includes(channelstr)) {throw new TypeError("channel string cannot be falsey")}
    if (typeof channelstr !== "string"){throw new TypeError("channel string must be a string")}
    const channelMap = subscriberWeakMap.get(this);
    if (!channelMap.has(channelstr)) {
        channelMap.set(channelstr, new Set());
    }
    const 
        subscriptionSet = channelMap.get(channelstr),
        subscription = new Subscription(gc, subscriptionSet);
    subscriptionSet.add(subscription);
    return subscription;
};

proto$1.dispatchReturn = proto$1.dispatchEventReturn = function (channelstr, eventstr, data) {
    if (enu.includes(channelstr)) {throw new TypeError("channel string cannot be falsey")}
    if (typeof channelstr !== "string"){throw new TypeError("channel string must be a string")}
    if (enu.includes(eventstr)) {throw new TypeError("event string cannot be falsey")}
    if (typeof eventstr !== "string"){throw new TypeError("event string must be a string")}
    return [...(subscriberWeakMap.get(this)?.get(channelstr) || [])].flatMap(subscription => {
        return subscription.dispatchReturn(eventstr, data).map(resultObj => {
            return {channel: channelstr, subscription, ...resultObj}
        })
    })
};

proto$1.dispatch = proto$1.dispatchEvent = function (channelstr, eventstr, data) {
    this.dispatchReturn(channelstr, eventstr, data);
    return this;
};

proto$1.clear = proto$1.clearChannel = function (channelstr) {
    if (enu.includes(channelstr)) {throw new TypeError("channel string cannot be falsey")}
    if (typeof channelstr !== "string"){throw new TypeError("channel string must be a string")}
    subscriberWeakMap.get(this)?.get(channelstr)?.clear();
    return this;
};

proto$1.off = proto$1.removeChannel = function (channelstr) {
    if (enu.includes(channelstr)) {throw new TypeError("channel string cannot be falsey")}
    if (typeof channelstr !== "string"){throw new TypeError("channel string must be a string")}
    subscriberWeakMap.get(this)?.delete(channelstr);
    return this;
};

proto.on = proto.addEventListener = function (eventstr, f) {
    if (enu.includes(eventstr)) {throw new TypeError("event string cannot be falsey")}    if (typeof eventstr !== "string"){throw new TypeError("event string must be a string")}
    if (typeof f !== "function"){throw new TypeError("Subscriptions accept a function as 2nd argument")}
    const 
        [event, namespace = ""] = eventstr.split("@"),
        namespaceMap = subscriptionWeakMap.get(this);
    if (!namespaceMap.has(namespace)) {
        namespaceMap.set(namespace, new Map());
    }
    const eventMap = namespaceMap.get(namespace);
    if (!eventMap.has(event)){
        eventMap.set(event, new Set());
    }
    eventMap.get(event).add(f);
    return this;
};

proto.off = proto.removeEventListener = function (eventstr, f) {
    if (typeof eventstr === "function"){
        f = eventstr;
        subscriptionWeakMap.get(this)?.forEach((eventMap,_namespace) => {
            eventMap.forEach((set, event) => {
                set.delete(f);
            });
        });
        return this;
    }
    if (enu.includes(eventstr)) {throw new TypeError("event string cannot be falsey")}
    if (typeof eventstr !== "string"){throw new TypeError("event string must be a string")}
    if (!enu.includes(f) && typeof f !== "function") {
        throw new TypeError("Second argument to subscription's removeEventListener, if exists, has to be a function")
    }
    const [event, namespace = ""] = eventstr.split("@");
    switch ((!enu.includes(namespace) << 2) + (!enu.includes(event) << 1) + (!enu.includes(f))) {
        case 7:
            subscriptionWeakMap.get(this)?.get(namespace)?.get(event)?.delete(f);
            break;
        case 6:
            subscriptionWeakMap.get(this)?.get(namespace)?.delete(event);
            break;
        case 5:
            subscriptionWeakMap.get(this)?.get(namespace)?.forEach((set, _event) => {
                set.delete(f);
            });
            break;
        case 4:
            subscriptionWeakMap.get(this)?.delete(namespace);
            break;
        case 3:
            subscriptionWeakMap.get(this)?.forEach((eventMap, _namespace) => {
                eventMap.forEach((set, _event) => {
                    if (_event === event) {
                        set.delete(f);
                    }
                });
            });
            break;
        case 2:
            subscriptionWeakMap.get(this)?.forEach((eventMap, _namespace, namespaceMap) => {
                eventMap.forEach((set, _event) => {
                    if (_event === event) {
                        namespaceMap.get(_namespace).delete(event);
                    }
                });
            });
            break;
        case 1:
        case 0:
        default:
            throw new Error("Subscription failed to parse removeEvenListener arguments");
    }
    return this;
};

proto.ondispatch = null;

proto.dispatchReturn = proto.dispatchEventReturn = function (eventstr, data) {
    const state = subscriptionStateWeakMap.get(this);
    const results = [];
    if (state.isDestroyed || state.gc(this)){
        state.destroy?.();
        return results;
    }
    if (enu.includes(eventstr)) {throw new TypeError("event string cannot be falsey")}
    if (typeof eventstr !== "string"){throw new TypeError("event string must be a string")}
    const [event, namespace = ""] = eventstr.split("@");
    switch ((!enu.includes(namespace) << 2) + (!enu.includes(event) << 1)) {
        case 6:
            subscriptionWeakMap.get(this)?.get(namespace)?.get(event)?.forEach(f => results.push(
                {namespace, event, value: f(data)}
            ));
            break;
        case 4:
            subscriptionWeakMap.get(this)?.get(namespace)?.forEach((set, _event) => {
                set.forEach(f => results.push(
                    {namespace, event: _event, value: f(data)}
                ));
            });
            break;
        case 2:
            subscriptionWeakMap.get(this)?.forEach((eventMap, _namespace, namespaceMap) => {
                eventMap.forEach((set, _event) => {
                    if (_event === event) {
                        set.forEach(f => results.push(
                            {namespace: _namespace, event: _event, value: f(data)}
                        ));
                    }
                });
            });
            break;
        case 0:
        default:
            throw new Error("Subscription failed to parse dispatchEvent arguments");
    }
    this.ondispatch?.(results);
    return results;
};

proto.dispatch = proto.dispatchEvent = function (eventstr, data) {
    this.dispatchReturn(eventstr, data);
    return this;
};

proto.destroy = proto.remove = function () {
    const state = subscriptionStateWeakMap.get(this);
    state.destroy?.();
    return this;
};

export { Subscriber as default };
