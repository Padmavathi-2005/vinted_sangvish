export const BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000';

export const getImageUrl = (path) => {
    if (!path) return '';
    if (String(path).startsWith('http')) return path;

    // Robust normalization for frontend
    // Remove leading slash, replace backslashes, and handle repeated prefixes
    let clean = String(path).replace(/\\/g, '/').replace(/^\/+/, '');
    
    // If it already has BASE_URL or protocol, return it
    if (clean.startsWith('http')) return clean;

    if (BASE_URL === '/' || !BASE_URL) {
        return `/${clean}`;
    }

    // Remove trailing slashes from BASE_URL to prevent double slashes
    const cleanBase = BASE_URL.replace(/\/+$/, '');
    return `${cleanBase}/${clean}`;
};

export const getItemImageUrl = (path) => {
    if (!path) {
        const fallback = sessionStorage.getItem('imageNotFound');
        if (fallback) return getImageUrl(fallback);
        return getImageUrl('images/site/not_found.png');
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
