
/*
	captures output of a command
*/
const 
	{exec, spawn} = require('child_process'),
	{log} = require('./helpers.js'),
	cProcKey = Symbol.for("proc"),
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

/**
 * another implementation of capture but with spawn so that output, 
 * does not have to be buffered in memory which is limited to around 1MB.
 * @param {string|string[]} str The command as a string (e.g., 'ls -lh /tmp'),
 *  or as an array where the first element is the command and subsequent elements are its arguments 
 *  (e.g., ['ls', '-lh', '/tmp']). The array form is recommended if arguments contain spaces and options.shell is false.
 * @param {object=} options an options object
 * @param {boolean|function=} [options.logger] logger function, if truthy, defaults to inbuilt log
 * @param {boolean=} [options.pipe] write to parent process's stdout on each data event. Defaults to true.
 * @param {function=} [options.ondata] If given, called with this pointing to child process, current chunk,
 *  original command string/iterable and rest params that are not consumed.
 * @param {function=} [options.onstart] If given, called with this pointing to child process,
 *  original command string/iterable and rest params.
 * @param {function=} [options.onerror] If given and child fails to start or exists with non zero,
 *  called with this pointing to global object or undefined if strict, and an object with props err, res, rej.
 * @param {boolean=} [options.shell] sets the shell option of spawn. Defaults to true.
 * @param {string=} [options.encoding] sets the encoding of the stdout/stderr streams. Defaults to utf8.
 *  If encoding is 'buffer', stdout/stderr becomes a buffer.
 * @param {boolean=} [options.accumulate] if truthy, fills internal stdout/stderr variables on each ondata event.
 *  The final promise resolves with the entire stdout instead of just true or rejects with an error having
 *  2 props set to entire stderr and stdout. If true and encoding is buffer, resolved stdout will be a buffer.
 * @param {number=} [options.timeout] timeout in milliseconds. Defaults to false. If positive and non-zero,
 * call abort on AbortSignal passed to spawn.
 * @returns {Promise<boolean|string|Buffer>} resolves or rejects with a Promise based on exit code.
 */
const captureSpawn = function (
	str,
	{
		logger = true,
		pipe = true,
		ondata = false,
		onstart = false,
		onerror = undefined,
		shell = true,
		encoding = 'utf8',     // can be 'buffer' or any valid string encoding
		accumulate = false,    // whether to buffer stdout/stderr
		timeout = false,
		...rest
	} = {}
) {
	
	let isArray, isString;
	if (!(
			(isArray = str instanceof Array)
			|| (isString = str instanceof String)
			|| (isString = typeof str === "string")
	)){
		return Promise.reject(new Error('captureSpawn requires string or array of strings'));
	}
	isString && (str = str.trim());
	if (!str || !str.length) {return Promise.reject(new Error('captureSpawn requires a non-empty command string or array'))}
	
	/* TODO, 
		implement a state machine to parse quoted arguments instead of str.split(/\s+/
		this way args like 'args with spaces' wont be broken
	*/
	const [rawCmd, ...args] = isArray ? str : shell ? [str] : str.split(/\s+/);
	if (typeof rawCmd !== "string") {return Promise.reject(new Error('command for captureSpawn must be a string'))}
	const cmd = rawCmd.trim();
	if (!cmd){return Promise.reject(new Error('command for captureSpawn cannot be empty'))}

	switch (((typeof logger === 'function') << 1) + !!logger) {
		case 3:
		case 2:
			logger(str);
			break;
		case 1:
			log('Capturing:', str);
			break;
		default:
	}
	let _cProc;
	const prom = new Promise((res, rej) => {
		let timeoutId = void(0);
		if (+timeout > 0) {
			const ctrl = new AbortController();
			if (rest.signal){
				rest.signal = AbortSignal.any([ctrl.signal, rest.signal]);
			} else {
				rest.signal = ctrl.signal;
			}
			timeoutId = setTimeout(() => ctrl.abort(`Spawn process timedout:\ncmd: ${cmd}`), timeout);
		}

		const cProc = _cProc = spawn(cmd, args, {
			shell,
			stdio: ['ignore', 'pipe', 'pipe'],
			...rest,
		});

		const isBinary = encoding === 'buffer';

		if (!isBinary) {
			cProc.stdout.setEncoding(encoding);
			cProc.stderr.setEncoding(encoding);
		}

		let stdout = accumulate ? (isBinary ? Buffer.alloc(0) : '') : null;
		let stderr = accumulate ? (isBinary ? Buffer.alloc(0) : '') : null;

		if (onstart) {
			onstart.call(cProc, str, rest);
		}

		cProc.stdout.on('data', function (chunk) {
			if (ondata) {
				ondata.call(cProc, chunk, str, rest);
			}
			if (pipe) {
				process.stdout.write(chunk);
			}
			if (accumulate) {
				stdout = isBinary
					? Buffer.concat([stdout, chunk])
					: stdout + chunk;
			}
		});

		cProc.stderr.on('data', function (chunk) {
			if (pipe) {
				process.stderr.write(chunk);
			}
			if (accumulate) {
				stderr = isBinary
					? Buffer.concat([stderr, chunk])
					: stderr + chunk;
			}
		});

		cProc.on('close', (code) => {
			if (code === 0) {
				res(accumulate ? stdout : true);
			} else {
				const message = accumulate
					? (isBinary
						? stderr.toString('utf8').trim()
						: stderr.trim())
					: 'no stderr available';

				const err = new Error(`Command failed (code ${code}): ${message || 'no stderr output'}`);
				err.code = code;
				if (accumulate) {
					err.stdout = stdout;
					err.stderr = stderr;
				}
				onerror?.({ err, res, rej });
				rej(err);
			}
			clearTimeout(timeoutId);
		});

		cProc.on('error', (err) => {
			onerror?.({ err, res, rej });
			rej(err);
			clearTimeout(timeoutId);
		});
	});
	prom[cProcKey] = _cProc;
	return prom;
};

exports.capture = capture;
exports.captureSpawn = captureSpawn;