
/*
	captures output of a command
*/
const 
	{exec, spawn} = require('child_process'),
	{log} = require('./helpers.js'),
	capture = function (
		str, 
		{
			logger = true, 
			pipe = true, 
			ondata = false, 
			onstart = false, 
			onerror = void(0),
			...rest
		} = {}
	){
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
			const childProcess = exec(str, rest, (err, stdout, stderr) => {
				//Looks like callback is not passed a this value
				///blob/v16.20.1/lib/child_process.js#L282-L410C30
				if (err) {
					onerror?.({err, res, rej});
					rej(`error: ${err.message}`);
					return;
				}
				if (stderr && err?.code) {
					onerror?.({err, stderr, res, rej});
					rej(`error: stderr: ${stderr}; error: ${err.message}`);
					return;
				}
				if (err === null){
					res(stdout)
					return;
				}
				rej(new Error("unknown reason for rejection"));
			});
			if (onstart) {
				onstart.call(childProcess, str, rest);
			}
			if (ondata) {
				childProcess.stdout.on("data", function(chunk){
					ondata.call(this, chunk, str, rest);
				});
			}
			pipe && childProcess.stdout.pipe(process.stdout);
		});
	};

exports.capture = capture;