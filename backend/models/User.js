const mongoose = require('mongoose');
const bcrypt = require('bcrypt');
const userSchema = new mongoose.Schema({
    fullName: {
        type: String,
        required: [true, "Le nom complet est obligatoire"],
        trim: true,
        minlength: [3, "Le nom complet doit contenir au moins 3 caractères"],
        maxlength: [50, "Le nom complet ne peut pas dépasser 50 caractères"]
    },
    email: {
        type: String,
        required: [true, "L'email est obligatoire"],
        unique: true,
        trim: true,
        lowercase: true,
        match: [/^\S+@\S+\.\S+$/, "Veuillez entrer une adresse e-mail valide"]
    },
    password: {
        type: String,
        required: [true, "Le mot de passe est obligatoire"],
        minlength: [6, "Le mot de passe doit contenir au moins 6 caractères"]
    },
    phoneNumber: {
        type: String,
        required: [true, "Le numéro de téléphone est obligatoire"],
        match: [/^\d{8}$/, "Le numéro de téléphone doit contenir 8 chiffres"]
    },
    governorate: {
        type: String,
        required: [true, "Le gouvernorat est obligatoire"],
        trim: true
    },
    //test
    avatar: {
        type: String,
        match: [/^https?:\/\/.+\.(jpg|jpeg|png|gif|webp)$/, "L'URL de l'avatar n'est pas valide"]
    },
    gender: {
        type: String,
        enum: ['male', 'female', 'other'],
        required: [true, "Le genre est obligatoire"]
    },
    role: {
        type: String,
        enum: ['admin', 'user'],
        default: 'user',
        required: [true, "Le rôle est obligatoire"]
    },
    emailVerified: {
        type: Boolean,
        default: false
    },
    createdAt: {
        type: Date,
        default: Date.now
    },
    updatedAt: {
        type: Date,
        default: Date.now
    }
});


// 🔐 **Password Hashing Middleware**
userSchema.pre('save', async function (next) {
    if (!this.isModified('password')) return next();

    try {
        const saltRounds = 10;
        this.password = await bcrypt.hash(this.password, saltRounds);
        next();
    } catch (error) {
        next(error);
    }
});

// 🔍 **Password Comparison Method**
userSchema.methods.comparePassword = async function (candidatePassword) {
    return await bcrypt.compare(candidatePassword, this.password);
};

// Auto-update `updatedAt` before saving
userSchema.pre('save', function (next) {
    this.updatedAt = Date.now();
    next();
});

module.exports = mongoose.model('User', userSchema);