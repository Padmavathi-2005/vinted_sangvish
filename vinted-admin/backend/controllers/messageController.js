import asyncHandler from 'express-async-handler';
import Message from '../models/Message.js';
import Conversation from '../models/Conversation.js';
import Notification from '../models/Notification.js';
import User from '../models/User.js';
import Admin from '../models/Admin.js';

const participantsPopulate = {
    path: 'participants.id',
    select: 'name username profile_image last_login'
};

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

const sendMessage = asyncHandler(async (req, res) => {
    const { receiver_id, receiver_model = 'User', message, item_id } = req.body;

    if (!receiver_id || !message) {
        res.status(400);
        throw new Error('Please add receiver and message');
    }

    const sender_id = req.user._id;
    const sender_model = req.user.role === 'admin' ? 'Admin' : 'User';

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
            status: sender_model === 'Admin' ? 'accepted' : 'pending',
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

const getMessageCount = asyncHandler(async (req, res) => {
    // Count unread messages received by the admin across all conversations
    const count = await Message.countDocuments({
        receiver_id: req.user._id,
        receiver_model: 'Admin',
        is_read: false
    });
    res.json({ count });
});

export {
    getConversations,
    getMessages,
    sendMessage,
    getMessageCount
};
