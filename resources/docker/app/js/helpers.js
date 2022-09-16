//Seems like modules are cached by default
//https://nodejs.org/dist/latest-v16.x/docs/api/modules.html#caching
//so no need to return early if obj is found in require.main
//https://nodejs.org/dist/latest-v16.x/docs/api/modules.html#the-module-wrapper
Object.defineProperties(
	exports,
	{
		select: {
			enumerable: true,
			configurable: true,
			writable: true,
			value: function(process){
				return {
					on: function(evt, handler){
						process.on(evt, handler);
						return this;
					}
				}
			}
		},
		signalReceiver: {
			enumerable: true,
			configurable: true,
			writable: true,
			value:(signal) => {
				console.log(`Received ${signal}`);
				if (signal === "SIGINT") {
					process.exit(1);
				}
			}
		},
		catcher: {
			enumerable: true,
			configurable: true,
			writable: true,
			value: err => {
				console.log("Execution failed.");
				console.log(err); // do not just log the message, stringified err has row/col values
				//process.exitCode = 1; - this will not terminate gracefully coz of bash's tail anyway
				process.exit(1);
			}
		},
		log: {
			enumerable: true,
			configurable: true,
			writable: true,
			value: (...args) => {
				args.unshift("\u02C5".repeat(80)); //down caret
				args.push("\u02C4".repeat(80)); //up caret
				console.log("\n");
				args.forEach(d => d
					.toString()
					.split(/\n|\r\n/gi)
					.forEach(dd => console.log("> " + dd))
				);
				console.log("\n");
			}
		},
		atob: {
			enumerable: true,
			configurable: true,
			writable: true,
			value:(base64) => {
				return Buffer.from(base64, "base64").toString();
			}
		},
		serverSend: {
			enumerable: true,
			configurable: true,
			writable: true,
			value: ({directive = "data", payload, stringify = [null, "\t"]}) => {
				switch (
						((payload instanceof Object) << 1) 
						+ ((directive === "data") << 0)
				) {
					case 3:
						return JSON.stringify(payload, ...stringify)
							.trimEnd().split("\n").map(d => "data: " + d).join("\n") + "\n\n";
					case 2:
						return directive + ": " + JSON.stringify(payload, ...stringify)
							.trimEnd().replace(/\s+/g," ") + "\n";
					case 1:
						return String(payload)
							.trimEnd().split("\n").map(d => "data: " + d).join("\n") + "\n\n";
					case 0: 
						return directive + ": " + String(payload).trimEnd().replace(/\s+/g," ") + "\n";
					default:
						throw new Error("There was a problem with parsing the payload");
				}
			}
		},
		sanitizeFilename: {
			enumerable: true,
			configurable: true,
			writable: true,
			value: (() => {
				const illegalChars = /[\x00-\x1f\\/<>:"`|?*%]/gi;
				return fileName => fileName.replace(illegalChars,"");
			})()
		}
	}
);
