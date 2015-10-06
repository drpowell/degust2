'use strict';


exports.list = function(req, res, next) {
	var q = new RegExp(req.query.term,"i");
	req.app.db.models.GeneSet.find({name: q}, function(err, sets) {
		var arr = sets.map(function(s) {
			return {label: s.name, id: s._id};
		});
		res.json(arr);
	});
};

exports.get = function(req, res, next) {
	req.app.db.models.GeneSet.findById(req.params.id).exec(function(err, set) {
		res.json(set);
	});
};

/*
  var fields = { name: req.file.originalname,
				 path: req.file.path,
				 mimetype: req.file.mimetype,
				 size: req.file.size,
				 createdAt: new Date().toISOString(),
				 owner: owner,
				 settings: {}
			   };

  req.app.db.models.File.create(fields, function(err, file) {
	var fields = { name: null,
				   createdAt: new Date().toISOString(),
				   owner: owner,
				   file: file,

				 };
	req.app.db.models.DESettings.create(fields, function(err, settings) {
	  res.redirect('/degust/compare.html?code='+settings._id);
	});
  });
};
*/
