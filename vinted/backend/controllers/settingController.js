import asyncHandler from 'express-async-handler';
import Setting from '../models/Setting.js';

// @desc    Get all unique setting types
// @route   GET /api/settings/types
// @access  Private (Admin)
const getSettingTypes = asyncHandler(async (req, res) => {
    const types = await Setting.distinct('type');
    const coreTypes = ['general_settings', 'site_settings', 'cookie_settings', 'payment_settings'];
    const merged = [...new Set([...coreTypes, ...types])];
    res.json(merged);
});

// @desc    Get settings by type
// @route   GET /api/settings/:type
// @access  Public (some might be private)
const getSettingsByType = asyncHandler(async (req, res) => {
    const { type } = req.params;
    let setting = await Setting.findOne({ type });

    if (!setting && type === 'general_settings') {
        setting = await Setting.create({
            type: 'general_settings',
            primary_color: '#0ea5e9',
            secondary_color: '#1e293b',
            pagination_limit: 12,
            pagination_mode: 'paginate',
            maintenance_mode: false,
            allow_registration: true,
            allow_guest_checkout: false,
            timezone: 'UTC',
            admin_commission: 2
        });
    }

    if (!setting && type === 'site_settings') {
        setting = await Setting.create({
            type: 'site_settings',
            site_name: { en: 'My Marketplace' },
        });
    }

    if (!setting && type === 'cookie_settings') {
        setting = await Setting.create({
            type: 'cookie_settings',
            cookie_heading: { en: 'Better experience with cookies' },
            cookie_message: { en: 'Our website uses cookies to improve your experience and show you relevant content. To continue, please accept our use of cookies.' },
            cookie_button_text: { en: 'Accept All' }
        });
    }

    if (!setting && type === 'payment_settings') {
        setting = await Setting.create({
            type: 'payment_settings',
            stripe_enabled: false,
            stripe_test_mode: true,
            stripe_logo: '',
            stripe_translations: {
                en: { name: 'Stripe API', description: 'Accept Credit/Debit cards via Stripe.' }
            },
            stripe_test_public_key: '',
            stripe_test_secret_key: '',
            stripe_test_webhook_secret: '',
            stripe_live_public_key: '',
            stripe_live_secret_key: '',
            stripe_live_webhook_secret: '',
            paypal_enabled: false,
            paypal_test_mode: true,
            paypal_logo: '',
            paypal_translations: {
                en: { name: 'PayPal API', description: 'Accept payments via PayPal Express.' }
            },
            paypal_test_client_id: 'test_paypal_client_id',
            paypal_test_client_secret: 'test_paypal_secret',
            paypal_live_client_id: '',
            paypal_live_client_secret: ''
        });
    }

    if (!setting && type === 'social_login_settings') {
        setting = await Setting.create({
            type: 'social_login_settings',
            google_enabled: false,
            google_client_id: '',
            google_client_secret: '',
            facebook_enabled: false,
            facebook_client_id: '',
            facebook_client_secret: '',
            twitter_enabled: false,
            twitter_client_id: '',
            twitter_client_secret: '',
            apple_enabled: false,
            apple_client_id: '',
            apple_client_secret: '',
        });
    }

    if (setting) {
        let responseData = setting.toObject();

        // Type-aware normalization for localized fields
        if (type === 'site_settings') {
            const field = 'site_name';
            if (!responseData[field] || typeof responseData[field] === 'string') {
                responseData[field] = { en: responseData[field] || '' };
            }
        } else if (type === 'cookie_settings') {
            ['cookie_heading', 'cookie_message', 'cookie_button_text'].forEach(field => {
                if (!responseData[field] || typeof responseData[field] === 'string') {
                    responseData[field] = { en: responseData[field] || '' };
                }
            });
            if (responseData.cookie_page_id === undefined) {
                responseData.cookie_page_id = null;
            }
        }

        if (type === 'social_login_settings') {
            const isLocal = req.hostname === 'localhost' || req.hostname === '127.0.0.1';
            if (isLocal) {
                responseData.google_enabled = false;
                responseData.facebook_enabled = false;
                responseData.twitter_enabled = false;
                responseData.apple_enabled = false;
            }
        }
        res.json(responseData);
    } else {
        res.status(404).json({ message: 'Settings not found' });
    }
});

// @desc    Update settings by type
// @route   PUT /api/settings/:type
// @access  Private (Admin)
const updateSettingsByType = asyncHandler(async (req, res) => {
    const { type } = req.params;
    let setting = await Setting.findOne({ type });
    const updateData = { ...req.body };

    console.log(`[Settings] Updating ${type}. Data:`, JSON.stringify(updateData, null, 2));

    const blacklist = ['_id', '__v', 'created_at', 'updated_at', 'type'];
    blacklist.forEach(field => delete updateData[field]);

    // Handle any files uploaded
    if (req.files) {
        Object.keys(req.files).forEach(fieldName => {
            const file = req.files[fieldName][0];
            updateData[fieldName] = `images/site/${file.filename}`;
        });
    }

    // Attempt to parse JSON strings for translatable fields or mixed objects
    Object.keys(updateData).forEach(key => {
        const val = updateData[key];

        // Convert string "true" / "false" back to booleans
        if (val === 'true') updateData[key] = true;
        if (val === 'false') updateData[key] = false;

        if (typeof val === 'string' && (val.startsWith('{') || val.startsWith('['))) {
            try {
                updateData[key] = JSON.parse(val);
            } catch (e) {
                // Not valid JSON, keep as string
            }
        }
    });

    try {
        if (setting) {
            Object.keys(updateData).forEach(key => {
                // Skip invalid data
                if (updateData[key] === undefined || updateData[key] === 'undefined') return;

                // Force null for empty ObjectId fields to prevent casting errors
                if (key.endsWith('_id') && updateData[key] === '') {
                    setting.set(key, null);
                } else {
                    setting.set(key, updateData[key]);
                }
            });
            const updatedSetting = await setting.save();
            res.json(updatedSetting);
        } else {
            const newSetting = await Setting.create({ ...updateData, type });
            res.status(201).json(newSetting);
        }
    } catch (error) {
        console.error(`[Settings] ERROR updating ${type}:`, error);
        res.status(500);
        throw new Error(`Failed to update settings: ${error.message}`);
    }
});

// Backward compatibility for main frontend
const getSettings = asyncHandler(async (req, res) => {
    const allSettings = await Setting.find({});
    let merged = {};
    allSettings.forEach(s => {
        const obj = s.toObject();
        // Filtering sensitive keys
        Object.keys(obj).forEach(key => {
            const lowerKey = key.toLowerCase();
            if (
                lowerKey.includes('secret') ||
                lowerKey.includes('private') ||
                lowerKey.includes('key_live') ||
                lowerKey.includes('key_test') ||
                lowerKey.includes('password')
            ) {
                // Keep only public keys if specifically allowed, otherwise remove
                if (!lowerKey.includes('public_key') && !lowerKey.includes('client_id')) {
                    delete obj[key];
                }
            }
        });
        merged = { ...merged, ...obj };
    });
    res.json(merged);
});

export {
    getSettingTypes,
    getSettingsByType,
    updateSettingsByType,
    getSettings,
};
