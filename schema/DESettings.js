'use strict';

exports = module.exports = function(app, mongoose) {
  var fileSchema = new mongoose.Schema({
    name: { type: String, default: '' },
    createdAt: { type: Date, default: Date.now },
    owner: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    file: { type: mongoose.Schema.Types.ObjectId, ref: 'File' },

    settings: {type: Object, default: {}}
  });
  fileSchema.plugin(require('./plugins/pagedFind'));
  fileSchema.index({ name: 1 });
  fileSchema.set('autoIndex', (app.get('env') === 'development'));
  app.db.model('DESettings', fileSchema);
};
