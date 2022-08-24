module.exports = function(express, app, info, files){
    app.get('/', function (req, res) {
        res.sendFile(files[info.serverConf.index]);
    });
}