module.exports = function({express, app, info, files, serverSent}){
    app.get('/', function (req, res, next) {
        //res.set("Access-Control-Allow-Origin","*");
        req.session.views = req.session.views || 0;
        //maxAge changes with every response
        //res.send({views: ++req.session.views, maxAge: req.session.cookie.maxAge, sessid: req.session.id});
        res.sendFile(files[info.serverConf.index]);
    });
}