const mongoose = require('mongoose');

const productSchema = new mongoose.Schema({
  Name: String,
  Price: Number,
  Description: String,
  Image: String,
  additionalImages: [String] // Should be an array
});

module.exports = mongoose.model('Product', productSchema);

