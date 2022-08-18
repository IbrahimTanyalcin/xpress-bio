const path = require('path'),
    serverConf = require("../server.config.json");

module.exports = function(app, files, express){
    
    const _static = express.static(serverConf.static, {
        dotfiles: 'ignore',
        extensions: ['htm', 'html'],
        index: false,
        maxAge: '1d',
        redirect: false,
        fallthrough: false,
        setHeaders: function (res, _path, stat) {
          //Below does not prevent application octet stream from being downloaded
          /* if(path.extname(_path).toLowerCase() === ".bam") {
            res.set('Content-Disposition', `inline; filename=${path.basename(_path)}`)    
          } */
          res.set('x-timestamp', Date.now())
        }
    });

    app.use('/static', _static, function(err, req, res, next){
        if(err) {
            res.status(404).end("Requested File Does Not Exist");
        }
    });
}