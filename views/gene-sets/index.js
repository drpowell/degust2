'use strict';


exports.list = function(req, res, next) {
	req.app.db.models.GeneSet.find({name: /N/i}, function(err, sets) {
		res.json({num: sets.length});
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
