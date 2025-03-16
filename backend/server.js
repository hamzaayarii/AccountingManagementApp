const express = require('express');
const cors = require('cors');
const mongoose = require('mongoose');
const jwt = require('jsonwebtoken');
const dbConfig = require('./config/db.json'); // MongoDB connection config
const userRoutes = require('./routes/userRoutes'); // User routes
const User = require('./models/User'); // Import the User model

const purchaseRoutes = require('./routes/purchaseRoutes');
const productRoutes = require('./routes/productRoutes'); // Product routes
const salesReceiptsRoutes = require('./routes/salesReceipts'); // Sales Receipts routes
const invoiceRoutes = require('./routes/invoiceRoutes');
const Product = require('./models/Product'); // Import the Product model

const expenseRoutes = require('./routes/expenseRoutes');
const invoice1Routes = require('./routes/invoice1Routes');

const { authenticate } = require('./middlewares/authMiddleware');

//const taxReportsRoutes = require('./routes/taxReportsRoutes');

const businessRoutes = require('./routes/businessRoutes');
const cookieParser = require('cookie-parser');

const app = express();

// MongoDB connection
mongoose.connect(dbConfig.mongodb.url, { useNewUrlParser: true, useUnifiedTopology: true })
    .then(() => console.log('Connected to MongoDB'))
    .catch((err) => console.error('Failed to connect to MongoDB:', err));

// Middleware
app.use(cors({ origin: 'http://localhost:3000', methods: 'GET,POST,PUT,DELETE', credentials: true }));
app.use(express.json());  // To parse JSON request bodies

app.use(cookieParser());
// Routes
app.use('/api/users', userRoutes);  // User routes
app.use('/api/products', productRoutes);  // Products routes
app.use('/api/salesReceipts', salesReceiptsRoutes);  // Sales Receipts routes
app.use('/api/purchases', purchaseRoutes);
app.use('/api/invoices', invoiceRoutes);
app.use('/api/invoices1', invoice1Routes);
app.use('/uploads', express.static('uploads'));
app.use('/api/expenses', expenseRoutes);

//problem here
//app.use('/api/taxReports', taxReportsRoutes);  // Tax Reports routes
app.use('/api/business', businessRoutes); /// api/business/add

// Fetch user data by ID (API route)
app.get('/api/users/:id', authenticate, async (req, res) => {
    const { id } = req.params;
    try {
        const user = await User.findById(id).select('-password');
        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }
        res.json({ user });
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: 'Server error' });
    }
});



// Base route
app.get('/', (req, res) => {
    res.send('Welcome to AccountingManagementApp');
});

// Start the server
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});
