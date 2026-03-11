import { GoogleGenerativeAI } from "@google/generative-ai";
import asyncHandler from 'express-async-handler';
import Category from '../models/Category.js';
import Setting from '../models/Setting.js';
import fs from 'fs';

// Initialize Gemini
let genAI;

const getGenAI = () => {
    if (!genAI) {
        if (!process.env.GEMINI_API_KEY) {
            throw new Error("GEMINI_API_KEY is missing in the .env file.");
        }
        genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
    }
    return genAI;
};

// @desc    Chat with AI assistant
// @route   POST /api/ai/chat
// @access  Public
const chatWithAI = asyncHandler(async (req, res) => {
    const { message, history } = req.body;

    if (!message) {
        res.status(400);
        throw new Error("Message is required");
    }

    try {
        const genAIInstance = getGenAI();
        const model = genAIInstance.getGenerativeModel({ model: "gemini-1.5-flash" });

        // Fetch categories and settings dynamically to give AI context
        const categories = await Category.find({ is_active: true }).select('name');
        const categoryNames = categories.map(c => c.name).join(", ");

        const settings = await Setting.findOne();
        const siteName = (settings && settings.site_name) ? settings.site_name : 'Vinted (developed by Sangvish)';
        const siteUrl = (settings && settings.site_url) ? settings.site_url : 'vinted.sangvish.com';

        const systemInstruction = `You are a helpful AI assistant for a marketplace website called ${siteName}. 
CRITICAL RULES:
1. NEVER provide links to the official vinted.com website or any external websites.
2. The official URL for THIS project is ${siteUrl}. If you MUST provide a URL, only use this domain or relative paths (e.g., /products).
3. Do not pretend to be the official Vinted company. You are assisting users specifically on THIS marketplace platform.
4. If a user asks how to do something (like buy, sell, or search), provide step-by-step instructions based on a typical e-commerce experience. For example, tell them to "use the search bar at the top" or "click the 'Sell' button".
5. Keep your answers concise, friendly, and directly related to buying, selling, and managing profile items.
6. Available categories include: ${categoryNames}.`;

        // Format history for Gemini
        // Gemini expects role: 'user' or 'model'
        const chat = model.startChat({
            history: (history || []).map(msg => ({
                role: msg.isAi ? "model" : "user",
                parts: [{ text: msg.text }]
            })),
            generationConfig: {
                maxOutputTokens: 500,
            },
        });

        const fullMessage = `${systemInstruction}\n\nUser: ${message}`;
        const result = await chat.sendMessage(fullMessage);
        const responseData = await result.response;
        const text = responseData.text();

        return res.json({ text });

    } catch (error) {
        console.error("=== GEMINI CHAT ERROR ===");
        console.error(error.message);
        console.error("=========================");

        res.status(500).json({
            message: "AI Error: " + error.message,
            text: "Sorry, I could not connect. Error: " + error.message
        });
    }
});

// @desc    Analyze image with AI for search
// @route   POST /api/search/image
// @access  Public
const imageSearch = asyncHandler(async (req, res) => {
    if (!req.file) {
        res.status(400);
        throw new Error("No image uploaded");
    }

    console.log("AI SEARCH: Analyzing image with Gemini:", req.file.path);

    try {
        const genAIInstance = getGenAI();
        const model = genAIInstance.getGenerativeModel({ model: "gemini-1.5-flash" });

        // Read image file and convert to parts
        const imageBuffer = await fs.promises.readFile(req.file.path);
        const image = {
            inlineData: {
                data: imageBuffer.toString('base64'),
                mimeType: req.file.mimetype
            }
        };

        const prompt = "What is this product? Provide a short, 3-word search query to find similar items in a marketplace. Return ONLY the search query text, no punctuation or extra words.";

        const result = await model.generateContent([prompt, image]);
        const responseData = await result.response;
        const caption = responseData.text().trim().replace(/['"]+/g, '');

        console.log("AI SEARCH: Gemini generated keywords:", caption);

        // Clean up
        try {
            await fs.promises.unlink(req.file.path);
        } catch (err) {
            // Non-blocking
        }

        if (!caption) {
            return res.status(500).json({ message: "AI could not analyze this image." });
        }

        return res.json({ query: caption });

    } catch (error) {
        console.error("=== GEMINI IMAGE SEARCH FAILURE ===");
        console.error(error);

        // Final fallback: delete file if still exists
        try { if (req.file) await fs.promises.unlink(req.file.path); } catch (e) { }

        res.status(500).json({
            message: "Visual Search Error: " + error.message,
            tip: "We're having trouble connecting to the AI service. Please try again or use text search."
        });
    }
});

export { chatWithAI, imageSearch };

