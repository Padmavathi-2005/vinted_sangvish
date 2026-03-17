import dotenv from 'dotenv';
dotenv.config();

import express from 'express';
import colors from 'colors';
import { errorHandler } from './middleware/errorMiddleware.js';
import connectDB from './config/db.js';
import cors from 'cors';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

// Admin API Routes
import adminRoutes from './routes/adminRoutes.js';
import settingRoutes from './routes/settingRoutes.js';
import pageRoutes from './routes/pageRoutes.js';
import frontendContentRoutes from './routes/frontendContentRoutes.js';
import messageRoutes from './routes/messageRoutes.js';
import shippingCompanyRoutes from './routes/shippingCompanyRoutes.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const port = process.env.ADMIN_PORT || 5001;

const startServer = async () => {
    try {
        await connectDB();

        const app = express();

        app.get('/health', (req, res) => res.send('OK'));

        app.use(cors());
        app.use(express.json());
        app.use(express.urlencoded({ extended: false }));

        // Log requests
        app.use((req, res, next) => {
            console.log(`[${new Date().toISOString()}] ${req.method} ${req.url}`);
            next();
        });

        // Admin API Routes
        app.use('/api/admin', adminRoutes);
        app.use('/api/settings', settingRoutes);
        app.use('/api/pages', pageRoutes);
        app.use('/api/frontend-content', frontendContentRoutes);
        app.use('/api/admin-messages', messageRoutes);
        app.use('/api/shipping-companies', shippingCompanyRoutes);

        // Serve images (fallback for local development)
        const imagesPath = path.join(__dirname, 'images');
        app.use('/images', express.static(imagesPath));
        if (!fs.existsSync(imagesPath)) {
            console.log('Note: images folder not found locally, ensure it is symlinked or handled by Nginx proxy.');
        }

        app.get('/', (req, res) => {
            res.send('Admin API is running...');
        });

        app.use(errorHandler);

        app.listen(port, () => {
            console.log(`\n🚀 Admin Server started on port ${port}`.green.bold);
            console.log(`🔗 Listening on: http://localhost:${port}`.cyan);
            console.log('---------------------------------'.gray);
        });

    } catch (error) {
        console.error('SERVER FATAL ERROR:', error.message);
        process.exit(1);
    }
};

startServer();

process.on('unhandledRejection', (err) => {
    console.error('Unhandled Promise Rejection:', err.message);
});
