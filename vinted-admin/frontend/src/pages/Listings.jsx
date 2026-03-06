import React, { useState, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { Container, Button, Card, Form, InputGroup, Spinner, ButtonGroup } from 'react-bootstrap';
import { FaPlus, FaSearch, FaTrash, FaEdit } from 'react-icons/fa';
import Table from '../components/Table';
import Modal from '../components/Modal';
import Toggle from '../components/Toggle';
import AdminSearchSelect from '../components/AdminSearchSelect';
import axios from '../utils/axios';
import { useLocalization } from '../context/LocalizationContext';
import { useSettings } from '../context/SettingsContext';
import { showToast, showConfirm } from '../utils/swal';

const Listings = () => {
    const { formatPrice, t } = useLocalization();
    const location = useLocation();
    const navigate = useNavigate();
    const queryParams = new URLSearchParams(location.search);
    const initialFilter = queryParams.get('filter') || 'all';

    const [listings, setListings] = useState([]);
    const [loading, setLoading] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');
    const [listingTypeFilter, setListingTypeFilter] = useState(initialFilter);
    const [showEditModal, setShowEditModal] = useState(false);
    const [selectedListing, setSelectedListing] = useState(null);
    const [categories, setCategories] = useState([]);
    const [subcategories, setSubcategories] = useState([]);
    const [itemTypes, setItemTypes] = useState([]);
    const [initialFormData] = useState({
        title: '',
        description: '',
        price: '',
        category_id: '',
        subcategory_id: '',
        item_type_id: '',
        condition: '',
        status: 'active',
        is_sold: false,
        is_blocked: false
    });
    const [formData, setFormData] = useState(initialFormData);
    const [saving, setSaving] = useState(false);
    const [togglingItemId, setTogglingItemId] = useState(null);
    const [categoryError, setCategoryError] = useState(false);

    // Pagination and global settings
    const { paginationLimit, globalSettings } = useSettings();



    useEffect(() => {
        fetchOptions();
    }, []);

    useEffect(() => {
        fetchListings();
    }, [listingTypeFilter]);

    const fetchOptions = async () => {
        try {
            const { data } = await axios.get('/api/admin/items/options');
            setCategories(data.categories || []);
            setSubcategories(data.subcategories || []);
            setItemTypes(data.itemTypes || []);
        } catch (error) {
            console.error("Error fetching options", error);
        }
    };

    const fetchListings = async () => {
        setLoading(true);
        try {
            const { data } = await axios.get('/api/admin/items', {
                params: { type: listingTypeFilter === 'all' ? undefined : listingTypeFilter }
            });
            setListings(data);
        } catch (error) {
            console.error("Error fetching listings", error);
        } finally {
            setLoading(false);
        }
    };

    const handleDeleteClick = (listing) => {
        setSelectedListing(listing);
        showConfirm(
            'Delete Listing?',
            `Are you sure you want to delete "${listing.title}"?`,
            'Yes, Delete'
        ).then((result) => {
            if (result.isConfirmed) {
                handleDeleteConfirm(listing._id);
            }
        });
    };

    const handleDeleteConfirm = async (id) => {
        try {
            await axios.delete(`/api/admin/items/${id}`);
            showToast('success', t('listings.toast.delete_success'));
            fetchListings();
        } catch (error) {
            console.error("Error deleting listing", error);
            showToast('error', t('listings.toast.delete_error'));
        }
    };

    const handleEdit = (listing) => {
        setSelectedListing(listing);
        setFormData({
            title: listing.title || '',
            description: listing.description || '',
            price: listing.price || '',
            category_id: listing.category_id?._id || listing.category_id || '',
            subcategory_id: listing.subcategory_id?._id || listing.subcategory_id || '',
            item_type_id: listing.item_type_id?._id || listing.item_type_id || '',
            condition: listing.condition || '',
            status: listing.status || 'active',
            is_sold: listing.status === 'sold',
            is_blocked: listing.status === 'inactive'
        });
        setShowEditModal(true);
    };

    const handleSaveListing = async () => {
        if (!formData.category_id) {
            setCategoryError(true);
            setTimeout(() => setCategoryError(false), 3000);
            return;
        }

        if (!formData.title || !formData.price) {
            showToast('warning', 'Please fill in Title and Price');
            return;
        }

        setSaving(true);
        try {
            let finalStatus = 'active';
            if (formData.is_sold) finalStatus = 'sold';
            else if (formData.is_blocked) finalStatus = 'inactive';

            const payload = { ...formData, status: finalStatus };

            if (selectedListing) {
                await axios.put(`/api/admin/items/${selectedListing._id}`, payload);
            } else {
                await axios.post('/api/admin/items', payload);
            }
            showToast('success', `Listing ${selectedListing ? 'updated' : 'created'} successfully!`);
            setShowEditModal(false);
            fetchListings();
        } catch (error) {
            console.error("Error saving listing", error);
            showToast('error', 'Failed to save listing');
        } finally {
            setSaving(false);
        }
    };

    const handleStatusToggle = async (listing, isActive) => {
        setTogglingItemId(listing._id);
        try {
            const newStatus = isActive ? 'active' : 'inactive';
            await axios.put(`/api/admin/items/${listing._id}`, { status: newStatus });
            setListings(listings.map(l =>
                l._id === listing._id ? { ...l, status: newStatus } : l
            ));
        } catch (error) {
            console.error("Error toggling status", error);
        } finally {
            setTogglingItemId(null);
        }
    };

    const columns = [
        {
            header: t('listings.table.item'),
            accessor: 'title',
            render: (row) => (
                <div className="d-flex align-items-center gap-3">
                    <div className="item-img-placeholder bg-light rounded" style={{ width: '45px', height: '45px', overflow: 'hidden' }}>
                        {row.images?.[0] ?
                            <img src={`${axios.defaults.baseURL}${row.images[0]}`} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                            : (globalSettings?.imageNotFound ?
                                <img src={`${axios.defaults.baseURL}/${globalSettings.imageNotFound}`} alt="Not Found" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                                : <div className="w-100 h-100 d-flex align-items-center justify-content-center text-muted small">No Img</div>
                            )
                        }
                    </div>
                    <div>
                        <div className="fw-bold text-dark" style={{ fontSize: '0.95rem' }}>{row.title}</div>
                        <div className="text-muted small">ID: {row._id.slice(-6).toUpperCase()}</div>
                    </div>
                </div>
            )
        },
        {
            header: t('listings.table.price'),
            accessor: 'price',
            render: (row) => <span className="fw-bold">{formatPrice(row.price)}</span>
        },
        {
            header: t('listings.table.category'),
            accessor: 'category_id',
            render: (row) => <span className="badge bg-light text-dark border">{row.category_id?.name || 'N/A'}</span>
        },
        {
            header: t('listings.table.condition'),
            accessor: 'condition',
            render: (row) => <span className="text-capitalize small">{row.condition?.replace(/-/g, ' ')}</span>
        },
        {
            header: t('listings.table.status'),
            accessor: 'status',
            render: (row) => (
                <Toggle
                    checked={row.status === 'active'}
                    onChange={(checked) => handleStatusToggle(row, checked)}
                    label={row.status.charAt(0).toUpperCase() + row.status.slice(1)}
                    disabled={togglingItemId === row._id}
                />
            )
        }
    ];

    const filteredListings = listings.filter(l =>
        l.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
        l._id.toLowerCase().includes(searchTerm.toLowerCase())
    );

    // Client-side pagination logic



    return (
        <div className="admin-dashboard p-0">
            <Container fluid className="px-0">
                <Card className="main-content-card border-0 shadow-sm p-4">
                    <div className="d-flex justify-content-between align-items-center mb-4">
                        <div>
                            <h1 className="h3 mb-1">{t('listings.title')}</h1>
                            <p className="text-muted small mb-0">{t('listings.subtitle')}</p>
                        </div>
                        <Button variant="primary" className="btn-admin-action" onClick={() => {
                            setFormData(initialFormData);
                            setSelectedListing(null);
                            setShowEditModal(true);
                        }}>
                            <FaPlus className="me-2" /> {t('listings.add_new')}
                        </Button>
                    </div>

                    <div className="d-flex gap-3 flex-wrap mb-4">
                        <div className="flex-grow-1" style={{ maxWidth: '300px' }}>
                            <InputGroup>
                                <InputGroup.Text className="bg-white border-end-0">
                                    <FaSearch className="text-muted" />
                                </InputGroup.Text>
                                <Form.Control
                                    placeholder={t('listings.search_placeholder')}
                                    className="border-start-0 ps-0"
                                    value={searchTerm}
                                    onChange={(e) => { setSearchTerm(e.target.value); }}
                                />
                            </InputGroup>
                        </div>
                        <div style={{ width: '200px' }}>
                            <Form.Select
                                value={listingTypeFilter}
                                onChange={(e) => setListingTypeFilter(e.target.value)}
                                className="admin-filter-select"
                            >
                                <option value="all">{t('listings.filter_all')}</option>
                                <option value="today">{t('listings.filter_today')}</option>
                            </Form.Select>
                        </div>
                    </div>

                    {loading ? (
                        <div className="text-center p-5"><Spinner animation="border" variant="primary" /></div>
                    ) : (
                        <Table
                            columns={columns}
                            data={filteredListings}
                            actions={true}
                            onEdit={handleEdit}
                            onDelete={(row) => { setSelectedListing(row); setShowDeleteModal(true); }}
                            pagination={true}
                        />
                    )}
                </Card>

                {/* Add/Edit Modal */}
                <Modal
                    show={showEditModal}
                    onHide={() => setShowEditModal(false)}
                    title={selectedListing ? t('listings.modal.edit_title') : t('listings.modal.add_title')}
                    footer={
                        <>
                            <Button variant="outline-secondary" onClick={() => setShowEditModal(false)}>{t('listings.modal.cancel')}</Button>
                            <Button variant="primary" onClick={handleSaveListing} disabled={saving}>
                                {saving ? <Spinner size="sm" /> : t('listings.modal.save')}
                            </Button>
                        </>
                    }
                >
                    <Form>
                        <Form.Group className="mb-3">
                            <Form.Label>{t('listings.modal.item_title')}</Form.Label>
                            <Form.Control
                                type="text"
                                value={formData.title}
                                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                                placeholder={t('listings.modal.item_title_placeholder')}
                            />
                        </Form.Group>

                        <div className="row mb-3">
                            <div className="col-md-6">
                                <Form.Group>
                                    <Form.Label>{t('listings.modal.price')}</Form.Label>
                                    <Form.Control
                                        type="number"
                                        min="1"
                                        value={formData.price}
                                        onChange={(e) => {
                                            const val = e.target.value;
                                            if (val === '' || (parseFloat(val) >= 0)) {
                                                setFormData({ ...formData, price: val });
                                            }
                                        }}
                                        placeholder="0.00"
                                        style={{ appearance: 'textfield' }}
                                        className="no-arrows"
                                    />
                                </Form.Group>
                            </div>
                            <div className="col-md-6">
                                <Form.Group>
                                    <Form.Label>{t('listings.modal.condition')}</Form.Label>
                                    <AdminSearchSelect
                                        options={[
                                            { value: 'new-with-tags', label: 'New with tags' },
                                            { value: 'new-without-tags', label: 'New without tags' },
                                            { value: 'very-good', label: 'Very good' },
                                            { value: 'good', label: 'Good' },
                                            { value: 'satisfactory', label: 'Satisfactory' }
                                        ]}
                                        value={formData.condition}
                                        onChange={(val) => setFormData({ ...formData, condition: val })}
                                        placeholder={t('listings.modal.condition_placeholder')}
                                    />
                                </Form.Group>
                            </div>
                        </div>

                        <div className="row mb-3">
                            <div className="col-md-6">
                                <Form.Group>
                                    <Form.Label className={categoryError ? "text-danger fw-bold" : ""}>
                                        {t('listings.modal.category')} {categoryError && <span className="small ms-2"> - {t('listings.modal.category_error')}</span>}
                                    </Form.Label>
                                    <div className={categoryError ? "shake-horizontal" : ""}>
                                        <AdminSearchSelect
                                            options={categories.map(cat => ({ value: cat._id, label: cat.name }))}
                                            value={formData.category_id}
                                            onChange={(val) => {
                                                setFormData({ ...formData, category_id: val, subcategory_id: '', item_type_id: '' });
                                                setCategoryError(false);
                                            }}
                                            placeholder={t('listings.modal.category_placeholder')}
                                            error={categoryError}
                                        />
                                    </div>
                                </Form.Group>
                            </div>
                            <div className="col-md-6">
                                <Form.Group>
                                    <div onClick={() => {
                                        if (!formData.category_id) {
                                            setCategoryError(true);
                                            setTimeout(() => setCategoryError(false), 3000);
                                        }
                                    }}>
                                        <Form.Label>{t('listings.modal.subcategory')}</Form.Label>
                                        <AdminSearchSelect
                                            options={subcategories
                                                .filter(sub => sub.category_id === formData.category_id)
                                                .map(sub => ({ value: sub._id, label: sub.name }))}
                                            value={formData.subcategory_id}
                                            onChange={(val) => setFormData({ ...formData, subcategory_id: val, item_type_id: '' })}
                                            placeholder={t('listings.modal.subcategory_placeholder')}
                                            disabled={!formData.category_id}
                                        />
                                    </div>
                                </Form.Group>
                            </div>
                        </div>

                        <Form.Group className="mb-4">
                            <Form.Label>{t('listings.modal.description')}</Form.Label>
                            <Form.Control
                                as="textarea"
                                rows={3}
                                value={formData.description}
                                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                                placeholder={t('listings.modal.description_placeholder')}
                            />
                        </Form.Group>

                        <div className="row">
                            <div className="col-md-6">
                                <Form.Group className="mb-3">
                                    <Form.Label>{t('listings.modal.is_sold')}</Form.Label>
                                    <div className="d-flex align-items-center gap-2 p-2 border rounded bg-light">
                                        <Toggle
                                            checked={formData.is_sold}
                                            onChange={(checked) => setFormData({ ...formData, is_sold: checked, is_blocked: checked ? false : formData.is_blocked })}
                                            label={formData.is_sold ? t('listings.modal.sold') : t('listings.modal.available')}
                                        />
                                    </div>
                                </Form.Group>
                            </div>
                            <div className="col-md-6">
                                <Form.Group className="mb-3">
                                    <Form.Label>{t('listings.modal.is_blocked')}</Form.Label>
                                    <div className="d-flex align-items-center gap-2 p-2 border rounded bg-light">
                                        <Toggle
                                            checked={formData.is_blocked}
                                            onChange={(checked) => setFormData({ ...formData, is_blocked: checked, is_sold: checked ? false : formData.is_sold })}
                                            label={formData.is_blocked ? t('listings.modal.blocked') : t('listings.modal.active')}
                                        />
                                    </div>
                                </Form.Group>
                            </div>
                        </div>
                    </Form>
                </Modal>

            </Container>
            <style>
                {`
                    .no-arrows::-webkit-outer-spin-button,
                    .no-arrows::-webkit-inner-spin-button {
                        -webkit-appearance: none;
                        margin: 0;
                    }
                `}
            </style>
        </div>
    );
};

export default Listings;
