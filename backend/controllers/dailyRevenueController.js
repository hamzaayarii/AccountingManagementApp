const DailyRevenue = require('../models/DailyRevenue');
const JournalEntry = require('../models/JournalEntry');
const Business = require('../models/Business');

// Create a new daily revenue entry
exports.create = async (req, res) => {
    try {
        console.log('User from request:', req.user);
        const business = await Business.findOne({ owner: req.user._id });
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

// Get all daily revenue entries for a business
exports.list = async (req, res) => {
    try {
        const { business: businessId } = req.query;

        if (!businessId) {
            return res.status(400).json({ 
                success: false, 
                message: 'Business ID is required' 
            });
        }

        // Check if user is authorized for this business
        const business = await Business.findOne({
            _id: businessId,
            $or: [
                { owner: req.user._id },
                { accountant: req.user._id }
            ]
        });

        if (!business) {
            return res.status(404).json({ 
                success: false, 
                message: 'Business not found or unauthorized' 
            });
        }

        const dailyRevenues = await DailyRevenue.find({ business: businessId })
            .sort({ date: -1 });

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
        const business = await Business.findOne({ owner: req.user._id });
        if (!business) {
            return res.status(404).json({ success: false, message: 'Business not found' });
        }

        const dailyRevenue = await DailyRevenue.findOne({
            _id: req.params.id,
            business: business._id
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
        const business = await Business.findOne({ owner: req.user._id });
        if (!business) {
            return res.status(404).json({ success: false, message: 'Business not found' });
        }

        const dailyRevenue = await DailyRevenue.findOne({
            _id: req.params.id,
            business: business._id
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
        const business = await Business.findOne({ owner: req.user._id });
        if (!business) {
            return res.status(404).json({ success: false, message: 'Business not found' });
        }

        const dailyRevenue = await DailyRevenue.findOne({
            _id: req.params.id,
            business: business._id
        });

        if (!dailyRevenue) {
            return res.status(404).json({
                success: false,
                message: 'Daily revenue entry not found'
            });
        }

        if (dailyRevenue.status !== 'DRAFT') {
            return res.status(400).json({
                success: false,
                message: 'Can only delete draft entries'
            });
        }

        // Delete associated journal entry if it exists
        if (dailyRevenue.journalEntry) {
            await JournalEntry.findByIdAndDelete(dailyRevenue.journalEntry);
        }

        await DailyRevenue.deleteOne({ _id: dailyRevenue._id });

        res.json({
            success: true,
            message: 'Daily revenue entry deleted successfully'
        });
    } catch (error) {
        res.status(400).json({
            success: false,
            message: error.message
        });
    }
};

// Update status of a daily revenue entry
exports.updateStatus = async (req, res) => {
    try {
        const business = await Business.findOne({ owner: req.user._id });
        if (!business) {
            return res.status(404).json({ success: false, message: 'Business not found' });
        }

        const dailyRevenue = await DailyRevenue.findOne({
            _id: req.params.id,
            business: business._id
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