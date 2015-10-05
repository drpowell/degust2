'use strict';

var moment = require('moment');

exports.init = function(req, res, next){
	if (!req.user) {
		return next();
	}

	req.app.db.models.Visited.find({user: req.user._id}).sort('-last')
							  .populate('deSettings')
							  .populate('user').exec(function (err, visited) {
		if (err) {
			return next(err);
		}

		var queries = visited.map(function(v) {
			return function(done) {
				v.deSettings.populate('owner', function(err, de) {
					if (de.owner) {
						de.owner.populate('roles.account', function(err, acc) {
							done(null, v);
						});
					} else {
						done(null, v);						
					}
				});
			};
		});
		require('async').parallel(queries, function(err, visited) {
			var mine=[];
			var others=[];
			visited.forEach(function(v) {
				if (v.deSettings.owner && v.deSettings.owner._id.equals(req.user._id)) {
					mine.push(v);
				} else {
					others.push(v);
				}
			});

			res.render('visits/index', {moment:moment, mine:mine, others:others});
		});
	});
};
