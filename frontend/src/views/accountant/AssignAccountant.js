import React, { useEffect, useState } from "react";
import { Container, Table, Button, Card, CardHeader, CardBody, Spinner } from "reactstrap";
import axios from "axios";
import Header from 'components/Headers/Header';

const AssignAccountant = () => {
    const [accountants, setAccountants] = useState([]);
    const [assigningId, setAssigningId] = useState(null);
    const [removingId, setRemovingId] = useState(null); // For removing assignment
    const [currentUser, setCurrentUser] = useState(null);
    const [assignedId, setAssignedId] = useState(null);
    const [userBusinesses, setUserBusinesses] = useState([]);
    const [selectedBusiness, setSelectedBusiness] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    const token = localStorage.getItem("authToken");

    useEffect(() => {
        if (!token) return;

        const fetchData = async () => {
            try {
                setLoading(true);
                setError(null);

                // Get current logged-in user
                const userRes = await axios.get("http://localhost:5000/api/users/me", {
                    headers: { Authorization: `Bearer ${token}` }
                });
                setCurrentUser(userRes.data);

                // Get user's businesses
                const businessRes = await axios.get("http://localhost:5000/api/business/user-businesses", {
                    headers: { Authorization: `Bearer ${token}` }
                });
                setUserBusinesses(businessRes.data.businesses || []);
                
                if (businessRes.data.businesses?.length > 0) {
                    setSelectedBusiness(businessRes.data.businesses[0]);
                    // If business has an accountant, set it
                    if (businessRes.data.businesses[0].accountant) {
                        setAssignedId(businessRes.data.businesses[0].accountant);
                    }
                }

                // Get all accountants
                const accountantsRes = await axios.get("http://localhost:5000/api/users/getUsersByRole?role=accountant", {
                    headers: { Authorization: `Bearer ${token}` }
                });
                setAccountants(accountantsRes.data);
            } catch (err) {
                console.error("Error fetching data:", err);
                setError("Failed to load required data");
            } finally {
                setLoading(false);
            }
        };

        fetchData();
    }, [token]);

    // Handle the assignment of an accountant
    const handleAssign = (accountantId) => {
        if (!selectedBusiness) {
            alert("Please select a business first");
            return;
        }

        setAssigningId(accountantId);

        axios.post("http://localhost:5000/api/business/assign-accountant", 
            { 
                accountantId,
                businessId: selectedBusiness._id
            }, 
            {
                headers: { Authorization: `Bearer ${token}` }
            }
        )
        .then(() => {
            alert("Accountant assigned successfully!");
            setAssignedId(accountantId); // Update the assigned accountant
            
            // Update the selected business with the new accountant
            setSelectedBusiness(prev => ({
                ...prev,
                accountant: accountantId
            }));
        })
        .catch(error => {
            console.error("Error assigning accountant:", error);
            alert(error.response?.data?.message || "Failed to assign accountant.");
        })
        .finally(() => setAssigningId(null));
    };

    // Handle removing the assignment of an accountant
    const handleRemoveAssignment = () => {
        if (!selectedBusiness) {
            alert("Please select a business first");
            return;
        }

        if (!assignedId) {
            alert("No accountant assigned to this business.");
            return;
        }

        setRemovingId(assignedId);

        axios.post("http://localhost:5000/api/business/assign-accountant", 
            { 
                accountantId: null,
                businessId: selectedBusiness._id 
            }, 
            {
                headers: { Authorization: `Bearer ${token}` }
            }
        )
        .then(() => {
            alert("Accountant unassigned successfully!");
            setAssignedId(null); // Update the assigned accountant to null
            
            // Update the selected business to remove accountant
            setSelectedBusiness(prev => ({
                ...prev,
                accountant: null
            }));
        })
        .catch(error => {
            console.error("Error removing assignment:", error);
            alert(error.response?.data?.message || "Failed to remove accountant assignment.");
        })
        .finally(() => setRemovingId(null));
    };

    // Show nothing if user is not a business owner
    if (!currentUser || currentUser.role !== "business_owner") return null;

    return (
        <>
            <Header />
            <Container className="mt-5">
                <Card>
                    <CardHeader>
                        <h3 className="mb-0">Assign an Accountant</h3>
                        <p className="text-sm text-muted">Select an accountant to assign to your business.</p>
                        {userBusinesses.length > 0 && (
                            <div className="mt-3">
                                <label className="form-control-label">Select Business:</label>
                                <select 
                                    className="form-control" 
                                    value={selectedBusiness?._id || ''}
                                    onChange={(e) => {
                                        const business = userBusinesses.find(b => b._id === e.target.value);
                                        setSelectedBusiness(business);
                                        setAssignedId(business?.accountant || null);
                                    }}
                                >
                                    {userBusinesses.map(business => (
                                        <option key={business._id} value={business._id}>
                                            {business.name}
                                        </option>
                                    ))}
                                </select>
                            </div>
                        )}
                    </CardHeader>
                    <CardBody>
                        {accountants.length === 0 ? (
                            <p>No accountants found.</p>
                        ) : (
                            <Table bordered responsive hover>
                                <thead>
                                    <tr>
                                        <th>#</th>
                                        <th>Name</th>
                                        <th>Email</th>
                                        <th>Action</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {accountants.map((acc, index) => (
                                        <tr key={acc._id}>
                                            <td>{index + 1}</td>
                                            <td>{acc.fullName}</td>
                                            <td>{acc.email}</td>
                                            <td>
                                                {assignedId === acc._id ? (
                                                    <>
                                                        <span className="text-success fw-bold">Assigned</span>
                                                        <Button
                                                            color="danger"
                                                            size="sm"
                                                            onClick={handleRemoveAssignment}
                                                            disabled={removingId === acc._id}
                                                        >
                                                            {removingId === acc._id ? <Spinner size="sm" /> : "Remove Assignment"}
                                                        </Button>
                                                    </>
                                                ) : (
                                                    <Button
                                                        color="primary"
                                                        size="sm"
                                                        onClick={() => handleAssign(acc._id)}
                                                        disabled={assigningId === acc._id || assignedId}
                                                    >
                                                        {assigningId === acc._id ? <Spinner size="sm" /> : "Assign"}
                                                    </Button>
                                                )}
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </Table>
                        )}
                    </CardBody>
                </Card>
            </Container>
        </>
    );
};

export default AssignAccountant;
