import asyncHandler from 'express-async-handler';
import Order from '../models/Order.js';
import Item from '../models/Item.js';
import { processOrderPaymentSplit } from './walletController.js';
import Notification from '../models/Notification.js';
import Conversation from '../models/Conversation.js';
import Message from '../models/Message.js';
import { reverseOrderPayment } from './walletController.js';
import { processRefundSplit } from './walletController.js';

// @desc    Create new order
// @route   POST /api/orders
// @access  Private
const createOrder = asyncHandler(async (req, res) => {
    console.log('CREATE ORDER REQUEST:', req.body);
    const { items, payment_method, paymentMethod, shipping_address, stripe_payment_id } = req.body;
    const actualPaymentMethod = payment_method || paymentMethod || 'card';

    if (!items || items.length === 0) {
        res.status(400);
        throw new Error('No items in order');
    }

    const createdOrders = [];

    // Protocol: Create an order for each item (since they might have different sellers)
    for (const cartItem of items) {
        const item = await Item.findById(cartItem._id);
        if (!item) continue;

        // CRITICAL: Prevent purchasing of sold items
        if (item.is_sold || item.status === 'sold') {
            console.warn(`Attempted purchase of sold item: ${item._id}`);
            continue;
        }

        const orderNumber = `ORD-${Date.now()}-${Math.floor(Math.random() * 1000)}`;

        const shippingFee = item.shipping_included ? 0 : 200; // Flat 200 fee from frontend
        const totalAmount = item.price + shippingFee;

        const order = await Order.create({
            order_number: orderNumber,
            item_id: item._id,
            buyer_id: req.user._id,
            seller_id: item.seller_id,
            item_price: item.price,
            shipping_fee: shippingFee,
            total_amount: totalAmount,
            payment_method: actualPaymentMethod,
            payment_status: 'paid', // Assuming payment succeeded on frontend
            order_status: 'placed',
            shipping_address
        });

        // Track Stripe payment ID if provided
        if (stripe_payment_id) {
            order.stripe_payment_id = stripe_payment_id;
            await order.save();
        }

        // Trigger Wallet Split (Calculates 2% Admin, 98% Seller)
        const { adminCommission } = await processOrderPaymentSplit({
            seller_id: item.seller_id,
            item_price: item.price,
            shipping_fee: shippingFee,
            order_id: order._id
        });

        // Save platform_fee explicitly so it tracks in the Admin Report Analytics
        order.platform_fee = adminCommission;
        await order.save();

        // Mark item as sold
        item.status = 'sold';
        item.is_sold = true;
        await item.save();

        // 1. Notify Seller
        await Notification.create({
            user_id: item.seller_id,
            title: 'New Order Received!',
            message: `Your item "${item.title}" has been booked by ${req.user.username}. Order ID: #${orderNumber}`,
            type: 'order',
            link: `/profile?tab=orders`
        });

        // 2. Notify Buyer
        await Notification.create({
            user_id: req.user._id,
            title: 'Order Confirmed!',
            message: `Your order for "${item.title}" (#${orderNumber}) has been placed successfully. Track your order in the Orders section.`,
            type: 'order',
            link: `/profile?tab=orders`
        });

        // 3. Send System Message in Conversation
        try {
            // Find or create conversation
            let conversation = await Conversation.findOne({
                participants: { $all: [req.user._id, item.seller_id] },
                item_id: item._id
            });

            if (!conversation) {
                conversation = await Conversation.create({
                    participants: [req.user._id, item.seller_id],
                    item_id: item._id,
                    initiator_id: req.user._id,
                    status: 'accepted'
                });
            } else if (conversation.status !== 'accepted') {
                // If it was rejected or pending, force accept because a purchase happened
                conversation.status = 'accepted';
                await conversation.save();
            }

            const systemMetadata = JSON.stringify({
                type: 'order_placed',
                item_title: item.title,
                item_image: item.images?.[0] || '',
                buyer_name: req.user.username,
                order_id: orderNumber,
                item_price: item.price,
                shipping_fee: shippingFee,
                total_amount: totalAmount,
                payment_method: actualPaymentMethod
            });

            const systemMsgText = `ORDER_NOTIFICATION::${systemMetadata}`;

            const newMessage = await Message.create({
                conversation_id: conversation._id,
                sender_id: req.user._id,
                receiver_id: item.seller_id,
                message: systemMsgText,
                message_type: 'system'
            });

            conversation.last_message = `🛒 Order placed: "${item.title}" by ${req.user.username}`;
            conversation.last_message_at = Date.now();
            await conversation.save();

            // Emit to socket for immediate reflection
            if (req.io) {
                req.io.to(conversation._id.toString()).emit('receive_message', {
                    message: newMessage,
                    conversation: conversation
                });
            }
        } catch (msgErr) {
            console.error("Error sending system message:", msgErr);
            // Non-blocking error
        }

        createdOrders.push(order);
    }

    res.status(201).json(createdOrders);
});

