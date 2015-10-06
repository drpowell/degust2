'use strict';

var fs = require('fs');
var moment = require('moment');

exports.list = function(req, res, next){
	req.app.db.models.GeneSetCollection.find({}, function (err, collections) {
		if (err) {
			next(err);
		}
		res.render('gene-set-collections/index', {moment:moment, collections:collections});
	});
};

exports.del = function(req, res, next){
	if (!req.user) {
		next();
	}
	var owner = req.user._id;
	var id = req.params.id;

	req.app.db.models.GeneSet.find({owner: owner, collection_: id}).remove().exec();

	req.app.db.models.GeneSetCollection.find({owner:owner, _id: id}).remove(function (err) {
		if (err) {
			next(err);
		}
		res.redirect('/gene-set-collections');
	});
};

var create_set_gmt = function(req, owner, line, collection) {
	var columns = line.split("\t");
	var fields = { name: columns.shift(),
				   description: columns.shift(),
				   organism: '',
				   keyType: 'symbol',
				   keyColumn: 'id',
				   columns: ['id'],
				   column_data: {id: columns},
				   collection_: collection,
				   createdAt: new Date().toISOString(),
				   owner: owner,
			   };

	req.app.db.models.GeneSet.create(fields, function(err, set) {
		if (err) {
			throw err;
		}
	});
};

var create_collection = function(req, owner, name, cb) {
	var fields = { name: name,
				   description: '',
				   organism: '',
				   keyType: 'symbol',
				   createdAt: new Date().toISOString(),
				   owner: owner,
			   };

	req.app.db.models.GeneSetCollection.create(fields, function(err, collection) {
		if (err) {
			throw err;
		}
		cb(collection);
	});
};

exports.upload_gmt = function(req, res, next){
	if (!req.user) {
		next();
	}
	var owner = req.user._id;
	var collection_name = req.file.originalname;
	create_collection(req, owner, collection_name, function(collection) {

		var rl = require('readline').createInterface({
			input: require('fs').createReadStream(req.file.path)
		});

		var lines = 0;
		rl.on('line', function (line) {
			create_set_gmt(req, owner, line, collection);
			lines += 1;
		});
		rl.on('close', function() {
			fs.unlinkSync(req.file.path);
			collection.size = lines;
			collection.save(function(err) {
				if (err) {
					throw err;
				}
				res.redirect('/gene-set-collections');
			});
		});
	});
};
