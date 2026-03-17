import asyncHandler from 'express-async-handler';
import ShippingCompany from '../models/ShippingCompany.js';
import Order from '../models/Order.js';

// @desc    Get active shipping companies
// @route   GET /api/shipping/companies
// @access  Private (Sellers need this)
export const getActiveShippingCompanies = asyncHandler(async (req, res) => {
    const companies = await ShippingCompany.find({ status: 'active' }).sort({ company_name: 1 });
    res.json(companies);
});

// @desc    Dispatch an order (Seller)
// @route   PUT /api/shipping/dispatch/:id
// @access  Private (Seller only)
export const dispatchOrder = asyncHandler(async (req, res) => {
    const { shipping_company_id, tracking_id, dispatch_date } = req.body;

    const order = await Order.findById(req.params.id);

    if (!order) {
        res.status(404);
        throw new Error('Order not found');
    }

    // Validation: Only seller can dispatch
    if (order.seller_id.toString() !== req.user._id.toString()) {
        res.status(401);
        throw new Error('Not authorized to dispatch this order');
    }

    const allowedStatuses = ['pending', 'confirmed', 'packed', 'placed'];
    if (!allowedStatuses.includes(order.order_status)) {
        res.status(400);
        throw new Error(`Order cannot be dispatched from '${order.order_status}' status`);
    }

    if (!tracking_id) {
        res.status(400);
        throw new Error('Tracking ID is required');
    }

    if (!shipping_company_id) {
        res.status(400);
        throw new Error('Shipping company must be selected');
    }

    order.shipping_company_id = shipping_company_id;
    order.tracking_id = tracking_id;
    order.dispatch_date = dispatch_date || new Date();
    order.order_status = 'shipped';

    const updatedOrder = await order.save();

    res.json(updatedOrder);
});

// @desc    Update order status timeline (Admin/Seller)
// @route   PUT /api/shipping/status/:id
// @access  Private
export const updateOrderStatus = asyncHandler(async (req, res) => {
    const { status } = req.body;
    const order = await Order.findById(req.params.id);

    if (!order) {
        res.status(404);
        throw new Error('Order not found');
    }

    const validStatuses = ['pending', 'confirmed', 'packed', 'shipped', 'out_for_delivery', 'delivered', 'cancelled', 'returned'];
    if (!validStatuses.includes(status)) {
        res.status(400);
        throw new Error('Invalid status');
    }

    order.order_status = status;
    if (status === 'delivered') {
        order.delivered_at = new Date();
    }

    await order.save();
    res.json({ message: `Order status updated to ${status}` });
});
