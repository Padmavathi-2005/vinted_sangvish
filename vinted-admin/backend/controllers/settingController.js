import asyncHandler from 'express-async-handler';
import Setting from '../models/Setting.js';



// @desc    Get all unique setting types
// @route   GET /api/settings/types
// @access  Private (Admin)
const getSettingTypes = asyncHandler(async (req, res) => {
    const types = await Setting.distinct('type');
    res.json(types);
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

    // fallback for legacy admin_settings mapping
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

    if (type === 'admin_settings' && !setting) {
        setting = await Setting.findOne({ type: 'general_settings' });
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
    console.log(`\n[SETTINGS UPDATE] Type: ${type}`);
    console.log('[BODY]:', req.body);

    let setting = await Setting.findOne({ type });

    const updateData = { ...req.body };

    // Explicitly delete problematic or metadata fields
    const blacklist = ['_id', '__v', 'created_at', 'updated_at', 'type', 'general_settings'];
    blacklist.forEach(field => delete updateData[field]);

    // Handle file uploads specifically
    if (req.files) {
        ['site_logo', 'site_favicon', 'image_not_found', 'empty_table_image', 'stripe_logo', 'paypal_logo'].forEach(field => {
            if (req.files[field]) {
                updateData[field] = `images/site/${req.files[field][0].filename}`;
                console.log(`-> New ${field}:`, updateData[field]);
            }
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
                console.log(`   Parsed JSON for ${key}`);
            } catch (e) {
                // Not valid JSON, keep as string
            }
        }
    });

    try {
        if (setting) {
            console.log('-> Found existing settings. Merging updates...');
            Object.keys(updateData).forEach(key => {
                // Skip invalid data
                if (updateData[key] === undefined || updateData[key] === 'undefined') return;

                // Force null for empty ObjectId fields to prevent casting errors
                if (key.endsWith('_id') && updateData[key] === '') {
                    console.log(`   Setting ${key} = NULL (cleared)`);
                    setting.set(key, null);
                } else {
                    console.log(`   Setting ${key} =`, updateData[key]);
                    setting.set(key, updateData[key]);
                }
            });

            const updatedSetting = await setting.save();
            console.log(`[SUCCESS] Saved ${type}`);
            res.json(updatedSetting);
        } else {
            console.log(`-> No settings found for ${type}. Creating new...`);
            const newSetting = await Setting.create({ ...updateData, type });
            console.log(`[SUCCESS] Created ${type}`);
            res.status(201).json(newSetting);
        }
    } catch (error) {
        console.error(`[Settings] ERROR updating ${type}:`, error);
        res.status(500);
        throw new Error(`Failed to update settings: ${error.message}`);
    }
});

export {
    getSettingTypes,
    getSettingsByType,
    updateSettingsByType,
};
