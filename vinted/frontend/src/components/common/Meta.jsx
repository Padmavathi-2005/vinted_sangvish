import React from 'react';
import { Helmet } from 'react-helmet-async';
import { useSettings } from '../../context/SettingsContext';
import { getImageUrl, safeString } from '../../utils/constants';

const Meta = ({ 
    title = "", 
    description = "", 
    image = "", 
    url = window.location.href,
    type = "website"
}) => {
    const { settings } = useSettings();
    const siteName = safeString(settings.site_name, "Marketplace");
    const siteUrl = settings.site_url || window.location.origin;
    const siteFavicon = settings.site_favicon ? getImageUrl(settings.site_favicon) : "/vite.svg";
    
    // Default values if props are missing
    const metaTitle = title ? `${title} | ${siteName}` : siteName;
    const metaDesc = description || "Join our community to buy and sell pre-loved fashion. Sustainable, affordable, and easy.";
    const metaImage = image || (settings.site_logo ? getImageUrl(settings.site_logo) : `${siteUrl}/og-image.jpg`);
    const metaUrl = url || window.location.href;

    return (
        <Helmet>
            {/* Favicon */}
            <link rel="icon" type="image/png" href={siteFavicon} />

            {/* Standard Meta Tags */}
            <title>{metaTitle}</title>
            <meta name="description" content={metaDesc} />
            
            {/* Open Graph / Facebook */}
            <meta property="og:url" content={metaUrl} />
            <meta property="og:type" content={type} />
            <meta property="og:title" content={metaTitle} />
            <meta property="og:description" content={metaDesc} />
            <meta property="og:image" content={metaImage} />
            <meta property="og:site_name" content={siteName} />

            {/* Twitter */}
            <meta name="twitter:card" content="summary_large_image" />
            <meta name="twitter:title" content={metaTitle} />
            <meta name="twitter:description" content={metaDesc} />
            <meta name="twitter:image" content={metaImage} />
            <meta name="twitter:url" content={metaUrl} />
            
            {/* Canonical Link */}
            <link rel="canonical" href={metaUrl} />
            
            {/* Meta tags for search engines */}
            <meta name="robots" content="index, follow" />
            <meta name="viewport" content="width=device-width, initial-scale=1.0" />
        </Helmet>
    );
};

export default Meta;
