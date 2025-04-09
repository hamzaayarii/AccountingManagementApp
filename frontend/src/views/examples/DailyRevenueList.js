import React, { useState, useEffect } from 'react';
import {
    Card,
    CardHeader,
    CardBody,
    Container,
    Row,
    Col,
    Table,
    Button,
    Badge,
    Modal,
    ModalHeader,
    ModalBody,
    ModalFooter
} from 'reactstrap';
import axios from 'axios';
import Header from "components/Headers/Header.js";

const DailyRevenueList = () => {
    const [entries, setEntries] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState(null);
    const [deleteModal, setDeleteModal] = useState(false);
    const [selectedEntry, setSelectedEntry] = useState(null);
    const [deleteError, setDeleteError] = useState(null);

    useEffect(() => {
        fetchEntries();
    }, []);

    const fetchEntries = async () => {
        try {
            const token = localStorage.getItem('authToken');
            
            // First get the business for the current user (owner or accountant)
            const businessResponse = await axios.get('http://localhost:5000/api/business/user-businesses', {
                headers: { Authorization: `Bearer ${token}` }
            });

            if (!businessResponse.data.businesses || businessResponse.data.businesses.length === 0) {
                setError('No business found');
                setIsLoading(false);
                return;
            }

            const businessId = businessResponse.data.businesses[0]._id;
            
            // Then fetch daily revenue entries for that business
            const response = await axios.get(`http://localhost:5000/api/daily-revenue?business=${businessId}`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            
            setEntries(response.data.data || []);
            setIsLoading(false);
        } catch (err) {
            setError('Failed to fetch daily revenue entries');
            setIsLoading(false);
            console.error('Error fetching daily revenue:', err);
        }
    };

    const calculateTotalRevenue = (entry) => {
        const cashNet = entry.revenues.cash.sales - entry.revenues.cash.returns;
        const cardNet = entry.revenues.card.sales - entry.revenues.card.returns;
        const otherRevenue = entry.revenues.other.reduce((sum, item) => sum + item.amount, 0);
        return cashNet + cardNet + otherRevenue;
    };

    const calculateTotalExpenses = (entry) => {
        const pettyExpenses = entry.expenses.petty || 0;
        const otherExpenses = entry.expenses.other.reduce((sum, item) => sum + item.amount, 0);
        return pettyExpenses + otherExpenses;
    };

    const formatDate = (dateString) => {
        return new Date(dateString).toLocaleDateString();
    };

    const formatCurrency = (amount) => {
        return new Intl.NumberFormat('en-US', {
            style: 'currency',
            currency: 'TND'
        }).format(amount);
    };

    if (isLoading) {
        return <div>Loading...</div>;
    }

    if (error) {
        return <div className="text-danger">{error}</div>;
    }

    return (
        <>
            <Header />
            <Container className="mt--7" fluid>
                <Row>
                    <div className="col">
                        <Card className="shadow">
                            <CardHeader className="border-0">
                                <Row className="align-items-center">
                                    <Col xs="8">
                                        <h3 className="mb-0">Daily Revenue List</h3>
                                    </Col>
                                    <Col className="text-right" xs="4">
                                        <Button
                                            color="primary"
                                            href="#pablo"
                                            onClick={(e) => {
                                                e.preventDefault();
                                                window.location.href = '/admin/daily-revenue';
                                            }}
                                            size="sm"
                                        >
                                            Add New Entry
                                        </Button>
                                    </Col>
                                </Row>
                            </CardHeader>
                            <CardBody>
                                <Table className="align-items-center table-flush" responsive>
                                    <thead className="thead-light">
                                        <tr>
                                            <th>Date</th>
                                            <th>Cash Sales</th>
                                            <th>Card Sales</th>
                                            <th>Other Revenue</th>
                                            <th>Total Revenue</th>
                                            <th>Total Expenses</th>
                                            <th>Net Amount</th>
                                            <th>Actions</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {entries.map((entry) => {
                                            const totalRevenue = calculateTotalRevenue(entry);
                                            const totalExpenses = calculateTotalExpenses(entry);
                                            const netAmount = totalRevenue - totalExpenses;

                                            return (
                                                <tr key={entry._id}>
                                                    <td>{formatDate(entry.date)}</td>
                                                    <td>
                                                        {formatCurrency(entry.revenues.cash.sales - entry.revenues.cash.returns)}
                                                    </td>
                                                    <td>
                                                        {formatCurrency(entry.revenues.card.sales - entry.revenues.card.returns)}
                                                    </td>
                                                    <td>
                                                        {formatCurrency(entry.revenues.other.reduce((sum, item) => sum + item.amount, 0))}
                                                    </td>
                                                    <td className="text-success">
                                                        {formatCurrency(totalRevenue)}
                                                    </td>
                                                    <td className="text-danger">
                                                        {formatCurrency(totalExpenses)}
                                                    </td>
                                                    <td>
                                                        <Badge color={netAmount >= 0 ? "success" : "danger"}>
                                                            {formatCurrency(netAmount)}
                                                        </Badge>
                                                    </td>
                                                    <td className="text-right">
                                                        {entry.status === 'DRAFT' && (
                                                            <Button
                                                                color="danger"
                                                                size="sm"
                                                                onClick={() => {
                                                                    setSelectedEntry(entry);
                                                                    setDeleteModal(true);
                                                                }}
                                                            >
                                                                <i className="fas fa-trash" /> Delete
                                                            </Button>
                                                        )}
                                                        {entry.status !== 'DRAFT' && (
                                                            <Badge color="info">{entry.status}</Badge>
                                                        )}
                                                    </td>
                                                </tr>
                                            );
                                        })}
                                    </tbody>
                                </Table>
                            </CardBody>
                        </Card>
                    </div>
                </Row>
            </Container>

            {/* Delete Confirmation Modal */}
            <Modal isOpen={deleteModal} toggle={() => setDeleteModal(false)}>
                <ModalHeader toggle={() => setDeleteModal(false)}>
                    Confirm Delete
                </ModalHeader>
                <ModalBody>
                    {deleteError && (
                        <div className="text-danger mb-3">{deleteError}</div>
                    )}
                    Are you sure you want to delete the daily revenue entry for{' '}
                    {selectedEntry && formatDate(selectedEntry.date)}?
                    This action cannot be undone.
                </ModalBody>
                <ModalFooter>
                    <Button color="secondary" onClick={() => setDeleteModal(false)}>
                        Cancel
                    </Button>
                    <Button
                        color="danger"
                        onClick={async () => {
                            try {
                                const token = localStorage.getItem('authToken');
                                // First delete the journal entry if it exists
                                if (selectedEntry.journalEntry) {
                                    await axios.delete(
                                        `http://localhost:5000/api/journal/${selectedEntry.journalEntry}`,
                                        { headers: { Authorization: `Bearer ${token}` } }
                                    );
                                }
                                
                                // Then delete the daily revenue entry
                                await axios.delete(
                                    `http://localhost:5000/api/daily-revenue/${selectedEntry._id}`,
                                    { headers: { Authorization: `Bearer ${token}` } }
                                );
                                setEntries(entries.filter(entry => entry._id !== selectedEntry._id));
                                setDeleteModal(false);
                                setSelectedEntry(null);
                                setDeleteError(null);
                            } catch (err) {
                                console.error('Error deleting entry:', err);
                                setDeleteError(
                                    err.response?.data?.message ||
                                    'Failed to delete entry. Only draft entries can be deleted.'
                                );
                            }
                        }}
                    >
                        Delete
                    </Button>
                </ModalFooter>
            </Modal>
        </>
    );
};

export default DailyRevenueList;
