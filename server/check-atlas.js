require('dotenv').config();
const mongoose = require('mongoose');

async function checkAtlas() {
    try {
        const atlasUri = process.env.MONGODB_URI;
        if (!atlasUri) throw new Error('MONGODB_URI not found in .env');

        console.log('🔍 Checking Atlas Database...');
        await mongoose.connect(atlasUri);
        console.log('✅ Connected to ATLAS');

        const db = mongoose.connection.db;
        const collections = await db.listCollections().toArray();
        console.log('Collections present:', collections.map(c => c.name));

        const userCount = await db.collection('users').countDocuments();
        console.log(`Total users in Atlas: ${userCount}`);

        const admin = await db.collection('users').findOne({ role: 'admin' });
        if (admin) {
            console.log(`✅ Admin user FOUND: ${admin.email}`);
        } else {
            console.log('❌ NO admin user found in Atlas!');
        }

        process.exit(0);
    } catch (err) {
        console.error('Error:', err.message);
        process.exit(1);
    }
}

checkAtlas();
