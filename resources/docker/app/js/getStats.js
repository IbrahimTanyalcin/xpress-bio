

const fs = require('fs/promises'),
	path = require('path');

exports.getStats = function(...files){
	return Promise.all(
		files.flat(Infinity).map(file => fs.stat(file))
	);
}