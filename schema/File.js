'use strict';

exports = module.exports = function(app, mongoose) {
  var fileSchema = new mongoose.Schema({
    name: { type: String, default: '' },
    path: { type: String, default: ''},
    mimetype: { type: String, default: ''},
    size: { type: Number, default: 0},
    createdAt: { type: Date, default: Date.now },
    owner: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }
  });
  fileSchema.plugin(require('./plugins/pagedFind'));
  fileSchema.index({ name: 1 });
  fileSchema.set('autoIndex', (app.get('env') === 'development'));
  app.db.model('File', fileSchema);
};
