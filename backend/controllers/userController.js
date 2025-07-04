import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import User from '../models/User.js';
import { OAuth2Client } from "google-auth-library";
import generator from "generate-password";
import nodemailer from 'nodemailer';
import dotenv from 'dotenv';
import cookie from 'cookie-parser';
dotenv.config();
// import axios from 'axios';


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

        // Generate verification token (6-digit number)
        const verificationToken = Math.floor(100000 + Math.random() * 900000).toString();
        const verificationTokenExpiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours from now

        // 🔹 Create user object
        const newUser = new User({
            fullName,
            email,
            password: hashedPassword,
            phoneNumber,
            governorate,
            avatar,
            gender,
            role: role || 'business_owner',
            verificationToken,
            verificationTokenExpiresAt,
            isVerified: false
        });

        const savedUser = await newUser.save();

        // 🔹 Send verification email
        try {
            const verificationLink = `http://localhost:3000/auth/verify-email/${verificationToken}`;
            const mailOptions = {
                from: process.env.EMAIL_USER,
                to: email,
                subject: 'Verify Your Email - Accounting Management App',
                html: `
                    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
                        <h2>Welcome to Accounting Management App!</h2>
                        <p>Dear ${fullName},</p>
                        <p>Thank you for registering! Please verify your email address by clicking the link below:</p>
                        <p>
                            <a href="${verificationLink}" style="display: inline-block; padding: 10px 20px; background-color: #4CAF50; color: white; text-decoration: none; border-radius: 5px;">
                                Verify Email Address
                            </a>
                        </p>
                        <p>Or enter this verification code on the verification page: <strong>${verificationToken}</strong></p>
                        <p>This verification link and code will expire in 24 hours.</p>
                        <p>If you did not create an account, please ignore this email.</p>
                        <p>Best regards,<br>The Accounting Management Team</p>
                    </div>
                `
            };
            await transporter.sendMail(mailOptions);
        } catch (emailError) {
            console.error('Error sending verification email:', emailError);
            // We don't want to fail the registration if email fails
        }

        // 🔹 Send response (excluding password and verification token)
        return res.status(201).json({
            success: true,
            message: "User registered successfully! Please check your email to verify your account.",
            user: {
                _id: savedUser._id,
                fullName: savedUser.fullName,
                email: savedUser.email,
                phoneNumber: savedUser.phoneNumber,
                governorate: savedUser.governorate,
                avatar: savedUser.avatar,
                gender: savedUser.gender,
                role: savedUser.role,
                createdAt: savedUser.createdAt,
                isVerified: false
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
        const { currentPassword, newPassword, ...updateData } = req.body;

        // Validate required fields
        if (!userId) {
            return res.status(400).json({ message: "User ID is required" });
        }

        // Get current user data
        const user = await User.findById(userId);
        if (!user) {
            return res.status(404).json({ message: "User not found" });
        }

        // Handle password update if requested
        if (newPassword && currentPassword) {
            // Verify current password
            const isPasswordValid = await bcrypt.compare(currentPassword, user.password);
            if (!isPasswordValid) {
                return res.status(400).json({
                    message: "Current password is incorrect"
                });
            }

            // Hash new password
            const hashedPassword = await bcrypt.hash(newPassword, 10);
            updateData.password = hashedPassword;
        }

        // Update user in the database
        const updatedUser = await User.findByIdAndUpdate(
            userId,
            updateData,
            { new: true, runValidators: true }
        );

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

        // Check if email is verified
        if (!user.isVerified) {
            return res.status(403).json({
                success: false,
                message: "Please verify your email before logging in",
                needsVerification: true
            });
        }

        // Check if user is banned
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
                _id: user._id,
                email: user.email,
                role: user.role,
                isBanned: user.isBanned
            },
            process.env.SECRET_KEY,
            { expiresIn: process.env.JWT_EXPIRES_IN || '1h' }
        );

        console.log('Token generated:', token);

        // Store token in a secure HTTP-only cookie
        res.cookie('token', token, {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            sameSite: 'strict',
            maxAge: 60 * 60 * 1000
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

        }

        user.isVerified = true;
        await user.save();

        const token = jwt.sign(
            {
                _id: user._id,
                email: user.email,
                role: user.role,
                isBanned: user.isBanned
            },
            process.env.SECRET_KEY,
            { expiresIn: process.env.JWT_EXPIRES_IN || '1h' }
        );

        console.log('Token generated:', token);

        // 🔹 Store token in a **secure** HTTP-only cookie

        res.cookie('token', token, {
            httpOnly: true, // Prevents access via JavaScript (for security)
            secure: process.env.NODE_ENV === 'production', // Only use `secure` in production (HTTPS)
            sameSite: 'strict', // Helps prevent CSRF attacks
            maxAge: 60 * 60 * 1000 // 1 hour expiration
        });

        const loggedUser = {
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
        }
        res.send(`
            <script>
              window.opener.postMessage(${JSON.stringify(loggedUser)}, "http://localhost:3000");
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


export const assignAccountant = async (req, res) => {
    try {
        const { accountantId } = req.body;

        const accountant = await User.findById(accountantId);
        if (!accountant || accountant.role !== "accountant") {
            return res.status(404).json({ message: 'Invalid accountant ID' });
        }

        const businessOwner = await User.findById(req.user._id);
        if (!businessOwner || businessOwner.role !== "business_owner") {
            return res.status(403).json({ message: 'Unauthorized' });
        }

        if (businessOwner.assignedTo) {
            return res.status(400).json({ message: "You've already assigned an accountant." });
        }

        // Link both
        businessOwner.assignedTo = accountant._id;
        accountant.assignedTo = businessOwner._id;

        await businessOwner.save();
        await accountant.save();

        res.status(200).json({ message: 'Accountant assigned successfully' });
    } catch (err) {
        console.error('Error assigning accountant:', err);
        res.status(500).json({ message: 'Server error' });
    }
};
export const getUsersByRole = async (req, res) => {
    try {
        const { role } = req.query;

        if (!role) {
            return res.status(400).json({ message: 'Role query param is required' });
        }

        // Get all users with the specified role (no filter on assignedTo)
        const users = await User.find({ role }).select('fullName email _id');

        res.json(users);
    } catch (error) {
        console.error('Error fetching users by role:', error);
        res.status(500).json({ message: 'Server error' });
    }
};

export const search= async (req, res) => {
    try {
      const query = req.query.query;
      
      // Search users by fullName, email, or phoneNumber
      const users = await User.find({
        $or: [
          { fullName: { $regex: query, $options: 'i' } },
          { email: { $regex: query, $options: 'i' } },
          { phoneNumber: { $regex: query, $options: 'i' } }
        ]
      }).select('_id fullName email phoneNumber avatar');
      
      // Don't include the current user in results
      const filteredUsers = users.filter(user => user._id.toString() !== req.user.id);
      
      res.json(filteredUsers);
    } catch (err) {
      console.error(err);
      res.status(500).send('Server Error');
    }
  };

  export const removeAssignment = async (req, res) => {
    const { accountantId } = req.body;
    const userId = req.user._id;

    try {
        const businessOwner = await User.findById(userId);
        if (!businessOwner) return res.status(404).send("Business owner not found");

        if (!businessOwner.assignedTo) {
            return res.status(400).send("No accountant assigned to your business");
        }

        if (businessOwner.assignedTo.toString() !== accountantId) {
            return res.status(400).send("This accountant is not assigned to your business");
        }

        const accountant = await User.findById(accountantId);
        if (!accountant) return res.status(404).send("Accountant not found");

        if (accountant.assignedTo?.toString() !== businessOwner._id.toString()) {
            return res.status(400).send("Mismatch in accountant assignment");
        }

        // Unlink both
        businessOwner.assignedTo = null;
        accountant.assignedTo = null;

        await businessOwner.save();
        await accountant.save();

        res.status(200).send("Assignment removed successfully");
    } catch (err) {
        console.error("Error removing assignment:", err);
        res.status(500).send("Server error");
    }
};

// 📌 Verify Email
export const verifyEmail = async (req, res) => {
    try {
        const { token } = req.params;
        console.log('Verifying token:', token); // Add logging

        // Find user with matching verification token
        const user = await User.findOne({
            verificationToken: token,
            verificationTokenExpiresAt: { $gt: Date.now() } // Token not expired
        });

        console.log('Found user:', user); // Add logging

        if (!user) {
            return res.status(400).json({
                success: false,
                message: "Invalid or expired verification token"
            });
        }

        // Update user as verified
        user.isVerified = true;
        user.verificationToken = undefined;
        user.verificationTokenExpiresAt = undefined;
        await user.save();

        console.log('User verified successfully'); // Add logging

        return res.status(200).json({
            success: true,
            message: "Email verified successfully"
        });
    } catch (error) {
        console.error("Error verifying email:", error);
        return res.status(500).json({
            success: false,
            message: "Error verifying email",
            error: error.message
        });
    }
};

// 📌 Resend Verification Email
export const resendVerification = async (req, res) => {
    try {
        const { email } = req.body;

        const user = await User.findOne({ email });
        if (!user) {
            return res.status(404).json({
                success: false,
                message: "User not found"
            });
        }

        if (user.isVerified) {
            return res.status(400).json({
                success: false,
                message: "Email is already verified"
            });
        }

        // Generate new verification token
        const verificationToken = Math.floor(100000 + Math.random() * 900000).toString();
        const verificationTokenExpiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours

        user.verificationToken = verificationToken;
        user.verificationTokenExpiresAt = verificationTokenExpiresAt;
        await user.save();

        // Send new verification email
        const verificationLink = `http://localhost:3000/verify-email/${verificationToken}`;
        const mailOptions = {
            from: process.env.EMAIL_USER,
            to: email,
            subject: 'Verify Your Email - Accounting Management App',
            html: `
                <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
                    <h2>Email Verification</h2>
                    <p>Dear ${user.fullName},</p>
                    <p>You requested a new verification email. Please verify your email address by clicking the link below:</p>
                    <p>
                        <a href="${verificationLink}" style="display: inline-block; padding: 10px 20px; background-color: #4CAF50; color: white; text-decoration: none; border-radius: 5px;">
                            Verify Email Address
                        </a>
                    </p>
                    <p>Or enter this verification code: <strong>${verificationToken}</strong></p>
                    <p>This verification link and code will expire in 24 hours.</p>
                    <p>If you did not request this email, please ignore it.</p>
                    <p>Best regards,<br>The Accounting Management Team</p>
                </div>
            `
        };

        await transporter.sendMail(mailOptions);

        return res.status(200).json({
            success: true,
            message: "Verification email sent successfully"
        });
    } catch (error) {
        console.error("Error resending verification:", error);
        return res.status(500).json({
            success: false,
            message: "Error sending verification email",
            error: error.message
        });
    }
};
export const getAssignedBusinessOwners = async (req, res) => {
    try {
      const accountantId = req.user._id;
  
      // Find all users with role 'business_owner' that are assigned to this accountant
      const businessOwners = await User.find({
        role: 'business_owner',
        assignedTo: accountantId,
      }).select('-password');
  
      res.status(200).json(businessOwners);
    } catch (err) {
      console.error("Error fetching assigned business owners:", err);
      res.status(500).json({ message: "Server error" });
    }
  };
