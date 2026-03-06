import React, { useContext, useEffect, useState, useCallback } from 'react';
import { useNavigate, Link, useLocation } from 'react-router-dom';
import axios from '../utils/axios';
import AuthContext from '../context/AuthContext';
import CurrencyContext from '../context/CurrencyContext';
import { FaListAlt, FaBoxOpen, FaHeart, FaWallet, FaCheckCircle, FaUserEdit, FaAngleLeft, FaAngleRight, FaEnvelope, FaBell, FaTruck, FaClock, FaCreditCard, FaMoneyBillWave, FaBars, FaTimes, FaStar } from 'react-icons/fa';
import '../styles/Profile.css';
import EditProfileModal from '../components/common/EditProfileModal';
import ItemCard from '../components/common/ItemCard';
import MessagesContent from '../components/profile/MessagesContent';
import NotificationsContent from '../components/profile/NotificationsContent';
import WalletContent from '../components/profile/WalletContent';
import { useTranslation } from 'react-i18next';
import { getImageUrl, getItemImageUrl } from '../utils/constants';

const Profile = () => {
    const { user, loading, updateUser, logout, mode, toggleMode } = useContext(AuthContext);
    const { formatPrice } = useContext(CurrencyContext);
    const { t } = useTranslation();
    const navigate = useNavigate();
    const location = useLocation();

    // Tab State
    const [activeTab, setActiveTab] = useState('dashboard');

    // Listings State
    const [myListings, setMyListings] = useState([]);
    const [listingsLoading, setListingsLoading] = useState(false);
    const [listingsPage, setListingsPage] = useState(1);
    const [listingsTotalPages, setListingsTotalPages] = useState(1);
    const [listingsTotalCount, setListingsTotalCount] = useState(0);

    // Favorites State
    const [favorites, setFavorites] = useState([]);
    const [favoritesLoading, setFavoritesLoading] = useState(false);
    const [favoritesPage, setFavoritesPage] = useState(1);
    const [favoritesTotalPages, setFavoritesTotalPages] = useState(1);
    const [favoritesTotalCount, setFavoritesTotalCount] = useState(0);

    // Edit Item State
    const [editingItem, setEditingItem] = useState(null);

    // Orders State
    const [boughtOrders, setBoughtOrders] = useState([]);
    const [soldOrders, setSoldOrders] = useState([]);
    const [ordersLoading, setOrdersLoading] = useState(false);
    const [selectedOrder, setSelectedOrder] = useState(null);
    const [showOrderModal, setShowOrderModal] = useState(false);
    const [isEditingAddress, setIsEditingAddress] = useState(false);
    const [addressForm, setAddressForm] = useState({
        full_name: '',
        address_line: '',
        city: '',
        state: '',
        pincode: '',
        phone: ''
    });

    const [orderSubTab, setOrderSubTab] = useState('all');
    const [paymentSubTab, setPaymentSubTab] = useState('wallet');
    const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

    // Review state
    const [reviewRating, setReviewRating] = useState(0);
    const [reviewHover, setReviewHover] = useState(0);
    const [reviewComment, setReviewComment] = useState('');
    const [reviewSubmitting, setReviewSubmitting] = useState(false);
    const [existingReview, setExistingReview] = useState(null);

    // Tab label helper
    const getTabLabel = (tab) => {
        const labels = {
            dashboard: t('profile.dashboard'),
            profile_settings: t('user_menu.my_profile'),
            orders: mode === 'seller' ? t('profile.orders_received', 'Orders Received') : t('user_menu.my_orders', 'My Orders'),
            listings: t('user_menu.manage_listings', 'Manage Listings'),
            favorites: t('profile.favorites'),
            messages: t('user_menu.messages', 'Messages'),
            notifications: t('notifications.title', 'Notifications'),
            payments: t('profile.payment_account', 'Payment & Account')
        };
        return labels[tab] || tab;
    };

    // Derived State
    const currentOrders = mode === 'buyer' ? boughtOrders : soldOrders;

    const filteredOrders = currentOrders.filter(order => {
        if (orderSubTab === 'all') return true;
        if (orderSubTab === 'booked') return order.order_status === 'placed';
        return order.order_status === orderSubTab;
    });

    // Persistence Type
    const [paginationMode, setPaginationMode] = useState('scroll');

    // Handle initial tab from URL
    useEffect(() => {
        const queryParams = new URLSearchParams(location.search);
        const tab = queryParams.get('tab');
        if (tab) {
            setActiveTab(tab);
            // If redirected to listings tab, switch to seller mode so the guard doesn't override it
            if (tab === 'listings' && mode !== 'seller') {
                toggleMode();
            }
        }
    }, [location.search]);

    // Redirect to dashboard if tab is not allowed in current mode
    useEffect(() => {
        if (mode === 'seller' && activeTab === 'favorites') {
            setActiveTab('dashboard');
        }
        if (mode === 'buyer' && activeTab === 'listings') {
            setActiveTab('dashboard');
        }
    }, [mode, activeTab]);

    useEffect(() => {
        if (!loading && !user) {
            navigate('/login');
        }
    }, [user, loading, navigate]);

    // Body scroll lock
    useEffect(() => {
        if (showOrderModal) {
            document.body.classList.add('modal-open');
        } else {
            document.body.classList.remove('modal-open');
        }
        return () => document.body.classList.remove('modal-open');
    }, [showOrderModal]);

    // Fetch Listings
    const fetchMyListings = useCallback(async (pageNum, isAppend = false) => {
        if (!user) return;
        setListingsLoading(true);
        try {
            const res = await axios.get('/api/items/myitems', {
                params: { page: pageNum, limit: 12 }
            });
            const { items, totalPages, totalCount } = res.data;

            setListingsTotalPages(totalPages);
            setListingsTotalCount(totalCount);

            if (isAppend) {
                setMyListings(prev => {
                    const existingIds = new Set(prev.map(i => i._id));
                    const uniqueNew = items.filter(i => !existingIds.has(i._id));
                    return [...prev, ...uniqueNew];
                });
            } else {
                setMyListings(items);
            }
        } catch (error) {
            console.error("Error fetching listings:", error);
        } finally {
            setListingsLoading(false);
        }
    }, [user]);

    // Fetch Favorites
    const fetchMyFavorites = useCallback(async (pageNum, isAppend = false) => {
        if (!user) return;
        setFavoritesLoading(true);
        try {
            const res = await axios.get('/api/favorites', {
                params: { populate: 'true', page: pageNum, limit: 12 }
            });
            const { items, totalPages, totalCount } = res.data;

            setFavoritesTotalPages(totalPages);
            setFavoritesTotalCount(totalCount);

            if (isAppend) {
                setFavorites(prev => {
                    const existingIds = new Set(prev.map(i => i._id));
                    const uniqueNew = items.filter(i => !existingIds.has(i._id));
                    return [...prev, ...uniqueNew];
                });
            } else {
                setFavorites(items);
            }
        } catch (error) {
            console.error("Error fetching favorites:", error);
        } finally {
            setFavoritesLoading(false);
        }
    }, [user]);

    // Fetch Orders
    const fetchMyOrders = useCallback(async () => {
        if (!user) return;
        setOrdersLoading(true);
        try {
            const res = await axios.get('/api/orders');
            setBoughtOrders(res.data.bought || []);
            setSoldOrders(res.data.sold || []);
        } catch (error) {
            console.error("Error fetching orders:", error);
        } finally {
            setOrdersLoading(false);
        }
    }, [user]);

    const handleAddressUpdate = async (e) => {
        if (e) e.preventDefault();
        try {
            const res = await axios.put(`/api/orders/${selectedOrder._id}/address`, {
                shipping_address: addressForm
            });
            setSelectedOrder(res.data);
            setIsEditingAddress(false);
            fetchMyOrders();
            alert('Address updated successfully');
        } catch (err) {
            console.error('Error updating address:', err);
            alert(err.response?.data?.message || 'Failed to update address');
        }
    };

    const getStatusLabel = (status) => {
        const labels = {
            'placed': 'BOOKED',
            'dispatched': 'DISPATCHED',
            'on_the_way': 'ON THE WAY',
            'delivered': 'DELIVERED',
            'cancelled': 'CANCELLED'
        };
        return labels[status] || (status || 'BOOKED').toUpperCase().replace(/_/g, ' ');
    };

    const handleCancelOrder = async () => {
        if (!window.confirm('Are you sure you want to cancel this order? You will receive a full refund in your wallet.')) return;
        try {
            await axios.post(`/api/orders/${selectedOrder._id}/cancel`);
            fetchMyOrders();
            setShowOrderModal(false);
        } catch (err) {
            console.error('Error cancelling order:', err);
            alert(err.response?.data?.message || 'Failed to cancel order');
        }
    };

    const handleRequestReturn = async () => {
        const reason = window.prompt("Please enter the reason for your return request:");
        if (!reason) return;
        try {
            const res = await axios.post(`/api/orders/${selectedOrder._id}/return`, { reason });
            setSelectedOrder(res.data.order);
            fetchMyOrders();
            alert("Return requested successfully");
        } catch (err) {
            console.error(err);
            alert(err.response?.data?.message || 'Failed to request return');
        }
    };

    const handleProcessReturn = async (refundType) => {
        let amount = 0;
        let reason = '';
        if (refundType === 'partial') {
            const amountStr = window.prompt(`Enter amount to refund (Max: ${selectedOrder.total_amount}):`);
            if (!amountStr) return;
            amount = Number(amountStr);
            if (isNaN(amount) || amount <= 0 || amount > selectedOrder.total_amount) {
                return alert("Invalid amount");
            }
            reason = window.prompt("Enter reason for partial refund:");
            if (!reason) return;
        } else {
            if (!window.confirm("Are you sure you want to issue a full refund?")) return;
            reason = "Full Refund processed";
        }

        try {
            const res = await axios.post(`/api/orders/${selectedOrder._id}/process-return`, { refundType, amount, reason });
            setSelectedOrder(res.data.order);
            fetchMyOrders();
            alert("Return processed successfully");
        } catch (err) {
            console.error(err);
            alert(err.response?.data?.message || 'Failed to process return');
        }
    };

    const handleStatusUpdate = async (newStatus) => {
        try {
            const res = await axios.put(`/api/orders/${selectedOrder._id}/status`, {
                status: newStatus
            });
            setSelectedOrder(res.data);
            fetchMyOrders();
        } catch (err) {
            console.error('Error updating status:', err);
            alert(err.response?.data?.message || 'Failed to update status');
        }
    };

    // Fetch Initial Counts
    useEffect(() => {
        if (user) {
            axios.get('/api/items/myitems', { params: { limit: 1 } })
                .then(res => setListingsTotalCount(res.data.totalCount))
                .catch(err => console.error(err));

            axios.get('/api/favorites', { params: { limit: 1 } })
                .then(res => setFavoritesTotalCount(res.data.totalCount))
                .catch(err => console.error(err));
        }
    }, [user]);

    // Trigger Listings Fetch
    useEffect(() => {
        if (activeTab === 'listings' && mode === 'seller') {
            if (paginationMode === 'number') {
                fetchMyListings(listingsPage, false);
            } else {
                if (listingsPage === 1) fetchMyListings(1, false);
                else fetchMyListings(listingsPage, true);
            }
        }
    }, [activeTab, mode, listingsPage, paginationMode, fetchMyListings]);

    // Trigger Favorites Fetch
    useEffect(() => {
        if (activeTab === 'favorites' && mode === 'buyer') {
            if (paginationMode === 'number') {
                fetchMyFavorites(favoritesPage, false);
            } else {
                if (favoritesPage === 1) fetchMyFavorites(1, false);
                else fetchMyFavorites(favoritesPage, true);
            }
        }
    }, [activeTab, mode, favoritesPage, paginationMode, fetchMyFavorites]);

    // Trigger Orders Fetch
    useEffect(() => {
        if (activeTab === 'orders') {
            fetchMyOrders();
        }
    }, [activeTab, fetchMyOrders]);

    if (loading) return (
        <div className="d-flex justify-content-center align-items-center" style={{ height: '80vh' }}>
            <div className="spinner-border text-primary" role="status">
                <span className="visually-hidden">Loading...</span>
            </div>
        </div>
    );

    if (!user) return null;

    const handleNextPage = () => {
        if (activeTab === 'listings' && listingsPage < listingsTotalPages) setListingsPage(p => p + 1);
        if (activeTab === 'favorites' && favoritesPage < favoritesTotalPages) setFavoritesPage(p => p + 1);
    };

    const handlePrevPage = () => {
        if (activeTab === 'listings' && listingsPage > 1) setListingsPage(p => p - 1);
        if (activeTab === 'favorites' && favoritesPage > 1) setFavoritesPage(p => p - 1);
    };

    // Fetch existing review when order modal opens
    const checkExistingReview = async (orderId) => {
        try {
            const res = await axios.get(`/api/reviews/order/${orderId}`);
            if (res.data) {
                setExistingReview(res.data);
                setReviewRating(res.data.rating);
                setReviewComment(res.data.comment || '');
            } else {
                setExistingReview(null);
                setReviewRating(0);
                setReviewComment('');
            }
        } catch (err) {
            setExistingReview(null);
        }
    };

    const handleSubmitReview = async () => {
        if (reviewRating === 0) return alert('Please select a rating');
        setReviewSubmitting(true);
        try {
            await axios.post('/api/reviews', {
                order_id: selectedOrder._id,
                rating: reviewRating,
                comment: reviewComment,
            });
            alert('Review submitted! Thank you for your feedback.');
            checkExistingReview(selectedOrder._id);
        } catch (err) {
            alert(err.response?.data?.message || 'Failed to submit review');
        } finally {
            setReviewSubmitting(false);
        }
    };

    return (
        <div className="profile-dashboard">
            {/* ─── Mobile Header ─── */}
            <div className="pd-mobile-header">
                <button className="pd-mobile-hamburger" onClick={() => setMobileMenuOpen(true)}>
                    <FaBars />
                </button>
                <span className="pd-mobile-tab-title">{getTabLabel(activeTab)}</span>
                <div
                    className={`pd-mode-toggle-wrapper pd-mode-toggle-mobile ${mode === 'seller' ? 'seller-active' : ''}`}
                    onClick={toggleMode}
                >
                    <div className="pd-mode-toggle-slider" />
                    <div className={`pd-mode-option ${mode === 'buyer' ? 'active' : ''}`}>B</div>
                    <div className={`pd-mode-option ${mode === 'seller' ? 'active' : ''}`}>S</div>
                </div>
            </div>

            {/* ─── Mobile Drawer ─── */}
            {mobileMenuOpen && <div className="pd-mobile-overlay" onClick={() => setMobileMenuOpen(false)} />}
            <div className={`pd-mobile-drawer ${mobileMenuOpen ? 'open' : ''}`}>
                <div className="pd-mobile-drawer-header">
                    <span className="pd-mobile-drawer-title">Menu</span>
                    <button className="pd-mobile-close" onClick={() => setMobileMenuOpen(false)}><FaTimes /></button>
                </div>
                <div className="pd-mobile-drawer-items">
                    {['dashboard', 'profile_settings',
                        ...(mode === 'buyer' ? ['orders', 'favorites'] : ['listings', 'orders']),
                        'messages', 'notifications', 'payments'
                    ].map(tab => (
                        <div
                            key={tab}
                            className={`pd-mobile-drawer-item ${activeTab === tab ? 'active' : ''}`}
                            onClick={() => { setActiveTab(tab); setMobileMenuOpen(false); }}
                        >
                            {getTabLabel(tab)}
                        </div>
                    ))}
                </div>
            </div>

            <div className={`pd-container ${['listings', 'favorites', 'profile_settings', 'messages', 'notifications'].includes(activeTab) ? 'full-width' : ''}`}>
                {/* ─── Top Navigation ─── */}
                <div className="pd-nav">
                    <div className="pd-nav-items">
                        <div className={`pd-nav-item ${activeTab === 'dashboard' ? 'active' : ''}`} onClick={() => setActiveTab('dashboard')}>{t('profile.dashboard')}</div>
                        <div className={`pd-nav-item ${activeTab === 'profile_settings' ? 'active' : ''}`} onClick={() => setActiveTab('profile_settings')}>{t('user_menu.my_profile')}</div>

                        {mode === 'buyer' && (
                            <>
                                <div className={`pd-nav-item ${activeTab === 'orders' ? 'active' : ''}`} onClick={() => setActiveTab('orders')}>{t('user_menu.my_orders', 'My Orders')}</div>
                                <div className={`pd-nav-item ${activeTab === 'favorites' ? 'active' : ''}`} onClick={() => setActiveTab('favorites')}>{t('profile.favorites')}</div>
                            </>
                        )}

                        {mode === 'seller' && (
                            <>
                                <div className={`pd-nav-item ${activeTab === 'listings' ? 'active' : ''}`} onClick={() => setActiveTab('listings')}>{t('user_menu.manage_listings', 'Manage Listings')}</div>
                                <div className={`pd-nav-item ${activeTab === 'orders' ? 'active' : ''}`} onClick={() => setActiveTab('orders')}>{t('profile.orders_received', 'Orders Received')}</div>
                            </>
                        )}

                        <div className={`pd-nav-item ${activeTab === 'messages' ? 'active' : ''}`} onClick={() => setActiveTab('messages')}>{t('user_menu.messages', 'Messages')}</div>
                        <div className={`pd-nav-item ${activeTab === 'notifications' ? 'active' : ''}`} onClick={() => setActiveTab('notifications')}>{t('notifications.title', 'Notifications')}</div>
                        <div className={`pd-nav-item ${activeTab === 'payments' ? 'active' : ''}`} onClick={() => setActiveTab('payments')}>{t('profile.payment_account', 'Payment & Account')}</div>
                    </div>

                    <div
                        className={`pd-mode-toggle-wrapper ${mode === 'seller' ? 'seller-active' : ''}`}
                        onClick={toggleMode}
                        title={`Switch to ${mode === 'buyer' ? 'Seller' : 'Buyer'} Mode`}
                    >
                        <div className="pd-mode-toggle-slider" />
                        <div className={`pd-mode-option ${mode === 'buyer' ? 'active' : ''}`}>{t('user_menu.buyer_mode', 'Buyer')}</div>
                        <div className={`pd-mode-option ${mode === 'seller' ? 'active' : ''}`}>{t('user_menu.seller_mode', 'Seller')}</div>
                    </div>
                </div>

                {/* ─── Sidebar ─── */}
                {(activeTab === 'dashboard' || activeTab === 'orders' || activeTab === 'payments') && (
                    <div className="pd-sidebar">
                        <div className="pd-card pd-profile-card">
                            <div className="pd-avatar-wrapper">
                                {user.profile_image ? (
                                    <img
                                        src={getImageUrl(user.profile_image)}
                                        alt="Profile"
                                        className="pd-avatar"
                                        onError={(e) => {
                                            e.target.style.display = 'none';
                                            e.target.parentNode.innerHTML = `<div class="pd-avatar-placeholder" style="background-color: var(--primary-color); color: white;">${(user.username || 'U').charAt(0).toUpperCase()}</div>`;
                                        }}
                                    />
                                ) : (
                                    <div className="pd-avatar-placeholder" style={{ backgroundColor: 'var(--primary-color)', color: 'white' }}>
                                        {(user.username || user.name || user.email || 'U').charAt(0).toUpperCase()}
                                    </div>
                                )}
                                <div className="pd-avatar-upload-icon" onClick={() => setActiveTab('profile_settings')}><FaUserEdit /></div>
                            </div>
                            <div className="d-grid gap-2 mt-3">
                                <button className="btn btn-outline-danger btn-sm rounded-pill py-2" onClick={logout}>{t('user_menu.logout', 'Logout')}</button>
                            </div>
                            <div className="mt-3 pt-3 border-top">
                                <p className="text-muted extra-small mb-2 fw-bold text-uppercase" style={{ letterSpacing: '0.05em' }}>{t('profile.account_security', 'Account & Privacy')}</p>
                                <button className="btn btn-link text-danger btn-sm text-decoration-none fw-bold p-0" style={{ fontSize: '0.8rem' }}>{t('profile.delete_account', 'Delete Account')}</button>
                            </div>

                            {/* Sub-menu Items (Now inside Profile Card for a cleaner look) */}
                            {activeTab === 'orders' && (
                                <div className="mt-3 pt-3 border-top">
                                    <p className="extra-small mb-2 fw-bold text-uppercase" style={{ letterSpacing: '0.05em', color: '#64748b' }}>{t('profile.order_status', 'Order Status')}</p>
                                    <div className="d-flex flex-column gap-1">
                                        <div className={`pd-sidemenu-item ${orderSubTab === 'all' ? 'active' : ''}`} onClick={() => setOrderSubTab('all')}>{t('profile.all_orders', 'All Orders')}</div>
                                        <div className={`pd-sidemenu-item ${orderSubTab === 'booked' ? 'active' : ''}`} onClick={() => setOrderSubTab('booked')}>{t('profile.booked', 'Booked')}</div>
                                        {mode === 'seller' ? (
                                            <>
                                                <div className={`pd-sidemenu-item ${orderSubTab === 'dispatched' ? 'active' : ''}`} onClick={() => setOrderSubTab('dispatched')}>{t('profile.dispatched', 'Dispatched')}</div>
                                                <div className={`pd-sidemenu-item ${orderSubTab === 'on_the_way' ? 'active' : ''}`} onClick={() => setOrderSubTab('on_the_way')}>{t('profile.on_the_way', 'On the way')}</div>
                                                <div className={`pd-sidemenu-item ${orderSubTab === 'delivered' ? 'active' : ''}`} onClick={() => setOrderSubTab('delivered')}>{t('profile.delivered', 'Delivered')}</div>
                                            </>
                                        ) : (
                                            <>
                                                <div className={`pd-sidemenu-item ${orderSubTab === 'delivered' ? 'active' : ''}`} onClick={() => setOrderSubTab('delivered')}>{t('profile.delivered', 'Delivered')}</div>
                                                <div className={`pd-sidemenu-item ${orderSubTab === 'returned' ? 'active' : ''}`} onClick={() => setOrderSubTab('returned')}>{t('profile.returned', 'Returned')}</div>
                                                <div className={`pd-sidemenu-item ${orderSubTab === 'cancelled' ? 'active' : ''}`} onClick={() => setOrderSubTab('cancelled')}>{t('profile.cancelled', 'Cancelled')}</div>
                                            </>
                                        )}
                                    </div>
                                </div>
                            )}

                            {activeTab === 'payments' && (
                                <div className="mt-3 pt-3 border-top">
                                    <p className="extra-small mb-2 fw-bold text-uppercase" style={{ letterSpacing: '0.05em', color: '#64748b' }}>{t('profile.payment_section', 'Payment Section')}</p>
                                    <div className="d-flex flex-column gap-1">
                                        <div className={`pd-sidemenu-item ${paymentSubTab === 'wallet' ? 'active' : ''}`} onClick={() => setPaymentSubTab('wallet')}>{t('profile.wallet', 'Wallet')}</div>
                                        <div className={`pd-sidemenu-item ${paymentSubTab === 'transactions' ? 'active' : ''}`} onClick={() => setPaymentSubTab('transactions')}>{t('profile.transactions', 'Transactions')}</div>
                                        <div className={`pd-sidemenu-item ${paymentSubTab === 'withdrawals' ? 'active' : ''}`} onClick={() => setPaymentSubTab('withdrawals')}>{t('profile.withdraw_requests', 'Withdraw Requests')}</div>
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                )}

                {/* ─── Main Content ─── */}
                <div className="pd-main">
                    {activeTab === 'dashboard' && (
                        <>
                            <div className="pd-stats-row">
                                {mode === 'seller' ? (
                                    <>
                                        <div className="pd-stat-card clickable" onClick={() => setActiveTab('listings')}>
                                            <div className="pd-stat-icon blue"><FaListAlt /></div>
                                            <div className="pd-stat-value">{listingsTotalCount}</div>
                                            <div className="pd-stat-label">{t('profile.active_listings')}</div>
                                        </div>
                                        <div className="pd-stat-card clickable" onClick={() => setActiveTab('orders')}>
                                            <div className="pd-stat-icon orange"><FaBoxOpen /></div>
                                            <div className="pd-stat-value">{user.sold_count || 0}</div>
                                            <div className="pd-stat-label">{t('profile.orders_received', 'Orders Received')}</div>
                                        </div>
                                        <div className="pd-stat-card clickable" onClick={() => setActiveTab('payments')}>
                                            <div className="pd-stat-icon yellow"><FaWallet /></div>
                                            <div className="pd-stat-value">{formatPrice(user.balance || 0)}</div>
                                            <div className="pd-stat-label">{t('profile.available_balance')}</div>
                                        </div>
                                    </>
                                ) : (
                                    <>
                                        <div className="pd-stat-card clickable" onClick={() => setActiveTab('orders')}>
                                            <div className="pd-stat-icon blue"><FaBoxOpen /></div>
                                            <div className="pd-stat-value">{user.orders_count || 0}</div>
                                            <div className="pd-stat-label">{t('user_menu.my_orders')}</div>
                                        </div>
                                        <div className="pd-stat-card clickable" onClick={() => setActiveTab('favorites')}>
                                            <div className="pd-stat-icon purple"><FaHeart /></div>
                                            <div className="pd-stat-value">{favoritesTotalCount}</div>
                                            <div className="pd-stat-label">{t('profile.favorites')}</div>
                                        </div>
                                        <div className="pd-stat-card clickable" onClick={() => setActiveTab('payments')}>
                                            <div className="pd-stat-icon yellow"><FaWallet /></div>
                                            <div className="pd-stat-value">{formatPrice(user.balance || 0)}</div>
                                            <div className="pd-stat-label">{t('profile.available_balance')}</div>
                                        </div>
                                    </>
                                )}
                            </div>

                            <div className="pd-section-card">
                                <h3 className="pd-section-title">{t('profile.bio', 'Bio')}</h3>
                                <p className="text-muted mb-0" style={{ fontSize: '0.9rem' }}>{user.bio || t('profile.no_bio', 'No bio added yet.')}</p>
                            </div>
                        </>
                    )}

                    {activeTab === 'profile_settings' && (
                        <div className="pd-section-card">
                            <h3 className="pd-section-title mb-3">{t('profile.profile_settings', 'Profile Settings')}</h3>
                            <EditProfileModal user={user} inline={true} onUpdate={updateUser} />
                        </div>
                    )}

                    {activeTab === 'listings' && mode === 'seller' && (
                        <div className="pd-listings-container">
                            <div className="d-flex justify-content-between align-items-center mb-3">
                                <h2 className="fw-bold m-0" style={{ fontSize: '1.2rem' }}>{t('user_menu.manage_listings', 'Manage Listings')} ({listingsTotalCount || 0})</h2>
                                <div className="d-flex gap-2 align-items-center">
                                    <div className={`pd-pagination-toggle-wrapper ${paginationMode === 'number' ? 'page-active' : ''}`}>
                                        <div className="pd-pagination-toggle-slider" />
                                        <div className={`pd-pagination-option ${paginationMode === 'scroll' ? 'active' : ''}`} onClick={() => { setPaginationMode('scroll'); setListingsPage(1); }}>Scroll</div>
                                        <div className={`pd-pagination-option ${paginationMode === 'number' ? 'active' : ''}`} onClick={() => { setPaginationMode('number'); setListingsPage(1); }}>Page</div>
                                    </div>
                                    <Link to="/sell" className="btn btn-primary btn-sm px-3">Add New Item</Link>
                                </div>
                            </div>

                            <div className="row g-4">
                                {myListings.length > 0 ? (
                                    myListings.map(item => (
                                        <div key={item._id} className="col-12 col-sm-6 col-lg-4">
                                            <ItemCard item={item} />
                                        </div>
                                    ))
                                ) : !listingsLoading && (
                                    <div className="col-12 text-center py-5 bg-white rounded-4 border border-dashed">
                                        <FaBoxOpen size={48} className="text-muted mb-3 opacity-25" />
                                        <p className="text-muted">You haven't listed anything yet.</p>
                                        <Link to="/sell" className="btn btn-link text-primary p-0">Start Selling Now</Link>
                                    </div>
                                )}
                            </div>

                            {paginationMode === 'scroll' && listingsPage < listingsTotalPages && (
                                <div className="text-center mt-5">
                                    <button className="btn btn-light btn-sm px-4 rounded-pill border" onClick={() => setListingsPage(p => p + 1)} disabled={listingsLoading}>
                                        {listingsLoading ? 'Loading...' : 'Load More'}
                                    </button>
                                </div>
                            )}

                            {paginationMode === 'number' && listingsTotalPages > 1 && (
                                <div className="d-flex justify-content-center align-items-center gap-3 mt-5">
                                    <button className="btn btn-outline-secondary btn-sm rounded-circle p-2" onClick={handlePrevPage} disabled={listingsPage === 1}><FaAngleLeft /></button>
                                    <span className="small text-muted fw-500">Page {listingsPage} of {listingsTotalPages}</span>
                                    <button className="btn btn-outline-secondary btn-sm rounded-circle p-2" onClick={handleNextPage} disabled={listingsPage === listingsTotalPages}><FaAngleRight /></button>
                                </div>
                            )}
                        </div>
                    )}

                    {activeTab === 'favorites' && mode === 'buyer' && (
                        <div className="pd-section-card">
                            <div className="d-flex justify-content-between align-items-center mb-3">
                                <h2 className="fw-bold m-0" style={{ fontSize: '1.2rem' }}>{t('profile.favorites')} ({favoritesTotalCount || 0})</h2>
                                <div className={`pd-pagination-toggle-wrapper ${paginationMode === 'number' ? 'page-active' : ''}`}>
                                    <div className="pd-pagination-toggle-slider" />
                                    <div className={`pd-pagination-option ${paginationMode === 'scroll' ? 'active' : ''}`} onClick={() => { setPaginationMode('scroll'); setFavoritesPage(1); }}>Scroll</div>
                                    <div className={`pd-pagination-option ${paginationMode === 'number' ? 'active' : ''}`} onClick={() => { setPaginationMode('number'); setFavoritesPage(1); }}>Page</div>
                                </div>
                            </div>

                            <div className="row g-4">
                                {favorites.length > 0 ? (
                                    favorites.map(item => (
                                        <div key={item._id} className="col-12 col-sm-6 col-lg-4">
                                            <ItemCard item={item} />
                                        </div>
                                    ))
                                ) : !favoritesLoading && (
                                    <div className="col-12 pd-empty-state-full" style={{ border: 'none', borderTop: 'none' }}>
                                        <svg width="130" height="130" viewBox="0 0 130 130" fill="none" xmlns="http://www.w3.org/2000/svg">
                                            <rect width="130" height="130" rx="65" fill="#FFF7ED" />
                                            <rect x="30" y="52" width="70" height="55" rx="8" fill="#FED7AA" stroke="#F97316" strokeWidth="2" />
                                            <path d="M48 52V44a17 17 0 0134 0v8" stroke="#F97316" strokeWidth="2.5" strokeLinecap="round" fill="none" />
                                            <path d="M65 68l2.5 5 5.5.8-4 3.9.95 5.5L65 80.5l-4.95 2.7.95-5.5-4-3.9 5.5-.8z" fill="#FB923C" stroke="#F97316" strokeWidth="1" />
                                            <path d="M88 32c0 0-6-4-6 2a3 3 0 006 0 3 3 0 006 0c0-6-6-2-6-2z" fill="#F43F5E" opacity="0.8" />
                                            <circle cx="38" cy="38" r="3" fill="#FDBA74" />
                                            <circle cx="92" cy="45" r="2" fill="#FCA5A5" />
                                        </svg>
                                        <h4 className="pd-empty-title">{t('profile.wishlist_empty', 'Your Wishlist is Empty')}</h4>
                                        <p className="pd-empty-text">Browse items and tap the heart icon to save your favourites here.</p>
                                        <Link to="/products" className="btn btn-sm px-4 rounded-pill" style={{ background: '#F97316', color: 'white', fontWeight: 600 }}>{t('home.explore_items', 'Browse Items')}</Link>
                                    </div>
                                )}
                            </div>

                            {paginationMode === 'scroll' && favoritesPage < favoritesTotalPages && (
                                <div className="text-center mt-5">
                                    <button className="btn btn-light btn-sm px-4 rounded-pill border" onClick={() => setFavoritesPage(p => p + 1)} disabled={favoritesLoading}>
                                        {favoritesLoading ? 'Loading...' : 'Load More'}
                                    </button>
                                </div>
                            )}

                            {paginationMode === 'number' && favoritesTotalPages > 1 && (
                                <div className="d-flex justify-content-center align-items-center gap-3 mt-5">
                                    <button className="btn btn-outline-secondary btn-sm rounded-circle p-2" onClick={handlePrevPage} disabled={favoritesPage === 1}><FaAngleLeft /></button>
                                    <span className="small text-muted fw-500">Page {favoritesPage} of {favoritesTotalPages}</span>
                                    <button className="btn btn-outline-secondary btn-sm rounded-circle p-2" onClick={handleNextPage} disabled={favoritesPage === favoritesTotalPages}><FaAngleRight /></button>
                                </div>
                            )}
                        </div>
                    )}

                    {activeTab === 'orders' && (
                        <div className="pd-orders-container">
                            <div className="d-flex justify-content-between align-items-center mb-4">
                                <h2 className="fw-bold m-0" style={{ fontSize: '1.2rem' }}>
                                    {mode === 'buyer' ? t('user_menu.my_orders', 'My Orders') : t('profile.orders_received', 'Orders Received')} ({filteredOrders.length})
                                </h2>
                                <div className="d-flex gap-2">
                                    <button className="btn btn-light btn-sm rounded-pill px-3 border" onClick={fetchMyOrders}>{t('profile.refresh', 'Refresh')}</button>
                                </div>
                            </div>

                            {ordersLoading ? (
                                <div className="text-center py-5">
                                    <div className="spinner-border text-primary" role="status"></div>
                                </div>
                            ) : filteredOrders.length > 0 ? (
                                <div className="pd-orders-grid">
                                    {filteredOrders.map(order => (
                                        <div
                                            key={order._id}
                                            className="pd-order-item-card"
                                            onClick={() => {
                                                setSelectedOrder(order);
                                                setShowOrderModal(true);
                                                setIsEditingAddress(false);
                                                checkExistingReview(order._id);
                                                setAddressForm({
                                                    full_name: order.shipping_address?.full_name || '',
                                                    address_line: order.shipping_address?.address_line || '',
                                                    city: order.shipping_address?.city || '',
                                                    state: order.shipping_address?.state || '',
                                                    pincode: order.shipping_address?.pincode || '',
                                                    phone: order.shipping_address?.phone || ''
                                                });
                                            }}
                                        >
                                            <div className="pd-oic-image-wrapper">
                                                <img
                                                    src={getItemImageUrl(order.item_id?.images?.[0])}
                                                    alt={order.item_id?.title}
                                                />
                                                <div className={`pd-oic-status-badge ${order.order_status || 'placed'}`}>
                                                    {getStatusLabel(order.order_status)}
                                                </div>
                                                {order.payment_status === 'paid' && (
                                                    <div className="pd-oic-payment-success">
                                                        <FaCheckCircle /> PAID
                                                    </div>
                                                )}
                                            </div>
                                            <div className="pd-oic-details">
                                                <div className="pd-oic-top">
                                                    <h3 className="pd-oic-title">{order.item_id?.title || 'Unknown Item'}</h3>
                                                    <span className="pd-oic-price">{formatPrice(order.total_amount)}</span>
                                                </div>
                                                <div className="pd-oic-meta">
                                                    <span className="pd-oic-num">#{order.order_number?.split('-')[1]}</span>
                                                    <span className="pd-oic-date">{new Date(order.created_at).toLocaleDateString()}</span>
                                                </div>
                                                <div className="pd-oic-participant small text-muted mb-2">
                                                    {mode === 'buyer' ? `${t('profile.seller', 'Seller')}: ${order.seller_id?.username}` : `${t('profile.buyer', 'Buyer')}: ${order.buyer_id?.username}`}
                                                </div>
                                                <button className="pd-oic-view-btn">{t('profile.view_tracking', 'View Tracking & Details')}</button>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            ) : (
                                <div className="pd-empty-state-full">
                                    <div className="pd-empty-icon-circle">
                                        <FaBoxOpen size={40} />
                                    </div>
                                    <h4 className="pd-empty-title">{mode === 'buyer' ? t('profile.no_purchases', 'No Purchases Yet') : t('profile.no_sales', 'No Sales Yet')}</h4>
                                    <p className="pd-empty-text">
                                        {mode === 'buyer'
                                            ? t('profile.no_purchases_text', 'Items you buy will appear here for tracking.')
                                            : t('profile.no_sales_text', 'Items you sell will appear here for management.')}
                                    </p>
                                    {mode === 'buyer' && (
                                        <Link to="/products" className="btn btn-primary px-4 rounded-pill">{t('home.start_shopping', 'Start Shopping')}</Link>
                                    )}
                                </div>
                            )}

                            {/* Order Detail Modal */}
                            {showOrderModal && selectedOrder && (
                                <div className="pd-modal-overlay" onClick={() => setShowOrderModal(false)}>
                                    <div className="pd-modal-content order-detail-modal" onClick={e => e.stopPropagation()}>
                                        <div className="d-flex justify-content-between align-items-start py-3 px-4 border-bottom">
                                            <div className="d-flex align-items-center gap-3">
                                                <div className="modal-icon-bg"><FaTruck /></div>
                                                <div>
                                                    <h3 className="m-0 h5 fw-bold">{t('profile.order_details', 'Order Details')}</h3>
                                                    <p className="mb-0 text-muted small">#{selectedOrder.order_number}</p>
                                                </div>
                                            </div>
                                            <button className="btn-close mt-1" onClick={() => setShowOrderModal(false)}></button>
                                        </div>
                                        <div className="pd-modal-body p-4">
                                            <div className="order-detail-grid">
                                                <div className="order-detail-main">
                                                    <div className="order-tracker-container">
                                                        <h4 className="detail-section-title">{t('profile.delivery_progress', 'Delivery Progress')}</h4>
                                                        <div className="order-tracker">
                                                            <div className={`tracker-step ${['placed', 'dispatched', 'on_the_way', 'delivered'].includes(selectedOrder.order_status) ? 'completed' : ''}`}>
                                                                <div className="tracker-dot"></div>
                                                                <div className="tracker-label">{t('profile.booked', 'Booked')}</div>
                                                            </div>
                                                            <div className={`tracker-step ${['dispatched', 'on_the_way', 'delivered'].includes(selectedOrder.order_status) ? 'completed' : ''}`}>
                                                                <div className="tracker-dot"></div>
                                                                <div className="tracker-label">{t('profile.dispatched', 'Dispatched')}</div>
                                                            </div>
                                                            <div className={`tracker-step ${['on_the_way', 'delivered'].includes(selectedOrder.order_status) ? 'completed' : ''}`}>
                                                                <div className="tracker-dot"></div>
                                                                <div className="tracker-label">{t('profile.on_the_way', 'On the way')}</div>
                                                            </div>
                                                            <div className={`tracker-step ${selectedOrder.order_status === 'delivered' ? 'completed' : ''}`}>
                                                                <div className="tracker-dot"></div>
                                                                <div className="tracker-label">{t('profile.delivered', 'Delivered')}</div>
                                                            </div>
                                                            <div className="tracker-line-bg"></div>
                                                            <div className="tracker-line-fill" data-status={selectedOrder.order_status || 'placed'}></div>
                                                        </div>
                                                    </div>

                                                    <div className="detail-section mt-5">
                                                        <div className="d-flex align-items-center justify-content-between mb-3">
                                                            <div className="d-flex align-items-center gap-2">
                                                                <FaTruck className="text-primary" />
                                                                <h4 className="detail-section-title mb-0">{t('profile.shipping_address', 'Shipping Address')}</h4>
                                                            </div>
                                                            {mode === 'buyer' && !['dispatched', 'on_the_way', 'delivered', 'cancelled'].includes(selectedOrder.order_status) && !isEditingAddress && (
                                                                <button
                                                                    className="btn btn-link btn-sm text-primary p-0 text-decoration-none"
                                                                    style={{ fontSize: '0.8rem', fontWeight: 'bold' }}
                                                                    onClick={() => setIsEditingAddress(true)}
                                                                >
                                                                    {t('profile.change', 'Change')}
                                                                </button>
                                                            )}
                                                        </div>

                                                        {isEditingAddress ? (
                                                            <form onSubmit={handleAddressUpdate} className="pd-address-edit-form">
                                                                <div className="row g-2">
                                                                    <div className="col-12">
                                                                        <input
                                                                            type="text"
                                                                            className="form-control form-control-sm"
                                                                            placeholder={t('profile.full_name', 'Full Name')}
                                                                            value={addressForm.full_name}
                                                                            onChange={(e) => setAddressForm({ ...addressForm, full_name: e.target.value })}
                                                                            required
                                                                        />
                                                                    </div>
                                                                    <div className="col-12">
                                                                        <input
                                                                            type="text"
                                                                            className="form-control form-control-sm"
                                                                            placeholder={t('profile.address_line', 'Address Line')}
                                                                            value={addressForm.address_line}
                                                                            onChange={(e) => setAddressForm({ ...addressForm, address_line: e.target.value })}
                                                                            required
                                                                        />
                                                                    </div>
                                                                    <div className="col-6">
                                                                        <input
                                                                            type="text"
                                                                            className="form-control form-control-sm"
                                                                            placeholder={t('profile.city', 'City')}
                                                                            value={addressForm.city}
                                                                            onChange={(e) => setAddressForm({ ...addressForm, city: e.target.value })}
                                                                            required
                                                                        />
                                                                    </div>
                                                                    <div className="col-6">
                                                                        <input
                                                                            type="text"
                                                                            className="form-control form-control-sm"
                                                                            placeholder={t('profile.pincode', 'Pincode')}
                                                                            value={addressForm.pincode}
                                                                            onChange={(e) => setAddressForm({ ...addressForm, pincode: e.target.value })}
                                                                            required
                                                                        />
                                                                    </div>
                                                                    <div className="col-12">
                                                                        <input
                                                                            type="text"
                                                                            className="form-control form-control-sm"
                                                                            placeholder={t('profile.phone', 'Phone')}
                                                                            value={addressForm.phone}
                                                                            onChange={(e) => setAddressForm({ ...addressForm, phone: e.target.value })}
                                                                            required
                                                                        />
                                                                    </div>
                                                                </div>
                                                                <div className="d-flex gap-2 mt-3">
                                                                    <button type="submit" className="btn btn-primary btn-sm px-3">{t('profile.save', 'Save')}</button>
                                                                    <button type="button" className="btn btn-light btn-sm px-3 border" onClick={() => setIsEditingAddress(false)}>{t('common.cancel', 'Cancel')}</button>
                                                                </div>
                                                            </form>
                                                        ) : (
                                                            <div className="detail-address-card">
                                                                <p className="fw-bold mb-1 text-dark">{selectedOrder.shipping_address?.full_name}</p>
                                                                <p className="mb-1">{selectedOrder.shipping_address?.address_line}</p>
                                                                <p className="mb-1">{selectedOrder.shipping_address?.city}, {selectedOrder.shipping_address?.state} {selectedOrder.shipping_address?.pincode}</p>
                                                                <div className="mt-3 pt-3 border-top d-flex align-items-center gap-2 text-muted small">
                                                                    <FaClock /> {t('profile.phone', 'Phone')}: {selectedOrder.shipping_address?.phone}
                                                                </div>
                                                            </div>
                                                        )}
                                                    </div>
                                                </div>

                                                <div className="order-detail-side">
                                                    <div className="detail-payment-card mb-3">
                                                        <h4 className="detail-section-title">{t('profile.payment_summary', 'Payment Summary')}</h4>
                                                        <div className="payment-row">
                                                            <span>{t('profile.method', 'Method')}</span>
                                                            <span className="badge bg-light text-dark border">{selectedOrder.payment_method?.toUpperCase()}</span>
                                                        </div>
                                                        <div className="payment-row">
                                                            <span>{t('profile.status', 'Status')}</span>
                                                            <span className={`status-pill ${selectedOrder.payment_status}`}>
                                                                {selectedOrder.payment_status === 'paid' ? <FaCheckCircle /> : <FaClock />}
                                                                {selectedOrder.payment_status?.toUpperCase()}
                                                            </span>
                                                        </div>
                                                        <div className="payment-row">
                                                            <span>{t('profile.order_status', 'Order Status')}</span>
                                                            <span className={`status-pill ${selectedOrder.order_status}`}>
                                                                {getStatusLabel(selectedOrder.order_status)}
                                                            </span>
                                                        </div>
                                                        <div className="payment-row mt-3 border-top pt-3 total">
                                                            <span>{t('profile.paid_total', 'Paid Total')}</span>
                                                            <span>{formatPrice(selectedOrder.total_amount)}</span>
                                                        </div>
                                                    </div>

                                                    <div className="detail-item-info-box">
                                                        <h4 className="detail-section-title mb-3">{t('profile.purchased_item', 'Purchased Item')}</h4>
                                                        <div className="d-flex gap-3">
                                                            <img className="rounded shadow-sm" style={{ width: '60px', height: '60px', objectFit: 'cover' }} src={getItemImageUrl(selectedOrder.item_id?.images?.[0])} alt="" />
                                                            <div>
                                                                <p className="fw-bold small mb-1">{selectedOrder.item_id?.title}</p>
                                                                <p className="text-muted extra-small mb-0">
                                                                    {mode === 'buyer' ? `${t('profile.sold_by', 'Sold by:')} ${selectedOrder.seller_id?.username}` : `${t('profile.bought_by', 'Bought by:')} ${selectedOrder.buyer_id?.username}`}
                                                                </p>
                                                            </div>
                                                        </div>
                                                    </div>

                                                    {mode === 'buyer' && selectedOrder.order_status === 'placed' && (
                                                        <div className="pd-section-card mt-3 p-3 bg-light border">
                                                            <h3 className="detail-section-title mb-3">{t('profile.order_actions', 'Order Actions')}</h3>
                                                            <div className="d-grid gap-2">
                                                                <button className="btn btn-outline-danger btn-sm fw-bold" onClick={handleCancelOrder}>{t('profile.cancel_order_refund', 'Cancel Order & Refund')}</button>
                                                            </div>
                                                            <p className="text-muted extra-small mt-2 mb-0">{t('profile.cancel_order_hint', 'Cancel before seller dispatches to get an instant refund.')}</p>
                                                        </div>
                                                    )}

                                                    {mode === 'buyer' && selectedOrder.order_status === 'delivered' && (
                                                        <div className="pd-section-card mt-3 p-3 bg-light border">
                                                            <h3 className="detail-section-title mb-3">Request Return</h3>
                                                            <p className="text-muted extra-small mt-0 mb-3">You have 5 days from delivery to request a return if the item is not as described.</p>
                                                            <div className="d-grid gap-2">
                                                                <button className="btn btn-outline-warning btn-sm fw-bold" onClick={handleRequestReturn}>Request Return</button>
                                                            </div>
                                                        </div>
                                                    )}

                                                    {mode === 'seller' && selectedOrder.order_status === 'return_requested' && (
                                                        <div className="pd-section-card mt-3 p-3 bg-light border">
                                                            <h4 className="detail-section-title mb-3">Process Return</h4>
                                                            <div className="alert alert-warning mb-3" style={{ fontSize: '0.85rem' }}>
                                                                <strong>Reason:</strong> {selectedOrder.return_reason || 'No reason provided'}
                                                            </div>
                                                            <p className="text-muted extra-small mt-0 mb-3">Inspect the returned product. You can issue a partial refund (e.g. deduct shipping costs) or a full refund.</p>
                                                            <div className="d-grid gap-2">
                                                                <button className="btn btn-success btn-sm" onClick={() => handleProcessReturn('full')}>Issue Full Refund</button>
                                                                <button className="btn btn-warning btn-sm" onClick={() => handleProcessReturn('partial')}>Issue Partial Refund</button>
                                                            </div>
                                                        </div>
                                                    )}

                                                    {mode === 'seller' && selectedOrder.order_status !== 'delivered' && selectedOrder.order_status !== 'cancelled' && selectedOrder.order_status !== 'return_requested' && selectedOrder.order_status !== 'returned' && (
                                                        <div className="pd-section-card mt-3 p-3 bg-light border">
                                                            <h4 className="detail-section-title mb-3">{t('profile.update_order_status', 'Update Order Status')}</h4>
                                                            <div className="d-grid gap-2">
                                                                {selectedOrder.order_status === 'placed' && (
                                                                    <button className="btn btn-primary btn-sm" onClick={() => handleStatusUpdate('dispatched')}>{t('profile.mark_as_dispatched', 'Mark as Dispatched')}</button>
                                                                )}
                                                                {selectedOrder.order_status === 'dispatched' && (
                                                                    <button className="btn btn-primary btn-sm" onClick={() => handleStatusUpdate('on_the_way')}>{t('profile.mark_as_on_the_way', 'Mark as On the way')}</button>
                                                                )}
                                                                {selectedOrder.order_status === 'on_the_way' && (
                                                                    <button className="btn btn-success btn-sm" onClick={() => handleStatusUpdate('delivered')}>{t('profile.mark_as_delivered', 'Mark as Delivered')}</button>
                                                                )}
                                                                <button className="btn btn-outline-danger btn-sm mt-1" onClick={() => handleStatusUpdate('cancelled')}>{t('profile.cancel_order', 'Cancel Order')}</button>
                                                            </div>
                                                        </div>
                                                    )}

                                                    {mode === 'buyer' && selectedOrder.order_status === 'delivered' && (
                                                        <div className="pd-review-section mt-3">
                                                            <h4 className="detail-section-title mb-2">
                                                                <FaStar className="text-warning me-2" />
                                                                {t('profile.rate_your_experience', 'Rate Your Experience')}
                                                            </h4>
                                                            <p className="text-muted extra-small mb-3">
                                                                {t('profile.rate_hint', 'Honest reviews help other buyers trust sellers. All items here are pre-owned — your feedback matters!')}
                                                            </p>

                                                            {existingReview ? (
                                                                <div className="pd-review-existing">
                                                                    <div className="pd-review-stars mb-2">
                                                                        {[1, 2, 3, 4, 5].map(star => (
                                                                            <FaStar
                                                                                key={star}
                                                                                className={star <= existingReview.rating ? 'star-filled' : 'star-empty'}
                                                                            />
                                                                        ))}
                                                                        <span className="ms-2 fw-bold">{existingReview.rating}/5</span>
                                                                    </div>
                                                                    {existingReview.comment && (
                                                                        <p className="pd-review-comment">"{existingReview.comment}"</p>
                                                                    )}
                                                                    <p className="text-success extra-small fw-bold mb-0">
                                                                        <FaCheckCircle className="me-1" /> {t('profile.review_submitted', 'Review submitted')}
                                                                    </p>
                                                                </div>
                                                            ) : (
                                                                <div className="pd-review-form">
                                                                    <div className="pd-review-stars-input mb-3">
                                                                        {[1, 2, 3, 4, 5].map(star => (
                                                                            <FaStar
                                                                                key={star}
                                                                                className={star <= (reviewHover || reviewRating) ? 'star-filled' : 'star-empty'}
                                                                                onClick={() => setReviewRating(star)}
                                                                                onMouseEnter={() => setReviewHover(star)}
                                                                                onMouseLeave={() => setReviewHover(0)}
                                                                                style={{ cursor: 'pointer' }}
                                                                            />
                                                                        ))}
                                                                        {reviewRating > 0 && (
                                                                            <span className="ms-2 fw-bold small">{reviewRating}/5</span>
                                                                        )}
                                                                    </div>
                                                                    <textarea
                                                                        className="form-control form-control-sm mb-3"
                                                                        rows="3"
                                                                        placeholder={t('profile.review_placeholder', 'How was the product? Was the seller trustworthy? Share your experience...')}
                                                                        value={reviewComment}
                                                                        onChange={(e) => setReviewComment(e.target.value)}
                                                                    />
                                                                    <button
                                                                        className="btn btn-warning btn-sm w-100 fw-bold"
                                                                        onClick={handleSubmitReview}
                                                                        disabled={reviewSubmitting || reviewRating === 0}
                                                                    >
                                                                        {reviewSubmitting ? t('common.saving', 'Submitting...') : t('profile.submit_review', '⭐ Submit Review')}
                                                                    </button>
                                                                </div>
                                                            )}
                                                        </div>
                                                    )}

                                                    <button className="btn btn-primary w-100 mt-4 py-2 fw-bold" onClick={() => navigate('/messages')}>
                                                        <FaEnvelope className="me-2" /> {mode === 'buyer' ? t('profile.message_seller', 'Message Seller') : t('profile.message_buyer', 'Message Buyer')}
                                                    </button>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            )}
                        </div>
                    )}

                    {activeTab === 'messages' && (
                        <div className="p-0">
                            <MessagesContent />
                        </div>
                    )}

                    {activeTab === 'notifications' && (
                        <div className="p-0">
                            <NotificationsContent />
                        </div>
                    )}

                    {activeTab === 'payments' && (
                        <div className="p-0">
                            <WalletContent activeSubTab={paymentSubTab} />
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default Profile;
