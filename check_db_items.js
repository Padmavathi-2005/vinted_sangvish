import mongoose from 'mongoose';
import dotenv from 'dotenv';
dotenv.config({ path: 'e:/vinted-user&admin/vinted/backend/.env' });

const MONGO_URI = "mongodb+srv://support_db_uuser:gyhkuN-jammy8-voxqub@vinted.ek5p4it.mongodb.net/vinted_db?appName=vinted";

async function checkItems() {
    try {
        await mongoose.connect(MONGO_URI);
        console.log("Connected to DB");
        const items = await mongoose.connection.db.collection('items').find({}).limit(5).toArray();
        console.log("First 5 items:");
        items.forEach(it => {
            console.log(`- ${it.title}: images = ${JSON.stringify(it.images)}`);
        });
        process.exit(0);
    } catch (err) {
        console.error(err);
        process.exit(1);
    }
}

checkItems();
