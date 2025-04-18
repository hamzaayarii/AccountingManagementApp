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
        required: true,
        default: 'Other'
    },
    createdAt: {
        type: Date,
        default: Date.now
    },
    token: String,
    resetToken: String,
    verificationToken: String,
    verificationTokenExpiresAt: Date,
    isVerified: {
        type: Boolean,
        default: false
    },
    updatedAt: Date,
    isBanned: {
        type: Boolean,
        default: false // Attribut pour gérer l'état de ban
    },
    role: {
        type: String,
        enum: ['admin', 'accountant', 'business_owner','user'],
        default: 'business_owner',
        required: true
    },
    assignedTo: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        default: null
      }
});

// Vérifier si le modèle est déjà compilé
const User = mongoose.models.User || mongoose.model('User', userSchema);

// Exporter le modèle User
module.exports = User;
