import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { Container, Table, Alert, Spinner, Button, Modal, ModalHeader, ModalBody, ModalFooter, Form, FormGroup, Label, Input } from 'reactstrap';

const TaxReportsList = () => {
    const [reports, setReports] = useState([]);
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(true);
    const [modal, setModal] = useState(false);
    const [selectedReport, setSelectedReport] = useState(null);
    const [income, setIncome] = useState('');
    const [expenses, setExpenses] = useState('');
    const [year, setYear] = useState('');

    useEffect(() => {
        const fetchReports = async () => {
            try {
                setError('');
                const token = localStorage.getItem('authToken');
                const response = await axios.get('http://localhost:5000/api/taxReports/reports', {
                    headers: {
                        Authorization: `Bearer ${token}`,
                    }
                });

                if (response.data && response.data.reports) {
                    console.log("Reports fetched:", response.data.reports);
                    setReports(response.data.reports);
                } else {
                    throw new Error("Invalid response format.");
                }
            } catch (err) {
                console.error("Error fetching reports:", err);
                setError("Failed to load tax reports. Please try again.");
            } finally {
                setLoading(false);
            }
        };

        fetchReports();
    }, []);

    const deleteReport = async (id) => {
        try {
            const token = localStorage.getItem('authToken');
            await axios.delete(`http://localhost:5000/api/taxReports/delete/${id}`, {
                headers: {
                    Authorization: `Bearer ${token}`,
                }
            });
            setReports(reports.filter((report) => report._id !== id));
        } catch (err) {
            console.error("Error deleting tax report:", err);
            setError("Failed to delete the tax report. Please try again.");
        }
    };

    const updateReport = async (id) => {
        try {
            const token = localStorage.getItem('authToken');
            const updatedData = { income, expenses, year };

            const response = await axios.put(`http://localhost:5000/api/taxReports/update/${id}`, updatedData, {
                headers: {
                    Authorization: `Bearer ${token}`,
                }
            });

            setReports(reports.map((report) => (report._id === id ? response.data.taxReport : report)));
            toggleModal();
        } catch (err) {
            console.error("Error updating tax report:", err);
            setError("Failed to update the tax report. Please try again.");
        }
    };

    const toggleModal = () => {
        setModal(!modal);
    };

    const openEditModal = (report) => {
        setSelectedReport(report);
        setIncome(report.income);
        setExpenses(report.expenses);
        setYear(report.year);
        toggleModal();
    };

    return (
        <div style={{
            minHeight: '100vh',
            background: 'linear-gradient(135deg, #f5f7fa 0%, #c3cfe2 100%)',
            padding: '40px 20px',
            fontFamily: "'Arial', sans-serif"
        }}>
            <Container style={{
                maxWidth: '1200px',
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
                    }}>Your Tax Reports</h2>
                    <p style={{ margin: '10px 0 0', fontSize: '18px' }}>View and manage your tax reports</p>
                </div>

                <div style={{ padding: '40px' }}>
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

                    {loading ? (
                        <div style={{ textAlign: 'center', padding: '50px 0' }}>
                            <Spinner style={{
                                width: '3rem',
                                height: '3rem',
                                borderWidth: '0.4em',
                                color: '#4facfe'
                            }} />
                            <p style={{
                                marginTop: '15px',
                                fontSize: '1.2rem',
                                color: '#4facfe',
                                fontWeight: '500'
                            }}>Loading reports...</p>
                        </div>
                    ) : (
                        <Table bordered hover style={{
                            background: 'white',
                            borderRadius: '12px',
                            overflow: 'hidden',
                            boxShadow: '0 5px 15px rgba(0,0,0,0.05)'
                        }}>
                            <thead>
                            <tr style={{
                                background: 'linear-gradient(to right, #4facfe, #00f2fe)',
                                color: 'white',
                                fontWeight: '600'
                            }}>
                                <th style={{ padding: '15px' }}>Year</th>
                                <th style={{ padding: '15px' }}>Income</th>
                                <th style={{ padding: '15px' }}>Expenses</th>
                                <th style={{ padding: '15px' }}>Calculated Tax</th>
                                <th style={{ padding: '15px' }}>Actions</th>
                            </tr>
                            </thead>
                            <tbody>
                            {reports.length > 0 ? (
                                reports.map(report => (
                                    <tr key={report._id} style={{
                                        transition: 'transform 0.2s ease, background-color 0.3s ease'
                                    }}
                                        onMouseEnter={(e) => e.currentTarget.style.transform = 'translateY(-3px)'}
                                        onMouseLeave={(e) => e.currentTarget.style.transform = 'translateY(0)'}>
                                        <td style={{ padding: '15px' }}>{report.year}</td>
                                        <td style={{ padding: '15px' }}>{report.income}</td>
                                        <td style={{ padding: '15px' }}>{report.expenses}</td>
                                        <td style={{ padding: '15px' }}>{report.calculatedTax}</td>
                                        <td style={{ padding: '15px' }}>
                                            <Button
                                                color="warning"
                                                onClick={() => openEditModal(report)}
                                                style={{
                                                    background: 'linear-gradient(to right, #f1c40f, #f39c12)',
                                                    border: 'none',
                                                    borderRadius: '25px',
                                                    padding: '8px 16px',
                                                    fontWeight: '500',
                                                    marginRight: '10px',
                                                    transition: 'transform 0.2s ease, box-shadow 0.2s ease'
                                                }}
                                                onMouseEnter={(e) => e.target.style.transform = 'scale(1.05)'}
                                                onMouseLeave={(e) => e.target.style.transform = 'scale(1)'}
                                            >
                                                Update
                                            </Button>
                                            <Button
                                                color="danger"
                                                onClick={() => deleteReport(report._id)}
                                                style={{
                                                    background: 'linear-gradient(to right, #ff6b6b, #ff8787)',
                                                    border: 'none',
                                                    borderRadius: '25px',
                                                    padding: '8px 16px',
                                                    fontWeight: '500',
                                                    transition: 'transform 0.2s ease, box-shadow 0.2s ease'
                                                }}
                                                onMouseEnter={(e) => e.target.style.transform = 'scale(1.05)'}
                                                onMouseLeave={(e) => e.target.style.transform = 'scale(1)'}
                                            >
                                                Delete
                                            </Button>
                                        </td>
                                    </tr>
                                ))
                            ) : (
                                <tr>
                                    <td colSpan="5" style={{
                                        textAlign: 'center',
                                        padding: '20px',
                                        fontStyle: 'italic',
                                        color: '#666'
                                    }}>
                                        No tax reports found.
                                    </td>
                                </tr>
                            )}
                            </tbody>
                        </Table>
                    )}
                </div>
            </Container>

            {/* Modal pour modifier le rapport fiscal */}
            <Modal isOpen={modal} toggle={toggleModal} style={{ fontFamily: "'Arial', sans-serif" }}>
                <ModalHeader toggle={toggleModal} style={{
                    background: 'linear-gradient(to right, #4facfe, #00f2fe)',
                    color: 'white',
                    borderRadius: '10px 10px 0 0'
                }}>
                    Update Tax Report
                </ModalHeader>
                <ModalBody style={{ padding: '20px' }}>
                    <Form>
                        <FormGroup>
                            <Label style={{ fontSize: '14px', color: '#555', fontWeight: '500' }}>Year</Label>
                            <Input
                                type="number"
                                name="year"
                                value={year}
                                onChange={(e) => setYear(e.target.value)}
                                required
                                style={{
                                    padding: '12px 16px',
                                    border: '2px solid #ddd',
                                    borderRadius: '8px',
                                    fontSize: '16px',
                                    transition: 'border-color 0.3s ease'
                                }}
                                onFocus={(e) => e.target.style.borderColor = '#4facfe'}
                                onBlur={(e) => e.target.style.borderColor = '#ddd'}
                            />
                        </FormGroup>
                        <FormGroup>
                            <Label style={{ fontSize: '14px', color: '#555', fontWeight: '500' }}>Income</Label>
                            <Input
                                type="number"
                                name="income"
                                value={income}
                                onChange={(e) => setIncome(e.target.value)}
                                required
                                style={{
                                    padding: '12px 16px',
                                    border: '2px solid #ddd',
                                    borderRadius: '8px',
                                    fontSize: '16px',
                                    transition: 'border-color 0.3s ease'
                                }}
                                onFocus={(e) => e.target.style.borderColor = '#4facfe'}
                                onBlur={(e) => e.target.style.borderColor = '#ddd'}
                            />
                        </FormGroup>
                        <FormGroup>
                            <Label style={{ fontSize: '14px', color: '#555', fontWeight: '500' }}>Expenses</Label>
                            <Input
                                type="number"
                                name="expenses"
                                value={expenses}
                                onChange={(e) => setExpenses(e.target.value)}
                                required
                                style={{
                                    padding: '12px 16px',
                                    border: '2px solid #ddd',
                                    borderRadius: '8px',
                                    fontSize: '16px',
                                    transition: 'border-color 0.3s ease'
                                }}
                                onFocus={(e) => e.target.style.borderColor = '#4facfe'}
                                onBlur={(e) => e.target.style.borderColor = '#ddd'}
                            />
                        </FormGroup>
                    </Form>
                </ModalBody>
                <ModalFooter style={{ padding: '15px' }}>
                    <Button
                        color="primary"
                        onClick={() => updateReport(selectedReport._id)}
                        style={{
                            background: 'linear-gradient(to right, #2ecc71, #27ae60)',
                            border: 'none',
                            borderRadius: '25px',
                            padding: '10px 20px',
                            fontWeight: '500',
                            transition: 'transform 0.2s ease, box-shadow 0.2s ease'
                        }}
                        onMouseEnter={(e) => e.target.style.transform = 'scale(1.05)'}
                        onMouseLeave={(e) => e.target.style.transform = 'scale(1)'}
                    >
                        Save Changes
                    </Button>
                    <Button
                        color="secondary"
                        onClick={toggleModal}
                        style={{
                            background: 'linear-gradient(to right, #bdc3c7, #95a5a6)',
                            border: 'none',
                            borderRadius: '25px',
                            padding: '10px 20px',
                            fontWeight: '500',
                            transition: 'transform 0.2s ease, box-shadow 0.2s ease'
                        }}
                        onMouseEnter={(e) => e.target.style.transform = 'scale(1.05)'}
                        onMouseLeave={(e) => e.target.style.transform = 'scale(1)'}
                    >
                        Cancel
                    </Button>
                </ModalFooter>
            </Modal>
        </div>
    );
};

export default TaxReportsList;
