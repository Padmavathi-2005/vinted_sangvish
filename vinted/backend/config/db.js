import mongoose from 'mongoose';

const connectDB = async () => {
  try {
    console.log('Connecting to MongoDB...');

    // isLocal = true only when explicitly NOT in production
    // NOTE: Do NOT use PORT number — live server also runs on port 5000!
    const isLocal = process.env.NODE_ENV !== 'production';
    const liveUri = process.env.MONGO_URI || "mongodb+srv://support_db_uuser:gyhkuN-jammy8-voxqub@vinted.ek5p4it.mongodb.net/vinted_db?appName=vinted";
    const localUri = process.env.LOCAL_MONGO_URI || "mongodb+srv://abinayashri1985_db_user:PftqY4RcbGP1g30U@vinted.fndp02j.mongodb.net/vinted_db?appName=vinted";

    const dbUriToUse = isLocal ? localUri : liveUri;

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
