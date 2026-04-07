const mongoose = require('mongoose');
const ActivationRecord = require('./models/ActivationRecord');
require('dotenv').config();

mongoose.connect(process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/cerebrospark', {
    useNewUrlParser: true,
    useUnifiedTopology: true
}).then(async () => {
    try {
        const count = await ActivationRecord.countDocuments();
        const records = await ActivationRecord.find();
        console.log('Count:', count);
        console.log('Records:', records);
    } catch (e) {
        console.error(e);
    } finally {
        process.exit(0);
    }
});
