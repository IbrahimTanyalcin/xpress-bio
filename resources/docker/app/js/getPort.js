
const
	{capture} = require("./capture.js"),
	{catcher, log} = require("./helpers.js");
exports.getPort = async function(info){
	let port;
	port = +(info?.serverPort ?? info?.serverConf?.port ?? NaN);
	log(
		"checking serverConf for port info.",
		isNaN(port) ? "using default port 3000" : `using port ${port}`,
	);
	return port !== port ? 3000 : port;
};