export const BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000';

export const getImageUrl = (path) => {
    if (!path) return '';
    if (path.startsWith('http')) return path;
    // Remove leading slash and replace backslashes with forward slashes
    const normalizedPath = path.replace(/^\/+/, '').replace(/\\/g, '/');

    if (BASE_URL === '/') {
        return `/${normalizedPath}`; // Fix mapping for live server proxy
    }

    // Remove trailing slashes from BASE_URL to prevent double slashes
    const cleanBase = BASE_URL.replace(/\/+$/, '');
    return `${cleanBase}/${normalizedPath}`;
};

export const getItemImageUrl = (path) => {
    if (!path) {
        const fallback = sessionStorage.getItem('imageNotFound');
        if (fallback) return getImageUrl(fallback);
        return 'https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=600&q=80';
    }
    return getImageUrl(path);
};

export const safeString = (val, fallback = '') => {
    if (!val) return fallback;
    if (typeof val === 'object') {
        // Try getting from localStorage, default to 'en'
        const langCode = (localStorage.getItem('i18nextLng') || 'en').split('-')[0];
        return val[langCode] || val.en || val[Object.keys(val)[0]] || fallback;
    }
    return String(val);
};
