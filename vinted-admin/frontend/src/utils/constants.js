export const safeString = (val, fallback = '') => {
    if (!val) return fallback;
    if (typeof val === 'object') {
        // Since admin doesn't have i18next yet, we default to 'en'
        // or just pick the first available key if 'en' is missing
        return val.en || val[Object.keys(val)[0]] || fallback;
    }
    return String(val);
};

export const getImageUrl = (path) => {
    if (!path) return '';
    if (String(path).startsWith('http')) return path;

    const baseRaw = import.meta.env.VITE_IMAGE_BASE_URL || '/';
    
    // Normalize path: replace backslashes and remove leading slashes
    let cleanPath = String(path).replace(/\\/g, '/').replace(/^\/+/, '');

    if (baseRaw === '/' || !baseRaw) {
        return `/${cleanPath}`;
    }

    // Remove trailing slashes from BASE_URL to prevent double slashes
    const cleanBase = baseRaw.replace(/\/+$/, '');
    // Ensure we have a leading slash if the base is relative
    const prefix = cleanBase.startsWith('http') ? cleanBase : `/${cleanBase.replace(/^\/+/, '')}`;
    return `${prefix}/${cleanPath}`.replace(/\/+/g, '/'); // Final check to prevent double slashes
};
