import Category from '../models/Category.js';

const mongooseInstance = Category.base; // The actual mongoose instance loaded by symlinked models

const connectDB = async () => {
  try {
    console.log('Connecting to MongoDB using Model\'s Mongoose instance...');

    // isLocal = true only when explicitly NOT in production
    // NOTE: Do NOT use port number - live server also uses port 5001 for admin!
    const isLocal = process.env.NODE_ENV !== 'production';
    const liveUri = process.env.MONGO_URI || "mongodb+srv://support_db_uuser:gyhkuN-jammy8-voxqub@vinted.ek5p4it.mongodb.net/vinted_db?appName=vinted";
    const localUri = process.env.LOCAL_MONGO_URI || "mongodb+srv://abinayashri1985_db_user:PftqY4RcbGP1g30U@vinted.fndp02j.mongodb.net/vinted_db?appName=vinted";

    const dbUriToUse = isLocal ? localUri : liveUri;

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
