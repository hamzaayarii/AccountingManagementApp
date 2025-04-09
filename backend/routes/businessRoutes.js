const express = require('express');
const router = express.Router();
const { updateBusiness, deleteBusiness, assignAccountant, getAccountant, addBusiness, getUserBusinesses, checkUserBusiness } = require('../controllers/businessController');
const { authenticate, authorizeBusinessOwner, authorizeAccountant } = require('../middlewares/authMiddleware');
const Business = require('../models/Business');

// Apply authentication middleware to all business routes
router.use(authenticate);

// Business routes
router.post('/register', authorizeBusinessOwner, addBusiness); // Only business owners can add businesses

// Get businesses for both owners and accountants
router.get('/user-businesses', getUserBusinesses);

router.get('/check', checkUserBusiness);

router.get('/list-accountant', getAccountant);


router.post('/assign-accountant', assignAccountant);
router.put('/updatebusiness/:businessId', authenticate, updateBusiness);
router.delete('/deletebusiness/:businessId', authenticate, deleteBusiness);


module.exports = router;