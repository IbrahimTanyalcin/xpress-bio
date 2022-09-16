const
    express = require('express'),
    app = express(),
    path = require('path'),
    {getFiles} = require("../getFiles.js"),
    {findDir} = require("../findDir.js"),
    {log, catcher} = require("../helpers.js"),
    {getPort} = require("../getPort.js"),
    {execute} = require("../execute.js");

async function render (info) {
    //__dirname is local to the module, in this case: app/js/server
    const files = await getFiles(path.join(info.rootFolder, info.serverConf.public), {depth: 4, relativeTo: __dirname})
        .then(files => {
            files = Object.assign(
                {},
                ...files.map(d => {return {[path.basename(d)] : path.resolve(__dirname, d)} })
            );
            return files;
        });

    log(
        "Requestable files:",
        JSON.stringify(files,null,"\t")
    );

    
    await require("./utils/loadSession.js")({express, app, info, files});
    const serverSent = await require("./utils/loadServerSent.js")({express, app, info, files});
    const memcache = await require("./utils/loadMemcachedRoutes.js")({express, app, info, files, serverSent});
    await require("./utils/loadCSRFClientSideRoutes.js")({express, app, info, files, serverSent, memcache});
    const routeFiles = await require("./utils/loadUserRoutes.js")({express, app, info, files, serverSent, memcache});
    
    const host = +info.isContainer <= 0 ? "127.0.0.1" : "0.0.0.0";
    const port = await getPort(info);  
    
    app.listen(port,host);
    log("listening on host:", `${host}:${port}`);
    
    /* setTimeout(function(){
        log('EXITING!');
        execute("pkill -fc nodemon")
        .then(res => process.exit(0))
        .catch(err => console.log("child process likely could not terminate parent (nodemon):", err)); 
        process.exit(0);
    }, 3000);  */   

    return {routeFiles, files, host, port};

        
}

exports.render = render;