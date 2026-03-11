import React, { useContext, useState, useMemo } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
    FaLock, FaTruck, FaShieldAlt, FaCreditCard,
    FaChevronRight, FaArrowLeft, FaCheckCircle
} from 'react-icons/fa';
import axios from '../utils/axios';
import { loadStripe } from '@stripe/stripe-js';
import { Elements } from '@stripe/react-stripe-js';
import StripePaymentForm from '../components/checkout/StripePaymentForm';
import { useCart } from '../context/CartContext';
import CurrencyContext from '../context/CurrencyContext';
import AuthContext from '../context/AuthContext';
import { getImageUrl, getItemImageUrl, safeString } from '../utils/constants';
import { usePopup } from '../components/common/Popup';
import '../styles/Checkout.css';
import { useTranslation } from 'react-i18next';

// Promise to be resolved when settings are fetched
let stripePromise = null;

const SHIPPING_FEE = 200;

const Checkout = () => {
    const navigate = useNavigate();
    const { user } = useContext(AuthContext);
    const { formatPrice } = useContext(CurrencyContext);
    const { selectedItems, clearCart } = useCart();
    const { showPopup, PopupComponent } = usePopup();
    const { t } = useTranslation();

    const calculateBundleTotals = () => {
        let subtotal = 0;
        let shippingTotal = 0;
        let discountTotal = 0;

        selectedItems.forEach(item => {
            subtotal += (item.price || 0);
        });

        // Group selected items by seller to calculate shipping and discounts
        const selectedBySeller = selectedItems.reduce((acc, item) => {
            const sid = item.seller_id?._id || item.seller_id;
            if (!acc[sid]) acc[sid] = { items: [], seller: item.seller_id };
            acc[sid].items.push(item);
            return acc;
        }, {});

        Object.values(selectedBySeller).forEach(group => {
            const { items, seller } = group;
            if (items.length === 0) return;

            // Shipping: One fee per seller unless any item has free shipping
            const hasFreeShipping = items.some(i => i.shipping_included);
            if (!hasFreeShipping) {
                shippingTotal += SHIPPING_FEE;
            }

            // Discount: Check seller bundle discounts
            if (seller && seller.bundle_discounts?.enabled) {
                const count = items.length;
                let pct = 0;
                if (count >= 5) pct = seller.bundle_discounts.five_items;
                else if (count >= 3) pct = seller.bundle_discounts.three_items;
                else if (count >= 2) pct = seller.bundle_discounts.two_items;

                if (pct > 0) {
                    const groupSubtotal = items.reduce((s, i) => s + (i.price || 0), 0);
                    discountTotal += (groupSubtotal * pct) / 100;
                }
            }
        });

        return { subtotal, shippingTotal, discountTotal, total: subtotal + shippingTotal - discountTotal };
    };

    const { subtotal, shippingTotal, discountTotal, total } = calculateBundleTotals();

    const [availableMethods, setAvailableMethods] = useState([]);
    const [paymentMethod, setPaymentMethod] = useState('');
    const [clientSecret, setClientSecret] = useState('');
    const [stripeError, setStripeError] = useState(null);
    const [placing, setPlacing] = useState(false);
    const [step, setStep] = useState('details'); // 'details' | 'done'
    const [fieldErrors, setFieldErrors] = useState({});

    // Fetch methods and settings on mount
    React.useEffect(() => {
        const fetchPaymentConfigs = async () => {
            try {
                // 1. Fetch settings to get Stripe public key
                const settingsRes = await axios.get('/api/settings');
                const settings = settingsRes.data;

                if (settings && settings.type === 'payment_settings' || settings) {
                    const isTest = settings.stripe_test_mode !== false; // Default to test
                    const pubKey = isTest ? settings.stripe_test_public_key : settings.stripe_live_public_key;

                    if (pubKey) {
                        stripePromise = loadStripe(pubKey);
                    }
                }

                // 2. Fetch payment methods from settings
                const methods = [];
                const currentLang = localStorage.getItem('i18nextLng') || 'en';

                if (settings) {
                    // Stripe
                    if (settings.stripe_enabled) {
                        const stripeTrans = settings.stripe_translations?.[currentLang] || settings.stripe_translations?.['en'] || {};
                        methods.push({
                            key: 'stripe',
                            name: stripeTrans.name || 'Stripe',
                            description: stripeTrans.description || 'Credit / Debit Card',
                            icon: settings.stripe_logo ? `${axios.defaults.baseURL}/${settings.stripe_logo}` : null,
                            defaultIcon: <FaCreditCard />
                        });
                    }
                    // PayPal
                    if (settings.paypal_enabled) {
                        const paypalTrans = settings.paypal_translations?.[currentLang] || settings.paypal_translations?.['en'] || {};
                        methods.push({
                            key: 'paypal',
                            name: paypalTrans.name || 'PayPal',
                            description: paypalTrans.description || 'Pay via PayPal',
                            icon: settings.paypal_logo ? `${axios.defaults.baseURL}/${settings.paypal_logo}` : null,
                            defaultIcon: <FaCreditCard /> // Fallback icon
                        });
                    }
                }

                setAvailableMethods(methods);
                if (methods.length > 0) {
                    setPaymentMethod(methods[0].key);
                }
            } catch (err) {
                console.error("Error fetching payment configuration:", err);
            }
        };
        fetchPaymentConfigs();
    }, []);

    // Create PaymentIntent if stripe is selected
    React.useEffect(() => {
        if (paymentMethod === 'stripe' && total > 0) {
            const createIntent = async () => {
                setStripeError(null);
                try {
                    const res = await axios.post('/api/payments/stripe/create-intent', {
                        amount: total,
                        currency: 'inr'
                    });
                    setClientSecret(res.data.clientSecret);
                } catch (err) {
                    console.error("Error creating intent:", err);
                    setClientSecret('');
                    setStripeError(err.response?.data?.message || 'Failed to initialize payment gateway.');
                }
            };
            createIntent();
        }
    }, [paymentMethod, total]);

    const [form, setForm] = useState({
        full_name: user?.username || '',
        phone: '',
        address_line: '',
        city: '',
        state: '',
        country: 'India',
        pincode: ''
    });

    const handleChange = (e) => {
        setForm(f => ({ ...f, [e.target.name]: e.target.value }));
        if (fieldErrors[e.target.name]) {
            setFieldErrors(prev => {
                const updated = { ...prev };
                delete updated[e.target.name];
                return updated;
            });
        }
    };

    const validateForm = () => {
        const errors = {};
        const required = ['full_name', 'phone', 'address_line', 'city', 'pincode'];

        required.forEach(field => {
            if (!form[field] || form[field].trim() === '') {
                errors[field] = true;
            }
        });

        setFieldErrors(errors);

        if (Object.keys(errors).length > 0) {
            // Scroll to the first error field
            const firstError = Object.keys(errors)[0];
            const element = document.getElementsByName(firstError)[0];
            if (element) {
                element.scrollIntoView({ behavior: 'smooth', block: 'center' });
                element.focus();
            }
            return false;
        }
        return true;
    };

    const handlePlaceOrder = async (e, stripePaymentId = null) => {
        if (e) e.preventDefault();

        if (!validateForm()) return;

        if (selectedItems.length === 0) {
            showPopup({ type: 'info', title: 'Empty Cart', message: 'No items selected to checkout.' });
            return;
        }

        if (paymentMethod === 'stripe' && !stripePaymentId) {
            // Stripe form handles its own submission
            return;
        }

        setPlacing(true);

        try {
            await axios.post('/api/orders', {
                items: selectedItems,
                payment_method: paymentMethod,
                shipping_address: form,
                stripe_payment_id: stripePaymentId
            });
            setPlacing(false);
            setStep('done');
            clearCart();
        } catch (err) {
            console.error(err);
            setPlacing(false);
            showPopup({
                type: 'error',
                title: 'Order Failed',
                message: err.response?.data?.message || 'There was an error placing your order.'
            });
        }
    };

    const stripeOptions = useMemo(() => {
        if (!clientSecret) return null;
        return {
            clientSecret,
            appearance: {
                theme: 'stripe',
                variables: {
                    colorPrimary: '#6366f1',
                },
            },
        };
    }, [clientSecret]);

    if (!user) {
        navigate('/login');
        return null;
    }

    if (selectedItems.length === 0 && step !== 'done') {
        return (
            <div className="checkout-page">
                <div className="checkout-empty">
                    <FaShieldAlt />
                    <h2>{t('checkout.nothing_to_checkout')}</h2>
                    <p>{t('checkout.select_items_first')}</p>
                    <Link to="/cart" className="checkout-back-link">← {t('checkout.back_to_cart')}</Link>
                </div>
            </div>
        );
    }

    if (step === 'done') {
        return (
            <div className="checkout-page">
                <div className="checkout-success">
                    <div className="checkout-success-icon"><FaCheckCircle /></div>
                    <h2>{t('checkout.order_placed')}</h2>
                    <p>{t('checkout.thank_you_purchase')}</p>
                    <div className="checkout-success-actions">
                        <Link to="/profile?tab=orders" className="checkout-btn-orders">{t('checkout.view_orders')}</Link>
                        <Link to="/products" className="checkout-btn-browse">{t('checkout.continue_shopping')}</Link>
                    </div>
                </div>
                <PopupComponent />
            </div>
        );
    }

    return (
        <div className="checkout-page">
            <div className="checkout-container">
                <div className="checkout-breadcrumb">
                    <Link to="/">{t('checkout.home')}</Link><FaChevronRight />
                    <Link to="/cart">{t('checkout.cart')}</Link><FaChevronRight />
                    <span>{t('checkout.checkout_title')}</span>
                </div>

                <div className="checkout-header">
                    <button className="checkout-back-btn" onClick={() => navigate('/cart')}>
                        <FaArrowLeft /> {t('checkout.back_to_cart')}
                    </button>
                    <h1 className="checkout-title">{t('checkout.checkout_title')} <FaLock className="checkout-lock-icon" /></h1>
                </div>

                <div className="checkout-layout">
                    <div className="checkout-form-col">
                        <div className="checkout-section">
                            <h2 className="checkout-section-title"><FaTruck /> {t('checkout.shipping_address')}</h2>
                            <div className="checkout-grid-2">
                                <div className={`checkout-field ${fieldErrors.full_name ? 'error' : ''}`}>
                                    <label>{t('checkout.full_name')}</label>
                                    <input name="full_name" value={form.full_name} onChange={handleChange} placeholder="John Doe" required />
                                </div>
                                <div className={`checkout-field ${fieldErrors.phone ? 'error' : ''}`}>
                                    <label>{t('checkout.phone_number')}</label>
                                    <input name="phone" value={form.phone} onChange={handleChange} placeholder="+91 9876543210" required />
                                </div>
                            </div>
                            <div className={`checkout-field ${fieldErrors.address_line ? 'error' : ''}`}>
                                <label>{t('checkout.street_address')}</label>
                                <input name="address_line" value={form.address_line} onChange={handleChange} placeholder="123 Main Street, Apt 4B" required />
                            </div>
                            <div className="checkout-grid-3">
                                <div className={`checkout-field ${fieldErrors.city ? 'error' : ''}`}>
                                    <label>{t('checkout.city')}</label>
                                    <input name="city" value={form.city} onChange={handleChange} placeholder="Mumbai" required />
                                </div>
                                <div className="checkout-field">
                                    <label>{t('checkout.state')}</label>
                                    <input name="state" value={form.state} onChange={handleChange} placeholder="Maharashtra" />
                                </div>
                                <div className={`checkout-field ${fieldErrors.pincode ? 'error' : ''}`}>
                                    <label>{t('checkout.pincode')}</label>
                                    <input name="pincode" value={form.pincode} onChange={handleChange} placeholder="400001" required maxLength={6} />
                                </div>
                            </div>
                            <div className="checkout-field">
                                <label>{t('checkout.country')}</label>
                                <input name="country" value={form.country} onChange={handleChange} />
                            </div>
                        </div>

                        <div className="checkout-section">
                            <h2 className="checkout-section-title"><FaCreditCard /> {t('checkout.payment_method')}</h2>
                            <div className="checkout-pay-methods">
                                {availableMethods.map(m => (
                                    <button
                                        key={m.key}
                                        type="button"
                                        className={`checkout-pay-btn ${paymentMethod === m.key ? 'active' : ''}`}
                                        onClick={() => setPaymentMethod(m.key)}
                                    >
                                        <div className="checkout-pay-icon-wrapper">
                                            {m.icon ? (
                                                <img src={m.icon} alt={m.name} className="checkout-method-logo" />
                                            ) : (
                                                <span className="checkout-pay-icon">{m.defaultIcon}</span>
                                            )}
                                        </div>
                                        <div className="checkout-pay-text">
                                            <span className="fw-bold">{m.name}</span>
                                            {m.description && <small className="d-block text-muted xx-small">{m.description}</small>}
                                        </div>
                                    </button>
                                ))}
                            </div>

                            {paymentMethod === 'stripe' && clientSecret && (
                                <div className="checkout-card-fields">
                                    <Elements stripe={stripePromise} options={stripeOptions}>
                                        <StripePaymentForm
                                            amount={total}
                                            validateForm={validateForm}
                                            billingDetails={{
                                                name: form.full_name,
                                                email: user.email,
                                                phone: form.phone,
                                                address: {
                                                    line1: form.address_line,
                                                    city: form.city,
                                                    state: form.state,
                                                    postal_code: form.pincode,
                                                    country: 'IN' // Stripe expects ISO codes
                                                }
                                            }}
                                            onPaymentSuccess={(pi) => {
                                                console.log('Payment success:', pi);
                                                handlePlaceOrder(null, pi.id);
                                            }}
                                        />
                                    </Elements>
                                </div>
                            )}

                            {paymentMethod === 'stripe' && !clientSecret && !stripeError && (
                                <div className="checkout-loading-stripe">{t('checkout.loading_secure_payment')}</div>
                            )}

                            {paymentMethod === 'stripe' && stripeError && (
                                <div className="payment-error" style={{ margin: '10px 0' }}>
                                    <strong>{t('checkout.payment_error')}</strong> {stripeError}
                                    <p style={{ fontSize: '0.75rem', marginTop: '5px' }}>Please ensure your Stripe keys are correctly configured in the .env file.</p>
                                </div>
                            )}
                        </div>
                    </div>

                    <aside className="checkout-summary-col">
                        <div className="checkout-summary-card">
                            <h2 className="checkout-summary-title">{t('checkout.order_summary')}</h2>

                            <div className="checkout-items-list">
                                {selectedItems.map(item => (
                                    <div key={item._id} className="checkout-summary-item">
                                        <img
                                            src={getItemImageUrl(item.images?.[0])}
                                            alt={safeString(item.title)}
                                        />
                                        <div className="checkout-summary-item-info">
                                            <p className="checkout-summary-item-name">{safeString(item.title)}</p>
                                            {item.condition && <span>{item.condition}</span>}
                                        </div>
                                        <div className="checkout-summary-item-price">
                                            <strong>{formatPrice(item.price, item.currency_id)}</strong>
                                            {!item.shipping_included && (
                                                <small>+₹{SHIPPING_FEE} {t('checkout.shipping').toLowerCase()}</small>
                                            )}
                                            {item.shipping_included && (
                                                <small className="ship-inc">{t('checkout.shipping_included')}</small>
                                            )}
                                        </div>
                                    </div>
                                ))}
                            </div>

                            <div className="checkout-summary-divider" />

                            <div className="checkout-summary-row">
                                <span>{t('checkout.subtotal')} ({selectedItems.length} {t('checkout.items')})</span>
                                <span>{formatPrice(subtotal)}</span>
                            </div>
                            <div className="checkout-summary-row">
                                <span>{t('checkout.shipping')}</span>
                                <span className={shippingTotal === 0 ? 'ship-free-label' : ''}>
                                    {shippingTotal === 0 ? t('checkout.free') : `₹${shippingTotal}`}
                                </span>
                            </div>
                            {discountTotal > 0 && (
                                <div className="checkout-summary-row checkout-discount-row">
                                    <span>{t('checkout.bundle_discount') || 'Bundle Discount'}</span>
                                    <span className="text-success">-{formatPrice(discountTotal)}</span>
                                </div>
                            )}

                            <div className="checkout-summary-divider" />

                            <div className="checkout-summary-row checkout-total-row">
                                <strong>{t('checkout.total')}</strong>
                                <strong>{formatPrice(total)}</strong>
                            </div>

                            {paymentMethod === 'stripe' && (
                                <div className="checkout-stripe-notice">
                                    <FaCreditCard /> {t('checkout.complete_payment_details')}
                                </div>
                            )}

                            {paymentMethod !== 'stripe' && availableMethods.length > 0 && (
                                <button
                                    type="button"
                                    className="checkout-place-btn"
                                    disabled={placing}
                                    onClick={handlePlaceOrder}
                                >
                                    {placing ? (
                                        <><span className="checkout-spinner" /> {t('checkout.placing_order')}</>
                                    ) : (
                                        <><FaLock /> {t('checkout.place_order')}</>
                                    )}
                                </button>
                            )}

                            <p className="checkout-terms">
                                {t('checkout.agree_terms')} <Link to="/terms">{t('checkout.terms_service')}</Link>.
                            </p>

                            <div className="checkout-trust-badges">
                                <span><FaShieldAlt /> {t('checkout.buyer_protection')}</span>
                                <span><FaLock /> {t('checkout.ssl_secured')}</span>
                                <span><FaTruck /> {t('checkout.track_delivery')}</span>
                            </div>
                        </div>
                    </aside>
                </div>
            </div>
            <PopupComponent />
        </div>
    );
};

export default Checkout;
