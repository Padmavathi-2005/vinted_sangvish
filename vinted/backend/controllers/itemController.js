import asyncHandler from 'express-async-handler';
import Item from '../models/Item.js';
import Category from '../models/Category.js';
import Subcategory from '../models/Subcategory.js';
import Currency from '../models/Currency.js';
import ItemType from '../models/ItemType.js';
import ItemView from '../models/ItemView.js';

// @desc    Get single item by ID
// @route   GET /api/items/:id
// @access  Public
const getItemById = asyncHandler(async (req, res) => {
    const item = await Item.findById(req.params.id)
        .populate('seller_id', 'username email profile_image created_at rating_avg rating_count')
        .populate('category_id', 'name slug')
        .populate('subcategory_id', 'name slug')
        .populate('item_type_id', 'name slug')
        .populate('currency_id', 'code symbol');

    if (!item) {
        res.status(404);
        throw new Error('Item not found');
    }

    // IP-based unique view counting
    const ip = req.headers['x-forwarded-for']?.split(',')[0]?.trim() || req.ip || req.connection?.remoteAddress || 'unknown';
    try {
        await ItemView.create({ item_id: req.params.id, ip_address: ip });
        // If create succeeds → new unique view, increment count
        await Item.findByIdAndUpdate(req.params.id, { $inc: { views_count: 1 } });
    } catch (err) {
        // Duplicate key error (code 11000) means this IP already viewed → skip
        if (err.code !== 11000) {
            console.error('View tracking error:', err.message);
        }
    }

    res.status(200).json(item);
});

// @desc    Get similar items (same category/subcategory, excluding current)
// @route   GET /api/items/:id/similar
// @access  Public
const getSimilarItems = asyncHandler(async (req, res) => {
    const item = await Item.findById(req.params.id);
    if (!item) {
        res.status(404);
        throw new Error('Item not found');
    }

    // Find items in same subcategory first, fallback to category
    let similar = await Item.find({
        _id: { $ne: item._id },
        status: 'active',
        is_deleted: false,
        is_sold: false,
        subcategory_id: item.subcategory_id,
    })
        .populate('seller_id', 'username profile_image rating_avg rating_count')
        .populate('currency_id', 'code symbol')
        .populate('category_id', 'name')
        .sort({ views_count: -1 })
        .limit(8);

    // If not enough, fill from the same category
    if (similar.length < 4) {
        const existingIds = [item._id, ...similar.map(s => s._id)];
        const moreSimilar = await Item.find({
            _id: { $nin: existingIds },
            status: 'active',
            is_deleted: false,
            is_sold: false,
            category_id: item.category_id,
        })
            .populate('seller_id', 'username profile_image rating_avg rating_count')
            .populate('currency_id', 'code symbol')
            .populate('category_id', 'name')
            .sort({ views_count: -1 })
            .limit(8 - similar.length);
        similar = [...similar, ...moreSimilar];
    }

    res.status(200).json(similar);
});

