import React, { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import { jwtDecode } from 'jwt-decode';
import { Alert, Modal, ModalHeader, ModalBody, ModalFooter, Button, Card, CardHeader, CardBody, CardTitle, Input, Label, FormFeedback, FormGroup, Row, Col, Table, Form } from 'reactstrap';
import { FaUserPlus, FaUpload, FaEdit, FaTrash, FaCalendarAlt, FaSpinner } from 'react-icons/fa';
import debounce from 'lodash/debounce';
import styles from '../../assets/css/EmployeeManagement.module.css';

// Validation regex patterns
const PATTERNS = {
    name: /^[a-zA-Z\s-]{2,50}$/,
    position: /^[a-zA-Z\s-]{2,100}$/,
    salary: /^\d+(\.\d{1,2})?$/,
    date: /^\d{4}-(0[1-9]|1[0-2])-(0[1-9]|[12]\d|3[01])$/,
    reason: /^.{2,200}$/,
};

// Error messages
const ERROR_MESSAGES = {
    required: 'This field is required',
    invalidName: 'Name must be 2-50 characters, letters only',
    invalidPosition: 'Position must be 2-100 characters, letters only',
    invalidSalary: 'Please enter a valid positive number',
    invalidDate: 'Please use YYYY-MM-DD format',
    pastLimit: 'Date cannot be before year 2000',
    futureDate: 'Future dates are not allowed',
    invalidReason: 'Must be 2-200 characters',
    invalidDateRange: 'End date must be after start date',
    businessRequired: 'Please select a business',
    unauthorized: 'You must be a business owner to manage employees',
    serverError: 'Server error occurred. Please try again.',
    networkError: 'Network error. Please check your connection.',
};

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000/api';

const EmployeeManagement = () => {
    const [employees, setEmployees] = useState([]);
    const [businesses, setBusinesses] = useState([]);
    const [loading, setLoading] = useState({ fetch: false, submit: false });
    const [error, setError] = useState('');
    const [success, setSuccess] = useState('');
    const [userRole, setUserRole] = useState(null);
    const [formData, setFormData] = useState({
        firstName: '', lastName: '', position: '', salary: '', hireDate: '', businessId: ''
    });
    const [formErrors, setFormErrors] = useState({
        firstName: '', lastName: '', position: '', salary: '', hireDate: '', businessId: ''
    });
    const [editEmployee, setEditEmployee] = useState(null);
    const [showAbsenceModal, setShowAbsenceModal] = useState(false);
    const [absenceData, setAbsenceData] = useState({
        employeeId: '', startDate: '', endDate: '', reason: ''
    });
    const [absenceErrors, setAbsenceErrors] = useState({
        employeeId: '', startDate: '', endDate: '', reason: ''
    });
    const [importData, setImportData] = useState(null);

    // Validation avancée
    const validateName = useCallback((value) => {
        if (!value) return ERROR_MESSAGES.required;
        return PATTERNS.name.test(value.trim()) ? '' : ERROR_MESSAGES.invalidName;
    }, []);

    const validatePosition = useCallback((value) => {
        if (!value) return ERROR_MESSAGES.required;
        return PATTERNS.position.test(value.trim()) ? '' : ERROR_MESSAGES.invalidPosition;
    }, []);

    const validateSalary = useCallback((value) => {
        if (!value) return ERROR_MESSAGES.required;
        return PATTERNS.salary.test(value) && Number(value) >= 0 ? '' : ERROR_MESSAGES.invalidSalary;
    }, []);

    const validateDate = useCallback((value, allowFuture = false) => {
        if (!value) return ERROR_MESSAGES.required;
        if (!PATTERNS.date.test(value)) return ERROR_MESSAGES.invalidDate;
        const [year] = value.split('-').map(Number);
        if (year < 2000) return ERROR_MESSAGES.pastLimit;
        const date = new Date(value);
        const now = new Date();
        return allowFuture || date <= now ? '' : ERROR_MESSAGES.futureDate;
    }, []);

    const validateReason = useCallback((value) => {
        if (!value) return ERROR_MESSAGES.required;
        return PATTERNS.reason.test(value.trim()) ? '' : ERROR_MESSAGES.invalidReason;
    }, []);

    const validateEmployeeId = useCallback((value) => {
        if (!value) return ERROR_MESSAGES.required;
        return employees.some(emp => emp._id === value) ? '' : 'Employé invalide';
    }, [employees]);

    const validateBusinessId = useCallback((value) => {
        if (!value) return ERROR_MESSAGES.required;
        return businesses.some(biz => biz._id === value) ? '' : 'Entreprise invalide';
    }, [businesses]);

    const debouncedValidate = useCallback(
        debounce((name, value, isAbsence = false) => {
            let error = '';
            switch (name) {
                case 'firstName':
                case 'lastName': error = validateName(value); break;
                case 'position': error = validatePosition(value); break;
                case 'salary': error = validateSalary(value); break;
                case 'hireDate': error = validateDate(value); break;
                case 'businessId': error = validateBusinessId(value); break;
                case 'employeeId': error = validateEmployeeId(value); break;
                case 'startDate':
                case 'endDate': error = validateDate(value, true); break;
                case 'reason': error = validateReason(value); break;
                default: break;
            }
            if (isAbsence) {
                setAbsenceErrors(prev => ({ ...prev, [name]: error }));
            } else {
                setFormErrors(prev => ({ ...prev, [name]: error }));
            }
        }, 300),
        [validateName, validatePosition, validateSalary, validateDate, validateReason, validateEmployeeId, validateBusinessId]
    );

    const fetchEmployees = async () => {
        setLoading(prev => ({ ...prev, fetch: true }));
        setError('');
        try {
            const token = localStorage.getItem('authToken');
            if (!token) {
                setError('Authentication required. Please log in.');
                return;
            }
            
            const response = await axios.get(`${API_URL}/employees`, {
                headers: { 
                    Authorization: `Bearer ${token}`,
                    'Content-Type': 'application/json'
                }
            });
            
            if (response.data.success) {
                setEmployees(response.data.employees || []);
                setError(null);
            } else {
                setError(response.data.message || 'Failed to load employees');
            }
        } catch (err) {
            console.error('Error fetching employees:', err);
            if (err.response?.status === 403) {
                setError('Access denied. Only business owners can manage employees.');
            } else if (err.response?.status === 401) {
                setError('Authentication required. Please log in.');
            } else {
                setError(err.response?.data?.message || 'Unable to connect to server. Please try again.');
            }
        } finally {
            setLoading(prev => ({ ...prev, fetch: false }));
        }
    };

    const checkBusinessOwner = () => {
        const userData = JSON.parse(localStorage.getItem('user') || '{}');
        return userData && userData.role === 'business_owner';
    };

    const fetchBusinesses = async () => {
        setLoading(prev => ({ ...prev, fetch: true }));
        try {
            const token = localStorage.getItem('authToken');
            if (!token) {
                setError('Authentication required. Please log in.');
                return;
            }
            const response = await axios.get(`${API_URL}/business/user-businesses`, {
                headers: { 
                    Authorization: `Bearer ${token}`,
                    'Content-Type': 'application/json'
                }
            });
            
            if (response.data && Array.isArray(response.data.businesses)) {
                setBusinesses(response.data.businesses);
                // Set the first business as default if available and no business is selected
                if (response.data.businesses.length > 0 && !formData.businessId) {
                    setFormData(prev => ({ ...prev, businessId: response.data.businesses[0]._id }));
                }
            } else {
                console.error('Invalid business data format:', response.data);
                setError('Failed to load businesses. Please try again.');
            }
        } catch (err) {
            console.error('Error fetching businesses:', err);
            setError('Failed to load businesses. Please try again.');
        } finally {
            setLoading(prev => ({ ...prev, fetch: false }));
        }
    };

    useEffect(() => {
        const checkAuthAndFetch = async () => {
            const token = localStorage.getItem('authToken');
            const userData = JSON.parse(localStorage.getItem('user') || '{}');
            
            if (!token || !userData) {
                setError(ERROR_MESSAGES.unauthorized);
                return;
            }

            try {
                // Set user role
                setUserRole(userData.role);

                // Verify user role from stored data
                if (userData.role !== 'business_owner') {
                    setError('Access denied. Only business owners can manage employees.');
                    return;
                }

                // Fetch both businesses and employees
                await Promise.all([
                    fetchBusinesses(),
                    fetchEmployees()
                ]);
            } catch (err) {
                console.error('Auth error:', err);
                if (err.response?.status === 401) {
                    setError('Authentication required. Please log in.');
                } else if (err.response?.status === 403) {
                    setError('Access denied. Only business owners can manage employees.');
                } else {
                    setError(err.response?.data?.message || 'Authentication failed');
                }
            }
        };

        checkAuthAndFetch();
    }, []);

    const handleInputChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
        debouncedValidate(name, value);
        setError('');
    };

    const handleAbsenceInputChange = (e) => {
        const { name, value } = e.target;
        setAbsenceData(prev => ({ ...prev, [name]: value }));
        debouncedValidate(name, value, true);
        setError('');
    };

    const validateForm = () => {
        const errors = {
            firstName: validateName(formData.firstName),
            lastName: validateName(formData.lastName),
            position: validatePosition(formData.position),
            salary: validateSalary(formData.salary),
            hireDate: validateDate(formData.hireDate),
            businessId: validateBusinessId(formData.businessId)
        };
        setFormErrors(errors);
        return Object.values(errors).every(error => !error);
    };

    const validateAbsence = () => {
        const errors = {
            employeeId: validateEmployeeId(absenceData.employeeId),
            startDate: validateDate(absenceData.startDate, true),
            endDate: validateDate(absenceData.endDate, true),
            reason: validateReason(absenceData.reason)
        };
        if (!errors.startDate && !errors.endDate) {
            const start = new Date(absenceData.startDate);
            const end = new Date(absenceData.endDate);
            if (start > end) errors.endDate = ERROR_MESSAGES.invalidDateRange;
        }
        setAbsenceErrors(errors);
        return Object.values(errors).every(error => !error);
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (Object.values(formErrors).some(err => !!err)) {
            setError('Please fix the form errors before submitting');
            return;
        }

        if (!formData.businessId) {
            setError(ERROR_MESSAGES.businessRequired);
            return;
        }

        setLoading(prev => ({ ...prev, submit: true }));
        setError('');
        setSuccess('');

        try {
            const token = localStorage.getItem('authToken');
            if (!token) {
                setError(ERROR_MESSAGES.unauthorized);
                return;
            }

            const endpoint = editEmployee
                ? `${API_URL}/employees/${editEmployee._id}`
                : `${API_URL}/employees`;

            const method = editEmployee ? 'put' : 'post';

            const response = await axios[method](endpoint, formData, {
                headers: { 
                    Authorization: `Bearer ${token}`,
                    'Content-Type': 'application/json'
                }
            });

            if (response.data.success || response.data.employee) {
                const newEmployee = response.data.employee;
                
                if (editEmployee) {
                    // Update existing employee in the list
                    setEmployees(prevEmployees => 
                        prevEmployees.map(emp => 
                            emp._id === editEmployee._id ? newEmployee : emp
                        )
                    );
                } else {
                    // Add new employee to the list
                    setEmployees(prevEmployees => [...prevEmployees, newEmployee]);
                }
                
                // Show success message and reset form
                setSuccess(editEmployee ? 'Employee updated successfully!' : 'Employee added successfully!');
                setEditEmployee(null);
                resetForm();
            } else {
                setError(response.data.message || ERROR_MESSAGES.serverError);
            }
        } catch (err) {
            console.error('Submit error:', err);
            if (err.response?.status === 401 || err.response?.status === 403) {
                setError(ERROR_MESSAGES.unauthorized);
            } else if (!navigator.onLine) {
                setError(ERROR_MESSAGES.networkError);
            } else {
                setError(err.response?.data?.message || ERROR_MESSAGES.serverError);
            }
        } finally {
            setLoading(prev => ({ ...prev, submit: false }));
        }
    };

    const handleDeleteEmployee = async (id) => {
        if (!window.confirm('Êtes-vous sûr de vouloir supprimer cet employé ?')) return;
        setLoading(prev => ({ ...prev, submit: true }));
        try {
            const token = localStorage.getItem('authToken');
            await axios.delete(`${API_URL}/employees/${id}`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            setEmployees(employees.filter(emp => emp._id !== id));
            setSuccess('Employé supprimé avec succès !');
        } catch (err) {
            setError(err.response?.data?.message || 'Échec de la suppression de l\'employé');
        } finally {
            setLoading(prev => ({ ...prev, submit: false }));
        }
    };

    const handleImportEmployees = async () => {
        if (!importData) {
            setError('Please select a file to import');
            return;
        }

        setLoading(prev => ({ ...prev, submit: true }));
        try {
            const token = localStorage.getItem('authToken');
            const formData = new FormData();
            formData.append('file', importData);

            const response = await axios.post(`${API_URL}/auth/employees/import`, formData, {
                headers: { 
                    Authorization: `Bearer ${token}`,
                    'Content-Type': 'multipart/form-data'
                }
            });

            if (response.data.success) {
                setSuccess('Employees imported successfully!');
                await fetchEmployees();
            } else {
                setError(response.data.message || 'Import failed');
            }
        } catch (err) {
            console.error('Import error:', err);
            setError(err.response?.data?.message || 'Import failed');
        } finally {
            setLoading(prev => ({ ...prev, submit: false }));
        }
    };

    const handleAddAbsence = async () => {
        if (!validateAbsence()) return;

        setLoading(prev => ({ ...prev, submit: true }));
        try {
            const token = localStorage.getItem('authToken');
            const response = await axios.post(`${API_URL}/employees/${absenceData.employeeId}/absences`, absenceData, {
                headers: { Authorization: `Bearer ${token}` }
            });

            if (response.data.success) {
                setSuccess('Absence added successfully!');
                setShowAbsenceModal(false);
                setAbsenceData({ employeeId: '', startDate: '', endDate: '', reason: '' });
                setAbsenceErrors({ employeeId: '', startDate: '', endDate: '', reason: '' });
            } else {
                setError(response.data.message || 'Failed to add absence');
            }
        } catch (err) {
            console.error('Absence error:', err);
            setError(err.response?.data?.message || 'Failed to add absence');
        } finally {
            setLoading(prev => ({ ...prev, submit: false }));
        }
    };

    const handleEditEmployee = (employee) => {
        setEditEmployee(employee);
        setFormData({
            firstName: employee.firstName,
            lastName: employee.lastName,
            position: employee.position,
            salary: employee.salary,
            hireDate: employee.hireDate,
            businessId: employee.businessId
        });
    };

    const resetForm = () => {
        setFormData({ firstName: '', lastName: '', position: '', salary: '', hireDate: '', businessId: businesses[0]?._id || '' });
        setFormErrors({ firstName: '', lastName: '', position: '', salary: '', hireDate: '', businessId: '' });
    };

    return (
        <div className={styles.container}>
            {error && <Alert color="danger">{error}</Alert>}
            {success && <Alert color="success">{success}</Alert>}
            
            {(!userRole || userRole !== 'business_owner') ? (
                <Alert color="warning">
                    Access denied. Only business owners can manage employees.
                </Alert>
            ) : (
                <>
                    <Card className="shadow">
                        <CardHeader className="border-0">
                            <Row className="align-items-center">
                                <Col>
                                    <h3 className="mb-0">Add a New Member</h3>
                                </Col>
                            </Row>
                        </CardHeader>
                        <CardBody>
                            <Form onSubmit={handleSubmit}>
                                <Row>
                                    <Col md="4">
                                        <FormGroup>
                                            <Label>First name</Label>
                                            <Input
                                                type="text"
                                                name="firstName"
                                                value={formData.firstName}
                                                onChange={handleInputChange}
                                                invalid={!!formErrors.firstName}
                                                disabled={loading.submit}
                                            />
                                            <FormFeedback>{formErrors.firstName}</FormFeedback>
                                        </FormGroup>
                                    </Col>
                                    <Col md="4">
                                        <FormGroup>
                                            <Label>Last name</Label>
                                            <Input
                                                type="text"
                                                name="lastName"
                                                value={formData.lastName}
                                                onChange={handleInputChange}
                                                invalid={!!formErrors.lastName}
                                                disabled={loading.submit}
                                            />
                                            <FormFeedback>{formErrors.lastName}</FormFeedback>
                                        </FormGroup>
                                    </Col>
                                    <Col md="4">
                                        <FormGroup>
                                            <Label>Job</Label>
                                            <Input
                                                type="text"
                                                name="position"
                                                value={formData.position}
                                                onChange={handleInputChange}
                                                invalid={!!formErrors.position}
                                                disabled={loading.submit}
                                            />
                                            <FormFeedback>{formErrors.position}</FormFeedback>
                                        </FormGroup>
                                    </Col>
                                </Row>
                                <Row>
                                    <Col md="4">
                                        <FormGroup>
                                            <Label>Salary (TND)</Label>
                                            <Input
                                                type="number"
                                                name="salary"
                                                value={formData.salary}
                                                onChange={handleInputChange}
                                                invalid={!!formErrors.salary}
                                                disabled={loading.submit}
                                            />
                                            <FormFeedback>{formErrors.salary}</FormFeedback>
                                        </FormGroup>
                                    </Col>
                                    <Col md="4">
                                        <FormGroup>
                                            <Label>Date of hire</Label>
                                            <Input
                                                type="date"
                                                name="hireDate"
                                                value={formData.hireDate}
                                                onChange={handleInputChange}
                                                invalid={!!formErrors.hireDate}
                                                disabled={loading.submit}
                                            />
                                            <FormFeedback>{formErrors.hireDate}</FormFeedback>
                                        </FormGroup>
                                    </Col>
                                    <Col md="4">
                                        <FormGroup>
                                            <Label>Business</Label>
                                            <Input
                                                type="select"
                                                name="businessId"
                                                value={formData.businessId}
                                                onChange={handleInputChange}
                                                invalid={!!formErrors.businessId}
                                                disabled={loading.submit}
                                            >
                                                <option value="">Select a business</option>
                                                {businesses.map(business => (
                                                    <option key={business._id} value={business._id}>
                                                        {business.name}
                                                    </option>
                                                ))}
                                            </Input>
                                            <FormFeedback>{formErrors.businessId}</FormFeedback>
                                        </FormGroup>
                                    </Col>
                                </Row>
                                <Button
                                    type="submit"
                                    color="primary"
                                    disabled={loading.submit || Object.values(formErrors).some(err => !!err)}
                                >
                                    {loading.submit ? <FaSpinner className="fa-spin" /> : 'Add'}
                                </Button>
                            </Form>
                        </CardBody>
                    </Card>

                    <Card className="mt-4 shadow">
                        <CardHeader className="border-0">
                            <Row className="align-items-center">
                                <Col>
                                    <h3 className="mb-0">Your Team</h3>
                                </Col>
                            </Row>
                        </CardHeader>
                        <CardBody>
                            {loading.fetch ? (
                                <div className="text-center py-4">
                                    <FaSpinner className="fa-spin" /> Loading...
                                </div>
                            ) : employees.length === 0 ? (
                                <Alert color="info">
                                    No employees found. Add your first team member above.
                                </Alert>
                            ) : (
                                <Table className="align-items-center" responsive>
                                    <thead className="thead-light">
                                        <tr>
                                            <th>Name</th>
                                            <th>Position</th>
                                            <th>Salary</th>
                                            <th>Hire Date</th>
                                            <th>Business</th>
                                            <th>Actions</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {employees.map(employee => (
                                            <tr key={employee._id}>
                                                <td>{employee.firstName} {employee.lastName}</td>
                                                <td>{employee.position}</td>
                                                <td>{employee.salary} TND</td>
                                                <td>{new Date(employee.hireDate).toLocaleDateString()}</td>
                                                <td>{employee.businessId?.name || 'N/A'}</td>
                                                <td>
                                                    <Button
                                                        color="info"
                                                        size="sm"
                                                        onClick={() => handleEditEmployee(employee)}
                                                        className="mr-2"
                                                    >
                                                        <FaEdit />
                                                    </Button>
                                                    <Button
                                                        color="danger"
                                                        size="sm"
                                                        onClick={() => handleDeleteEmployee(employee._id)}
                                                    >
                                                        <FaTrash />
                                                    </Button>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </Table>
                            )}
                        </CardBody>
                    </Card>
                </>
            )}
        </div>
    );
};

export default EmployeeManagement;