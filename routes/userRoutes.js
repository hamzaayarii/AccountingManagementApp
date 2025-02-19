const express = require('express');
const router = express.Router();
const { create, list, updateUser, deleteUser } = require('../controllers/userController');
const User = require('../models/user');
const bcrypt = require('bcryptjs'); // For password hashing
const jwt = require('jsonwebtoken'); // For token-based authentication

const SECRET_KEY = 'your_secret_key'; // Change this to a secure key

// 🔹 Register a new user
router.post('/register', create);

// 🔹 Get all users
router.get('/', list);

// 🔹 Update user by ID
router.put('/:id', updateUser);

// 🔹 Delete user by ID
router.delete('/:id', deleteUser);

router.post('/login', async (req, res) => {
    const { email, password } = req.body;

    try {
        // 🔹 Check if user exists
        const user = await User.findOne({ email });

        if (!user) {
            return res.status(400).json({ success: false, message: 'Email not found' });
        }

        console.log("Stored Hashed Password:", user.password);  // 🔹 Debugging

        // 🔹 Compare entered password with stored hashed password
        const isMatch = await bcrypt.compare(password, user.password);

        console.log("Password Match:", isMatch);  // 🔹 Debugging

        if (!isMatch) {
            return res.status(400).json({ success: false, message: 'Invalid password' });
        }

        // 🔹 Generate JWT Token
        const token = jwt.sign({ id: user._id, email: user.email }, SECRET_KEY, { expiresIn: '1h' });

        res.status(200).json({
            success: true,
            message: 'Login successful',
            token,
            user: {
                id: user._id,
                fullName: user.fullName,
                email: user.email
            }
        });

    } catch (error) {
        console.error('Login Error:', error);
        res.status(500).json({ success: false, message: 'Server error' });
    }
});

module.exports = router;
