const DailyRevenue = require('../models/DailyRevenue');
const JournalEntry = require('../models/JournalEntry');
const Business = require('../models/Business');
const User = require('../models/User');

// Helper function to get businesses for current user
const getBusinessesForUser = async (user) => {
    if (user.role === 'accountant') {
        // Find all business owners assigned to this accountant
        const owners = await User.find({ role: 'business_owner', assignedTo: user._id }).select('_id');
        const ownerIds = owners.map(o => o._id);
        if (ownerIds.length === 0) return [];
        return await Business.find({ owner: { $in: ownerIds } });
    } else {
        // Business owner: just their own businesses
        return await Business.find({ owner: user._id });
    }
};

// Create a new daily revenue entry
exports.create = async (req, res) => {
    try {
        console.log('User from request:', req.user);
        const businesses = await getBusinessesForUser(req.user);
        const business = businesses[0]; // For create, just use the first (or you may want to select by some criteria)
        console.log('Found business:', business);
        if (!business) {
            return res.status(404).json({ success: false, message: 'Business not found' });
        }

        // Check if an entry already exists for this date
        const existingEntry = await DailyRevenue.findOne({
            business: business._id,
            date: new Date(req.body.date)
        });

        if (existingEntry) {
            return res.status(400).json({
                success: false,
                message: 'A daily revenue entry already exists for this date'
            });
        }

        const dailyRevenue = new DailyRevenue({
            ...req.body,
            business: business._id
        });

        await dailyRevenue.save();

        // If autoJournalEntry is true, create a journal entry
        if (dailyRevenue.autoJournalEntry) {
            const currentYear = new Date(dailyRevenue.date).getFullYear().toString();
            const journalEntry = new JournalEntry({
                date: dailyRevenue.date,
                description: `Daily Revenue Entry - ${new Date(dailyRevenue.date).toLocaleDateString()}`,
                reference: {
                    type: 'DAILY_REVENUE',
                    documentId: dailyRevenue._id
                },
                business: business._id,
                fiscalYear: currentYear,
                entries: [],
                status: 'DRAFT'
            });

            // Add cash revenue entries
            if (dailyRevenue.revenues.cash.netCash !== 0) {
                journalEntry.entries.push({
                    accountNumber: '5700', // Cash account
                    accountName: 'Cash',
                    accountType: 'FINANCIAL_ACCOUNTS',
                    debit: dailyRevenue.revenues.cash.netCash > 0 ? dailyRevenue.revenues.cash.netCash : 0,
                    credit: dailyRevenue.revenues.cash.netCash < 0 ? -dailyRevenue.revenues.cash.netCash : 0,
                    description: 'Daily cash revenue'
                });
            }

            // Add card revenue entries
            if (dailyRevenue.revenues.card.netCard !== 0) {
                journalEntry.entries.push({
                    accountNumber: '4110', // Accounts Receivable
                    accountName: 'Accounts Receivable - Card Payments',
                    accountType: 'THIRD_PARTY',
                    debit: dailyRevenue.revenues.card.netCard > 0 ? dailyRevenue.revenues.card.netCard : 0,
                    credit: dailyRevenue.revenues.card.netCard < 0 ? -dailyRevenue.revenues.card.netCard : 0,
                    description: 'Daily card revenue'
                });
            }

            // Add revenue entry
            if (dailyRevenue.summary.totalRevenue !== 0) {
                journalEntry.entries.push({
                    accountNumber: '7000', // Sales Revenue
                    accountName: 'Sales Revenue',
                    accountType: 'REVENUE',
                    debit: dailyRevenue.summary.totalRevenue < 0 ? -dailyRevenue.summary.totalRevenue : 0,
                    credit: dailyRevenue.summary.totalRevenue > 0 ? dailyRevenue.summary.totalRevenue : 0,
                    description: 'Daily total revenue'
                });
            }

            // Calculate totals
            journalEntry.totalDebit = journalEntry.entries.reduce((sum, entry) => sum + (entry.debit || 0), 0);
            journalEntry.totalCredit = journalEntry.entries.reduce((sum, entry) => sum + (entry.credit || 0), 0);

            // Generate piece number
            const year = new Date(dailyRevenue.date).getFullYear();
            const lastEntry = await JournalEntry.findOne({
                pieceNumber: new RegExp(`^JE-${year}`)
            }).sort({ pieceNumber: -1 });

            let sequence = '00001';
            if (lastEntry) {
                const lastSequence = parseInt(lastEntry.pieceNumber.split('-')[2]);
                sequence = String(lastSequence + 1).padStart(5, '0');
            }

            journalEntry.pieceNumber = `JE-${year}-${sequence}`;

            // Save the journal entry
            const savedJournalEntry = await journalEntry.save();
            
            // Update the daily revenue with the journal entry reference
            dailyRevenue.journalEntry = savedJournalEntry._id;
        }

        // Save the daily revenue
        const savedDailyRevenue = await dailyRevenue.save();
        res.status(201).json(savedDailyRevenue);
    } catch (error) {
        console.error('Error creating daily revenue:', error);
        res.status(400).json({
            success: false,
            message: error.message
        });
    }
};

