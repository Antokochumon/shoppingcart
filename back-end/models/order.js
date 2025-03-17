const mongoose = require('mongoose');

const orderSchema = new mongoose.Schema({
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    deliveryDetails: {
        address: { type: String, required: true },
        pincode: { type: String, required: true },
        mobile: { type: String, required: true },
    },
    paymentMethod: { type: String, required: true },
    products: [{
        item: { type: mongoose.Schema.Types.ObjectId, ref: 'Product' },
        quantity: { type: Number, required: true },
    }],
    totalAmount: { type: Number, required: true },
    status: { type: String, enum: ['placed', 'paid', 'shipped', 'delivered'], default: 'placed' },
    date: { type: Date, default: Date.now },
});

module.exports = mongoose.model('Order', orderSchema);