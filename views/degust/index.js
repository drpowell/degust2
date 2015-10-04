'use strict';

var fs = require('fs');
var child_process = require('child_process');
var mustache = require('mustache');
var tmp = require('tmp');


var get_settings = function(deSettings) {
	var s = deSettings.settings || {};

	var def = {csv_format: false,
			   replicates : [],
		       fc_columns: [],
		       info_columns: [],
		       analyze_server_side: true,
		       min_counts: 0,
	};

	Object.keys(def).forEach(function(key) {
		if (!(key in s)) {
			s[key] = def[key];
		}
	});
	return s;
};

exports.settings = function(req, res, next){
	req.app.db.models.DESettings.findById(req.params.id).exec(function (err, settings) {
      	if (err) {
        	return next(err);
      	}
      	if (settings===null) {
      		return next();
      	}

		res.json(get_settings(settings));
	});

};

exports.saveSettings = function(req, res, next){
	req.app.db.models.DESettings.findById(req.params.id).exec(function (err, settings) {
      	if (err) {
        	return next(err);
      	}
      	if (settings===null) {
      		return next();
      	}

      	settings.settings = JSON.parse(req.body.settings);
      	settings.save(function (err, s) {
	      	if (err) {
    	    	return next(err);
      		}
			res.json({result: "ok!"});
      	});
	});

};

exports.partialCSV = function(req, res, next){
	req.app.db.models.DESettings.findById(req.params.id).populate('file').exec(function (err, settings) {
      	if (err) {
        	return next(err);
      	}
      	if (settings===null) {
      		return next();
      	}

		fs.open(settings.file.path, 'r', function(status, fd) {
		    if (status) {
        		console.log(status.message);
	        	return;
    		}

    		var max_len=1024;
		    var buffer = new Buffer(max_len);
		    fs.read(fd, buffer, 0, max_len, 0, function(err, num) {
	    		res.send(buffer.toString('ascii',0,num));
		    });
		});
	});
};

exports.csv = function(req, res, next){
	req.app.db.models.DESettings.findById(req.params.id).populate('file').exec(function (err, settings) {
      	if (err) {
        	return next(err);
      	}
      	if (settings===null) {
      		return next();
      	}

	    res.writeHead(200, {
	        'Content-Length': settings.file.size
	    });

	    var readStream = fs.createReadStream(settings.file.path);
	    // We replaced all the event handlers with a simple call to readStream.pipe()
	    readStream.pipe(res);
	});
};

var readTemplates = function() {
	var templates = {};
	var dir = __dirname + "/r-templates/";
	var files = fs.readdirSync(dir);
	for (var i=0; i<files.length; i+=1) {
		var match = files[i].match(/^(.*)\.R/);
		if (match) {
			var txt = fs.readFileSync(dir + files[i], 'utf8');
			templates[match[1]] = txt;
		}
	}
	return templates;
};
var templates = readTemplates();

// Function to get all the columns with "counts" from the settings.  Returns in a defined order
var count_columns = function(settings) {
	var cols = {};	
	settings.replicates.forEach(function(arr) {
		arr[1].forEach(function(c) { cols[c] = true; });
	});
	return Object.keys(cols).sort();
};

// Create design matrix.  Columns are in order of "replicates" array.   Rows in order as done by count_columns()
var design_matrix = function(settings) {
	var mat = [];
	var count_cols = count_columns(settings);
	var col_names = [];
	for (var i=0; i<settings.replicates.length; i+=1) {
		var col = [];
		for (var j=0; j<count_cols.length; j+=1) {
			col[j] = settings.replicates[i][1].indexOf(count_cols[j])>=0 ? 1 : 0;
		}
		mat.push(col);
		col_names.push(settings.replicates[i][0]);
	}
	return {mat:mat, col_names:col_names};
};

// Create contrast matrix.  Columns are in order of passed "conditions" array.   
// Rows in order of columns from design_matrix()
var cont_matrix = function(settings, conds) {
	var mat = [];
	var col_names = [];
	var pri = conds.shift();
	for (var i=0; i<conds.length; i+=1) {
		var col = [];
		for (var j=0; j<settings.replicates.length; j+=1) {
			col[j] = (settings.replicates[j][0]===pri ? -1 : (settings.replicates[j][0]===conds[i] ? 1 : 0));
		}
		mat.push(col);
		col_names.push(conds[i]);
	}
	return {mat:mat, col_names:col_names};
};

// Columns to send to client
var export_cols = function(settings) {
	var arr = settings.info_columns;
	settings.replicates.forEach(function(r) { 
		arr = arr.concat(r[1]); 
	});
	return arr;
};

var arrToR = function(arr, quot) {
	return "c(" + arr.map(function(x){ if (quot) {return "'"+x+"'";} else {return x;}}).join(",") + ")";
};

var matToR = function(arr, quot) {
	return "matrix("+arrToR(arr.mat.map(function(x) { return arrToR(x,quot);}))+
		   ", ncol="+arr.mat.length+
		   ", dimnames=list(c(),"+arrToR(arr.col_names,true)+"))";
};

var get_r_code = function(req, deSettings, output_dir) {
  	var fields = JSON.parse(req.query.fields);
  	var settings = get_settings(deSettings);
	var params = {
  				sep_char: settings.csv_format ? "," : "\t",
  				counts_file: deSettings.file.path,
  				counts_skip: 0,
  				columns: arrToR(count_columns(settings), true),
  				min_counts: settings.min_counts,
  				design: matToR(design_matrix(settings)),
  				cont_matrix: matToR(cont_matrix(settings, fields)),
				export_cols: arrToR(export_cols(settings), true),
				output_dir: output_dir,
	};
	var method;
	switch (req.query.method) {
		case 'voom': method = 'voom'; break;
		case 'edgeR': method = 'edgeR'; break;
		case 'voom-weights': method = 'voom-weights'; break;
	}
	if (!method) {
		return null;
	}
	var input = mustache.render(templates[method], params, templates);
	//console.log("input", input);
	return input;
};

exports.dge = function(req, res, next){
	req.app.db.models.DESettings.findById(req.params.id).populate('file').exec(function (err, deSettings) {
      	if (err) {
        	return next(err);
      	}
      	if (deSettings===null) {
      		return next();
      	}

		var tmpobj = tmp.dirSync({unsafeCleanup: true});
		var input = get_r_code(req, deSettings, tmpobj.name);

		if (!input) {
			return next();
		}

		var prog = child_process.execFile("R", ['-q','--vanilla'], {}, function(err,_stdout,stderr) {
			//console.log("stdout", stdout.toString());
			//console.log("stderr", stderr.toString());

			var output = fs.readFileSync(tmpobj.name +"/output.txt", 'utf8');

			tmpobj.removeCallback();
			res.send(output.toString());
		});
		prog.stdin.end(input);
	});
};

exports.dge_r_code = function(req, res, next){
	req.app.db.models.DESettings.findById(req.params.id).populate('file').exec(function (err, deSettings) {
      	if (err) {
        	return next(err);
      	}
      	if (deSettings===null) {
      		return next();
      	}

		var input = get_r_code(req, deSettings, "output_dir");
		if (!input) {
			return next();
		}

		var prog = child_process.execFile("R", ['-q','--vanilla'], {}, function(err,stdout,stderr) {
			res.send(input + stdout.toString());
		});
		prog.stdin.end(mustache.render(templates.versions, {}, templates));
	});
};

