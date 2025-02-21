import mongoose from "mongoose";

const userSchema = new mongoose.Schema({
    name: {
        type: String,
        required: true
    },
    email: {
        type: String,
        required: true,
        unique: true,
        match: [/^\S+@\S+.\S+$/, 'Please enter a valid email']
    },
    password: {
        type: String,
        required: true,
        minlength: 6 // Minimum length for password
    },
    phoneNumber: {
        type: String,
        validate: {
            validator: function (v) {
                return /\d{10}/.test(v); // Example regex for a 10-digit number
            }
            ,
            message: props => '${props.value} is not a valid phone number!'
        }
    },
    governorate: {
        type: String
    },
    avatar: {
        type: String,
        validate: {
            validator: function (v) {
                return /^https?:\/\/.+/.test(v); // Basic URL validation
            },
            message: props => '${props.value} is not a valid URL!'
        }
    },
    gender: {
        type: String,
        enum: ['male', 'female', 'other'],
        default: 'other'
    },
    role: {
        type: String,
        enum: ['admin', 'user'],
        default: 'user'
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
    },
    lastLogin: {
        type: Date,
        default: Date.now,
    },
    isVerified: {
        type: Boolean,
        default: false,
    },
    resetPasswordToken: String,
    resetPasswordExpiresAt: Date,
    verificationToken: String,
    verificationTokenExpiresAt: Date,
},
    { timestamps: true }
);

export const User = mongoose.model("User", userSchema);