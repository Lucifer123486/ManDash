const mongoose = require('mongoose');
require('dotenv').config();

const User = require('./models/User');

async function check() {
    try {
        await mongoose.connect('mongodb://127.0.0.1:27017/cerebrospark');
        const user = await User.findOne({ email: 'admin@cerebrospark.com' }).select('+password');
        if (user) {
            console.log('User found:', user.email);
            console.log('Role:', user.role);
            console.log('IsActive:', user.isActive);
            console.log('Password hash:', user.password);

            // Check password
            const isMatch = await user.comparePassword('admin123');
            console.log('Is password match (admin123)?', isMatch);
        } else {
            console.log('User not found!');
            // List all users
            const users = await User.find({}).select('email role isActive');
            console.log('All users in DB:', users);
        }
    } catch (err) {
        console.error(err);
    } finally {
        process.exit();
    }
}

check();
