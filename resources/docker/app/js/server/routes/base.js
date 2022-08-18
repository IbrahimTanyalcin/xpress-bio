const serverConf = require("../server.config.json");

module.exports = function(app, files){
    app.get('/', function (req, res) {
        res.sendFile(files[serverConf.index]);
    });
}