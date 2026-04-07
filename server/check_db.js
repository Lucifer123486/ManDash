const mongoose = require('mongoose');
const FormSchema = require('./models/FormSchema');

async function check() {
    try {
        await mongoose.connect('mongodb://localhost:27017/cerebrospark');
        const schema = await FormSchema.findOne({ formCode: 'WORK_ORDER' });
        console.log('WORK_ORDER Schema:', schema);
        process.exit(0);
    } catch (err) {
        console.error(err);
        process.exit(1);
    }
}
check();
