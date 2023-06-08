

const {access, mkdir} = require("fs/promises"),
	{constants} = require("fs"),
	path = require('path'),
	{getStats} = require("./getStats.js"),
	{log} = require("./helpers.js");

/**
@description create folders if not exist
@param {string} parent absolute or relative
path to the directiory under which the folders
will be created.
@param {string|string[]} folderNames an array of
folder names
@param {object=} options an object of optional
parameters
*/	
async function createFolders(parent, folderNames, opts = {
	base: "./",
	log: true,
	mod: 0o777,
	recursive: false,
	dryRun: false
}) {
	let result = [];
	try {
		parent = path.resolve(opts?.base ?? "./", ...[].concat(parent));
		await getStats(parent).then(stats => stats.some((stat, i) => {
            if (!stat.isDirectory()) {
                throw new Error(`${parent} is not a directory`);
            }
        }));
		folderNames = [].concat(folderNames).map(d => {
			if (d instanceof Array) {
				d = path.join(...d);
			}
			if (path.isAbsolute(d)){
				throw new Error(`folderNames cannot be absolute: '${d}'`)
			}
			return path.resolve(parent, d)
		});
		for (const folderName of folderNames) {
			result.push(
				access(
					folderName, 
					constants.F_OK | constants.R_OK
				)
				.then(undef => {
					(opts?.log ?? true)
					&& log(`${folderName} already exists, skipping.`);
					return folderName;
				})
				.catch(err => {
					(opts?.log ?? true)
					&& log(`Creating ${folderName}${opts.dryRun ? " (dryRun)" : ""}`);
					/*
					beware of the umask, if umask is 022
					then 0o777 is infact 0o755
					https://github.com/nodejs/node/issues/15092
					*/
					return opts.dryRun 
						? folderName
						: mkdir(
							folderName, 
							{recursive: false, mod: 0o777, ...opts}
						)
						.then(undef => folderName)
						.catch(err => {throw err})
				})
			)
		}
	} catch (err) {
		throw err;
	}
	return Promise.all(result);
}

exports.createFolders = createFolders;

/*
Usage:
createFolders("someFolderRelToPWD", ["bam","bai"], {mod: 0o744})
.then(result => console.log(result))
.catch(err => console.log(err));

createFolders(
	["xyz", "test2"], 
	[["","newFolder"], ["whateva"]], 
	{
		base: "/home", 
		dryRun: false, 
		log: true
	}
).then(x => console.log(x))
outputs:
[
  '/home/xyz/test2/newFolder',
  '/home/xyz/test2/whateva'
]
*/
/*
Usage within module:
const {createFolders} = require("path/to/createFolders.js");
*/
