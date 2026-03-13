import React, { useState, useEffect, useCallback, useRef, useContext } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Row, Col, Offcanvas, Button, Badge, Accordion } from 'react-bootstrap';
import { FaSearch, FaAngleLeft, FaAngleRight, FaFilter } from 'react-icons/fa';
import axios from '../utils/axios';
import FilterPill from '../components/common/FilterPill';
import CurrencyContext from '../context/CurrencyContext';
import ItemCard from '../components/common/ItemCard';
import Meta from '../components/common/Meta';

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
    const { currentCurrency } = useContext(CurrencyContext);
    const queryParams = new URLSearchParams(location.search);

    const categorySlug = queryParams.get('category');
    const subcategorySlug = queryParams.get('subcategory');
    const itemTypeSlug = queryParams.get('itemType');
    const search = queryParams.get('search');
    
    // New Filters
    const [size, setSize] = useState(queryParams.get('size') || '');
    const [brand, setBrand] = useState(queryParams.get('brand') || '');
    const [condition, setCondition] = useState(queryParams.get('condition') || '');
    const [color, setColor] = useState(queryParams.get('color') || '');
    const [minPrice, setMinPrice] = useState(queryParams.get('minPrice') || '');
    const [maxPrice, setMaxPrice] = useState(queryParams.get('maxPrice') || '');
    const [material, setMaterial] = useState(queryParams.get('material') || '');
    const [sort, setSort] = useState(queryParams.get('sort') || 'popular');

    const [categories, setCategories] = useState([]);
    const [showMobileFilters, setShowMobileFilters] = useState(false);

    const observer = useRef();

    // Fetch filters available (categories)
    useEffect(() => {
        const fetchMeta = async () => {
            try {
                const { data } = await axios.get('/api/categories/full');
                setCategories(data);
            } catch (err) { console.error('Error fetching categories:', err); }
        };
        fetchMeta();
    }, []);

    // Sync state with URL params (handles back button and direct navigation)
    useEffect(() => {
        setSize(queryParams.get('size') || '');
        setBrand(queryParams.get('brand') || '');
        setCondition(queryParams.get('condition') || '');
        setColor(queryParams.get('color') || '');
        setMinPrice(queryParams.get('minPrice') || '');
        setMaxPrice(queryParams.get('maxPrice') || '');
        setMaterial(queryParams.get('material') || '');
        setSort(queryParams.get('sort') || 'popular');
    }, [queryParams]);

    // Reset items only when actual search parameters change or currency changes
    useEffect(() => {
        setItems([]);
        setPage(1);
        setTotalCount(0);
        setPaginationMode('scroll');
    }, [categorySlug, subcategorySlug, itemTypeSlug, search, sort, size, brand, condition, color, minPrice, maxPrice, material, currentCurrency]);

    // Fetch items
    const fetchItems = useCallback(async (pageNum, isScroll = false) => {
        try {
            setLoading(true);
            const params = {
                page: pageNum,
                limit: 12,
                category: categorySlug,
                subcategory: subcategorySlug,
                itemType: itemTypeSlug,
                search: search,
                sort,
                size,
                brand,
                condition,
                color,
                minPrice,
                maxPrice,
                material,
                user_exchange_rate: currentCurrency?.exchange_rate || 1
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
    }, [categorySlug, subcategorySlug, itemTypeSlug, search, sort, size, brand, condition, color, minPrice, maxPrice, material, currentCurrency]);

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

    const handleFilterChange = (key, val) => {
        const newParams = new URLSearchParams(location.search);
        
        if (typeof val === 'object' && val !== null) {
            // Special case for price range { min: x, max: y }
            Object.keys(val).forEach(k => {
                const paramKey = k === 'min' ? 'minPrice' : 'maxPrice';
                if (val[k]) newParams.set(paramKey, val[k]);
                else newParams.delete(paramKey);
            });
            setMinPrice(val.min || '');
            setMaxPrice(val.max || '');
        } else {
            if (val) newParams.set(key, val);
            else newParams.delete(key);
            
            // Update local state for immediate feedback
            if (key === 'category') {
                // When category changes, reset subcategory
                newParams.delete('subcategory');
                newParams.delete('itemType');
            }
            if (key === 'subcategory') newParams.delete('itemType');
            
            if (key === 'size') setSize(val);
            if (key === 'brand') setBrand(val);
            if (key === 'condition') setCondition(val);
            if (key === 'color') setColor(val);
            if (key === 'material') setMaterial(val);
            if (key === 'sort') setSort(val);
        }
        
        newParams.set('page', '1');
        navigate(`/products?${newParams.toString()}`);
    };

    const clearAllFilters = () => {
        navigate('/products');
        setSize(''); setBrand(''); setCondition(''); setColor(''); setMinPrice(''); setMaxPrice(''); setMaterial(''); setSort('popular');
    };

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

        if (sort === 'popular') return null;

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
            <Meta 
                title={search ? `Results for "${search}"` : (categorySlug ? formatSlug(categorySlug) : "All Products")}
                description={`Explore our collection of ${search ? `"${search}"` : (categorySlug ? formatSlug(categorySlug) : "fashion")} items. Find unique pieces, brand names, and affordable style.`}
            />
            <div className="container-fluid px-md-5 px-3 py-5"> {/* "same padding for all pages" */}

                {/* Attractive Centered Heading */}
                <h1 className="text-center mb-4 fw-bold" style={{ color: '#1a2332', letterSpacing: '-0.5px' }}>
                    {t('products.shop_collection')}
                </h1>

                {/* Filters Bar - Desktop */}
                <div className="filter-bar d-none d-md-flex flex-wrap gap-2 mb-4 p-3 bg-white shadow-sm" style={{ borderRadius: '16px', border: '1px solid #f1f5f9' }}>
                    {search && (
                        <FilterPill 
                            label={`Search: "${search}"`} 
                            value={search} 
                            onChange={() => {}} 
                            onClear={() => handleFilterChange('search', '')} 
                        />
                    )}

                    <FilterPill 
                        label="Sort" 
                        value={sort} 
                        options={[
                            { value: 'popular', label: 'Relevance' },
                            { value: 'price_asc', label: 'Price: Low to High' },
                            { value: 'price_desc', label: 'Price: High to Low' },
                            { value: 'discounted', label: 'Sale Items' },
                            { value: 'oldest', label: 'Oldest First' }
                        ]}
                        onChange={(val) => handleFilterChange('sort', val)}
                        onClear={() => handleFilterChange('sort', 'popular')}
                    />

                    <FilterPill 
                        label="Category" 
                        value={categorySlug} 
                        options={categories.map(c => ({ value: c.slug, label: c.name }))}
                        onChange={(val) => handleFilterChange('category', val)}
                        onClear={() => handleFilterChange('category', '')}
                    />

                    <FilterPill 
                        label="Style & Type" 
                        value={subcategorySlug} 
                        options={
                            categorySlug 
                            ? (categories.find(c => c.slug === categorySlug)?.subcategories || []).map(s => ({ value: s.slug, label: s.name }))
                            : []
                        }
                        onChange={(val) => handleFilterChange('subcategory', val)}
                        onClear={() => handleFilterChange('subcategory', '')}
                    />

                    <FilterPill 
                        label="Size" 
                        value={size} 
                        options={[
                            { value: 'XS', label: 'XS' }, { value: 'S', label: 'S' }, { value: 'M', label: 'M' }, 
                            { value: 'L', label: 'L' }, { value: 'XL', label: 'XL' }, { value: 'XXL', label: 'XXL' }
                        ]}
                        onChange={(val) => handleFilterChange('size', val)}
                        onClear={() => handleFilterChange('size', '')}
                    />

                    <FilterPill 
                        label="Color" 
                        type="color"
                        value={color} 
                        options={[
                            { value: 'Black', label: 'Black' }, { value: 'White', label: 'White' },
                            { value: 'Red', label: 'Red' }, { value: 'Blue', label: 'Blue' },
                            { value: 'Green', label: 'Green' }, { value: 'Yellow', label: 'Yellow' }
                        ]}
                        onChange={(val) => handleFilterChange('color', val)}
                        onClear={() => handleFilterChange('color', '')}
                    />

                    <FilterPill 
                        label="Condition" 
                        value={condition} 
                        options={[
                            { value: 'New', label: 'New' }, { value: 'Very Good', label: 'Very Good' },
                            { value: 'Good', label: 'Good' }, { value: 'Fair', label: 'Fair' }
                        ]}
                        onChange={(val) => handleFilterChange('condition', val)}
                        onClear={() => handleFilterChange('condition', '')}
                    />

                    <FilterPill 
                        label={`Price (${currentCurrency?.symbol || ''})`} 
                        type="price"
                        placeholder="Price"
                        value={minPrice || maxPrice ? (minPrice && maxPrice ? `${minPrice}-${maxPrice}` : (minPrice ? `>${minPrice}` : `<${maxPrice}`)) : ''} 
                        onChange={(val) => handleFilterChange('price', val)}
                        onClear={() => handleFilterChange('price', { min: '', max: '' })}
                    />

                    <FilterPill 
                        label="Brand" 
                        value={brand} 
                        options={[
                            { value: 'Nike', label: 'Nike' }, { value: 'Adidas', label: 'Adidas' },
                            { value: 'Zara', label: 'Zara' }, { value: 'H&M', label: 'H&M' }
                        ]}
                        onChange={(val) => handleFilterChange('brand', val)}
                        onClear={() => handleFilterChange('brand', '')}
                    />

                    <FilterPill 
                        label="Material" 
                        value={material} 
                        options={[
                            { value: 'Cotton', label: 'Cotton' }, { value: 'Wool', label: 'Wool' },
                            { value: 'Silk', label: 'Silk' }, { value: 'Denim', label: 'Denim' }
                        ]}
                        onChange={(val) => handleFilterChange('material', val)}
                        onClear={() => handleFilterChange('material', '')}
                    />

                    {(search || size || brand || condition || color || minPrice || maxPrice || material || subcategorySlug || (sort && sort !== 'popular')) && (
                        <button 
                            className="btn btn-link btn-sm text-danger text-decoration-none fw-bold ms-auto" 
                            style={{ whiteSpace: 'nowrap' }}
                            onClick={clearAllFilters}
                        >
                            {t('products.clear_all', 'Clear All')}
                        </button>
                    )}
                </div>

                {/* Filters Mobile - Full Width Button */}
                <div className="d-md-none mb-4 d-flex flex-column gap-2">
                    <Button 
                        variant="outline-dark" 
                        className="w-100 rounded-pill px-4 d-flex align-items-center justify-content-center gap-2"
                        onClick={() => setShowMobileFilters(true)}
                        style={{ border: '1px solid #e2e8f0', fontWeight: '600', height: '48px' }}
                    >
                        <FaFilter size={14} /> {t('products.filters', 'Filters')}
                        {(search || size || brand || condition || color || minPrice || maxPrice || material || subcategorySlug || (sort && sort !== 'popular')) && (
                            <Badge bg="primary" pill className="ms-1" style={{ fontSize: '0.7rem' }}>
                                Active
                            </Badge>
                        )}
                    </Button>
                </div>

                <Offcanvas show={showMobileFilters} onHide={() => setShowMobileFilters(false)} placement="end" style={{ width: '85%' }}>
                    <Offcanvas.Header closeButton style={{ borderBottom: '1px solid #f1f5f9' }}>
                        <Offcanvas.Title className="fw-bold">{t('products.filters', 'Filters')}</Offcanvas.Title>
                    </Offcanvas.Header>
                    <Offcanvas.Body className="p-0">
                        <Accordion flush defaultActiveKey="0">
                            {/* Sorting */}
                            <Accordion.Item eventKey="sort">
                                <Accordion.Header><span className="fw-bold">Sort By</span></Accordion.Header>
                                <Accordion.Body>
                                    <div className="d-flex flex-column gap-2">
                                        {[
                                            { value: 'popular', label: 'Relevance' },
                                            { value: 'price_asc', label: 'Price: Low to High' },
                                            { value: 'price_desc', label: 'Price: High to Low' },
                                            { value: 'discounted', label: 'Sale Items' }
                                        ].map(opt => (
                                            <div 
                                                key={opt.value} 
                                                className={`p-3 rounded-3 cursor-pointer ${sort === opt.value ? 'bg-primary text-white shadow-sm' : 'bg-light'}`}
                                                onClick={() => handleFilterChange('sort', opt.value)}
                                            >
                                                {opt.label}
                                            </div>
                                        ))}
                                    </div>
                                </Accordion.Body>
                            </Accordion.Item>

                            {/* Category */}
                            <Accordion.Item eventKey="category">
                                <Accordion.Header><span className="fw-bold">Category</span></Accordion.Header>
                                <Accordion.Body className="p-0">
                                    <div className="list-group list-group-flush">
                                        <button 
                                            className={`list-group-item list-group-item-action border-0 p-3 mx-2 my-1 rounded-3 ${!categorySlug ? 'bg-primary text-white shadow-sm' : ''}`}
                                            onClick={() => handleFilterChange('category', '')}
                                        >
                                            All Categories
                                        </button>
                                        {categories.map(c => (
                                            <button 
                                                key={c._id}
                                                className={`list-group-item list-group-item-action border-0 p-3 mx-2 my-1 rounded-3 ${categorySlug === c.slug ? 'bg-primary text-white shadow-sm' : ''}`}
                                                onClick={() => handleFilterChange('category', c.slug)}
                                            >
                                                {c.name}
                                            </button>
                                        ))}
                                    </div>
                                </Accordion.Body>
                            </Accordion.Item>

                            {/* Subcategory */}
                            <Accordion.Item eventKey="subcategory">
                                <Accordion.Header><span className="fw-bold">Subcategory</span></Accordion.Header>
                                <Accordion.Body className="p-0">
                                    <div className="list-group list-group-flush">
                                        {!categorySlug ? (
                                            <div className="p-4 text-center text-muted small">Please select a category first</div>
                                        ) : (
                                            <>
                                                <button 
                                                    className={`list-group-item list-group-item-action border-0 p-3 mx-2 my-1 rounded-3 ${!subcategorySlug ? 'bg-primary text-white shadow-sm' : ''}`}
                                                    onClick={() => handleFilterChange('subcategory', '')}
                                                >
                                                    All Subcategories
                                                </button>
                                                {(categories.find(c => c.slug === categorySlug)?.subcategories || []).map(s => (
                                                    <button 
                                                        key={s._id}
                                                        className={`list-group-item list-group-item-action border-0 p-3 mx-2 my-1 rounded-3 ${subcategorySlug === s.slug ? 'bg-primary text-white shadow-sm' : ''}`}
                                                        onClick={() => handleFilterChange('subcategory', s.slug)}
                                                    >
                                                        {s.name}
                                                    </button>
                                                ))}
                                            </>
                                        )}
                                    </div>
                                </Accordion.Body>
                            </Accordion.Item>

                            {/* Item Type */}
                            <Accordion.Item eventKey="itemType">
                                <Accordion.Header><span className="fw-bold">Item Type / Style</span></Accordion.Header>
                                <Accordion.Body className="p-0">
                                    <div className="list-group list-group-flush">
                                        {!subcategorySlug ? (
                                            <div className="p-4 text-center text-muted small">Please select a subcategory first</div>
                                        ) : (
                                            <>
                                                <button 
                                                    className={`list-group-item list-group-item-action border-0 p-3 mx-2 my-1 rounded-3 ${!itemTypeSlug ? 'bg-primary text-white shadow-sm' : ''}`}
                                                    onClick={() => handleFilterChange('itemType', '')}
                                                >
                                                    All Types
                                                </button>
                                                {(categories.find(c => c.slug === categorySlug)?.subcategories.find(s => s.slug === subcategorySlug)?.items || []).map(i => (
                                                    <button 
                                                        key={i._id}
                                                        className={`list-group-item list-group-item-action border-0 p-3 mx-2 my-1 rounded-3 ${itemTypeSlug === i.slug ? 'bg-primary text-white shadow-sm' : ''}`}
                                                        onClick={() => handleFilterChange('itemType', i.slug)}
                                                    >
                                                        {i.name}
                                                    </button>
                                                ))}
                                            </>
                                        )}
                                    </div>
                                </Accordion.Body>
                            </Accordion.Item>

                            {/* Price */}
                            <Accordion.Item eventKey="price">
                                <Accordion.Header><span className="fw-bold">Price Range</span></Accordion.Header>
                                <Accordion.Body>
                                    <div className="d-flex gap-2 align-items-center mb-3">
                                        <div className="flex-1">
                                            <input type="number" placeholder="Min" className="form-control" value={minPrice} onChange={(e) => setMinPrice(e.target.value)} />
                                        </div>
                                        <span>-</span>
                                        <div className="flex-1">
                                            <input type="number" placeholder="Max" className="form-control" value={maxPrice} onChange={(e) => setMaxPrice(e.target.value)} />
                                        </div>
                                    </div>
                                    <Button variant="primary" size="sm" className="w-100" onClick={() => handleFilterChange('price', { min: minPrice, max: maxPrice })}>
                                        Apply Range
                                    </Button>
                                </Accordion.Body>
                            </Accordion.Item>

                            {/* Size */}
                            <Accordion.Item eventKey="size">
                                <Accordion.Header><span className="fw-bold">Size</span></Accordion.Header>
                                <Accordion.Body>
                                    <div className="d-flex flex-wrap gap-2">
                                        {['XS', 'S', 'M', 'L', 'XL', 'XXL'].map(s => (
                                            <div 
                                                key={s} 
                                                className={`p-2 px-3 border rounded-pill cursor-pointer ${size === s ? 'bg-primary text-white' : 'bg-white'}`}
                                                onClick={() => handleFilterChange('size', s)}
                                            >
                                                {s}
                                            </div>
                                        ))}
                                    </div>
                                </Accordion.Body>
                            </Accordion.Item>

                            {/* Color */}
                            <Accordion.Item eventKey="color">
                                <Accordion.Header><span className="fw-bold">Color</span></Accordion.Header>
                                <Accordion.Body>
                                    <div className="d-flex flex-wrap gap-2">
                                        {['Black', 'White', 'Red', 'Blue', 'Green', 'Yellow'].map(c => (
                                            <div 
                                                key={c} 
                                                className={`p-2 px-3 border rounded-pill cursor-pointer d-flex align-items-center gap-2 ${color === c ? 'bg-primary text-white' : 'bg-white'}`}
                                                onClick={() => handleFilterChange('color', c)}
                                            >
                                                <span 
                                                    style={{ width: '12px', height: '12px', borderRadius: '50%', backgroundColor: c.toLowerCase(), border: '1px solid #ddd' }}
                                                ></span>
                                                {c}
                                            </div>
                                        ))}
                                    </div>
                                </Accordion.Body>
                            </Accordion.Item>

                            {/* Brand */}
                            <Accordion.Item eventKey="brand">
                                <Accordion.Header><span className="fw-bold">Brand</span></Accordion.Header>
                                <Accordion.Body className="p-0">
                                    <div className="list-group list-group-flush">
                                        {['Nike', 'Adidas', 'Zara', 'H&M'].map(b => (
                                            <button 
                                                key={b}
                                                className={`list-group-item list-group-item-action border-0 p-3 mx-2 my-1 rounded-3 ${brand === b ? 'bg-primary text-white shadow-sm' : ''}`}
                                                onClick={() => handleFilterChange('brand', b)}
                                            >
                                                {b}
                                            </button>
                                        ))}
                                    </div>
                                </Accordion.Body>
                            </Accordion.Item>

                            {/* Material */}
                            <Accordion.Item eventKey="material">
                                <Accordion.Header><span className="fw-bold">Material</span></Accordion.Header>
                                <Accordion.Body className="p-0">
                                    <div className="list-group list-group-flush">
                                        {['Cotton', 'Wool', 'Silk', 'Denim'].map(m => (
                                            <button 
                                                key={m}
                                                className={`list-group-item list-group-item-action border-0 p-3 mx-2 my-1 rounded-3 ${material === m ? 'bg-primary text-white shadow-sm' : ''}`}
                                                onClick={() => handleFilterChange('material', m)}
                                            >
                                                {m}
                                            </button>
                                        ))}
                                    </div>
                                </Accordion.Body>
                            </Accordion.Item>

                            {/* Condition */}
                            <Accordion.Item eventKey="condition">
                                <Accordion.Header><span className="fw-bold">Condition</span></Accordion.Header>
                                <Accordion.Body>
                                    <div className="d-flex flex-column gap-2">
                                        {['New', 'Very Good', 'Good', 'Fair'].map(c => (
                                            <div 
                                                key={c} 
                                                className={`p-3 border rounded-3 cursor-pointer d-flex justify-content-between align-items-center ${condition === c ? 'bg-primary text-white shadow-sm' : 'bg-light'}`}
                                                onClick={() => handleFilterChange('condition', c)}
                                            >
                                                {c}
                                                {condition === c && <FaFilter size={12} />}
                                            </div>
                                        ))}
                                    </div>
                                </Accordion.Body>
                            </Accordion.Item>
                        </Accordion>

                        <div className="p-4 border-top bg-white sticky-bottom">
                            <Button variant="primary" className="w-100 rounded-pill py-2 shadow-sm" onClick={() => setShowMobileFilters(false)}>
                                Show Results
                            </Button>
                            <Button variant="link" className="w-100 mt-2 text-danger text-decoration-none" onClick={() => { clearAllFilters(); setShowMobileFilters(false); }}>
                                {t('products.clear_all', 'Reset Filters')}
                            </Button>
                        </div>
                    </Offcanvas.Body>
                </Offcanvas>

                {/* Header / Context Bar */}
                {/* "remove the line" -> no border-bottom */}
                <div className="d-flex flex-column flex-md-row justify-content-between align-items-end mb-4">

                    {/* Left: Context */}
                    <div>
                        <div style={{ fontSize: '0.85rem', color: '#64748b', display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <span>{t('products.search_results')}</span>
                            <span style={{ color: '#0ea5e9', fontWeight: 'bold' }}>{totalCount}</span>

                            {!(sort === 'popular') && breadcrumbs && (
                                <>
                                    <div style={{ borderLeft: '2px solid #cbd5e1', height: '20px', margin: '0 10px' }}></div>
                                    <span>{t('products.searched_for')}</span>
                                    {breadcrumbs}
                                </>
                            )}
                        </div>
                    </div>

                    {/* Right: Pagination Mode Toggle */}
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
                    <div className="text-center py-5 fade-in" style={{ background: '#f8fafc', borderRadius: '24px', margin: '40px 0' }}>
                        <div style={{ marginBottom: '20px' }}>
                            <div style={{ 
                                display: 'inline-flex', 
                                alignItems: 'center', 
                                justifyContent: 'center',
                                width: '100px',
                                height: '100px',
                                borderRadius: '50%',
                                background: 'white',
                                boxShadow: '0 10px 15px -3px rgba(0,0,0,0.05)',
                                color: '#94a3b8'
                            }}>
                                <FaSearch size={40} />
                            </div>
                        </div>
                        <h3 className="fw-bold text-dark mb-2">{t('products.no_items_found', 'We couldn\'t find any matches')}</h3>
                        <p className="text-muted mb-4 mx-auto" style={{ maxWidth: '400px' }}>
                            {t('products.adjust_search', 'Try adjusting your filters or searching for something else to find what you\'re looking for.')}
                        </p>
                        <button 
                            className="btn btn-primary px-4 py-2 fw-bold" 
                            style={{ borderRadius: '12px' }}
                            onClick={clearAllFilters}
                        >
                            {t('products.clear_all_filters', 'Clear All Filters')}
                        </button>
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
