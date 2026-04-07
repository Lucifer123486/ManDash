const mongoose = require('mongoose');
const dotenv = require('dotenv');

dotenv.config();

// CONFIGURATION
const LOCAL_URI = 'mongodb://localhost:27017/cerebrospark';
// User provided Atlas URI (with @ in password, we might need to handle it)
const ATLAS_URI = 'mongodb+srv://mayur2005:2005Mayur@mandash.gffxy17.mongodb.net/cerebrospark?retryWrites=true&w=majority&appName=ManDash';

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
        localConn = await mongoose.createConnection(LOCAL_URI).asPromise();
        console.log('✅ Connected to LOCAL MongoDB');

        // 2. Connect to Atlas
        atlasConn = await mongoose.createConnection(ATLAS_URI).asPromise();
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
