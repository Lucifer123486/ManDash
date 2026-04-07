require('dotenv').config();
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

async function verifyAtlasPassword() {
    try {
        const atlasUri = process.env.MONGODB_URI;
        if (!atlasUri) throw new Error('MONGODB_URI not found in .env');

        await mongoose.connect(atlasUri);
        console.log('Connected to Atlas');
        const db = mongoose.connection.db;
        
        const admin = await db.collection('users').findOne({ email: 'admin@cerebrospark.com' });
        
        if (admin) {
            console.log('Admin found in Atlas.');
            const isMatch = await bcrypt.compare('admin123', admin.password);
            console.log('Does "admin123" match Atlas hash?', isMatch);
        } else {
            console.log('Admin NOT found in Atlas.');
        }
        process.exit(0);
    } catch (err) {
        console.error(err);
        process.exit(1);
    }
}

verifyAtlasPassword();
