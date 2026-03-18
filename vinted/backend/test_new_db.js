import mongoose from 'mongoose';
import dotenv from 'dotenv';
dotenv.config();

const testConn = async () => {
    try {
        await mongoose.connect(process.env.MONGO_URI);
        const Admin = mongoose.connection.db.collection('admins');
        const adminEmail = await Admin.findOne({}, { projection: { email: 1 } });
        console.log('--- DB Content (ABINAYASHRI) ---');
        console.log('Admin Email:', adminEmail?.email);
        
        const catSample = await mongoose.connection.db.collection('categories').findOne({}, { projection: { name: 1 } });
        console.log('First Category:', catSample?.name);
        
        process.exit(0);
    } catch (err) {
        console.error('Error:', err);
        process.exit(1);
    }
};

testConn();
