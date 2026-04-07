require('dotenv').config();
const mongoose = require('mongoose');
const fs = require('fs');
const Ticket = require('./models/Ticket');
const User = require('./models/User');

(async () => {
    try {
        await mongoose.connect(process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/cerebrospark');
        const tickets = await Ticket.find({ assignedTo: { $exists: true } }).sort({ updatedAt: -1 }).limit(5).populate('assignedTo');

        const output = tickets.map(t => ({
            ticketId: t._id,
            ticketNumber: t.ticketNumber,
            assignedToId: t.assignedTo?._id,
            assignedToName: t.assignedTo?.name,
            assignedToEmail: t.assignedTo?.email,
            status: t.assignmentStatus
        }));
        fs.writeFileSync('tickets_output.json', JSON.stringify(output, null, 2));
    } catch (err) {
        console.error(err);
    } finally {
        process.exit();
    }
})();
