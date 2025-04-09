const Business = require('../models/Business');
const User = require('../models/User.js');
const addBusiness = async (req, res) => {
    try {
        const { 
            name, 
            address, 
            country, 
            state, 
            type, 
            businessActivity, 
            taxNumber, 
            rneNumber,
            phone, 
            capital,
            vatRegistration,
            exportOriented,
            employeeCount,
            email // This is the problematic field
        } = req.body;
        
        const userId = req.user._id;

        // 1. Validate required fields
        const requiredFields = { name, type, taxNumber, rneNumber, address, country, state, phone };
        const missingFields = Object.entries(requiredFields)
            .filter(([_, value]) => !value)
            .map(([key]) => key);

        if (missingFields.length > 0) {
            return res.status(400).json({
                success: false,
                message: `Missing required fields: ${missingFields.join(', ')}`
            });
        }

        // 2. Validate formats
        if (!/^\d{11}$/.test(rneNumber)) {
            return res.status(400).json({
                success: false,
                message: "RNE number must be exactly 11 digits"
            });
        }

        if (!/^\d{8}[A-Z](\/[A-Z])?\/\d{3}$/.test(taxNumber)) {
            return res.status(400).json({
                success: false,
                message: "Tax number should be in format 12345678A/M/000"
            });
        }

        // 3. Check for existing identifiers (RNE and tax number)
        const existingBusiness = await Business.findOne({ 
            $or: [
                { rneNumber },
                { taxNumber }
            ]
        }).select('rneNumber taxNumber');

        if (existingBusiness) {
            const conflictField = existingBusiness.rneNumber === rneNumber 
                ? 'RNE number' 
                : 'tax number';
            
            return res.status(409).json({
                success: false,
                message: `This ${conflictField} is already registered`
            });
        }

        // 4. Create new business (make email optional or handle duplicates)
        const newBusiness = new Business({
            name,
            address,
            country,
            state,
            type,
            businessActivity,
            taxNumber,
            rneNumber,
            phone,
            email: email || null, // Make email optional by setting to null if empty
            capital: capital || 0,
            vatRegistration: Boolean(vatRegistration),
            exportOriented: Boolean(exportOriented),
            employeeCount: employeeCount || '1-5',
            owner: userId,
            status: 'pending'
        });

        await newBusiness.save();

        return res.status(201).json({
            success: true,
            message: "Business registered successfully",
            businessId: newBusiness._id
        });

    } catch (error) {
        console.error('Registration error:', error);
        
        // Handle duplicate key errors
        if (error.code === 11000) {
            const duplicateField = Object.keys(error.keyPattern)[0];
            const fieldName = duplicateField === 'taxNumber' ? 'tax number' : 
                           duplicateField === 'rneNumber' ? 'RNE number' :
                           duplicateField === 'email' ? 'email' :
                           duplicateField;
            
            return res.status(409).json({
                success: false,
                message: `This ${fieldName} is already registered`,
                field: duplicateField
            });
        }
        
        // Handle validation errors
        if (error.name === 'ValidationError') {
            const errors = Object.values(error.errors).map(err => err.message);
            return res.status(400).json({
                success: false,
                message: "Validation failed",
                errors
            });
        }
        
        // Handle other errors
        return res.status(500).json({
            success: false,
            message: "Internal server error"
        });
    }
};

// New function to get businesses for the logged-in user
const getUserBusinesses = async (req, res) => {
    try {
        const userId = req.user._id || req.user.id;
        const businesses = await Business.find({ owner: userId });
        res.status(200).json({
            status: true,
            businesses
        });
    } catch (error) {
        console.error('Error getting user businesses:', error);
        res.status(500).json({
            errorMessage: "Something went wrong!",
            status: false,
            error: error.message,
        });
    }
};

const checkUserBusiness = async (req, res) => {
    try {
        const userId = req.user._id || req.user.id;
        const businesses = await Business.find({ owner: userId });

        res.json({
            hasBusiness: businesses.length > 0,
            businesses
        });
    } catch (error) {
        console.error('Error checking user business:', error);
        res.status(500).json({
            message: 'Server error',
            error: error.message
        });
    }
};

// Updated getAccountant controller function
const getAccountant = async (req, res) => {
    try {
        const role = req.query.role || "accountant";

        if (role !== "accountant") {
            return res.status(400).json({ message: "Invalid role requested." });
        }

        const accountants = await User.find({ role: "accountant" });
        res.json(accountants);
    } catch (error) {
        console.error('Error getting accountants:', error);
        res.status(500).json({ message: "Server error", error: error.message });
    }
};

const assignAccountant = async (req, res) => {
    try {
        const { accountantId } = req.body;
        const userId = req.user._id || req.user.id;

        if (!accountantId) {
            return res.status(400).json({ message: "Accountant ID is required." });
        }

        // Update business with assigned accountant
        const business = await Business.findOne({ owner: userId });
        if (!business) {
            return res.status(404).json({ message: "Business not found." });
        }

        business.accountant = accountantId;
        await business.save();

        res.json({ message: "Accountant assigned successfully.", business });
    } catch (error) {
        console.error('Error assigning accountant:', error);
        res.status(500).json({ message: "Server error", error: error.message });
    }
};

const deleteBusiness = async (req, res) => {
    try {
        const { businessId } = req.params;

        const deletedBusiness = await Business.findByIdAndDelete(businessId);
        if (!deletedBusiness) {
            return res.status(404).json({ message: "Business not found." });
        }

        res.json({ message: "Business deleted successfully." });
    } catch (error) {
        res.status(500).json({ message: "Error deleting business", error });
    }
};
const updateBusiness = async (req, res) => {
    try {
        const { businessId } = req.params;
        const updates = req.body;

        const updatedBusiness = await Business.findByIdAndUpdate(businessId, updates, { new: true });
        if (!updatedBusiness) {
            return res.status(404).json({ message: "Business not found." });
        }

        res.json({ message: "Business updated successfully.", business: updatedBusiness });
    } catch (error) {
        res.status(500).json({ message: "Error updating business", error });
    }
};

module.exports = { deleteBusiness, updateBusiness, assignAccountant, getAccountant, addBusiness, getUserBusinesses, checkUserBusiness };
