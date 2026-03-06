import asyncHandler from 'express-async-handler';
import Review from '../models/Review.js';
import Order from '../models/Order.js';
import Notification from '../models/Notification.js';

// @desc    Create a review for an order
// @route   POST /api/reviews
// @access  Private (Buyer only, after delivery)
const createReview = asyncHandler(async (req, res) => {
    const { order_id, rating, comment } = req.body;

    if (!order_id || !rating) {
        res.status(400);
        throw new Error('Order ID and rating are required');
    }

    // Get the order
    const order = await Order.findById(order_id)
        .populate('item_id', 'title')
        .populate('seller_id', 'username');

    if (!order) {
        res.status(404);
        throw new Error('Order not found');
    }

    // Only buyer can review
    if (order.buyer_id.toString() !== req.user._id.toString()) {
        res.status(403);
        throw new Error('Only the buyer can leave a review');
    }

    // Only after delivery
    if (order.order_status !== 'delivered') {
        res.status(400);
        throw new Error('You can only review after the order is delivered');
    }

    // Check if already reviewed
    const existing = await Review.findOne({ order_id, reviewer_id: req.user._id });
    if (existing) {
        res.status(400);
        throw new Error('You have already reviewed this order');
    }

    const review = await Review.create({
        order_id,
        reviewer_id: req.user._id,
        reviewed_user_id: order.seller_id._id || order.seller_id,
        rating,
        comment: comment || '',
    });

    // Notify the seller
    await Notification.create({
        user_id: order.seller_id._id || order.seller_id,
        title: 'New Review Received!',
        message: `${req.user.username} gave you a ${rating}-star review for "${order.item_id?.title}".`,
        type: 'info',
        link: '/profile?tab=profile_settings',
    });

    res.status(201).json(review);
});

// @desc    Get reviews for a specific user (seller reviews)
// @route   GET /api/reviews/user/:userId
// @access  Public
const getUserReviews = asyncHandler(async (req, res) => {
    const reviews = await Review.find({
        reviewed_user_id: req.params.userId,
        is_visible: true,
    })
        .populate('reviewer_id', 'username profile_image')
        .populate({
            path: 'order_id',
            select: 'item_id order_number',
            populate: { path: 'item_id', select: 'title images' },
        })
        .sort({ created_at: -1 });

    // Calculate average
    const totalRatings = reviews.length;
    const avgRating = totalRatings > 0
        ? (reviews.reduce((sum, r) => sum + r.rating, 0) / totalRatings).toFixed(1)
        : 0;

    res.json({ reviews, avgRating: Number(avgRating), totalRatings });
});

// @desc    Check if a review exists for an order
// @route   GET /api/reviews/order/:orderId
// @access  Private
const getOrderReview = asyncHandler(async (req, res) => {
    const review = await Review.findOne({
        order_id: req.params.orderId,
        reviewer_id: req.user._id,
    });
    res.json(review || null);
});

export {
    createReview,
    getUserReviews,
    getOrderReview,
};
