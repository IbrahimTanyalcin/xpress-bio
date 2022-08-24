const   fs = require('fs'),
        fsPromises = require('fs/promises'),
        { PassThrough : pass} = require('stream');

module.exports = function(express, app, info, files){
    app.get(/ranges\/([A-Z0-9.\-_]+)/i, function(req, res) {
        /* console.log(req.query);
        console.log(process.env.NODE_ENV); */
        const fileName = files[req.path.match(req.route.path)?.[1] ?? "inexistent_file"];
        if(!fileName){
            res.status(404).end("Requested File Does Not Exist");
            return;
        }
        fsPromises.open(fileName)
        .then(function(fH){
            let from = +req.query.from || 0,
                to = +req.query.to || 0;
            if(from > to) {
                from = from ^ to;
                to = to ^ from;
                from = to ^ from;
            }
            //console.log(from, to);
            return fsPromises.stat(fileName)
            .then(function(stat){
                const size = stat.size;
                from = Math.min(from, size - 1);
                to = Math.min(to, size - 1);
                return {fH, fd: fH.fd, from, to, size, length: to - from + 1};
            });
        })
        .then(function(obj){
            const buff = Buffer.alloc(obj.length); //utf-8 by default
            fs.read(obj.fd, buff, 0, obj.length, obj.from, function(err, bytesRead, buff){
                
                if(err) {
                    throw(err);
                }
                /* console.log("bytesRead is: ", bytesRead);
                const stream = new pass;
                stream.end(buff);
                stream.pipe(res); */
                
                res
                .status(obj.size > obj.length ? 206 : 200)
                .type(fileName.match(/\.([a-z]+)$/i)?.[1] ?? "application/octet-stream")
                .set({
                    'Content-Length': `${obj.length}`,
                    'Content-Range': `bytes ${obj.from}-${obj.to}/${obj.size}`
                })
                .send(buff);
                obj.fH.close();
            })

        })
        .catch(function(err){
            res.send(err.mess);
        });
        //res.sendFile(fileName);

    })
}