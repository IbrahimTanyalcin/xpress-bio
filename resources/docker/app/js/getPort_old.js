
const
	{capture} = require("./capture.js"),
	{catcher, log} = require("./helpers.js");
exports.getPort = async function(info){
	let port,
		PID = process.pid;
	log("PID: ", PID);
	if (+info.isContainer <= 0) {
		port = +(info?.serverConf?.port ?? NaN);
		log(
			"checking serverConf for port info.",
			isNaN(port) ? "using default port 3000" : `using port ${port}`,
		);
		return port !== port ? 3000 : port;
	} 
	port = +(
				(
					/* tail is not consistent, there might be more than one TCP listeners
					await capture('ss -tulwn | tail -n 1 | sed -r \'s/\s+/ /g\' | cut -d" " -f5 | cut -d":" -f2') */
					await capture('ss -tulwnp | grep -iE \'pid\s*=\s*' + PID + '*\' | sed -r \'s/\s+/ /g\' | cut -d" " -f5 | cut -d":" -f2')
					.catch(catcher)
				) 
				?? 
				NaN
	);
	if(isNaN(port)){
		catcher(
			new Error(
				[
					"Container mode was detected.",
					"However, either no listening sockets were detected",
					"or 'ss' command was parsed incorrectly."
				].join("\n")
			)
		);
	}
	log("PORT is :", port);
	return port;
};