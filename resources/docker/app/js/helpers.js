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
		}
	}
);
