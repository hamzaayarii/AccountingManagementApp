const mongoose = require('mongoose');

const businessSchema = new mongoose.Schema({
    name: { type: String, required: true },
    address: { type: String, required: true },
    country: { type: String, required: true, default: 'Tunisia' },
    state: { type: String, required: true },
    type: { type: String, required: true }, // Legal Structure
    businessActivity: { type: String },
    email: { type: String, required: false, unique: true },
    rneNumber: { type: String, required: true, unique: true }, // RNE number
    taxNumber: { type: String, required: true, unique: true },
    phone: { type: String, required: true },
    capital: { type: String },
    vatRegistration: { type: Boolean, default: false },
    exportOriented: { type: Boolean, default: false },
    employeeCount: { type: String, default: '1-5' },
    owner: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }, // Relation with User (Business Owner)
    accountant: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null }, // Relation with User (Accountant)
}, {
    timestamps: true
});

module.exports = mongoose.model('Business', businessSchema);
