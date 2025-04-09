const express = require('express');
const router = express.Router();
const FinancialStatement = require('../models/FinancialStatement');
const Invoice = require('../models/Invoice');
const Business = require('../models/Business');
const { authenticate } = require('../middlewares/authMiddleware');
const asyncHandler = require('../utils/asyncHandler');

// Generate a simplified balance sheet
router.post('/generate-balance-sheet', authenticate, asyncHandler(async (req, res) => {
    const { businessId, periodStart, periodEnd } = req.body;

    if (!businessId || !periodStart || !periodEnd) {
        return res.status(400).json({ message: 'Missing required fields' });
    }

    // Verify user has access to the business
    const business = await Business.findById(businessId);
    if (!business) {
        return res.status(404).json({ message: 'Business not found' });
    }

    // Check if user has permission (owner or accountant)
    const userRole = req.user.role;
    const userId = req.user._id || req.user.id;

    if (userRole === 'business_owner' && business.owner.toString() !== userId) {
        return res.status(403).json({ message: 'You do not have permission to access this business' });
    }

    if (userRole === 'accountant' && business.accountant?.toString() !== userId) {
        return res.status(403).json({ message: 'You are not the assigned accountant for this business' });
    }

    // Récupérer les factures pour la période donnée
    const invoices = await Invoice.find({
        businessId,
        invoiceDate: { $gte: new Date(periodStart), $lte: new Date(periodEnd) }
    });

    // Calculer les actifs (créances clients, trésorerie)
    const totalReceivables = invoices
        .filter(invoice => invoice.status !== 'paid')
        .reduce((sum, invoice) => sum + invoice.total, 0);

    // Calculer les passifs (dettes fournisseurs, etc.)
    // Note : Vous devrez ajouter un modèle pour les dettes fournisseurs si nécessaire
    const totalLiabilities = 0; // À implémenter selon vos besoins

    const balanceSheet = {
        assets: {
            receivables: totalReceivables,
            cash: 0 // À implémenter (par exemple, via intégration bancaire)
        },
        liabilities: {
            payables: totalLiabilities
        },
        equity: totalReceivables - totalLiabilities
    };

    const financialStatement = new FinancialStatement({
        businessId,
        userId: req.user._id,
        type: 'balance_sheet',
        periodStart: new Date(periodStart),
        periodEnd: new Date(periodEnd),
        data: balanceSheet
    });

    await financialStatement.save();
    res.status(201).json({ message: 'Bilan généré avec succès', financialStatement });
}));

module.exports = router;