const mongoose = require('mongoose');
const {Schema, model} = mongoose;

const ProductSchema = new Schema({
  product_id : {type: String, required: true},
  product_name : String,
  category : String,
  price : Number
});

const ProductModel = model('Product', ProductSchema);

module.exports = ProductModel;