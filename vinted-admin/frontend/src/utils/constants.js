export const safeString = (val, fallback = '') => {
    if (!val) return fallback;
    if (typeof val === 'object') {
        // Since admin doesn't have i18next yet, we default to 'en'
        // or just pick the first available key if 'en' is missing
        return val.en || val[Object.keys(val)[0]] || fallback;
    }
    return String(val);
};
