import jwt from 'jsonwebtoken';
import asyncHandler from 'express-async-handler';
import User from '../models/User.js';
import Admin from '../models/Admin.js';
import Notification from '../models/Notification.js';
import Conversation from '../models/Conversation.js';
import Message from '../models/Message.js';
import Setting from '../models/Setting.js';

// @desc    Register new user
// @route   POST /api/users
// @access  Public
const registerUser = asyncHandler(async (req, res) => {
    const { username, email, password, first_name, last_name } = req.body;

    if (!username || !email || !password) {
        res.status(400);
        throw new Error('Please add all fields');
    }

    if (password.length < 6) {
        res.status(400);
        throw new Error('Password must be at least 6 characters');
    }

    // Check if user exists
    const userExists = await User.findOne({ email });

    if (userExists) {
        res.status(400);
        throw new Error('User already exists');
    }

    // Create user
    const user = await User.create({
        username,
        email,
        password_hash: password,
        first_name: first_name || '',
        last_name: last_name || '',
    });

    if (user) {
        const userName = user.display_name || (user.first_name || user.last_name ? `${user.first_name} ${user.last_name}`.trim() : user.username);

        // 1. Send Welcome Notification to the User
        await Notification.create({
            user_id: user._id,
            on_model: 'User',
            title: 'Welcome!',
            message: `Hello ${userName}, thanks for joining us! We hope you have a great experience buying and selling.`,
            type: 'info',
            link: '/profile'
        });

        // 2. Notify Admin about the new user registration (Stored)
        const admins = await Admin.find({ is_active: true });
        for (const admin of admins) {
            await Notification.create({
                user_id: admin._id,
                on_model: 'Admin',
                title: 'New User Registered',
                message: `A new user ${userName} (${user.email}) has just registered.`,
                type: 'info',
                link: '/users'
            });
        }

        // 3. Send Welcome Message from Admin (System)
        try {
            const settings = await Setting.findOne({ type: 'general_settings' });
            const siteName = settings?.site_name || 'Vinted';
            // Get the plain string if it's a map/object
            const displaySiteName = typeof siteName === 'object' ? (Object.values(siteName)[0] || 'Vinted') : siteName;

            const welcomeAdmin = await Admin.findOne({ is_active: true });
            if (welcomeAdmin) {
                const welcomeText = `Hello ${userName}, welcome to ${displaySiteName}! 🌟 We're thrilled to have you join our community. Feel free to explore, buy, or start selling your items. If you need any help, we're here for you!`;
                
                const conversation = await Conversation.create({
                    participants: [
                        { user: welcomeAdmin._id, on_model: 'Admin' },
                        { user: user._id, on_model: 'User' }
                    ],
                    status: 'accepted',
                    initiator_id: welcomeAdmin._id,
                    initiator_model: 'Admin',
                    last_message: welcomeText,
                    last_message_at: Date.now(),
                });

                await Message.create({
                    conversation_id: conversation._id,
                    sender_id: welcomeAdmin._id,
                    sender_model: 'Admin',
                    receiver_id: user._id,
                    receiver_model: 'User',
                    message: welcomeText,
                    message_type: 'text'
                });

                // 3b. Send Notification to User for the Welcome Message
                await Notification.create({
                    user_id: user._id,
                    on_model: 'User',
                    title: `Welcome to ${displaySiteName}!`,
                    message: `You have a new message from our support team.`,
                    type: 'message',
                    link: '/profile?tab=messages'
                });
            }
        } catch (err) {
            console.error('Welcome message error:', err);
            // Don't fail the whole registration if welcome message fails
        }

        const userJSON = user.toJSON();
        userJSON.token = generateToken(user._id);
        userJSON.id = user._id;
        userJSON.name = user.display_name || (user.first_name || user.last_name ? `${user.first_name} ${user.last_name}`.trim() : user.username);
        res.status(201).json(userJSON);
    } else {
        res.status(400);
        throw new Error('Invalid user data');
    }
});

