import mongoose from 'mongoose';

const connectDB = async () => {
  try {
    console.log('Connecting to MongoDB...');

    // isLocal = true only when explicitly NOT in production
    // NOTE: Do NOT use PORT number — live server also runs on port 5000!
    // Environment-based URI selection
    const isLocal = process.env.NODE_ENV !== 'production';
    
    let dbUriToUse;
    if (isLocal) {
        // Local environment: Prioritize LOCAL_MONGO_URI
        dbUriToUse = process.env.LOCAL_MONGO_URI || process.env.MONGO_URI;
        console.log('Mode: LOCAL - Connecting to Local/Dev Database');
    } else {
        // Production/Live environment: Use MONGO_URI
        dbUriToUse = process.env.MONGO_URI;
        console.log('Mode: LIVE - Connecting to Production Database');
    }
    
    if (!dbUriToUse) {
        throw new Error('MongoDB URI not found in environment variables');
    }

    const conn = await mongoose.connect(dbUriToUse, {
      serverSelectionTimeoutMS: 10000,
      family: 4, // Force IPv4 to avoid various networking issues with Atlas
    });
    console.log(`MongoDB Connected: ${conn.connection.host} [Environment: ${isLocal ? 'Local' : 'Live'}]`);

    // Listen for errors AFTER connection
    mongoose.connection.on('error', err => {
      console.error('Mongoose connection error:', err);
    });

    mongoose.connection.on('disconnected', () => {
      console.warn('Mongoose disconnected');
    });

  } catch (error) {
    console.error(`MongoDB Connection Error: ${error.message}`);
    throw error; // Rethrow to let startServer handle it
  }
};

export default connectDB;
