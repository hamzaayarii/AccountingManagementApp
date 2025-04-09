import React, { useState, useEffect } from 'react';
import axios from 'axios';
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
  Badge,
  Modal,
  ModalHeader,
  ModalBody,
  ModalFooter,
  Alert,
  InputGroup,
  InputGroupAddon,
  InputGroupText
} from 'reactstrap';
import { FaPlus, FaEdit, FaTrash, FaCheck, FaTimes } from 'react-icons/fa';
import Header from "components/Headers/Header.js";

// Account types based on Tunisian Chart of Accounts
const ACCOUNT_TYPES = {
  '1': 'CAPITAL_ACCOUNTS',      // Capital Accounts
  '2': 'FIXED_ASSETS',         // Fixed Assets
  '3': 'INVENTORY_ACCOUNTS',   // Inventory Accounts
  '4': 'THIRD_PARTY',         // Third Party Accounts
  '5': 'FINANCIAL_ACCOUNTS',   // Financial Accounts
  '6': 'EXPENSES',            // Expenses
  '7': 'REVENUE'              // Revenue
};

const Journal = () => {
  const [entries, setEntries] = useState([]);
  const [currentEntry, setCurrentEntry] = useState({
    date: new Date().toISOString().split('T')[0],
    description: '',
    entries: [],
    status: 'DRAFT',
    reference: {
      type: 'MANUAL'
    },
    fiscalYear: new Date().getFullYear().toString()
  });
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [notification, setNotification] = useState({ show: false, message: '', type: 'success' });
  const [filters, setFilters] = useState({
    startDate: '',
    endDate: '',
    status: '',
    searchTerm: ''
  });
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 10,
    total: 0
  });

  // Entry line item state
  const [lineItem, setLineItem] = useState({
    accountNumber: '',
    accountName: '',
    accountType: '',
    debit: 0,
    credit: 0,
    description: ''
  });

  // Get token from localStorage
  const getAuthToken = () => {
    const token = localStorage.getItem('authToken');
    console.log('Auth Token from localStorage:', token ? 'Token exists' : 'No token found');
    return token;
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
    console.log('Request interceptor - Token:', token ? 'Token exists' : 'No token');
    console.log('Request URL:', config.url);
    console.log('Request Headers:', config.headers);
    
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
      console.log('Authorization header added:', config.headers.Authorization);
    } else {
      console.warn('No auth token found, request will be unauthorized');
    }
    return config;
  });

  // Add response interceptor for debugging
  api.interceptors.response.use(
    (response) => {
      console.log('Response received:', response.status, response.config.url);
      return response;
    },
    (error) => {
      console.error('API Error:', {
        url: error.config?.url,
        status: error.response?.status,
        message: error.response?.data?.message,
        headers: error.config?.headers
      });
      return Promise.reject(error);
    }
  );

  useEffect(() => {
    console.log('Component mounted, checking authentication...');
    const token = getAuthToken();
    if (!token) {
      console.warn('No authentication token found, redirecting to login...');
      // You might want to redirect to login here
      // navigate('/auth/login');
    }
    fetchEntries();
  }, [pagination.page, filters]);

  const fetchEntries = async () => {
    try {
      setIsLoading(true);
      console.log('Fetching entries with params:', {
        page: pagination.page,
        limit: pagination.limit,
        ...filters
      });
      
      const response = await api.get('/journal', {
        params: {
          page: pagination.page,
          limit: pagination.limit,
          ...filters
        }
      });
      
      console.log('Entries fetched successfully:', response.data);
      setEntries(response.data.entries);
      setPagination(prev => ({
        ...prev,
        total: response.data.total
      }));
    } catch (error) {
      console.error('Error fetching entries:', {
        message: error.message,
        response: error.response?.data,
        status: error.response?.status
      });
      showNotification('Failed to fetch journal entries: ' + error.message, 'danger');
    } finally {
      setIsLoading(false);
    }
  };

  const showNotification = (message, type = 'success') => {
    setNotification({ show: true, message, type });
    setTimeout(() => setNotification({ show: false, message: '', type: 'success' }), 5000);
  };

  const handleFilterChange = (e) => {
    const { name, value } = e.target;
    setFilters(prev => ({
      ...prev,
      [name]: value
    }));
    setPagination(prev => ({ ...prev, page: 1 }));
  };

  const validateEntry = () => {
    if (!currentEntry.description) {
      showNotification('Description is required', 'warning');
      return false;
    }

    if (currentEntry.entries.length < 2) {
      showNotification('At least two lines are required for a journal entry', 'warning');
      return false;
    }

    const totalDebit = currentEntry.entries.reduce((sum, entry) => sum + (parseFloat(entry.debit) || 0), 0);
    const totalCredit = currentEntry.entries.reduce((sum, entry) => sum + (parseFloat(entry.credit) || 0), 0);

    if (Math.abs(totalDebit - totalCredit) > 0.01) {
      showNotification('Debits and credits must be equal', 'warning');
      return false;
    }

    return true;
  };

  const addLineItem = () => {
    if (!lineItem.accountNumber || (!lineItem.debit && !lineItem.credit)) {
      showNotification('Account number and either debit or credit amount are required', 'warning');
      return;
    }

    // Determine account type based on first digit
    const firstDigit = lineItem.accountNumber.charAt(0);
    const accountType = ACCOUNT_TYPES[firstDigit];
    
    if (!accountType) {
      showNotification('Invalid account number', 'warning');
      return;
    }

    setCurrentEntry(prev => ({
      ...prev,
      entries: [...prev.entries, { ...lineItem, accountType }]
    }));

    setLineItem({
      accountNumber: '',
      accountName: '',
      accountType: '',
      debit: 0,
      credit: 0,
      description: ''
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validateEntry()) return;

    try {
      setIsLoading(true);
      const method = currentEntry._id ? 'put' : 'post';
      const endpoint = currentEntry._id 
        ? `/journal/${currentEntry._id}`
        : '/journal';

      // Calculate totals before submission
      const totalDebit = currentEntry.entries.reduce((sum, entry) => sum + (parseFloat(entry.debit) || 0), 0);
      const totalCredit = currentEntry.entries.reduce((sum, entry) => sum + (parseFloat(entry.credit) || 0), 0);

      const dataToSubmit = {
        ...currentEntry,
        totalDebit,
        totalCredit,
        isBalanced: Math.abs(totalDebit - totalCredit) < 0.01
      };

      const response = await api[method](endpoint, dataToSubmit);
      
      showNotification(`Entry ${currentEntry._id ? 'updated' : 'created'} successfully`, 'success');
      setIsModalOpen(false);
      fetchEntries();
    } catch (error) {
      console.error('Submit error:', error.response?.data || error);
      showNotification(error.response?.data?.message || 'Error saving entry', 'danger');
    } finally {
      setIsLoading(false);
    }
  };

  const handleRemoveLine = (index) => {
    setCurrentEntry(prev => ({
      ...prev,
      entries: prev.entries.filter((_, i) => i !== index)
    }));
  };

  const handleStatusChange = async (entryId, newStatus) => {
    try {
      await api.patch(`/journal/${entryId}/status`, { status: newStatus });
      showNotification(`Entry status changed to ${newStatus}`);
      fetchEntries();
    } catch (error) {
      showNotification('Failed to change entry status: ' + error.message, 'danger');
    }
  };

  const handleDelete = async (entryId) => {
    try {
      await api.delete(`/journal/${entryId}`);
      showNotification('Journal entry deleted successfully');
      fetchEntries();
    } catch (error) {
      showNotification('Failed to delete entry: ' + error.message, 'danger');
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
                <Row className="align-items-center">
                  <Col xs="8">
                    <h3 className="mb-0">Accounting Journal</h3>
                  </Col>
                  <Col className="text-right" xs="4">
                    <Button
                      color="primary"
                      onClick={() => {
                        setCurrentEntry({
                          date: new Date().toISOString().split('T')[0],
                          description: '',
                          entries: [],
                          status: 'DRAFT',
                          reference: {
                            type: 'MANUAL'
                          },
                          fiscalYear: new Date().getFullYear().toString()
                        });
                        setIsModalOpen(true);
                      }}
                    >
                      <FaPlus className="mr-2" /> New Entry
                    </Button>
                  </Col>
                </Row>

                {/* Filters */}
                <Row className="mt-3">
                  <Col md="3">
                    <FormGroup>
                      <Label>Start Date</Label>
                      <Input
                        type="date"
                        name="startDate"
                        value={filters.startDate}
                        onChange={handleFilterChange}
                      />
                    </FormGroup>
                  </Col>
                  <Col md="3">
                    <FormGroup>
                      <Label>End Date</Label>
                      <Input
                        type="date"
                        name="endDate"
                        value={filters.endDate}
                        onChange={handleFilterChange}
                      />
                    </FormGroup>
                  </Col>
                  <Col md="3">
                    <FormGroup>
                      <Label>Status</Label>
                      <Input
                        type="select"
                        name="status"
                        value={filters.status}
                        onChange={handleFilterChange}
                      >
                        <option value="">All</option>
                        <option value="DRAFT">Draft</option>
                        <option value="POSTED">Posted</option>
                        <option value="VERIFIED">Verified</option>
                      </Input>
                    </FormGroup>
                  </Col>
                  <Col md="3">
                    <FormGroup>
                      <Label>Search</Label>
                      <Input
                        type="text"
                        name="searchTerm"
                        value={filters.searchTerm}
                        onChange={handleFilterChange}
                        placeholder="Search..."
                      />
                    </FormGroup>
                  </Col>
                </Row>
              </CardHeader>

              <CardBody>
                {notification.show && (
                  <Alert color={notification.type} className="mb-4">
                    {notification.message}
                  </Alert>
                )}

                <Table className="align-items-center table-flush" responsive>
                  <thead className="thead-light">
                    <tr>
                      <th>Date</th>
                      <th>Reference No.</th>
                      <th>Description</th>
                      <th>Total Amount</th>
                      <th>Status</th>
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {entries.map((entry) => (
                      <tr key={entry._id}>
                        <td>{new Date(entry.date).toLocaleDateString()}</td>
                        <td>{entry.pieceNumber}</td>
                        <td>{entry.description}</td>
                        <td>{entry.totalDebit.toFixed(2)} TND</td>
                        <td>
                          <Badge color={
                            entry.status === 'VERIFIED' ? 'success' :
                            entry.status === 'POSTED' ? 'info' : 'warning'
                          }>
                            {entry.status}
                          </Badge>
                        </td>
                        <td>
                          {entry.status === 'DRAFT' && (
                            <>
                              <Button
                                color="warning"
                                size="sm"
                                className="mr-2"
                                onClick={() => {
                                  setCurrentEntry(entry);
                                  setIsModalOpen(true);
                                }}
                              >
                                <FaEdit />
                              </Button>
                              <Button
                                color="danger"
                                size="sm"
                                className="mr-2"
                                onClick={() => handleDelete(entry._id)}
                              >
                                <FaTrash />
                              </Button>
                            </>
                          )}
                          {entry.status === 'DRAFT' && (
                            <Button
                              color="info"
                              size="sm"
                              onClick={() => handleStatusChange(entry._id, 'POSTED')}
                            >
                              Post
                            </Button>
                          )}
                          {entry.status === 'POSTED' && (
                            <Button
                              color="success"
                              size="sm"
                              onClick={() => handleStatusChange(entry._id, 'VERIFIED')}
                            >
                              Verify
                            </Button>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </Table>
              </CardBody>
            </Card>
          </div>
        </Row>

        {/* Entry Modal */}
        <Modal isOpen={isModalOpen} toggle={() => setIsModalOpen(false)} size="lg">
          <Form onSubmit={handleSubmit}>
            <ModalHeader toggle={() => setIsModalOpen(false)}>
              {currentEntry._id ? 'Edit Entry' : 'New Entry'}
            </ModalHeader>
            <ModalBody>
              <Row>
                <Col md="6">
                  <FormGroup>
                    <Label>Date</Label>
                    <Input
                      type="date"
                      value={currentEntry.date}
                      onChange={(e) => setCurrentEntry(prev => ({ ...prev, date: e.target.value }))}
                      required
                    />
                  </FormGroup>
                </Col>
                <Col md="6">
                  <FormGroup>
                    <Label>Description</Label>
                    <Input
                      type="text"
                      value={currentEntry.description}
                      onChange={(e) => setCurrentEntry(prev => ({ ...prev, description: e.target.value }))}
                      required
                    />
                  </FormGroup>
                </Col>
              </Row>

              <Row>
                <Col md="6">
                  <FormGroup>
                    <Label>Reference Type</Label>
                    <Input
                      type="select"
                      value={currentEntry.reference.type}
                      onChange={(e) => setCurrentEntry(prev => ({
                        ...prev,
                        reference: { ...prev.reference, type: e.target.value }
                      }))}
                    >
                      <option value="MANUAL">Manual</option>
                      <option value="INVOICE">Invoice</option>
                      <option value="PURCHASE">Purchase</option>
                      <option value="OTHER">Other</option>
                    </Input>
                  </FormGroup>
                </Col>
                <Col md="6">
                  <FormGroup>
                    <Label>Fiscal Year</Label>
                    <Input
                      type="text"
                      value={currentEntry.fiscalYear}
                      onChange={(e) => setCurrentEntry(prev => ({ ...prev, fiscalYear: e.target.value }))}
                      pattern="\d{4}"
                      required
                    />
                  </FormGroup>
                </Col>
              </Row>

              {/* Entry Lines */}
              <Table>
                <thead>
                  <tr>
                    <th>Account</th>
                    <th>Label</th>
                    <th>Debit</th>
                    <th>Credit</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {currentEntry.entries.map((item, index) => (
                    <tr key={index}>
                      <td>{item.accountNumber}</td>
                      <td>{item.accountName}</td>
                      <td>{item.debit} TND</td>
                      <td>{item.credit} TND</td>
                      <td>
                        <Button
                          color="danger"
                          size="sm"
                          onClick={() => handleRemoveLine(index)}
                        >
                          Remove
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr>
                    <td>
                      <Input
                        type="text"
                        value={lineItem.accountNumber}
                        onChange={(e) => setLineItem(prev => ({ ...prev, accountNumber: e.target.value }))}
                        placeholder="Account No."
                        pattern="\d{1,5}"
                      />
                    </td>
                    <td>
                      <Input
                        type="text"
                        value={lineItem.accountName}
                        onChange={(e) => setLineItem(prev => ({ ...prev, accountName: e.target.value }))}
                        placeholder="Label"
                      />
                    </td>
                    <td>
                      <Input
                        type="number"
                        value={lineItem.debit}
                        onChange={(e) => setLineItem(prev => ({ 
                          ...prev, 
                          debit: parseFloat(e.target.value) || 0,
                          credit: 0
                        }))}
                        min="0"
                        step="0.01"
                        placeholder="Debit"
                      />
                    </td>
                    <td>
                      <Input
                        type="number"
                        value={lineItem.credit}
                        onChange={(e) => setLineItem(prev => ({ 
                          ...prev, 
                          credit: parseFloat(e.target.value) || 0,
                          debit: 0
                        }))}
                        min="0"
                        step="0.01"
                        placeholder="Credit"
                      />
                    </td>
                    <td>
                      <Button color="success" onClick={addLineItem}>
                        Add
                      </Button>
                    </td>
                  </tr>
                  <tr>
                    <td colSpan="2"><strong>Totals:</strong></td>
                    <td><strong>{currentEntry.entries.reduce((sum, item) => sum + (parseFloat(item.debit) || 0), 0).toFixed(2)} TND</strong></td>
                    <td><strong>{currentEntry.entries.reduce((sum, item) => sum + (parseFloat(item.credit) || 0), 0).toFixed(2)} TND</strong></td>
                    <td></td>
                  </tr>
                </tfoot>
              </Table>
            </ModalBody>
            <ModalFooter>
              <Button color="secondary" onClick={() => setIsModalOpen(false)}>
                Cancel
              </Button>
              <Button color="primary" type="submit">
                Save
              </Button>
            </ModalFooter>
          </Form>
        </Modal>
      </Container>
    </>
  );
};

export default Journal; 