const mongoose = require('mongoose');

const prebookingSchema = new mongoose.Schema({
    name: {
        type: String,
        required: [true, 'Customer name is required'],
        trim: true
    },
    phone: {
        type: String,
        required: [true, 'Phone number is required'],
        trim: true
    },
    email: {
        type: String,
        trim: true,
        lowercase: true
    },
    address: {
        type: String,
        trim: true
    },
    city: {
        type: String,
        trim: true
    },
    district: {
        type: String,
        trim: true
    },
    state: {
        type: String,
        trim: true
    },
    pincode: {
        type: String,
        trim: true
    },
    source: {
        type: String,
        enum: ['Referral', 'IndiaMart', 'Instagram', 'Dealer', 'Exhibition', 'Other'],
        default: 'Referral'
    },
    sourceOther: {
        type: String,
        trim: true
    },
    tokenAmount: {
        type: Number,
        required: [true, 'Token amount is required'],
        default: 0
    },
    assignedSalesStaff: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
    },
    status: {
        type: String,
        enum: ['Interested', 'Not Interested', 'Pending'],
        default: 'Pending'
    },
    callLogs: [{
        description: {
            type: String,
            required: true
        },
        callRecording: {
            type: String, // Path to file
            required: true
        },
        specialNote: {
            type: String
        },
        date: {
            type: Date,
            default: Date.now
        },
        addedBy: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User'
        }
    }],
    createdBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    }
}, {
    timestamps: true
});

module.exports = mongoose.model('Prebooking', prebookingSchema);
