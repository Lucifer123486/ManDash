const mongoose = require('mongoose');
const Drone = require('../models/Drone');
const Order = require('../models/Order');
require('dotenv').config();

const createDronesForOrders = async () => {
    try {
        await mongoose.connect(process.env.MONGODB_URI);
        console.log('Connected to MongoDB');

        // Find all confirmed orders
        const orders = await Order.find({
            status: { $in: ['confirmed', 'in_manufacturing', 'ready_to_dispatch'] }
        });
        console.log(`Found ${orders.length} confirmed orders`);

        for (const order of orders) {
            // Check if drones already exist for this order
            const existingDrones = await Drone.find({ order: order._id });

            if (existingDrones.length === 0) {
                console.log(`\nCreating drones for order: ${order.orderNumber}`);
                const drones = [];

                for (let i = 0; i < order.quantity; i++) {
                    const serialNo = await Drone.generateSerialNo();
                    const drone = await Drone.create({
                        modelNo: order.modelNo,
                        serialNo,
                        order: order._id,
                        manufacturingStatus: 'material_entry',
                        workflowStage: 1
                    });
                    drones.push(drone._id);
                    console.log(`  Created drone: ${serialNo}`);
                }

                // Update order with drones
                order.drones = drones;
                await order.save();
                console.log(`  Updated order with ${drones.length} drones`);
            } else {
                console.log(`Order ${order.orderNumber} already has ${existingDrones.length} drones`);
            }
        }

        console.log('\n✅ Done! Drones created for all confirmed orders.');
        process.exit(0);
    } catch (error) {
        console.error('Error:', error);
        process.exit(1);
    }
};

createDronesForOrders();
