import React, { useEffect, useState } from "react";
import axios from "axios";
import {
    Container,
    Row,
    Card,
    FormGroup,
    Label,
    Input,
    Button,
    Table,
} from "reactstrap";
import { useNavigate } from "react-router-dom";

const FinancialReports = () => {
    const [owners, setOwners] = useState([]);  // Default to empty array
    const [selectedOwner, setSelectedOwner] = useState("");
    const [businesses, setBusinesses] = useState([]);  // Default to empty array
    const [selectedBusiness, setSelectedBusiness] = useState("");
    const [fromDate, setFromDate] = useState("");
    const [toDate, setToDate] = useState("");
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState("");
    const [financialReports, setFinancialReports] = useState([]);  // Default to empty array
    const navigate = useNavigate();

    useEffect(() => {
        fetchBusinessOwners();
    }, []);

    const fetchBusinessOwners = async () => {
        try {
            const token = localStorage.getItem("authToken");
            if (!token) return navigate("/auth/login");

            const res = await axios.get("http://localhost:5000/api/users/assigned-business-owners", {
                headers: { Authorization: `Bearer ${token}` },
            });
            const owners = res.data;
            setOwners(owners || []);  // Ensure owners is always an array
            console.log(owners);
        } catch (err) {
            console.error("Failed to load owners", err);
            setError("Failed to load business owners.");
        }
    };

    const fetchBusinesses = async (ownerId) => {
        try {
            const token = localStorage.getItem("authToken");
            if (!token) return navigate("/auth/login");
            const res = await axios.get(`http://localhost:5000/api/business/getUserBusinessesByAccountant?ownerId=${ownerId}`, {
                headers: { Authorization: `Bearer ${token}` },
            });

            setBusinesses(res.data.businesses || []);  // Ensure businesses is always an array
            if (res.data.businesses.length > 0) {
                setSelectedBusiness(res.data.businesses[0]._id);
                fetchFinancialReports(res.data.businesses[0]._id);
            } else {
                setFinancialReports([]);
            }
        } catch (err) {
            console.error("Failed to load businesses", err);
            setError("Failed to load businesses.");
        }
    };

    const fetchFinancialReports = async (businessId) => {
        try {
            const token = localStorage.getItem("authToken");
            const res = await axios.get(`http://localhost:5000/api/financial-Statement/list?businessId=${businessId}`, {
                headers: { Authorization: `Bearer ${token}` },
            });
            setFinancialReports(res.data || []);  // Ensure financialReports is always an array
        } catch (err) {
            console.error("Failed to load reports", err);
        }
    };

    const generateFinancialReport = async () => {
        try {
            const token = localStorage.getItem("authToken");
            if (!token) return navigate("/auth/login");

            setLoading(true);
            const query = `?businessId=${selectedBusiness}&from=${fromDate}&to=${toDate}`;
            await axios.get(`http://localhost:5000/api/financial-Statement/generate-financial-statement${query}`, {
                headers: { Authorization: `Bearer ${token}` },
                responseType: 'blob',
            });

            await fetchFinancialReports(selectedBusiness);
        } catch (err) {
            console.error("Generation failed", err);
            alert("Failed to generate financial report.");
        } finally {
            setLoading(false);
        }
    };

    const downloadReport = async (reportId) => {
        try {
            const token = localStorage.getItem("authToken");
            const res = await axios.get(`http://localhost:5000/api/financial-Statement/download/${reportId}`, {
                headers: { Authorization: `Bearer ${token}` },
                responseType: 'blob',
            });

            const url = window.URL.createObjectURL(res.data);
            const a = document.createElement("a");
            a.href = url;
            a.download = `financial-statement-${reportId}.pdf`;
            a.click();
            window.URL.revokeObjectURL(url);
        } catch (err) {
            console.error("Download failed", err);
            alert("Failed to download report.");
        }
    };

    const deleteReport = async (reportId) => {
        const confirmDelete = window.confirm("Are you sure you want to delete this report?");
        if (!confirmDelete) return;

        try {
            const token = localStorage.getItem("authToken");
            await axios.delete(`http://localhost:5000/api/financial-Statement/${reportId}`, {
                headers: { Authorization: `Bearer ${token}` },
            });

            await fetchFinancialReports(selectedBusiness);
        } catch (err) {
            console.error("Delete failed", err);
            alert("Failed to delete report.");
        }
    };

    return (
        <Container className="mt-5">
            <Row className="justify-content-center">
                <Card className="p-4 shadow">
                    <h3>Financial Reports</h3>

                    {error && <div className="alert alert-danger">{error}</div>}

                    <FormGroup>
                        <Label>Select Business Owner</Label>
                        <Input
                            type="select"
                            value={selectedOwner}
                            onChange={(e) => {
                                const ownerId = e.target.value;
                                setSelectedOwner(ownerId);
                                fetchBusinesses(ownerId);
                            }}
                        >
                            <option value="">-- Select Owner --</option>
                            {owners.length > 0 ? (
                                owners.map((owner) => (
                                    <option key={owner._id} value={owner._id}>{owner.fullName}</option>
                                ))
                            ) : (
                                <option>No business owners found</option>
                            )}
                        </Input>
                    </FormGroup>

                    <FormGroup>
                        <Label>Select Business</Label>
                        <Input
                            type="select"
                            value={selectedBusiness}
                            onChange={(e) => {
                                setSelectedBusiness(e.target.value);
                                fetchFinancialReports(e.target.value);
                            }}
                            disabled={!selectedOwner}
                        >
                            {businesses.length > 0 ? (
                                businesses.map((biz) => (
                                    <option key={biz._id} value={biz._id}>{biz.name}</option>
                                ))
                            ) : (
                                <option>No businesses found</option>
                            )}
                        </Input>
                    </FormGroup>

                    <Row className="mb-3">
                        <FormGroup className="col-md-6">
                            <Label>From Date</Label>
                            <Input
                                type="date"
                                value={fromDate}
                                onChange={(e) => setFromDate(e.target.value)}
                            />
                        </FormGroup>
                        <FormGroup className="col-md-6">
                            <Label>To Date</Label>
                            <Input
                                type="date"
                                value={toDate}
                                onChange={(e) => setToDate(e.target.value)}
                            />
                        </FormGroup>
                    </Row>

                    <Button color="primary" onClick={generateFinancialReport} disabled={loading || !selectedBusiness}>
                        {loading ? "Generating..." : "Generate New Report"}
                    </Button>

                    <h5 className="mt-4">Available Reports</h5>
                    <Table bordered responsive>
                        <thead>
                        <tr>
                            <th>#</th>
                            <th>Type</th>
                            <th>Period Start</th>
                            <th>Period End</th>
                            <th>Action</th>
                        </tr>
                        </thead>
                        <tbody>
                        {financialReports.length > 0 ? (
                            financialReports.map((report, idx) => (
                                <tr key={report._id}>
                                    <td>{idx + 1}</td>
                                    <td>{report.type}</td>
                                    <td>{new Date(report.periodStart).toLocaleDateString()}</td>
                                    <td>{new Date(report.periodEnd).toLocaleDateString()}</td>
                                    <td className="d-flex gap-2">
                                        <Button size="sm" color="success" onClick={() => downloadReport(report._id)}>
                                            Download
                                        </Button>
                                        <Button size="sm" color="danger" onClick={() => deleteReport(report._id)}>
                                            Delete
                                        </Button>
                                    </td>
                                </tr>
                            ))
                        ) : (
                            <tr><td colSpan="5">No reports found.</td></tr>
                        )}
                        </tbody>
                    </Table>
                </Card>
            </Row>
        </Container>
    );
};

export default FinancialReports;





