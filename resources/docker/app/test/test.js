const {nTimes, once, until} = require("../js/helpers.js");


var x = {o: 5};


var tmo = setTimeout(function(){x.o = 16},10000);

var pr = until(function(arg1){
    if(arg1.o > 15){
        return new Promise(res => setTimeout( ()=>res("ahahah") ,0))
    } 
    return new Promise(res => setTimeout(() => res(false),20000));
}, {args:[x]});

console.log(pr);
pr.then(v => console.log("value is ", v));

//setTimeout(function(){pr.break(); clearTimeout(tmo);},4995);