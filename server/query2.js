const mongoose = require('mongoose');
const Ticket = require('./models/Ticket');

mongoose.connect('mongodb://127.0.0.1:27017/mandash')
    .then(async () => {
        const tickets = await Ticket.find().sort({ createdAt: -1 }).limit(3);
        tickets.forEach(t => {
            console.log({ ticketNumber: t.ticketNumber, problemType: t.problemType, createdAt: t.createdAt });
        });
        process.exit(0);
    })
    .catch(err => {
        console.error(err);
        process.exit(1);
    });
