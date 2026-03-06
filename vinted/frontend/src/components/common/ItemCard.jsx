import React, { useState, useEffect, useContext } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { FaHeart, FaRegHeart, FaStar, FaRegStar, FaStarHalfAlt, FaArrowRight, FaMapMarkerAlt, FaClock, FaTag } from 'react-icons/fa';
import '../../styles/ItemCard.css';
import AuthContext from '../../context/AuthContext';
import WishlistContext from '../../context/WishlistContext';
import CurrencyContext from '../../context/CurrencyContext';

import { getImageUrl, getItemImageUrl } from '../../utils/constants';

const ItemCard = ({ item }) => {
    const navigate = useNavigate();
    const { user, mode } = useContext(AuthContext);
    const { isWishlisted, addToWishlist, removeFromWishlist } = useContext(WishlistContext);
    const { formatPrice } = useContext(CurrencyContext);
    const [localLikes, setLocalLikes] = useState(item.likes_count || 0);

    // Sync local likes if item prop changes
    useEffect(() => {
        setLocalLikes(item.likes_count || 0);
    }, [item.likes_count]);

    // Helper to render stars
    const renderStars = (rating) => {
        const stars = [];
        const score = rating || 0;
        for (let i = 1; i <= 5; i++) {
            if (score >= i) {
                stars.push(<FaStar key={i} className="text-warning" size={10} />);
            } else if (score >= i - 0.5) {
                stars.push(<FaStarHalfAlt key={i} className="text-warning" size={10} />);
            } else {
                stars.push(<FaRegStar key={i} style={{ color: '#cbd5e1' }} size={10} />);
            }
        }
        return <div className="d-flex" style={{ gap: '1px' }}>{stars}</div>;
    };

    // Resolve image URL
    const rawImage = item.images && item.images.length > 0 ? item.images[0] : null;
    const imageUrl = getItemImageUrl(rawImage);

    // Calculate Time Ago & New Status
    const createdAt = new Date(item.created_at || Date.now());
    const now = new Date();
    const diffInSeconds = Math.floor((now - createdAt) / 1000);
    const diffInDays = Math.floor(diffInSeconds / (3600 * 24));
    const diffInHours = Math.floor(diffInSeconds / 3600);

    let timeAgoText = '';
    if (diffInDays === 0) {
        timeAgoText = 'Today';
    } else if (diffInDays === 1) {
        timeAgoText = 'Yesterday';
    } else if (diffInDays < 30) {
        timeAgoText = `${diffInDays} days ago`;
    } else if (diffInDays < 365) {
        const months = Math.floor(diffInDays / 30);
        timeAgoText = `${months} month${months > 1 ? 's' : ''} ago`;
    } else {
        const years = Math.floor(diffInDays / 365);
        timeAgoText = `${years} year${years > 1 ? 's' : ''} ago`;
    }

    // "New" Logic: Posted within last 48 hours
    const isNew = diffInHours < 48;

    // Wishlist Logic
    const isFav = isWishlisted(item._id);

    const handleHeartClick = (e) => {
        e.preventDefault(); // Prevent card navigation
        e.stopPropagation();

        if (mode !== 'buyer') return; // Guard for seller mode

        if (!user) {
            navigate('/login');
            return;
        }

        if (isFav) {
            removeFromWishlist(item._id);
            setLocalLikes(prev => Math.max(0, prev - 1));
        } else {
            addToWishlist(item._id);
            setLocalLikes(prev => prev + 1);
        }
    };

    const isSellerDeleted = item.seller_id && (item.seller_id.is_deleted || item.seller_id.status === 'inactive');

    // Return non-interactive card if seller is deleted
    if (isSellerDeleted) {
        return (
            <div className="listing-card" style={{ display: 'block', width: '100%', height: '100%', position: 'relative', opacity: 0.6, pointerEvents: 'none' }}>
                <div className="listing-image-wrapper" style={{ position: 'relative' }}>
                    <img src={imageUrl} alt={item.title || item.name} className="listing-image" style={{ filter: 'grayscale(100%)' }} />
                    <div style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', fontWeight: 'bold', zIndex: 10 }}>
                        User No Longer Exists
                    </div>
                </div>
                <div className="listing-details">
                    <h3 className="listing-title" style={{ fontSize: '1rem', fontWeight: '600', margin: 0 }}>
                        {typeof item.title === 'string' ? item.title : 'Unavailable'}
                    </h3>
                </div>
            </div>
        );
    }

    return (
        <Link to={`/items/${item._id}`} className={`listing-card ${isFav ? 'is-favorited' : ''}`} style={{ textDecoration: 'none', display: 'block', width: '100%', height: '100%', position: 'relative' }}>
            <div className="listing-image-wrapper" style={{ position: 'relative' }}>
                <img src={imageUrl} alt={item.title || item.name} className="listing-image" />

                {/* Favorites Button - ONLY SHOW IN BUYER MODE */}
                {mode === 'buyer' && (
                    <button
                        className="favorite-btn"
                        onClick={handleHeartClick}
                        title={isFav ? "Remove from wishlist" : "Add to wishlist"}
                        style={{
                            position: 'absolute',
                            top: '12px',
                            right: '12px',
                            display: 'flex',
                            flexDirection: 'column',
                            alignItems: 'center',
                            gap: '2px',
                            background: 'none',
                            border: 'none',
                            zIndex: 5,
                            cursor: 'pointer'
                        }}
                    >
                        {isFav ? <FaHeart style={{ color: '#ef4444', fontSize: '1.2rem' }} /> : <FaRegHeart style={{ color: 'white', fontSize: '1.2rem' }} />}
                        <span style={{
                            color: 'white',
                            fontSize: '0.65rem',
                            fontWeight: '400',
                            textShadow: '0 1px 4px rgba(0,0,0,0.8)'
                        }}>
                            {localLikes} likes
                        </span>
                    </button>
                )}

                {/* Top Rated Badge (Bottom Left) */}
                {item.isTopRated && <span className="badge-top-rated">TOP RATED</span>}

                {/* New Badge with Shimmer (Top Left) */}
                {isNew && !item.is_sold && item.status !== 'sold' && (
                    <span className="new-badge">
                        NEW
                    </span>
                )}

                {/* SOLD Badge */}
                {(item.is_sold || item.status === 'sold') && (
                    <div className="sold-overlay">
                        <span>SOLD</span>
                    </div>
                )}
            </div>

            <div className="listing-details">
                {/* Title & Seller Info */}
                {/* Product Title (Left) & Seller Info (Right) */}
                <div className="d-flex justify-content-between align-items-center mb-2">
                    <h3 className="listing-title" style={{ fontSize: '1rem', fontWeight: '600', margin: 0, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', flex: 1, paddingRight: '8px' }} title={typeof item.title === 'string' ? item.title : (typeof item.name === 'string' ? item.name : 'Untitled')}>
                        {typeof item.title === 'string' ? item.title : (typeof item.name === 'string' ? item.name : 'Untitled')}
                    </h3>

                    {item.seller_id && typeof item.seller_id === 'object' && (
                        <div className="seller-info" style={{ display: 'flex', alignItems: 'center', gap: '6px', flexShrink: 0 }}>
                            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', lineHeight: '1' }}>
                                <span className="seller-name" style={{ fontSize: '0.75rem', fontWeight: '600', color: '#334155', maxWidth: '80px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={item.seller_id.username || 'Unknown'}>
                                    {item.seller_id.username || 'Unknown'}
                                </span>
                                <div className="mt-1" style={{ transform: 'scale(0.8)', transformOrigin: 'right center' }}>
                                    {renderStars(item.seller_id.rating_avg)}
                                </div>
                            </div>

                            {item.seller_id.profile_image ? (
                                <img
                                    src={getImageUrl(item.seller_id.profile_image)}
                                    alt={item.seller_id.username}
                                    style={{ width: '28px', height: '28px', borderRadius: '50%', objectFit: 'cover', border: '1px solid #e2e8f0' }}
                                />
                            ) : (
                                <div
                                    style={{
                                        width: '28px',
                                        height: '28px',
                                        borderRadius: '50%',
                                        background: '#cbd5e1',
                                        color: 'white',
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        fontSize: '11px',
                                        fontWeight: 'bold',
                                        textTransform: 'uppercase'
                                    }}
                                >
                                    {item.seller_id.username ? item.seller_id.username.charAt(0) : '?'}
                                </div>
                            )}
                        </div>
                    )}
                </div>



                {/* Condition & Time Ago Metadata */}
                <div className="item-meta mb-2">
                    {item.condition && (
                        <span className="item-condition">
                            <FaTag style={{ fontSize: '0.6rem', marginRight: '4px' }} />
                            {item.condition}
                        </span>
                    )}
                    <span style={{ fontSize: '0.75rem', color: '#94a3b8', display: 'flex', alignItems: 'center' }}>
                        <FaClock style={{ fontSize: '0.7rem', marginRight: '4px' }} />
                        {timeAgoText}
                    </span>
                </div>

                {/* Location */}
                <div className="listing-location mb-2">
                    <FaMapMarkerAlt style={{ marginRight: '4px', opacity: 0.6 }} />
                    {typeof item.location === 'string' ? item.location : 'Unknown Location'}
                </div>

                {/* Price & Action */}
                <div className="d-flex justify-content-between align-items-center mt-auto">
                    <div className="listing-price">
                        <strong>{formatPrice(item.price, item.currency_id)}</strong>
                    </div>
                    <div className="action-btn-circle">
                        <FaArrowRight />
                    </div>
                </div>
            </div>
        </Link>
    );
};

export default ItemCard;
