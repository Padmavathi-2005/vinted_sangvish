import asyncHandler from 'express-async-handler';
import Newsletter from '../models/Newsletter.js';

// @desc    Subscribe to newsletter
// @route   POST /api/newsletter/subscribe
// @access  Public
const subscribeNewsletter = asyncHandler(async (req, res) => {
    const { email } = req.body;

    if (!email) {
        res.status(400);
        throw new Error('Please provide an email address');
    }

    const emailRegex = /^\S+@\S+\.\S+$/;
    if (!emailRegex.test(email)) {
        res.status(400);
        throw new Error('Please provide a valid email address');
    }

    const existing = await Newsletter.findOne({ email });

    if (existing) {
        if (existing.status === 'unsubscribed') {
            existing.status = 'active';
            await existing.save();
            return res.status(200).json({ message: 'Welcome back! Your subscription is active again.' });
        }
        res.status(400);
        throw new Error('This email is already subscribed');
    }

    await Newsletter.create({
        email,
        source: 'footer',
        ip: req.ip || req.connection.remoteAddress || ''
    });

    res.status(201).json({ message: 'Thank you for subscribing to our newsletter!' });
});

// @desc    Get all subscribers
// @route   GET /api/admin/newsletter
// @access  Private (Admin)
const getSubscribers = asyncHandler(async (req, res) => {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const skip = (page - 1) * limit;
    const status = req.query.status || '';
    const search = req.query.search || '';

    const filter = {};
    if (status) filter.status = status;
    if (search) filter.email = { $regex: search, $options: 'i' };

    const [subscribers, total] = await Promise.all([
        Newsletter.find(filter).sort({ created_at: -1 }).skip(skip).limit(limit),
        Newsletter.countDocuments(filter),
    ]);

    res.json({
        subscribers,
        total,
        page,
        totalPages: Math.ceil(total / limit),
    });
});

// @desc    Update a subscriber
// @route   PATCH /api/admin/newsletter/:id
// @access  Private (Admin)
const updateSubscriber = asyncHandler(async (req, res) => {
    const subscriber = await Newsletter.findByIdAndUpdate(req.params.id, req.body, { new: true });
    if (!subscriber) {
        res.status(404);
        throw new Error('Subscriber not found');
    }
    res.json(subscriber);
});

// @desc    Delete a subscriber
// @route   DELETE /api/admin/newsletter/:id
// @access  Private (Admin)
const deleteSubscriber = asyncHandler(async (req, res) => {
    const subscriber = await Newsletter.findByIdAndDelete(req.params.id);
    if (!subscriber) {
        res.status(404);
        throw new Error('Subscriber not found');
    }
    res.json({ message: 'Subscriber removed' });
});

export {
    subscribeNewsletter,
    getSubscribers,
    updateSubscriber,
    deleteSubscriber,
};
