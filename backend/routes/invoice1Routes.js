const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const router = express.Router();
const Invoice = require('../models/Invoice1');

// Ensure upload directory exists
const uploadDir = 'uploads/invoices/';
if (!fs.existsSync(uploadDir)) {
    fs.mkdirSync(uploadDir, { recursive: true });
}

// Multer setup for file uploads
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, uploadDir);
    },
    filename: (req, file, cb) => {
        cb(null, Date.now() + '-' + file.originalname);
    }
});
const upload = multer({ storage });

// Add a new invoice
router.post('/', upload.single('file'), async (req, res) => {
    const { invoiceName, invoiceType } = req.body;
    if (!invoiceName || !invoiceType || !req.file) {
        return res.status(400).json({ error: 'All fields are required' });
    }

    try {
        const invoice = new Invoice({
            invoiceName,
            invoiceType,
            filePath: req.file.path
        });
        await invoice.save();
        res.status(201).json(invoice);
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: 'Server error' });
    }
});

// Retrieve invoices
router.get('/', async (req, res) => {
    try {
        const invoices = await Invoice.find();
        res.json(invoices);
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: 'Server error' });
    }
});

// Serve uploaded PDFs
router.get('/file/:filename', (req, res) => {
    const filePath = path.join(__dirname, '../uploads/invoices/', req.params.filename);
    res.sendFile(filePath);
});

module.exports = router;