// @desc    Authenticate a user
// @route   POST /api/users/login
// @access  Public
const loginUser = asyncHandler(async (req, res) => {
    const { email, password } = req.body;

    // Check for user email
    const user = await User.findOne({ email });

    if (!user) {
        res.status(400);
        throw new Error('User not found with this email');
    }

    if (await user.matchPassword(password)) {
        if (user.is_deleted) {
            res.status(403);
            throw new Error('Your account has been deleted. Please contact support to restore it.');
        }

        if (user.is_blocked) {
            res.status(403);
            throw new Error('Your account has been blocked.');
        }

        user.last_login = Date.now();
        await user.save();

        const userJSON = user.toJSON();
        userJSON.token = generateToken(user._id);
        userJSON.id = user._id;
        userJSON.name = user.username;
        res.json(userJSON);
    } else {
        res.status(400);
        throw new Error('Invalid password');
    }
});

// @desc    Soft delete account
// @route   DELETE /api/users/delete
// @access  Private
const deleteAccount = asyncHandler(async (req, res) => {
    const user = await User.findById(req.user.id);

    if (!user) {
        res.status(404);
        throw new Error('User not found');
    }

    // Check Balance
    if (user.balance > 0) {
        res.status(400).json({
            message: `You have ${user.wallet_currency || 'EUR'} ${user.balance.toFixed(2)} in your wallet. Please withdraw funds before deleting your account.`,
            canDelete: false,
            balance: user.balance
        });
        return;
    }

    // Soft Delete
    user.is_deleted = true;
    user.is_blocked = true; // Block access
    // user.username = `Deleted User ${user.id}`; // Optional: Anonymize
    // user.email = `deleted_${user.id}_${user.email}`; // Optional: Anonymize to allow re-registration with same email? Maybe not.

    await user.save();

    res.status(200).json({ message: 'Account deleted successfully', canDelete: true });
});

// @desc    Get user data
// @route   GET /api/users/me
// @access  Private
const getMe = asyncHandler(async (req, res) => {
    const user = await User.findById(req.user._id);
    if (!user) {
        res.status(404);
        throw new Error('User not found');
    }
    const userJSON = user.toJSON();
    userJSON.id = user._id;
    userJSON.username = user.username;
    userJSON.name = user.username;
    res.status(200).json(userJSON);
});

// Generate JWT
const generateToken = (id) => {
    return jwt.sign({ id }, process.env.JWT_SECRET || 'secret123', {
        expiresIn: '30d',
    });
};

