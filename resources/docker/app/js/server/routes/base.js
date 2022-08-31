module.exports = function(express, app, info, files){
    app.get('/', function (req, res) {
        //res.set("Access-Control-Allow-Origin","*");
        req.session.views = req.session.views || 0;
        res.send({views: ++req.session.views, maxAge: req.session.cookie.maxAge});
        //res.sendFile(files[info.serverConf.index]);
    });
}