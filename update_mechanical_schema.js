const mongoose = require('mongoose');
const FormSchema = require('./server/models/FormSchema');
require('dotenv').config({ path: './server/.env' });

async function updateSchema() {
    try {
        await mongoose.connect(process.env.MONGODB_URI, {
            useNewUrlParser: true,
            useUnifiedTopology: true
        });
        console.log('Connected to DB');

        const fields = [
            { name: 'armOrientation', label: '1. Check the folding orientation of arm (Clockwise)', type: 'select', options: ['YES', 'NO'] },
            { name: 'motorOrientation', label: '2. Check the motor orientation', type: 'select', options: ['YES', 'NO'] },
            { name: 'boltsCheck', label: '3. Randomly check any 5 bolts tightening with calibrated torque wrench', type: 'select', options: ['YES', 'NO'] },
            { name: 'powerCordPolarity', label: '4. Check the Power cord polarity (Backside positive and Front negative)', type: 'select', options: ['YES', 'NO'] },
            { name: 'powerCordBolts', label: '5. Check whether power cord bolts are tight or not', type: 'select', options: ['YES', 'NO'] },
            { name: 'hubBolts', label: '6. Check if all bolts are inserted in hub to arm from top and bottom', type: 'select', options: ['YES', 'NO'] },
            { name: 'landingGearJoint', label: '7. Check if landing gear joint is attached properly to hub', type: 'select', options: ['YES', 'NO'] },
            { name: 'verticalLandingGear', label: '8. Check vertical landing gear is attached firmly to landing gear', type: 'select', options: ['YES', 'NO'] },
            { name: 'horizontalLandingGear', label: '9. Check Horizontal landing gear are firmly attached', type: 'select', options: ['YES', 'NO'] },
            { name: 'motorNumber1', label: '10. Check if motor number is correct on respective arm - Motor number 1', type: 'select', options: ['YES', 'NO'] },
            { name: 'motorNumber2', label: '10. Check if motor number is correct on respective arm - Motor number 2', type: 'select', options: ['YES', 'NO'] },
            { name: 'motorNumber3', label: '10. Check if motor number is correct on respective arm - Motor number 3', type: 'select', options: ['YES', 'NO'] },
            { name: 'motorNumber4', label: '10. Check if motor number is correct on respective arm - Motor number 4', type: 'select', options: ['YES', 'NO'] },
            { name: 'motorNumber5', label: '10. Check if motor number is correct on respective arm - Motor number 5', type: 'select', options: ['YES', 'NO'] },
            { name: 'motorNumber6', label: '10. Check if motor number is correct on respective arm - Motor number 6', type: 'select', options: ['YES', 'NO'] }
        ];

        const schema = await FormSchema.findOneAndUpdate(
            { formCode: 'QA_MECHANICAL' },
            { $set: { 'sections.0.fields': fields } },
            { new: true }
        );

        console.log('Update successful', schema.sections[0].fields);
        process.exit(0);
    } catch (err) {
        console.error(err);
        process.exit(1);
    }
}

updateSchema();
