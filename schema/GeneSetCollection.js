'use strict';

exports = module.exports = function(app, mongoose) {
  var geneSetCollectionSchema = new mongoose.Schema({
    name: { type: String, default: '' },
    description: {type: String, default: ''},

    organism: { type: String, default: ''},
    keyType: {type: String, default: ''},   // eg. Ensembl, Symbol, Entrez

    size: {type: Number, default: 0},

    createdAt: { type: Date, default: Date.now },
    owner: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }
  });
  app.db.model('GeneSetCollection', geneSetCollectionSchema);
};
