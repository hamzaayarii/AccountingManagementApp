import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useForm, useFieldArray } from 'react-hook-form';
import { Alert, Modal, ModalHeader, ModalBody, Input, Table, Spinner } from 'reactstrap';
import { FaSearch } from 'react-icons/fa';
import styles from '../../assets/css/CreateInvoice.module.css';

const CreateInvoice = () => {
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [success, setSuccess] = useState('');
    const [businesses, setBusinesses] = useState([]);
    const [selectedBusiness, setSelectedBusiness] = useState(null);
    const [itemModal, setItemModal] = useState(false);
    const [items, setItems] = useState([]);
    const [searchTerm, setSearchTerm] = useState('');
    const [loadingItems, setLoadingItems] = useState(false);

    const { register, control, handleSubmit, watch, setValue, reset, formState: { errors } } = useForm({
        defaultValues: {
            businessId: '',
            customerName: '',
            invoiceNumber: '',
            orderNumber: '',
            invoiceDate: new Date().toISOString().split('T')[0],
            dueDate: '',
            items: [{ itemDetails: '', quantity: 1, rate: 0, taxPercentage: 0 }],
            discount: 0,
            shippingCharges: 0,
            customerNotes: ''
        },
        mode: 'onChange'
    });

    const { fields, append, remove, replace } = useFieldArray({
        control,
        name: 'items'
    });

    const watchItems = watch('items');
    const watchDiscount = watch('discount');
    const watchShippingCharges = watch('shippingCharges');
    const watchBusinessId = watch('businessId');

    useEffect(() => {
        const fetchBusinesses = async () => {
            try {
                const token = localStorage.getItem('authToken');
                if (!token) throw new Error('You must be logged in to retrieve businesses');

                const response = await axios.get('http://localhost:5000/api/business/user-businesses', {
                    headers: { Authorization: `Bearer ${token}` },
                    timeout: 10000
                });

                const businessList = response.data.businesses || [];
                setBusinesses(businessList);
                
                if (businessList.length > 0) {
                    setValue('businessId', businessList[0]._id);
                    setSelectedBusiness(businessList[0]);
                } else {
                    setError('No businesses found. Please create a business first.');
                }
            } catch (err) {
                setError(err.response?.data?.message || 'Error retrieving businesses');
                console.error('Error fetching businesses:', err.response?.data || err);
            }
        };

        fetchBusinesses();
    }, [setValue]);

    useEffect(() => {
        const business = businesses.find(b => b._id === watchBusinessId);
        setSelectedBusiness(business || null);
    }, [watchBusinessId, businesses]);

    const fetchItems = async (search = '') => {
        try {
            setLoadingItems(true);
            const response = await axios.get(`http://localhost:5000/api/products`, {
                params: { search }
            });
            if (Array.isArray(response.data)) {
                setItems(response.data);
            } else if (response.data.products) {
                setItems(response.data.products);
            }
        } catch (error) {
            console.error('Error fetching items:', error);
            setError('Failed to load items');
        } finally {
            setLoadingItems(false);
        }
    };

    const handleSearchChange = (e) => {
        setSearchTerm(e.target.value);
        fetchItems(e.target.value);
    };

    const handleItemSelect = (item) => {
        const newItem = {
            itemDetails: item.name,
            quantity: 1,
            rate: item.salesInfo.sellingPrice,
            taxPercentage: item.salesInfo.tax
        };
        append(newItem);
        setItemModal(false);
    };

    const calculateAmount = (item) => {
        const qty = Number(item.quantity) || 0;
        const rate = Number(item.rate) || 0;
        const taxPercentage = Number(item.taxPercentage) || 0;
        const baseAmount = qty * rate;
        const taxAmount = baseAmount * (taxPercentage / 100);
        return Number((baseAmount + taxAmount).toFixed(2));
    };

    const calculateTotals = () => {
        const subTotal = watchItems.reduce((sum, item) => sum + calculateAmount(item), 0);
        const discountAmount = Number(watchDiscount) || 0;
        const shipping = Number(watchShippingCharges) || 0;
        const total = subTotal - discountAmount + shipping;
        return { subTotal: subTotal.toFixed(2), total: Math.max(0, total).toFixed(2) };
    };

    const { subTotal, total } = calculateTotals();

    const onSubmit = async (data) => {
        setError('');
        setSuccess('');
        setLoading(true);

        try {
            const token = localStorage.getItem('authToken');
            if (!token) throw new Error('Vous devez être connecté pour créer une facture');

            const invoiceData = {
                ...data,
                subTotal,
                total,
                items: data.items.map(item => ({
                    ...item,
                    amount: calculateAmount(item)
                }))
            };

            const response = await axios.post(
                'http://localhost:5000/api/invoices', // Line 109
                invoiceData,
                { headers: { Authorization: `Bearer ${token}` }, timeout: 10000 }
            );

            setSuccess('Facture créée avec succès');
            reset();
        } catch (err) {
            setError(err.response?.data?.message || err.message || 'Erreur lors de la création de la facture');
            console.error('Erreur lors de la création:', err); // Line 119
        } finally {
            setLoading(false);
        }
    };

    const handleExtract = async (event) => {
        if (!event?.target?.files?.[0]) {
            setError('Aucun fichier sélectionné.');
            return;
        }

        const file = event.target.files[0];
        if (file.size === 0) {
            setError('Le fichier est vide.');
            return;
        }
        if (file.size > 10 * 1024 * 1024) {
            setError('Le fichier est trop volumineux (max 10 Mo).');
            return;
        }
        if (!watchBusinessId) {
            setError('Please select a company before uploading a document');
            return;
        }

        setError('');
        setSuccess('');
        setLoading(true);

        try {
            const token = localStorage.getItem('authToken');
            if (!token) {
                throw new Error('You must be logged in to retrieve data');
            }

            const formData = new FormData();
            formData.append('file', file);
            formData.append('businessId', watchBusinessId);

            const response = await axios.post(
                'http://localhost:5000/api/invoices/extract',
                formData,
                {
                    headers: {
                        Authorization: `Bearer ${token}`,
                        'Content-Type': 'multipart/form-data'
                    },
                    timeout: 15000
                }
            );

            if (!response.data || !response.data.invoiceData) {
                throw new Error('Réponse invalide du serveur');
            }

            const { invoiceData } = response.data;
            console.log('Extracted invoiceData:', invoiceData);

            if (!invoiceData.items || !Array.isArray(invoiceData.items)) {
                throw new Error('The item data is invalid');
            }

            const calculatedSubTotal = invoiceData.items.reduce((sum, item) => {
                const amount = Number(item.amount) || 0;
                return sum + amount;
            }, 0);
            const calculatedTotal = Number(
                (calculatedSubTotal - (Number(invoiceData.discount) || 0) +
                    (Number(invoiceData.shippingCharges) || 0)).toFixed(2)
            );

            if (Math.abs(calculatedTotal - Number(invoiceData.total)) > 0.01) {
                setError(`Attention : Le total extrait (${invoiceData.total}) ne correspond pas au total calculé (${calculatedTotal}). Veuillez vérifier les données.`);
            }

            const cleanedItems = invoiceData.items.map(item => ({
                itemDetails: item.itemDetails?.trim() || '',
                quantity: Number(item.quantity) || 1,
                rate: Number(item.rate) || 0,
                taxPercentage: Number(item.taxPercentage) || 0,
                amount: Number(item.amount) || 0
            }));

            reset({
                businessId: invoiceData.businessId || watchBusinessId,
                customerName: invoiceData.customerName?.trim() || '',
                invoiceNumber: invoiceData.invoiceNumber?.toString() || '',
                orderNumber: invoiceData.orderNumber?.toString() || '',
                invoiceDate: invoiceData.invoiceDate || new Date().toISOString().split('T')[0],
                dueDate: invoiceData.dueDate || '',
                discount: Number(invoiceData.discount) || 0,
                shippingCharges: Number(invoiceData.shippingCharges) || 0,
                customerNotes: invoiceData.customerNotes ? invoiceData.customerNotes.replace(/Page \d+ de \d+/i, '').trim() : '',
                items: cleanedItems.length > 0 ? cleanedItems : [{ itemDetails: '', quantity: 1, rate: 0, taxPercentage: 0 }]
            });

            setSuccess('Information successfully extracted');
        } catch (err) {
            let errorMessage = 'Error while extracting data';
            if (err.response?.data?.message) {
                errorMessage = err.response.data.message;
            } else if (err.message) {
                errorMessage = err.message;
            }
            if (errorMessage.includes('bad XRef entry')) {
                setError('Le fichier PDF est corrompu ou mal formé. Veuillez essayer un autre fichier.');
            } else if (errorMessage.includes('Aucun texte détecté')) {
                setError('Aucun texte détecté dans le document. Assurez-vous qu\'il contient du texte clair et lisible.');
            } else if (err.code === 'ECONNABORTED') {
                setError('Délai d\'attente dépassé. Veuillez réessayer.');
            } else {
                setError(errorMessage);
            }
            console.error('Extraction error:', err.response?.data || err);
        } finally {
            setLoading(false);
            event.target.value = '';
        }
    };

    const handleImport = async (event) => {
        const file = event.target.files[0];
        if (!file) return;

        if (file.size === 0) {
            setError('Le fichier JSON est vide.');
            return;
        }

        try {
            const reader = new FileReader();
            reader.onload = async (e) => {
                try {
                    const data = JSON.parse(e.target.result);
                    if (!data || typeof data !== 'object') {
                        setError('Fichier JSON invalide');
                        return;
                    }

                    setValue('businessId', data.businessId || watchBusinessId);
                    setValue('customerName', data.customerName || '');
                    setValue('invoiceNumber', data.invoiceNumber || '');
                    setValue('orderNumber', data.orderNumber || '');
                    setValue('invoiceDate', data.invoiceDate || new Date().toISOString().split('T')[0]);
                    setValue('dueDate', data.dueDate || '');
                    setValue('discount', data.discount || 0);
                    setValue('shippingCharges', data.shippingCharges || 0);
                    setValue('customerNotes', data.customerNotes || '');

                    if (data.items && Array.isArray(data.items) && data.items.length > 0) {
                        replace(data.items.map(item => ({
                            itemDetails: item.itemDetails || '',
                            quantity: Number(item.quantity) || 1,
                            rate: Number(item.rate) || 0,
                            taxPercentage: Number(item.taxPercentage) || 0
                        })));
                    } else {
                        replace([{ itemDetails: '', quantity: 1, rate: 0, taxPercentage: 0 }]);
                    }

                    setSuccess('Data imported successfully');
                } catch (jsonErr) {
                    setError('Erreur de parsing JSON : ' + jsonErr.message);
                }
            };
            reader.onerror = () => setError('Error reading file');
            reader.readAsText(file);
        } catch (err) {
            setError('Error importing data');
            console.error('Import error:', err);
        }
    };

    return (
        <div className={styles.container}>
            <div className={styles.formWrapper}>
                <div className={styles.header}>
                    <h2>Invoice Creation</h2>
                    <p>Manage your bills in style</p>
                </div>
                <form onSubmit={handleSubmit(onSubmit)} className={styles.form}>
                    {error && <Alert color="danger">{error}</Alert>}
                    {success && <Alert color="success">{success}</Alert>}

                    <div className={styles.field}>
                        <label className={styles.label}>Extract from a document (PDF/Image)</label>
                        <input
                            type="file"
                            accept="application/pdf,image/png,image/jpeg"
                            onChange={handleExtract}
                            disabled={loading || !watchBusinessId}
                            className={styles.input}
                        />
                    </div>


                    <div className={styles.inputGrid}>
                        <div className={styles.field}>
                            <label className={styles.label}>Company</label>
                            <select
                                {...register('businessId', { required: 'Please select a company' })}
                                disabled={loading || businesses.length === 0}
                                className={styles.input}
                            >
                                <option value="">Select a company</option>
                                {businesses.map(business => (
                                    <option key={business._id} value={business._id}>
                                        {business.name}
                                    </option>
                                ))}
                            </select>
                            {errors.businessId && <span className={styles.error}>{errors.businessId.message}</span>}
                        </div>

                        {selectedBusiness && (
                            <div className={styles.field}>
                                <label className={styles.label}>Company Details</label>
                                <div className={styles.businessDetails}>
                                    <p><strong>Name:</strong> {selectedBusiness.name}</p>
                                    <p><strong>Address:</strong> {selectedBusiness.address}</p>
                                    <p><strong>N° Taxe:</strong> {selectedBusiness.taxNumber}</p>
                                </div>
                            </div>
                        )}

                        {[
                            { name: 'customerName', label: 'Customer Name', required: 'This field is required', maxLength: { value: 100, message: 'Maximum 100 caractères' } },
                            { name: 'invoiceNumber', label: 'Invoice number', required: 'This field is required', pattern: { value: /^[A-Za-z0-9-]+$/, message: 'Alphanumérique avec tirets uniquement' } },
                            { name: 'orderNumber', label: 'Order number' },
                            { name: 'invoiceDate', label: 'Invoice date', type: 'date', required: 'This field is required' },
                            { name: 'dueDate', label: 'Due date', type: 'date', required: 'This field is required', validate: value => new Date(value) >= new Date(watch('invoiceDate')) || 'Must be later than the invoice date' }
                        ].map(field => (
                            <div key={field.name} className={styles.field}>
                                <label className={styles.label}>{field.label}</label>
                                <input
                                    type={field.type || 'text'}
                                    {...register(field.name, { required: field.required, maxLength: field.maxLength, pattern: field.pattern, validate: field.validate })}
                                    disabled={loading}
                                    className={styles.input}
                                />
                                {errors[field.name] && <span className={styles.error}>{errors[field.name].message}</span>}
                            </div>
                        ))}
                    </div>

                    <div className={styles.itemsSection}>
                        <h3>Items</h3>
                        {fields.map((item, index) => (
                            <div key={item.id} className={styles.itemRow}>
                                <div>
                                    <label className={styles.label}>Details</label>
                                    <input
                                        {...register(`items.${index}.itemDetails`, { required: 'Requis', maxLength: { value: 200, message: 'Maximum 200 caractères' } })}
                                        disabled={loading}
                                        className={styles.itemInput}
                                    />
                                    {errors.items?.[index]?.itemDetails && <span className={styles.error}>{errors.items[index].itemDetails.message}</span>}
                                </div>
                                <div>
                                    <label className={styles.label}>Quantity</label>
                                    <input
                                        type="number"
                                        step="1"
                                        {...register(`items.${index}.quantity`, { required: 'Requis', min: { value: 1, message: 'Minimum 1' }, valueAsNumber: true })}
                                        disabled={loading}
                                        className={styles.itemInput}
                                    />
                                    {errors.items?.[index]?.quantity && <span className={styles.error}>{errors.items[index].quantity.message}</span>}
                                </div>
                                <div>
                                    <label className={styles.label}>Unit price</label>
                                    <input
                                        type="number"
                                        step="0.01"
                                        {...register(`items.${index}.rate`, { required: 'Requis', min: { value: 0, message: 'Minimum 0' }, valueAsNumber: true })}
                                        disabled={loading}
                                        className={styles.itemInput}
                                    />
                                    {errors.items?.[index]?.rate && <span className={styles.error}>{errors.items[index].rate.message}</span>}
                                </div>
                                <div>
                                    <label className={styles.label}>Taxe (%)</label>
                                    <input
                                        type="number"
                                        step="0.01"
                                        {...register(`items.${index}.taxPercentage`, {
                                            min: { value: 0, message: 'Minimum 0' },
                                            max: { value: 100, message: 'Maximum 100%' },
                                            valueAsNumber: true
                                        })}
                                        disabled={loading}
                                        className={styles.itemInput}
                                    />
                                    {errors.items?.[index]?.taxPercentage && <span className={styles.error}>{errors.items[index].taxPercentage.message}</span>}
                                </div>
                                <div>
                                    <label className={styles.label}>Amount</label>
                                    <input
                                        type="number"
                                        value={calculateAmount(watchItems[index]).toFixed(2)}
                                        disabled
                                        className={`${styles.itemInput} ${styles.amountInput}`}
                                    />
                                </div>
                                <button
                                    type="button"
                                    onClick={() => remove(index)}
                                    disabled={fields.length === 1 || loading}
                                    className={styles.removeButton}
                                >
                                    Delete
                                </button>
                            </div>
                        ))}
                        <div className={styles.itemButtons}>
                            <button
                                type="button"
                                onClick={() => setItemModal(true)}
                                disabled={loading}
                                className={`${styles.addButton} ${styles.selectItem}`}
                            >
                                + Select Existing Item
                            </button>
                            <button
                                type="button"
                                onClick={() => append({ itemDetails: '', quantity: 1, rate: 0, taxPercentage: 0 })}
                                disabled={loading}
                                className={styles.addButton}
                            >
                                + Add Custom Item
                            </button>
                        </div>

                        <Modal isOpen={itemModal} toggle={() => setItemModal(!itemModal)} size="lg">
                            <ModalHeader toggle={() => setItemModal(!itemModal)}>
                                Select Item
                            </ModalHeader>
                            <ModalBody>
                                <div className={styles.searchContainer}>
                                    <div className={styles.searchBox}>
                                        <FaSearch className={styles.searchIcon} />
                                        <Input
                                            type="text"
                                            placeholder="Search items..."
                                            value={searchTerm}
                                            onChange={handleSearchChange}
                                            className={styles.searchInput}
                                        />
                                    </div>
                                </div>

                                {loadingItems ? (
                                    <div className={styles.spinnerContainer}>
                                        <Spinner />
                                    </div>
                                ) : (
                                    <Table hover responsive className={styles.itemsTable}>
                                        <thead>
                                            <tr>
                                                <th>Name</th>
                                                <th>Price</th>
                                                <th>Actions</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {items.map((item) => (
                                                <tr key={item._id}>
                                                    <td>{item.name}</td>
                                                    <td>${item.salesInfo.sellingPrice}</td>
                                                    <td>
                                                        <button
                                                            type="button"
                                                            className={styles.selectButton}
                                                            onClick={() => {
                                                                handleItemSelect(item);
                                                                setItemModal(false);
                                                            }}
                                                        >
                                                            Select
                                                        </button>
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </Table>
                                )}
                            </ModalBody>
                        </Modal>

                        <div className={styles.totalsSection}>
                            <h4>Totals</h4>
                            <div className={styles.totalsGrid}>
                                <div className={styles.field}>
                                    <label className={styles.label}>Subtotal</label>
                                    <input value={subTotal} disabled className={`${styles.input} ${styles.totalInput}`} />
                                </div>
                                <div className={styles.field}>
                                    <label className={styles.label}>Discount</label>
                                    <input
                                        type="number"
                                        step="0.01"
                                        {...register('discount', { min: { value: 0, message: 'Minimum 0' }, valueAsNumber: true })}
                                        disabled={loading}
                                        className={styles.input}
                                    />
                                    {errors.discount && <span className={styles.error}>{errors.discount.message}</span>}
                                </div>
                                <div className={styles.field}>
                                    <label className={styles.label}>Delivery costs</label>
                                    <input
                                        type="number"
                                        step="0.01"
                                        {...register('shippingCharges', { min: { value: 0, message: 'Minimum 0' }, valueAsNumber: true })}
                                        disabled={loading}
                                        className={styles.input}
                                    />
                                    {errors.shippingCharges && <span className={styles.error}>{errors.shippingCharges.message}</span>}
                                </div>
                                <div className={styles.field}>
                                    <label className={styles.label}>Total</label>
                                    <input value={total} disabled className={`${styles.input} ${styles.totalInput}`} />
                                </div>
                            </div>
                        </div>
                    </div>

                    <div className={styles.notesSection}>
                        <div style={{ flex: 1 }}>
                            <label className={styles.label}>Customer ratings</label>
                            <textarea
                                {...register('customerNotes', { maxLength: { value: 500, message: 'Maximum 500 caractères' } })}
                                disabled={loading}
                                className={styles.textarea}
                            />
                            {errors.customerNotes && <span className={styles.error}>{errors.customerNotes.message}</span>}
                        </div>
                        <button
                            type="submit"
                            disabled={loading || Object.keys(errors).length > 0}
                            className={styles.submitButton}
                        >
                            {loading ? 'Création...' : 'Create the Invoice'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default CreateInvoice;