// Get all daily revenue entries for businesses
exports.list = async (req, res) => {
    try {
        const businesses = await getBusinessesForUser(req.user);
        if (!businesses || businesses.length === 0) {
            return res.status(404).json({ success: false, message: 'Business not found' });
        }
        const businessIds = businesses.map(b => b._id);
        const dailyRevenues = await DailyRevenue.find({ business: { $in: businessIds } })
            .sort({ date: -1 })
            .populate('journalEntry');
        res.json({
            success: true,
            data: dailyRevenues
        });
    } catch (error) {
        res.status(400).json({
            success: false,
            message: error.message
        });
    }
};

// Get a single daily revenue entry
exports.get = async (req, res) => {
    try {
        const businesses = await getBusinessesForUser(req.user);
        if (!businesses || businesses.length === 0) {
            return res.status(404).json({ success: false, message: 'Business not found' });
        }
        const businessIds = businesses.map(b => b._id);
        const dailyRevenue = await DailyRevenue.findOne({
            _id: req.params.id,
            business: { $in: businessIds }
        }).populate('journalEntry');
        if (!dailyRevenue) {
            return res.status(404).json({
                success: false,
                message: 'Daily revenue entry not found'
            });
        }
        res.json({
            success: true,
            data: dailyRevenue
        });
    } catch (error) {
        res.status(400).json({
            success: false,
            message: error.message
        });
    }
};

// Update a daily revenue entry
exports.update = async (req, res) => {
    try {
        const businesses = await getBusinessesForUser(req.user);
        if (!businesses || businesses.length === 0) {
            return res.status(404).json({ success: false, message: 'Business not found' });
        }
        const businessIds = businesses.map(b => b._id);
        const dailyRevenue = await DailyRevenue.findOne({
            _id: req.params.id,
            business: { $in: businessIds }
        });
        if (!dailyRevenue) {
            return res.status(404).json({
                success: false,
                message: 'Daily revenue entry not found'
            });
        }
        if (dailyRevenue.status === 'VERIFIED') {
            return res.status(400).json({
                success: false,
                message: 'Cannot update a verified daily revenue entry'
            });
        }
        // Update the entry
        Object.assign(dailyRevenue, req.body);
        await dailyRevenue.save();
        // Update or create journal entry if needed
        if (dailyRevenue.autoJournalEntry) {
            // Similar journal entry creation logic as in create function
            // You might want to update the existing journal entry or create a new one
        }
        res.json({
            success: true,
            data: dailyRevenue
        });
    } catch (error) {
        res.status(400).json({
            success: false,
            message: error.message
        });
    }
};

// Delete a daily revenue entry
exports.delete = async (req, res) => {
    try {
        const businesses = await getBusinessesForUser(req.user);
        if (!businesses || businesses.length === 0) {
            return res.status(404).json({ success: false, message: 'Business not found' });
        }
        const businessIds = businesses.map(b => b._id);
        const dailyRevenue = await DailyRevenue.findOne({
            _id: req.params.id,
            business: { $in: businessIds }
        });
        if (!dailyRevenue) {
            return res.status(404).json({
                success: false,
                message: 'Daily revenue entry not found'
            });
        }
        // Check if the entry is verified
        if (dailyRevenue.status === 'VERIFIED') {
            return res.status(400).json({
                success: false,
                message: 'Cannot delete a verified entry'
            });
        }
        // If there's an associated journal entry, delete it first
        if (dailyRevenue.journalEntry) {
            await JournalEntry.findByIdAndDelete(dailyRevenue.journalEntry);
        }
        // Delete the daily revenue entry
        await DailyRevenue.findByIdAndDelete(req.params.id);
        res.json({
            success: true,
            message: 'Daily revenue entry deleted successfully'
        });
    } catch (error) {
        console.error('Error deleting daily revenue:', error);
        res.status(500).json({
            success: false,
            message: error.message || 'Error deleting daily revenue entry'
        });
    }
};

// Update status of a daily revenue entry
exports.updateStatus = async (req, res) => {
    try {
        const businesses = await getBusinessesForUser(req.user);
        if (!businesses || businesses.length === 0) {
            return res.status(404).json({ success: false, message: 'Business not found' });
        }
        const businessIds = businesses.map(b => b._id);
        const dailyRevenue = await DailyRevenue.findOne({
            _id: req.params.id,
            business: { $in: businessIds }
        });
        if (!dailyRevenue) {
            return res.status(404).json({
                success: false,
                message: 'Daily revenue entry not found'
            });
        }
        const { status } = req.body;
        if (!['DRAFT', 'POSTED', 'VERIFIED'].includes(status)) {
            return res.status(400).json({
                success: false,
                message: 'Invalid status'
            });
        }
        // Validate status transition
        if (dailyRevenue.status === 'VERIFIED') {
            return res.status(400).json({
                success: false,
                message: 'Cannot change status of a verified entry'
            });
        }
        if (status === 'VERIFIED' && dailyRevenue.status !== 'POSTED') {
            return res.status(400).json({
                success: false,
                message: 'Entry must be posted before verification'
            });
        }
        dailyRevenue.status = status;
        await dailyRevenue.save();
        res.json({
            success: true,
            data: dailyRevenue
        });
    } catch (error) {
        res.status(400).json({
            success: false,
            message: error.message
        });
    }
}; 