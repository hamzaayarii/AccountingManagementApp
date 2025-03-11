import React, { useEffect, useState, useCallback } from 'react';
import axios from 'axios';

const InvoiceList = () => {
    const [invoices, setInvoices] = useState([]);

    // Memoize fetchInvoices to avoid redefinition on every render
    const fetchInvoices = useCallback(async () => {
        try {
            const token = localStorage.getItem('token');
            const response = await axios.get('http://localhost:5000/api/invoices', {
                headers: {
                    Authorization: `Bearer ${token}`, // Corrected here
                },
            });
            setInvoices(response.data);
        } catch (error) {
            console.error('Erreur lors du chargement des factures:', error);
            alert('Impossible de charger les factures. Veuillez réessayer.');
        }
    }, []); // Empty dependency array since token is fetched inside the function

    useEffect(() => {
        const token = localStorage.getItem('token');
        if (!token) {
            alert('Veuillez vous connecter pour accéder à cette page.');
            window.location.href = '/login';
        } else {
            fetchInvoices();
        }
    }, [fetchInvoices]); // Add fetchInvoices as a dependency

    const deleteInvoice = async (id) => {
        if (window.confirm('Voulez-vous vraiment supprimer cette facture ?')) {
            try {
                const token = localStorage.getItem('token');
                await axios.delete(`http://localhost:5000/api/invoices/${id}`, { // Corrected here
                    headers: {
                        Authorization: `Bearer ${token}`, // Corrected here
                    },
                });
                alert('Facture supprimée avec succès');
                fetchInvoices(); // Refresh the list after deletion
            } catch (error) {
                console.error('Erreur lors de la suppression:', error);
                alert('Erreur lors de la suppression de la facture.');
            }
        }
    };

    const downloadPDF = (id) => {
        window.open(`http://localhost:5000/api/invoices/${id}/pdf`, "_blank"); // Corrected here
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
                {/* En-tête */}
                <div style={{
                    background: 'linear-gradient(to right, #4facfe, #00f2fe)',
                    padding: '30px',
                    color: 'white',
                    borderRadius: '20px 20px 0 0',
                    textAlign: 'center'
                }}>
                    <h2 style={{
                        fontSize: '36px',
                        fontWeight: 'bold',
                        margin: '0',
                        textShadow: '2px 2px 4px rgba(0,0,0,0.2)'
                    }}>Liste des Factures</h2>
                    <p style={{
                        margin: '10px 0 0',
                        fontSize: '18px',
                        opacity: '0.9'
                    }}>Visualisez et gérez toutes vos factures</p>
                </div>

                {/* Contenu */}
                <div style={{ padding: '40px' }}>
                    {invoices.length === 0 ? (
                        <p style={{
                            textAlign: 'center',
                            fontSize: '18px',
                            color: '#666',
                            padding: '20px'
                        }}>Aucune facture disponible pour le moment</p>
                    ) : (
                        <div style={{
                            display: 'grid',
                            gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
                            gap: '20px'
                        }}>
                            {invoices.map((invoice) => (
                                <div key={invoice._id} style={{
                                    backgroundColor: 'white',
                                    borderRadius: '15px',
                                    padding: '20px',
                                    boxShadow: '0 5px 15px rgba(0,0,0,0.05)',
                                    transition: 'all 0.3s ease',
                                    borderLeft: '5px solid #4facfe'
                                }}
                                     onMouseEnter={(e) => e.currentTarget.style.transform = 'translateY(-5px)'}
                                     onMouseLeave={(e) => e.currentTarget.style.transform = 'translateY(0)'}>

                                    <div style={{ marginBottom: '15px' }}>
                                        <p style={{
                                            fontSize: '18px',
                                            color: '#333',
                                            margin: '0 0 5px',
                                            fontWeight: '600'
                                        }}>
                                            <span style={{ color: '#4facfe' }}>Client: </span>
                                            {invoice.customerName}
                                        </p>
                                        <p style={{
                                            fontSize: '16px',
                                            color: '#666',
                                            margin: '0 0 5px'
                                        }}>
                                            <span style={{ color: '#4facfe' }}>Montant: </span>
                                            {invoice.total.toFixed(2)} TND
                                        </p>
                                        <p style={{
                                            fontSize: '14px',
                                            color: '#888',
                                            margin: '0'
                                        }}>
                                            <span style={{ color: '#4facfe' }}>Échéance: </span>
                                            {new Date(invoice.dueDate).toLocaleDateString('fr-FR')}
                                        </p>
                                    </div>

                                    <div style={{
                                        display: 'flex',
                                        gap: '10px',
                                        justifyContent: 'flex-end'
                                    }}>
                                        <button
                                            onClick={() => downloadPDF(invoice._id)}
                                            style={{
                                                background: 'linear-gradient(to right, #4facfe, #00f2fe)',
                                                color: 'white',
                                                padding: '10px 20px',
                                                borderRadius: '20px',
                                                border: 'none',
                                                fontSize: '14px',
                                                cursor: 'pointer',
                                                transition: 'all 0.3s ease',
                                                boxShadow: '0 2px 10px rgba(79, 172, 254, 0.3)'
                                            }}
                                            onMouseEnter={(e) => e.target.style.transform = 'scale(1.05)'}
                                            onMouseLeave={(e) => e.target.style.transform = 'scale(1)'}
                                        >
                                            Télécharger PDF
                                        </button>
                                        <button
                                            onClick={() => deleteInvoice(invoice._id)}
                                            style={{
                                                background: 'linear-gradient(to right, #ff6b6b, #ff8787)',
                                                color: 'white',
                                                padding: '10px 20px',
                                                borderRadius: '20px',
                                                border: 'none',
                                                fontSize: '14px',
                                                cursor: 'pointer',
                                                transition: 'all 0.3s ease',
                                                boxShadow: '0 2px 10px rgba(255, 107, 107, 0.3)'
                                            }}
                                            onMouseEnter={(e) => e.target.style.transform = 'scale(1.05)'}
                                            onMouseLeave={(e) => e.target.style.transform = 'scale(1)'}
                                        >
                                            Supprimer
                                        </button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default InvoiceList;
