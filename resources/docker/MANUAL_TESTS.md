# MANUAL TESTS

Not all e2e tests are covering newer functions, so as a preflight mechanism, manual tests are performed before they are replaced with e2e tests. Below are the tests performed and the steps to reproduce them. All tests outlined here were verified to work under `Ubuntu 20.04` `x86_64` `Intel(R) Core(TM) i9-10885H CPU @ 2.40GHz`

- ## v0.2.0 Testing auto indexing and auto blast db creation
  - remove existing query
  - re-run one of the queries `AAAATAGGATTTATAGGACC` so that `blastnDbReady` `Set` is populated in `workers/blastn.js` with `genome.fa`
  - delete `genome.fa` using the UI
  - this will prompt (a modified version of the scripts at the time for debugging) paths on the terminal,verify the paths that should be deleted
  - also check the terminal that the key `genome.fa` existed and was removed from the set `blastnDbReady`
  - if the paths are correct, manually remove `blast/db/genome.fa` and `blast/query/genome.fa` folders
  - move `genome.fa` from `temp/` back to `fa/` folder
  - verify that auto-indexing and auto blast db creation worked (generated `.fai` had no diff)
  - compare the created blast db files with a backed up copy (all files had same hashes, diff only reported `*.njs` and `*.nin` difference and this was not due to size but due to timestamp. Upon inspection, `*.njs` had a different timestamp, the rest of the file content was same)
  - run blast query from the UI and check the hash of the generated query compared to a backed up one (hashes were same, no differences were found)
  
- ## v0.2.0 Clearing blast files from the UI
  - run some query so that `query/genome.fa` folder is generated
  - delete `genome.fa` from the UI
  - verify that `genome.fa`, `genome.fa.fai`, `blast/db/genome.fa/` and `blast/query/genome.fa` is deleted
  - move `genome.fa` from `temp` into `fa/`
  - check the integrity of the generated `genome.fai` and `blast/db/genome.fa/`
  - repeat the same test without first running a blast query to check if server silently responds with `400` (because `/query/genome.fa` or contents do not exist to be deleted)