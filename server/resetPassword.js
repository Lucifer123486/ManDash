const mongoose = require('mongoose');
require('dotenv').config();

const User = require('./models/User');

async function resetPassword() {
    try {
        await mongoose.connect('mongodb://127.0.0.1:27017/cerebrospark');
        const user = await User.findOne({ email: 'admin@cerebrospark.com' }).select('+password');
        if (user) {
            console.log('User found:', user.email);
            user.password = 'admin123';
            await user.save();
            console.log('Password reset successfully!');
        } else {
            console.log('User not found!');
        }
    } catch (err) {
        console.error(err);
    } finally {
        process.exit();
    }
}

resetPassword();
