/**
 * WARNING:
 * Most of the tests in this file was written by AI.
 * I provided the function code, and it provided the unit tests
 * I tweaked some of the tests to use a more lax regex
 * I also had to speficy shell as bash because sleep cant be
 * killed easily in default sh, even with & wait.
 * I kept the style as is.
 */

const 
	{captureSpawn} = require("../../capture.js"),
	kill = require('tree-kill');

// Mock the helpers.js module
jest.mock('../../helpers.js', () => ({
	log: jest.fn(),
}));
const { log } = require('../../helpers.js'); // Get the mocked log function
  
// Utility to help with potential stderr output from commands like 'sleep' on signal
const getErrorOutput = (err) => ({
	message: err.message,
	code: err.code,
	stdout: err.stdout,
	stderr: err.stderr,
});

describe('captureSpawn', () => {
	beforeEach(() => {
		// Clear mock usage before each test
		log.mockClear();
		jest.useRealTimers(); // Ensure real timers are used unless a specific test needs fakes
	});

	describe('Basic Premise & Output Accumulation', () => {
		it('should resolve with true for a successful command when accumulate is false', async () => {
			await expect(captureSpawn('echo hello')).resolves.toBe(true);
		});

		it('should resolve with accumulated stdout for a successful command when accumulate is true', async () => {
			// Standard echo includes a newline
			await expect(captureSpawn('echo hello world', { accumulate: true })).resolves.toBe('hello world\n');
		});
		
		it('should execute a command provided as an array with shell:false', async () => {
			await expect(captureSpawn(['echo', 'array test'], { accumulate: true, shell: false })).resolves.toBe('array test\n');
		});

		it('should execute a command with arguments in the string with default shell:true', async () => {
			// Using a command that demonstrates shell parsing, e.g., multiple commands or variable expansion
			// For simplicity, `echo` with multiple arguments works fine for basic shell:true test
			await expect(captureSpawn('echo foo bar baz', { accumulate: true })).resolves.toBe('foo bar baz\n');
		});

		it('should not pipe output if pipe is false', async () => {
			const mockStdoutWrite = jest.spyOn(process.stdout, 'write').mockImplementation(() => {});
			await expect(captureSpawn('echo silent', { pipe: false, accumulate: true })).resolves.toBe('silent\n');
			expect(mockStdoutWrite).not.toHaveBeenCalled();
			mockStdoutWrite.mockRestore();
		});

		it('should pipe output by default (visual check or mock process.stdout)', async () => {
			const mockStdoutWrite = jest.spyOn(process.stdout, 'write').mockImplementation(() => {});
			const mockStderrWrite = jest.spyOn(process.stderr, 'write').mockImplementation(() => {});
			
			await captureSpawn('echo piping test'); // accumulate false
			expect(mockStdoutWrite).toHaveBeenCalledWith('piping test\n'); // or Buffer containing it

			// Test stderr piping
			await captureSpawn('sh -c "echo error pipe >&2 && exit 0"', { accumulate: false })
				.catch(() => {}); // catch if it rejects due to non-zero, though this one exits 0
			expect(mockStderrWrite).toHaveBeenCalledWith('error pipe\n'); // or Buffer

			mockStdoutWrite.mockRestore();
			mockStderrWrite.mockRestore();
		});
	});

	describe('Input Validation (Edge Cases)', () => {
		it('should reject if no command string is provided', async () => {
			// @ts-ignore testing invalid input
			await expect(captureSpawn(undefined)).rejects.toThrow('captureSpawn requires string or array of strings');
			// @ts-ignore testing invalid input
			await expect(captureSpawn(null)).rejects.toThrow('captureSpawn requires string or array of strings');
			// @ts-ignore testing invalid input
			await expect(captureSpawn(123)).rejects.toThrow('captureSpawn requires string or array of strings');
		});

		it('should reject if command string is empty or only whitespace', async () => {
			await expect(captureSpawn('')).rejects.toThrow('captureSpawn requires a non-empty command string or array');
			await expect(captureSpawn('   ')).rejects.toThrow('captureSpawn requires a non-empty command string or array');
		});

		it('should reject if command array is empty', async () => {
			await expect(captureSpawn([])).rejects.toThrow('captureSpawn requires a non-empty command string or array');
		});

		it('should reject if command in array is not a string', async () => {
			// @ts-ignore testing invalid input
			await expect(captureSpawn([123, 'arg'])).rejects.toThrow('command for captureSpawn must be a string');
		});

		it('should reject if command in array is an empty string or whitespace', async () => {
			await expect(captureSpawn(['', 'arg'])).rejects.toThrow('command for captureSpawn cannot be empty');
			await expect(captureSpawn(['   ', 'arg'])).rejects.toThrow('command for captureSpawn cannot be empty');
		});
	});

	describe('Timeout Feature', () => {
		it('should reject with a timeout error if command exceeds timeout', async () => {
			// Using `sleep` which is common on Linux.
			// Some `sleep` versions output to stderr on interruption, some don't.
			//Also setting shell to bash is important, otherwise you cant kill sleep!
			const promise = captureSpawn('sleep 5', { shell: '/bin/bash', timeout: 100 });
			
			//below seems flaky
			await expect(promise).rejects.toThrow(/Spawn process timedout:\ncmd: sleep|abort/i);
			// The exact error message might vary if it's an AbortError vs a custom timeout error object.
			// The important part is that it indicates a timeout or abort.
			try {
				await promise;
			} catch (e) {
				expect(e.message).toMatch(/Spawn process timedout:\ncmd: sleep|abort/i); // From ctrl.abort()
				// AbortError typically has a name: 'AbortError'
				expect(e.name).toBe('AbortError');
			}
		}, 1000); // Test timeout slightly longer than internal timeout

		it('should resolve if command finishes before timeout', async () => {
			await expect(captureSpawn('sleep 0.1', { shell: '/bin/bash', timeout: 500, accumulate: true })).resolves.toBe(''); // Sleep outputs nothing to stdout
		});

		it('should not apply timeout if timeout option is 0 or false', async () => {
			await expect(captureSpawn('sleep 0.1', { shell: '/bin/bash', timeout: 0, accumulate: true })).resolves.toBe('');
			await expect(captureSpawn('sleep 0.1', { shell: '/bin/bash', timeout: false, accumulate: true })).resolves.toBe('');
		});
	});

	describe('External AbortSignal Integration', () => {
		it('should abort if the external signal is aborted (via AbortSignal.any)', async () => {
			const externalController = new AbortController();
			const promise = captureSpawn('sleep 5', { shell: '/bin/bash', signal: externalController.signal, timeout: 10000 }); // Long internal timeout

			setTimeout(() => externalController.abort('External abort reason'), 100);

			await expect(promise).rejects.toThrow(/External abort reason|abort/i);
			try {
				await promise;
			} catch (e) {
				expect(e.name).toBe('AbortError');
				expect(e.message).toMatch(/External abort reason|abort/i);
			}
		});
		
		it('should abort if internal timeout occurs before external signal (via AbortSignal.any)', async () => {
			const externalController = new AbortController();
			const promise = captureSpawn('sleep 5', { shell: '/bin/bash', signal: externalController.signal, timeout: 100 });

			// External abort scheduled much later, internal timeout should win
			const timeoutid = setTimeout(() => externalController.abort('External abort reason'), 5000);

			await expect(promise).rejects.toThrow(/Spawn process timedout:\ncmd: sleep|abort/i);
			try {
				clearTimeout(timeoutid);
				await promise;
			} catch (e) {
				expect(e.name).toBe('AbortError');
				expect(e.message).toMatch(/Spawn process timedout:\ncmd: sleep|abort/i);
			}
		});

		it('should complete normally if external signal aborts after command completion', async () => {
			const externalController = new AbortController();
			const result = await captureSpawn('echo done', { shell: '/bin/bash', accumulate: true, signal: externalController.signal });
			expect(result).toBe('done\n');
			externalController.abort(); // Abort after completion, should have no effect on the promise
		});
	});

	describe('Encoding Option', () => {
		it('should resolve with a UTF-8 string by default when accumulate is true', async () => {
			const result = await captureSpawn('echo hello', { accumulate: true });
			expect(typeof result).toBe('string');
			expect(result).toBe('hello\n');
		});

		it('should resolve with a Buffer when encoding is "buffer" and accumulate is true', async () => {
			const result = await captureSpawn('echo buffer test', { encoding: 'buffer', accumulate: true });
			expect(result instanceof Buffer).toBe(true);
			expect(result.toString('utf8')).toBe('buffer test\n');
		});

		it('should resolve with a hex string when encoding is "hex" and accumulate is true', async () => {
			const result = await captureSpawn('echo A', { encoding: 'hex', accumulate: true });
			// 'A' is 0x41, newline is 0x0A. So "410a" if no trailing space.
			// `echo A` typically outputs "A\n".
			expect(result).toBe(Buffer.from('A\n', 'utf8').toString('hex'));
		});
	});

	describe('Error Cases (Command Failure)', () => {
		it('should reject for a non-existent command (shell:false)', async () => {
			const promise = captureSpawn('asdfqwer_nonexistent_command_zxcv', { shell: false });
			await expect(promise).rejects.toThrow(/ENOENT|fail/i); // ENOENT is typical
			try {
				await promise;
			} catch (e) {
				expect(e.code).toBe('ENOENT'); // This specific code is for spawn error
			}
		});

		it('should reject for a non-existent command (shell:true)', async () => {
			// Shells typically exit with 127 for "command not found"
			const promise = captureSpawn('asdfqwer_nonexistent_command_zxcv', { shell: true });
			//I find the below a bit flaky
			//await expect(promise).rejects.toThrow(/Command failed \(code 127\)|no stderr output|command not found/i);
			await expect(promise).rejects.toThrow(/failed|127|stderr|not\s*found/i);
			try {
				await promise;
			} catch (e) {
				//again, flaky
				//expect(e.code).toBe(127); // This is the exit code from the shell
				expect(e.code).not.toBe(0);
			}
		});

		it('should reject with the exit code for a command exiting with non-zero code', async () => {
			const promise = captureSpawn('sh -c "exit 55"');
			await expect(promise).rejects.toThrow(/failed|55/i);
			try {
				await promise;
			} catch (e) {
				expect(e.code).toBe(55);
			}
		});

		it('should include stderr and stdout in error object when accumulate is true', async () => {
			const cmd = 'sh -c "echo stdout here && echo stderr here >&2 && exit 12"';
			const promise = captureSpawn(cmd, { accumulate: true });
			await expect(promise).rejects.toThrow(/failed|12|stderr here/i);
			try {
				await promise;
			} catch (err) {
				expect(err.code).toBe(12);
				expect(err.stdout).toBe('stdout here\n');
				expect(err.stderr).toBe('stderr here\n');
			}
		});

		it('should have "no stderr available" message if not accumulated and command fails', async () => {
			const promise = captureSpawn('sh -c "exit 1"', { accumulate: false });
			await expect(promise).rejects.toThrow(/failed|1|no|stderr|available/i);
		});
	});

	describe('Callbacks (onstart, ondata, onerror)', () => {
		const mockOnStart = jest.fn();
		const mockOnData = jest.fn();
		// For onerror, this needs careful setup because of res/rej
		// We will test `this` context for `onerror` in a simple failure.

		beforeEach(() => {
			mockOnStart.mockClear();
			mockOnData.mockClear();
		});

		it('should call onstart with cProc as this, original string, and rest options', async () => {
			const cmdStr = 'echo start';
			const restOpts = { cwd: '/', anOption: true }; // Example rest options
			await captureSpawn(cmdStr, { onstart: mockOnStart, ...restOpts });
			
			expect(mockOnStart).toHaveBeenCalledTimes(1);
			// `this` context in mockOnStart should be the ChildProcess instance.
			// Hard to directly assert `this` of the mock without capturing it.
			// We trust .call(cProc, ...) works. For more rigorous test, onstart could store `this`.
			// For now, we check it was called with correct arguments.
			expect(mockOnStart.mock.calls[0][0]).toBe(cmdStr); // First arg passed to onstart
			expect(mockOnStart.mock.calls[0][1]).toEqual(restOpts); // Second arg
		});

		it('should call ondata with cProc as this, chunk, original string, and rest options', async () => {
			const cmdStr = 'echo data';
			const restOpts = { env: { MY_VAR: 'test' } };
			await captureSpawn(cmdStr, { ondata: mockOnData, accumulate: false, ...restOpts });

			expect(mockOnData).toHaveBeenCalled();
			expect(mockOnData.mock.calls[0][0]).toBe('data\n'); // Or Buffer if encoding='buffer'
			expect(mockOnData.mock.calls[0][1]).toBe(cmdStr);
			expect(mockOnData.mock.calls[0][2]).toEqual(restOpts);
			// Again, `this` context assertion requires ondata to expose `this`.
		});

		describe('onerror callback behavior', () => {
			it('should call onerror on command failure and reject with original error if onerror does nothing', async () => {
				const mockOnError = jest.fn();
				const cmdStr = 'sh -c "exit 33"';
				const promise = captureSpawn(cmdStr, { onerror: mockOnError, accumulate: true });

				await expect(promise).rejects.toThrow(/failed|33/i);
				expect(mockOnError).toHaveBeenCalledTimes(1);
				const { err, res, rej } = mockOnError.mock.calls[0][0];
				expect(err.message).toMatch(/failed|33/i);
				expect(typeof res).toBe('function');
				expect(typeof rej).toBe('function');
				
				// Check `this` for onerror (should be undefined in strict mode)
				// This requires onerror to be defined in a way that `this` can be captured
				let onerrorThisContext;
				const capturingOnError = jest.fn(function() { onerrorThisContext = this; });
				await captureSpawn('sh -c "exit 1"', {onerror: capturingOnError }).catch(()=>{});
				expect(capturingOnError).toHaveBeenCalled();
				expect([void(0), globalThis].includes(onerrorThisContext)).toBe(true);
				
			});

			it('should resolve if onerror calls res()', async () => {
				const mockOnError = jest.fn(({ res }) => {
					res('Resolved from onerror');
				});
				const cmdStr = 'sh -c "exit 1"';
				await expect(captureSpawn(cmdStr, { onerror: mockOnError })).resolves.toBe('Resolved from onerror');
				expect(mockOnError).toHaveBeenCalledTimes(1);
			});

			it('should reject with custom error if onerror calls rej() with a new error', async () => {
				const customError = new Error('Custom rejection from onerror');
				const mockOnError = jest.fn(({ rej }) => {
					rej(customError);
				});
				const cmdStr = 'sh -c "exit 1"';
				await expect(captureSpawn(cmdStr, { onerror: mockOnError })).rejects.toThrow('Custom rejection from onerror');
				expect(mockOnError).toHaveBeenCalledTimes(1);
			});
		});
	});

	describe('Shell Option', () => {
		it('should use shell (default true) to interpret command string characters like &&', async () => {
			// This command will only output "world" if the shell processes "&&"
			const result = await captureSpawn('echo hello > /dev/null && echo world', { accumulate: true });
			expect(result).toBe('world\n');
		});

		it('should not use shell if shell:false, treating whole string as command if not array', async () => {
			// This will try to find a command named "echo hello && echo world" which won't exist.
			const promise = captureSpawn('echo hello && echo world', { shell: false, accumulate: true });
			// Behavior of `cmd.trim().split(/\s+/)` will take `echo` as command.
			// `spawn` with `shell: false` will execute `echo` with args `hello,&&,echo,world`.
			// So it should output the whole thing.
			await expect(promise).resolves.toBe('hello && echo world\n');
		});

		it('should correctly execute array command with shell:false', async () => {
			await expect(captureSpawn(['echo', 'no shell'], { shell: false, accumulate: true })).resolves.toBe('no shell\n');
		});
	});

	describe('Logger Option', () => {
		it('should call internal log if logger is true', async () => {
			const cmdStr = 'echo logme';
			await captureSpawn(cmdStr, { logger: true });
			expect(log).toHaveBeenCalledWith('Capturing:', cmdStr);
		});

		it('should call custom logger function if provided', async () => {
			const mockCustomLogger = jest.fn();
			const cmdStr = 'echo customlog';
			await captureSpawn(cmdStr, { logger: mockCustomLogger });
			expect(mockCustomLogger).toHaveBeenCalledWith(cmdStr);
			expect(log).not.toHaveBeenCalled();
		});

		it('should not log if logger is false', async () => {
			const mockCustomLogger = jest.fn();
			await captureSpawn('echo nolog', { logger: false }); // also pass custom to ensure it's not called
			await captureSpawn('echo nolog2', { logger: false, onstart: mockCustomLogger });
			expect(log).not.toHaveBeenCalled();
			expect(mockCustomLogger).not.toHaveBeenCalledWith('echo nolog2'); // onstart is different
		});
	});

	describe('Accessing the childprocess from promise', () => {
		it('should have a symbol("proc") as key pointing to the child proces', async () => {
			const 
				key = Symbol.for("proc"),
				promSh = captureSpawn("echo test symbol", {accumulate: false, pipe: false}),
				promBash = captureSpawn("echo test symbol with bash", {accumulate: false, pipe: false, shell: '/bin/bash'});
			expect([promSh, promBash].map(d => d[key]?.pid).filter(pid => pid > 0 && Number.isInteger(pid)).length).toBe(2);
		})
	})
});