const jwt = require('jsonwebtoken');
const SECRET_KEY = process.env.SECRET_KEY || 'your_secret_key';

const authenticate = (req, res, next) => {
    // First try to get token from Authorization header
    let token = req.headers.authorization?.split(' ')[1];

    // If not in header, try to get from cookies
    if (!token && req.cookies) {
        token = req.cookies.token;
    }

    if (!token) {
        return res.status(401).json({ message: 'Token is required' });
    }

    jwt.verify(token, SECRET_KEY, (err, decoded) => {
        if (err) {
            console.error('Token verification error:', err);
            return res.status(403).json({ message: 'Invalid or expired token' });
        }
        req.user = decoded;
        next();
    });
};

// Middleware to authorize accountants
const authorizeAccountant = (req, res, next) => {
    if (req.user.role !== 'ACCOUNTANT' && req.user.role !== 'ADMIN') {
        return res.status(403).json({ message: 'Access denied, accountant privileges required' });
    }
    next();
};

// Middleware to authorize business owners
const authorizeBusinessOwner = (req, res, next) => {
    if (req.user.role !== 'business_owner' && req.user.role !== 'admin') {
        return res.status(403).json({ message: 'Access denied, business owner privileges required' });
    }
    next();
};

module.exports = {
    authenticate,
    authorizeAccountant,
    authorizeBusinessOwner
};