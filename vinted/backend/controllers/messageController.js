import asyncHandler from 'express-async-handler';
import Message from '../models/Message.js';
import Conversation from '../models/Conversation.js';
import Notification from '../models/Notification.js';
import User from '../models/User.js';
import Admin from '../models/Admin.js';

// Helper for population
const participantsPopulate = {
    path: 'participants.id',
    select: 'name username profile_image last_login'
};

// @desc    Get all conversations for user/admin
// @route   GET /api/messages/conversations
// @access  Private
const getConversations = asyncHandler(async (req, res) => {
    const identifier = req.user._id;

    const conversations = await Conversation.find({
        'participants.id': identifier
    })
        .populate(participantsPopulate)
        .populate('item_id', 'title price images')
        .sort({ last_message_at: -1 });

    res.status(200).json(conversations);
});

// @desc    Get messages for a conversation
// @route   GET /api/messages/:id
// @access  Private
const getMessages = asyncHandler(async (req, res) => {
    const conversation = await Conversation.findById(req.params.id)
        .populate(participantsPopulate);

    if (!conversation) {
        res.status(404);
        throw new Error('Conversation not found');
    }

    const isParticipant = conversation.participants.some(p => p.id._id.toString() === req.user._id.toString());
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
    const { receiver_id, receiver_model = 'User', message, item_id } = req.body;

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
                { $elemMatch: { id: sender_id, on_model: sender_model } },
                { $elemMatch: { id: receiver_id, on_model: receiver_model } }
            ]
        },
    });

    let isNewRequest = false;

    if (!conversation) {
        conversation = await Conversation.create({
            participants: [
                { id: sender_id, on_model: sender_model },
                { id: receiver_id, on_model: receiver_model }
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
    });

    const populatedMessage = await Message.findById(newMessage._id).populate('sender_id', 'name username profile_image');

    // Handle Notifications
    if (receiver_model === 'User') {
        if (isNewRequest) {
            await Notification.create({
                user_id: receiver_id,
                title: 'New Message Request',
                message: `${req.user.role === 'admin' ? 'Admin' : (req.user.username || req.user.name)} wants to start a conversation with you.`,
                type: 'request',
                link: `/profile?tab=messages&conversation=${conversation._id}`,
            });
        } else if (conversation.status === 'accepted') {
            await Notification.create({
                user_id: receiver_id,
                title: 'New Message',
                message: `You have a new message from ${req.user.role === 'admin' ? 'Admin' : (req.user.username || req.user.name)}`,
                type: 'message',
                link: `/profile?tab=messages&conversation=${conversation._id}`,
            });
        }
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
    if (conversation.initiator_model === 'User') {
        const initiatorId = conversation.initiator_id;
        await Notification.create({
            user_id: initiatorId,
            title: status === 'accepted' ? 'Message Request Accepted' : 'Message Request Rejected',
            message: `${req.user.username || req.user.name} ${status === 'accepted' ? 'accepted' : 'declined'} your request.`,
            type: status === 'accepted' ? 'success' : 'error',
            link: `/profile?tab=messages&conversation=${conversation._id}`,
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

    const isParticipant = conversation.participants.some(p => p.id.toString() === req.user._id.toString());
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

export {
    getConversations,
    getMessages,
    sendMessage,
    respondToRequest,
    toggleBlock,
};
