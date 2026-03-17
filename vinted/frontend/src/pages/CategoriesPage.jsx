import React, { useState, useEffect } from 'react';
import { Container } from 'react-bootstrap';
import { Link } from 'react-router-dom';
import { FaChevronLeft, FaChevronRight } from 'react-icons/fa';
import axios from '../utils/axios';
import Meta from '../components/common/Meta';
import { getImageUrl, safeString } from '../utils/constants';

const CategoriesPage = () => {
    const [allCategories, setAllCategories] = useState([]);
    const [loading, setLoading] = useState(true);
    const [settings, setSettings] = useState({ primary_color: '#0ea5e9', pagination_limit: 12 });
    const [page, setPage] = useState(1);

    useEffect(() => {
        const fetchData = async () => {
            try {
                const [catRes, settingsRes] = await Promise.all([
                    axios.get('/api/categories'),
                    axios.get('/api/settings').catch(() => ({ data: null }))
                ]);
                if (Array.isArray(catRes.data)) setAllCategories(catRes.data);
                if (settingsRes.data) setSettings(prev => ({ ...prev, ...settingsRes.data }));
            } catch (err) {
                console.error('Failed to fetch categories:', err);
            } finally {
                setLoading(false);
            }
        };
        fetchData();
    }, []);

    const perPage = settings.pagination_limit || 12;
    const totalPages = Math.ceil(allCategories.length / perPage);
    const categories = allCategories.slice((page - 1) * perPage, page * perPage);

    const pc = settings.primary_color || '#0ea5e9';

    return (
        <div style={{ minHeight: '100vh', background: '#f8fafc', paddingBottom: '60px' }}>
            <Meta title="All Categories" description="Browse all categories on Vinted Marketplace." />
            {/* Page Header */}
            <div style={{ background: 'white', borderBottom: '1px solid #e2e8f0', padding: '32px 0 24px', marginBottom: '40px' }}>
                <Container fluid className="px-md-5 px-3">
                    <div className="d-flex align-items-center gap-2 mb-1" style={{ fontSize: '0.85rem' }}>
                        <Link to="/" style={{ color: '#94a3b8', textDecoration: 'none' }}>Home</Link>
                        <span style={{ color: '#94a3b8' }}>/</span>
                        <span style={{ color: '#1e293b', fontWeight: '600' }}>All Categories</span>
                    </div>
                    <h1 style={{ fontSize: '2rem', fontWeight: '800', color: '#1e293b', margin: 0 }}>Browse Categories</h1>
                    <p style={{ color: '#64748b', marginTop: '8px', marginBottom: 0 }}>
                        {allCategories.length} categories available
                    </p>
                </Container>
            </div>

            <Container fluid className="px-md-5 px-3">
                {loading ? (
                    <div className="vinted-category-grid">
                        {[...Array(6)].map((_, i) => (
                            <div key={i} className="skeleton-box" style={{
                                height: '160px',
                                backgroundColor: '#f1f5f9',
                                borderRadius: '16px',
                                animation: 'sk-blink 1.5s infinite ease-in-out'
                            }}></div>
                        ))}
                    </div>
                ) : (
                    <>
                        {/* 6-column fixed grid */}
                        <div className="vinted-category-grid">
                            {categories.map(cat => (
                                <Link key={cat._id} to={`/categories/${cat.slug}`} style={{ textDecoration: 'none' }}>
                                    <div
                                        style={{
                                            background: 'white',
                                            borderRadius: '16px',
                                            border: '1px solid #e2e8f0',
                                            padding: '20px 12px 16px',
                                            display: 'flex',
                                            flexDirection: 'column',
                                            alignItems: 'center',
                                            justifyContent: 'center',
                                            gap: '12px',
                                            cursor: 'pointer',
                                            transition: 'all 0.25s ease',
                                            boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
                                            // Fixed height so all boxes are same size
                                            height: '160px',
                                        }}
                                        onMouseEnter={e => {
                                            e.currentTarget.style.transform = 'translateY(-5px)';
                                            e.currentTarget.style.borderColor = pc;
                                            e.currentTarget.style.boxShadow = '0 12px 24px rgba(0,0,0,0.08)';
                                        }}
                                        onMouseLeave={e => {
                                            e.currentTarget.style.transform = 'translateY(0)';
                                            e.currentTarget.style.borderColor = '#e2e8f0';
                                            e.currentTarget.style.boxShadow = '0 1px 3px rgba(0,0,0,0.04)';
                                        }}
                                    >
                                        {/* Fixed-size icon/image box */}
                                        <div style={{
                                            width: '72px',
                                            height: '72px',
                                            borderRadius: '14px',
                                            overflow: 'hidden',
                                            display: 'flex',
                                            alignItems: 'center',
                                            justifyContent: 'center',
                                            flexShrink: 0,
                                            background: `${pc}12`,
                                            fontSize: '2.2rem',
                                            lineHeight: 1,
                                        }}>
                                            {cat.image ? (
                                                <img
                                                    src={getImageUrl(cat.image)}
                                                    alt={safeString(cat.name)}
                                                    style={{ width: '100%', height: '100%', objectFit: 'contain', padding: '6px' }}
                                                    onError={e => {
                                                        e.target.style.display = 'none';
                                                        e.target.nextSibling.style.display = 'flex';
                                                    }}
                                                />
                                            ) : null}
                                            <span style={{ display: cat.image ? 'none' : 'flex', alignItems: 'center', justifyContent: 'center', width: '100%', height: '100%' }}>
                                                {cat.icon || '📦'}
                                            </span>
                                        </div>

                                        {/* Name — fixed height, centered, 2 lines max */}
                                        <span style={{
                                            fontSize: '0.83rem',
                                            fontWeight: '700',
                                            color: '#1e293b',
                                            textAlign: 'center',
                                            lineHeight: '1.3',
                                            display: '-webkit-box',
                                            WebkitLineClamp: 2,
                                            WebkitBoxOrient: 'vertical',
                                            overflow: 'hidden',
                                            maxHeight: '2.6em',
                                        }}>
                                            {safeString(cat.name)}
                                        </span>
                                    </div>
                                </Link>
                            ))}
                        </div>

                        {/* Pagination */}
                        {totalPages > 1 && (
                            <div className="d-flex justify-content-center align-items-center gap-3 mt-5">
                                <button
                                    onClick={() => setPage(p => Math.max(1, p - 1))}
                                    disabled={page === 1}
                                    style={{
                                        background: page === 1 ? '#f1f5f9' : pc,
                                        color: page === 1 ? '#94a3b8' : 'white',
                                        border: 'none', borderRadius: '10px',
                                        width: '40px', height: '40px',
                                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                                        cursor: page === 1 ? 'not-allowed' : 'pointer',
                                        transition: 'all 0.2s',
                                    }}
                                >
                                    <FaChevronLeft size={12} />
                                </button>

                                <div className="d-flex gap-2">
                                    {Array.from({ length: totalPages }, (_, i) => i + 1).map(pg => (
                                        <button
                                            key={pg}
                                            onClick={() => setPage(pg)}
                                            style={{
                                                background: pg === page ? pc : 'white',
                                                color: pg === page ? 'white' : '#64748b',
                                                border: `1px solid ${pg === page ? pc : '#e2e8f0'}`,
                                                borderRadius: '10px',
                                                width: '40px', height: '40px',
                                                display: 'flex', alignItems: 'center', justifyContent: 'center',
                                                fontWeight: '700', fontSize: '0.9rem',
                                                cursor: 'pointer', transition: 'all 0.2s',
                                            }}
                                        >
                                            {pg}
                                        </button>
                                    ))}
                                </div>

                                <button
                                    onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                                    disabled={page === totalPages}
                                    style={{
                                        background: page === totalPages ? '#f1f5f9' : pc,
                                        color: page === totalPages ? '#94a3b8' : 'white',
                                        border: 'none', borderRadius: '10px',
                                        width: '40px', height: '40px',
                                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                                        cursor: page === totalPages ? 'not-allowed' : 'pointer',
                                        transition: 'all 0.2s',
                                    }}
                                >
                                    <FaChevronRight size={12} />
                                </button>
                            </div>
                        )}
                    </>
                )}
                <style>{`
                    @keyframes skeleton-blink {
                        0% { opacity: 0.5; }
                        50% { opacity: 1; }
                        100% { opacity: 0.5; }
                    }
                `}</style>
            </Container>
        </div>
    );
};

export default CategoriesPage;
