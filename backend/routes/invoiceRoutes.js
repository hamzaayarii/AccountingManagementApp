const express = require('express');
const Invoice = require('../models/Invoice');
const PDFDocument = require('pdfkit');
const authenticate = require('../middlewares/authMiddleware');
require('dotenv').config();

const router = express.Router();

// 📌 Générer un PDF pour une facture
router.get('/:id/pdf', async (req, res) => {
    try {
        const invoice = await Invoice.findById(req.params.id);
        if (!invoice) return res.status(404).json({ message: 'Facture non trouvée' });

        // Création du document PDF
        const doc = new PDFDocument({
            size: 'A4',
            margin: 50,
            info: {
                Title: `Facture ${invoice.invoiceNumber}`,
                Author: 'Votre Entreprise',
                Subject: 'Facture Client',
                CreationDate: new Date()
            }
        });

        // Configuration des en-têtes HTTP
        res.setHeader('Content-Type', 'application/pdf');
        res.setHeader('Content-Disposition', `attachment; filename=facture_${invoice.invoiceNumber}.pdf`);
        doc.pipe(res);

        let currentPage = 1;
        const itemsPerPage = 15; // Nombre d'articles par page
        const totalPages = Math.ceil(invoice.items.length / itemsPerPage); // Calcul du nombre total de pages

        // Fonction pour ajouter un en-tête
        const addHeader = () => {
            doc.rect(0, 0, 612, 80).fill('#4facfe');
            doc.fillColor('white')
                .fontSize(24)
                .font('Helvetica-Bold')
                .text(`Facture N° ${invoice.invoiceNumber}`, 50, 30);

            doc.fillColor('#ffffff')
                .fontSize(10)
                .font('Helvetica')
                .text('Votre Entreprise', 400, 20, { align: 'right' })
                .text('123 Rue Exemple, Tunis', 400, 35, { align: 'right' })
                .text('contact@votreentreprise.com', 400, 50, { align: 'right' });
        };

        // Fonction pour ajouter un pied de page
        const addFooter = () => {
            doc.moveTo(50, 700).lineTo(562, 700).strokeColor('#ddd').stroke();
            doc.fontSize(10)
                .fillColor('#666')
                .text('Merci pour votre confiance!', 50, 720, { align: 'center' })
                .text('Conditions de paiement: 30 jours net', 50, 735, { align: 'center' })
                .text(`Page ${currentPage} de ${totalPages}`, 562, 735, { align: 'right' });
        };

        // Ajout de l'en-tête initial
        addHeader();

        // Informations client et facture
        doc.moveDown(6)
            .fillColor('#333333')
            .fontSize(12)
            .font('Helvetica-Bold')
            .text('Destinataire:', 50)
            .font('Helvetica')
            .text(invoice.customerName, 130, doc.y - 15)
            .moveDown();

        doc.font('Helvetica-Bold')
            .text('Détails de la facture:', 50)
            .font('Helvetica')
            .text(`Numéro de facture: ${invoice.invoiceNumber}`, 50, doc.y + 5)
            .text(`Numéro de commande: ${invoice.orderNumber || 'N/A'}`, 50, doc.y + 5)
            .text(`Date d'émission: ${new Date(invoice.invoiceDate).toLocaleDateString('fr-FR')}`, 50, doc.y + 5)
            .text(`Date d'échéance: ${new Date(invoice.dueDate).toLocaleDateString('fr-FR')}`, 50, doc.y + 5);

        // Tableau des articles
        doc.moveDown(2);
        const drawTableHeader = () => {
            const startX = 50;
            const startY = doc.y;
            const rowHeight = 25;
            const colWidths = [200, 60, 100, 70, 80];

            doc.rect(startX, startY, 512, rowHeight).fill('#f0f0f0');
            doc.fillColor('#333333').fontSize(10).font('Helvetica-Bold');

            let currentX = startX + 5;
            doc.text('Description', currentX, startY + 8, { width: colWidths[0], align: 'left' });
            currentX += colWidths[0];
            doc.text('Qté', currentX, startY + 8, { width: colWidths[1], align: 'center' });
            currentX += colWidths[1];
            doc.text('Prix unitaire', currentX, startY + 8, { width: colWidths[2], align: 'center' });
            currentX += colWidths[2];
            doc.text('Taxe', currentX, startY + 8, { width: colWidths[3], align: 'center' });
            currentX += colWidths[3];
            doc.text('Montant', currentX, startY + 8, { width: colWidths[4], align: 'center' });

            doc.moveTo(startX, startY).lineTo(startX + 512, startY).stroke();
            doc.moveTo(startX, startY + rowHeight).lineTo(startX + 512, startY + rowHeight).stroke();
            currentX = startX;
            for (let i = 0; i < colWidths.length; i++) {
                doc.moveTo(currentX, startY).lineTo(currentX, startY + rowHeight).stroke();
                currentX += colWidths[i];
            }
            doc.moveDown();
        };

        drawTableHeader();
        let position = doc.y + 25;

        invoice.items.forEach((item, index) => {
            if (index > 0 && index % itemsPerPage === 0) {
                addFooter();
                doc.addPage();
                currentPage++;
                addHeader();
                drawTableHeader();
                position = doc.y + 25;
            }

            const y = position + ((index % itemsPerPage) * 20);
            let currentX = 50;

            doc.fillColor('#333333')
                .fontSize(10)
                .font('Helvetica');

            doc.text(item.itemDetails.length > 40 ? item.itemDetails.substring(0, 40) + '...' : item.itemDetails, currentX + 5, y, {
                width: 195,
                align: 'left'
            });
            currentX += 200;
            doc.text(item.quantity.toString(), currentX, y, { width: 60, align: 'center' });
            currentX += 60;
            doc.text(`${item.rate.toFixed(2)} TND`, currentX, y, { width: 100, align: 'right' });
            currentX += 100;
            doc.text(item.tax ? `${item.tax.toFixed(2)} TND` : '0.00 TND', currentX, y, { width: 70, align: 'right' });
            currentX += 70;
            doc.text(`${item.amount.toFixed(2)} TND`, currentX, y, { width: 80, align: 'right' });

            doc.moveTo(50, y + 15).lineTo(562, y + 15).strokeColor('#ddd').dash(2, { space: 2 }).stroke();
        });

        const lastItemPosition = position + ((invoice.items.length % itemsPerPage || itemsPerPage) * 20);
        let totalsTop = lastItemPosition + 20;

        if (totalsTop + 100 > 650) {
            addFooter();
            doc.addPage();
            currentPage++;
            addHeader();
            totalsTop = 100;
        }

        const totalsTableWidth = 250;
        const totalsTableLeft = 562 - totalsTableWidth;

        doc.rect(totalsTableLeft, totalsTop, totalsTableWidth, 20).fill('#f0f0f0');
        doc.fillColor('#333333')
            .fontSize(10)
            .font('Helvetica-Bold')
            .text('Description', totalsTableLeft + 5, totalsTop + 5)
            .text('Montant', totalsTableLeft + 180, totalsTop + 5, { width: 65, align: 'right' });

        const totalsData = [
            { label: 'Sous-total', value: `${invoice.subTotal.toFixed(2)} TND` },
            { label: 'Remise', value: `${invoice.discount.toFixed(2)} TND` },
            { label: 'Frais de livraison', value: `${invoice.shippingCharges.toFixed(2)} TND` }
        ];

        totalsData.forEach((row, index) => {
            const y = totalsTop + 20 + (index * 15);
            doc.fillColor('#333333')
                .fontSize(10)
                .font('Helvetica')
                .text(row.label, totalsTableLeft + 5, y + 3)
                .text(row.value, totalsTableLeft + 180, y + 3, { width: 65, align: 'right' });
            doc.moveTo(totalsTableLeft, y + 15).lineTo(totalsTableLeft + totalsTableWidth, y + 15).strokeColor('#ddd').stroke();
        });

        const totalRowY = totalsTop + 20 + (totalsData.length * 15);
        doc.rect(totalsTableLeft, totalRowY, totalsTableWidth, 20).fill('#e6f3ff');
        doc.fillColor('#4facfe')
            .fontSize(12)
            .font('Helvetica-Bold')
            .text('TOTAL', totalsTableLeft + 5, totalRowY + 5)
            .fillColor('#333333')
            .text(`${invoice.total.toFixed(2)} TND`, totalsTableLeft + 180, totalRowY + 5, { width: 65, align: 'right' });

        addFooter();
        doc.end();
    } catch (error) {
        console.error('Erreur lors de la génération du PDF:', error);
        res.status(500).json({ message: 'Erreur serveur lors de la génération du PDF' });
    }
});

