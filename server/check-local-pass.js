const mongoose = require('mongoose');

const LOCAL_URI = 'mongodb://localhost:27017/cerebrospark';

async function checkLocalAdmin() {
    try {
        await mongoose.connect(LOCAL_URI);
        const User = require('./models/User');
        const admin = await User.findOne({ email: 'admin@cerebrospark.com' }).select('+password');
        
        if (admin) {
            console.log('Admin found locally.');
            console.log('Password hash:', admin.password);
            console.log('Is valid bcrypt hash:', admin.password.startsWith('$2'));
        } else {
            console.log('Admin NOT found locally.');
        }
        process.exit(0);
    } catch (err) {
        console.error(err);
        process.exit(1);
    }
}

checkLocalAdmin();
