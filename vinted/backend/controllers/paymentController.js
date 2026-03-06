import asyncHandler from 'express-async-handler';
import PaymentMethod from '../models/PaymentMethod.js';
import Stripe from 'stripe';

import Setting from '../models/Setting.js';
import Order from '../models/Order.js';

let stripe_instance;
let current_key;

const getStripe = (secretKey) => {
    const key = secretKey || process.env.STRIPE_SECRET_KEY;
    if (!key) return null;

    if (!stripe_instance || current_key !== key) {
        stripe_instance = new Stripe(key);
        current_key = key;
    }
    return stripe_instance;
};

// @desc    Get all enabled payment methods
// @route   GET /api/payment-methods
// @access  Public
const getPaymentMethods = asyncHandler(async (req, res) => {
    const methods = await PaymentMethod.find({ is_active: true }).sort('sort_order');
    res.json(methods);
});

// @desc    Create Stripe Payment Intent
// @route   POST /api/payment/stripe/create-intent
// @access  Private
const createStripeIntent = asyncHandler(async (req, res) => {
    // Fetch Stripe secret from settings
    const setting = await Setting.findOne({ type: 'payment_settings' });
    let secretKey = process.env.STRIPE_SECRET_KEY;

    if (setting) {
        const isTest = setting.stripe_test_mode !== false;
        secretKey = isTest ? setting.stripe_test_secret_key : setting.stripe_live_secret_key;
    }

    const stripe = getStripe(secretKey);
    if (!stripe) {
        res.status(500).json({ message: 'Stripe is not configured correctly on the server.' });
        return;
    }

    const { amount, currency } = req.body;
    console.log('Stripe Intent Request:', { amount, currency });

    if (!amount || isNaN(amount)) {
        res.status(400);
        throw new Error('Valid amount is required');
    }

    try {
        const paymentIntent = await stripe.paymentIntents.create({
            amount: Math.round(amount * 100), // convert to cents
            currency: currency || 'inr',
            description: `Order for User: ${req.user?._id || 'Guest'} - ${req.user?.email || ''}`,
            automatic_payment_methods: {
                enabled: true,
            },
        });

        res.json({
            clientSecret: paymentIntent.client_secret,
        });
    } catch (error) {
        console.error('Stripe Error:', error.message);
        res.status(400).json({
            message: error.message || 'Payment provider error',
            type: error.type
        });
    }
});

// @desc    Handle Stripe Webhooks
// @route   POST /api/payments/webhook
// @access  Public (Signature verified)
const stripeWebhook = asyncHandler(async (req, res) => {
    const sig = req.headers['stripe-signature'];

    // Fetch settings to get secret key and webhook secret
    const setting = await Setting.findOne({ type: 'payment_settings' });
    let secretKey = process.env.STRIPE_SECRET_KEY;
    let endpointSecret = process.env.STRIPE_WEBHOOK_SECRET;

    if (setting) {
        const isTest = setting.stripe_test_mode !== false;
        secretKey = isTest ? setting.stripe_test_secret_key : setting.stripe_live_secret_key;
        endpointSecret = isTest ? setting.stripe_test_webhook_secret : setting.stripe_live_webhook_secret;
    }

    const stripe = getStripe(secretKey);
    if (!stripe || !endpointSecret) {
        console.error('Webhook Error: Stripe or Webhook Secret not configured');
        return res.status(400).send('Webhook Error: Server not configured');
    }

    let event;

    try {
        // IMPORTANT: Webhook needs the RAW body to verify signature
        // The server.js middleware must be configured to pass raw body for this route
        event = stripe.webhooks.constructEvent(req.body, sig, endpointSecret);
    } catch (err) {
        console.error(`Webhook Error: ${err.message}`);
        return res.status(400).send(`Webhook Error: ${err.message}`);
    }

    // Handle the event
    switch (event.type) {
        case 'payment_intent.succeeded':
            const paymentIntent = event.data.object;
            console.log(`PaymentIntent for ${paymentIntent.amount} was successful!`);

            // Update order status in database
            const order = await Order.findOne({ stripe_payment_id: paymentIntent.id });
            if (order) {
                order.payment_status = 'paid';
                await order.save();
                console.log(`Order ${order.order_number} marked as PAID via Webhook.`);
            }
            break;

        case 'payment_intent.payment_failed':
            const failedIntent = event.data.object;
            console.log(`PaymentIntent for ${failedIntent.amount} failed.`);
            const failedOrder = await Order.findOne({ stripe_payment_id: failedIntent.id });
            if (failedOrder) {
                failedOrder.payment_status = 'failed';
                await failedOrder.save();
            }
            break;

        default:
            console.log(`Unhandled event type ${event.type}`);
    }

    res.json({ received: true });
});

export {
    getPaymentMethods,
    createStripeIntent,
    stripeWebhook
};
