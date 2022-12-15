const fs = require('fs/promises'),
      {atob, log} = require("./helpers.js");

exports.slurpAnonPipeBase64toJSON = (pipe) => (async () => {
        const fH = await fs.open(pipe),
              stat = await fH.stat();
        if (!stat.isFIFO()){
                throw new Error("Argument is expected to be a pipe");
        }
        const buff = await fs.readFile(fH);
        //fH is a pipe, so probably EOF is not reached
        fH.close(); 
        return JSON.parse(atob(buff.toString()));
})().catch(err => {
        log(
            "There was an error while reading from anonymous pipe (base64)",
            err
        );
        return err;
});