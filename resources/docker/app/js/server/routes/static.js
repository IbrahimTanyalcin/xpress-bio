const path = require('path');

module.exports = function(express, app, info, files){
    
    const _static = express.static(info.serverConf.static, {
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