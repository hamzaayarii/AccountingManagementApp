import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { Alert, Spinner } from 'reactstrap';
import styles from '../../assets/css/FinancialStatements.module.css';
import { jwtDecode } from 'jwt-decode';

const FinancialStatements = () => {
    const [statements, setStatements] = useState([]);
    const [loading, setLoading] = useState(false);
    const [loadingBusinesses, setLoadingBusinesses] = useState(true);
    const [error, setError] = useState('');
    const [businesses, setBusinesses] = useState([]);
    const [formData, setFormData] = useState({
        businessId: '',
        periodStart: '',
        periodEnd: ''
    });
    const [userRole, setUserRole] = useState(null);

    useEffect(() => {
        const token = localStorage.getItem('authToken');
        if (token) {
            const decoded = jwtDecode(token);
            setUserRole(decoded.role);
        }
    }, []);

    useEffect(() => {
        const fetchBusinesses = async () => {
            setLoadingBusinesses(true);
            setError('');
            try {
                const token = localStorage.getItem('authToken');
                if (!token) {
                    setError('You must be logged in');
                    return;
                }

                const response = await axios.get('http://localhost:5000/api/business/user-businesses', {
                    headers: { Authorization: `Bearer ${token}` }
                });

                const businessList = response.data.businesses || [];
                setBusinesses(businessList);

                if (businessList.length > 0) {
                    setFormData(prev => ({
                        ...prev,
                        businessId: businessList[0]._id
                    }));
                } else {
                    setError(userRole === 'accountant' 
                        ? 'No businesses assigned to you. Please wait for business owners to assign you.' 
                        : 'No businesses found. Please create a business first.');
                }
            } catch (err) {
                console.error('Error fetching businesses:', err);
                setError(err.response?.data?.message || 'Error retrieving businesses');
            } finally {
                setLoadingBusinesses(false);
            }
        };

        if (userRole) {
            fetchBusinesses();
        }
    }, [userRole]);

    const handleGenerateBalanceSheet = async () => {
        if (!formData.businessId || !formData.periodStart || !formData.periodEnd) {
            setError('Please fill in all fields');
            return;
        }

        setError('');
        setLoading(true);

        try {
            const token = localStorage.getItem('authToken');
            const response = await axios.post(
                'http://localhost:5000/api/financial-statements/generate-balance-sheet',
                formData,
                { headers: { Authorization: `Bearer ${token}` } }
            );

            setStatements([...statements, response.data.financialStatement]);
            setLoading(false);
        } catch (err) {
            console.error('Error generating balance sheet:', err);
            setError(err.response?.data?.message || 'Error generating balance sheet');
            setLoading(false);
        }
    };

    const handleInputChange = (e) => {
        setFormData({ ...formData, [e.target.name]: e.target.value });
        setError(''); // Clear any previous errors when user makes changes
    };

    return (
        <div className={styles.container}>
            <h2>États Financiers</h2>
            {error && <Alert color="danger">{error}</Alert>}

            <div className={styles.form}>
                <div className={styles.field}>
                    <label>Société</label>
                    {loadingBusinesses ? (
                        <div className={styles.spinnerContainer}>
                            <Spinner size="sm" />
                        </div>
                    ) : (
                        <select 
                            name="businessId" 
                            onChange={handleInputChange} 
                            value={formData.businessId}
                            disabled={businesses.length === 0 || loading}
                        >
                            <option value="">Sélectionner une société</option>
                            {businesses.map(business => (
                                <option key={business._id} value={business._id}>{business.name}</option>
                            ))}
                        </select>
                    )}
                </div>
                <div className={styles.field}>
                    <label>Début de période</label>
                    <input 
                        type="date" 
                        name="periodStart" 
                        onChange={handleInputChange} 
                        value={formData.periodStart}
                        disabled={!formData.businessId || loading} 
                    />
                </div>
                <div className={styles.field}>
                    <label>Fin de période</label>
                    <input 
                        type="date" 
                        name="periodEnd" 
                        onChange={handleInputChange} 
                        value={formData.periodEnd}
                        disabled={!formData.businessId || loading}
                    />
                </div>
                <button 
                    onClick={handleGenerateBalanceSheet} 
                    disabled={loading || !formData.businessId || !formData.periodStart || !formData.periodEnd}
                >
                    {loading ? 'Génération...' : 'Générer un bilan'}
                </button>
            </div>

            <div className={styles.statements}>
                {statements.map(statement => (
                    <div key={statement._id} className={styles.statement}>
                        <h3>Bilan ({new Date(statement.periodStart).toLocaleDateString()} - {new Date(statement.periodEnd).toLocaleDateString()})</h3>
                        <p><strong>Actifs :</strong></p>
                        <p>Créances clients : {statement.data.assets.receivables} TND</p>
                        <p>Trésorerie : {statement.data.assets.cash} TND</p>
                        <p><strong>Passifs :</strong></p>
                        <p>Dettes fournisseurs : {statement.data.liabilities.payables} TND</p>
                        <p><strong>Capitaux propres :</strong> {statement.data.equity} TND</p>
                    </div>
                ))}
            </div>
        </div>
    );
};

export default FinancialStatements;