const 
    http = require('node:http'),
    {until} = require("../../../helpers.js");

/**
@description requests an URI to be downloaded
@param {Object} rawData an object that has a value property
@param {string} rawData.value output of a stream object at the time
@param {...RegExp} rgxs array of regexps to test both match and order
@returns {boolean} true or false depending on match and order
@example
const dlResponse = await reqDwnld(uriDetails);
console.log(dlResponse.statusCode) //hopefully 200
*/
const validateSSE = (rawData, ...rgxs) => until(function(rgxs){
    return rgxs.reduce((ac,d) => {
        if (!ac.value){return ac}
        const 
            match = rawData.value.match(d),
            index = match?.index;
        if (ac.index < index) {
            ac.index = index;
        } else {
            ac.value = false;
        }
        return ac;
    }, {value: true, index: -1})
    .value
},{interval: 500, args: [
    rgxs
]});
module.exports = validateSSE;