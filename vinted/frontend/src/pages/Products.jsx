import React, { useEffect, useState, useRef, useCallback } from 'react';
import { Row, Col } from 'react-bootstrap';
import axios from '../utils/axios';
import { useLocation, Link, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import ItemCard from '../components/common/ItemCard';
import { FaThList, FaList, FaSearch, FaAngleLeft, FaAngleRight, FaRedo } from 'react-icons/fa';

const SkeletonLoader = () => (
    <div className="skeleton-item" style={{
        width: '100%',
        marginBottom: '20px',
        animation: 'skeleton-blink 1.5s infinite ease-in-out'
    }}>
        <div style={{
            width: '100%',
            aspectRatio: '3/4',
            backgroundColor: '#f1f5f9',
            borderRadius: '12px',
            marginBottom: '12px'
        }}></div>
        <div style={{ width: '60%', height: '14px', backgroundColor: '#f1f5f9', borderRadius: '4px', marginBottom: '8px' }}></div>
        <div style={{ width: '40%', height: '12px', backgroundColor: '#f1f5f9', borderRadius: '4px' }}></div>
        <style>{`
            @keyframes skeleton-blink {
                0% { opacity: 0.5; }
                50% { opacity: 1; }
                100% { opacity: 0.5; }
            }
        `}</style>
    </div>
);

const Products = () => {
    const { t } = useTranslation();
    const [items, setItems] = useState([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);
    const [totalCount, setTotalCount] = useState(0);
    const [page, setPage] = useState(1);
    const [totalPages, setTotalPages] = useState(1);
    const [paginationMode, setPaginationMode] = useState('scroll'); // 'scroll' or 'number'

    const location = useLocation();
    const navigate = useNavigate();
    const queryParams = new URLSearchParams(location.search);

    const categorySlug = queryParams.get('category');
    const subcategorySlug = queryParams.get('subcategory');
    const itemTypeSlug = queryParams.get('itemType');
    const search = queryParams.get('search');
    const sort = queryParams.get('sort');

    const observer = useRef();

    // Reset state on new search/category filters
    useEffect(() => {
        setItems([]);
        setPage(1);
        setTotalCount(0);
        // Reset mode to scroll on new filter? Probably yes for consistency
        setPaginationMode('scroll');
    }, [categorySlug, subcategorySlug, itemTypeSlug, search, sort]);

    // Fetch items
    const fetchItems = useCallback(async (pageNum, isScroll = false) => {
        try {
            setLoading(true);
            const params = {
                page: pageNum,
                limit: 12, // User requested 12
                category: categorySlug,
                subcategory: subcategorySlug,
                itemType: itemTypeSlug,
                search: search, // Pass search param
                sort: sort
            };

            const response = await axios.get('/api/items', { params });
            const { items: newItems, totalCount, totalPages } = response.data;

            setTotalCount(totalCount);
            setTotalPages(totalPages);

            if (isScroll) {
                setItems(prev => {
                    const existingIds = new Set(prev.map(i => i._id));
                    const uniqueNew = newItems.filter(i => !existingIds.has(i._id));
                    return [...prev, ...uniqueNew];
                });
            } else {
                setItems(newItems);
            }
        } catch (err) {
            console.error(err);
            setError('Failed to fetch items');
        } finally {
            setLoading(false);
        }
    }, [categorySlug, subcategorySlug, itemTypeSlug, search, sort]);

    // Initial fetch and Number Pagination change
    useEffect(() => {
        if (paginationMode === 'number') {
            fetchItems(page, false);
        } else {
            // In scroll mode, fetch page 1 if just switched or reset
            if (page === 1) fetchItems(1, true);
        }
    }, [page, paginationMode, fetchItems]);


    // Infinite Scroll Observer
    const lastItemElementRef = useCallback(node => {
        if (loading) return;
        if (paginationMode === 'number') return;
        if (observer.current) observer.current.disconnect();

        observer.current = new IntersectionObserver(entries => {
            if (entries[0].isIntersecting && page < totalPages) {
                setPage(prevPage => prevPage + 1);
            }
        });

        if (node) observer.current.observe(node);
    }, [loading, paginationMode, page, totalPages]);

    // Handle Scroll logic: When page increments in scroll mode, fetch new items
    useEffect(() => {
        if (paginationMode === 'scroll' && page > 1) {
            fetchItems(page, true);
        }
    }, [page, paginationMode, fetchItems]);

    const handleModeSwitch = (mode) => {
        if (mode === paginationMode) return;
        setItems([]); // Clear explicitly to avoid mixing
        setPage(1);
        setPaginationMode(mode);
    };

    // Helpers for Breadcrumbs
    const formatSlug = (slug) => slug ? slug.split('-').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ') : '';

    const renderBreadcrumbs = () => {
        // "if popular section newest section was clciked then this searched field is hide show the counts of search results"
        // Wait, user said "if popular... just hide this show nothing". 
        // Showing "nothing" means hiding the entire context line?
        // "simialry if catgory name -> then all was selected then just show category name"

        if (sort === 'popular' || sort === 'newest') return null;

        const parts = [];
        // Determine what to show
        if (search) {
            // If search text exists
            return <span className="text-muted">"{search}"</span>;
        }

        // Categories
        if (categorySlug) parts.push(formatSlug(categorySlug));
        if (subcategorySlug) parts.push(formatSlug(subcategorySlug));
        if (itemTypeSlug) parts.push(formatSlug(itemTypeSlug));

        if (parts.length === 0) return null; // Hide if no filters

        return (
            <span className="text-muted">
                {parts.join(' -> ')}
            </span>
        );
    };

    const breadcrumbs = renderBreadcrumbs();

    return (
        <div style={{ backgroundColor: '#fff', minHeight: '80vh' }}> {/* "background white" */}
            <div className="container-fluid px-md-5 px-3 py-5"> {/* "same padding for all pages" */}

                {/* Attractive Centered Heading */}
                <h1 className="text-center mb-5 fw-bold" style={{ color: '#1a2332', letterSpacing: '-0.5px' }}>
                    {t('products.shop_collection')}
                </h1>

                {/* Header / Context Bar */}
                {/* "remove the line" -> no border-bottom */}
                <div className="d-flex flex-column flex-md-row justify-content-between align-items-end mb-4">

                    {/* Left: Context */}
                    <div>
                        <div style={{ fontSize: '0.85rem', color: '#64748b', display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <span>{t('products.search_results')}</span>
                            <span style={{ color: '#0ea5e9', fontWeight: 'bold' }}>{totalCount}</span>

                            {!(sort === 'popular' || sort === 'newest') && breadcrumbs && (
                                <>
                                    <div style={{ borderLeft: '2px solid #cbd5e1', height: '20px', margin: '0 10px' }}></div>
                                    <span>{t('products.searched_for')}</span>
                                    {breadcrumbs}
                                </>
                            )}
                        </div>
                    </div>

                    {/* Right: Pagination Mode Toggle & Refresh */}
                    <div className="d-flex align-items-center gap-2 mt-3 mt-md-0">
                        {totalCount > 12 && (
                            <div className="pagination-mode-toggle d-flex align-items-center gap-2">
                                <div className="btn-group shadow-sm" role="group">
                                    <button
                                        type="button"
                                        className="btn btn-sm"
                                        style={{
                                            backgroundColor: paginationMode === 'scroll' ? '#0ea5e9' : 'white',
                                            color: paginationMode === 'scroll' ? 'white' : '#64748b',
                                            border: '1px solid #e2e8f0',
                                            borderRadius: '8px 0 0 8px',
                                            fontWeight: '500'
                                        }}
                                        onClick={() => handleModeSwitch('scroll')}
                                    >
                                        {t('products.scroll')}
                                    </button>
                                    <button
                                        type="button"
                                        className="btn btn-sm"
                                        style={{
                                            backgroundColor: paginationMode === 'number' ? '#0ea5e9' : 'white',
                                            color: paginationMode === 'number' ? 'white' : '#64748b',
                                            border: '1px solid #e2e8f0',
                                            borderRadius: '0 8px 8px 0',
                                            fontWeight: '500',
                                            borderLeft: 'none'
                                        }}
                                        onClick={() => handleModeSwitch('number')}
                                    >
                                        {t('products.page')}
                                    </button>
                                </div>
                            </div>
                        )}
                        <button
                            type="button"
                            className="btn btn-sm btn-outline-secondary"
                            style={{ borderRadius: '8px', padding: '6px 12px' }}
                            onClick={() => fetchItems(1, false)}
                            title="Refresh"
                        >
                            <FaRedo />
                        </button>
                    </div>
                </div>

                {/* Loading State (Initial) */}
                {loading && items.length === 0 && (
                    <Row className="g-4">
                        {[...Array(8)].map((_, i) => (
                            <Col key={i} xs={6} md={4} lg={3}>
                                <SkeletonLoader />
                            </Col>
                        ))}
                    </Row>
                )}

                {/* Grid */}
                <Row className="g-4">
                    {items.map((item, index) => {
                        if (items.length === index + 1 && paginationMode === 'scroll') {
                            return (
                                <Col ref={lastItemElementRef} key={item._id} xs={6} md={4} lg={3} xl={3} className="d-flex align-items-stretch fade-in">
                                    <ItemCard item={item} />
                                </Col>
                            );
                        } else {
                            return (
                                <Col key={item._id} xs={6} md={4} lg={3} xl={3} className="d-flex align-items-stretch fade-in">
                                    <ItemCard item={item} />
                                </Col>
                            );
                        }
                    })}
                </Row>

                {/* Empty State */}
                {!loading && items.length === 0 && !error && (
                    <div className="text-center py-5 text-muted">
                        <FaSearch style={{ fontSize: '3rem', marginBottom: '1rem', opacity: 0.3 }} />
                        <h4>{t('products.no_items_found')}</h4>
                        <p>{t('products.adjust_search')}</p>
                    </div>
                )}

                {/* Scroll Loading Indicator */}
                {loading && paginationMode === 'scroll' && items.length > 0 && (
                    <div className="text-center py-4">
                        <div className="spinner-grow spinner-grow-sm text-primary mx-1" role="status" />
                        <div className="spinner-grow spinner-grow-sm text-primary mx-1" role="status" />
                        <div className="spinner-grow spinner-grow-sm text-primary mx-1" role="status" />
                    </div>
                )}

                {/* Number Pagination Controls */}
                {paginationMode === 'number' && totalPages > 1 && (
                    <div className="d-flex justify-content-center align-items-center gap-2 mt-5">
                        <button
                            className="btn btn-outline-secondary btn-sm"
                            disabled={page === 1}
                            onClick={() => setPage(p => Math.max(1, p - 1))}
                        >
                            <FaAngleLeft /> {t('products.prev')}
                        </button>

                        <span style={{ fontSize: '0.9rem', color: '#64748b' }}>
                            {t('products.page_of', { current: page, total: totalPages })}
                        </span>

                        <button
                            className="btn btn-outline-secondary btn-sm"
                            disabled={page === totalPages}
                            onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                        >
                            {t('products.next')} <FaAngleRight />
                        </button>
                    </div>
                )}
            </div>
        </div>
    );
};

export default Products;
