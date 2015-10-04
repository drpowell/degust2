'use strict';

//var fs = require('fs');

exports.init = function(req, res){
  res.render('upload/index', { csrf: '' }); // req.csrfToken() });
};

exports.upload = function(req, res){
  //console.log("upload", req.file);
  var owner = null;
  if (req.user) {
    owner = req.user._id;
  }
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
