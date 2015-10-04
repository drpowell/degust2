'use strict';

exports = module.exports = function(app, mongoose) {
  var visitedSchema = new mongoose.Schema({
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    deSettings: { type: mongoose.Schema.Types.ObjectId, ref: 'DESettings' },
    last: { type: Date, default: Date.now },
  });
  app.db.model('Visited', visitedSchema);
};
