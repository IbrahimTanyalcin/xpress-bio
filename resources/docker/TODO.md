# TODO
- 2022 Dec
  - UI Framework integrations
  - Examples of 'Hello World' Apps
  - Convert `files` into a `proxy` where a file with `path/to/file.ext` would be stored as `"path/to/file.ext"` instead of `"file.ext"` inside an array and given the string `o/file.ext`, the proxy would return the best matching one.

- 2023 July
  - Add an additional icon on hexgrid to show the user that download request has initiated connection. Replace the embedded icons once the download starts or fails.
  - update `docker-web-app.sh` to transfer additional user assets into the container.

- 2023 Oct
  - Create a script to replace version strings automatically across the project. Modus operandi should be:
    - Accept JSON with keys as absolute path to files and an object with keys `regxp` and `replace` as values
    - Read N amount of bytes (500 * 1024) from file, by passing `Buffer.alloc(N)` and `fileHandle` to `fs.read`
    - Convert current buffer to `utf8` string, replace accordingly using `regxp` and replace string that supports matched groups (`$1` etc)
    - Write contents of the buffer to another file with random generated hexstring name
    - Repeat until `EOF` is reached, then if `dryRun` option is false, delete the old file, and rename the new file to old file.
    - This method should be able to scale larger files since it does not depend of `readFile` from File System.
  - Isolate `updateBam` and `updateFa` events from `worder-dl.js` so they can be used from other worker initiator routes. Follow the example of `updateAnnot`, which is already factorized.
  - ~~Once newer version of `ch` package is imported, update the `until` helper to enable pausing an `untillable`. Use this mechanism inside `worker-fasta-bam-index.js` to use an `async generator` to poll every 3 seconds to observe an arbitrary event stack and if the length of stack is not empty, then broadcast `updateBam` or `updateFa` events.~~ Follow the throttling model similar to `updateAnnot` instead. Looks easier to implement and more resilient to edge cases.

- 2024 Apr
  - For tests, replace the `copyBam` or other similar constructs that use `fsPromises.copyFile` under the hood to either `rename` or make a system call to `mv` via `await capture(...)` to ensure copy operations are atomic. Although never stumbled on a test fail before, one time one of the github workflows failed on 1st test of `serverFastaBamIndex`. Checking [here](https://nodejs.org/docs/latest-v20.x/api/fs.html#fspromisescopyfilesrc-dest-mode), `Node` does not guarantee atomicity of this operation, which is acceptable.
  - Modify `getInfo.js`, convert `isContainer` to a `iife` and check `process.env.SINGULARITY_CONTAINER`, if `1`, return early with `1`, otherwise proceed with `await capture(...)`. Refactoring `isContainer` into a separate exportable function under `app/js` is not necessary since it only needs to be run once and the result will be consumed from `info` object returned by `getInfo.js` which is passed to every route.