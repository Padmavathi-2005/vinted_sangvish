import React, { useState, useEffect, useContext } from 'react';
import axios from '../../utils/axios';
import { FaWallet, FaArrowDown, FaArrowUp, FaClock, FaCheckCircle, FaExclamationCircle } from 'react-icons/fa';
import CurrencyContext from '../../context/CurrencyContext';
import { useTranslation } from 'react-i18next';
import { safeString } from '../../utils/constants';

const WalletContent = ({ activeSubTab = 'wallet' }) => {
    const { t } = useTranslation();
    const { formatPrice } = useContext(CurrencyContext);
    const [loading, setLoading] = useState(true);
    const [walletData, setWalletData] = useState(null);
    const [withdrawHistory, setWithdrawHistory] = useState([]);
    const [showWithdrawModal, setShowWithdrawModal] = useState(false);
    const [withdrawForm, setWithdrawForm] = useState({ amount: '', method: 'Bank Transfer', details: '' });
    const [submitting, setSubmitting] = useState(false);
    const [message, setMessage] = useState(null);

    const fetchData = async () => {
        setLoading(true);
        try {
            const [wRes, hRes] = await Promise.all([
                axios.get('/api/wallet/me'),
                axios.get('/api/wallet/withdrawals')
            ]);
            setWalletData(wRes.data);
            setWithdrawHistory(hRes.data);
        } catch (err) {
            console.error("Error fetching wallet data:", err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchData();
    }, []);

    const handleWithdraw = async (e) => {
        e.preventDefault();
        setSubmitting(true);
        setMessage(null);
        try {
            await axios.post('/api/wallet/withdraw', {
                amount: parseFloat(withdrawForm.amount),
                payment_method: withdrawForm.method,
                payment_details: withdrawForm.details
            });
            setMessage({ type: 'success', text: 'Withdrawal request submitted successfully!' });
            setWithdrawForm({ amount: '', method: 'Bank Transfer', details: '' });
            setTimeout(() => {
                setShowWithdrawModal(false);
                setMessage(null);
            }, 2000);
            fetchData();
        } catch (err) {
            setMessage({ type: 'error', text: err.response?.data?.message || 'Withdrawal failed.' });
        } finally {
            setSubmitting(false);
        }
    };

    if (loading) return <div className="text-center py-5"><div className="spinner-border text-primary"></div></div>;

    const renderWallet = () => (
        <div className="pd-section-card mb-4" style={{ background: 'linear-gradient(135deg, #0ea5e9, #6366f1)', color: 'white', border: 'none', borderRadius: '24px', padding: '40px' }}>
            <div className="d-flex align-items-center gap-4">
                <div className="wallet-icon-large" style={{ background: 'rgba(255,255,255,0.2)', padding: '20px', borderRadius: '20px' }}>
                    <FaWallet size={40} />
                </div>
                <div>
                    <div style={{ opacity: 0.9, fontSize: '1rem', fontWeight: 500 }}>{t('wallet.total_balance', 'Total Balance')}</div>
                    <h2 className="fw-bold mb-0" style={{ fontSize: '3rem' }}>{formatPrice(walletData?.wallet?.balance || 0)}</h2>
                </div>
                <button
                    className="btn btn-white btn-lg ms-auto px-5 fw-bold rounded-pill shadow-sm"
                    style={{ background: 'white', color: '#0ea5e9', border: 'none', height: '60px' }}
                    onClick={() => setShowWithdrawModal(true)}
                >
                    {t('wallet.withdraw_funds', 'Withdraw Funds')}
                </button>
            </div>
        </div>
    );

    const renderTransactions = () => (
        <div className="pd-section-card border-0 shadow-sm" style={{ borderRadius: '20px', padding: '24px', background: 'white' }}>
            <h3 className="pd-section-title mb-4" style={{ fontSize: '1.2rem', fontWeight: 700 }}>{t('wallet.transaction_history', 'Transaction History')}</h3>
            <div className="transaction-list">
                {walletData?.transactions?.length > 0 ? (
                    walletData.transactions.map(tx => (
                        <div key={tx._id} className="transaction-item d-flex align-items-center justify-content-between p-3 mb-2 rounded-4 border-0 bg-light">
                            <div className="d-flex align-items-center gap-3">
                                <div className={`tx-type-icon ${tx.type}`} style={{ background: tx.type === 'credit' ? '#dcfce7' : '#fee2e2', padding: '10px', borderRadius: '12px' }}>
                                    {tx.type === 'credit' ? <FaArrowDown color="#16a34a" /> : <FaArrowUp color="#dc2626" />}
                                </div>
                                <div>
                                    <div className="fw-bold" style={{ fontSize: '0.9rem' }}>{safeString(tx.description)}</div>
                                    <div className="text-muted" style={{ fontSize: '0.75rem' }}>
                                        {new Date(tx.created_at).toLocaleDateString()} • {tx.purpose.replace(/_/g, ' ')}
                                    </div>
                                </div>
                            </div>
                            <div className="text-end">
                                <div className={`fw-bold ${tx.type === 'credit' ? 'text-success' : 'text-danger'}`} style={{ fontSize: '1.1rem' }}>
                                    {tx.type === 'credit' ? '+' : '-'}{formatPrice(tx.amount)}
                                </div>
                                <div className="tx-status-badge small" style={{ fontSize: '0.7rem' }}>
                                    {tx.status === 'completed' ? (
                                        <span className="text-success fw-bold"><FaCheckCircle className="me-1" />{t('wallet.completed', 'Completed')}</span>
                                    ) : (
                                        <span className="text-warning fw-bold"><FaClock className="me-1" />{t('wallet.pending', 'Pending')}</span>
                                    )}
                                </div>
                            </div>
                        </div>
                    ))
                ) : (
                    <div className="text-center py-5 text-muted">
                        <FaExclamationCircle size={40} className="mb-3 opacity-25" />
                        <p>{t('wallet.no_transactions', 'No transactions found.')}</p>
                    </div>
                )}
            </div>
        </div>
    );

    const renderWithdrawals = () => (
        <div className="pd-section-card border-0 shadow-sm" style={{ borderRadius: '20px', padding: '24px', background: 'white' }}>
            <h3 className="pd-section-title mb-4" style={{ fontSize: '1.2rem', fontWeight: 700 }}>{t('wallet.withdrawal_requests', 'Withdrawal Requests')}</h3>
            <div className="transaction-list">
                {withdrawHistory?.length > 0 ? (
                    withdrawHistory.map(req => (
                        <div key={req._id} className="transaction-item d-flex align-items-center justify-content-between p-3 mb-2 rounded-4 border-0 bg-light">
                            <div className="d-flex align-items-center gap-3">
                                <div className="tx-type-icon" style={{ background: '#e0f2fe', padding: '10px', borderRadius: '12px' }}>
                                    <FaArrowUp color="#0ea5e9" />
                                </div>
                                <div>
                                    <div className="fw-bold" style={{ fontSize: '0.9rem' }}>{req.payment_method} {t('wallet.withdrawal', 'Withdrawal')}</div>
                                    <div className="text-muted" style={{ fontSize: '0.75rem' }}>
                                        {new Date(req.created_at).toLocaleDateString()} • ID: #{req._id.slice(-6).toUpperCase()}
                                    </div>
                                </div>
                            </div>
                            <div className="text-end">
                                <div className="fw-bold text-dark" style={{ fontSize: '1.1rem' }}>
                                    {formatPrice(req.amount)}
                                </div>
                                <div className="tx-status-badge small">
                                    <span className={`badge ${req.status === 'pending' ? 'bg-warning' : req.status === 'completed' ? 'bg-success' : 'bg-danger'} rounded-pill px-3`}>
                                        {req.status === 'pending' ? t('wallet.pending', 'Pending').toUpperCase() : req.status === 'completed' ? t('wallet.completed', 'Completed').toUpperCase() : req.status.toUpperCase()}
                                    </span>
                                </div>
                            </div>
                        </div>
                    ))
                ) : (
                    <div className="text-center py-5 text-muted">
                        <FaExclamationCircle size={40} className="mb-3 opacity-25" />
                        <p>{t('wallet.no_withdrawals', 'No withdrawal requests found.')}</p>
                    </div>
                )}
            </div>
        </div>
    );

    return (
        <div className="wallet-content">
            {activeSubTab === 'wallet' && renderWallet()}
            {activeSubTab === 'transactions' && renderTransactions()}
            {activeSubTab === 'withdrawals' && renderWithdrawals()}

            {/* Withdrawal Modal */}
            {showWithdrawModal && (
                <div className="pd-modal-overlay">
                    <div className="pd-modal-content" style={{ maxWidth: '450px', borderRadius: '24px', padding: '30px' }}>
                        <div className="d-flex justify-content-between align-items-start mb-4">
                            <h3 className="fw-bold m-0">{t('wallet.withdraw_funds', 'Withdraw Funds')}</h3>
                            <button className="btn-close" onClick={() => setShowWithdrawModal(false)}></button>
                        </div>

                        {message && (
                            <div className={`alert alert-${message.type === 'success' ? 'success' : 'danger'} small rounded-3`}>
                                {message.text}
                            </div>
                        )}

                        <form onSubmit={handleWithdraw}>
                            <div className="mb-3">
                                <label className="form-label small fw-bold text-muted">{t('wallet.amount_to_withdraw', 'Amount to Withdraw')}</label>
                                <div className="input-group">
                                    <span className="input-group-text border-0 bg-light" style={{ borderRadius: '12px 0 0 12px' }}>₹</span>
                                    <input
                                        type="number"
                                        className="form-control border-0 bg-light"
                                        style={{ borderRadius: '0 12px 12px 0' }}
                                        value={withdrawForm.amount}
                                        onChange={(e) => setWithdrawForm({ ...withdrawForm, amount: e.target.value })}
                                        placeholder="0.00"
                                        max={walletData?.wallet?.balance}
                                        required
                                    />
                                </div>
                                <div className="text-primary xsmall mt-2 fw-bold">{t('wallet.available', 'Available')}: {formatPrice(walletData?.wallet?.balance || 0)}</div>
                            </div>
                            <div className="mb-3">
                                <label className="form-label small fw-bold text-muted">{t('wallet.payment_method', 'Payment Method')}</label>
                                <select
                                    className="form-select border-0 bg-light"
                                    style={{ borderRadius: '12px' }}
                                    value={withdrawForm.method}
                                    onChange={(e) => setWithdrawForm({ ...withdrawForm, method: e.target.value })}
                                >
                                    <option>{t('wallet.bank_transfer', 'Bank Transfer')}</option>
                                    <option>{t('wallet.upi', 'UPI')}</option>
                                    <option>{t('wallet.paypal', 'PayPal')}</option>
                                </select>
                            </div>
                            <div className="mb-4">
                                <label className="form-label small fw-bold text-muted">{t('wallet.payment_details', 'Payment Details')}</label>
                                <textarea
                                    className="form-control border-0 bg-light"
                                    style={{ borderRadius: '12px' }}
                                    rows="3"
                                    value={withdrawForm.details}
                                    onChange={(e) => setWithdrawForm({ ...withdrawForm, details: e.target.value })}
                                    placeholder={t('wallet.enter_bank_details', 'Enter your bank account number and IFSC or UPI ID...')}
                                    required
                                />
                            </div>
                            <div className="d-flex gap-2">
                                <button type="button" className="btn btn-light flex-grow-1 rounded-pill py-2" onClick={() => setShowWithdrawModal(false)}>{t('common.cancel', 'Cancel')}</button>
                                <button type="submit" className="btn btn-primary flex-grow-1 rounded-pill py-2 fw-bold" disabled={submitting || !withdrawForm.amount}>
                                    {submitting ? t('common.saving', 'Submitting...') : t('wallet.request_withdrawal', 'Request Withdrawal')}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};

export default WalletContent;
