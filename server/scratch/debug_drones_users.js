const mongoose = require('mongoose');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });

const User = require('../models/User');
const Order = require('../models/Order');
const Drone = require('../models/Drone');

async function debugData() {
    try {
        await mongoose.connect(process.env.MONGODB_URI);
        console.log('Connected to MongoDB');

        const drones = await Drone.find({ order: { $exists: true, $ne: null } }).populate('order');
        console.log(`Found ${drones.length} drones with an associated order.`);

        const users = await User.find({ role: 'client' });
        console.log(`Found ${users.length} clients.`);

        for (const user of users) {
            console.log(`\nChecking User: ${user.name} (${user.email})`);
            const userOrders = await Order.find({
                $or: [
                    { customer: user._id },
                    { customerEmail: user.email }
                ]
            }).populate('drones');
            
            console.log(`  - Orders found: ${userOrders.length}`);
            userOrders.forEach(o => {
                console.log(`    * Order ${o.orderNumber}: ${o.drones.length} drones link back to this order.`);
                o.drones.forEach(d => console.log(`      > Drone Serial: ${d.serialNo}`));
            });
        }

        console.log('\n--- Checking Unlinked Drones ---');
        for (const drone of drones) {
            const order = drone.order;
            if (order) {
                const customerMatch = await User.findOne({
                    $or: [
                        { _id: order.customer },
                        { email: order.customerEmail }
                    ]
                });
                if (!customerMatch) {
                    console.log(`Drone ${drone.serialNo} is assigned to Order ${order.orderNumber}, but that order has NO matching User in the database.`);
                    console.log(`  Order Customer ID: ${order.customer}, Email: ${order.customerEmail}`);
                }
            }
        }

        await mongoose.disconnect();
    } catch (err) {
        console.error(err);
    }
}

debugData();
