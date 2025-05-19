# CHANGELOG
- ## v0.0.7
  - added `onerror` cb for `capture.js`
  - fixed the URI download to correctly capture headers from `HTTP/2` protocol
  - added a new `worker-connection-timedout` event for the clients
  - added ability to download fasta files with `.fas` extension
  - now supports parsing filename from `content-disposition` where filename is not provided with double quotes
  - added a `safeResource` to test downloads: `https://gist.github.com/IbrahimTanyalcin/ecf5f91d86a07e31a038283148b4a52e/archive/35deaee01bcfd2c58c24df709f6d6b2a0edc0247.tar.gz`
  - added a test for download behavior
  - moved reusable subroutines for tests under `test/fixtures`
- ## v0.1.0
  ### changes 
  - integrates `samtools` (v1.18, including `bcftools` and `htslib`)
  - added the automatic and parallel indexing of bam and fasta files via `samtools`:
    - Max stack size: 1000
    - Max concurrent indexing items: 5
  - added example fasta and bam files inside `app/server/test/fixtures`
  - added the ability to call functions from bash scripts inside `app/bin`
  - added extra tests for new functions under `app/js` and auto indexing feature
  - extended pipeline to be built with `samtools`
  - added the ability to specify N number of custom json configs next to `app/js/server/server.config.json`. These are not committed to the repo, sorted alphabetically and then merged recursively with the base configuration.
  ### fixes 
  - Changed the order of `-` in the regex `[+-?]` where it would be mistaken as a range operator in older versions of `sed`
- ## v0.1.1
  ### changes
  - Extended indexing to `gff`/`bgz` files to create `.tbi/.csi` index files
  - Extended download worker to place `gff`/`bgz`/`tbi`/`csi` files to their respective folder
  - Converted IGV applets into web components with a dedicated toolbar
  - Enabled reordering/creating multiple IGV applets
  - Removed restrictions to spawn IGV applet without `bam` files. User now can create an IGV applet with a `fasta` file only.
- ## v0.1.2
  - Added `--atomic path/to/dir` options to `app/bin/downloadX.sh`
  - Added `temp` folder for atomic downloads and other general purposes. Created automatically at server start
  - Added `getDirs` to `app/js`
  - Added `btoa` (binary to ascii) to `helpers`
  - Added `safeResources` as a separate file under `app/js`
  - Added ability to whitelist or blacklist URIs to downloads
  - Added new integration tests for atomicity of downloads
  - Added new functions under test `fixtures`
  - Added `sse-examples.txt` (Server-Sent-Events) examples under `fixtures`
  - Added `transpileStrMathList` to filter URI strings
- ## v0.2.0
  ### changes
  - Integrates `blastn` (v2.15.0)
  - added automatic and parallel blast db creation
  - added ability to run multiple blast queries on frontend
  - added ability for blast runs to generate both output format 6 and default format
  - added subscriber v0.0.3 to coordinate event dispatches to blast windows
  - extended fasta deletion from the UI to also silently remove blast queries and databases associated with that reference fasta
  - extended pipeline to build with `blastn`
- ## v0.2.1
  ### changes
  - Added the ability to install certs automatically before docker container start. This is done via mounting a folder/docker volume into `/app/certs`
  - Added a new safe resource: `"https://drive.usercontent.google.com/u/0/uc?id=11TbI4TJJiD7lP86VFBeWMmiCa2YAEGpN&export=download"` which is the first million bases of human X chromosome
  - Added `clamp` and `tryKeys` to `helpers.js`
  - Added 2 new keys `ncpus` and `nproc` that give cpu count
  - Added new unit tests and added an integration test for `blastn` functionality
  - Added the ability to use multiple threads for `blastn` for blast searches. The number of cores are automatically determined based on host cpu core count and clamped between 1 and 4
  ### fixes
  - Fixed an issue where blast database generation would take longer than 2 minutes and trigger part of the code under `blastn.js` that resulted in a syntax error. The `const` has been switched to `let` declaration. And the default timeout has been clamped between 15 minutes and 0x7FFFFFFF and is configurable via `blastn.makeblastdbTimeout` key in the server configuration.
  - Updated `codyLogger` component to address a cosmetic issue in the Safari Browser (`display:none` did not transition properly)
- ## v0.3.0
  ### changes
  - Upgraded docker, ci and standalone versions of xpress-bio from node 16 to 20.
  - Upgraded various packages to accommodate for the new node version.
  - Added a new `ws` proxy property to the object passed to routes, similar to `serverSent`.
  - Added a `Web-Socket` server that handles upgrades that pairs with client side web-socket object with `binaryType` set to `arraybuffer`.
  - Integrated [Subscriber](https://www.npmjs.com/package/@ibowankenobi/subscriber) and [WS](https://www.npmjs.com/package/ws) to the backend. Also included a newer version of [path-to-regexp](https://www.npmjs.com/package/path-to-regexp) other than the one `express` relies on (0.1.10):
  ```shell
  $ npm ls path-to-regexp
  docker/app
  ├─┬ express@4.21.1
  │ └── path-to-regexp@0.1.10
  └── path-to-regexp@8.2.0
  ```
  - extended `server.config.json` to include `web-socket` key, where web-socket channels and their paths and limits can be configured. *Warning*, `routes` key uses the the new `path-to-regexp` 8.2.0 dependency above. Overtime, we might  do the same for `serverSent` or reverse if this proves to provide worse DX.
  - added `utils/loadWebSockets.js` similar to `loadServerSent.js` that handles HTTP upgrades for `ws`.
  - added `weakBucket.js`, `penalizer.js`, `rateLimiter.js` and `validateWs.js` to provide namespaces and rate-limiting for web-socket connections.
  - extended `helper.js` to provide functions to determine if payload is `Uint8Array` or `TypedArray`, `isTA` and `isTA8`. Added conversions from `Uint8Array` to `Uint16Array` and `Uint32Array`. The conversions are in little endian. 32 and 16 bit arrays gets converted to buffer in low endian, and these outputs can be converted back to 16 or 32 bits. This makes the conversions independent of the host endianness. Added `wsSend8` to send binary buffer regardless of input type.
  ### fixes
  - Due to Node 16 closing sockets more frequently and 20/22 is more eager to accept new connections, it increases the chance to trigger `ECONNRESET` or `ECONNREFUSED` in `serverStress.test.js`. Therefore `cache.end` calls in `loadMemcachedRoutes.js` has been removed, they expire on their own. See the issue [here](https://github.com/nodejs/node/issues/55330), and it seems like this still affects Node 22.