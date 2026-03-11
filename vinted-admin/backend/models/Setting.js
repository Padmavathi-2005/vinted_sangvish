import mongoose from 'mongoose';

const settingSchema = mongoose.Schema(
    {
        type: {
            type: String,
            default: 'general_settings',
        },
        site_name: {
            type: mongoose.Schema.Types.Mixed,
        },
        site_url: {
            type: String,
        },
        site_logo: {
            type: String,
        },
        image_not_found: {
            type: String,
        },
        empty_table_image: {
            type: String,
        },
        site_favicon: {
            type: String,
        },
        primary_color: {
            type: String,
        },
        secondary_color: {
            type: String,
        },
        pagination_limit: {
            type: Number,
        },
        pagination_mode: {
            type: String,
            enum: ['paginate', 'scroll'],
        },
        general_settings: {
            type: Map,
            of: String,
            default: {},
        },
        default_language_id: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Language',
        },
        default_currency_id: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Currency',
        },
        maintenance_mode: {
            type: Boolean,
        },
        allow_registration: {
            type: Boolean,
        },
        allow_guest_checkout: {
            type: Boolean,
        },
        support_email: {
            type: String,
        },
        timezone: {
            type: String,
        },
        admin_commission: {
            type: Number,
        },
        cookie_heading: {
            type: mongoose.Schema.Types.Mixed,
        },
        cookie_message: {
            type: mongoose.Schema.Types.Mixed,
        },
        cookie_button_text: {
            type: mongoose.Schema.Types.Mixed,
        },
        cookie_page_id: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Page',
        },
    },
    {
        timestamps: {
            createdAt: 'created_at',
            updatedAt: 'updated_at',
        },
        toJSON: {
            transform: function (doc, ret) {
                ['site_logo', 'site_favicon', 'image_not_found', 'empty_table_image'].forEach(field => {
                    if (ret[field] && !ret[field].startsWith('http')) {
                        let clean = ret[field].replace(/^\/+/, '');
                        clean = clean.replace(/^images\/site\//, '');
                        ret[field] = `images/site/${clean}`;
                    }
                });
                return ret;
            }
        },
        toObject: {
            transform: function (doc, ret) {
                ['site_logo', 'site_favicon', 'image_not_found', 'empty_table_image'].forEach(field => {
                    if (ret[field] && !ret[field].startsWith('http')) {
                        let clean = ret[field].replace(/^\/+/, '');
                        clean = clean.replace(/^images\/site\//, '');
                        ret[field] = `images/site/${clean}`;
                    }
                });
                return ret;
            }
        }
    }
);

export default mongoose.model('Setting', settingSchema);