// @desc    Update user profile
// @route   PUT /api/users/profile
// @access  Private
const updateUserProfile = asyncHandler(async (req, res) => {
    const updateData = {};
    if (req.body.username) updateData.username = req.body.username;
    if (req.body.bio !== undefined) updateData.bio = req.body.bio;
    if (req.body.first_name !== undefined) updateData.first_name = req.body.first_name;
    if (req.body.last_name !== undefined) updateData.last_name = req.body.last_name;
    
    // Nested Address Update
    if (req.body.address) {
        updateData.address = typeof req.body.address === 'string' 
            ? JSON.parse(req.body.address) 
            : req.body.address;
    }

    if (req.body.bundle_discounts) {
        try {
            updateData.bundle_discounts = typeof req.body.bundle_discounts === 'string' 
                ? JSON.parse(req.body.bundle_discounts) 
                : req.body.bundle_discounts;
        } catch (e) {
            console.error("Error parsing bundle_discounts:", e);
        }
    }
    if (req.file) {
        updateData.profile_image = `images/profile/${req.file.filename}`;
    }
    if (req.body.password) {
        // We need the model for password hashing if we update directly, 
        // but findOneAndUpdate bypasses hooks. 
        // So we'll stick to the document method if password is being changed.
        const user = await User.findById(req.user._id);
        if (!user) {
            res.status(404);
            throw new Error('User not found');
        }
        user.username = updateData.username || user.username;
        user.bio = updateData.bio !== undefined ? updateData.bio : user.bio;
        user.first_name = updateData.first_name !== undefined ? updateData.first_name : user.first_name;
        user.last_name = updateData.last_name !== undefined ? updateData.last_name : user.last_name;
        user.display_name = updateData.display_name !== undefined ? updateData.display_name : user.display_name;
        
        if (updateData.address) {
            user.address = { ...user.address, ...updateData.address };
        }

        user.profile_image = updateData.profile_image || user.profile_image;
        if (updateData.bundle_discounts) {
            user.bundle_discounts = updateData.bundle_discounts;
        }
        user.password_hash = req.body.password;

        const updatedUser = await user.save();
        const userJSON = updatedUser.toJSON();
        userJSON.token = generateToken(updatedUser._id);
        userJSON.id = updatedUser._id;
        userJSON.name = updatedUser.display_name || (updatedUser.first_name || updatedUser.last_name ? `${updatedUser.first_name} ${updatedUser.last_name}`.trim() : updatedUser.username);
        return res.json(userJSON);
    }

    const updatedUser = await User.findByIdAndUpdate(
        req.user._id,
        { $set: updateData },
        { new: true, runValidators: true }
    );

    if (updatedUser) {
        const userJSON = updatedUser.toJSON();
        userJSON.token = generateToken(updatedUser._id);
        userJSON.id = updatedUser._id;
        userJSON.name = updatedUser.display_name || (updatedUser.first_name || updatedUser.last_name ? `${updatedUser.first_name} ${updatedUser.last_name}`.trim() : updatedUser.username);
        res.json(userJSON);
    } else {
        res.status(404);
        throw new Error('User not found');
    }
});

// @desc    Get all users (for community/chat)
// @route   GET /api/users
// @access  Private
const getAllUsers = asyncHandler(async (req, res) => {
    const admins = await Admin.find({ is_active: true })
        .select('name profile_image')
        .lean();

    const formattedAdmins = admins.map(a => ({
        ...a,
        username: 'Support Admin (' + a.name + ')',
        on_model: 'Admin'
    }));

    const users = await User.find({
        _id: { $ne: req.user._id },
        is_deleted: false,
        is_blocked: false
    })
        .select('username email profile_image bio rating_avg rating_count created_at last_login')
        .sort({ username: 1 })
        .lean();

    const formattedUsers = users.map(u => ({
        ...u,
        on_model: 'User'
    }));

    res.status(200).json([...formattedAdmins, ...formattedUsers]);
});

// @desc    Update last_login timestamp (keeps Last Seen accurate during active sessions)
// @route   PATCH /api/users/ping
// @access  Private
const pingActivity = asyncHandler(async (req, res) => {
    const user = await User.findById(req.user.id);
    if (!user) {
        res.status(404);
        throw new Error('User not found');
    }
    user.last_login = new Date();
    await user.save();
    res.status(200).json({ last_login: user.last_login });
});

// @desc    Get a public user profile by ID (for Seller Profile page)
// @route   GET /api/users/:id/public
// @access  Public
const getPublicUser = asyncHandler(async (req, res) => {
    const user = await User.findById(req.params.id)
        .select('username first_name last_name profile_image bio rating_avg rating_count created_at location is_deleted is_blocked');

    if (!user || user.is_deleted || user.is_blocked) {
        res.status(404);
        throw new Error('User not found or unavailable');
    }

    res.status(200).json(user);
});

// @desc    Update user cookie consent status
// @route   PATCH /api/users/cookie-consent
// @access  Private
const updateCookieConsent = asyncHandler(async (req, res) => {
    const user = await User.findById(req.user.id);
    if (!user) {
        res.status(404);
        throw new Error('User not found');
    }
    user.cookie_consent = req.body.consent === true;
    await user.save();
    res.status(200).json({ message: 'Consent updated', cookie_consent: user.cookie_consent });
});

export {
    registerUser,
    loginUser,
    getMe,
    deleteAccount,
    updateUserProfile,
    getAllUsers,
    pingActivity,
    getPublicUser,
    updateCookieConsent
};
