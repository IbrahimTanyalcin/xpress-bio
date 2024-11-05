const WeakBucket = exports.WeakBucket = function(length = 10){
    this.length = length;
    this.index = -1;
    this.bucket = Object.seal(Array.from({length})); 
}
const proto = WeakBucket.prototype;
proto.push = function(obj) {
    if (!(obj instanceof Object)) {
        throw new Error("WeakBuckets only accept an object");
    }
    this.bucket[this.index = ++this.index % this.length] = new WeakRef(obj);
}
proto.stat = function(){ //descending, index 0 points to the most repeat one
    return [...this.bucket.reduce(
        (ac,d) => {
            d = d?.deref();
            if (d && ac.has(d)) {
                ac.set(d, ac.get(d) + 1)
            }
            return ac;
        }, 
        new Map(
            [...new Set(this.bucket.map(d => d?.deref()))].filter(Boolean).map(d => [d, 0])
        )
    ).entries()].sort(([o1,c1], [o2,c2]) => c2 - c1);
}