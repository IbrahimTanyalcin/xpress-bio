const path = require('path'),
      compression = require("compression"),
      {sanitizeFilename} = require("../../helpers.js");

module.exports = function({express, app, info, files, serverSent}){
    
    const _static = express.static(info.serverConf.static, {
        dotfiles: 'ignore',
        extensions: ['htm', 'html'],
        index: false,
        maxAge: '1d',
        redirect: false,
        fallthrough: true,
        setHeaders: function (res, _path, stat) {
          //Below does not prevent application octet stream from being downloaded
          /* if(path.extname(_path).toLowerCase() === ".bam") {
            res.set('Content-Disposition', `inline; filename=${path.basename(_path)}`)    
          } */
          res.set('x-timestamp', Date.now())
        }
    }),
          extArr = [".bai", ".bam", ".fa", ".fasta", ".fai"];

    /* app.use('/static', _static, function(err, req, res, next){
        if(err) {
            res.status(404).end("Requested File Does Not Exist");
        }
    }); */

    app.use('/static', compression(), _static, function(req, res, next) {
      const fileName = sanitizeFilename(decodeURI(req.path.split("/").filter(d => d).slice(-1)[0])),
            extension = path.extname(fileName).slice(1);
      switch (fileName && extension) {
        case "bam":
        case "bai":
        case "fa":
        case "fai":
          res.sendFile(path.resolve(info.rootFolder, info.serverConf.static, `${extension}/${fileName}`));
          break;
        case "fasta":
          res.sendFile(path.resolve(info.rootFolder, info.serverConf.static, `fa/${fileName}`));
          break;
        default:
          next("discard anything else");
      }
    }, function(err, req, res, next){
      if(err?.code === "ENOENT") {
        let fileName = path.basename(err?.path || err?.dest),
            extName = path.extname(fileName);
        if (~extArr.indexOf(extName)) {
          serverSent
          .msg("streamOne", req.session.id, {directive: "event", payload: "file-not-found"})
          .msg("streamOne", req.session.id, {payload: `${fileName} was not found.
            Make sure you uploaded it to the server.`
          });
        }
      }
      res.status(404).end("Requested File Does Not Exist");
      /* if(err) {
        res.status(404).end("Requested File Does Not Exist");
      } */
    });
}