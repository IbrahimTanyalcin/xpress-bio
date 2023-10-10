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