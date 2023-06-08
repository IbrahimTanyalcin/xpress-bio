module.exports = function({express, app, info, files, serverSent}){
    app.get(/rna-?canvas/i, function (req, res, next) {
        //res.set("Access-Control-Allow-Origin","*");
        req.session.rnaCanvasViews = req.session.rnaCanvasViews || 0;
        //maxAge changes with every response
        //res.send({views: ++req.session.rnaCanvasViews, maxAge: req.session.cookie.maxAge, sessid: req.session.id});
        res.sendFile(files["rna-canvas.html"]);
    });
}