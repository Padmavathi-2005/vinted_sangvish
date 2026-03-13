import React, { createContext, useState, useEffect, useContext } from 'react';
import axios from '../utils/axios';
import { getImageUrl, safeString } from '../utils/constants';

const SettingsContext = createContext();

export const SettingsProvider = ({ children }) => {
    const [settings, setSettings] = useState({
        site_name: 'Marketplace',
        site_url: window.location.origin,
        site_logo: '',
        primary_color: '#0ea5e9',
        loading: true
    });

    useEffect(() => {
        const fetchSettings = async () => {
            try {
                const { data } = await axios.get('/api/settings');
                if (data) {
                    setSettings({
                        ...data,
                        site_url: data.site_url || window.location.origin,
                        loading: false
                    });
                    
                    // Set CSS variable globally
                    if (data.primary_color) {
                        document.documentElement.style.setProperty('--primary-color', data.primary_color);
                    }

                    // Dynamic Font Loading
                    if (data.body_font_url) {
                        let fontLink = document.getElementById('dynamic-google-font');
                        if (!fontLink) {
                            fontLink = document.createElement('link');
                            fontLink.id = 'dynamic-google-font';
                            fontLink.rel = 'stylesheet';
                            document.head.appendChild(fontLink);
                        }
                        fontLink.href = data.body_font_url;
                    }

                    if (data.body_font_name) {
                        document.documentElement.style.setProperty('--body-font', data.body_font_name);
                    }

                    if (data.site_name) {
                        const nameString = safeString(data.site_name);
                        document.title = nameString;
                    }

                    if (data.site_favicon || data.favicon) {
                        const faviconString = safeString(data.site_favicon || data.favicon);
                        let link = document.querySelector("link[rel~='icon']");
                        if (!link) {
                            link = document.createElement('link');
                            link.rel = 'icon';
                            document.head.appendChild(link);
                        }
                        link.href = faviconString.startsWith('http') ? faviconString : (faviconString.startsWith('images/') ? `${axios.defaults.baseURL}/${faviconString}` : getImageUrl(faviconString));
                    }
                }
            } catch (error) {
                console.error('Failed to fetch settings:', error);
                setSettings(prev => ({ ...prev, loading: false }));
            }
        };

        fetchSettings();
    }, []);

    return (
        <SettingsContext.Provider value={{ settings }}>
            {children}
        </SettingsContext.Provider>
    );
};

export const useSettings = () => useContext(SettingsContext);

export default SettingsContext;
