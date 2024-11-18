const 
    _TA = Object.getPrototypeOf(Uint8Array.prototype).constructor,
    undef = void(0);

/**
 * Synchronously validates web-socket buffer contents, 
 * @param {object} iterable an object that implments [Symbol.iterable]
 * @param {object=} options an options object
 * @param {number=} [options.sep] the charcode of field separator
 * @param {number=} [options.maxLen] max length of the payload array or buffer
 * @param {number=} options.fieldLen max length of each field except payload
 * @param {boolean=} options.nodejsDeepCopy boolean flag to create a new buffer that does not use the same memory
 * @returns {{channel: string, evt: string, namespace: string, payload: Buffer|Uint8Array}}} if finder had success, pathstring to executable, else 'undefined'
 */
exports.validate = function validate(iter, {sep = 0, maxLen = 0x6400000, fieldLen = 32, nodejsDeepCopy = false} = {sep: 0, maxLen: 0x6400000, fieldLen: 32, nodejsDeepCopy: false}) {
    if (!(iter instanceof _TA)) {return false}
    let 
        flag = 1, //1 => channel, 2 => event, 3 => namespace
        len = 0,
        channel,
        evt,
        namespace,
        payload,
        iterLen = iter?.length,
        temp = "", //128kB
        i = -1;
    if (iterLen > maxLen) {
        return false;
    } else if (!iterLen) {
        return false;
    }
    LOOP:
    for (let byte of iter){
        if(len > fieldLen) {
            return false;
        }
        ++i;
        byte &= 0xFF;
        if (!len && byte === sep && flag < 8) {
            return false;
        }
        if (byte === sep) {
            console.log("flag is", flag);
            switch (flag) {
                case 1:
                    channel = temp;
                    temp = "", len = 0;
                    flag <<= 1;
                    continue LOOP;
                case 2: 
                    evt = temp;
                    temp = "", len = 0;
                    flag <<= 1;
                    continue LOOP;
                case 4:
                    namespace = temp;
                    temp = "", len = 0;
                    flag <<= 1;
                    continue LOOP;
                case 8: 
                    console.log("hellow!");
                    if (nodejsDeepCopy) {
                        payload = Buffer.alloc(iterLen - i);
                        if ("copy" in iter) {
                            iter.copy(payload,0,i)
                        } else {
                            Buffer.copyBytesFrom(iter, i).copy(payload,0,0)
                        }
                    } else if ("subarray" in iter) {
                        payload = iter.subarray(i)
                    } else {
                        console.log("here?", i, payload);
                        payload = iter.slice(i)
                    }
                    break LOOP;
                default:
                    return false;
            }
        }
        if (flag < 8) {
            temp += String.fromCharCode(byte);
            ++len;
        }
    }
    if (!channel || !evt || !namespace || !payload?.length) {
        console.log("flag!!"); 
        console.log(channel, evt, namespace, payload); 
        return false;
    }
    return {channel, evt, namespace, payload}
}

//USAGE:
/* var x = "helloooooooooooooooooooooooo\0worlddddddddddddddddddddddddddd\0name\u{0}\u{0}\u{0}\u{0}123asd".split("").map(d => d.charCodeAt(0));
var y = new Uint8Array(x);
var z = Buffer.from(new Uint8Array(x));
console.log(exports.validate(y, {nodejsDeepCopy:true}));
console.log(exports.validate(y));
console.log(exports.validate(z, {nodejsDeepCopy:true}));
console.log(exports.validate(z));  */
var u = new Uint8Array(`channel\0event\0namespace\u{0}payload`.split("").map(d => d.charCodeAt(0)));
console.log(u);
console.log(exports.validate(u));
