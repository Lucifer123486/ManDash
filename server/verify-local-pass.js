const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const LOCAL_URI = 'mongodb://localhost:27017/cerebrospark';

async function verifyLocalPassword() {
    try {
        await mongoose.connect(LOCAL_URI);
        const User = require('./models/User');
        const admin = await User.findOne({ email: 'admin@cerebrospark.com' }).select('+password');
        
        if (admin) {
            console.log('Admin found locally.');
            const isMatch = await bcrypt.compare('admin123', admin.password);
            console.log('Does "admin123" match local hash?', isMatch);
        } else {
            console.log('Admin NOT found locally.');
        }
        process.exit(0);
    } catch (err) {
        console.error(err);
        process.exit(1);
    }
}

verifyLocalPassword();
