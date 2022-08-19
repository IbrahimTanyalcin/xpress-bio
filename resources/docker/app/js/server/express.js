const
    express = require('express'),
    app = express(),
    path = require('path'),
    {getFiles} = require("../getFiles.js"),
    {log, catcher} = require("../helpers.js"),
    {getPort} = require("../getPort.js"),
    {execute} = require("../execute.js"),
    serverConf = require("./server.config.json");

async function render (info) {
    return getFiles(path.join(info.rootFolder, serverConf.public), {depth: 4, relativeTo: __dirname})
    .then(files => {
        files = Object.assign(
            {},
            ...files.map(d => {return {[path.basename(d)] : path.resolve(__dirname, d)} })
        );
        
        log(
            "Requestable files:",
            JSON.stringify(files,null,"\t")
        );
        
        //add memcache handlers
        require("./routes/base")(app, files);
        require("./routes/ranges")(app, files);
        require("./routes/static")(app, files, express);
        
        const host = +info.isContainer <= 0
            ? "127.0.0.1"
            : "0.0.0.0";
        getPort(info)
        .then(port => {
            app.listen(
                port,
                host
            );
            log("listening on host:", `${host}:${port}`);
        }).catch(catcher);


        /* setTimeout(function(){
            log('EXITING!');
            execute("pkill -fc nodemon")
            .then(res => process.exit(0))
            .catch(err => console.log("child process likely could not terminate parent (nodemon):", err)); 
            process.exit(0);
        }, 3000);  */
    });   
}

exports.render = render;