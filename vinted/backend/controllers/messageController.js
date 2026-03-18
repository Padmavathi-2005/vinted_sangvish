import asyncHandler from 'express-async-handler';
import mongoose from 'mongoose';
import Message from '../models/Message.js';
import Conversation from '../models/Conversation.js';
import Notification from '../models/Notification.js';
import User from '../models/User.js';
import Admin from '../models/Admin.js';
import Currency from '../models/Currency.js';
import sendEmail from '../utils/sendEmail.js';

// Helper for population
const participantsPopulate = {
    path: 'participants.user',
    select: 'name username profile_image last_login'
};

// @desc    Get all conversations for user/admin
// @route   GET /api/messages/conversations
// @access  Private
const getConversations = asyncHandler(async (req, res) => {
    const identifier = req.user._id;
    console.log(`[getConversations] Fetching for user: ${identifier}`);

    let query = { 'participants.user': identifier };

    // If the user is an admin, allow them to see all conversations
    if (req.user.role === 'admin') {
        console.log(`[Admin getConversations] Admin user ${identifier} is requesting all conversations.`);
        query = {}; // Fetch all conversations for admin
    }

    let conversations = [];
    try {
        conversations = await Conversation.find(query)
            .populate(participantsPopulate)
            .populate('item_id', 'title price images currency_id')
            .sort({ last_message_at: -1 });
        
        console.log(`[getConversations] Found ${conversations.length} conversations`);
    } catch (err) {
        console.error('getConversations populate error:', err.message);
        // Try without populate on failure
        conversations = await Conversation.find({ 'participants.user': identifier })
            .sort({ last_message_at: -1 });
    }

    // Filter out any bad conversations where participants failed to populate
    const safe = conversations.filter(conv =>
        conv.participants && conv.participants.length >= 1
    );

    res.status(200).json(safe);
});

// @desc    Get total message count for admin
// @route   GET /api/admin-messages/count
// @access  Private (Admin)
const getAdminMessagesCount = asyncHandler(async (req, res) => {
    // For admin, we might want to count all conversations that need attention
    // or just the total number of conversations.
    // Let's count all "pending" status conversations or just total count for now.
    const count = await Conversation.countDocuments({ status: 'pending' });
    res.status(200).json({ count });
});

// @desc    Get messages for a conversation
// @route   GET /api/messages/:id
// @access  Private
const getMessages = asyncHandler(async (req, res) => {
    const conversation = await Conversation.findById(req.params.id)
        .populate(participantsPopulate)
        .populate('item_id', 'title price images currency_id');

    if (!conversation) {
        res.status(404);
        throw new Error('Conversation not found');
    }

    // Null-safe participant check
    const isParticipant = conversation.participants.some(p => {
        const pid = p.user?._id || p.user;
        return pid?.toString() === req.user._id.toString();
    });
    if (!isParticipant) {
        res.status(401);
        throw new Error('User not authorized');
    }

    const messages = await Message.find({ conversation_id: req.params.id })
        .populate('sender_id', 'name username profile_image')
        .sort({ created_at: 1 });

    res.status(200).json({
        conversation,
        messages
    });
});

