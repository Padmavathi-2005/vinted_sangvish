import React, { useState, useEffect } from 'react';
import { Container, Button, Card, Form, InputGroup, Spinner, Row, Col } from 'react-bootstrap';
import { FaPlus, FaSearch, FaTrash, FaEdit, FaCreditCard } from 'react-icons/fa';
import Table from '../components/Table';
import Modal from '../components/Modal';
import Toggle from '../components/Toggle';
import axios from '../utils/axios';
import { showToast, showConfirm } from '../utils/swal';
import AdminSearchSelect from '../components/AdminSearchSelect';
import '../styles/PaymentMethods.css';
import '../styles/DynamicSettings.css';
const PaymentMethodsList = ({ isIntegrated = false, activeGlobalLang }) => {
    const [selectedMethod, setSelectedMethod] = useState(null);
    const [methods, setMethods] = useState([]);
    const [loading, setLoading] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');
    const [showModal, setShowModal] = useState(false);
    const [formData, setFormData] = useState({
        name: {}, // Map of codes to strings
        key: '',
        description: {}, // Map of codes to strings
        is_active: true,
        sort_order: 0
    });
    const [languages, setLanguages] = useState([]);
    const [activeLang, setActiveLang] = useState('en');
    const [saving, setSaving] = useState(false);

    // Sync with global lang if provided
    useEffect(() => {
        if (activeGlobalLang) {
            setActiveLang(activeGlobalLang);
        }
    }, [activeGlobalLang]);

    useEffect(() => {
        fetchMethods();
    }, []);

    const fetchMethods = async () => {
        try {
            setLoading(true);
            const [methodsRes, langRes] = await Promise.all([
                axios.get('/api/admin/payment-methods'),
                axios.get('/api/admin/languages')
            ]);
            setMethods(methodsRes.data);
            setLanguages(langRes.data);
            if (!activeGlobalLang && langRes.data.length > 0) {
                const hasEn = langRes.data.find(l => l.code === 'en');
                setActiveLang(hasEn ? 'en' : langRes.data[0].code);
            }
        } catch (error) {
            console.error('Error fetching data:', error);
            showToast('error', 'Failed to load data');
        } finally {
            setLoading(false);
        }
    };

    const handleSave = async () => {
        // Validation check for names - at least one name is needed (primary one)
        const hasSomeName = Object.values(formData.name).some(n => n.trim() !== '');
        if (!hasSomeName || !formData.key) {
            showToast('error', 'At least one name and the Key are required');
            return;
        }

        try {
            setSaving(true);
            const methodData = {
                ...formData,
                sort_order: parseInt(formData.sort_order) || 0
            };

            if (selectedMethod) {
                await axios.put(`/api/admin/payment-methods/${selectedMethod._id}`, methodData);
                showToast('success', 'Payment method updated');
            } else {
                await axios.post('/api/admin/payment-methods', methodData);
                showToast('success', 'Payment method created');
            }
            setShowModal(false);
            fetchMethods();
        } catch (error) {
            showToast('error', error.response?.data?.message || 'Failed to save payment method');
        } finally {
            setSaving(false);
        }
    };

    const handleEdit = (method) => {
        setSelectedMethod(method);
        // Normalize name and description to objects
        const normalizedName = typeof method.name === 'string' ? { en: method.name } : (method.name || {});
        const normalizedDesc = typeof method.description === 'string' ? { en: method.description } : (method.description || {});

        setFormData({
            name: normalizedName,
            key: method.key || '',
            description: normalizedDesc,
            is_active: method.is_active ?? true,
            sort_order: method.sort_order || 0
        });
        setShowModal(true);
    };

    const handleDelete = async (row) => {
        const result = await showConfirm(
            'Delete Payment Method',
            `Are you sure you want to delete ${row.name}?`
        );

        if (result.isConfirmed) {
            try {
                await axios.delete(`/api/admin/payment-methods/${row._id}`);
                showToast('success', 'Payment method deleted');
                fetchMethods();
            } catch (error) {
                showToast('error', error.response?.data?.message || 'Failed to delete payment method');
            }
        }
    };

    const handleStatusToggle = async (row, checked) => {
        try {
            await axios.put(`/api/admin/payment-methods/${row._id}`, {
                is_active: checked
            });
            showToast('success', 'Status updated successfully');
            fetchMethods();
        } catch (error) {
            showToast('error', 'Failed to update status');
        }
    };

    const columns = [
        {
            header: 'Method Name',
            accessor: 'name',
            render: (row) => {
                const name = typeof row.name === 'object' ? (row.name[activeLang] || row.name['en'] || Object.values(row.name)[0]) : row.name;
                return (
                    <div className="d-flex align-items-center gap-2">
                        <FaCreditCard className="text-secondary" />
                        <span className="fw-semibold">{name}</span>
                    </div>
                );
            }
        },
        {
            header: 'Key',
            accessor: 'key',
            render: (row) => <span className="text-muted font-monospace">{row.key}</span>
        },
        {
            header: 'Description',
            accessor: 'description',
            render: (row) => {
                const desc = typeof row.description === 'object'
                    ? (row.description[activeLang] || row.description['en'] || (Object.values(row.description).length > 0 ? Object.values(row.description)[0] : '—'))
                    : (row.description || '—');
                return desc || '—';
            }
        },
        {
            header: 'Sort Order',
            accessor: 'sort_order',
            width: '100px'
        },
        {
            header: 'Status',
            accessor: 'is_active',
            render: (row) => (
                <Toggle
                    checked={row.is_active}
                    onChange={(checked) => handleStatusToggle(row, checked)}
                    label={row.is_active ? "Active" : "Inactive"}
                />
            )
        }
    ];

    const filteredData = methods.filter(m => {
        const nameMatch = typeof m.name === 'string'
            ? m.name.toLowerCase().includes(searchTerm.toLowerCase())
            : Object.values(m.name || {}).some(val => val.toLowerCase().includes(searchTerm.toLowerCase()));

        return nameMatch || m.key.toLowerCase().includes(searchTerm.toLowerCase());
    });

    return (
        <div className={`admin-payment-methods ${isIntegrated ? 'integrated' : ''}`}>
            {!isIntegrated && (
                <div className="pm-header">
                    <div className="pm-title-section">
                        <h2>Payment Methods</h2>
                        <p className="text-muted small">Manage available payment gateways and their translations</p>
                    </div>
                    <Button variant="primary" className="btn-admin-action rounded-pill px-4 shadow-sm" onClick={() => {
                        setSelectedMethod(null);
                        setFormData({ name: {}, key: '', description: {}, is_active: true, sort_order: 0 });
                        setShowModal(true);
                    }}>
                        <FaPlus className="me-2" /> Add New Gateway
                    </Button>
                </div>
            )}

            {isIntegrated && (
                <div className="d-flex justify-content-between align-items-center mb-4">
                    <div>
                        <h5 className="fw-bold mb-1">Custom Payment Methods</h5>
                        <p className="text-muted small mb-0">Manage manual or custom payment options for users</p>
                    </div>
                    <Button variant="primary" size="sm" className="rounded-pill px-3" onClick={() => {
                        setSelectedMethod(null);
                        setFormData({ name: {}, key: '', description: {}, is_active: true, sort_order: 0 });
                        setShowModal(true);
                    }}>
                        <FaPlus className="me-1" /> Add Method
                    </Button>
                </div>
            )}

            <Card className={`pm-card border-0 ${isIntegrated ? 'shadow-none bg-transparent' : ''}`}>
                <div className="pm-controls-row">
                    <div className="pm-search-wrapper">
                        <InputGroup className="shadow-sm">
                            <InputGroup.Text className="bg-transparent border-0 pe-0">
                                <FaSearch className="text-muted" />
                            </InputGroup.Text>
                            <Form.Control
                                placeholder="Search by name or key..."
                                className="border-0 shadow-none"
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                            />
                        </InputGroup>
                    </div>
                </div>


                <div className="p-0 table-responsive">
                    {loading ? (
                        <div className="text-center p-5"><Spinner animation="border" variant="primary" /></div>
                    ) : (
                        <Table
                            columns={columns}
                            data={filteredData}
                            actions={true}
                            onEdit={handleEdit}
                            onDelete={handleDelete}
                            pagination={true}
                            emptyMessage="No payment methods configured"
                        />
                    )}
                </div>
            </Card>

            <Modal
                show={showModal}
                onHide={() => setShowModal(false)}
                title={selectedMethod ? "Edit Payment Method" : "Add Payment Method"}
                size="lg"
                footer={
                    <>
                        <Button variant="outline-secondary" onClick={() => setShowModal(false)}>Cancel</Button>
                        <Button variant="primary" onClick={handleSave} disabled={saving}>
                            {saving ? <Spinner size="sm" /> : "Save Settings"}
                        </Button>
                    </>
                }
            >
                <Form>
                    <Row>
                        <Col md={12}>
                            <Form.Group className="mb-3">
                                <Form.Label className="fw-bold">Method Name ({activeLang.toUpperCase()})</Form.Label>
                                <Form.Control
                                    type="text"
                                    value={formData.name[activeLang] || ''}
                                    onChange={(e) => setFormData({
                                        ...formData,
                                        name: { ...formData.name, [activeLang]: e.target.value }
                                    })}
                                    placeholder={`Name in ${activeLang}...`}
                                />
                            </Form.Group>
                        </Col>
                        <Col md={12}>
                            <Form.Group className="mb-3">
                                <Form.Label className="fw-bold">Unique Key</Form.Label>
                                <Form.Control
                                    type="text"
                                    value={formData.key}
                                    onChange={(e) => setFormData({ ...formData, key: e.target.value.toLowerCase().replace(/\s+/g, '_') })}
                                    placeholder="e.g. cash_delivery"
                                    disabled={!!selectedMethod}
                                />
                            </Form.Group>
                        </Col>
                        <Col md={12}>
                            <Form.Group className="mb-3">
                                <Form.Label className="fw-bold">Description ({activeLang.toUpperCase()})</Form.Label>
                                <Form.Control
                                    as="textarea"
                                    rows={2}
                                    value={formData.description[activeLang] || ''}
                                    onChange={(e) => setFormData({
                                        ...formData,
                                        description: { ...formData.description, [activeLang]: e.target.value }
                                    })}
                                    placeholder={`Description in ${activeLang}...`}
                                />
                            </Form.Group>
                        </Col>
                    </Row>
                    <Row>
                        <Col md={6}>
                            <Form.Group className="mb-3">
                                <Form.Label className="fw-bold">Sort Order</Form.Label>
                                <Form.Control
                                    type="number"
                                    value={formData.sort_order}
                                    onChange={(e) => setFormData({ ...formData, sort_order: e.target.value })}
                                    min="0"
                                />
                            </Form.Group>
                        </Col>
                        <Col md={6} className="d-flex align-items-center">
                            <Form.Group className="mb-0 mt-3">
                                <Form.Check
                                    type="switch"
                                    id="active-switch"
                                    label={formData.is_active ? "Method is Active" : "Method is Inactive"}
                                    checked={formData.is_active}
                                    onChange={(e) => setFormData({ ...formData, is_active: e.target.checked })}
                                />
                            </Form.Group>
                        </Col>
                    </Row>
                </Form>
            </Modal>
        </div>
    );
};

const PaymentMethods = () => {
    const [activeLang, setActiveLang] = useState('en');
    const [languages, setLanguages] = useState([]);

    useEffect(() => {
        const fetchLangs = async () => {
            const { data } = await axios.get('/api/admin/languages');
            setLanguages(data);
        };
        fetchLangs();
    }, []);

    return (
        <Container fluid className="px-0">
            <div className="ds-header mb-4">
                <div>
                    <h2 className="ds-title">Payment Methods</h2>
                    <p className="text-muted mb-0">Manage your custom payment methods and gateways</p>
                </div>
                <div className="ds-header-actions d-flex align-items-center gap-3">
                    <div className="ds-lang-selector-wrapper" style={{ width: '220px' }}>
                        <AdminSearchSelect
                            options={languages.map(l => ({ label: l.name, value: l.code }))}
                            value={activeLang}
                            onChange={(val) => setActiveLang(val)}
                            placeholder="Select Language..."
                        />
                    </div>
                </div>
            </div>
            <PaymentMethodsList activeGlobalLang={activeLang} />
        </Container>
    );
};

export { PaymentMethodsList };
export default PaymentMethods;
