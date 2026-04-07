const mongoose = require('mongoose');
const dotenv = require('dotenv');

dotenv.config();

// CONFIGURATION
const LOCAL_URI = 'mongodb://localhost:27017/cerebrospark';

const collectionsToMigrate = [
  'users',
  'drones',
  'inappnotifications',
  'inwards',
  'activationrecords',
  'orders',
  'tickets',
  'prebookings',
  'formschemas',
  'formsubmissions',
  'maintenancerecords'
];

async function migrate() {
    let localConn, atlasConn;

    try {
        console.log('🚀 Starting Database Migration...');

        // 1. Connect to Local
        const localUri = process.env.MONGO_URI || LOCAL_URI;
        localConn = await mongoose.createConnection(localUri).asPromise();
        console.log('✅ Connected to LOCAL MongoDB');

        // 2. Connect to Atlas
        const atlasUri = process.env.MONGODB_URI;
        if (!atlasUri) throw new Error('MONGODB_URI not found in .env');
        
        atlasConn = await mongoose.createConnection(atlasUri).asPromise();
        console.log('✅ Connected to ATLAS MongoDB');

        for (const colName of collectionsToMigrate) {
            console.log(`📦 Migrating collection: ${colName}...`);
            
            const localCollection = localConn.db.collection(colName);
            const atlasCollection = atlasConn.db.collection(colName);

            // Get data from local
            const data = await localCollection.find({}).toArray();
            console.log(`   - Found ${data.length} documents in ${colName}`);

            if (data.length > 0) {
                // Clear atlas collection first (optional, but safer for clean migration)
                await atlasCollection.deleteMany({});
                console.log(`   - Cleared existing data in Atlas for ${colName}`);

                // Insert into Atlas
                await atlasCollection.insertMany(data);
                console.log(`   - Successfully inserted ${data.length} documents into Atlas`);
            } else {
                console.log(`   - Skipping ${colName} (no documents found)`);
            }
        }

        console.log('\n✨ MIGRATION COMPLETED SUCCESSFULLY! ✨');
        console.log('You can now check your MongoDB Atlas dashboard.');

    } catch (err) {
        console.error('\n❌ MIGRATION FAILED:', err.message);
        if (err.message.includes('authentication')) {
          console.log('TIP: Check your Atlas password. If it contains @, use %40 instead.');
        }
    } finally {
        if (localConn) await localConn.close();
        if (atlasConn) await atlasConn.close();
        process.exit(0);
    }
}

migrate();