// @desc    Get user orders (Bought and Sold)
// @route   GET /api/orders
// @access  Private
const getMyOrders = asyncHandler(async (req, res) => {
    const bought = await Order.find({ buyer_id: req.user._id })
        .populate('item_id', 'title images')
        .populate('seller_id', 'username')
        .sort({ created_at: -1 });

    const sold = await Order.find({ seller_id: req.user._id })
        .populate('item_id', 'title images')
        .populate('buyer_id', 'username')
        .sort({ created_at: -1 });

    console.log(`FETCH ORDERS FOR USER: ${req.user._id}, Bought: ${bought.length}, Sold: ${sold.length}`);
    res.json({ bought, sold });
});

// @desc    Update order shipping address
// @route   PUT /api/orders/:id/address
// @access  Private
const updateOrderAddress = asyncHandler(async (req, res) => {
    const order = await Order.findById(req.params.id);

    if (!order) {
        res.status(404);
        throw new Error('Order not found');
    }

    // Only buyer can update the address
    if (order.buyer_id.toString() !== req.user._id.toString()) {
        res.status(401);
        throw new Error('Not authorized to update this order');
    }

    // Only allow update if order is not yet shipped/delivered
    if (!['pending', 'processing'].includes(order.order_status)) {
        res.status(400);
        throw new Error('Cannot update address for an order that is already shipped or delivered');
    }

    order.shipping_address = req.body.shipping_address;
    const updatedOrder = await order.save();

    res.json(updatedOrder);
});

// @desc    Update order status
// @route   PUT /api/orders/:id/status
// @access  Private
const updateOrderStatus = asyncHandler(async (req, res) => {
    const { status } = req.body;
    const order = await Order.findById(req.params.id);

    if (!order) {
        res.status(404);
        throw new Error('Order not found');
    }

    // Only seller or admin can update status
    if (order.seller_id.toString() !== req.user._id.toString()) {
        res.status(401);
        throw new Error('Not authorized to update this order status');
    }

    const prevStatus = order.order_status;
    order.order_status = status;
    const updatedOrder = await order.save();

    // Populate for notifications
    const populatedOrder = await Order.findById(order._id).populate('item_id', 'title');

    // Notify buyer on status changes
    if (status === 'dispatched') {
        await Notification.create({
            user_id: order.buyer_id,
            title: 'Order Dispatched!',
            message: `Your order "${populatedOrder.item_id?.title}" (#${order.order_number}) has been dispatched by the seller.`,
            type: 'order',
            link: '/profile?tab=orders'
        });
    } else if (status === 'on_the_way') {
        await Notification.create({
            user_id: order.buyer_id,
            title: 'Order On The Way!',
            message: `Your order "${populatedOrder.item_id?.title}" (#${order.order_number}) is on its way to you.`,
            type: 'order',
            link: '/profile?tab=orders'
        });
    } else if (status === 'delivered') {
        await Notification.create({
            user_id: order.buyer_id,
            title: 'Order Delivered! ⭐',
            message: `Your order "${populatedOrder.item_id?.title}" has been delivered! Please rate the seller and share your experience.`,
            type: 'order',
            link: '/profile?tab=orders'
        });
        // Set delivered_at timestamp
        if (order.delivered_at == null) {
            order.delivered_at = new Date();
            await order.save();
        }

        // Also send system message in conversation
        try {
            const conversation = await Conversation.findOne({
                participants: { $all: [order.buyer_id, order.seller_id] },
            });
            if (conversation) {
                const deliveryMeta = JSON.stringify({
                    type: 'order_delivered',
                    item_title: populatedOrder.item_id?.title,
                    order_id: order.order_number,
                });
                const newMessage = await Message.create({
                    conversation_id: conversation._id,
                    sender_id: order.seller_id,
                    receiver_id: order.buyer_id,
                    message: `ORDER_NOTIFICATION::${deliveryMeta}`,
                    message_type: 'system'
                });
                conversation.last_message = `✅ Order delivered: "${populatedOrder.item_id?.title}"`;
                conversation.last_message_at = Date.now();
                await conversation.save();

                // Emit to socket for immediate reflection
                if (req.io) {
                    req.io.to(conversation._id.toString()).emit('receive_message', {
                        message: newMessage,
                        conversation: conversation
                    });
                }
            }
        } catch (err) {
            console.error('Error sending delivery message:', err);
        }
    }

    // If order is cancelled, trigger wallet reversal
    if (status === 'cancelled' && prevStatus !== 'cancelled') {
        await reverseOrderPayment(order._id);

        // Also mark item as available again
        await Item.findByIdAndUpdate(order.item_id, { status: 'available', is_sold: false });
    }

    res.json(updatedOrder);
});