// @desc    Get items
// @route   GET /api/items
// @access  Public
const getItems = asyncHandler(async (req, res) => {
    try {
        const { sort, limit, page, search } = req.query;
        const pageNum = parseInt(page) || 1;
        const limitNum = parseInt(limit) || 12;
        const skip = (pageNum - 1) * limitNum;

        let queryObj = { status: 'active', is_deleted: false, is_sold: false };

        // Advanced Search functionality
        if (search) {
            let cleanSearch = search;
            let priceQuery = null;

            // Extract price filter (e.g. "price 300", "300 dollar")
            const priceRegex = /(?:price|cost|val)\s*:?\s*(\d+)|(\d+)\s*(?:dollar|usd|eur|inr|rs|€|\$)/i;
            const priceMatch = search.match(priceRegex);

            if (priceMatch) {
                const priceVal = parseInt(priceMatch[1] || priceMatch[2]);
                if (!isNaN(priceVal)) {
                    // +/- 10% range for "fuzzy" price matching
                    priceQuery = { $gte: Math.floor(priceVal * 0.9), $lte: Math.ceil(priceVal * 1.1) };
                    cleanSearch = search.replace(priceMatch[0], '').trim();
                }
            }

            // Apply Price Filter
            if (priceQuery) {
                queryObj.price = priceQuery;
            }

            // Apply Text/Category Filter
            if (cleanSearch) {
                const searchRegex = new RegExp(cleanSearch, 'i');
                const orConditions = [];

                // 1. Title & Description
                orConditions.push({ title: searchRegex });
                orConditions.push({ description: searchRegex });

                // 2. Related Models (Category, Subcategory, ItemType)
                // Fetch IDs for matched names
                const [matchedCategories, matchedSubcategories, matchedItemTypes] = await Promise.all([
                    Category.find({ name: searchRegex }).select('_id'),
                    Subcategory.find({ name: searchRegex }).select('_id'),
                    ItemType.find({ name: searchRegex }).select('_id')
                ]);

                if (matchedCategories.length) orConditions.push({ category_id: { $in: matchedCategories.map(c => c._id) } });
                if (matchedSubcategories.length) orConditions.push({ subcategory_id: { $in: matchedSubcategories.map(c => c._id) } });
                if (matchedItemTypes.length) orConditions.push({ item_type_id: { $in: matchedItemTypes.map(c => c._id) } });

                queryObj.$or = orConditions;
            }
        }

        let query;
        let totalCount;
        let items;

        if (sort === 'popular') {
            // Use Aggregation for complex popularity scoring
            const pipeline = [
                { $match: queryObj },
                {
                    $lookup: {
                        from: 'users',
                        localField: 'seller_id',
                        foreignField: '_id',
                        as: 'seller'
                    }
                },
                { $unwind: '$seller' },
                {
                    $addFields: {
                        popularityScore: {
                            $add: [
                                { $multiply: [{ $ifNull: ['$views_count', 0] }, 1] },
                                { $multiply: [{ $ifNull: ['$likes_count', 0] }, 5] },
                                { $multiply: [{ $ifNull: ['$seller.rating_avg', 0] }, 10] },
                                {
                                    $switch: {
                                        branches: [
                                            { case: { $eq: ['$condition', 'New'] }, then: 20 },
                                            { case: { $eq: ['$condition', 'Very Good'] }, then: 15 },
                                            { case: { $eq: ['$condition', 'Good'] }, then: 10 }
                                        ],
                                        default: 0
                                    }
                                },
                                {
                                    $multiply: [
                                        {
                                            $divide: [
                                                { $subtract: [new Date(), '$created_at'] },
                                                1000 * 60 * 60 * 24 // 1 day in ms
                                            ]
                                        },
                                        -2
                                    ]
                                }
                            ]
                        }
                    }
                },
                { $sort: { popularityScore: -1 } },
                { $skip: skip },
                { $limit: limitNum }
            ];

            items = await Item.aggregate(pipeline);
            totalCount = await Item.countDocuments(queryObj);

            items = await Item.populate(items, [
                { path: 'category_id', select: 'name' },
                { path: 'currency_id', select: 'code symbol' }
            ]);

            items = items.map(item => ({
                ...item,
                seller_id: item.seller
            }));

        } else {
            query = Item.find(queryObj);

            if (sort === 'newest') {
                query = query.sort({ created_at: -1 });
            } else if (sort === 'oldest') {
                query = query.sort({ created_at: 1 });
            } else if (sort === 'price_asc') {
                query = query.sort({ price: 1 });
            } else if (sort === 'price_desc') {
                query = query.sort({ price: -1 });
            } else {
                query = query.sort({ created_at: -1 });
            }

            totalCount = await Item.countDocuments(queryObj);
            items = await query.skip(skip).limit(limitNum)
                .populate('seller_id', 'username email profile_image rating_avg rating_count')
                .populate('category_id', 'name')
                .populate('currency_id', 'code symbol');
        }

        res.status(200).json({
            items,
            totalCount,
            page: pageNum,
            totalPages: Math.ceil(totalCount / limitNum)
        });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

// @desc    Get logged in user's items
// @route   GET /api/items/myitems
// @access  Private
const getMyItems = asyncHandler(async (req, res) => {
    const { page, limit } = req.query;
    const pageNum = parseInt(page) || 1;
    const limitNum = parseInt(limit) || 12;
    const skip = (pageNum - 1) * limitNum;

    const queryObj = { seller_id: req.user.id };
    const totalCount = await Item.countDocuments(queryObj);

    const items = await Item.find(queryObj)
        .populate('category_id', 'name')
        .populate('subcategory_id', 'name')
        .populate('seller_id', 'username email profile_image rating_avg rating_count is_deleted status')
        .sort({ created_at: -1 })
        .skip(skip)
        .limit(limitNum);

    res.status(200).json({
        items,
        totalCount,
        totalPages: Math.ceil(totalCount / limitNum),
        page: pageNum
    });
});

// @desc    Set item
// @route   POST /api/items
// @access  Private (Seller only usually, but for now authenticated user)
const setItem = asyncHandler(async (req, res) => {
    const {
        title,
        description,
        brand,
        size,
        color,
        condition,
        price,
        currency, // This might be a code like 'INR' 
        negotiable,
        shipping_included,
        category_id,
        subcategory_id,
        item_type_id,
        attributes // JSON string from frontend
    } = req.body;

    if (!title || !price || !category_id || !subcategory_id) {
        res.status(400);
        throw new Error('Please add all required fields');
    }

    // Handle Currency: Find by code or ID
    let currencyId;
    if (currency) {
        // Try finding by code first
        const currencyDoc = await Currency.findOne({ code: currency.toUpperCase() });
        if (currencyDoc) {
            currencyId = currencyDoc._id;
        } else {
            // Assume it's an ID if not found by code, or fail gracefully
            // If currency is provided as ID string
            if (currency.match(/^[0-9a-fA-F]{24}$/)) {
                currencyId = currency;
            } else {
                // Fallback to default if not found or invalid
                const defaultCurrency = await Currency.findOne({ is_active: true }); // Just pick one active
                if (defaultCurrency) currencyId = defaultCurrency._id;
            }
        }
    } else {
        // Default currency if none provided
        const defaultCurrency = await Currency.findOne({ code: 'INR' });
        if (defaultCurrency) currencyId = defaultCurrency._id;
    }

    if (!currencyId) {
        res.status(400);
        throw new Error('Invalid currency');
    }

    // Handle Images
    let images = [];
    if (req.files) {
        images = req.files.map(file => `images/items/${file.filename}`);
    }

    const item = await Item.create({
        seller_id: req.user.id,
        title,
        description,
        brand,
        category_id,
        subcategory_id,
        item_type_id: item_type_id || null, // Optional
        size,
        color,
        condition,
        price,
        currency_id: currencyId,
        negotiable: negotiable === 'true' || negotiable === true,
        shipping_included: shipping_included === 'true' || shipping_included === true,
        images,
        status: 'active',
        attributes: attributes ? JSON.parse(attributes) : []
    });

    res.status(201).json(item);
});

const updateItem = asyncHandler(async (req, res) => {
    const item = await Item.findById(req.params.id);

    if (!item) {
        res.status(404);
        throw new Error('Item not found');
    }

    // Ensure logged in user matches the item seller
    if (item.seller_id.toString() !== req.user.id) {
        res.status(401);
        throw new Error('User not authorized');
    }

    const {
        title,
        description,
        brand,
        size,
        color,
        condition,
        price,
        negotiable,
        shipping_included,
        category_id,
        subcategory_id,
        item_type_id,
        existingImages, // JSON array from frontend
        attributes // JSON array from frontend
    } = req.body;

    // Process images
    let updatedImages = [];

    // 1. Keep images that were already in the DB and not removed in the frontend
    if (existingImages) {
        try {
            const parsedExisting = JSON.parse(existingImages);
            updatedImages = Array.isArray(parsedExisting) ? parsedExisting : [];
        } catch (e) {
            console.error("Error parsing existingImages:", e);
        }
    }

    // 2. Add new uploads
    if (req.files && req.files.length > 0) {
        const newImages = req.files.map(file => `images/items/${file.filename}`);
        updatedImages = [...updatedImages, ...newImages];
    }

    const updateData = {
        title,
        description,
        brand,
        size,
        color,
        condition,
        price: parseFloat(price) || 0,
        negotiable: negotiable === 'true' || negotiable === true,
        shipping_included: shipping_included === 'true' || shipping_included === true,
        category_id,
        subcategory_id,
        item_type_id: item_type_id || item.item_type_id,
        images: updatedImages,
        attributes: attributes ? (typeof attributes === 'string' ? JSON.parse(attributes) : attributes) : item.attributes
    };

    const updatedItem = await Item.findByIdAndUpdate(req.params.id, updateData, {
        new: true,
    });

    res.status(200).json(updatedItem);
});

// @desc    Delete item
// @route   DELETE /api/items/:id
// @access  Private
const deleteItem = asyncHandler(async (req, res) => {
    const item = await Item.findById(req.params.id);

    if (!item) {
        res.status(404);
        throw new Error('Item not found');
    }

    // Check for user
    if (!req.user) {
        res.status(401);
        throw new Error('User not found');
    }

    // Ensure logged in user matches the item seller
    if (item.seller_id.toString() !== req.user.id) {
        res.status(401);
        throw new Error('User not authorized');
    }

    await item.deleteOne();

    res.status(200).json({ id: req.params.id });
});

export {
    getItems,
    getItemById,
    getSimilarItems,
    getMyItems,
    setItem,
    updateItem,
    deleteItem,
};
