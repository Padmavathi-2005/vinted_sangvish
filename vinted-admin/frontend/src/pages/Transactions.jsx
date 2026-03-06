import React, { useState, useEffect } from 'react';
import { Container, Card, Spinner, Badge, Form, InputGroup } from 'react-bootstrap';
import { FaSearch } from 'react-icons/fa';
import Table from '../components/Table';
import axios from '../utils/axios';
import { useLocalization } from '../context/LocalizationContext';

const Transactions = () => {
    const { formatPrice } = useLocalization();
    const [transactions, setTransactions] = useState([]);
    const [loading, setLoading] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');

    useEffect(() => {
        fetchTransactions();
    }, []);

    const fetchTransactions = async () => {
        try {
            setLoading(true);
            const { data } = await axios.get('/api/admin/transactions');
            setTransactions(data);
        } catch (error) {
            console.error('Error fetching transactions:', error);
        } finally {
            setLoading(false);
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
                    <div className="fw-semibold">{row.user_id?.username || 'System'}</div>
                    <div className="text-muted small">{row.user_id?.email || ''}</div>
                </div>
            )
        },
        {
            header: 'Type',
            accessor: 'type',
            render: (row) => (
                <Badge bg={row.type === 'credit' ? 'success' : 'danger'}>
                    {row.type?.toUpperCase()}
                </Badge>
            )
        },
        {
            header: 'Amount',
            accessor: 'amount',
            render: (row) => (
                <span className={row.type === 'credit' ? 'text-success fw-bold' : 'text-danger fw-bold'}>
                    {row.type === 'credit' ? '+' : '-'}{formatPrice(row.amount)}
                </span>
            )
        },
        {
            header: 'Purpose',
            accessor: 'purpose',
            render: (row) => row.purpose?.replace('_', ' ').toUpperCase()
        },
        {
            header: 'Status',
            accessor: 'status',
            render: (row) => {
                const variants = {
                    completed: 'success',
                    pending: 'warning',
                    failed: 'danger'
                };
                return <Badge bg={variants[row.status] || 'secondary'}>{row.status?.toUpperCase()}</Badge>;
            }
        }
    ];

    const filteredData = transactions.filter(t =>
        t.user_id?.username?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        t.user_id?.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        t.purpose?.toLowerCase().includes(searchTerm.toLowerCase())
    );

    return (
        <div className="admin-dashboard p-0">
            <Container fluid className="px-0">
                <Card className="main-content-card border-0 shadow-sm p-4">
                    <div className="dashboard-header mb-4">
                        <div>
                            <h2 className="dashboard-title">Transactions</h2>
                            <p className="text-muted small mb-0">View all system financial records</p>
                        </div>
                    </div>

                    <div className="mb-4">
                        <InputGroup className="search-input-group" style={{ maxWidth: '400px' }}>
                            <InputGroup.Text className="bg-white border-end-0">
                                <FaSearch className="text-muted" />
                            </InputGroup.Text>
                            <Form.Control
                                placeholder="Search by user, email, or purpose..."
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
                            emptyMessage="No transactions found"
                        />
                    )}
                </Card>
            </Container>
        </div>
    );
};

export default Transactions;
