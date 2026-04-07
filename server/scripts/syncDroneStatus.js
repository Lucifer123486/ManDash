const mongoose = require('mongoose');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });

const Drone = require('../models/Drone');

const MONGO_URI = process.env.MONGO_URI || 'mongodb://localhost:27017/mandash';

const mapFormCodeToStatus = (formCode) => {
    const mapping = {
        'PO': 'material_entry',
        'MRF': 'material_inspection',
        'QA_SOLDERING': 'soldering',
        'QA_MECHANICAL': 'mechanical_assembly',
        'QA_ELECTRONIC': 'electronic_assembly',
        'QA_PAYLOAD': 'payload_assembly',
        'QA_CALIBRATION': 'calibration',
        'FLIGHT_TEST': 'flight_test',
        'PACKAGING': 'packaging',
        'DISPATCH': 'dispatch',
        'CERTIFICATE': 'delivered'
    };
    return mapping[formCode] || null;
};

const syncDrones = async () => {
    try {
        await mongoose.connect(MONGO_URI);
        console.log('Connected to MongoDB');

        const drones = await Drone.find({ isActive: true });
        console.log(`Found ${drones.length} drones to check`);

        for (const drone of drones) {
            if (drone.completedSteps && drone.completedSteps.length > 0) {
                // Find the "highest" step based on the mapping
                const steps = drone.completedSteps.map(s => s.step);

                // Ordered list of statuses to find the furthest one
                const statusOrder = [
                    'material_entry', 'material_inspection', 'inventory_update',
                    'material_distribution', 'soldering', 'mechanical_assembly',
                    'payload_assembly', 'electronic_assembly', 'calibration',
                    'flight_test', 'packaging', 'dispatch', 'delivered'
                ];

                let furthestStatus = drone.manufacturingStatus;
                let furthestIndex = statusOrder.indexOf(furthestStatus);

                for (const stepCode of steps) {
                    const status = mapFormCodeToStatus(stepCode);
                    if (status) {
                        const index = statusOrder.indexOf(status);
                        if (index > furthestIndex) {
                            furthestIndex = index;
                            furthestStatus = status;
                        }
                    }
                }

                if (furthestStatus !== drone.manufacturingStatus) {
                    console.log(`Updating ${drone.serialNo}: ${drone.manufacturingStatus} -> ${furthestStatus}`);
                    drone.manufacturingStatus = furthestStatus;
                    await drone.save();
                }
            }
        }

        console.log('Sync completed successfully');
        process.exit(0);
    } catch (error) {
        console.error('Error syncing drones:', error);
        process.exit(1);
    }
};

syncDrones();
