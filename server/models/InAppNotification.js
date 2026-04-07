const mongoose = require('mongoose');

const inAppNotificationSchema = new mongoose.Schema({
    user: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    title: {
        type: String,
        required: true
    },
    message: {
        type: String,
        required: true
    },
    type: {
        type: String,
        enum: ['ticket_assigned', 'ticket_accepted', 'ticket_rejected', 'system', 'general'],
        default: 'general'
    },
    isRead: {
        type: Boolean,
        default: false
    },
    link: {
        type: String,
    }
}, { timestamps: true });

module.exports = mongoose.model('InAppNotification', inAppNotificationSchema);
