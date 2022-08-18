
/*
	captures output of a command
*/
const 
	{exec, spawn} = require('child_process'),
	{log} = require('./helpers.js'),
	capture = function (str){
		log("Capturing:",str);
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
			childProcess.stdout.pipe(process.stdout);
		});
	};

exports.capture = capture;