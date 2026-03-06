import React, { useContext, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
    FaShoppingCart, FaTrash, FaCheckSquare, FaSquare,
    FaArrowRight, FaTag, FaBoxOpen, FaChevronRight,
    FaShieldAlt, FaTruck, FaLock
} from 'react-icons/fa';
import { useCart } from '../context/CartContext';
import CurrencyContext from '../context/CurrencyContext';
import AuthContext from '../context/AuthContext';
import { getImageUrl, getItemImageUrl } from '../utils/constants';
import { usePopup } from '../components/common/Popup';
import '../styles/Cart.css';

const SHIPPING_FEE = 200; // ₹200 temp flat fee

const Cart = () => {
    const navigate = useNavigate();
    const { user } = useContext(AuthContext);
    const { formatPrice } = useContext(CurrencyContext);
    const {
        cartItems, removeFromCart, toggleSelect, selectAll,
        deselectAll, selectedItems, cartCount, removeSelected
    } = useCart();
    const { showPopup, PopupComponent } = usePopup();

    const allSelected = cartItems.length > 0 && cartItems.every(i => i.selected);

    const calcShipping = (item) => {
        if (item.shipping_included) return 0;
        return SHIPPING_FEE;
    };

    const subtotal = selectedItems.reduce((sum, i) => sum + (i.price || 0), 0);
    const shippingTotal = selectedItems.reduce((sum, i) => sum + calcShipping(i), 0);
    const total = subtotal + shippingTotal;

    const handleRemove = (item) => {
        showPopup({
            type: 'confirm',
            title: 'Remove Item?',
            message: `Remove "${item.title}" from your cart?`,
            confirmText: 'Remove',
            cancelText: 'Keep',
            onConfirm: () => removeFromCart(item._id)
        });
    };

    const handleRemoveSelected = () => {
        if (selectedItems.length === 0) return;
        showPopup({
            type: 'confirm',
            title: `Remove ${selectedItems.length} item${selectedItems.length > 1 ? 's' : ''}?`,
            message: 'These items will be removed from your cart.',
            confirmText: 'Remove',
            cancelText: 'Cancel',
            onConfirm: removeSelected
        });
    };

    const handleCheckout = () => {
        if (!user) {
            showPopup({ type: 'warning', title: 'Login Required', message: 'Please log in to proceed to checkout.' });
            return;
        }
        if (selectedItems.length === 0) {
            showPopup({ type: 'info', title: 'No Items Selected', message: 'Please select at least one item to checkout.' });
            return;
        }
        navigate('/checkout');
    };

    if (!user) {
        return (
            <div className="cart-page">
                <div className="cart-empty-state">
                    <FaShoppingCart className="cart-empty-icon" />
                    <h2>Login to see your cart</h2>
                    <p>You need to be logged in to manage your shopping cart.</p>
                    <Link to="/login" className="cart-btn-primary">Login</Link>
                </div>
                <PopupComponent />
            </div>
        );
    }

    if (cartItems.length === 0) {
        return (
            <div className="cart-page">
                <div className="cart-empty-state">
                    <FaBoxOpen className="cart-empty-icon" />
                    <h2>Your cart is empty</h2>
                    <p>Browse items and add them to your cart to get started.</p>
                    <Link to="/products" className="cart-btn-primary">Browse Products</Link>
                </div>
                <PopupComponent />
            </div>
        );
    }

    return (
        <div className="cart-page">
            <div className="cart-container">
                {/* Breadcrumb */}
                <div className="cart-breadcrumb">
                    <Link to="/">Home</Link>
                    <FaChevronRight />
                    <span>Shopping Cart</span>
                </div>

                <h1 className="cart-heading">
                    <FaShoppingCart /> Shopping Cart
                    <span className="cart-count-badge">{cartCount}</span>
                </h1>

                <div className="cart-layout">
                    {/* ── Left: Items List ── */}
                    <div className="cart-items-panel">
                        {/* Toolbar */}
                        <div className="cart-toolbar">
                            <button
                                className="cart-select-all-btn"
                                onClick={allSelected ? deselectAll : selectAll}
                            >
                                {allSelected
                                    ? <><FaCheckSquare className="cart-check-icon checked" /> Deselect All</>
                                    : <><FaSquare className="cart-check-icon" /> Select All</>
                                }
                            </button>
                            {selectedItems.length > 0 && (
                                <button className="cart-remove-sel-btn" onClick={handleRemoveSelected}>
                                    <FaTrash /> Remove Selected ({selectedItems.length})
                                </button>
                            )}
                        </div>

                        {/* Items */}
                        <div className="cart-items-list">
                            {cartItems.map(item => {
                                const img = item.images?.[0];
                                const imgUrl = getItemImageUrl(img);
                                const shipping = calcShipping(item);

                                return (
                                    <div
                                        key={item._id}
                                        className={`cart-item-row ${item.selected ? 'selected' : ''}`}
                                    >
                                        {/* Checkbox */}
                                        <button
                                            className="cart-item-check"
                                            onClick={() => toggleSelect(item._id)}
                                            aria-label={item.selected ? 'Deselect' : 'Select'}
                                        >
                                            {item.selected
                                                ? <FaCheckSquare className="cart-check-icon checked" />
                                                : <FaSquare className="cart-check-icon" />
                                            }
                                        </button>

                                        {/* Image — click to view */}
                                        <Link to={`/items/${item._id}`} className="cart-item-img-link">
                                            <img src={imgUrl} alt={item.title} className="cart-item-img" />
                                        </Link>

                                        {/* Info */}
                                        <div className="cart-item-info">
                                            <Link to={`/items/${item._id}`} className="cart-item-title">
                                                {item.title}
                                            </Link>
                                            <div className="cart-item-meta">
                                                {item.condition && <span className="cart-meta-chip"><FaTag /> {item.condition}</span>}
                                                {item.size && <span className="cart-meta-chip">Size: {item.size}</span>}
                                                {item.brand && <span className="cart-meta-chip">{item.brand}</span>}
                                            </div>
                                            <div className="cart-item-seller">
                                                by {item.seller_id?.username || 'Unknown Seller'}
                                            </div>
                                            <div className="cart-item-shipping-note">
                                                {item.shipping_included
                                                    ? <span className="ship-free"><FaTruck /> Shipping included</span>
                                                    : <span className="ship-paid"><FaTruck /> +₹{SHIPPING_FEE} shipping</span>
                                                }
                                            </div>
                                        </div>

                                        {/* Price */}
                                        <div className="cart-item-price-col">
                                            <div className="cart-item-price">
                                                {formatPrice(item.price, item.currency_id)}
                                            </div>
                                            {!item.shipping_included && (
                                                <div className="cart-item-ship-fee">+₹{SHIPPING_FEE} shipping</div>
                                            )}
                                        </div>

                                        {/* Remove */}
                                        <button
                                            className="cart-item-remove"
                                            onClick={() => handleRemove(item)}
                                            aria-label="Remove from cart"
                                        >
                                            <FaTrash />
                                        </button>
                                    </div>
                                );
                            })}
                        </div>
                    </div>

                    {/* ── Right: Order Summary ── */}
                    <aside className="cart-summary-panel">
                        <div className="cart-summary-card">
                            <h2 className="cart-summary-title">Order Summary</h2>

                            <div className="cart-summary-row">
                                <span>Items ({selectedItems.length} selected)</span>
                                <span>{formatPrice(subtotal)}</span>
                            </div>
                            <div className="cart-summary-row">
                                <span>Shipping</span>
                                <span className={shippingTotal === 0 ? 'cart-free-tag' : ''}>
                                    {shippingTotal === 0 ? 'FREE' : `₹${shippingTotal}`}
                                </span>
                            </div>

                            <div className="cart-summary-divider" />

                            <div className="cart-summary-row cart-summary-total">
                                <span>Total</span>
                                <span>{formatPrice(total)}</span>
                            </div>

                            <button
                                className="cart-checkout-btn"
                                onClick={handleCheckout}
                                disabled={selectedItems.length === 0}
                            >
                                Checkout ({selectedItems.length}) <FaArrowRight />
                            </button>

                            <div className="cart-trust-row">
                                <span><FaShieldAlt /> Buyer Protection</span>
                                <span><FaLock /> Secure Payment</span>
                            </div>
                        </div>

                        {/* Selected Items preview */}
                        {selectedItems.length > 0 && (
                            <div className="cart-selected-preview">
                                <p className="cart-preview-label">Selected Items</p>
                                {selectedItems.map(item => (
                                    <div key={item._id} className="cart-preview-row">
                                        <img
                                            src={getItemImageUrl(item.images?.[0])}
                                            alt={item.title}
                                        />
                                        <span className="cart-preview-name">{item.title}</span>
                                        <span className="cart-preview-price">{formatPrice(item.price, item.currency_id)}</span>
                                    </div>
                                ))}
                            </div>
                        )}
                    </aside>
                </div>
            </div>
            <PopupComponent />
        </div>
    );
};

export default Cart;
