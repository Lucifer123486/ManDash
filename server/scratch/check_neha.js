const mongoose = require('mongoose');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });

const User = require('../models/User');
const Order = require('../models/Order');
const Drone = require('../models/Drone');

async function checkNeha() {
    try {
        await mongoose.connect(process.env.MONGODB_URI);
        console.log('Connected');

        const drone = await Drone.findOne({ serialNo: 'CSKRISHI012' }).populate('order');
        if (drone) {
            console.log(`Drone: ${drone.serialNo}`);
            if (drone.order) {
                console.log(`Assigned to Order: ${drone.order.orderNumber}`);
                console.log(`Order Customer Email: "${drone.order.customerEmail}"`);
                console.log(`Order Customer ID: ${drone.order.customer}`);
                
                const userById = await User.findById(drone.order.customer);
                console.log(`User by ID: ${userById ? userById.name + ' (' + userById.email + ')' : 'NOT FOUND'}`);

                const userByEmail = await User.findOne({ email: drone.order.customerEmail });
                console.log(`User by Email: ${userByEmail ? userByEmail.name + ' (' + userByEmail.email + ')' : 'NOT FOUND'}`);
            } else {
                console.log('Drone has no order linked.');
            }
        } else {
            // Try with underscore if that's the format
            const droneAlt = await Drone.findOne({ serialNo: 'CSKRISHI_012' }).populate('order');
            console.log(`Checking alternative serial "CSKRISHI_012": ${droneAlt ? 'Found' : 'Not Found'}`);
            if (droneAlt && droneAlt.order) {
                console.log(`Order Customer Email: "${droneAlt.order.customerEmail}"`);
                const userByEmail = await User.findOne({ email: droneAlt.order.customerEmail });
                console.log(`User by Email: ${userByEmail ? userByEmail.name + ' (' + userByEmail.email + ')' : 'NOT FOUND'}`);
            }
        }

        const allNehas = await User.find({ name: /Neha/i });
        console.log('\nAll users with "Neha" in name:');
        allNehas.forEach(u => console.log(`- ${u.name}: "${u.email}" (ID: ${u._id})`));

        await mongoose.disconnect();
    } catch (err) {
        console.error(err);
    }
}

checkNeha();
