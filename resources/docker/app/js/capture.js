
/*
	captures output of a command
*/
const 
	{exec, spawn} = require('child_process'),
	{log} = require('./helpers.js'),
	capture = function (str, {logger = true, pipe = true} = {}){
		switch (((typeof logger === "function") << 1) + !!logger) {
			case 3:
			case 2:
				logger(str);
				break;
			case 1:
				log("Capturing:",str)
				break;
			default:
		}
		return new Promise((res, rej) => {
			//default shell is '/bin/sh'
			const childProcess = exec(str, (err, stdout, stderr) => {
				if (err) {
					rej(`error: ${err.message}`);
					return;
				}
				if (stderr && err?.code) {
					rej(`error: stderr: ${stderr}; error: ${err.message}`);
					return;
				}
				if (err === null){
					res(stdout)
					return;
				}
				rej(new Error("unknown reason for rejection"));
			});
			pipe && childProcess.stdout.pipe(process.stdout);
		});
	};

exports.capture = capture;