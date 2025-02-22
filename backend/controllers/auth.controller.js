import bcryptjs from "bcryptjs";
import crypto from "crypto";
import dotenv from "dotenv";
dotenv.config(); // Load environment variables from .env file
import {OAuth2Client} from "google-auth-library";
import generator from "generate-password";

import { generateTokenAndSetCookie } from "../utils/generateTokenAndSetCookie.js";
import {
	sendPasswordResetEmail,
	sendResetSuccessEmail,
	sendVerificationEmail,
	sendWelcomeEmail,
} from "../mailtrap/emails.js";
import { User } from "../models/User.js";

export const signup = async (req, res) => {
	const { email, password, name } = req.body;

	try {
		if (!email || !password || !name) {
			throw new Error("All fields are required");
		}

		const userAlreadyExists = await User.findOne({ email });
		console.log("userAlreadyExists", userAlreadyExists);

		if (userAlreadyExists) {
			return res.status(400).json({ success: false, message: "User already exists" });
		}

		const hashedPassword = await bcryptjs.hash(password, 10);
		const verificationToken = Math.floor(100000 + Math.random() * 900000).toString();

		const user = new User({
			email,
			password: hashedPassword,
			name,
			verificationToken,
			verificationTokenExpiresAt: Date.now() + 24 * 60 * 60 * 1000, // 24 hours
		});

		await user.save();

		// jwt
		generateTokenAndSetCookie(res, user._id);

		await sendVerificationEmail(user.email, verificationToken);

		res.status(201).json({
			success: true,
			message: "User created successfully",
			user: {
				...user._doc,
				password: undefined,
			},
		});
	} catch (error) {
		res.status(400).json({ success: false, message: error.message });
	}
};

export const verifyEmail = async (req, res) => {
	const { code } = req.body;
	try {
		const user = await User.findOne({
			verificationToken: code,
			verificationTokenExpiresAt: { $gt: Date.now() },
		});

		if (!user) {
			return res.status(400).json({ success: false, message: "Invalid or expired verification code" });
		}

		user.isVerified = true;
		user.verificationToken = undefined;
		user.verificationTokenExpiresAt = undefined;

		await user.save();

		await sendWelcomeEmail(user.email, user.name);

		res.status(200).json({
			success: true,
			message: "Email verified successfully",
			user: {
				...user._doc,
				password: undefined,
			},
		});
	} catch (error) {
		console.log("error in verifyEmail ", error);
		res.status(500).json({ success: false, message: "Server error" });
	}
};

export const login = async (req, res) => {
	const { email, password } = req.body;
	try {
		const user = await User.findOne({ email });
		if (!user) {
			return res.status(400).json({ success: false, message: "Invalid credentials" });
		}
		const isPasswordValid = await bcryptjs.compare(password, user.password);
		if (!isPasswordValid) {
			return res.status(400).json({ success: false, message: "Invalid credentials" });
		}

		generateTokenAndSetCookie(res, user._id);

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
	} catch (error) {
		console.log("Error in login ", error);
		res.status(400).json({ success: false, message: error.message });
	}
};

export const logout = async (req, res) => {
	res.clearCookie("token");
	res.status(200).json({ success: true, message: "Logged out successfully" });
};

export const forgotPassword = async (req, res) => {
	const { email } = req.body;
	try {
		const user = await User.findOne({ email });

		if (!user) {
			return res.status(400).json({ success: false, message: "User not found" });
		}

		// Generate reset token
		const resetToken = crypto.randomBytes(20).toString("hex");
		const resetTokenExpiresAt = Date.now() + 1 * 60 * 60 * 1000; // 1 hour

		user.resetPasswordToken = resetToken;
		user.resetPasswordExpiresAt = resetTokenExpiresAt;

		await user.save();

		// send email
		await sendPasswordResetEmail(user.email, `${process.env.CLIENT_URL}/reset-password/${resetToken}`);

		res.status(200).json({ success: true, message: "Password reset link sent to your email" });
	} catch (error) {
		console.log("Error in forgotPassword ", error);
		res.status(400).json({ success: false, message: error.message });
	}
};

export const resetPassword = async (req, res) => {
	try {
		const { token } = req.params;
		const { password } = req.body;

		const user = await User.findOne({
			resetPasswordToken: token,
			resetPasswordExpiresAt: { $gt: Date.now() },
		});

		if (!user) {
			return res.status(400).json({ success: false, message: "Invalid or expired reset token" });
		}

		// update password
		const hashedPassword = await bcryptjs.hash(password, 10);

		user.password = hashedPassword;
		user.resetPasswordToken = undefined;
		user.resetPasswordExpiresAt = undefined;
		await user.save();

		await sendResetSuccessEmail(user.email);

		res.status(200).json({ success: true, message: "Password reset successful" });
	} catch (error) {
		console.log("Error in resetPassword ", error);
		res.status(400).json({ success: false, message: error.message });
	}
};

export const checkAuth = async (req, res) => {
	try {
		const user = await User.findById(req.userId).select("-password");
		if (!user) {
			return res.status(400).json({ success: false, message: "User not found" });
		}

		res.status(200).json({ success: true, user });
	} catch (error) {
		console.log("Error in checkAuth ", error);
		res.status(400).json({ success: false, message: error.message });
	}
};


/* Google sign-up and log in => */
export const googleAuthRequest = async (req, res)=> {
	res.header("Access-Control-Allow-Origin", 'http://localhost:5173');
	res.header("Access-Control-Allow-Credentials", 'true');
	res.header("Referrer-Policy","no-referrer-when-downgrade");
	const redirectURL = 'http://127.0.0.1:5000/api/auth/googleAuth';

	const oAuth2Client = new OAuth2Client(
		process.env.CLIENT_ID,
		process.env.CLIENT_SECRET,
		redirectURL
	);

	// Generate the url that will be used for the consent dialog.
	const authorizeUrl = oAuth2Client.generateAuthUrl({
		access_type: 'offline',
		scope: 'https://www.googleapis.com/auth/userinfo.profile  openid ',
		prompt: 'consent'
	});

	res.json({url:authorizeUrl})

}

async function getUserEmail(access_token,idToken,google_id) {
	const client = new OAuth2Client(google_id);
	const ticket = await client.verifyIdToken({
		idToken,
		audience: google_id,
	});
	const payload = ticket.getPayload();
	console.log("User Email:", payload.email);
	return payload.email;
}

async function getUserData(access_token,id_token) {

	const response = await fetch(`https://www.googleapis.com/oauth2/v3/userinfo?access_token=${access_token}`);

	//console.log('response',response);
	const data = await response.json();

	data.email = await getUserEmail(access_token,id_token,data.sub);

	console.log('data',data);
	return data;
}

export const googleAuth = async (req, res)=> {
	const code = req.query.code;

	console.log(code);
	try {
		const redirectURL = "http://127.0.0.1:5000/api/auth/googleAuth"
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
		const user_data = await getUserData(user_.access_token,user_.id_token);
		let { email, password } = user_data;
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
			const hashedPassword = await bcryptjs.hash(password, 10);
			const verificationToken = Math.floor(100000 + Math.random() * 900000).toString();

			user = new User({
				email,
				password: hashedPassword,
				name,
				verificationToken,
				verificationTokenExpiresAt: Date.now() + 24 * 60 * 60 * 1000, // 24 hours
			});
			await user.save();
			user = await User.findOne({ email });
		}


		generateTokenAndSetCookie(res, user._id);

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

