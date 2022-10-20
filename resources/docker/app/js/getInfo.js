
const 
	{findDir} = require("./findDir.js"),
	path = require("path"),
	{getArgs} = require("./getArgs.js"),
	{capture} = require("./capture.js"),
	{atob} = require("./helpers.js");
exports.getInfo = async function(ENV, ARGS){
	let cache = require?.main?._ipvCache?.getInfo;
	if(cache){
		return cache;
	}
	let result;
	try {
		ARGS = getArgs(ARGS);
		const 
			inputFileName = ARGS.input || "config.json",
			mountPath = ARGS.mount || ENV.MOUNT_PATH || "/app/mount",
			rootFolder = await findDir(__dirname, "/node_modules", {depth: 5}).catch(err => err);
		if (rootFolder instanceof Error){
			throw new Error("Unable to locate /node_modules folder.");
		}
		result = {
			version: ENV.npm_package_version,
			environment: ENV.NODE_ENV,
			rootFolder: rootFolder, //do not think it has ../ in it, it does not
			nodeBinaries: path.resolve(rootFolder, "node_modules/.bin/"),
			dockerBinaries: path.resolve(rootFolder, "bin"),
			ipvPath: path.resolve(rootFolder, "node_modules/ibowankenobi-i-pv/i-pv/script/", "SNPtoAA.pl"),
			nodaemon: ARGS.nodaemon,
			input: path.resolve(mountPath, inputFileName),
			isContainer: await capture('grep -isqE -m 1 \'docker|lxc\' /proc/1/cgroup && echo -n 1 || echo -n 0').catch((err) => '-1'),
			/* flags 
				i = case-insensitive
				s = silent, no messages for inexistent files
				q = quiet, exit with 0 if match is found despite errors
				E = extended regex
			why 'docker|lxc' ?
				https://stackoverflow.com/questions/20010199/how-to-determine-if-a-process-runs-inside-lxc-docker*/
			serverConf: ARGS.conf ? JSON.parse(atob(ARGS.conf)) : require("./server/server.config.json"),
			serverPort: ARGS.port,
			PID: process.pid,
			PPID: process.ppid,
			workers: new Set()
		};
		require.main._ipvCache = {getInfo: result};
	} catch (err) {
		result = err;
	} finally {
		return result;
	}
};