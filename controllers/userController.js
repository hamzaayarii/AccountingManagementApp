const bcrypt = require('bcryptjs');
const User = require('../models/user'); // Ensure this appears only ONCE

// List all users
async function list(req, res, next) {
    try {
        const users = await User.find();
        res.status(200).json(users);
    } catch (err) {
        res.status(503).json({ error: err.message });
    }
}


const create = async (req, res, next) => {
    try {
        const { fullName, email, password, phoneNumber, governorate, avatar, gender } = req.body;

        // 🔹 Hash the password before saving
        const hashedPassword = await bcrypt.hash(password, 10);

        const newUser = new User({
            fullName,
            email,
            password: hashedPassword,  // 🔹 Store hashed password
            phoneNumber,
            governorate,
            avatar,
            gender
        });

        const savedUser = await newUser.save();
        console.log("User Created: ", savedUser);

        res.status(201).json({
            success: true,
            message: "User added successfully!",
            user: savedUser
        });

    } catch (error) {
        console.error("Error creating user:", error);
        res.status(500).json({
            success: false,
            message: "An error occurred while creating the user.",
            error: error.message
        });
    }
};


// Update user by ID
async function updateUser(req, res, next) {
    req.body.updatedAt = new Date();
    try {
        const data = await User.findByIdAndUpdate(req.params.id, req.body, { new: true });
        if (!data) {
            return res.status(404).json({ error: "User not found" });
        }
        res.status(200).json(data);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
}

// Delete user by ID
const deleteUser = async (req, res, next) => {
    try {
        const id = req.params.id;
        const data = await User.findByIdAndDelete(id);
        if (!data) {
            return res.status(404).json({ error: "User not found" });
        }
        res.status(203).json({ success: true, message: "User deleted", user: data });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

module.exports = { create, list, updateUser, deleteUser };
