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