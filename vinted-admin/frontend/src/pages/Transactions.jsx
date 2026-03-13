import React, { useState, useEffect } from 'react';
import { Container, Card, Spinner, Badge, Form, InputGroup, Button, Dropdown } from 'react-bootstrap';
import { FaSearch, FaSync, FaDownload, FaFileCsv, FaFilePdf } from 'react-icons/fa';
import Table from '../components/Table';
import axios from '../utils/axios';
import { useLocalization } from '../context/LocalizationContext';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

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

    const exportToCSV = () => {
        if (filteredData.length === 0) return alert('No data to export');

        const headers = ['Date', 'User', 'Type', 'Amount', 'Purpose', 'Status'];
        const csvRows = [
            headers.join(','),
            ...filteredData.map(t => [
                new Date(t.created_at).toLocaleDateString(),
                t.user_id?.username || 'System',
                t.type?.toUpperCase() || '',
                `${t.type === 'credit' ? '+' : '-'}${t.amount}`,
                t.purpose?.replace(/_/g, ' ').toUpperCase() || '',
                t.status?.toUpperCase() || ''
            ].map(v => `"${v}"`).join(','))
        ];

        const csvContent = csvRows.join('\n');
        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.setAttribute('download', `transactions_export_${new Date().toISOString().slice(0, 10)}.csv`);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    const exportToPDF = () => {
        if (filteredData.length === 0) return alert('No data to export');

        const doc = new jsPDF();
        doc.setFontSize(18);
        doc.text('Transactions Report', 14, 22);
        doc.setFontSize(11);
        doc.setTextColor(100);
        doc.text(`Generated on: ${new Date().toLocaleString()}`, 14, 30);

        const tableColumn = ['Date', 'User', 'Type', 'Amount', 'Purpose', 'Status'];
        const tableRows = filteredData.map(t => [
            new Date(t.created_at).toLocaleDateString(),
            t.user_id?.username || 'System',
            t.type?.toUpperCase() || '',
            `${t.type === 'credit' ? '+' : '-'}${formatPrice(t.amount)}`,
            t.purpose?.replace(/_/g, ' ').toUpperCase() || '',
            t.status?.toUpperCase() || ''
        ]);

        autoTable(doc, {
            head: [tableColumn],
            body: tableRows,
            startY: 40,
            styles: { fontSize: 10, cellPadding: 3 },
            headStyles: { fillColor: [14, 165, 233] },
        });

        doc.save(`transactions_export_${new Date().toISOString().slice(0, 10)}.pdf`);
    };

    return (
        <div className="admin-dashboard p-0">
            <Container fluid className="px-0">
                <Card className="main-content-card border-0 shadow-sm p-4">
                    <div className="dashboard-header mb-4 d-flex justify-content-between align-items-center flex-wrap gap-3">
                        <div>
                            <h2 className="dashboard-title h3 mb-1">Transactions</h2>
                            <p className="text-muted small mb-0">View all system financial records</p>
                        </div>
                        <div className="d-flex gap-2">
                            <Button variant="outline-primary" onClick={fetchTransactions} className="d-flex align-items-center gap-2 bg-white">
                                <FaSync /> Refresh
                            </Button>
                            <Dropdown>
                                <Dropdown.Toggle variant="primary" id="dropdown-export" className="d-flex align-items-center gap-2">
                                    <FaDownload /> Export
                                </Dropdown.Toggle>
                                <Dropdown.Menu className="shadow border-0">
                                    <Dropdown.Item onClick={exportToCSV} className="d-flex align-items-center gap-2 py-2">
                                        <FaFileCsv className="text-success" /> Export to CSV
                                    </Dropdown.Item>
                                    <Dropdown.Item onClick={exportToPDF} className="d-flex align-items-center gap-2 py-2">
                                        <FaFilePdf className="text-danger" /> Export to PDF
                                    </Dropdown.Item>
                                </Dropdown.Menu>
                            </Dropdown>
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
