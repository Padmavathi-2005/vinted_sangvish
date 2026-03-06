import React, { useState, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { Card, Form, InputGroup, Spinner, Badge, Button, Row, Col, Container, ButtonGroup } from 'react-bootstrap';
import { FaSearch, FaBoxOpen } from 'react-icons/fa';
import Table from '../components/Table';
import Modal from '../components/Modal';
import axios from '../utils/axios';
import { useLocalization } from '../context/LocalizationContext';
import { useSettings } from '../context/SettingsContext';
import { showToast, showConfirm } from '../utils/swal';

const Orders = () => {
    const location = useLocation();
    const navigate = useNavigate();
    const queryParams = new URLSearchParams(location.search);
    const initialFilter = queryParams.get('filter') || 'all';
    const initialSearch = queryParams.get('search') || '';

    const [orders, setOrders] = useState([]);
    const [loading, setLoading] = useState(false);
    const [searchTerm, setSearchTerm] = useState(initialSearch);
    const [orderTypeFilter, setOrderTypeFilter] = useState(initialFilter);
    const [showEditModal, setShowEditModal] = useState(false);
    const [selectedOrder, setSelectedOrder] = useState(null);
    const [formData, setFormData] = useState({
        order_status: '',
        payment_status: '',
        tracking_number: ''
    });
    const [saving, setSaving] = useState(false);

    const { formatPrice, t } = useLocalization();

    useEffect(() => {
        fetchOrders();
    }, [orderTypeFilter]);

    const fetchOrders = async () => {
        setLoading(true);
        try {
            const { data } = await axios.get('/api/admin/orders', {
                params: { type: orderTypeFilter === 'all' ? undefined : orderTypeFilter }
            });
            setOrders(data);
        } catch (error) {
            console.error("Error fetching orders", error);
            showToast('error', 'Failed to fetch orders');
        } finally {
            setLoading(false);
        }
    };

    const handleSearch = (e) => setSearchTerm(e.target.value);

    // Filter with search
    const filteredOrders = orders.filter(order =>
        (order.order_number || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
        (order.buyer_id?.username || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
        (order.seller_id?.username || '').toLowerCase().includes(searchTerm.toLowerCase())
    );



    const handleEditOrder = (order) => {
        setSelectedOrder(order);
        setFormData({
            order_status: order.order_status || 'placed',
            payment_status: order.payment_status || 'pending',
            tracking_number: order.tracking_number || ''
        });
        setShowEditModal(true);
    };

    const onEditSuccess = async () => {
        setSaving(true);
        try {
            await axios.put(`/api/admin/orders/${selectedOrder._id}`, formData);
            showToast('success', 'Order updated successfully');
            setShowEditModal(false);
            fetchOrders();
        } catch (error) {
            showToast('error', error.response?.data?.message || 'Failed to update order');
        } finally {
            setSaving(false);
        }
    };

    const handleDeleteOrder = (order) => {
        showConfirm(
            'Delete Order?',
            `Are you sure you want to delete order #${order.order_number}? This cannot be undone.`,
            'Yes, Delete'
        ).then(async (result) => {
            if (result.isConfirmed) {
                try {
                    await axios.delete(`/api/admin/orders/${order._id}`);
                    showToast('success', 'Order deleted');
                    fetchOrders();
                } catch (error) {
                    console.error("Error deleting order", error);
                    showToast('error', 'Failed to delete order');
                }
            }
        });
    };

    const columns = [
        {
            header: t('orders.table.order_no'),
            accessor: 'order_number',
            width: '120px',
            render: (order) => <span className="fw-bold">{order.order_number}</span>
        },
        {
            header: t('orders.table.item'),
            accessor: 'item',
            render: (order) => (
                <div className="d-flex align-items-center gap-3">
                    <div className="item-img-placeholder bg-light rounded" style={{ width: '45px', height: '45px', overflow: 'hidden' }}>
                        {order.item_id?.images?.[0] ? (
                            <img
                                src={`${axios.defaults.baseURL}/${order.item_id.images[0]}`}
                                alt={order.item_id.title}
                                style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                            />
                        ) : (
                            <div className="w-100 h-100 d-flex align-items-center justify-content-center text-muted small">
                                {t('common.no_img') || 'No Img'}
                            </div>
                        )}
                    </div>
                    <div>
                        <div className="fw-bold text-dark" style={{ fontSize: '0.95rem' }}>{order.item_id?.title || 'Unknown Item'}</div>
                        <div className="text-muted small">{t('orders.table.order_no')}: {order.order_number}</div>
                    </div>
                </div>
            )
        },
        {
            header: t('orders.table.buyer'),
            accessor: 'buyer',
            render: (order) => order.buyer_id?.username || 'Unknown'
        },
        {
            header: t('orders.table.seller'),
            accessor: 'seller',
            render: (order) => order.seller_id?.username || 'Unknown'
        },
        {
            header: t('orders.table.amount'),
            accessor: 'total_amount',
            render: (order) => formatPrice(order.total_amount)
        },
        {
            header: t('orders.table.payment_status'),
            accessor: 'payment_status',
            render: (order) => {
                const config = {
                    'paid': 'success',
                    'pending': 'warning',
                    'failed': 'danger',
                    'refunded': 'secondary'
                };
                return <Badge bg={config[order.payment_status] || 'secondary'} className="text-capitalize">{t(`orders.status.${order.payment_status}`)}</Badge>;
            }
        },
        {
            header: t('orders.table.order_status'),
            accessor: 'order_status',
            render: (order) => {
                const config = {
                    'placed': 'primary',
                    'dispatched': 'info',
                    'on_the_way': 'warning',
                    'delivered': 'success',
                    'cancelled': 'danger'
                };
                return <Badge bg={config[order.order_status] || 'secondary'} className="text-capitalize">{t(`orders.status.${order.order_status}`)}</Badge>;
            }
        },
        {
            header: t('orders.table.date'),
            accessor: 'created_at',
            render: (order) => new Date(order.created_at).toLocaleDateString()
        }
    ];

    return (
        <div className="admin-dashboard p-0">
            <Container fluid className="px-0">
                <Card className="main-content-card border-0 shadow-sm p-4">
                    <div className="d-flex justify-content-between align-items-center mb-4">
                        <div>
                            <h1 className="h3 mb-1">{t('orders.title')}</h1>
                            <p className="text-muted small mb-0">{t('orders.subtitle')}</p>
                        </div>
                    </div>

                    <div className="d-flex gap-3 flex-wrap mb-4">
                        <div className="flex-grow-1" style={{ maxWidth: '300px' }}>
                            <InputGroup>
                                <InputGroup.Text className="bg-white border-end-0">
                                    <FaSearch className="text-muted" />
                                </InputGroup.Text>
                                <Form.Control
                                    placeholder={t('orders.search_placeholder')}
                                    value={searchTerm}
                                    onChange={handleSearch}
                                    className="border-start-0 ps-0 search-input"
                                />
                            </InputGroup>
                        </div>
                        <div style={{ width: '200px' }}>
                            <Form.Select
                                value={orderTypeFilter}
                                onChange={(e) => setOrderTypeFilter(e.target.value)}
                                className="admin-filter-select"
                            >
                                <option value="all">{t('orders.filter_all')}</option>
                                <option value="today">{t('orders.filter_today')}</option>
                            </Form.Select>
                        </div>
                    </div>

                    {loading ? (
                        <div className="text-center py-5">
                            <Spinner animation="border" variant="primary" />
                            <p className="mt-2 text-muted">{t('orders.loading')}</p>
                        </div>
                    ) : (
                        <Table
                            columns={columns}
                            data={filteredOrders}
                            actions={true}
                            onEdit={handleEditOrder}
                            onDelete={handleDeleteOrder}
                            pagination={true}
                            emptyMessage="No orders found."
                        />
                    )}
                </Card>

                {/* Edit Order Modal */}
                <Modal
                    show={showEditModal}
                    onHide={() => setShowEditModal(false)}
                    title={`${t('orders.modal.edit_title')} ${selectedOrder?.order_number}`}
                    onSubmit={onEditSuccess}
                    submitText={saving ? t('orders.modal.saving') : t('orders.modal.save')}
                    disabled={saving}
                >
                    {selectedOrder && (
                        <Form>
                            {/* Order Summary */}
                            <div className="mb-4 p-3 rounded" style={{ background: '#f8fafc', border: '1px solid #e2e8f0' }}>
                                <div className="fw-bold mb-1">{selectedOrder.item_id?.title || 'Unknown Item'}</div>
                                <div className="text-muted small">
                                    {t('orders.modal.order_summary')} #{selectedOrder.order_number} · {t('orders.table.buyer')}: <strong>{selectedOrder.buyer_id?.username || '—'}</strong>
                                </div>
                            </div>

                            <Row>
                                <Col md={6} className="mb-3">
                                    <Form.Group>
                                        <Form.Label>{t('orders.modal.order_status')}</Form.Label>
                                        <Form.Select
                                            value={formData.order_status}
                                            onChange={(e) => setFormData({ ...formData, order_status: e.target.value })}
                                        >
                                            <option value="placed">{t('orders.status.placed')}</option>
                                            <option value="dispatched">{t('orders.status.dispatched')}</option>
                                            <option value="on_the_way">{t('orders.status.on_the_way')}</option>
                                            <option value="delivered">{t('orders.status.delivered')}</option>
                                            <option value="cancelled">{t('orders.status.cancelled')}</option>
                                        </Form.Select>
                                    </Form.Group>
                                </Col>
                                <Col md={6} className="mb-3">
                                    <Form.Group>
                                        <Form.Label>{t('orders.modal.payment_status')}</Form.Label>
                                        <Form.Select
                                            value={formData.payment_status}
                                            onChange={(e) => setFormData({ ...formData, payment_status: e.target.value })}
                                        >
                                            <option value="pending">{t('orders.status.pending')}</option>
                                            <option value="paid">{t('orders.status.paid')}</option>
                                            <option value="failed">{t('orders.status.failed')}</option>
                                            <option value="refunded">{t('orders.status.refunded')}</option>
                                        </Form.Select>
                                    </Form.Group>
                                </Col>
                            </Row>
                            <Form.Group className="mb-3">
                                <Form.Label>{t('orders.modal.tracking_code')}</Form.Label>
                                <Form.Control
                                    type="text"
                                    placeholder={t('orders.modal.tracking_code_placeholder')}
                                    value={formData.tracking_number}
                                    onChange={(e) => setFormData({ ...formData, tracking_number: e.target.value })}
                                />
                                <Form.Text className="text-muted">
                                    {t('orders.modal.tracking_help')}
                                </Form.Text>
                            </Form.Group>
                        </Form>
                    )}
                </Modal>
            </Container>
        </div>
    );
};

export default Orders;
