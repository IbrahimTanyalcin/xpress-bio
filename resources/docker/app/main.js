const { render } = require("./js/server/express.js");

!async function(){
	const 
		ARGV = process.argv.slice(2),
		{execute} = require("./js/execute.js"),
		{osExecute} = require("./js/osExecute.js"),
		{select, signalReceiver, catcher, log, once} = require("./js/helpers.js"),
		{getInfo} = require("./js/getInfo.js"),
		info = await getInfo(process.env, ARGV),
		registerWorker = require("./js/registerWorker.js")(info),
		terminateWorkers = require("./js/terminateWorkers.js");
	
	/* select(process)
	.on("exit", (code) => {
		console.log(`Exiting with code: ${code}`);
	})
	.on("SIGINT", signalReceiver)
	.on("SIGTERM", signalReceiver)
	.on("worker", registerWorker); */

	[`exit`, `SIGQUIT`, `SIGINT`, `SIGUSR1`, `SIGUSR2`, `uncaughtException`, `SIGTERM`].forEach(function(evt){
		process.on(evt, this);
	}, once(
		function(code_signal_error){
			terminateWorkers(info.workers);
			if(isNaN(+code_signal_error)) {
				if (code_signal_error instanceof Error) {
					console.log(`Exiting with error: ${code_signal_error}`);
				} else {
					console.log(`Exiting with signal: ${code_signal_error}`);
				}
				process.exit(1);
			} else {
				console.log(`Exiting with code: ${code_signal_error}`);
			}
		}
	));
	process.on("worker", registerWorker);
	
	if(info instanceof Error){
		console.log("Unable to parse parameters.");
		catcher(info);
	}

	// console.log("Keeping the container up...");
	// osExecute("/bin/bash -c tail -f /dev/null",{exclude:"^win"})
	//  .catch(catcher);
	
	log(
		"Here are your parameters:",
		JSON.stringify(info,null,"\t")
	);
	
	const 
		getNodeBinaries = require("./js/getNodeBinaries"),
		getDockerBinaries = require("./js/getDockerBinaries"),
		{getFiles} = require("./js/getFiles.js");
	
	getFiles(info.nodeBinaries, {depth:1})
	.then(files => getNodeBinaries(...files))
	.then(nodeBinaries => {
		return getFiles(info.dockerBinaries, {depth:1})
		.then(files => {
			return getDockerBinaries(...files)
			.then(dockerBinaries => {
				return {...dockerBinaries, ...nodeBinaries};
			});
		});
	}).then(binaries => {
		try {
			
			log(
				"Binaries are", 
				JSON.stringify(binaries,null,"\t")
			);
			
			if(info.nodaemon){
				const {render} = require("./js/server/express.js");
				return render(info); //returns {routeFiles, files, host, port}
			} else {
				const daemon = require("./js/daemon.js");
				daemon()
				.then(({rafx, thenable}) => 
					rafx.async()
					.skipFrames(300)
					.then(()=> {
						//console.log("5 seconds elapsed, aborting..");
						//thenable.break();
					})
				)
				.catch(catcher);
			}
		} catch (err) {
			catcher(err);
		}
	})
	.catch(catcher);
}();
