import React, { useState, useEffect } from 'react';
import { Container, Row, Col, Form, Button } from 'react-bootstrap';
import { Link } from 'react-router-dom';
import {
    FaFacebookF,
    FaTwitter,
    FaInstagram,
    FaLinkedinIn,
    FaPaperPlane,
    FaCcVisa,
    FaCcMastercard,
    FaCcPaypal,
    FaCcApplePay,
    FaCcAmazonPay
} from 'react-icons/fa';
import '../styles/Footer.css';
import { useTranslation } from 'react-i18next';
import axios from '../utils/axios';
import { getImageUrl } from '../utils/constants';

const Footer = () => {
    const { t } = useTranslation();
    const [email, setEmail] = useState('');
    const [settings, setSettings] = useState({
        site_name: 'Vinted',
        site_logo: '',
        primary_color: '#0ea5e9',
    });

    useEffect(() => {
        const fetchSettings = async () => {
            try {
                const res = await axios.get('/api/settings');
                if (res.data) setSettings(prev => ({ ...prev, ...res.data }));
            } catch (error) {
                console.error('Failed to fetch footer settings:', error);
            }
        };
        fetchSettings();
    }, []);

    const [submitting, setSubmitting] = useState(false);
    const [status, setStatus] = useState({ type: '', message: '' });

    const handleSubscribe = async (e) => {
        e.preventDefault();
        if (!email) return;

        try {
            setSubmitting(true);
            setStatus({ type: '', message: '' });
            const { data } = await axios.post('/api/newsletter/subscribe', { email });
            setStatus({ type: 'success', message: data.message });
            setEmail('');
        } catch (error) {
            const msg = error.response?.data?.message || 'Something went wrong';
            setStatus({ type: 'error', message: msg });
        } finally {
            setSubmitting(false);
        }
    };

    return (
        <footer className="footer">
            <Container fluid className="px-md-5 px-3">
                <Row className="footer-top-row mb-5">
                    {/* Brand Section */}
                    <Col lg={4} md={12} className="mb-4 mb-lg-0">
                        <div className="footer-brand">
                            <Link to="/" className="footer-logo" style={{ textDecoration: 'none', display: 'flex', alignItems: 'center', gap: '10px' }}>
                                {settings.site_logo ? (
                                    <img src={getImageUrl(settings.site_logo)} alt={settings.site_name} style={{ height: '40px' }} />
                                ) : (
                                    <>
                                        <div className="footer-logo-icon" style={{ backgroundColor: settings.primary_color }}>
                                            {settings.site_name ? settings.site_name.charAt(0) : 'V'}
                                        </div>
                                        <span className="footer-logo-text">{settings.site_name}</span>
                                    </>
                                )}
                            </Link>
                            <p className="footer-tagline">
                                {t('footer.tagline', 'Your trusted destination for pre-loved fashion. Buy, sell, and discover unique pieces while promoting sustainable style. Join our community of fashion lovers.')}
                            </p>
                            <div className="footer-socials">
                                <a href="https://facebook.com" target="_blank" rel="noopener noreferrer" className="social-link" title="Facebook"><FaFacebookF /></a>
                                <a href="https://twitter.com" target="_blank" rel="noopener noreferrer" className="social-link" title="Twitter"><FaTwitter /></a>
                                <a href="https://instagram.com" target="_blank" rel="noopener noreferrer" className="social-link" title="Instagram"><FaInstagram /></a>
                                <a href="https://linkedin.com" target="_blank" rel="noopener noreferrer" className="social-link" title="LinkedIn"><FaLinkedinIn /></a>
                            </div>
                        </div>
                    </Col>

                    {/* Shop Columns */}
                    <Col lg={2} md={4} sm={6} className="mb-4 mb-md-0">
                        <div className="footer-col">
                            <h4 className="footer-col-title">{t('footer.shop', 'Shop')}</h4>
                            <ul className="footer-links">
                                <li><Link to="/products">{t('footer.all_products', 'All Products')}</Link></li>
                                <li><Link to="/products?category=women">{t('footer.women', 'Women')}</Link></li>
                                <li><Link to="/products?category=men">{t('footer.men', 'Men')}</Link></li>
                                <li><Link to="/products?category=kids">{t('footer.kids', 'Kids')}</Link></li>
                                <li><Link to="/products?category=home">{t('footer.home', 'Home')}</Link></li>
                            </ul>
                        </div>
                    </Col>

                    <Col lg={2} md={4} sm={6} className="mb-4 mb-md-0">
                        <div className="footer-col">
                            <h4 className="footer-col-title">{t('footer.support', 'Support')}</h4>
                            <ul className="footer-links">
                                <li><Link to="/pages/help-center">{t('footer.help_center', 'Help Center')}</Link></li>
                                <li><Link to="/pages/shipping-info">{t('footer.shipping_info', 'Shipping Info')}</Link></li>
                                <li><Link to="/pages/returns-refunds">{t('footer.returns_refunds', 'Returns & Refunds')}</Link></li>
                                <li><Link to="/pages/item-verification">{t('footer.item_verification', 'Item Verification')}</Link></li>
                                <li><Link to="/pages/safety-center">{t('footer.safety_center', 'Safety Center')}</Link></li>
                            </ul>
                        </div>
                    </Col>

                    <Col lg={4} md={4} sm={12}>
                        <div className="footer-newsletter">
                            <h4 className="footer-col-title">{t('footer.stay_inspired', 'Stay Inspired')}</h4>
                            <p>{t('footer.subscribe_text', 'Subscribe to get the latest trends, sales, and community updates delivered to your inbox.')}</p>
                            <Form className="newsletter-form" onSubmit={handleSubscribe}>
                                <Form.Control
                                    type="email"
                                    placeholder={t('footer.email_placeholder', 'Your email address')}
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                    required
                                    disabled={submitting}
                                />
                                <Button type="submit" className="newsletter-btn" disabled={submitting}>
                                    {submitting ? (
                                        <div className="spinner-border spinner-border-sm" role="status">
                                            <span className="visually-hidden">Loading...</span>
                                        </div>
                                    ) : (
                                        <FaPaperPaperPlane />
                                    )}
                                </Button>
                            </Form>
                            {status.message && (
                                <div className={`newsletter-status mt-2 ${status.type}`} style={{
                                    fontSize: '0.8rem',
                                    color: status.type === 'success' ? '#22c55e' : '#ef4444',
                                    fontWeight: '500'
                                }}>
                                    {status.message}
                                </div>
                            )}
                            <div className="payment-methods mt-4">
                                <FaCcVisa className="payment-icon" title="Visa" size={24} />
                                <FaCcMastercard className="payment-icon" title="Mastercard" size={24} />
                                <FaCcPaypal className="payment-icon" title="PayPal" size={24} />
                                <FaCcApplePay className="payment-icon" title="Apple Pay" size={24} />
                                <FaCcAmazonPay className="payment-icon" title="Amazon Pay" size={24} />
                            </div>
                        </div>
                    </Col>
                </Row>

                <div className="footer-bottom">
                    <div className="copyright">
                        &copy; {new Date().getFullYear()} {t('footer.copyright', 'Vinted Clone Inc. Crafted with passion for a better planet.')}
                    </div>

                    <div className="bottom-links">
                        <Link to="/pages/privacy-policy">{t('footer.privacy_policy', 'Privacy Policy')}</Link>
                        <Link to="/pages/terms-of-service">{t('footer.terms_of_service', 'Terms of Service')}</Link>
                        <Link to="/pages/cookie-settings">{t('footer.cookie_settings', 'Cookie Settings')}</Link>
                    </div>
                </div>
            </Container>
        </footer>
    );
};

// Internal icon fix if needed
const FaPaperPaperPlane = FaPaperPlane;

export default Footer;
