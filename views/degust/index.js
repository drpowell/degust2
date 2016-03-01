'use strict';

var fs = require('fs');
var child_process = require('child_process');
var mustache = require('mustache');
var tmp = require('tmp');

var send_file = function(filePath, res) {
    var stat = fs.statSync(filePath);

    res.writeHead(200, {
        'Content-Type': 'audio/mpeg',
        'Content-Length': stat.size
    });

    var readStream = fs.createReadStream(filePath);
    // We replaced all the event handlers with a simple call to readStream.pipe()
    readStream.pipe(res);

};

var get_settings = function(deSettings) {
    var s = deSettings.settings || {};

    var def = {csv_format: false,
               replicates : [],
               fc_columns: [],
               info_columns: [],
               analyze_server_side: true,
    };

    Object.keys(def).forEach(function(key) {
        if (!(key in s)) {
            s[key] = def[key];
        }
    });
    return s;
};

// Check the settings are valid
var check_settings = function(settings) {
    var invalid = /[\\'"\n]/;

    var check_array = function(arr) {
        if (!arr) {
            return true;
        }
        for (var i=0;i<arr.length;i+=1) {
            if (invalid.test(arr[i])) {
                return false;
            }
        }
        return true;
    };

    if (!check_array(settings.fc_columns) ||
        !check_array(settings.info_columns) ||
        !check_array(settings.hidden_factors)) {
        return false;
    }
    if (settings.ec_column && invalid.test(settings.ec_column)) {
        return false;
    }
    for (var i=0; i<settings.replicates.length; i+=1) {
        if (!check_array([settings.replicates[i][0]])) {
            return false;
        }
        if (!check_array(settings.replicates[i][1])) {
            return false;
        }
    }

    return true;
};

exports.settings = function(req, res, next){
    req.app.db.models.DESettings.findById(req.params.id).exec(function (err, settings) {
        if (err) {
            return next(err);
        }
        if (settings===null) {
            return next();
        }

        // Store this visit
        if (req.user) {
            req.app.db.models.Visited.update(
                        {user:req.user._id, deSettings:settings._id},
                        {user:req.user._id, deSettings:settings._id, last: Date.now()},
                        {upsert:true}, function(err, dat) {
                res.json(get_settings(settings));
            });
        } else {
            res.json(get_settings(settings));
        }
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
        if (!check_settings(settings.settings)) {
            res.status(400).send("Invalid character in field");
            return;
        }

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

        send_file(settings.file.path, res);
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
    return {mat:mat, col_names:col_names, row_names: count_cols};
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
    var replicate_names = settings.replicates.map(function(r){return r[0];});
    return {mat:mat, col_names:col_names, row_names: replicate_names};
};

// Columns to send to client
var export_cols = function(settings) {
    var arr = settings.info_columns;
    settings.replicates.forEach(function(r) {
        arr = arr.concat(r[1]);
    });
    if (settings.ec_column) {
        arr.push(settings.ec_column);
    }
    return arr;
};

var arrToR = function(arr, quot) {
    return "c(" + arr.map(function(x){ if (quot) {return "'"+x+"'";} else {return x;}}).join(",") + ")";
};

var matToR = function(arr, quot) {
    return "matrix("+arrToR(arr.mat.map(function(x) { return arrToR(x,quot);}))+
           ", ncol="+arr.mat.length+
           ", dimnames=list("+arrToR(arr.row_names,true)+","+arrToR(arr.col_names,true)+"))";
};

var force_num = function(str) {
    var n = +str;
    if (isNaN(n)) {
        n=0;
    }
    return n;
};

var get_r_code = function(req, deSettings, output_dir) {
    var fields = JSON.parse(req.query.fields);
    var settings = get_settings(deSettings);
    var params = {
                sep_char: settings.csv_format ? "," : "\t",
                counts_file: deSettings.file.path,
                counts_skip: 0,
                columns: arrToR(count_columns(settings), true),
                min_counts: force_num(settings.min_counts),
                min_cpm: force_num(settings.min_cpm),
                min_cpm_samples: force_num(settings.min_cpm_samples),
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

        var cacheKey = JSON.stringify([deSettings, req.query]);
        var cacheFile = req.app.utility.caching.check(cacheKey);
        if (cacheFile) {
            send_file(cacheFile, res);
            return;
        }

        var prog = child_process.execFile("R", ['-q','--vanilla'], {}, function(err,_stdout,stderr) {
            if (err) {
                res.send(JSON.stringify({error: {input: input, msg: stderr}}));
                return;
            }
            var output = fs.readFileSync(tmpobj.name +"/output.txt", 'utf8');
            var extra="";
            try {
                extra = JSON.parse(fs.readFileSync(tmpobj.name +"/extra.json", 'utf8'));
            } catch (err) {}

            tmpobj.removeCallback();

            var outStr = JSON.stringify({
                    csv: output,
                    extra: extra,
            });

            req.app.utility.caching.store(cacheKey, outStr);

            res.send(outStr);
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

exports.kegg_titles = function(req,res,next) {
    req.app.db.models.DESettings.findById(req.params.id).populate('file').exec(function (err, deSettings) {
        if (err) {
            return next(err);
        }
        if (deSettings===null) {
            return next();
        }

        var kegg = fs.readFileSync(__dirname + "/kegg/pathway/map_title.tab", 'utf8');
        var lst = kegg.toString().split(/\r?\n/).map(function(l) { return l.split(/\t/); });

        var readOne = function(lst, buf) {
            var codeTitle = lst.shift();
            if (!codeTitle || codeTitle.length<2) {
                var str = buf.map(function(l) {return l.join("\t");}).join("\n") + "\n";
                res.setHeader('content-type', 'text/csv');
                return res.send(str);
            }
            fs.readFile(__dirname + "/kegg/kgml/map/map"+codeTitle[0]+".xml", function(err, data) {
                var ecs = [];
                if (!err) {
                    var re = /name="ec:([.\d]+)"/g;
                    var m;
                    do {
                        m = re.exec(data);
                        if (m) {
                            ecs.push(m[1]);
                        }
                    } while (m);
                }
                buf.push([codeTitle[0], codeTitle[1], ecs.join(" ")]);
                readOne(lst, buf);
            });
        };
        readOne(lst, [["code","title","ec"]]);
    });
};
/*
getKeggTitles :: CGI String
getKeggTitles =  liftIO $ do
    ls <- map (splitOn "\t") . lines <$> Prelude.readFile "kegg/pathway/map_title.tab"
    withEC <- mapM lookupEC ls
    return $ unlines (map (intercalate "\t") $ header : withEC)
  where
    header = ["code","title","ec"]
    lookupEC [] = return []
    lookupEC line@(mp:_) = do
        xml <- catch (Prelude.readFile $ "kegg/kgml/map/map"++mp++".xml")
                     ((\_ -> return "" ) :: IOException -> IO String)
        let ecs = xml =~ ("name=\"ec:([.\\d]+)\"" ::String) :: [[String]]
        return $ line ++ [intercalate " " $ map (!!1) ecs]
        */