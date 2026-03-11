import React, { useState, useEffect } from 'react';
import { Container } from 'react-bootstrap';
import { Link } from 'react-router-dom';
import {
    FaMobileAlt, FaHome, FaTv, FaTshirt, FaFutbol, FaEllipsisH,
    FaShoppingBag, FaGem, FaChild, FaDice, FaGamepad, FaBox
} from 'react-icons/fa';
import axios from '../../utils/axios';
import { useTranslation } from 'react-i18next';
import { safeString } from '../../utils/constants';

const CategoriesSection = () => {
    const { t } = useTranslation();
    const [categories, setCategories] = useState([]);
    const [loading, setLoading] = useState(true);

    // Fallback static categories using original colorful emoji icons
    const staticCategories = [
        { _id: '1', slug: 'women', name: 'Women', icon: '👗' },
        { _id: '2', slug: 'men', name: 'Men', icon: '👕' },
        { _id: '3', slug: 'designer', name: 'Designer', icon: '✨' },
        { _id: '4', slug: 'kids', name: 'Kids', icon: '🧒' },
        { _id: '5', slug: 'home', name: 'Home', icon: '🏠' },
        { _id: '6', slug: 'electronics', name: 'Electronics', icon: '💻' },
        { _id: '7', slug: 'entertainment', name: 'Entertainment', icon: '🎬' },
    ];

    useEffect(() => {
        const fetchCategories = async () => {
            try {
                // Attempt to fetch from API
                const res = await axios.get('/api/categories');
                if (Array.isArray(res.data) && res.data.length > 0) {
                    setCategories(res.data);
                } else {
                    console.log("No categories array received, using fallbacks");
                    setCategories(staticCategories);
                }
            } catch (err) {
                console.error("Error fetching categories:", err);
                setCategories(staticCategories);
            } finally {
                setLoading(false);
            }
        };

        fetchCategories();
    }, []);

    // Determine how many items to show in one row (e.g., 7 items max)
    const ITEMS_PER_ROW = 7;
    const displayCategories = categories.length > 0 ? categories.slice(0, ITEMS_PER_ROW) : staticCategories;

    return (
        <section className="categories-section py-5">
            <Container fluid className="px-md-5 px-3">
                <div className="d-flex justify-content-between align-items-center mb-4">
                    <h2 className="section-title mb-0">{t('home.browse_categories', 'Browse Items by Category')}</h2>
                    <Link to="/categories" className="view-all-link">{t('home.view_all', 'View all')}</Link>
                </div>

                <div className="categories-grid seven-col">
                    {displayCategories.map((cat, index) => {
                        return (
                            <Link
                                key={cat._id}
                                to={`/categories/${cat.slug}`}
                                className="category-card"
                            >
                                <div className="category-icon-wrapper">
                                    <div className="category-icon">
                                        {cat.image ? (
                                            <img
                                                src={`${axios.defaults.baseURL || ''}/${cat.image.replace(/^\/+/, '')}`}
                                                alt={safeString(cat.name)}
                                                className="cat-img"
                                                onError={(e) => {
                                                    e.target.style.display = 'none';
                                                    const next = e.target.nextSibling;
                                                    if (next) next.style.display = 'block';
                                                }}
                                            />
                                        ) : null}
                                        <span className="cat-icon-span" style={{ display: cat.image ? 'none' : 'block' }}>
                                            {cat.icon || <FaBox />}
                                        </span>
                                    </div>
                                </div>
                                <span className="category-label">{safeString(cat.name)}</span>
                            </Link>
                        );
                    })}
                </div>
            </Container>
        </section>
    );
};

export default CategoriesSection;
