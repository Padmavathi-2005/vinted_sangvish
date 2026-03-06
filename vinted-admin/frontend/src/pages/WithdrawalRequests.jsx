import React, { useState, useEffect } from 'react';
import { Container, Button, Card, Form, InputGroup, Spinner, Badge, Row, Col } from 'react-bootstrap';
import { FaSearch, FaCheck, FaTimes, FaCommentDots } from 'react-icons/fa';
import Table from '../components/Table';
import Modal from '../components/Modal';
import axios from '../utils/axios';
import { showToast, showConfirm } from '../utils/swal';
import { useLocalization } from '../context/LocalizationContext';

const WithdrawalRequests = () => {
    const { formatPrice } = useLocalization();
    const [requests, setRequests] = useState([]);
    const [loading, setLoading] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');
    const [showModal, setShowModal] = useState(false);
    const [selectedRequest, setSelectedRequest] = useState(null);
    const [statusUpdate, setStatusUpdate] = useState('');
    const [adminNote, setAdminNote] = useState('');
    const [saving, setSaving] = useState(false);

    useEffect(() => {
        fetchRequests();
    }, []);

    const fetchRequests = async () => {
        try {
            setLoading(true);
            const { data } = await axios.get('/api/admin/withdrawal-requests');
            setRequests(data);
        } catch (error) {
            console.error('Error fetching withdrawal requests:', error);
            showToast('error', 'Failed to load requests');
        } finally {
            setLoading(false);
        }
    };

    const handleActionClick = (request, status) => {
        setSelectedRequest(request);
        setStatusUpdate(status);
        setAdminNote(request.admin_note || '');
        setShowModal(true);
    };

    const confirmAction = async () => {
        try {
            setSaving(true);
            await axios.put(`/api/admin/withdrawal-requests/${selectedRequest._id}`, {
                status: statusUpdate,
                admin_note: adminNote,
                processed_at: new Date()
            });
            showToast('success', `Request marked as ${statusUpdate}`);
            setShowModal(false);
            fetchRequests();
        } catch (error) {
            showToast('error', error.response?.data?.message || 'Failed to update request');
        } finally {
            setSaving(false);
        }
    };

    const columns = [
        {
            header: 'Date',
            accessor: 'created_at',
            render: (row) => new Date(row.created_at).toLocaleDateString()
        },
        {
            header: 'User',
            accessor: 'user',
            render: (row) => (
                <div>
                    <div className="fw-semibold">{row.user_id?.username || 'Unknown'}</div>
                    <div className="text-muted small">{row.user_id?.email || ''}</div>
                </div>
            )
        },
        {
            header: 'Amount',
            accessor: 'amount',
            render: (row) => <span className="fw-bold">{formatPrice(row.amount)}</span>
        },
        {
            header: 'Payment Method',
            accessor: 'payment_method',
            render: (row) => (
                <div>
                    <div>{row.payment_method || 'N/A'}</div>
                    <div className="text-muted small">{row.payment_details || ''}</div>
                </div>
            )
        },
        {
            header: 'Status',
            accessor: 'status',
            render: (row) => {
                const variants = {
                    approved: 'success',
                    pending: 'warning',
                    rejected: 'danger',
                    completed: 'info'
                };
                return <Badge bg={variants[row.status] || 'secondary'}>{row.status?.toUpperCase()}</Badge>;
            }
        },
        {
            header: 'Actions',
            accessor: 'actions',
            render: (row) => {
                if (row.status !== 'pending') return <span className="text-muted small">Processed</span>;
                return (
                    <div className="d-flex gap-2 justify-content-end">
                        <Button
                            variant="success"
                            size="sm"
                            className="rounded-circle p-2 d-flex align-items-center justify-content-center border-0 shadow-sm"
                            style={{ width: '32px', height: '32px' }}
                            onClick={() => handleActionClick(row, 'approved')}
                            title="Approve"
                        >
                            <FaCheck size={12} />
                        </Button>
                        <Button
                            variant="danger"
                            size="sm"
                            className="rounded-circle p-2 d-flex align-items-center justify-content-center border-0 shadow-sm"
                            style={{ width: '32px', height: '32px' }}
                            onClick={() => handleActionClick(row, 'rejected')}
                            title="Reject"
                        >
                            <FaTimes size={12} />
                        </Button>
                    </div>
                );
            }
        }
    ];

    const filteredData = requests.filter(r =>
        r.user_id?.username?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        r.user_id?.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        r.payment_method?.toLowerCase().includes(searchTerm.toLowerCase())
    );

    return (
        <div className="admin-dashboard p-0">
            <Container fluid className="px-0">
                <Card className="main-content-card border-0 shadow-sm p-4">
                    <div className="dashboard-header mb-4">
                        <div>
                            <h2 className="dashboard-title">Withdrawal Requests</h2>
                            <p className="text-muted small mb-0">Review user payout requests</p>
                        </div>
                    </div>

                    <div className="mb-4">
                        <InputGroup className="search-input-group" style={{ maxWidth: '400px' }}>
                            <InputGroup.Text className="bg-white border-end-0">
                                <FaSearch className="text-muted" />
                            </InputGroup.Text>
                            <Form.Control
                                placeholder="Search by user, email, or method..."
                                className="border-start-0 ps-0"
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                            />
                        </InputGroup>
                    </div>

                    {loading ? (
                        <div className="text-center p-5"><Spinner animation="border" variant="primary" /></div>
                    ) : (
                        <Table
                            columns={columns}
                            data={filteredData}
                            pagination={true}
                            emptyMessage="No pending or past withdrawal requests"
                        />
                    )}
                </Card>

                {/* Status Action Modal */}
                <Modal
                    show={showModal}
                    onHide={() => setShowModal(false)}
                    title={`Confirm ${statusUpdate.charAt(0).toUpperCase() + statusUpdate.slice(1)}`}
                    footer={
                        <>
                            <Button variant="outline-secondary" onClick={() => setShowModal(false)}>Cancel</Button>
                            <Button
                                variant={statusUpdate === 'approved' ? 'success' : 'danger'}
                                onClick={confirmAction}
                                disabled={saving}
                            >
                                {saving ? <Spinner size="sm" /> : `Confirm ${statusUpdate}`}
                            </Button>
                        </>
                    }
                >
                    <div className="mb-3 text-center">
                        <p className="mb-1 text-muted">You are about to mark a withdrawal of</p>
                        <h3 className="fw-bold mb-3">{formatPrice(selectedRequest?.amount)}</h3>
                        <p className="small text-muted mb-0">User: <strong>{selectedRequest?.user_id?.username}</strong></p>
                        <p className="small text-muted">Method: <strong>{selectedRequest?.payment_method}</strong> ({selectedRequest?.payment_details})</p>
                    </div>

                    <Form.Group className="mb-3">
                        <Form.Label className="d-flex align-items-center gap-2">
                            <FaCommentDots /> Admin Note / Receipt Number
                        </Form.Label>
                        <Form.Control
                            as="textarea"
                            rows={3}
                            placeholder={`Enter any notes, transaction IDs, or reasons for ${statusUpdate}...`}
                            value={adminNote}
                            onChange={(e) => setAdminNote(e.target.value)}
                        />
                        <Form.Text className="text-muted">
                            {statusUpdate === 'rejected' ? 'Required: Please explain why this was rejected.' : 'Optional: Leave a transaction ID for the user.'}
                        </Form.Text>
                    </Form.Group>
                </Modal>
            </Container>
        </div>
    );
};

export default WithdrawalRequests;
