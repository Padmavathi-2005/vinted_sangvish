import React, { useState, useEffect } from 'react';
import { Container } from 'react-bootstrap';
import { Link, useParams, useNavigate } from 'react-router-dom';
import { FaChevronLeft, FaChevronRight } from 'react-icons/fa';
import axios from '../utils/axios';
import { getImageUrl, safeString } from '../utils/constants';

const CategoryPage = () => {
    const { slug } = useParams();
    const navigate = useNavigate();
    const [category, setCategory] = useState(null);
    const [allSubcategories, setAllSubcategories] = useState([]);
    const [loading, setLoading] = useState(true);
    const [settings, setSettings] = useState({ primary_color: '#0ea5e9', pagination_limit: 12 });
    const [page, setPage] = useState(1);

    useEffect(() => {
        const fetchData = async () => {
            setLoading(true);
            try {
                const [catRes, settingsRes] = await Promise.all([
                    axios.get('/api/categories/full').catch(() => ({ data: [] })),
                    axios.get('/api/settings').catch(() => ({ data: null }))
                ]);
                if (settingsRes.data) setSettings(prev => ({ ...prev, ...settingsRes.data }));
                const allCats = Array.isArray(catRes.data) ? catRes.data : [];
                const found = allCats.find(c => c.slug === slug);
                if (found) {
                    setCategory(found);
                    setAllSubcategories(found.subcategories || []);
                }
            } catch (err) {
                console.error('Failed to fetch category:', err);
            } finally {
                setLoading(false);
            }
        };
        fetchData();
        setPage(1);
    }, [slug]);

    const pc = settings.primary_color || '#0ea5e9';
    const perPage = settings.pagination_limit || 12;
    const totalPages = Math.ceil(allSubcategories.length / perPage);
    const subcategories = allSubcategories.slice((page - 1) * perPage, page * perPage);

    if (loading) {
        return (
            <div style={{ minHeight: '100vh', background: '#f8fafc', paddingBottom: '60px' }}>
                {/* Page Header Skeleton */}
                <div style={{ background: 'white', borderBottom: '1px solid #e2e8f0', padding: '32px 0 24px', marginBottom: '40px' }}>
                    <Container fluid className="px-md-5 px-3">
                        <div className="d-flex align-items-center gap-2 mb-2" style={{ fontSize: '0.85rem' }}>
                            <div className="skeleton-box" style={{ width: '60px', height: '18px', borderRadius: '4px' }}></div>
                            <span style={{ color: '#94a3b8' }}>/</span>
                            <div className="skeleton-box" style={{ width: '100px', height: '18px', borderRadius: '4px' }}></div>
                            <span style={{ color: '#94a3b8' }}>/</span>
                            <div className="skeleton-box" style={{ width: '80px', height: '18px', borderRadius: '4px' }}></div>
                        </div>
                        <div className="d-flex align-items-center gap-4">
                            <div className="skeleton-box" style={{ width: '64px', height: '64px', borderRadius: '14px', flexShrink: 0 }}></div>
                            <div>
                                <div className="skeleton-box" style={{ width: '200px', height: '32px', borderRadius: '4px', marginBottom: '8px' }}></div>
                                <div className="skeleton-box" style={{ width: '300px', height: '20px', borderRadius: '4px' }}></div>
                            </div>
                        </div>
                    </Container>
                </div>
                {/* Content Skeleton */}
                <Container fluid className="px-md-5 px-3">
                    <div style={{
                        display: 'grid',
                        gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))',
                        gap: '20px'
                    }}>
                        {[...Array(12)].map((_, i) => (
                            <div key={i} className="skeleton-box" style={{
                                height: '160px',
                                backgroundColor: '#f1f5f9',
                                borderRadius: '16px',
                                animation: 'skeleton-blink 1.5s infinite ease-in-out'
                            }}></div>
                        ))}
                    </div>
                </Container>
            </div>
        );
    }

    if (!category) {
        return (
            <div className="d-flex flex-column justify-content-center align-items-center" style={{ minHeight: '60vh', gap: '16px' }}>
                <h2 style={{ color: '#1e293b' }}>Category not found</h2>
                <Link to="/categories" style={{ color: pc }}>Browse all categories</Link>
            </div>
        );
    }

    // Card component shared between both pages
    const CategoryCard = ({ item, onClick }) => (
        <div
            onClick={onClick}
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
            <div style={{
                width: '72px', height: '72px',
                borderRadius: '14px', overflow: 'hidden',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                flexShrink: 0,
                background: `${pc}12`,
                fontSize: '2.2rem', lineHeight: 1,
            }}>
                {item.image ? (
                    <img
                        src={getImageUrl(item.image)}
                        alt={safeString(item.name)}
                        style={{ width: '100%', height: '100%', objectFit: 'contain', padding: '6px' }}
                        onError={e => {
                            e.target.style.display = 'none';
                            e.target.nextSibling.style.display = 'flex';
                        }}
                    />
                ) : null}
                <span style={{ display: item.image ? 'none' : 'flex', alignItems: 'center', justifyContent: 'center', width: '100%', height: '100%' }}>
                    {item.icon || '🏷️'}
                </span>
            </div>
            <span style={{
                fontSize: '0.83rem', fontWeight: '700', color: '#1e293b',
                textAlign: 'center', lineHeight: '1.3',
                display: '-webkit-box', WebkitLineClamp: 2,
                WebkitBoxOrient: 'vertical', overflow: 'hidden', maxHeight: '2.6em',
            }}>
                {safeString(item.name)}
            </span>
        </div>
    );

    const Pagination = () => totalPages <= 1 ? null : (
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
                    cursor: page === 1 ? 'not-allowed' : 'pointer', transition: 'all 0.2s',
                }}
            >
                <FaChevronLeft size={12} />
            </button>
            <div className="d-flex gap-2">
                {Array.from({ length: totalPages }, (_, i) => i + 1).map(pg => (
                    <button key={pg} onClick={() => setPage(pg)} style={{
                        background: pg === page ? pc : 'white',
                        color: pg === page ? 'white' : '#64748b',
                        border: `1px solid ${pg === page ? pc : '#e2e8f0'}`,
                        borderRadius: '10px', width: '40px', height: '40px',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        fontWeight: '700', fontSize: '0.9rem', cursor: 'pointer', transition: 'all 0.2s',
                    }}>
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
                    cursor: page === totalPages ? 'not-allowed' : 'pointer', transition: 'all 0.2s',
                }}
            >
                <FaChevronRight size={12} />
            </button>
        </div>
    );

    return (
        <div style={{ minHeight: '100vh', background: '#f8fafc', paddingBottom: '60px' }}>
            {/* Page Header */}
            <div style={{ background: 'white', borderBottom: '1px solid #e2e8f0', padding: '32px 0 24px', marginBottom: '40px' }}>
                <Container fluid className="px-md-5 px-3">
                    <div className="d-flex align-items-center gap-2 mb-2" style={{ fontSize: '0.85rem' }}>
                        <Link to="/" style={{ color: '#94a3b8', textDecoration: 'none' }}>Home</Link>
                        <span style={{ color: '#94a3b8' }}>/</span>
                        <Link to="/categories" style={{ color: '#94a3b8', textDecoration: 'none' }}>All Categories</Link>
                        <span style={{ color: '#94a3b8' }}>/</span>
                        <span style={{ color: '#1e293b', fontWeight: '600' }}>{safeString(category.name)}</span>
                    </div>

                    <div className="d-flex align-items-center gap-4">
                        <div style={{
                            width: '64px', height: '64px', borderRadius: '14px', overflow: 'hidden',
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            background: `${pc}12`, fontSize: '2.2rem', flexShrink: 0,
                        }}>
                            {category.image ? (
                                <img src={getImageUrl(category.image)} alt={safeString(category.name)}
                                    style={{ width: '100%', height: '100%', objectFit: 'contain', padding: '6px' }} />
                            ) : <span>{category.icon || '📦'}</span>}
                        </div>
                        <div>
                            <h1 style={{ fontSize: '2rem', fontWeight: '800', color: '#1e293b', margin: 0 }}>{safeString(category.name)}</h1>
                            <p style={{ color: '#64748b', marginTop: '4px', marginBottom: 0 }}>
                                {allSubcategories.length > 0
                                    ? `${allSubcategories.length} subcategories · Select one to browse items`
                                    : 'Click below to browse all items in this category'}
                            </p>
                        </div>
                    </div>
                </Container>
            </div>

            <Container fluid className="px-md-5 px-3">
                {allSubcategories.length === 0 ? (
                    <div className="text-center py-5">
                        <p style={{ color: '#64748b' }}>No subcategories found.</p>
                        <button
                            onClick={() => navigate(`/categories/${slug}/all`)}
                            style={{
                                background: pc, color: 'white',
                                border: 'none', borderRadius: '24px', padding: '12px 32px',
                                fontWeight: '700', cursor: 'pointer', marginTop: '12px'
                            }}
                        >
                            Browse All {safeString(category.name)} Items
                        </button>
                    </div>
                ) : (
                    <>
                        <div style={{
                            display: 'grid',
                            gridTemplateColumns: 'repeat(6, 1fr)',
                            gap: '16px',
                        }}>
                            {/* "All" card to browse entire category */}
                            <CategoryCard
                                item={{ name: `All ${safeString(category.name)}`, icon: '🛍️', image: null }}
                                onClick={() => navigate(`/categories/${slug}/all`)}
                            />
                            {subcategories.map(sub => (
                                <CategoryCard
                                    key={sub._id}
                                    item={sub}
                                    onClick={() => navigate(`/categories/${slug}/${sub.slug}`)}
                                />
                            ))}
                        </div>
                        <Pagination />
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

export default CategoryPage;
