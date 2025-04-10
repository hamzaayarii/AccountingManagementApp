import React, { useState, useEffect } from 'react';
import {
    Card,
    CardHeader,
    CardBody,
    Container,
    Row,
    Col,
    Form,
    FormGroup,
    Label,
    Input,
    Button,
    Table,
    Alert
} from 'reactstrap';
import axios from 'axios';
import Header from "components/Headers/Header.js";

const DailyRevenue = () => {
    const [entry, setEntry] = useState({
        date: new Date().toISOString().split('T')[0],
        revenues: {
            cash: { sales: 0, returns: 0, netCash: 0 },
            card: { sales: 0, returns: 0, netCard: 0 },
            other: []
        },
        expenses: {
            petty: 0,
            other: []
        },
        notes: '',
        autoJournalEntry: true
    });

    const [otherRevenue, setOtherRevenue] = useState({ type: '', amount: 0 });
    const [otherExpense, setOtherExpense] = useState({ description: '', amount: 0 });
    const [notification, setNotification] = useState({ show: false, message: '', type: 'success' });
    const [isLoading, setIsLoading] = useState(false);

    // Get token from localStorage
    const getAuthToken = () => {
        return localStorage.getItem('authToken');
    };

    // Configure axios with auth header
    const api = axios.create({
        baseURL: 'http://localhost:5000/api',
        headers: {
            'Content-Type': 'application/json'
        }
    });

    // Add auth token to every request
    api.interceptors.request.use((config) => {
        const token = getAuthToken();
        if (token) {
            config.headers.Authorization = `Bearer ${token}`;
        }
        return config;
    });

    const handleRevenueChange = (type, field, value) => {
        setEntry(prev => ({
            ...prev,
            revenues: {
                ...prev.revenues,
                [type]: {
                    ...prev.revenues[type],
                    [field]: parseFloat(value) || 0
                }
            }
        }));
    };

    const addOtherRevenue = () => {
        if (!otherRevenue.type || !otherRevenue.amount) return;
        setEntry(prev => ({
            ...prev,
            revenues: {
                ...prev.revenues,
                other: [...prev.revenues.other, { ...otherRevenue }]
            }
        }));
        setOtherRevenue({ type: '', amount: 0 });
    };

    const addOtherExpense = () => {
        if (!otherExpense.description || !otherExpense.amount) return;
        setEntry(prev => ({
            ...prev,
            expenses: {
                ...prev.expenses,
                other: [...prev.expenses.other, { ...otherExpense }]
            }
        }));
        setOtherExpense({ description: '', amount: 0 });
    };

    const removeOtherRevenue = (index) => {
        setEntry(prev => ({
            ...prev,
            revenues: {
                ...prev.revenues,
                other: prev.revenues.other.filter((_, i) => i !== index)
            }
        }));
    };

    const removeOtherExpense = (index) => {
        setEntry(prev => ({
            ...prev,
            expenses: {
                ...prev.expenses,
                other: prev.expenses.other.filter((_, i) => i !== index)
            }
        }));
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        try {
            setIsLoading(true);
            const response = await api.post('/daily-revenue', entry);
            setNotification({
                show: true,
                message: 'Daily revenue entry saved successfully',
                type: 'success'
            });
            // Reset form after successful submission
            setEntry({
                date: new Date().toISOString().split('T')[0],
                revenues: {
                    cash: { sales: 0, returns: 0, netCash: 0 },
                    card: { sales: 0, returns: 0, netCard: 0 },
                    other: []
                },
                expenses: {
                    petty: 0,
                    other: []
                },
                notes: '',
                autoJournalEntry: true
            });
        } catch (error) {
            setNotification({
                show: true,
                message: error.response?.data?.message || 'Error saving daily revenue',
                type: 'danger'
            });
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <>
            <Header />
            <Container className="mt--7" fluid>
                <Row>
                    <div className="col">
                        <Card className="shadow">
                            <CardHeader>
                                <h3 className="mb-0">Daily Revenue Entry</h3>
                            </CardHeader>
                            <CardBody>
                                {notification.show && (
                                    <Alert 
                                        color={notification.type}
                                        toggle={() => setNotification({ ...notification, show: false })}
                                    >
                                        {notification.message}
                                    </Alert>
                                )}

                                <Form onSubmit={handleSubmit}>
                                    <Row>
                                        <Col md="6">
                                            <FormGroup>
                                                <Label>Date</Label>
                                                <Input
                                                    type="date"
                                                    value={entry.date}
                                                    onChange={(e) => setEntry(prev => ({ ...prev, date: e.target.value }))}
                                                    required
                                                />
                                            </FormGroup>
                                        </Col>
                                    </Row>

                                    <h4 className="mb-3">Revenue</h4>
                                    <Row>
                                        <Col md="6">
                                            <Card className="p-3">
                                                <h5>Cash</h5>
                                                <FormGroup>
                                                    <Label>Sales</Label>
                                                    <Input
                                                        type="number"
                                                        value={entry.revenues.cash.sales}
                                                        onChange={(e) => handleRevenueChange('cash', 'sales', e.target.value)}
                                                        min="0"
                                                        step="0.01"
                                                    />
                                                </FormGroup>
                                                <FormGroup>
                                                    <Label>Returns</Label>
                                                    <Input
                                                        type="number"
                                                        value={entry.revenues.cash.returns}
                                                        onChange={(e) => handleRevenueChange('cash', 'returns', e.target.value)}
                                                        min="0"
                                                        step="0.01"
                                                    />
                                                </FormGroup>
                                            </Card>
                                        </Col>
                                        <Col md="6">
                                            <Card className="p-3">
                                                <h5>Card</h5>
                                                <FormGroup>
                                                    <Label>Sales</Label>
                                                    <Input
                                                        type="number"
                                                        value={entry.revenues.card.sales}
                                                        onChange={(e) => handleRevenueChange('card', 'sales', e.target.value)}
                                                        min="0"
                                                        step="0.01"
                                                    />
                                                </FormGroup>
                                                <FormGroup>
                                                    <Label>Returns</Label>
                                                    <Input
                                                        type="number"
                                                        value={entry.revenues.card.returns}
                                                        onChange={(e) => handleRevenueChange('card', 'returns', e.target.value)}
                                                        min="0"
                                                        step="0.01"
                                                    />
                                                </FormGroup>
                                            </Card>
                                        </Col>
                                    </Row>

                                    <h5 className="mt-4">Other Revenue</h5>
                                    <Row className="mb-3">
                                        <Col md="5">
                                            <Input
                                                type="text"
                                                value={otherRevenue.type}
                                                onChange={(e) => setOtherRevenue(prev => ({ ...prev, type: e.target.value }))}
                                                placeholder="Type"
                                            />
                                        </Col>
                                        <Col md="5">
                                            <Input
                                                type="number"
                                                value={otherRevenue.amount}
                                                onChange={(e) => setOtherRevenue(prev => ({ ...prev, amount: parseFloat(e.target.value) || 0 }))}
                                                placeholder="Amount"
                                                min="0"
                                                step="0.01"
                                            />
                                        </Col>
                                        <Col md="2">
                                            <Button color="primary" onClick={addOtherRevenue} block>
                                                Add
                                            </Button>
                                        </Col>
                                    </Row>

                                    {entry.revenues.other.length > 0 && (
                                        <Table>
                                            <thead>
                                                <tr>
                                                    <th>Type</th>
                                                    <th>Amount</th>
                                                    <th>Action</th>
                                                </tr>
                                            </thead>
                                            <tbody>
                                                {entry.revenues.other.map((item, index) => (
                                                    <tr key={index}>
                                                        <td>{item.type}</td>
                                                        <td>{item.amount} TND</td>
                                                        <td>
                                                            <Button
                                                                color="danger"
                                                                size="sm"
                                                                onClick={() => removeOtherRevenue(index)}
                                                            >
                                                                Remove
                                                            </Button>
                                                        </td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </Table>
                                    )}

                                    <h4 className="mt-4 mb-3">Expenses</h4>
                                    <Row>
                                        <Col md="6">
                                            <FormGroup>
                                                <Label>Petty Cash Expenses</Label>
                                                <Input
                                                    type="number"
                                                    value={entry.expenses.petty}
                                                    onChange={(e) => setEntry(prev => ({
                                                        ...prev,
                                                        expenses: {
                                                            ...prev.expenses,
                                                            petty: parseFloat(e.target.value) || 0
                                                        }
                                                    }))}
                                                    min="0"
                                                    step="0.01"
                                                />
                                            </FormGroup>
                                        </Col>
                                    </Row>

                                    <h5 className="mt-4">Other Expenses</h5>
                                    <Row className="mb-3">
                                        <Col md="5">
                                            <Input
                                                type="text"
                                                value={otherExpense.description}
                                                onChange={(e) => setOtherExpense(prev => ({ ...prev, description: e.target.value }))}
                                                placeholder="Description"
                                            />
                                        </Col>
                                        <Col md="5">
                                            <Input
                                                type="number"
                                                value={otherExpense.amount}
                                                onChange={(e) => setOtherExpense(prev => ({ ...prev, amount: parseFloat(e.target.value) || 0 }))}
                                                placeholder="Amount"
                                                min="0"
                                                step="0.01"
                                            />
                                        </Col>
                                        <Col md="2">
                                            <Button color="primary" onClick={addOtherExpense} block>
                                                Add
                                            </Button>
                                        </Col>
                                    </Row>

                                    {entry.expenses.other.length > 0 && (
                                        <Table>
                                            <thead>
                                                <tr>
                                                    <th>Description</th>
                                                    <th>Amount</th>
                                                    <th>Action</th>
                                                </tr>
                                            </thead>
                                            <tbody>
                                                {entry.expenses.other.map((item, index) => (
                                                    <tr key={index}>
                                                        <td>{item.description}</td>
                                                        <td>{item.amount} TND</td>
                                                        <td>
                                                            <Button
                                                                color="danger"
                                                                size="sm"
                                                                onClick={() => removeOtherExpense(index)}
                                                            >
                                                                Remove
                                                            </Button>
                                                        </td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </Table>
                                    )}

                                    <FormGroup className="mt-4">
                                        <Label>Notes</Label>
                                        <Input
                                            type="textarea"
                                            value={entry.notes}
                                            onChange={(e) => setEntry(prev => ({ ...prev, notes: e.target.value }))}
                                            rows="3"
                                        />
                                    </FormGroup>

                                    <FormGroup check className="mb-3">
                                        <Label check>
                                            <Input
                                                type="checkbox"
                                                checked={entry.autoJournalEntry}
                                                onChange={(e) => setEntry(prev => ({ ...prev, autoJournalEntry: e.target.checked }))}
                                            />{' '}
                                            Automatically create journal entry
                                        </Label>
                                    </FormGroup>

                                    <Button color="primary" type="submit" disabled={isLoading}>
                                        {isLoading ? 'Saving...' : 'Save Daily Revenue'}
                                    </Button>
                                </Form>
                            </CardBody>
                        </Card>
                    </div>
                </Row>
            </Container>
        </>
    );
};

export default DailyRevenue; 