const path = require('path'),
      {getFiles} = require("../../getFiles.js"),
      {getStats} = require("../../getStats.js");
module.exports = function({express, app, info, files, serverSent}){
    app
    .get('/update', function (req, res, next) {
        serverSent.msg("streamOne", req.session.id, {payload: "This is an event!"})
        .msg("streamOne", req.session.id, {directive:"event", payload:"anotherevent"})
        .msg("streamOne",req.session.id,{payload:"OPPPAA!!!"});
        serverSent.msgAll("streamOne",{payload: "Man this goes to EVERYONE!!!!"});
        console.log(serverSent, req.session.id);
        res.status(200).end();
    })
    .get('/estream/subscribe', function(req, res, next) {
        if(req._isDuplicate){
            serverSent
            .msg("streamOne", req.session.id, {directive: "event", payload: "connection-surplus"})
            .msg("streamOne", req.session.id, {payload: "close extra tabs"});
            return res.status(429).send({
                "http-status": 429, 
                "message": "You already have a live TCP connection."
            });
        }
        getFiles(path.join(info.rootFolder, info.serverConf.static, "bam"))
        .then(bamFiles => 
            serverSent
            .msg("streamOne", req.session.id,  {directive: "event", payload: "bam-file-list"})
            .msg("streamOne", req.session.id, {payload: bamFiles})
        );
        getFiles(path.join(info.rootFolder, info.serverConf.static, "fa"), {relativeTo: "/"})
        .then(faFiles => 
            getStats(faFiles.map(d => "/" + d))
            .then(faStats => faStats.map((d,i) => {
               return {[path.basename(faFiles[i])]: d.size}
            }))
            .then(ArrOfObj => ArrOfObj.reduce((ac,d) => Object.assign(ac,d),{}))
            .then(payload => serverSent
                .msg("streamOne", req.session.id,  {directive: "event", payload: "fa-file-stats"})
                .msg("streamOne", req.session.id, {payload})
            )
        );
        serverSent
        .msg("streamOne", req.session.id, {directive: "event", payload: "connection-established"})
        .msg("streamOne", req.session.id, {payload: "Connection Established"});
    });
}