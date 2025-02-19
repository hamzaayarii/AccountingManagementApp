const express = require('express');
const cors = require('cors');
const mongoose = require('mongoose');
const dbConfig = require('./config/db.json');  // MongoDB connection config
const userRoutes = require('./routes/userRoutes');  // User routes

const app = express();

// MongoDB connection
mongoose.connect(dbConfig.mongodb.url, { useNewUrlParser: true, useUnifiedTopology: true })
    .then(() => console.log('Connected to MongoDB'))
    .catch((err) => console.error('Failed to connect to MongoDB:', err));

// Middleware
app.use(cors({ origin: 'http://localhost:3000', credentials: true }));
app.use(express.json());  // To parse JSON request bodies

// Routes
app.use('/users', userRoutes);

// Base route
app.get('/', (req, res) => {
    res.send('Welcome to AccountingManagementApp');
});

// Start the server
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});
