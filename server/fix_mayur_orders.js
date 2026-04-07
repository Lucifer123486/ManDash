const mongoose = require('mongoose');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '.env') });
const User = require('./models/User');
const Order = require('./models/Order');

mongoose.connect(process.env.MONGO_URI)
    .then(async () => {
        const user = await User.findOne({ name: 'Mayur Patil' });
        if (user) {
            const result = await Order.updateMany(
                { 
                    $or: [
                        { customerName: 'Mayur Patil' },
                        { customerEmail: 'mayurpatiltae@gmail.com' } // Misspelled email
                    ]
                }, 
                { 
                    customer: user._id, 
                    customerEmail: user.email 
                }
            );
            console.log('Fixed', result.modifiedCount, 'orders for Mayur Patil');
        } else {
            console.log('User Mayur Patil not found');
        }
        process.exit(0);
    })
    .catch(err => {
        console.error(err);
        process.exit(1);
    });
