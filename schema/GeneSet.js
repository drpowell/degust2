'use strict';

exports = module.exports = function(app, mongoose) {
  var geneSetSchema = new mongoose.Schema({
    name: { type: String, default: '' },
    description: {type: String, default: ''},

    organism: { type: String, default: ''},
    keyType: {type: String, default: ''},   // eg. Ensembl, Symbol, Entrez
    keyColumn: {type: String, default: ''},

    // Data table (data.frame)
    columns: [String],
    column_data: {type: Object, default: {}},      // Object with "columns" keys, each as an array of data

    collection_: {type: mongoose.Schema.Types.ObjectId, ref: 'GeneSetCollection' },

    createdAt: { type: Date, default: Date.now },
    owner: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }
  });
  geneSetSchema.index({ name: 1 });
  app.db.model('GeneSet', geneSetSchema);
};
