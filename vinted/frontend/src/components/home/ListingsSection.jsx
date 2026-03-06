import React, { useState, useEffect, useRef } from 'react';
import { Container, Row, Col, Button } from 'react-bootstrap';
import { Link } from 'react-router-dom';
import axios from '../../utils/axios';
import ItemCard from '../common/ItemCard';
import { useTranslation } from 'react-i18next';

const ListingsSection = () => {
    const { t } = useTranslation();
    const [activeTab, setActiveTab] = useState('popular'); // Default to popular
    const [popularItems, setPopularItems] = useState([]);
    const [newestItems, setNewestItems] = useState([]);
    const [loading, setLoading] = useState(true);
    const [primaryColor, setPrimaryColor] = useState('#0ea5e9');

    // Fetch primary color
    useEffect(() => {
        const fetchSettings = async () => {
            try {
                const res = await axios.get('/api/settings');
                if (res.data && res.data.primary_color) {
                    setPrimaryColor(res.data.primary_color);
                }
            } catch (err) {
                console.error("Error fetching settings:", err);
            }
        };
        fetchSettings();
    }, []);

    // Fetch items
    useEffect(() => {
        const fetchData = async () => {
            setLoading(true);
            try {
                const [popularRes, newestRes] = await Promise.all([
                    axios.get('/api/items?sort=popular&limit=8'),
                    axios.get('/api/items?sort=newest&limit=8')
                ]);
                setPopularItems(popularRes.data.items || []);
                setNewestItems(newestRes.data.items || []);
            } catch (err) {
                console.error("Error fetching items:", err);
            } finally {
                setLoading(false);
            }
        };
        fetchData();
    }, []);

    // Refs for tabs to animate underline
    const tabsRef = useRef(null);
    const [lineStyle, setLineStyle] = useState({});

    useEffect(() => {
        if (tabsRef.current) {
            const activeElement = tabsRef.current.querySelector(`.tab-item[data-tab="${activeTab}"]`);
            if (activeElement) {
                const { offsetLeft, offsetWidth } = activeElement;
                // 80% width, centered
                const lineWidth = offsetWidth * 0.8;
                const lineLeft = offsetLeft + (offsetWidth - lineWidth) / 2;

                setLineStyle({
                    left: `${lineLeft}px`,
                    width: `${lineWidth}px`,
                    backgroundColor: primaryColor
                });
            }
        }
    }, [activeTab, primaryColor]);

    if (!loading && popularItems.length === 0 && newestItems.length === 0) {
        return null; // Hide section if no items
    }

    const displayItems = activeTab === 'popular' ? popularItems : newestItems;

    return (
        <section className="listings-section py-5" style={{ backgroundColor: '#f8fafc', minHeight: '600px' }}>
            <Container fluid className="px-md-5 px-3">
                {/* Tabs */}
                <div className="section-tabs-container mb-4 position-relative" style={{ borderBottom: '2px solid #e2e8f0', display: 'inline-block', width: '100%' }}>
                    <div ref={tabsRef} className="d-flex gap-5" style={{ position: 'relative', paddingBottom: '12px' }}>
                        <span
                            className="tab-item"
                            data-tab="popular"
                            onMouseEnter={() => setActiveTab('popular')}
                            onClick={() => setActiveTab('popular')}
                            style={{
                                fontSize: '1.5rem',
                                fontWeight: '700',
                                cursor: 'pointer',
                                color: activeTab === 'popular' ? primaryColor : '#94a3b8',
                                transition: 'color 0.3s ease'
                            }}
                        >
                            {t('home.popular_items', 'Popular Items')}
                        </span>
                        <span
                            className="tab-item"
                            data-tab="newest"
                            onMouseEnter={() => setActiveTab('newest')}
                            onClick={() => setActiveTab('newest')}
                            style={{
                                fontSize: '1.5rem',
                                fontWeight: '700',
                                cursor: 'pointer',
                                color: activeTab === 'newest' ? primaryColor : '#94a3b8',
                                transition: 'color 0.3s ease'
                            }}
                        >
                            {t('home.newest_listings', 'Newest Listings')}
                        </span>

                        {/* Animated Line */}
                        <div
                            className="tab-line"
                            style={{
                                position: 'absolute',
                                bottom: '-2px', // Overlap border
                                height: '3px',
                                borderRadius: '3px',
                                transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                                ...lineStyle
                            }}
                        />
                    </div>
                </div>

                {/* Grid */}
                <Row className="g-4 mb-5">
                    {displayItems.length > 0 ? (
                        displayItems.map(item => (
                            <Col key={item._id} xs={6} sm={6} md={4} lg={3} className="d-flex align-items-stretch">
                                <ItemCard item={item} />
                            </Col>
                        ))
                    ) : (
                        <Col className="text-center py-5">
                            <p className="text-muted">No items found in this category.</p>
                        </Col>
                    )}
                </Row>

                {/* Load More Button */}
                <div className="text-center">
                    <Link to="/products" className="text-decoration-none">
                        <Button
                            variant="outline-dark"
                            className="btn-load-more"
                            style={{
                                border: `2px solid ${primaryColor}`,
                                color: primaryColor,
                                fontWeight: 'bold',
                                padding: '12px 40px',
                                borderRadius: '8px',
                                transition: 'all 0.3s ease',
                                background: 'transparent'
                            }}
                            onMouseEnter={(e) => {
                                e.target.style.backgroundColor = primaryColor;
                                e.target.style.color = 'white';
                            }}
                            onMouseLeave={(e) => {
                                e.target.style.backgroundColor = 'transparent';
                                e.target.style.color = primaryColor;
                            }}
                        >
                            {t('home.see_more', 'See more')}
                        </Button>
                    </Link>
                </div>
            </Container>
        </section>
    );
};

export default ListingsSection;
