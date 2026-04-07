const mongoose = require('mongoose');
const User = require('./models/User');

async function listUsers() {
    try {
        await mongoose.connect('mongodb://localhost:27017/cerebrospark');
        const users = await User.find({}, 'name email role staffType password');
        console.log(JSON.stringify(users, null, 2));
        process.exit(0);
    } catch (err) {
        console.error(err);
        process.exit(1);
    }
}
listUsers();
