const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
require('dotenv').config();

async function run() {
    await mongoose.connect(process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/cerebrospark');
    const db = mongoose.connection.db;
    const pwd = await bcrypt.hash('password123', 10);

    await db.collection('users').updateOne({ email: 'admin@cerebrospark.com' }, { $set: { password: pwd } });
    const client = await db.collection('users').findOne({ role: 'client' });
    if (client) await db.collection('users').updateOne({ _id: client._id }, { $set: { password: pwd } });

    const staff = await db.collection('users').findOne({ role: 'staff', staffType: 'general' });
    if (staff) await db.collection('users').updateOne({ _id: staff._id }, { $set: { password: pwd } });

    const se = await db.collection('users').findOne({ role: 'staff', staffType: 'service_engineer' });
    if (se) await db.collection('users').updateOne({ _id: se._id }, { $set: { password: pwd } });

    console.log('Test credentials set to password123 for:');
    console.log('Admin: admin@cerebrospark.com');
    console.log('Client:', client?.email);
    console.log('Staff:', staff?.email);
    console.log('SE:', se?.email);

    mongoose.disconnect();
}
run().catch(console.error);
