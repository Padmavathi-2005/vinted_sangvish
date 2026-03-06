import React, { useState, useEffect, useContext, useRef } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import axios from '../utils/axios';
import {
    FaHeart, FaRegHeart, FaChevronLeft, FaChevronRight,
    FaStar, FaShieldAlt, FaTruck, FaUndo,
    FaBoxOpen,
    FaUser, FaCalendarAlt, FaEye, FaMapMarkerAlt,
    FaRegFlag, FaCommentDots, FaHandshake,
    FaShoppingBag, FaTimes, FaClock, FaStarHalfAlt, FaRegStar,
    FaShareAlt, FaSearchPlus, FaShoppingCart, FaEdit, FaEnvelope,
    FaTag, FaRuler, FaPalette, FaBoxes, FaList, FaBolt,
    FaEyeSlash, FaCheckCircle
} from 'react-icons/fa';
import { useTranslation } from 'react-i18next';
import AuthContext from '../context/AuthContext';
import WishlistContext from '../context/WishlistContext';
import CurrencyContext from '../context/CurrencyContext';
import CartContext from '../context/CartContext';
import ItemCard from '../components/common/ItemCard';
import { usePopup } from '../components/common/Popup';
import '../styles/ItemDetail.css';
import { getImageUrl, getItemImageUrl } from '../utils/constants';

const RECENTLY_VIEWED_KEY = 'vinted_recently_viewed';
const MAX_RECENT = 12;

const addToRecentlyViewed = (itemId) => {
    try {
        let list = JSON.parse(localStorage.getItem(RECENTLY_VIEWED_KEY) || '[]');
        list = list.filter(id => id !== itemId);
        list.unshift(itemId);
        if (list.length > MAX_RECENT) list = list.slice(0, MAX_RECENT);
        localStorage.setItem(RECENTLY_VIEWED_KEY, JSON.stringify(list));
    } catch { /* silent */ }
};

const getRecentlyViewedIds = (excludeId) => {
    try {
        const list = JSON.parse(localStorage.getItem(RECENTLY_VIEWED_KEY) || '[]');
        return list.filter(id => id !== excludeId);
    } catch { return []; }
};

const conditionConfig = {
    'New': { label: 'New', color: '#16a34a', bg: '#f0fdf4' },
    'Very Good': { label: 'Very Good', color: '#0ea5e9', bg: '#f0f9ff' },
    'Good': { label: 'Good', color: '#f59e0b', bg: '#fffbeb' },
    'Normal': { label: 'Normal', color: '#f97316', bg: '#fff7ed' },
    'Bad': { label: 'Bad', color: '#ef4444', bg: '#fef2f2' },
    'Very Bad': { label: 'Very Bad', color: '#dc2626', bg: '#fef2f2' },
};

