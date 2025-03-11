import React, { useState } from 'react';
import axios from 'axios';

const CreateInvoice = () => {
    const [invoice, setInvoice] = useState({
        customerName: '',
        invoiceNumber: '',
        orderNumber: '',
        invoiceDate: new Date().toISOString().split('T')[0],
        dueDate: '',
        items: [{ itemDetails: '', quantity: 1, rate: 0, tax: 0, amount: 0 }],
        subTotal: 0,
        discount: 0,
        shippingCharges: 0,
        adjustment: 0,
        total: 0,
        customerNotes: ''
    });

    const calculateAmount = (item) => {
        const qty = parseFloat(item.quantity) || 0;
        const rate = parseFloat(item.rate) || 0;
        const tax = parseFloat(item.tax) || 0;
        return qty >= 0 && rate >= 0 ? (qty * rate) + tax : 0;
    };

    const calculateTotals = (items) => {
        const subTotal = items.reduce((sum, item) => sum + calculateAmount(item), 0);
        const total = subTotal -
            Math.max(0, parseFloat(invoice.discount) || 0) +
            Math.max(0, parseFloat(invoice.shippingCharges) || 0) +
            parseFloat(invoice.adjustment || 0);
        return { subTotal, total: Math.max(0, total) };
    };

    const handleChange = (e) => {
        const { name, value } = e.target;
        const parsedValue = ['discount', 'shippingCharges', 'adjustment'].includes(name)
            ? parseFloat(value) || 0
            : value;
        const newInvoice = { ...invoice, [name]: parsedValue };
        const totals = calculateTotals(newInvoice.items);
        setInvoice({ ...newInvoice, ...totals });
    };

    const handleItemChange = (index, e) => {
        const { name, value } = e.target;
        const parsedValue = name === 'quantity' || name === 'rate' || name === 'tax'
            ? Math.max(0, parseFloat(value) || 0)
            : value;
        const updatedItems = invoice.items.map((item, i) => {
            if (i === index) {
                const newItem = { ...item, [name]: parsedValue };
                return { ...newItem, amount: calculateAmount(newItem) };
            }
            return item;
        });
        const totals = calculateTotals(updatedItems);
        setInvoice({ ...invoice, items: updatedItems, ...totals });
    };

    const addItem = () => {
        setInvoice({
            ...invoice,
            items: [...invoice.items, { itemDetails: '', quantity: 1, rate: 0, tax: 0, amount: 0 }]
        });
    };

    const removeItem = (index) => {
        if (invoice.items.length > 1) {
            const updatedItems = invoice.items.filter((_, i) => i !== index);
            const totals = calculateTotals(updatedItems);
            setInvoice({ ...invoice, items: updatedItems, ...totals });
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        const { customerName, invoiceNumber, invoiceDate, dueDate, items } = invoice;

        if (!customerName || !invoiceNumber || !invoiceDate || !dueDate) {
            alert('Veuillez remplir tous les champs requis');
            return;
        }
        if (new Date(dueDate) < new Date(invoiceDate)) {
            alert('La date d\'échéance doit être postérieure à la date de facture');
            return;
        }
        if (items.some(item => !item.itemDetails)) {
            alert('Tous les articles doivent avoir une description');
            return;
        }

        try {
            await axios.post('http://localhost:5000/api/invoices', invoice);
            alert('Facture créée avec succès');
            setInvoice({
                customerName: '',
                invoiceNumber: '',
                orderNumber: '',
                invoiceDate: new Date().toISOString().split('T')[0],
                dueDate: '',
                items: [{ itemDetails: '', quantity: 1, rate: 0, tax: 0, amount: 0 }],
                subTotal: 0,
                discount: 0,
                shippingCharges: 0,
                adjustment: 0,
                total: 0,
                customerNotes: ''
            });
        } catch (error) {
            console.error('Erreur lors de la création de la facture', error);
            alert('Erreur lors de la création de la facture');
        }
    };

    return (
        <div style={{
            minHeight: '100vh',
            background: 'linear-gradient(135deg, #f5f7fa 0%, #c3cfe2 100%)',
            padding: '40px 20px',
            fontFamily: "'Arial', sans-serif"
        }}>
            <div style={{
                maxWidth: '1200px',
                margin: '0 auto',
                backgroundColor: 'rgba(255, 255, 255, 0.95)',
                borderRadius: '20px',
                boxShadow: '0 10px 30px rgba(0, 0, 0, 0.1)',
                overflow: 'hidden',
                position: 'relative'
            }}>
                <div style={{
                    background: 'linear-gradient(to right, #4facfe, #00f2fe)',
                    padding: '30px',
                    color: 'white',
                    borderRadius: '20px 20px 0 0'
                }}>
                    <h2 style={{
                        fontSize: '36px',
                        fontWeight: 'bold',
                        margin: '0',
                        textShadow: '2px 2px 4px rgba(0,0,0,0.2)'
                    }}>Création de Facture</h2>
                    <p style={{ margin: '10px 0 0', fontSize: '18px' }}>Gérez vos factures avec style</p>
                </div>

                <form onSubmit={handleSubmit} style={{ padding: '40px' }}>
                    <div style={{
                        display: 'grid',
                        gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))',
                        gap: '20px',
                        marginBottom: '40px'
                    }}>
                        {[
                            { name: 'customerName', placeholder: 'Nom du client', label: 'Nom du client', type: 'text' },
                            { name: 'invoiceNumber', placeholder: 'N° Facture', label: 'Numéro de facture', type: 'text' },
                            { name: 'orderNumber', placeholder: 'N° Commande', label: 'Numéro de commande', type: 'text' },
                            { name: 'invoiceDate', placeholder: 'Date Facture', label: 'Date de facture', type: 'date' },
                            { name: 'dueDate', placeholder: 'Date Échéance', label: 'Date d\'échéance', type: 'date' }
                        ].map(field => (
                            <div key={field.name} style={{ position: 'relative' }}>
                                <label style={{
                                    display: 'block',
                                    marginBottom: '5px',
                                    fontSize: '14px',
                                    color: '#555',
                                    fontWeight: '500'
                                }}>{field.label}</label>
                                <input
                                    type={field.type}
                                    name={field.name}
                                    value={invoice[field.name]}
                                    onChange={handleChange}
                                    required={field.type !== 'text' || field.name === 'customerName' || field.name === 'invoiceNumber'}
                                    placeholder={field.placeholder}
                                    style={{
                                        width: '100%',
                                        padding: '12px 16px',
                                        border: '2px solid #ddd',
                                        borderRadius: '8px',
                                        fontSize: '16px',
                                        transition: 'all 0.3s ease',
                                        backgroundColor: 'white'
                                    }}
                                    onFocus={(e) => e.target.style.borderColor = '#4facfe'}
                                    onBlur={(e) => e.target.style.borderColor = '#ddd'}
                                />
                            </div>
                        ))}
                    </div>

                    <div style={{
                        backgroundColor: 'rgba(245, 247, 250, 0.8)',
                        padding: '20px',
                        borderRadius: '12px',
                        marginBottom: '30px'
                    }}>
                        <h3 style={{
                            fontSize: '24px',
                            color: '#333',
                            marginBottom: '20px',
                            fontWeight: '600'
                        }}>Articles</h3>

                        {invoice.items.map((item, index) => (
                            <div key={index} style={{
                                display: 'grid',
                                gridTemplateColumns: '2fr 1fr 1fr 1fr 1fr 80px',
                                gap: '15px',
                                marginBottom: '15px',
                                padding: '15px',
                                backgroundColor: 'white',
                                borderRadius: '10px',
                                boxShadow: '0 2px 5px rgba(0,0,0,0.05)',
                                transition: 'transform 0.2s ease'
                            }}
                                 onMouseEnter={(e) => e.currentTarget.style.transform = 'translateY(-2px)'}
                                 onMouseLeave={(e) => e.currentTarget.style.transform = 'translateY(0)'}>
                                <div>
                                    <label style={{ display: 'block', fontSize: '12px', color: '#555', marginBottom: '5px' }}>Détails</label>
                                    <input
                                        type="text"
                                        name="itemDetails"
                                        placeholder="Détails de l'article"
                                        value={item.itemDetails}
                                        onChange={(e) => handleItemChange(index, e)}
                                        required
                                        style={{
                                            border: '2px solid #eee',
                                            padding: '10px',
                                            borderRadius: '6px',
                                            fontSize: '14px',
                                            width: '100%'
                                        }}
                                    />
                                </div>
                                <div>
                                    <label style={{ display: 'block', fontSize: '12px', color: '#555', marginBottom: '5px' }}>Quantité</label>
                                    <input
                                        type="number"
                                        name="quantity"
                                        value={item.quantity}
                                        onChange={(e) => handleItemChange(index, e)}
                                        min="1"
                                        required
                                        style={{
                                            border: '2px solid #eee',
                                            padding: '10px',
                                            borderRadius: '6px',
                                            fontSize: '14px',
                                            width: '100%'
                                        }}
                                    />
                                </div>
                                <div>
                                    <label style={{ display: 'block', fontSize: '12px', color: '#555', marginBottom: '5px' }}>Prix unitaire</label>
                                    <input
                                        type="number"
                                        name="rate"
                                        value={item.rate}
                                        onChange={(e) => handleItemChange(index, e)}
                                        min="0"
                                        step="0.01"
                                        required
                                        style={{
                                            border: '2px solid #eee',
                                            padding: '10px',
                                            borderRadius: '6px',
                                            fontSize: '14px',
                                            width: '100%'
                                        }}
                                    />
                                </div>
                                <div>
                                    <label style={{ display: 'block', fontSize: '12px', color: '#555', marginBottom: '5px' }}>Taxe</label>
                                    <input
                                        type="number"
                                        name="tax"
                                        placeholder="Taxe"
                                        value={item.tax}
                                        onChange={(e) => handleItemChange(index, e)}
                                        min="0"
                                        step="0.01"
                                        style={{
                                            border: '2px solid #eee',
                                            padding: '10px',
                                            borderRadius: '6px',
                                            fontSize: '14px',
                                            width: '100%'
                                        }}
                                    />
                                </div>
                                <div>
                                    <label style={{ display: 'block', fontSize: '12px', color: '#555', marginBottom: '5px' }}>Montant</label>
                                    <input
                                        type="number"
                                        name="amount"
                                        value={item.amount.toFixed(2)}
                                        disabled
                                        style={{
                                            border: '2px solid #eee',
                                            padding: '10px',
                                            borderRadius: '6px',
                                            fontSize: '14px',
                                            backgroundColor: '#f8f9fa',
                                            color: '#666',
                                            width: '100%'
                                        }}
                                    />
                                </div>
                                <button
                                    type="button"
                                    onClick={() => removeItem(index)}
                                    disabled={invoice.items.length === 1}
                                    style={{
                                        background: invoice.items.length === 1
                                            ? '#ccc'
                                            : 'linear-gradient(to right, #ff6b6b, #ff8787)',
                                        color: 'white',
                                        border: 'none',
                                        borderRadius: '6px',
                                        padding: '10px',
                                        cursor: invoice.items.length === 1 ? 'not-allowed' : 'pointer',
                                        fontSize: '14px',
                                        transition: 'all 0.3s ease',
                                        height: 'fit-content',
                                        alignSelf: 'end'
                                    }}
                                    onMouseEnter={(e) => invoice.items.length > 1 && (e.target.style.transform = 'scale(1.1)')}
                                    onMouseLeave={(e) => e.target.style.transform = 'scale(1)'}
                                >
                                    Supprimer
                                </button>
                            </div>
                        ))}

                        <button
                            type="button"
                            onClick={addItem}
                            style={{
                                background: 'linear-gradient(to right, #4facfe, #00f2fe)',
                                color: 'white',
                                padding: '12px 24px',
                                borderRadius: '25px',
                                border: 'none',
                                fontSize: '16px',
                                cursor: 'pointer',
                                transition: 'all 0.3s ease',
                                boxShadow: '0 4px 15px rgba(79, 172, 254, 0.4)'
                            }}
                            onMouseEnter={(e) => e.target.style.transform = 'scale(1.05)'}
                            onMouseLeave={(e) => e.target.style.transform = 'scale(1)'}
                        >
                            + Ajouter un article
                        </button>

                        {/* Section des totaux */}
                        <div style={{
                            marginTop: '30px',
                            padding: '20px',
                            backgroundColor: 'white',
                            borderRadius: '10px',
                            boxShadow: '0 2px 5px rgba(0,0,0,0.05)'
                        }}>
                            <h4 style={{
                                fontSize: '20px',
                                color: '#333',
                                marginBottom: '20px',
                                fontWeight: '600'
                            }}>Totaux</h4>
                            <div style={{
                                display: 'grid',
                                gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
                                gap: '15px'
                            }}>
                                <div>
                                    <label style={{ display: 'block', fontSize: '14px', color: '#555', marginBottom: '5px' }}>Sous-total</label>
                                    <input
                                        type="number"
                                        value={invoice.subTotal.toFixed(2)}
                                        disabled
                                        style={{
                                            border: '2px solid #eee',
                                            padding: '10px',
                                            borderRadius: '6px',
                                            fontSize: '14px',
                                            backgroundColor: '#f8f9fa',
                                            color: '#666',
                                            width: '100%'
                                        }}
                                    />
                                </div>
                                <div>
                                    <label style={{ display: 'block', fontSize: '14px', color: '#555', marginBottom: '5px' }}>Remise</label>
                                    <input
                                        type="number"
                                        name="discount"
                                        value={invoice.discount}
                                        onChange={handleChange}
                                        min="0"
                                        step="0.01"
                                        style={{
                                            border: '2px solid #eee',
                                            padding: '10px',
                                            borderRadius: '6px',
                                            fontSize: '14px',
                                            width: '100%'
                                        }}
                                    />
                                </div>
                                <div>
                                    <label style={{ display: 'block', fontSize: '14px', color: '#555', marginBottom: '5px' }}>Frais de livraison</label>
                                    <input
                                        type="number"
                                        name="shippingCharges"
                                        value={invoice.shippingCharges}
                                        onChange={handleChange}
                                        min="0"
                                        step="0.01"
                                        style={{
                                            border: '2px solid #eee',
                                            padding: '10px',
                                            borderRadius: '6px',
                                            fontSize: '14px',
                                            width: '100%'
                                        }}
                                    />
                                </div>
                                <div>
                                    <label style={{ display: 'block', fontSize: '14px', color: '#555', marginBottom: '5px' }}>Ajustement</label>
                                    <input
                                        type="number"
                                        name="adjustment"
                                        value={invoice.adjustment}
                                        onChange={handleChange}
                                        step="0.01"
                                        style={{
                                            border: '2px solid #eee',
                                            padding: '10px',
                                            borderRadius: '6px',
                                            fontSize: '14px',
                                            width: '100%'
                                        }}
                                    />
                                </div>
                                <div>
                                    <label style={{ display: 'block', fontSize: '14px', color: '#555', marginBottom: '5px' }}>Total</label>
                                    <input
                                        type="number"
                                        value={invoice.total.toFixed(2)}
                                        disabled
                                        style={{
                                            border: '2px solid #eee',
                                            padding: '10px',
                                            borderRadius: '6px',
                                            fontSize: '14px',
                                            backgroundColor: '#f8f9fa',
                                            color: '#666',
                                            width: '100%'
                                        }}
                                    />
                                </div>
                            </div>
                        </div>
                    </div>

                    <div style={{ display: 'flex', gap: '30px' }}>
                        <div style={{ flex: 1 }}>
                            <label style={{
                                display: 'block',
                                marginBottom: '5px',
                                fontSize: '14px',
                                color: '#555',
                                fontWeight: '500'
                            }}>Notes client</label>
                            <textarea
                                name="customerNotes"
                                placeholder="Notes pour le client..."
                                value={invoice.customerNotes}
                                onChange={handleChange}
                                style={{
                                    width: '100%',
                                    border: '2px solid #ddd',
                                    padding: '15px',
                                    borderRadius: '10px',
                                    minHeight: '120px',
                                    fontSize: '16px',
                                    resize: 'vertical',
                                    backgroundColor: 'white',
                                    transition: 'all 0.3s ease'
                                }}
                                onFocus={(e) => e.target.style.borderColor = '#4facfe'}
                                onBlur={(e) => e.target.style.borderColor = '#ddd'}
                            />
                        </div>
                        <button
                            type="submit"
                            style={{
                                background: 'linear-gradient(to right, #2ecc71, #27ae60)',
                                color: 'white',
                                padding: '15px 40px',
                                borderRadius: '25px',
                                border: 'none',
                                fontSize: '18px',
                                fontWeight: '600',
                                cursor: 'pointer',
                                transition: 'all 0.3s ease',
                                boxShadow: '0 4px 15px rgba(46, 204, 113, 0.4)',
                                alignSelf: 'flex-end'
                            }}
                            onMouseEnter={(e) => e.target.style.transform = 'scale(1.05)'}
                            onMouseLeave={(e) => e.target.style.transform = 'scale(1)'}
                        >
                            Créer la Facture
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default CreateInvoice;