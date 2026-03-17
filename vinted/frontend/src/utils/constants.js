export const BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5003';
export const IMAGE_BASE_URL = import.meta.env.VITE_IMAGE_BASE_URL || 'http://localhost:5003';

export const getImageUrl = (path) => {
    if (!path) return '';
    if (String(path).startsWith('http')) return path;

    // Robust normalization for frontend
    let clean = String(path).replace(/\\/g, '/').replace(/^\/+/, '');
    
    // If it already has protocol, return it
    if (clean.startsWith('http')) return clean;

    // Use absolute path from root if base is '/' or empty
    if (IMAGE_BASE_URL === '/' || !IMAGE_BASE_URL) {
        return `/${clean}`;
    }

    // Remove trailing slashes from IMAGE_BASE_URL to prevent double slashes
    const cleanBase = IMAGE_BASE_URL.replace(/\/+$/, '');
    // Ensure we have a leading slash if the base is relative
    const prefix = cleanBase.startsWith('http') ? cleanBase : `/${cleanBase.replace(/^\/+/, '')}`;
    return `${prefix}/${clean}`.replace(/\/+/g, '/'); // Final check to prevent double slashes
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
