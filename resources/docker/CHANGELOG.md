# CHANGELOG
- v0.0.7
  - added `onerror` cb for `capture.js`
  - fixed the URI download to correctly capture headers from `HTTP/2` protocol
  - added a new `worker-connection-timedout` event for the clients
  - added ability to download fasta files with `.fas` extension
  - now supports parsing filename from `content-disposition` where filename is not provided with double quotes
  - added a `safeResource` to test downloads: `https://gist.github.com/IbrahimTanyalcin/ecf5f91d86a07e31a038283148b4a52e/archive/35deaee01bcfd2c58c24df709f6d6b2a0edc0247.tar.gz`
  - added a test for download behavior
  - moved reusable subroutines for tests under `test/fixtures`