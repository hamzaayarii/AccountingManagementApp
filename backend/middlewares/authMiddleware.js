const jwt = require('jsonwebtoken');
const SECRET_KEY = process.env.SECRET_KEY || 'your_secret_key';

const authenticate = (req, res, next) => {
    const token = req.headers.authorization?.split(' ')[1]; // Extraire le token du header Authorization

    if (!token) {
        return res.status(401).json({ message: 'Token is required' });
    }

    jwt.verify(token, SECRET_KEY, (err, decoded) => {
        if (err) {
            return res.status(403).json({ message: 'Invalid or expired token' });
        }
        req.user = decoded; // Stocker les informations de l'utilisateur décodées dans la requête
        next();
    });
};

module.exports = authenticate;
