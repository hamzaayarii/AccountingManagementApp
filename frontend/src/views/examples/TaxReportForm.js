import React, { useState } from 'react';
import axios from 'axios';
import { Button, Input, FormGroup, Label, Container, Alert } from 'reactstrap';

const TaxReportForm = () => {
    const [income, setIncome] = useState('');
    const [expenses, setExpenses] = useState('');
    const [year, setYear] = useState('');
    const [taxRate, setTaxRate] = useState(0.15); // Default tax rate
    const [message, setMessage] = useState('');
    const [error, setError] = useState('');

    const handleSubmit = async (e) => {
        e.preventDefault();

        if (!income || !expenses || !year) {
            setError('All fields are required.');
            return;
        }

        try {
            const token = localStorage.getItem('authToken');
            const response = await axios.post(
                'http://localhost:5000/api/taxReports/generate',
                { income, expenses, year, taxRate },
                { headers: { Authorization: `Bearer ${token}` } }
            );
            setMessage('Tax report generated successfully');
            setError('');
        } catch (err) {
            console.error(err);
            setError('Failed to generate tax report. Please try again.');
        }
    };

    return (
        <div style={{
            minHeight: '100vh',
            background: 'linear-gradient(135deg, #f5f7fa 0%, #c3cfe2 100%)',
            padding: '40px 20px',
            fontFamily: "'Arial', sans-serif"
        }}>
            <Container style={{
                maxWidth: '800px',
                margin: '0 auto',
                backgroundColor: 'rgba(255, 255, 255, 0.95)',
                borderRadius: '20px',
                boxShadow: '0 10px 30px rgba(0, 0, 0, 0.1)',
                overflow: 'hidden'
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
                    }}>Generate Tax Report</h2>
                    <p style={{ margin: '10px 0 0', fontSize: '18px' }}>Create your tax report with ease</p>
                </div>

                <form onSubmit={handleSubmit} style={{ padding: '40px' }}>
                    {error && (
                        <Alert color="danger" style={{
                            borderRadius: '10px',
                            marginBottom: '20px',
                            fontWeight: '500',
                            background: 'linear-gradient(to right, #ff6b6b, #ff8787)',
                            color: 'white',
                            border: 'none'
                        }}>
                            {error}
                        </Alert>
                    )}
                    {message && (
                        <Alert color="success" style={{
                            borderRadius: '10px',
                            marginBottom: '20px',
                            fontWeight: '500',
                            background: 'linear-gradient(to right, #2ecc71, #27ae60)',
                            color: 'white',
                            border: 'none'
                        }}>
                            {message}
                        </Alert>
                    )}

                    <FormGroup>
                        <Label style={{ fontSize: '14px', color: '#555', fontWeight: '500' }}>Income</Label>
                        <Input
                            type="number"
                            id="income"
                            value={income}
                            onChange={(e) => setIncome(e.target.value)}
                            required
                            placeholder="Enter your income"
                            style={{
                                padding: '12px 16px',
                                border: '2px solid #ddd',
                                borderRadius: '8px',
                                fontSize: '16px',
                                transition: 'border-color 0.3s ease',
                            }}
                            onFocus={(e) => e.target.style.borderColor = '#4facfe'}
                            onBlur={(e) => e.target.style.borderColor = '#ddd'}
                        />
                    </FormGroup>

                    <FormGroup>
                        <Label style={{ fontSize: '14px', color: '#555', fontWeight: '500' }}>Expenses</Label>
                        <Input
                            type="number"
                            id="expenses"
                            value={expenses}
                            onChange={(e) => setExpenses(e.target.value)}
                            required
                            placeholder="Enter your expenses"
                            style={{
                                padding: '12px 16px',
                                border: '2px solid #ddd',
                                borderRadius: '8px',
                                fontSize: '16px',
                                transition: 'border-color 0.3s ease',
                            }}
                            onFocus={(e) => e.target.style.borderColor = '#4facfe'}
                            onBlur={(e) => e.target.style.borderColor = '#ddd'}
                        />
                    </FormGroup>

                    <FormGroup>
                        <Label style={{ fontSize: '14px', color: '#555', fontWeight: '500' }}>Year</Label>
                        <Input
                            type="number"
                            id="year"
                            value={year}
                            onChange={(e) => setYear(e.target.value)}
                            required
                            placeholder="Enter the year"
                            style={{
                                padding: '12px 16px',
                                border: '2px solid #ddd',
                                borderRadius: '8px',
                                fontSize: '16px',
                                transition: 'border-color 0.3s ease',
                            }}
                            onFocus={(e) => e.target.style.borderColor = '#4facfe'}
                            onBlur={(e) => e.target.style.borderColor = '#ddd'}
                        />
                    </FormGroup>

                    <Button
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
                            transition: 'transform 0.3s ease, box-shadow 0.3s ease',
                            boxShadow: '0 4px 15px rgba(46, 204, 113, 0.4)',
                            display: 'block',
                            margin: '0 auto'
                        }}
                        onMouseEnter={(e) => e.target.style.transform = 'scale(1.05)'}
                        onMouseLeave={(e) => e.target.style.transform = 'scale(1)'}
                    >
                        Generate Report
                    </Button>
                </form>
            </Container>
        </div>
    );
};

export default TaxReportForm;
