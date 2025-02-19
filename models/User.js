const mongoose = require('mongoose');
const Schema = mongoose.Schema;

// Define User Schema
const userSchema = new Schema({
    fullName: {
        type: String,
        required: true
    },
    email: {
        type: String,
        required: true,
        unique: true
    },
    password: {
        type: String,
        required: true
    },
    phoneNumber: String,
    governorate: String,
    avatar: String,
    gender: {
        type: String,
        enum: ['Male', 'Female', 'Other'],
        required: true
    },
    createdAt: {
        type: Date,
        default: Date.now
    },
    updatedAt: Date
});

// Create and export User model
module.exports = mongoose.model('User', userSchema);
