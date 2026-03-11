import { HfInference } from "@huggingface/inference";
import asyncHandler from 'express-async-handler';
import Category from '../models/Category.js';
import Setting from '../models/Setting.js';
import fs from 'fs';

let hf;

const chatWithAI = asyncHandler(async (req, res) => {
    const { message, history } = req.body;

    if (!message) {
        res.status(400);
        throw new Error("Message is required");
    }

    if (!process.env.HF_TOKEN || process.env.HF_TOKEN === "your_hf_token_here") {
        res.status(500);
        throw new Error("HF_TOKEN is missing or invalid in the .env file. Please add a valid Hugging Face token.");
    }

    try {
        if (!hf) {
            hf = new HfInference(process.env.HF_TOKEN);
        }

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

        // Format history for Hugging Face
        let formattedHistory = (history || []).map(msg => ({
            role: msg.isAi ? "assistant" : "user",
            content: msg.text
        }));

        const messages = [
            { role: "system", content: systemInstruction },
            ...formattedHistory,
            { role: "user", content: message }
        ];

        // Call the Hugging Face Serverless Inference API
        const response = await hf.chatCompletion({
            model: "Qwen/Qwen2.5-72B-Instruct", // Powerful, reliable free-tier model
            messages: messages,
            max_tokens: 500,
        });

        // Return the actual AI response to the UI
        return res.json({ text: response.choices[0].message.content });

    } catch (error) {
        // Log the EXACT error to the backend console so you can read what failed
        console.error("=== REAL HUGGING FACE API ERROR ===");
        console.error(error.message);
        console.error("=================================");

        // Send a message back to the chat bubble saying it failed, with the error reason
        res.status(500).json({
            message: "AI Error: " + error.message,
            text: "Sorry, I could not connect. Error: " + error.message
        });
    }
});

import OpenAI from "openai";

const imageSearch = asyncHandler(async (req, res) => {
    if (!req.file) {
        console.error("AI SEARCH: No file received");
        res.status(400);
        throw new Error("No image uploaded");
    }

    console.log("AI SEARCH: Analyzing image with OpenAI:", req.file.path);

    if (!process.env.OPENAI_API_KEY) {
        console.error("AI SEARCH: OPENAI_API_KEY is missing");
        res.status(500);
        throw new Error("AI Configuration Error: OPENAI_API_KEY is missing.");
    }

    try {
        const openai = new OpenAI({
            apiKey: process.env.OPENAI_API_KEY,
        });

        // Read image file and convert to base64
        const imageBuffer = await fs.promises.readFile(req.file.path);
        const base64Image = imageBuffer.toString('base64');

        const response = await openai.chat.completions.create({
            model: "gpt-4o-mini", // Fast, cheap, and supports vision
            messages: [
                {
                    role: "user",
                    content: [
                        { type: "text", text: "What is this product? Provide a 3-word search query to find similar items in a marketplace. Return ONLY the search query." },
                        {
                            type: "image_url",
                            image_url: {
                                url: `data:${req.file.mimetype};base64,${base64Image}`,
                            },
                        },
                    ],
                },
            ],
            max_tokens: 50,
        });

        const caption = response.choices[0].message.content.trim().replace(/['"]+/g, '');
        console.log("AI SEARCH: OpenAI generated keywords:", caption);

        // Clean up
        try {
            await fs.promises.unlink(req.file.path);
        } catch (err) {
            // Non-blocking
        }

        if (!caption) {
            return res.status(500).json({ message: "OpenAI could not analyze this image." });
        }

        return res.json({ query: caption });

    } catch (error) {
        console.error("=== OPENAI IMAGE SEARCH FAILURE ===");
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