// 📌 Ajouter une facture
router.post('/', async (req, res) => {
    try {
        const invoice = new Invoice(req.body);
        await invoice.save();
        res.status(201).json(invoice);
    } catch (error) {
        res.status(400).json({ message: error.message });
    }
});

// 📌 Récupérer toutes les factures
router.get('/', async (req, res) => {
    try {
        const invoices = await Invoice.find();
        res.json(invoices);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

// 📌 Récupérer une facture par ID
router.get('/:id', async (req, res) => {
    try {
        const invoice = await Invoice.findById(req.params.id);
        if (!invoice) return res.status(404).json({ message: 'Facture non trouvée' });
        res.json(invoice);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

// 📌 Mettre à jour une facture
router.put('/:id', async (req, res) => {
    try {
        const updatedInvoice = await Invoice.findByIdAndUpdate(req.params.id, req.body, { new: true });
        if (!updatedInvoice) return res.status(404).json({ message: 'Facture non trouvée' });
        res.json(updatedInvoice);
    } catch (error) {
        res.status(400).json({ message: error.message });
    }
});

// 📌 Supprimer une facture
router.delete('/:id', async (req, res) => {
    try {
        const deletedInvoice = await Invoice.findByIdAndDelete(req.params.id);
        if (!deletedInvoice) return res.status(404).json({ message: 'Facture non trouvée' });
        res.json({ message: 'Facture supprimée avec succès' });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

module.exports = router;