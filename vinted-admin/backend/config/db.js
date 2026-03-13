import Category from '../models/Category.js';

const mongooseInstance = Category.base; // The actual mongoose instance loaded by symlinked models

const connectDB = async () => {
  try {
    console.log('Connecting to MongoDB using Model\'s Mongoose instance...');

    // isLocal = true only when explicitly NOT in production
    // NOTE: Do NOT use port number - live server also uses port 5001 for admin!
    const isLocal = process.env.NODE_ENV !== 'production';
    // Use Abinayashri's Atlas URI as the primary connection
    // The user specifically requested this over any local MongoDB instance
    const dbUriToUse = process.env.LOCAL_MONGO_URI || "mongodb+srv://abinayashri1985_db_user:PftqY4RcbGP1g30U@vinted.fndp02j.mongodb.net/vinted_db?appName=vinted";

    const conn = await mongooseInstance.connect(dbUriToUse, {
      serverSelectionTimeoutMS: 10000,
    });
    console.log(`MongoDB Connected: ${conn.connection.host} [Environment: ${isLocal ? 'Local' : 'Live'}]`);

    // Listen for errors AFTER connection
    mongooseInstance.connection.on('error', err => {
      console.error('Mongoose connection error:', err);
    });

    mongooseInstance.connection.on('disconnected', () => {
      console.warn('Mongoose disconnected');
    });

  } catch (error) {
    console.error(`MongoDB Connection Error: ${error.message}`);
    throw error; // Rethrow to let startServer handle it
  }
};

export default connectDB;
