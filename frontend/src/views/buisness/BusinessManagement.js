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
    UncontrolledTooltip,
    Modal,
    ModalHeader,
    ModalBody,
    ModalFooter
} from 'reactstrap';
import { useNavigate } from 'react-router-dom';
import Header from 'components/Headers/Header';


const BusinessManagement = () => {
    const [businesses, setBusinesses] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [deleteModal, setDeleteModal] = useState(false);
    const [businessToDelete, setBusinessToDelete] = useState(null);
    const navigate = useNavigate();

    useEffect(() => {
        fetchUserBusinesses();
    }, []);

    const fetchUserBusinesses = async () => {
        try {
            setLoading(true);
            const token = localStorage.getItem('authToken');

            if (!token) {
                navigate('/auth/login');
                return;
            }

            const response = await fetch('http://localhost:5000/api/business/user-businesses', {
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                }
            });

            const data = await response.json();

            if (response.ok) {
                setBusinesses(data.businesses || []);
                setError(null);
            } else {
                setError(data.message || 'Failed to load businesses');
            }
        } catch (err) {
            console.error('Error fetching businesses:', err);
            setError('Error connecting to server. Please try again.');
        } finally {
            setLoading(false);
        }
    };

    const handleAddBusiness = () => {
        navigate('/standalone/business-registration');
    };

    const handleEditBusiness = (businessId) => {
        navigate(`/admin/business-registration?id=${businessId}`);
    };

    const toggleDeleteModal = (business = null) => {
        setBusinessToDelete(business);
        setDeleteModal(!deleteModal);
    };

    const handleDeleteBusiness = async () => {
        if (!businessToDelete) return;

        try {
            const token = localStorage.getItem('authToken');
            const response = await fetch(`http://localhost:5000/api/business/${businessToDelete._id}`, {
                method: 'DELETE',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                }
            });

            const data = await response.json();

            if (response.ok) {
                setBusinesses(businesses.filter(b => b._id !== businessToDelete._id));
                setError(null);
                toggleDeleteModal();
            } else {
                setError(data.message || 'Failed to delete business');
            }
        } catch (err) {
            console.error('Error deleting business:', err);
            setError('Error connecting to server. Please try again.');
        }
    };

    return (
        <>
            <Header />
            <Container className="mt--7" fluid>
                <Row>
                    <Col>
                        <Card className="shadow">
                            <CardHeader className="border-0 d-flex justify-content-between align-items-center">
                                <h3 className="mb-0">Your Businesses</h3>
                                <Button
                                    color="primary"
                                    onClick={handleAddBusiness}
                                >
                                    <i className="ni ni-fat-add mr-2"></i>
                                    Add New Business
                                </Button>
                            </CardHeader>
                            <CardBody>
                                {loading ? (
                                    <div className="text-center my-5">
                                        <div className="spinner-border text-primary" role="status">
                                            <span className="sr-only">Loading...</span>
                                        </div>
                                        <p className="mt-3">Loading your businesses...</p>
                                    </div>
                                ) : error ? (
                                    <div className="text-center text-danger my-5">
                                        <i className="ni ni-fat-remove fa-2x mb-3"></i>
                                        <p>{error}</p>
                                        <Button color="primary" onClick={fetchUserBusinesses}>Try Again</Button>
                                    </div>
                                ) : businesses.length === 0 ? (
                                    <div className="text-center my-5">
                                        <i className="ni ni-shop fa-3x mb-3 text-muted"></i>
                                        <p className="lead">You haven't registered any businesses yet.</p>
                                        <Button color="primary" onClick={handleAddBusiness}>Register Your First Business</Button>
                                    </div>
                                ) : (
                                    <Table className="align-items-center table-flush" responsive>
                                        <thead className="thead-light">
                                            <tr>
                                                <th scope="col">Business Name</th>
                                                <th scope="col">Type</th>
                                                <th scope="col">Tax Number</th>
                                                <th scope="col">Address</th>
                                                <th scope="col">Phone</th>
                                                <th scope="col">Actions</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {businesses.map((business) => (
                                                <tr key={business._id}>
                                                    <td>
                                                        <span className="font-weight-bold">
                                                            {business.name}
                                                        </span>
                                                    </td>
                                                    <td>
                                                        <Badge color="primary" className="badge-dot mr-4">
                                                            <i className="bg-primary" />
                                                            {business.type}
                                                        </Badge>
                                                    </td>
                                                    <td>{business.taxNumber}</td>
                                                    <td>{business.address}</td>
                                                    <td>{business.phone || "—"}</td>
                                                    <td>
                                                        <Button
                                                            color="info"
                                                            size="sm"
                                                            className="mr-2"
                                                            id={`edit-${business._id}`}
                                                            onClick={() => handleEditBusiness(business._id)}
                                                        >
                                                            <i className="fas fa-edit"></i>
                                                        </Button>
                                                        <UncontrolledTooltip
                                                            delay={0}
                                                            target={`edit-${business._id}`}
                                                        >
                                                            Edit Business
                                                        </UncontrolledTooltip>
                                                        <Button
                                                            color="danger"
                                                            size="sm"
                                                            id={`delete-${business._id}`}
                                                            onClick={() => toggleDeleteModal(business)}
                                                        >
                                                            <i className="fas fa-trash"></i>
                                                        </Button>
                                                        <UncontrolledTooltip
                                                            delay={0}
                                                            target={`delete-${business._id}`}
                                                        >
                                                            Delete Business
                                                        </UncontrolledTooltip>
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </Table>
                                )}
                            </CardBody>
                        </Card>
                    </Col>
                </Row>
            </Container>

            {/* Delete Confirmation Modal */}
            <Modal isOpen={deleteModal} toggle={() => toggleDeleteModal()}>
                <ModalHeader toggle={() => toggleDeleteModal()}>Confirm Delete</ModalHeader>
                <ModalBody>
                    Are you sure you want to delete the business "{businessToDelete?.name}"? This action cannot be undone.
                </ModalBody>
                <ModalFooter>
                    <Button color="secondary" onClick={() => toggleDeleteModal()}>
                        Cancel
                    </Button>
                    <Button color="danger" onClick={handleDeleteBusiness}>
                        Delete
                    </Button>
                </ModalFooter>
            </Modal>
        </>
    );
};

export default BusinessManagement;