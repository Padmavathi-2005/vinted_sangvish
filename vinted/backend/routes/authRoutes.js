import express from 'express';
import Setting from '../models/Setting.js';
import passport from 'passport';

const router = express.Router();

// A generic helper to dynamically get the proper host URL based on environment
const getCallbackUrl = (req, provider) => {
    const isLocal = req.hostname === 'localhost' || req.hostname === '127.0.0.1';
    const baseUrl = isLocal
        ? `http://localhost:${process.env.PORT || 5000}`
        : `https://${req.get('host')}`; // Live domain

    return `${baseUrl}/api/auth/${provider}/callback`;
};

// ---------------- Google ----------------
router.get('/google', async (req, res, next) => {
    // 1. You would dynamically instantiate passport strategy here using keys from DB (Live) or .env (Local)
    const isLocal = req.hostname === 'localhost' || req.hostname === '127.0.0.1';
    let clientId, clientSecret;

    if (isLocal) {
        clientId = process.env.LOCAL_GOOGLE_CLIENT_ID;
        clientSecret = process.env.LOCAL_GOOGLE_CLIENT_SECRET;
    } else {
        const settings = await Setting.findOne({ type: 'social_login_settings' });
        clientId = settings?.google_client_id;
        clientSecret = settings?.google_client_secret;
    }

    if (!clientId) {
        return res.status(400).send('Google Login is not configured yet.');
    }

    // Pass configuration to passport (Implementation omitted for brevity)
    /*
    passport.use('dynamic-google', new GoogleStrategy({
        clientID: clientId,
        clientSecret: clientSecret,
        callbackURL: getCallbackUrl(req, 'google')
    }, ...verifyCallback));
    */

    // Simulating OAuth redirect for setup verification:
    // passport.authenticate('dynamic-google', { scope: ['profile', 'email'] })(req, res, next);
    res.send(`Initiating Google OAuth... Client ID: ${clientId ? 'Found' : 'Missing'} | Environment: ${isLocal ? 'Local' : 'Live'}`);
});

// ---------------- Facebook ----------------
router.get('/facebook', async (req, res, next) => {
    const isLocal = req.hostname === 'localhost' || req.hostname === '127.0.0.1';
    let clientId, clientSecret;

    if (isLocal) {
        clientId = process.env.LOCAL_FACEBOOK_CLIENT_ID;
        clientSecret = process.env.LOCAL_FACEBOOK_CLIENT_SECRET;
    } else {
        const settings = await Setting.findOne({ type: 'social_login_settings' });
        clientId = settings?.facebook_client_id;
        clientSecret = settings?.facebook_client_secret;
    }

    if (!clientId) {
        return res.status(400).send('Facebook Login is not configured yet.');
    }

    res.send(`Initiating Facebook OAuth... Client ID: ${clientId ? 'Found' : 'Missing'} | Environment: ${isLocal ? 'Local' : 'Live'}`);
});

// ---------------- Twitter ----------------
router.get('/twitter', async (req, res, next) => {
    const isLocal = req.hostname === 'localhost' || req.hostname === '127.0.0.1';
    let clientId, clientSecret;

    if (isLocal) {
        clientId = process.env.LOCAL_TWITTER_CLIENT_ID;
        clientSecret = process.env.LOCAL_TWITTER_CLIENT_SECRET;
    } else {
        const settings = await Setting.findOne({ type: 'social_login_settings' });
        clientId = settings?.twitter_client_id;
        clientSecret = settings?.twitter_client_secret;
    }

    if (!clientId) {
        return res.status(400).send('Twitter Login is not configured yet.');
    }

    res.send(`Initiating Twitter OAuth... Client ID: ${clientId ? 'Found' : 'Missing'} | Environment: ${isLocal ? 'Local' : 'Live'}`);
});

// ---------------- Apple ----------------
router.get('/apple', async (req, res, next) => {
    const isLocal = req.hostname === 'localhost' || req.hostname === '127.0.0.1';
    let clientId, clientSecret;

    if (isLocal) {
        clientId = process.env.LOCAL_APPLE_CLIENT_ID;
        clientSecret = process.env.LOCAL_APPLE_CLIENT_SECRET;
    } else {
        const settings = await Setting.findOne({ type: 'social_login_settings' });
        clientId = settings?.apple_client_id;
        clientSecret = settings?.apple_client_secret;
    }

    if (!clientId) {
        return res.status(400).send('Apple Login is not configured yet.');
    }

    res.send(`Initiating Apple OAuth... Client ID: ${clientId ? 'Found' : 'Missing'} | Environment: ${isLocal ? 'Local' : 'Live'}`);
});

export default router;
