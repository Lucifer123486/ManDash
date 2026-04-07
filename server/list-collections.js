const mongoose = require('mongoose');
const dotenv = require('dotenv');

dotenv.config();

const listCollections = async () => {
    try {
        await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/cerebrospark');
        console.log('Connected to Local DB');
        const collections = await mongoose.connection.db.listCollections().toArray();
        console.log('COLLECTIONS_JSON:' + JSON.stringify(collections.map(c => c.name)));
        process.exit(0);
    } catch (err) {
        console.error('Error:', err);
        process.exit(1);
    }
};

listCollections();
