import mongoose from 'mongoose';

const itemSchema = mongoose.Schema(
    {
        seller_id: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User',
            required: true,
        },
        title: {
            type: String,
            required: [true, 'Please add a title'],
        },
        description: {
            type: String,
            required: [true, 'Please add a description'],
        },
        brand: {
            type: String,
        },
        category_id: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Category',
            required: true,
        },
        subcategory_id: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Subcategory',
            required: true,
        },
        sub_subcategory_id: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'SubSubcategory',
        },
        item_type_id: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'ItemType',
        },
        size: {
            type: String,
        },
        color: {
            type: String,
        },
        condition: {
            type: String,
            required: [true, 'Please add item condition'],
            enum: ['New', 'Very Good', 'Good', 'Normal', 'Bad', 'Very Bad'],
        },
        price: {
            type: Number,
            required: [true, 'Please add a price'],
        },
        currency_id: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Currency',
            required: true,
        },
        negotiable: {
            type: Boolean,
            default: false,
        },
        shipping_included: {
            type: Boolean,
            default: false,
        },
        location: {
            type: String,
            default: '',
        },
        images: [
            {
                type: String,
            },
        ],
        likes_count: {
            type: Number,
            default: 0,
        },
        views_count: {
            type: Number,
            default: 0,
        },
        status: {
            type: String,
            enum: ['active', 'sold', 'pending', 'deleted'],
            default: 'active',
        },
        is_sold: {
            type: Boolean,
            default: false,
        },
        is_deleted: {
            type: Boolean,
            default: false,
        },
        attributes: [
            {
                key: { type: String, required: true },
                value: { type: String, required: true }
            }
        ],
    },
    {
        timestamps: {
            createdAt: 'created_at',
            updatedAt: 'updated_at',
        },
        toJSON: {
            transform: function (doc, ret) {
                if (ret.images && Array.isArray(ret.images)) {
                    ret.images = ret.images.map(img => {
                        if (img && !img.startsWith('http')) {
                            let clean = img.replace(/^\/+/, '');
                            clean = clean.replace(/^uploads\//, '');
                            clean = clean.replace(/^images\/items\//, '');
                            return `images/items/${clean}`;
                        }
                        return img;
                    });
                }
                return ret;
            }
        },
        toObject: {
            transform: function (doc, ret) {
                if (ret.images && Array.isArray(ret.images)) {
                    ret.images = ret.images.map(img => {
                        if (img && !img.startsWith('http')) {
                            let clean = img.replace(/^\/+/, '');
                            clean = clean.replace(/^uploads\//, '');
                            clean = clean.replace(/^images\/items\//, '');
                            return `images/items/${clean}`;
                        }
                        return img;
                    });
                }
                return ret;
            }
        }
    }
);

export default mongoose.model('Item', itemSchema);