// @desc    Send a message
// @route   POST /api/messages
// @access  Private
const sendMessage = asyncHandler(async (req, res) => {
    const { receiver_id, receiver_model = 'User', message, item_id, message_type = 'text', offer_amount = null } = req.body;

    if (!receiver_id || !message) {
        res.status(400);
        throw new Error('Please add receiver and message');
    }

    const sender_id = req.user._id;
    const sender_model = req.user.role === 'admin' ? 'Admin' : 'User';

    // Find if conversation already exists
    let conversation = await Conversation.findOne({
        participants: {
            $all: [
                { $elemMatch: { user: sender_id, on_model: sender_model } },
                { $elemMatch: { user: receiver_id, on_model: receiver_model } }
            ]
        },
    });

    let isNewRequest = false;

    if (!conversation) {
        conversation = await Conversation.create({
            participants: [
                { user: sender_id, on_model: sender_model },
                { user: receiver_id, on_model: receiver_model }
            ],
            item_id: item_id,
            status: sender_model === 'Admin' ? 'accepted' : 'pending', // Admin starts as accepted
            initiator_id: sender_id,
            initiator_model: sender_model,
            last_message: message,
            last_message_at: Date.now(),
        });
        isNewRequest = true;
    } else {
        if (conversation.blocked_by && conversation.blocked_by.length > 0) {
            res.status(403);
            throw new Error('This conversation is blocked.');
        }

        if (conversation.status === 'rejected') {
            res.status(403);
            throw new Error('This message request was declined.');
        }

        conversation.last_message = message;
        conversation.last_message_at = Date.now();
        await conversation.save();
    }

    const newMessage = await Message.create({
        conversation_id: conversation._id,
        sender_id: sender_id,
        sender_model: sender_model,
        receiver_id: receiver_id,
        receiver_model: receiver_model,
        message: message,
        message_type: message_type,
        offer_amount: offer_amount,
    });

    const populatedMessage = await Message.findById(newMessage._id).populate('sender_id', 'name username profile_image');

    // Handle Notifications
    if (isNewRequest) {
        await Notification.create({
            user_id: receiver_id,
            on_model: receiver_model,
            title: 'New Message Request',
            message: `${req.user.role === 'admin' ? 'Admin' : (req.user.username || req.user.name)} wants to start a conversation with you.`,
            type: 'request',
            link: receiver_model === 'Admin' ? `/messages` : `/profile?tab=messages&conversation=${conversation._id}`,
        });
    } else if (conversation.status === 'accepted') {
        await Notification.create({
            user_id: receiver_id,
            on_model: receiver_model,
            title: 'New Message',
            message: `You have a new message from ${req.user.role === 'admin' ? 'Admin' : (req.user.username || req.user.name)}`,
            type: 'message',
            link: receiver_model === 'Admin' ? `/messages` : `/profile?tab=messages&conversation=${conversation._id}`,
        });
    }

    // EMAIL NOTIFICATIONS
    try {
        // A) Support Ticket Auto-Reply
        if (receiver_model === 'Admin' && req.user.role !== 'admin') {
            // User messaging admin
            await sendEmail({
                email: req.user.email,
                subject: 'Support Ticket Received!',
                message: 'We have received your message. Our team will get back to you shortly.',
                html: `
                    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; border: 1px solid #eee; border-radius: 10px; padding: 20px;">
                        <h2 style="color: #0d6efd;">Message Received!</h2>
                        <p>Hi ${req.user.username || req.user.name},</p>
                        <p>We've received your inquiry and a support ticket has been opened. Our administrators will review your message and reply as soon as possible.</p>
                        <hr style="border: 0; border-top: 1px solid #eee; margin: 20px 0;">
                        <p style="color: #666; font-size: 14px;"><b>Your message:</b></p>
                        <p style="background: #f9f9f9; padding: 15px; border-radius: 5px; color: #333;">${message}</p>
                    </div>
                `
            });
        }

        // B) Offline User Notification
        if (receiver_model === 'User') {
            const recipient = await User.findById(receiver_id);
            if (recipient) {
                const now = new Date();
                const lastSeen = recipient.last_login || new Date(0);
                const diffMinutes = (now - lastSeen) / (1000 * 60);

                // If recipient hasn't been active in the last 5 minutes, send email
                if (diffMinutes > 5) {
                    const isFromAdmin = req.user.role === 'admin';
                    await sendEmail({
                        email: recipient.email,
                        subject: isFromAdmin ? 'New Update on your Support Ticket' : 'You have a new message on Vinted!',
                        message: isFromAdmin ? 'Our support team has replied to your inquiry.' : `You have a new message from ${req.user.username || req.user.name}`,
                        html: `
                            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; border: 1px solid #eee; border-radius: 10px; padding: 20px; text-align: center;">
                                <h2 style="color: ${isFromAdmin ? '#0d6efd' : '#333'};">${isFromAdmin ? 'Support Team Response' : 'New Message!'}</h2>
                                <p style="color: #666;">${isFromAdmin ? 'Good news! Our support team has responded to your inquiry:' : `While you were away, <b>${req.user.username || req.user.name}</b> sent you a message:`}</p>
                                <p style="background-color: #f4f4f4; padding: 15px; border-radius: 5px; color: #333; margin: 20px 0;">"${message.length > 100 ? message.substring(0, 97) + '...' : message}"</p>
                                <a href="${process.env.BACKEND_URL.replace('/api', '')}/profile?tab=messages&conversation=${conversation._id}" style="display: inline-block; background-color: #0d6efd; color: #fff; padding: 12px 25px; text-decoration: none; border-radius: 5px; font-weight: bold;">View Reply</a>
                            </div>
                        `
                    });
                }
            }
        }
    } catch (err) {
        console.error('Messaging email notification failed:', err);
    }

    if (req.io) {
        req.io.to(conversation._id.toString()).emit('receive_message', {
            message: populatedMessage,
            conversation: conversation
        });
    }

    res.status(201).json({ message: populatedMessage, conversation });
});

