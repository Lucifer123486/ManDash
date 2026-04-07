const mongoose = require('mongoose');

const activationRecordSchema = new mongoose.Schema({
    droneId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Drone',
        required: true,
        unique: true
    },
    serialNumber: { type: String, required: true },
    clientName: { type: String },
    flightControllerNumber: { type: String },
    gcsNumber: { type: String },
    obstacleAvoidance: { type: String },
    groundRadar: { type: String },
    gps: { type: String },
    manufacturingDate: { type: Date },
    uin: { type: String },
    issueDate: { type: Date },
    status: { type: String, default: 'INSTALLED' },
    uinTransfer: { type: String, default: 'Accepted' }
}, {
    timestamps: true
});

module.exports = mongoose.model('ActivationRecord', activationRecordSchema);
