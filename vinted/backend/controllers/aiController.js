import { GoogleGenerativeAI } from "@google/generative-ai";
import asyncHandler from 'express-async-handler';
import Category from '../models/Category.js';
import Setting from '../models/Setting.js';
import fs from 'fs';

// Helper to get Gemini API Key from Settings
const getGeminiApiKey = async () => {
    try {
        const settings = await Setting.findOne({ type: 'api_settings' });
        const key = settings?.gemini_api_key || process.env.GEMINI_API_KEY;
        if (!key) {
            console.error("[AI Settings] Gemini API Key is missing in DB and .env");
        }
        return key;
    } catch (error) {
        console.error("[AI Settings] Error fetching API key:", error);
        return process.env.GEMINI_API_KEY;
    }
};

// @desc    Chat with AI assistant
// @route   POST /api/ai/chat
// @access  Public
const chatWithAI = asyncHandler(async (req, res) => {
    const { message, history } = req.body;

    if (!message) {
        return res.status(400).json({ message: "Message is required" });
    }

    try {
        const apiKey = await getGeminiApiKey();
        if (!apiKey) {
            return res.status(503).json({
                message: "AI service is currently not configured by administrator.",
                text: "I'm still learning! My AI brain isn't fully connected yet. Please check back later."
            });
        }

        const genAIInstance = new GoogleGenerativeAI(apiKey);
        
        // Fetch categories and general settings for context
        const categories = await Category.find({ is_active: true }).select('name');
        const categoryNames = categories.map(c => c.name).join(", ");
        const generalSettings = await Setting.findOne({ type: 'site_settings' }) || await Setting.findOne({ type: 'general_settings' });
        
        const siteName = generalSettings?.site_name?.en || 'Sangvish Marketplace';
        const siteUrl = generalSettings?.site_url || 'vinted.sangvish.com';

        const systemInstruction = `You are a helpful, friendly AI assistant for ${siteName}.
Speak like a real person—be helpful but not robotic.
- NEVER mention external sites or official Vinted.com.
- Our site URL is ${siteUrl}.
- Categories available: ${categoryNames}.
- If users ask how to use the site, suggest using the search bar or clicking "Sell".`;

        // Format history for Gemini
        // CRITICAL: First message MUST be 'user'
        let formattedHistory = [];
        if (history && Array.isArray(history)) {
            let firstUserIndex = history.findIndex(msg => !msg.isAi);
            if (firstUserIndex !== -1) {
                // Start from the first user message to satisfy Gemini requirements
                formattedHistory = history.slice(firstUserIndex).map(msg => ({
                    role: msg.isAi ? "model" : "user",
                    parts: [{ text: msg.text }]
                }));
            }
        }

        const fullMessage = `${systemInstruction}\n\nUser: ${message}`;
        
        // Define candidate models for fallback - Using names confirmed in REST check
        const models = ["gemini-2.0-flash", "gemini-flash-latest", "gemini-pro-latest", "gemini-1.5-flash", "gemini-pro"];
        let lastError = null;
        let text = "";

        for (const modelName of models) {
            try {
                console.log(`[AI Chat] Attempting with model: ${modelName}`);
                const model = genAIInstance.getGenerativeModel({ model: modelName });
                const chat = model.startChat({
                    history: formattedHistory,
                    generationConfig: { maxOutputTokens: 800 },
                });

                const result = await chat.sendMessage(fullMessage);
                const responseData = await result.response;
                text = responseData.text();
                if (text) break; // Success!
            } catch (err) {
                console.error(`[AI Chat] Failed with ${modelName}:`, err.message);
                lastError = err;
                // Continue to next model if it's a 404 or model not found error
                if (err.message?.includes('not found') || err.message?.includes('404')) {
                    continue;
                } else {
                    // For other errors (like quota), break early as they likely affect all models
                    break;
                }
            }
        }

        if (!text && lastError) {
            throw lastError;
        }

        return res.json({ text });

    } catch (error) {
        console.error("=== AI CHAT ERROR ===");
        console.error(error);
        
        let userMessage = "I'm having a little trouble connecting to my service right now. Please try again in a moment!";
        let statusCode = 500;

        if (error.message?.includes('quota') || error.message?.includes('429')) {
            userMessage = "I've been talking a lot lately and need a short break! My daily limit is reached. Please try again soon or contact support to upgrade.";
            statusCode = 429;
        } else if (error.message?.includes('key') || error.message?.includes('API_KEY_INVALID')) {
            userMessage = "My connection key seems invalid. Please notify the administrator to check the AI API settings.";
        } else if (error.message?.includes('network') || error.message?.includes('fetch')) {
            userMessage = "I'm experiencing a network hiccup. Please check your internet connection and try again.";
        }

        res.status(statusCode).json({
            message: "Internal AI Error: " + error.message,
            text: userMessage
        });
    }
});

// @desc    Analyze image with AI for search
// @route   POST /api/search/image
// @access  Public
const imageSearch = asyncHandler(async (req, res) => {
    if (!req.file) {
        return res.status(400).json({ message: "No image uploaded" });
    }

    try {
        const apiKey = await getGeminiApiKey();
        if (!apiKey) {
            if (req.file) await fs.promises.unlink(req.file.path).catch(() => {});
            return res.status(503).json({ message: "Visual search is not configured." });
        }

        const genAIInstance = new GoogleGenerativeAI(apiKey);
        
        const imageBuffer = await fs.promises.readFile(req.file.path);
        const image = {
            inlineData: {
                data: imageBuffer.toString('base64'),
                mimeType: req.file.mimetype
            }
        };

        const prompt = "What is this product? Provide a 2-3 word search query. Return ONLY text.";
        
        // Define candidate models for fallback
        const models = ["gemini-2.0-flash", "gemini-flash-latest", "gemini-pro-vision", "gemini-1.5-flash"];
        let lastError = null;
        let caption = "";

        for (const modelName of models) {
            try {
                console.log(`[AI Image Search] Attempting with model: ${modelName}`);
                const model = genAIInstance.getGenerativeModel({ model: modelName });
                const result = await model.generateContent([prompt, image]);
                const responseData = await result.response;
                caption = responseData.text().trim().replace(/['"]+/g, '');
                if (caption) break;
            } catch (err) {
                console.error(`[AI Image Search] Failed with ${modelName}:`, err.message);
                lastError = err;
                if (err.message?.includes('not found') || err.message?.includes('404')) {
                    continue;
                } else {
                    break;
                }
            }
        }

        if (!caption && lastError) {
            throw lastError;
        }

        await fs.promises.unlink(req.file.path).catch(() => {});
        return res.json({ query: caption });

    } catch (error) {
        console.error("=== AI IMAGE SEARCH ERROR ===");
        console.error(error);
        if (req.file) await fs.promises.unlink(req.file.path).catch(() => {});

        let statusCode = 500;
        let message = "Visual search failed. Please try again with a clearer image.";
        
        if (error.message?.includes('quota') || error.message?.includes('429')) {
            message = "Image search limit completed for today. Please try again later!";
            statusCode = 429;
        } else if (error.message?.includes('key') || error.message?.includes('API_KEY_INVALID')) {
            message = "AI service configuration error. Please contact administrator.";
        }

        res.status(statusCode).json({ message });
    }
});

export { chatWithAI, imageSearch };

