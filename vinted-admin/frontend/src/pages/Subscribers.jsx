import React, { useState, useEffect } from 'react';
import { Container, Card, Row, Col, Form, Button, Badge } from 'react-bootstrap';
import axios from '../utils/axios';
import Table from '../components/Table';
import { FaTrash, FaSearch, FaSync, FaEnvelope } from 'react-icons/fa';

const Subscribers = () => {
    const [subscribers, setSubscribers] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [statusFilter, setStatusFilter] = useState('');
    const [page, setPage] = useState(1);
    const [totalPages, setTotalPages] = useState(1);

    const fetchSubscribers = async () => {
        try {
            setLoading(true);
            const { data } = await axios.get('/api/admin/newsletter', {
                params: {
                    page,
                    search: searchTerm,
                    status: statusFilter
                }
            });
            setSubscribers(data.subscribers);
            setTotalPages(data.totalPages);
        } catch (error) {
            console.error('Error fetching subscribers:', error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchSubscribers();
    }, [page, statusFilter]);

    const handleSearch = (e) => {
        e.preventDefault();
        setPage(1);
        fetchSubscribers();
    };

    const handleDelete = async (id) => {
        if (window.confirm('Are you sure you want to remove this subscriber?')) {
            try {
                await axios.delete(`/api/admin/newsletter/${id}`);
                fetchSubscribers();
            } catch (error) {
                console.error('Error deleting subscriber:', error);
                alert('Failed to delete subscriber');
            }
        }
    };

    const handleStatusToggle = async (id, currentStatus) => {
        const newStatus = currentStatus === 'active' ? 'unsubscribed' : 'active';
        try {
            await axios.patch(`/api/admin/newsletter/${id}`, { status: newStatus });
            fetchSubscribers();
        } catch (error) {
            console.error('Error updating status:', error);
            alert('Failed to update status');
        }
    };

    const columns = [
        {
            header: 'Email',
            accessor: 'email',
            cell: (row) => (
                <div className="d-flex align-items-center gap-2">
                    <FaEnvelope style={{ color: '#0ea5e9', opacity: 0.6 }} />
                    <span className="fw-bold text-dark">{row.email}</span>
                </div>
            )
        },
        {
            header: 'Source',
            accessor: 'source',
            cell: (row) => (
                <Badge bg="light" text="dark" className="border">
                    {row.source || 'footer'}
                </Badge>
            )
        },
        {
            header: 'Status',
            accessor: 'status',
            cell: (row) => (
                <Badge
                    bg={row.status === 'active' ? 'success' : 'secondary'}
                    style={{ cursor: 'pointer' }}
                    onClick={() => handleStatusToggle(row._id, row.status)}
                >
                    {row.status}
                </Badge>
            )
        },
        {
            header: 'Subscribed At',
            accessor: 'created_at',
            cell: (row) => new Date(row.created_at).toLocaleDateString()
        },
        {
            header: 'Actions',
            accessor: '_id',
            cell: (row) => (
                <div className="d-flex gap-2">
                    <Button
                        variant="soft-danger"
                        size="sm"
                        onClick={() => handleDelete(row._id)}
                    >
                        <FaTrash />
                    </Button>
                </div>
            )
        }
    ];

    return (
        <Container fluid className="py-4">
            <div className="d-flex justify-content-between align-items-center mb-4">
                <div>
                    <h2 className="fw-bold text-dark mb-1">Newsletter Subscribers</h2>
                    <p className="text-secondary mb-0">Manage your newsletter list and subscribers</p>
                </div>
                <Button variant="primary" onClick={fetchSubscribers} className="d-flex align-items-center gap-2">
                    <FaSync /> Refresh
                </Button>
            </div>

            <Card className="border-0 shadow-sm mb-4">
                <Card.Body>
                    <Form onSubmit={handleSearch}>
                        <Row className="g-3">
                            <Col md={6}>
                                <div className="input-group">
                                    <span className="input-group-text bg-white border-end-0">
                                        <FaSearch className="text-muted" />
                                    </span>
                                    <Form.Control
                                        placeholder="Search by email..."
                                        className="border-start-0 ps-0"
                                        value={searchTerm}
                                        onChange={(e) => setSearchTerm(e.target.value)}
                                    />
                                </div>
                            </Col>
                            <Col md={4}>
                                <Form.Select
                                    value={statusFilter}
                                    onChange={(e) => setStatusFilter(e.target.value)}
                                >
                                    <option value="">All Statuses</option>
                                    <option value="active">Active</option>
                                    <option value="unsubscribed">Unsubscribed</option>
                                </Form.Select>
                            </Col>
                            <Col md={2}>
                                <Button type="submit" variant="dark" className="w-100">
                                    Filter
                                </Button>
                            </Col>
                        </Row>
                    </Form>
                </Card.Body>
            </Card>

            <Table
                columns={columns}
                data={subscribers}
                loading={loading}
                pagination={{
                    currentPage: page,
                    totalPages,
                    onPageChange: setPage
                }}
                emptyMessage="No subscribers found"
            />
        </Container>
    );
};

export default Subscribers;
