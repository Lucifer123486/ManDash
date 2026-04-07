const mongoose = require('mongoose');
const Ticket = require('./server/models/Ticket');

mongoose.connect('mongodb://127.0.0.1:27017/mandash')
    .then(async () => {
        const t = await Ticket.findOne({ ticketNumber: 'TKT-1038' });
        console.log('Ticket Data:', t);
        process.exit(0);
    })
    .catch(err => {
        console.error(err);
        process.exit(1);
    });
