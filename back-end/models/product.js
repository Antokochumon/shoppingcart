const mongoose = require('mongoose');

const productSchema = new mongoose.Schema({
  name: String,
  price: Number,
  image: String, // Ensure this field stores the correct image path
});

module.exports = mongoose.model('Product', productSchema);