const ItemDetail = () => {
    const { id } = useParams();
    const navigate = useNavigate();
    const { user, login } = useContext(AuthContext);
    const { isWishlisted, addToWishlist, removeFromWishlist } = useContext(WishlistContext);
    const { formatPrice } = useContext(CurrencyContext);
    const { addToCart, isInCart } = useContext(CartContext);
    const { showPopup, PopupComponent } = usePopup();
    const { t } = useTranslation();

    const [item, setItem] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [activeImg, setActiveImg] = useState(0);
    const [lightbox, setLightbox] = useState(false);
    const [lightboxZoom, setLightboxZoom] = useState(false);
    const [zoomPos, setZoomPos] = useState({ x: 50, y: 50 });
    const [similarItems, setSimilarItems] = useState([]);
    const [recentItems, setRecentItems] = useState([]);
    const [offerModal, setOfferModal] = useState(false);
    const [offerAmount, setOfferAmount] = useState('');
    const [offerMsg, setOfferMsg] = useState('');
    const [offerSending, setOfferSending] = useState(false);
    const [hoveredSide, setHoveredSide] = useState(null);
    const [shareModal, setShareModal] = useState(false);

    // Login popup state
    const [loginPopup, setLoginPopup] = useState(false);
    const [loginEmail, setLoginEmail] = useState('');
    const [loginPassword, setLoginPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [loginError, setLoginError] = useState('');
    const [loginLoading, setLoginLoading] = useState(false);
    const [loginAction, setLoginAction] = useState('');

    const similarRef = useRef(null);
    const recentRef = useRef(null);

    // Fetch item
    useEffect(() => {
        const fetchItem = async () => {
            try {
                setLoading(true);
                setActiveImg(0);
                setHoveredSide(null);
                const res = await axios.get(`/api/items/${id}`);
                setItem(res.data);
                addToRecentlyViewed(id);
            } catch (err) {
                setError(err.response?.data?.message || 'Item not found.');
            } finally {
                setLoading(false);
            }
        };
        fetchItem();
    }, [id]);

    // Fetch similar items
    useEffect(() => {
        if (!item) return;
        axios.get(`/api/items/${id}/similar`)
            .then(res => setSimilarItems(res.data))
            .catch(() => setSimilarItems([]));
    }, [item, id]);

    // Fetch recently viewed
    useEffect(() => {
        const recentIds = getRecentlyViewedIds(id);
        if (recentIds.length === 0) { setRecentItems([]); return; }
        Promise.all(
            recentIds.slice(0, 8).map(rid =>
                axios.get(`/api/items/${rid}`).then(r => r.data).catch(() => null)
            )
        ).then(items => setRecentItems(items.filter(Boolean)));
    }, [id]);

    const getImageSrc = (path) =>
        getItemImageUrl(path);

    const images = item?.images?.length > 0
        ? item.images
        : [''];

    const displayedImg = hoveredSide !== null ? hoveredSide : activeImg;
    const isLiked = isWishlisted(id);

    // Guard: require login, open popup instead of redirect
    const requireLogin = (action) => {
        if (!user) {
            setLoginAction(action);
            setLoginError('');
            setLoginEmail('');
            setLoginPassword('');
            setLoginPopup(true);
            return false;
        }
        return true;
    };

    const handleWishlistToggle = (e) => {
        if (e) { e.preventDefault(); e.stopPropagation(); }
        if (!requireLogin('wishlist')) return;
        if (isLiked) {
            removeFromWishlist(id);
            if (item) setItem({ ...item, likes_count: (item.likes_count || 1) - 1 });
        } else {
            addToWishlist(id);
            if (item) setItem({ ...item, likes_count: (item.likes_count || 0) + 1 });
        }
    };

    const handleBuyNow = () => {
        if (!requireLogin('buy')) return;
        // Add to cart (selected) then go to checkout
        if (item && !isInCart(item._id)) addToCart({ ...item, selected: true });
        navigate('/checkout');
    };

    const handleAddToCart = () => {
        if (!requireLogin('cart')) return;
        if (isInCart(item._id)) {
            showPopup({ type: 'info', title: 'Already in Cart', message: 'This item is already in your cart.', });
            return;
        }
        addToCart({ ...item, selected: true });
        showPopup({
            type: 'success',
            title: 'Added to Cart!',
            message: `"${item.title}" has been added to your cart.`,
        });
    };

    const handleMessage = () => {
        if (!requireLogin('message')) return;
        const sellerId = item.seller_id?._id;
        if (!sellerId) return;
        if ((user.id || user._id) === sellerId) {
            showPopup({ type: 'warning', title: 'Own Item', message: 'You cannot message yourself about your own item.' });
            return;
        }
        navigate(`/profile?tab=messages&user=${sellerId}`);
    };

    const handleMakeOffer = async () => {
        if (!requireLogin('offer')) return;
        if (!offerAmount || parseFloat(offerAmount) <= 0) return;
        setOfferSending(true);
        try {
            const msg = `💰 Offer: ${formatPrice(parseFloat(offerAmount), item.currency_id)}${offerMsg ? `\n\n${offerMsg}` : ''}`;
            const res = await axios.post('/api/messages', {
                receiver_id: item.seller_id?._id,
                message: msg,
                item_id: item._id
            });
            const convId = res.data.conversation?._id || res.data.conversation_id || res.data._id;
            setOfferModal(false);
            setOfferAmount('');
            setOfferMsg('');
            navigate(`/profile?tab=messages&conversation=${convId}`);
        } catch (err) {
            alert(err.response?.data?.message || 'Failed to send offer.');
        } finally {
            setOfferSending(false);
        }
    };

    const handleLoginSubmit = async (e) => {
        e.preventDefault();
        setLoginLoading(true);
        setLoginError('');
        try {
            const res = await axios.post('/api/users/login', {
                email: loginEmail,
                password: loginPassword
            });
            // The response data IS the user object (with token inside)
            const userData = res.data;
            if (!userData || !userData.token) {
                throw new Error('Invalid response from server');
            }
            // Use AuthContext login — stores in localStorage and updates React state
            login(userData, true);
            setLoginPopup(false);
            setLoginEmail('');
            setLoginPassword('');
        } catch (err) {
            setLoginError(err.response?.data?.message || err.message || 'Login failed. Please try again.');
        } finally {
            setLoginLoading(false);
        }
    };

    const handleLightboxMouseMove = (e) => {
        if (!lightboxZoom) return;
        const rect = e.currentTarget.getBoundingClientRect();
        const x = ((e.clientX - rect.left) / rect.width) * 100;
        const y = ((e.clientY - rect.top) / rect.height) * 100;
        setZoomPos({ x, y });
    };

    const renderStars = (rating, count) => {
        const score = rating || 0;
        const stars = [];
        for (let i = 1; i <= 5; i++) {
            if (score >= i) stars.push(<FaStar key={i} className="star-filled" />);
            else if (score >= i - 0.5) stars.push(<FaStarHalfAlt key={i} className="star-filled" />);
            else stars.push(<FaRegStar key={i} className="star-empty" />);
        }
        return (
            <div className="id-seller-stars">
                {stars}
                <span>({count || 0} {(count || 0) === 1 ? t('item_detail.review') : t('item_detail.reviews')})</span>
            </div>
        );
    };

    const scrollRef = (ref, dir) => {
        if (ref.current) ref.current.scrollBy({ left: dir * 300, behavior: 'smooth' });
    };

    const handleThumbClick = (idx) => {
        setActiveImg(idx);
        setHoveredSide(null);
    };

    if (loading) {
        return (
            <div className="id-loading">
                <div className="id-spinner" />
                <p>{t('item_detail.loading_item')}</p>
            </div>
        );
    }

    if (error || !item) {
        return (
            <div className="id-error-page">
                <div className="id-error-card">
                    <FaBoxOpen className="id-error-icon" />
                    <h2>{t('item_detail.item_not_found')}</h2>
                    <p>{error || t('item_detail.item_not_found_desc')}</p>
                    <Link to="/products" className="id-btn-primary">{t('item_detail.browse_other')}</Link>
                </div>
            </div>
        );
    }

    const seller = item.seller_id;
    const condCfg = conditionConfig[item.condition] || { label: item.condition, color: '#6b7280', bg: '#f8fafc' };
    const condLabel = item.condition ? t(`sell_item.condition_options.${item.condition.replace(/ /g, '')}`, { defaultValue: condCfg.label }) : condCfg.label;
    const memberSinceYear = seller?.created_at ? new Date(seller.created_at).getFullYear() : 'N/A';
    const isOwnItem = user && (user.id === seller?._id || user._id === seller?._id);
    const sideImages = images.length > 1 ? images : [];

    // Build details rows
    const detailRows = [
        item.condition && {
            icon: <FaBolt />, label: t('item_detail.condition'),
            value: (
                <span className="id-condition-chip" style={{ color: condCfg.color, borderColor: condCfg.color, background: condCfg.bg }}>
                    {condLabel}
                </span>
            )
        },
        item.brand && { icon: <FaTag />, label: t('item_detail.brand'), value: item.brand },
        item.size && { icon: <FaRuler />, label: t('item_detail.size'), value: item.size },
        item.color && {
            icon: <FaPalette />, label: t('item_detail.color'),
            value: (
                <span className="id-color-inline">
                    <span className="id-color-dot" style={{ backgroundColor: item.color.toLowerCase() }} />
                    {item.color}
                </span>
            )
        },
        item.category_id && { icon: <FaList />, label: t('item_detail.category'), value: item.category_id.name },
        item.subcategory_id && { icon: <FaList />, label: t('item_detail.subcategory'), value: item.subcategory_id.name },
        item.item_type_id && { icon: <FaBoxes />, label: t('item_detail.type'), value: item.item_type_id.name },
        ...(item.attributes || []).map(attr => ({ icon: <FaTag />, label: attr.key, value: attr.value })),
    ].filter(Boolean);

    return (
        <div className="id-page">
            <div className="id-container">
                {/* Breadcrumb */}
                <div className="id-breadcrumb" style={{ gridColumn: '1 / -1' }}>
                    <nav className="id-crumbs">
                        <Link to="/">{t('item_detail.home')}</Link>
                        {item.category_id && <><span className="id-crumb-sep">/</span> <Link to={`/products?category=${item.category_id.slug}`}>{item.category_id.name}</Link></>}
                        {item.subcategory_id && <><span className="id-crumb-sep">/</span> <Link to={`/products?subcategory=${item.subcategory_id.slug}`}>{item.subcategory_id.name}</Link></>}
                        <span className="id-crumb-sep">/</span>
                        <span className="id-crumb-current">{item.title}</span>
                    </nav>
                </div>

                <div className="id-main-content-grid">
                    {/* ─── Left Column: Gallery ─── */}
                    <div className="id-gallery-col">
                        <div className="id-gallery-layout">
                            {/* Main Image */}
                            <div className="id-main-img-wrapper" onClick={() => setLightbox(true)}>
                                <img src={getImageSrc(images[displayedImg])} alt={item.title} className="id-main-img" />
                                <div className="id-condition-badge" style={{ backgroundColor: condCfg.color }}>{condLabel}</div>
                                <div className="id-zoom-hint"><FaSearchPlus /> {t('item_detail.click_zoom')}</div>

                                {/* Overlay: Stats */}
                                <div className="id-img-overlay-stats" onClick={e => e.stopPropagation()}>
                                    {item.views_count > 0 && <span className="id-overlay-chip"><FaEye /> {item.views_count}</span>}
                                    {item.likes_count > 0 && <span className="id-overlay-chip"><FaHeart /> {item.likes_count}</span>}
                                </div>

                                {/* Overlay: Actions */}
                                <div className="id-img-overlay-actions" onClick={e => e.stopPropagation()}>
                                    <button
                                        className={`id-overlay-btn ${isLiked ? 'liked' : ''}`}
                                        onClick={handleWishlistToggle}
                                        title={isLiked ? 'Remove from wishlist' : 'Add to wishlist'}
                                    >
                                        {isLiked ? <FaHeart /> : <FaRegHeart />}
                                    </button>
                                    <button className="id-overlay-btn" onClick={() => setShareModal(true)} title="Share">
                                        <FaShareAlt />
                                    </button>
                                    <button className="id-overlay-btn" title="Report">
                                        <FaRegFlag />
                                    </button>
                                </div>
                            </div>

                            {/* Side strip */}
                            {sideImages.length > 0 && (
                                <div className="id-side-strip">
                                    {sideImages.map((img, idx) => {
                                        return (
                                            <div
                                                key={idx}
                                                className={`id-side-img-wrapper ${idx === displayedImg ? 'active' : ''}`}
                                                onMouseEnter={() => setHoveredSide(idx)}
                                                onMouseLeave={() => setHoveredSide(null)}
                                                onClick={() => handleThumbClick(idx)}
                                            >
                                                <img src={getImageSrc(img)} alt={`View ${idx + 1}`} className="id-side-img" />
                                                <div className="id-thumb-overlay"><span>{idx + 1}</span></div>
                                            </div>
                                        );
                                    })}
                                </div>
                            )}
                        </div>

                        {/* Trust Badges */}
                        <div className="id-trust-row">
                            <div className="id-trust-item">
                                <FaShieldAlt className="id-trust-icon" />
                                <span>{t('item_detail.buyer_protection')}</span>
                            </div>
                            <div className="id-trust-item">
                                <FaTruck className="id-trust-icon" />
                                <span>{t('item_detail.secure_shipping')}</span>
                            </div>
                            <div className="id-trust-item">
                                <FaUndo className="id-trust-icon" />
                                <span>{t('item_detail.easy_returns')}</span>
                            </div>
                        </div>
                    </div>

                    {/* ─── Right Column ─── */}
                    <div className="id-info-col">
                        {/* PRICE SECTION — FIRST */}
                        <div className="id-price-card">
                            <h1 className="id-item-title">{item.title}</h1>
                            <div className="id-price-row">
                                <div className="id-price">{formatPrice(item.price, item.currency_id)}</div>
                                {item.negotiable && (
                                    <span className="id-negotiable-badge">
                                        <FaHandshake /> {t('item_detail.negotiable')}
                                    </span>
                                )}
                            </div>
                            {/* Shipping info */}
                            <div className="id-shipping-info">
                                {item.shipping_included ? (
                                    <span className="id-ship-free"><FaTruck /> {t('item_detail.shipping_included')}</span>
                                ) : (
                                    <span className="id-ship-paid"><FaTruck /> {t('item_detail.shipping_est')}</span>
                                )}
                            </div>
                            <p className="id-price-sub">{t('item_detail.buyer_fee_apply')}</p>
                        </div>

                        {/* DETAILS BOX */}
                        {detailRows.length > 0 && (
                            <div className="id-details-box">
                                <h3 className="id-box-title">{t('item_detail.item_details')}</h3>
                                <div className="id-details-list">
                                    {detailRows.map((row, i) => (
                                        <div key={i} className="id-detail-row">
                                            <span className="id-detail-label">
                                                <span className="id-detail-icon">{row.icon}</span>
                                                {row.label}
                                            </span>
                                            <span className="id-detail-colon">:</span>
                                            <span className="id-detail-value">{row.value}</span>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}

                        {/* DESCRIPTION */}
                        {item.description && (
                            <div className="id-desc-box">
                                <h3 className="id-box-title">{t('item_detail.description')}</h3>
                                <p className="id-description">{item.description}</p>
                            </div>
                        )}

                        {isOwnItem ? (
                            <Link to={`/profile?tab=listings`} className="id-btn-edit-item">
                                <FaEdit /> {t('item_detail.manage_listing')}
                            </Link>
                        ) : (
                            <div className={`id-cta-group${!item.negotiable ? ' no-offer' : ''}`}>
                                {/* Row 1: Buy Now */}
                                <button className="id-btn-buy" style={{ gridColumn: '1 / -1' }} onClick={handleBuyNow}>
                                    <FaShoppingBag /> {t('item_detail.buy_now')}
                                </button>
                                {/* Row 2: Cart + Offer */}
                                {isInCart(item._id) ? (
                                    <Link to="/cart" className="id-btn-in-cart">
                                        <FaCheckCircle /> {t('item_detail.in_cart')}
                                    </Link>
                                ) : (
                                    <button className="id-btn-cart" onClick={handleAddToCart}>
                                        <FaShoppingCart /> {t('item_detail.add_to_cart')}
                                    </button>
                                )}
                                {item.negotiable && (
                                    <button className="id-btn-offer" onClick={() => {
                                        if (!requireLogin('offer')) return;
                                        setOfferModal(true);
                                    }}>
                                        <FaHandshake /> {t('item_detail.make_offer')}
                                    </button>
                                )}
                                {/* Row 3: Message Seller (full width) */}
                                <button
                                    className="id-btn-message-cta"
                                    style={{ gridColumn: '1 / -1' }}
                                    onClick={handleMessage}
                                >
                                    <FaCommentDots /> {t('item_detail.message_seller')}
                                </button>
                            </div>
                        )}

                        {/* SELLER BOX */}
                        {seller && (
                            <div className="id-seller-box">
                                <h3 className="id-box-title">{t('item_detail.seller')}</h3>
                                <div className="id-seller-top">
                                    <Link to={`/seller/${seller._id}`} className="id-seller-avatar-link">
                                        <div className="id-seller-avatar">
                                            {seller.profile_image ? (
                                                <img src={getImageSrc(seller.profile_image)} alt={seller.username} />
                                            ) : (
                                                <div className="id-seller-avatar-placeholder">
                                                    {(seller.username || 'U').charAt(0).toUpperCase()}
                                                </div>
                                            )}
                                        </div>
                                    </Link>
                                    <div className="id-seller-info">
                                        <Link to={`/seller/${seller._id}`} className="id-seller-name-link">
                                            <h4 className="id-seller-name">{seller.username}</h4>
                                        </Link>
                                        <p className="id-seller-since">
                                            <FaCalendarAlt /> {t('item_detail.member_since')} {memberSinceYear}
                                        </p>
                                        {renderStars(seller.rating_avg, seller.rating_count)}
                                    </div>
                                    <Link to={`/seller/${seller._id}`} className="id-btn-view-profile">
                                        <FaUser /> {t('item_detail.view_profile')}
                                    </Link>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {/* ─── Similar Products ─── */}
            {similarItems.length > 0 && (
                <div className="id-section-below">
                    <div className="id-section-header">
                        <div>
                            <h2 className="id-section-title" style={{ color: 'var(--primary-color, #0ea5e9)' }}>{t('item_detail.similar_products')}</h2>
                            <p className="id-section-sub">{t('item_detail.similar_sub')}</p>
                        </div>
                        <div className="id-scroll-btns">
                            <button onClick={() => scrollRef(similarRef, -1)} className="id-scroll-btn"><FaChevronLeft /></button>
                            <button onClick={() => scrollRef(similarRef, 1)} className="id-scroll-btn"><FaChevronRight /></button>
                        </div>
                    </div>
                    <div className="id-horizontal-list" ref={similarRef}>
                        {similarItems.map(si => (
                            <div key={si._id} className="id-horizontal-card">
                                <ItemCard item={si} />
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* ─── Recently Viewed ─── */}
            {recentItems.length > 0 && (
                <div className="id-section-below">
                    <div className="id-section-header">
                        <div>
                            <h2 className="id-section-title" style={{ color: 'var(--primary-color, #0ea5e9)' }}><FaClock style={{ marginRight: '8px', fontSize: '1.1rem' }} />{t('item_detail.recently_viewed')}</h2>
                            <p className="id-section-sub">{t('item_detail.recent_sub')}</p>
                        </div>
                        <div className="id-scroll-btns">
                            <button onClick={() => scrollRef(recentRef, -1)} className="id-scroll-btn"><FaChevronLeft /></button>
                            <button onClick={() => scrollRef(recentRef, 1)} className="id-scroll-btn"><FaChevronRight /></button>
                        </div>
                    </div>
                    <div className="id-horizontal-list" ref={recentRef}>
                        {recentItems.map(ri => (
                            <div key={ri._id} className="id-horizontal-card">
                                <ItemCard item={ri} />
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* ─── Lightbox ─── */}
            {lightbox && (
                <div className="id-lightbox-overlay" onClick={() => { setLightbox(false); setLightboxZoom(false); }}>
                    <button className="id-lightbox-close" onClick={() => { setLightbox(false); setLightboxZoom(false); }}>
                        <FaTimes />
                    </button>
                    <div
                        className={`id-lightbox-img-container ${lightboxZoom ? 'zoomed' : ''}`}
                        onClick={e => { e.stopPropagation(); setLightboxZoom(!lightboxZoom); }}
                        onMouseMove={handleLightboxMouseMove}
                        style={lightboxZoom ? { cursor: 'zoom-out' } : { cursor: 'zoom-in' }}
                    >
                        <img
                            src={getImageSrc(images[activeImg])}
                            alt={item.title}
                            className="id-lightbox-img"
                            style={lightboxZoom ? {
                                transformOrigin: `${zoomPos.x}% ${zoomPos.y}%`,
                                transform: 'scale(2.5)'
                            } : {}}
                            draggable={false}
                        />
                    </div>
                    {images.length > 1 && (
                        <div className="id-lightbox-thumbs" onClick={e => e.stopPropagation()}>
                            {images.map((img, i) => (
                                <button
                                    key={i}
                                    className={`id-lb-thumb ${i === activeImg ? 'active' : ''}`}
                                    onClick={() => { setActiveImg(i); setLightboxZoom(false); }}
                                >
                                    <img src={getImageSrc(img)} alt={`${i + 1}`} />
                                    <span className="id-lb-thumb-num">{i + 1}</span>
                                </button>
                            ))}
                        </div>
                    )}
                </div>
            )}

            {/* ─── Make Offer Modal ─── */}
            {offerModal && (
                <div className="id-offer-overlay" onClick={() => setOfferModal(false)}>
                    <div className="id-offer-modal" onClick={e => e.stopPropagation()}>
                        <button className="id-offer-close" onClick={() => setOfferModal(false)}><FaTimes /></button>
                        <div className="id-offer-header">
                            <div className="id-offer-header-icon"><FaHandshake /></div>
                            <h2>{t('item_detail.offer_title')}</h2>
                            <p>{t('item_detail.offer_desc')} <strong>{item.title}</strong></p>
                        </div>
                        <div className="id-offer-current-price">
                            <span>{t('item_detail.listed_price')}</span>
                            <strong>{formatPrice(item.price, item.currency_id)}</strong>
                        </div>
                        <div className="id-offer-form">
                            <label className="id-offer-label">{t('item_detail.your_offer')}</label>
                            <div className="id-offer-input-wrap">
                                <span className="id-offer-currency">{item.currency_id?.symbol || '₹'}</span>
                                <input
                                    type="number"
                                    className="id-offer-input"
                                    placeholder="0.00"
                                    value={offerAmount}
                                    onChange={e => setOfferAmount(e.target.value)}
                                    min="1"
                                    autoFocus
                                />
                            </div>
                            <label className="id-offer-label" style={{ marginTop: '16px' }}>{t('item_detail.optional_msg')}</label>
                            <textarea
                                className="id-offer-textarea"
                                placeholder={t('item_detail.msg_placeholder')}
                                value={offerMsg}
                                onChange={e => setOfferMsg(e.target.value)}
                                rows={3}
                            />
                            <button
                                className="id-offer-submit"
                                onClick={handleMakeOffer}
                                disabled={!offerAmount || parseFloat(offerAmount) <= 0 || offerSending}
                            >
                                {offerSending ? t('item_detail.sending') : t('item_detail.send_offer')}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* ─── Share Modal ─── */}
            {shareModal && (
                <div className="id-offer-overlay" onClick={() => setShareModal(false)}>
                    <div className="id-offer-modal id-share-modal" onClick={e => e.stopPropagation()}>
                        <button className="id-offer-close" onClick={() => setShareModal(false)}><FaTimes /></button>
                        <div className="id-offer-header">
                            <div className="id-offer-header-icon" style={{ background: '#f0f9ff', color: '#0ea5e9' }}><FaShareAlt /></div>
                            <h2>{t('item_detail.share_item')}</h2>
                            <p>{t('item_detail.share_desc')}</p>
                        </div>
                        <div className="id-share-options">
                            <button className="id-share-btn id-share-whatsapp" onClick={() => window.open(`https://wa.me/?text=${encodeURIComponent(window.location.href)}`)}>WhatsApp</button>
                            <button className="id-share-btn id-share-facebook" onClick={() => window.open(`https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(window.location.href)}`)}>Facebook</button>
                            <button className="id-share-btn id-share-twitter" onClick={() => window.open(`https://twitter.com/intent/tweet?url=${encodeURIComponent(window.location.href)}`)}>Twitter (X)</button>
                            <button className="id-share-btn id-share-email" onClick={() => window.open(`mailto:?subject=${encodeURIComponent(item.title)}&body=${encodeURIComponent(window.location.href)}`)}>Email</button>
                        </div>
                        <button
                            className="id-btn-primary"
                            style={{ width: '100%', marginTop: '20px' }}
                            onClick={() => {
                                navigator.clipboard?.writeText(window.location.href);
                                alert('Link copied!');
                                setShareModal(false);
                            }}
                        >
                            {t('item_detail.copy_link')}
                        </button>
                    </div>
                </div>
            )}

            {/* ─── Login Popup ─── */}
            {loginPopup && (
                <div className="id-login-overlay" onClick={() => setLoginPopup(false)}>
                    <div className="id-login-modal" onClick={e => e.stopPropagation()}>
                        <button className="id-offer-close" onClick={() => setLoginPopup(false)}><FaTimes /></button>
                        <div className="id-offer-header">
                            <div className="id-offer-header-icon" style={{ background: '#f0f9ff', color: 'var(--primary-color, #0ea5e9)' }}>
                                <FaEnvelope />
                            </div>
                            <h2>{t('item_detail.login_required')}</h2>
                            <p>
                                {loginAction === 'buy' ? t('item_detail.sign_in_action_buy') :
                                    loginAction === 'cart' ? t('item_detail.sign_in_action_cart') :
                                        loginAction === 'offer' ? t('item_detail.sign_in_action_offer') :
                                            loginAction === 'message' ? t('item_detail.sign_in_action_msg') :
                                                t('item_detail.sign_in_action_def')}
                            </p>
                        </div>
                        {loginError && (
                            <div className="id-login-error">{loginError}</div>
                        )}
                        <form className="id-login-form" onSubmit={handleLoginSubmit}>
                            <input
                                type="email"
                                className="id-login-input"
                                placeholder={t('item_detail.email_addr')}
                                value={loginEmail}
                                onChange={e => setLoginEmail(e.target.value)}
                                required
                                autoFocus
                            />
                            <div className="id-login-pw-wrap">
                                <input
                                    type={showPassword ? 'text' : 'password'}
                                    className="id-login-input"
                                    placeholder={t('item_detail.password')}
                                    value={loginPassword}
                                    onChange={e => setLoginPassword(e.target.value)}
                                    required
                                    style={{ paddingRight: '44px' }}
                                />
                                <button
                                    type="button"
                                    className="id-login-eye"
                                    onClick={() => setShowPassword(s => !s)}
                                    tabIndex={-1}
                                    aria-label={showPassword ? 'Hide password' : 'Show password'}
                                >
                                    {showPassword ? <FaEyeSlash /> : <FaEye />}
                                </button>
                            </div>
                            <button
                                type="submit"
                                className="id-offer-submit"
                                disabled={loginLoading}
                                style={{ background: 'var(--primary-color, #0ea5e9)', marginTop: '4px' }}
                            >
                                {loginLoading ? t('item_detail.signing_in') : t('item_detail.sign_in')}
                            </button>
                        </form>
                        <div className="id-login-footer">
                            <span>{t('item_detail.no_account')} </span>
                            <Link to="/register" onClick={() => setLoginPopup(false)}>{t('item_detail.sign_up_free')}</Link>
                        </div>
                    </div>
                </div>
            )}
            <PopupComponent />
        </div>
    );
};

export default ItemDetail;