// @desc    Cancel order (Buyer only, only if not dispatched)
// @route   POST /api/orders/:id/cancel
// @access  Private
const cancelOrder = asyncHandler(async (req, res) => {
    const order = await Order.findById(req.params.id);

    if (!order) {
        res.status(404);
        throw new Error('Order not found');
    }

    // Only buyer can cancel
    if (order.buyer_id.toString() !== req.user._id.toString()) {
        res.status(401);
        throw new Error('Not authorized to cancel this order');
    }

    // Can only cancel if still in 'placed' status
    if (order.order_status !== 'placed') {
        res.status(400);
        throw new Error('Order cannot be cancelled as it is already being processed or shipped');
    }

    order.order_status = 'cancelled';
    await order.save();

    await reverseOrderPayment(order._id);

    // Mark item as available again
    await Item.findByIdAndUpdate(order.item_id, { status: 'available', is_sold: false });

    // Notify Seller
    await Notification.create({
        user_id: order.seller_id,
        title: 'Order Cancelled',
        message: `Order #${order.order_number} has been cancelled by the buyer.`,
        type: 'info',
        link: `/profile?tab=orders`
    });

    res.json({ message: 'Order cancelled successfully and refund processed' });
});

// @desc    Request a return (Buyer only, within 5 days of delivery)
// @route   POST /api/orders/:id/return
// @access  Private
const requestReturn = asyncHandler(async (req, res) => {
    const { reason } = req.body;
    const order = await Order.findById(req.params.id);

    if (!order) {
        res.status(404);
        throw new Error('Order not found');
    }

    // Only buyer can request return
    if (order.buyer_id.toString() !== req.user._id.toString()) {
        res.status(401);
        throw new Error('Not authorized to request return for this order');
    }

    if (order.order_status !== 'delivered') {
        res.status(400);
        throw new Error('Only delivered orders can be returned');
    }

    // Check if within 5 days limit
    if (order.delivered_at) {
        const diffTime = Math.abs(new Date() - new Date(order.delivered_at));
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
        if (diffDays > 5) {
            res.status(400);
            throw new Error('Return period of 5 days has expired.');
        }
    } else {
        // Fallback if delivered_at wasn't set somehow
        const diffTime = Math.abs(new Date() - new Date(order.updated_at));
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
        if (diffDays > 5) {
            res.status(400);
            throw new Error('Return period of 5 days has expired.');
        }
    }

    order.order_status = 'return_requested';
    order.return_reason = reason;
    await order.save();

    // Notify Seller
    await Notification.create({
        user_id: order.seller_id,
        title: 'Return Requested',
        message: `Buyer requested a return for order #${order.order_number}. Reason: ${reason}`,
        type: 'alert',
        link: `/profile?tab=orders`
    });

    res.json({ message: 'Return requested successfully', order });
});

// @desc    Process a return (Seller only)
// @route   POST /api/orders/:id/process-return
// @access  Private
const processReturn = asyncHandler(async (req, res) => {
    const { refundType, amount, reason } = req.body;
    // refundType can be 'full' or 'partial'
    const order = await Order.findById(req.params.id);

    if (!order) {
        res.status(404);
        throw new Error('Order not found');
    }

    if (order.seller_id.toString() !== req.user._id.toString()) {
        res.status(401);
        throw new Error('Not authorized to process return for this order');
    }

    if (order.order_status !== 'return_requested') {
        res.status(400);
        throw new Error('Order is not in a return_requested state');
    }

    await processRefundSplit(order._id, refundType, amount, reason);

    // Update order status
    order.order_status = 'returned';
    order.payment_status = refundType === 'partial' ? 'partially_refunded' : 'refunded';
    order.partial_refund_reason = reason;
    order.refund_amount = refundType === 'full' ? order.total_amount : amount;
    await order.save();

    // Mark item as available again if full refund
    if (refundType === 'full') {
        await Item.findByIdAndUpdate(order.item_id, { status: 'available', is_sold: false });
    }

    // Notify Buyer
    await Notification.create({
        user_id: order.buyer_id,
        title: `Return Processed (${refundType === 'full' ? 'Full' : 'Partial'} Refund)`,
        message: `Your return for order #${order.order_number} has been processed.`,
        type: 'info',
        link: `/profile?tab=orders`
    });

    res.json({ message: 'Return processed successfully', order });
});


export {
    createOrder,
    getMyOrders,
    updateOrderAddress,
    updateOrderStatus,
    cancelOrder,
    requestReturn,
    processReturn
};
