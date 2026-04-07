const mongoose = require('mongoose');
const Prebooking = require('./models/Prebooking');
require('dotenv').config();

async function migrate() {
    try {
        await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/cerebrospark');
        console.log('Connected to MongoDB');

        const result = await Prebooking.updateMany({}, { $unset: { messageLogs: "" } });
        console.log(`Migration successful: Deleted messageLogs from ${result.modifiedCount} documents.`);
        
        process.exit(0);
    } catch (error) {
        console.error('Migration failed:', error);
        process.exit(1);
    }
}

migrate();
