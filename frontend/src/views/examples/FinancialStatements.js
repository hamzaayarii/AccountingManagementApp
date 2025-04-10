import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { Alert, Spinner } from 'reactstrap';
import styles from '../../assets/css/FinancialStatements.module.css';
import { jwtDecode } from 'jwt-decode';
import { useNavigate } from 'react-router-dom';
import { Spinner as BootstrapSpinner } from 'react-bootstrap';

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
    const [year, setYear] = useState('');
    const [month, setMonth] = useState('');
    const [years, setYears] = useState([]);
    const [months, setMonths] = useState([]);

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

    const handleGenerate = () => {
        // Implementation of handleGenerate function
    };

    return (
        <div className={styles.container}>
            <h2>Financial Statements</h2>
            <div className={styles.form}>
                <div className={styles.field}>
                    <label htmlFor="year">Year</label>
                    <select
                        id="year"
                        value={year}
                        onChange={(e) => setYear(e.target.value)}
                        disabled={loading}
                    >
                        <option value="">Select Year</option>
                        {years.map((y) => (
                            <option key={y} value={y}>
                                {y}
                            </option>
                        ))}
                    </select>
                </div>
                <div className={styles.field}>
                    <label htmlFor="month">Month</label>
                    <select
                        id="month"
                        value={month}
                        onChange={(e) => setMonth(e.target.value)}
                        disabled={loading}
                    >
                        <option value="">Select Month</option>
                        {months.map((m) => (
                            <option key={m} value={m}>
                                {m}
                            </option>
                        ))}
                    </select>
                </div>
                <button
                    onClick={handleGenerate}
                    disabled={loading || !year || !month}
                >
                    Generate Financial Statements
                </button>
            </div>

            {loading && (
                <div className={styles.spinnerContainer}>
                    <BootstrapSpinner animation="border" role="status">
                        <span className="visually-hidden">Loading...</span>
                    </BootstrapSpinner>
                </div>
            )}

            {error && <p style={{ color: 'red' }}>{error}</p>}

            {statements.length > 0 && (
                <div className={styles.statements}>
                    {statements.map((statement, index) => (
                        <div key={index} className={styles.statement}>
                            <h3>{statement.type}</h3>
                            {Object.entries(statement.data).map(([key, value]) => (
                                <p key={key}>
                                    <strong>{key}:</strong> {value}
                                </p>
                            ))}
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
};

export default FinancialStatements;