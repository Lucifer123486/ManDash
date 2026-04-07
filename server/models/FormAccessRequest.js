const mongoose = require('mongoose');

const formAccessRequestSchema = new mongoose.Schema({
    staff: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    drone: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Drone',
        required: true
    },
    formCode: {
        type: String,
        required: true
    },
    status: {
        type: String,
        enum: ['pending', 'approved', 'rejected'],
        default: 'pending'
    },
    approvedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
    },
    approvedAt: {
        type: Date
    },
    remarks: {
        type: String
    }
}, {
    timestamps: true
});

// Index for unique requests per staff/drone/formCode
formAccessRequestSchema.index({ staff: 1, drone: 1, formCode: 1 }, { unique: true });

module.exports = mongoose.model('FormAccessRequest', formAccessRequestSchema);
