import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import User from '../models/User.js';
import { OAuth2Client } from "google-auth-library";
import generator from "generate-password";
import nodemailer from 'nodemailer';
import dotenv from 'dotenv';
import cookie from 'cookie-parser';
dotenv.config();
import axios from 'axios';


const SECRET_KEY = process.env.SECRET_KEY || 'your_secret_key';
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '1h';

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
        const { fullName, email, password, phoneNumber, governorate, avatar, gender, role } = req.body;

        // 🔹 Validate required fields
        if (!fullName || !email || !password) {
            return res.status(400).json({ success: false, message: "Full name, email, and password are required" });
        }

        // 🔹 Validate role if provided
        if (role && !['accountant', 'business_owner'].includes(role)) {
            return res.status(400).json({
                success: false,
                message: "Role must be either 'accountant' or 'business_owner'"
            });
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
            gender,
            role: role || 'business_owner'
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
                role: savedUser.role,
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

        // Validate required fields
        if (!userId) {
            return res.status(400).json({ message: "User ID is required" });
        }

        // Hash password if provided
        if (updateData.password) {
            const hashedPassword = await bcrypt.hash(updateData.password, 10);
            updateData.password = hashedPassword;
        }

        // Update user in the database
        const updatedUser = await User.findByIdAndUpdate(
            userId,
            updateData,
            { new: true, runValidators: true }
        );

        if (!updatedUser) {
            return res.status(404).json({ message: "User not found" });
        }

        // Exclude sensitive fields from the response
        const sanitizedUser = updatedUser.toObject();
        delete sanitizedUser.password;

        res.status(200).json({ user: sanitizedUser });
    } catch (error) {
        console.error("Error updating user:", error);
        if (error.name === "ValidationError") {
            return res.status(400).json({ message: "Invalid input", errors: error.errors });
        }
        return res.status(500).json({ message: "Server error", error: error.message });
    }
};



// Mettre à jour le statut de ban d'un utilisateur
export const toggleBan = async (req, res) => {
    const { id } = req.params;

    try {
        const user = await User.findById(id);
        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }

        user.isBanned = !user.isBanned;
        await user.save();

        res.status(200).json({ message: `User ${user.isBanned ? 'banned' : 'unbanned'} successfully` });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server error' });
    }
};

// Fonction de login
export const login = async (req, res) => {
    const { email, password } = req.body;

    try {
        console.log('Attempting to find user with email:', email);

        const user = await User.findOne({ email });
        if (!user) {
            console.log('User not found');
            return res.status(400).json({ success: false, message: "Invalid email or password" });
        }

        console.log('User found:', user);

        // Vérifier si l'utilisateur est banni
        if (user.isBanned) {
            console.log('User is banned');
            return res.status(403).json({ success: false, message: "Your account is banned. Please contact support." });
        }

        console.log('Checking password match');

        const isMatch = await bcrypt.compare(password, user.password);
        if (!isMatch) {
            console.log('Password does not match');
            return res.status(400).json({ success: false, message: "Invalid email or password" });
        }

        console.log('Password matches');

        const token = jwt.sign(
            {
                id: user._id,
                email: user.email,
                role: user.role,
                isBanned: user.isBanned
            },
            process.env.SECRET_KEY,  // Secret key loaded from environment variables
            { expiresIn: process.env.JWT_EXPIRES_IN || '1h' }  // Default expiration time
        );

        console.log('Token generated:', token);

        // 🔹 Store token in a **secure** HTTP-only cookie
        res.cookie('token', token, {
            httpOnly: true, // Prevents access via JavaScript (for security)
            secure: process.env.NODE_ENV === 'production', // Only use `secure` in production (HTTPS)
            sameSite: 'strict', // Helps prevent CSRF attacks
            maxAge: 60 * 60 * 1000 // 1 hour expiration
        });

        res.status(200).json({
            success: true,
            message: "Login successful",
            token,
            user: {
                _id: user._id,
                fullName: user.fullName,
                email: user.email,
                phoneNumber: user.phoneNumber,
                governorate: user.governorate,
                avatar: user.avatar,
                gender: user.gender,
                createdAt: user.createdAt,
                role: user.role,
                isBanned: user.isBanned
            }
        });
    } catch (error) {
        console.error("Login Error:", error);
        res.status(500).json({ success: false, message: "Server error", error: error.message });
    }
};

