import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import User from '../models/User.js';
import {OAuth2Client} from "google-auth-library";
import generator from "generate-password";
import axios from 'axios';
import dotenv from 'dotenv';
dotenv.config();

// 📌 List all users
export const list = async (req, res) => {
    try {
        const users = await User.find().select('-password'); // Exclude passwords
        res.status(200).json({ success: true, users });
    } catch (err) {
        console.error("Error listing users:", err);
        res.status(500).json({ success: false, message: "Server error", error: err.message });
    }
};
export const deleteUser = async (req, res) => {
    const { id } = req.params;

    try {
        const user = await User.findByIdAndDelete(id);
        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }
        res.status(200).json({ message: 'User deleted successfully' });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server error' });
    }
};

// 📌 Create a new user
export const create = async (req, res) => {
    try {
        const { fullName, email, password, phoneNumber, governorate, avatar, gender } = req.body;

        // 🔹 Validate required fields
        if (!fullName || !email || !password) {
            return res.status(400).json({ success: false, message: "Full name, email, and password are required" });
        }

        // 🔹 Check if user already exists
        const existingUser = await User.findOne({ email });
        if (existingUser) {
            return res.status(400).json({ success: false, message: "Email already registered" });
        }

        // 🔹 Hash password
        const hashedPassword = await bcrypt.hash(password, 10);

        // 🔹 Create user object
        const newUser = new User({
            fullName,
            email,
            password: hashedPassword,
            phoneNumber,
            governorate,
            avatar,
            gender
        });

        const savedUser = await newUser.save();

        // 🔹 Send response (excluding password)
        return res.status(201).json({
            success: true,
            message: "User registered successfully!",
            user: {
                _id: savedUser._id,
                fullName: savedUser.fullName,
                email: savedUser.email,
                phoneNumber: savedUser.phoneNumber,
                governorate: savedUser.governorate,
                avatar: savedUser.avatar,
                gender: savedUser.gender,
                createdAt: savedUser.createdAt
            }
        });
    } catch (error) {
        console.error("Error creating user:", error);
        return res.status(500).json({ success: false, message: "Error creating user", error: error.message });
    }
};

// 📌 Update user by ID
export const updateUser = async (req, res) => {
    try {
        const userId = req.params.id;
        const updateData = req.body;

        // Ensure the password is not being updated (or hash it if it's changed)
        if (updateData.password) {
            const hashedPassword = await bcrypt.hash(updateData.password, 10);
            updateData.password = hashedPassword;
        }

        const updatedUser = await User.findByIdAndUpdate(userId, updateData, {
            new: true,
            runValidators: true,
        });

        if (!updatedUser) {
            return res.status(404).json({ message: "User not found" });
        }

        // Return updated user data
        res.status(200).json({ user: updatedUser });
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: "Server error" });
    }
};

/* Google sign-up and log in => */
export const googleAuthRequest = async (req, res)=> {
    res.header("Access-Control-Allow-Origin", 'http://localhost:5173');
    res.header("Access-Control-Allow-Credentials", 'true');
    res.header("Referrer-Policy","no-referrer-when-downgrade");
    const redirectURL = 'http://127.0.0.1:5000/api/users/googleAuth';

    const oAuth2Client = new OAuth2Client(
        process.env.CLIENT_ID,
        process.env.CLIENT_SECRET,
        redirectURL
    );

    // Generate the url that will be used for the consent dialog.
    const authorizeUrl = oAuth2Client.generateAuthUrl({
        access_type: 'offline',
        scope: 'https://www.googleapis.com/auth/userinfo.profile email openid ',
        prompt: 'consent'
    });

    res.json({url:authorizeUrl})

}

async function getUserData(access_token) {

    const response = await fetch(`https://www.googleapis.com/oauth2/v3/userinfo?access_token=${access_token}`);

    //console.log('response',response);
    const data = await response.json();

    console.log('data',data);
    return data;
}

export const googleAuth = async (req, res)=> {
    const code = req.query.code;

    console.log(code);
    try {
        const redirectURL = "http://127.0.0.1:5000/api/users/googleAuth"
        const oAuth2Client = new OAuth2Client(
            process.env.CLIENT_ID,
            process.env.CLIENT_SECRET,
            redirectURL
        );
        const r =  await oAuth2Client.getToken(code);
        // Make sure to set the credentials on the OAuth2 client.
        await oAuth2Client.setCredentials(r.tokens);
        console.info('Tokens acquired.');
        const user_ = oAuth2Client.credentials;
        console.log('credentials',user_);
        const user_data = await getUserData(user_.access_token);
        let { name, email, password } = user_data;
        let user = await User.findOne({ email });
        if (!user) {
            password = generator.generate({
                length: 12,
                numbers: true,
                symbols: true,
                uppercase: true,
                lowercase: true,
                strict: true, // Ensures at least one of each type
            });
            const hashedPassword = await bcrypt.hash(password, 10);
            const verificationToken = Math.floor(100000 + Math.random() * 900000).toString();

            user = new User({
                email,
                password: hashedPassword,
                fullName: name,
                verificationToken,
                verificationTokenExpiresAt: Date.now() + 24 * 60 * 60 * 1000, // 24 hours
            });
            await user.save();
            user = await User.findOne({ email });
        }


        //generateTokenAndSetCookie(res, user._id);

        user.lastLogin = new Date();
        await user.save();

        res.status(200).json({
            success: true,
            message: "Logged in successfully",
            user: {
                ...user._doc,
                password: undefined,
            },
        });
    } catch (err) {
        console.log('Error logging in with OAuth2 user', err);
    }


    res.redirect(303, 'http://localhost:5173/');
}
/* <= Google sign-up and log in */
