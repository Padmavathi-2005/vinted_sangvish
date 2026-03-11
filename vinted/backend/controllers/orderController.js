import asyncHandler from 'express-async-handler';
import Order from '../models/Order.js';
import Item from '../models/Item.js';
import Notification from '../models/Notification.js';
import Conversation from '../models/Conversation.js';
import Message from '../models/Message.js';
import { processOrderPaymentSplit, reverseOrderPayment, processRefundSplit } from './walletController.js';

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

    // Group items by seller_id to handle bundles
    const sellerGroups = {};
    for (const cartItem of items) {
        const item = await Item.findById(cartItem._id).populate('seller_id');
        if (!item) continue;

        if (item.is_sold || item.status === 'sold') {
            console.warn(`Attempted purchase of sold item: ${item._id}`);
            continue;
        }

        const sellerId = item.seller_id?._id?.toString() || item.seller_id?.toString();
        if (!sellerGroups[sellerId]) {
            sellerGroups[sellerId] = {
                items: [],
                seller: item.seller_id
            };
        }
        sellerGroups[sellerId].items.push(item);
    }

    // Process each seller group as a single Order (Unified Transaction)
    for (const sellerId in sellerGroups) {
        const group = sellerGroups[sellerId];
        const groupItems = group.items;
        const seller = group.seller;

        const orderNumber = `ORD-${Date.now()}-${Math.floor(Math.random() * 1000)}`;

        // Calculate Totals
        const itemPriceSum = groupItems.reduce((sum, i) => sum + i.price, 0);

        // Calculate Bundle Discount
        let discountAmount = 0;
        if (seller.bundle_discounts?.enabled) {
            const count = groupItems.length;
            let percentage = 0;
            if (count >= 5) percentage = seller.bundle_discounts.five_items;
            else if (count >= 3) percentage = seller.bundle_discounts.three_items;
            else if (count >= 2) percentage = seller.bundle_discounts.two_items;

            if (percentage > 0) {
                discountAmount = Math.round((itemPriceSum * percentage) / 100);
            }
        }

        // Calculate Combined Shipping
        const anyFreeShipping = groupItems.some(i => i.shipping_included);
        const shippingFee = anyFreeShipping ? 0 : 200;

        const discountedItemPrice = itemPriceSum - discountAmount;
        const totalAmount = discountedItemPrice + shippingFee;

        // Create Order record
        const order = await Order.create({
            order_number: orderNumber,
            item_id: groupItems[0]._id, // First item for compatibility
            items: groupItems.map(i => ({ item_id: i._id, price: i.price })),
            is_bundle: groupItems.length > 1,
            buyer_id: req.user._id,
            seller_id: sellerId,
            item_price: itemPriceSum,
            bundle_discount_amount: discountAmount,
            shipping_fee: shippingFee,
            total_amount: totalAmount,
            payment_method: actualPaymentMethod,
            payment_status: 'paid',
            order_status: 'placed',
            shipping_address,
            stripe_payment_id
        });

        // Split Wallet (98% to seller, 2% to admin)
        const { adminCommission } = await processOrderPaymentSplit({
            seller_id: sellerId,
            item_price: discountedItemPrice,
            shipping_fee: shippingFee,
            order_id: order._id
        });

        order.platform_fee = adminCommission;
        await order.save();

        // Mark all items as sold
        for (const item of groupItems) {
            item.status = 'sold';
            item.is_sold = true;
            await item.save();
        }

        // 1. Notify Seller
        await Notification.create({
            user_id: sellerId,
            title: groupItems.length > 1 ? 'New Bundle Order!' : 'New Order Received!',
            message: groupItems.length > 1
                ? `You sold a bundle of ${groupItems.length} items to ${req.user.username}. Order ID: #${orderNumber}`
                : `Your item "${groupItems[0].title}" has been booked by ${req.user.username}. Order ID: #${orderNumber}`,
            type: 'order',
            link: `/profile?tab=orders`
        });

        // 2. Notify Buyer
        await Notification.create({
            user_id: req.user._id,
            title: 'Order Confirmed!',
            message: groupItems.length > 1
                ? `Your bundle order (#${orderNumber}) from ${seller.username} has been placed successfully.`
                : `Your order for "${groupItems[0].title}" (#${orderNumber}) has been placed successfully.`,
            type: 'order',
            link: `/profile?tab=orders`
        });

        // 3. Send System Message in Conversation
        try {
            let conversation = await Conversation.findOne({
                participants: { $all: [req.user._id, sellerId] },
                item_id: groupItems[0]._id
            });

            if (!conversation) {
                conversation = await Conversation.create({
                    participants: [req.user._id, sellerId],
                    item_id: groupItems[0]._id,
                    initiator_id: req.user._id,
                    status: 'accepted'
                });
            } else if (conversation.status !== 'accepted') {
                conversation.status = 'accepted';
                await conversation.save();
            }

            const systemMetadata = JSON.stringify({
                type: 'order_placed',
                item_title: groupItems.length > 1 ? `Bundle of ${groupItems.length} items` : groupItems[0].title,
                item_image: groupItems[0].images?.[0] || '',
                bundle_count: groupItems.length,
                buyer_name: req.user.username,
                order_id: orderNumber,
                item_price: itemPriceSum,
                discount: discountAmount,
                shipping_fee: shippingFee,
                total_amount: totalAmount,
                payment_method: actualPaymentMethod
            });

            const systemMsgText = `ORDER_NOTIFICATION::${systemMetadata}`;

            const newMessage = await Message.create({
                conversation_id: conversation._id,
                sender_id: req.user._id,
                receiver_id: sellerId,
                message: systemMsgText,
                message_type: 'system'
            });

            conversation.last_message = groupItems.length > 1
                ? `🛒 Bundle order placed by ${req.user.username}`
                : `🛒 Order placed: "${groupItems[0].title}" by ${req.user.username}`;
            conversation.last_message_at = Date.now();
            await conversation.save();

            if (req.io) {
                req.io.to(conversation._id.toString()).emit('receive_message', {
                    message: newMessage,
                    conversation: conversation
                });
            }
        } catch (msgErr) {
            console.error("Error sending system message:", msgErr);
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
