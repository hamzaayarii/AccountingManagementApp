// src/routes/userRoutes.js
const express = require('express');
const router = express.Router();
const { create, list, updateUser, deleteUser, googleAuth, googleAuthRequest, forgot_password, reset_password, toggleBan, login,assignAccountant,getUsersByRole  } = require('../controllers/userController');
const User = require('../models/User');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { authenticate } = require('../middlewares/authMiddleware');
const mongoose = require('mongoose');
require('dotenv').config();

// Load environment variables
const SECRET_KEY = process.env.SECRET_KEY || 'your_secret_key';
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '1h';


// Middleware pour vérifier le rôle admin
const authorizeAdmin = (req, res, next) => {
    if (req.user.role !== 'admin') {
        return res.status(403).json({ message: 'Access denied, admin privileges required' });
    }
    next();
};

// Middleware pour valider l'ID utilisateur dans les paramètres
const validateUserId = (req, res, next) => {
    const { id } = req.params;
    if (!mongoose.Types.ObjectId.isValid(id)) {
        return res.status(400).json({ message: 'Invalid user ID' });
    }
    next();
};

// 📌 Routes utilisateurs
router.post('/register', create); // Inscription d'un utilisateur

router.get('/', authenticate, authorizeAdmin, list); // Obtenir tous les utilisateurs (réservé aux administrateurs)

router.put('/:id', authenticate, validateUserId, updateUser); // Mettre à jour un utilisateur

router.delete('/:id', authenticate, authorizeAdmin, validateUserId, deleteUser); // Supprimer un utilisateur (admin uniquement)

// 📌 Authentification des utilisateurs
router.post('/login', login);

// 📌 Récupérer le profil utilisateur actuel
router.get('/users/me', authenticate, async (req, res) => {
    try {
        const userId = req.user.id; // À partir du token décrypté

        const user = await User.findById(userId).select('-password');
        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }
        res.status(200).json({ user });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server error' });
    }
});

// 📌 Authentification Google
router.post("/googleAuthRequest", googleAuthRequest);
router.get("/googleAuth", googleAuth);

// 📌 Mot de passe oublié
router.post("/forgot-password", forgot_password);

// 📌 Réinitialisation du mot de passe
router.post("/reset-password", reset_password);

// 📌 Bannir un utilisateur (admin uniquement)
router.post('/:id/ban', authenticate, authorizeAdmin, async (req, res) => {
    const { id } = req.params;
    try {
        const user = await User.findById(id);
        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }

        user.isBanned = true;
        await user.save();
        res.status(200).json({ message: 'User has been banned' });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server error' });
    }
});

// 📌 Dé-bannir un utilisateur (admin uniquement)
router.post('/:id/unban', authenticate, authorizeAdmin, async (req, res) => {
    const { id } = req.params;
    try {
        const user = await User.findById(id);
        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }

        user.isBanned = false;
        await user.save();
        res.status(200).json({ message: 'User has been unbanned' });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server error' });
    }
});



// Assign an accountant to current user (must be business owner)
router.post('/assign', authenticate, assignAccountant);

router.get('/getUsersByRole', authenticate, getUsersByRole);

module.exports = router;