// Authentification via Google
export const googleAuthRequest = async (req, res) => {
    res.header("Access-Control-Allow-Origin", 'http://localhost:3000');
    res.header("Access-Control-Allow-Credentials", 'true');
    res.header("Referrer-Policy", "no-referrer-when-downgrade");

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

    res.json({ url: authorizeUrl })

}

async function getUserData(access_token) {

    const response = await fetch(`https://www.googleapis.com/oauth2/v3/userinfo?access_token=${access_token}`);

    //console.log('response',response);
    const data = await response.json();

    console.log('data', data);
    return data;
}

export const googleAuth = async (req, res) => {
    const code = req.query.code;

    console.log(code);
    try {
        const redirectURL = "http://127.0.0.1:5000/api/users/googleAuth"
        const oAuth2Client = new OAuth2Client(
            process.env.CLIENT_ID,
            process.env.CLIENT_SECRET,
            redirectURL
        );
        const r = await oAuth2Client.getToken(code);
        // Make sure to set the credentials on the OAuth2 client.
        await oAuth2Client.setCredentials(r.tokens);
        console.info('Tokens acquired.');
        const user_ = oAuth2Client.credentials;
        console.log('credentials', user_);
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
        }
        user.token = jwt.sign({ id: user._id, email: user.email }, SECRET_KEY, { expiresIn: JWT_EXPIRES_IN });
        res.send(`
            <script>
              window.opener.postMessage(${JSON.stringify(user)}, "http://localhost:3000");
              window.close();
            </script>
        `);
        //res.end("Login successful!!! You can close this window.");
    } catch (err) {
        console.log('Error logging in with OAuth2 user', err);
    }


    // res.redirect(303, 'http://localhost:5173/');
}
/* <= Google sign-up and log in */

/* forgot-password => */
const transporter = nodemailer.createTransport({
    service: "gmail",
    auth: {
        user: process.env.EMAIL_USER, // Your email
        pass: process.env.EMAIL_PASS, // Your email password
    },
});

export const forgot_password = async (req, res) => {
    const { email } = req.body;

    try {
        const user = await User.findOne({ email });
        if (!user) return res.status(404).json({ message: "User not found" });

        // Create a reset token (valid for 1 hour)
        const resetToken = jwt.sign({ userId: user._id }, process.env.SECRET_KEY, { expiresIn: "1h" });

        // Store the reset token in the database (optional)
        user.resetToken = resetToken;
        await user.save();

        // Email content
        const resetLink = `http://localhost:3000/auth/new-password/${resetToken}`;

        const mailOptions = {
            from: process.env.EMAIL_USER,
            to: user.email,
            subject: "Password Reset Request",
            html: `<p>Click <a href="${resetLink}">here</a> to reset your password. This link is valid for 1 hour.</p>`,
        };

        await transporter.sendMail(mailOptions);

        res.json({ message: "Reset email sent!" });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: "Error processing request" });
    }
}

export const reset_password = async (req, res) => {
    const { newPassword, token } = req.body;

    try {
        // Verify the token
        const decoded = jwt.verify(token, process.env.SECRET_KEY);
        const user = await User.findById(decoded.userId);

        if (!user || user.resetToken !== token) {
            return res.status(400).json({ message: "Invalid or expired token" });
        }

        // Hash new password
        user.password = await bcrypt.hash(newPassword, 10);

        // Clear reset token after password change
        user.resetToken = undefined;
        await user.save();

        res.json({ message: "Password reset successfully!" });
    } catch (error) {
        console.error("Error in reset-password:", error);
        res.status(400).json({ message: "Invalid or expired token" });
    }
};
/* <= forgot-password */
