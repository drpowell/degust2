'use strict';

var fs = require('fs');
var md5 = require('md5');
var child_process = require('child_process');


// Create an md5sum of all source files (for cache breaking)
var stat_files = function() {
	var buf = child_process.execFileSync('find',['public','-name','*.js','-o','-name','*.R'], {});
	var files = buf.toString().split(/\r?\n/);
	var mTimes = files.map(function(f) {
		try {
			return fs.statSync(f).mtime;
		} catch (err) {
			return 0;
		}
	});
	return md5(mTimes.join(''));
}

var versionHash = stat_files();

var dir = "cache/";

var fname = function(inp) {
	return dir + md5(versionHash + inp);
};

var check = function(inp) {
	try {
		fs.statSync(fname(inp));
		return fname(inp);			
	} catch (err) {
		return null;
	}
};

var store = function(inp, val) {
	fs.writeFileSync(fname(inp), val);
};

exports = module.exports = { 
		check: check,
		store: store,

};
