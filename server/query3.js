const mongoose = require('mongoose');
const Ticket = require('./models/Ticket');

mongoose.connect('mongodb://127.0.0.1:27017/cerebrospark')
    .then(async () => {
        const t = await Ticket.findOne({ ticketNumber: 'TKT-1038' });
        if (t) {
            console.log('Ticket TKT-1038 found:', { ticketNumber: t.ticketNumber, problemType: t.problemType });
        } else {
            console.log('Ticket TKT-1038 not found');
        }
        process.exit(0);
    })
    .catch(err => {
        console.error(err);
        process.exit(1);
    });