// @desc    Respond to message request
// @route   PATCH /api/messages/respond/:id
// @access  Private
const respondToRequest = asyncHandler(async (req, res) => {
    const { status } = req.body; // 'accepted' or 'rejected'
    if (!['accepted', 'rejected'].includes(status)) {
        res.status(400);
        throw new Error('Invalid status');
    }

    const conversation = await Conversation.findById(req.params.id)
        .populate(participantsPopulate);

    if (!conversation) {
        res.status(404);
        throw new Error('Conversation not found');
    }

    if (conversation.initiator_id.toString() === req.user._id.toString()) {
        res.status(401);
        throw new Error('Only the recipient can respond to the request');
    }

    conversation.status = status;
    await conversation.save();

    // Notify initiator
    const initiatorId = conversation.initiator_id;
    await Notification.create({
        user_id: initiatorId,
        on_model: conversation.initiator_model,
        title: status === 'accepted' ? 'Message Request Accepted' : 'Message Request Rejected',
        message: `${req.user.username || req.user.name} ${status === 'accepted' ? 'accepted' : 'declined'} your request.`,
        type: status === 'accepted' ? 'success' : 'error',
        link: conversation.initiator_model === 'Admin' ? `/messages` : `/profile?tab=messages&conversation=${conversation._id}`,
    });

    if (req.io) {
        req.io.to(conversation._id.toString()).emit('receive_message', {
            message: null,
            conversation: conversation
        });
    }

    res.status(200).json(conversation);
});

// @desc    Toggle block status
// @route   PATCH /api/messages/block/:id
// @access  Private
const toggleBlock = asyncHandler(async (req, res) => {
    const conversation = await Conversation.findById(req.params.id);
    if (!conversation) {
        res.status(404);
        throw new Error('Conversation not found');
    }

    const isParticipant = conversation.participants.some(p => p.user.toString() === req.user._id.toString());
    if (!isParticipant) {
        res.status(401);
        throw new Error('User not authorized');
    }

    const index = conversation.blocked_by.indexOf(req.user._id);
    if (index === -1) {
        conversation.blocked_by.push(req.user._id);
    } else {
        conversation.blocked_by.splice(index, 1);
    }

    await conversation.save();
    res.status(200).json(conversation);
});

// @desc    Respond to an offer
// @route   PATCH /api/messages/offer/:id
// @access  Private
const respondToOffer = asyncHandler(async (req, res) => {
    const { status } = req.body; // 'accepted' or 'declined'
    if (!['accepted', 'declined'].includes(status)) {
        res.status(400);
        throw new Error('Invalid status');
    }

    const message = await Message.findById(req.params.id);
    if (!message || message.message_type !== 'offer') {
        res.status(404);
        throw new Error('Offer not found');
    }

    if (message.receiver_id.toString() !== req.user._id.toString()) {
        res.status(401);
        throw new Error('Only the recipient can respond to this offer');
    }

    message.offer_status = status;
    await message.save();

    const conversation = await Conversation.findById(message.conversation_id).populate('item_id', 'currency_id title');
    let symbol = '$';
    if (conversation && conversation.item_id && conversation.item_id.currency_id) {
        // Find currency symbol without requiring the full model import if possible, or assume it's there
        const Currency = mongoose.model('Currency');
        const curr = await Currency.findById(conversation.item_id.currency_id);
        if (curr) symbol = curr.symbol;
    }

    // Send a system message indicating the outcome
    const systemMessageText = status === 'accepted'
        ? `✅ Offer of ${symbol}${message.offer_amount} was accepted!`
        : `❌ Offer of ${symbol}${message.offer_amount} was declined.`;

    const systemMsg = await Message.create({
        conversation_id: message.conversation_id,
        sender_id: req.user._id, // Set the current user to system message sender_id or keep it as user
        sender_model: 'User',
        receiver_id: message.sender_id,
        receiver_model: message.sender_model,
        message: systemMessageText,
        message_type: 'system'
    });

    if (conversation) {
        conversation.last_message = systemMessageText;
        conversation.last_message_at = Date.now();
        await conversation.save();
    }

    // Notify sender of the outcome
    await Notification.create({
        user_id: message.sender_id,
        on_model: message.sender_model,
        title: status === 'accepted' ? 'Offer Accepted!' : 'Offer Declined',
        message: `${req.user.username || req.user.name} ${status} your offer.`,
        type: status === 'accepted' ? 'success' : 'error',
        link: message.sender_model === 'Admin' ? `/messages` : `/profile?tab=messages&conversation=${message.conversation_id}`,
    });

    const populatedMessage = await Message.findById(systemMsg._id).populate('sender_id', 'name username profile_image');
    if (req.io) {
        req.io.to(message.conversation_id.toString()).emit('receive_message', {
            message: populatedMessage,
            conversation: conversation
        });
    }

    res.status(200).json({ offerMessage: message, systemMessage: populatedMessage, conversation });
});

export {
    getConversations,
    getAdminMessagesCount,
    getMessages,
    sendMessage,
    respondToRequest,
    toggleBlock,
    respondToOffer,
};
