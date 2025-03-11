const mongoose = require('mongoose');

const invoiceSchema = new mongoose.Schema({
    invoiceNumber: { type: String, required: true },
    orderNumber: String,
    invoiceDate: { type: Date, required: true },
    dueDate: { type: Date, required: true },
    customerName: { type: String, required: true },
    items: [
        {
            itemDetails: { type: String, required: true },
            quantity: { type: Number, required: true },
            rate: { type: Number, required: true },
            tax: { type: Number, default: 0 },
            amount: { type: Number, required: true }
        }
    ],
    subTotal: { type: Number, required: true },
    discount: { type: Number, default: 0 },
    shippingCharges: { type: Number, default: 0 },
    total: { type: Number, required: true }
});

const Invoice = mongoose.model('Invoice', invoiceSchema);

module.exports = Invoice;
