const mongoose = require('mongoose');

const orderSchema = new mongoose.Schema({
    orderNumber: {
        type: String,
        required: true,
        unique: true
    },
    poNumber: {
        type: String,
        default: ''
    },
    // Customer details
    customer: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
    },
    customerName: {
        type: String,
        required: true
    },
    customerPhone: String,
    customerEmail: String,
    customerAddress: String,
    customerPinCode: String,
    // Order details
    quantity: {
        type: Number,
        required: true,
        default: 1
    },
    modelNo: {
        type: String,
        default: 'CS_KRISHI_10L'
    },
    // Associated drones
    drones: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Drone'
    }],
    // Order status
    status: {
        type: String,
        enum: [
            'booking_confirmed',
            'in_manufacturing',
            'ready_for_testing',
            'tested_successfully',
            'uin_generated',
            'uin_transferred_successfully',
            'ready_to_dispatch',
            'delivered'
        ],
        default: 'booking_confirmed'
    },
    // Important dates
    orderDate: {
        type: Date,
        default: Date.now
    },
    expectedDeliveryDate: Date,
    actualDeliveryDate: Date,
    // Documents
    documents: [{
        name: String,
        type: String,
        url: String,
        uploadedAt: {
            type: Date,
            default: Date.now
        }
    }],
    // Payment info
    totalAmount: Number,
    paidAmount: {
        type: Number,
        default: 0
    },
    paymentStatus: {
        type: String,
        enum: ['pending', 'partial', 'completed'],
        default: 'pending'
    },
    // Subsidy/Loan info
    hasSubsidy: {
        type: Boolean,
        default: false
    },
    subsidyDocument: String,
    hasLoan: {
        type: Boolean,
        default: false
    },
    loanDocument: String,
    // SMS notification settings for client
    smsNotifications: {
        orderConfirmed: { type: Boolean, default: true },
        inManufacturing: { type: Boolean, default: true },
        readyForTesting: { type: Boolean, default: true },
        uinRegistered: { type: Boolean, default: true },
        readyToDispatch: { type: Boolean, default: true }
    },
    // Created by (staff who created the order)
    createdBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
    },
    // Service Tracking
    freeServicesUsed: {
        type: Number,
        default: 0,
        required: true,
        max: 6
    },
    remarks: String
}, {
    timestamps: true
});

// Generate order number
orderSchema.statics.generateOrderNumber = async function () {
    const count = await this.countDocuments();
    const date = new Date();
    const year = date.getFullYear().toString().slice(-2);
    const month = String(date.getMonth() + 1).padStart(2, '0');
    return `CSI/${year}${month}/${String(count + 1).padStart(4, '0')}`;
};

module.exports = mongoose.model('Order', orderSchema);
