const mongoose = require('mongoose');

const ticketSchema = new mongoose.Schema({
    // User who raised the ticket (Client or Staff)
    user: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    // The actual client (if created by staff on behalf of client)
    client: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
    },
    // Ticket number for reference (e.g., TKT-1001)
    ticketNumber: {
        type: String,
        unique: true
    },
    // Required Google Form Fields
    customerEmail: { type: String },
    customerName: { type: String },
    customerMobile: { type: String },
    customerLocation: { type: String },

    droneSerialNumber: { type: String },
    dateOfPurchase: { type: Date },
    warrantyStatus: { type: Boolean },
    problemDescription: { type: String },
    photoVideoReceived: { type: Boolean },

    problemType: {
        type: String,
        enum: ['Software issue', 'Hardware issue', 'Manufacturing issue']
    },

    problemCategory: {
        type: String,
        enum: ['Call/Video Call', 'Field Visit', 'Major Repair(Service Center)', 'Client at Service Centre']
    },
    contactedCustomerAt: { type: String },
    actionToBeTaken: {
        type: String,
        enum: ['Solve On Call', 'Solve On Field', 'Service Center', 'Send Spare', 'Other']
    },
    actionToBeTakenOtherReason: { type: String },
    finalResolutionTime: { type: String },
    finalResolutionStatus: {
        type: String,
        enum: ['Resolved', 'Other']
    },
    finalResolutionOtherReason: { type: String },

    // Detailed Issue Fields
    issueComponent: { type: String },
    issueQuestion: { type: String },
    issueAnswer: { type: String },

    customerMedia: { type: String },
    allocatedEngineer: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
    },
    callLogs: [{
        timeContacted: { type: String },
        duration: { type: String },
        notes: { type: String }, // Maps to 'Description' in UI
        specialNote: { type: String },
        callRecording: { type: String },
        
        // Detailed fields from final submission form
        customerEmail: { type: String },
        customerLocation: { type: String },
        droneSerialNumber: { type: String },
        issueComponent: { type: String },
        issueDescription: { type: String },
        photoVideoReceived: { type: Boolean },
        actionToBeTaken: { type: String },
        actionToBeTakenOtherReason: { type: String },
        finalResolutionStatus: { type: String },
        finalResolutionOtherReason: { type: String },
        finalResolutionTime: { type: String },
        serviceEngineerRemarks: { type: String },
        geotagPhoto: { type: String },
        customerMedia: { type: String },
        allocatedEngineer: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
        
        loggedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
        createdAt: { type: Date, default: Date.now }
    }],

    // Assignment Fields
    assignedTo: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
    },
    assignmentStatus: {
        type: String,
        enum: ['unassigned', 'pending_acceptance', 'accepted', 'rejected'],
        default: 'unassigned'
    },
    rejectionReason: {
        type: String
    },

    // Old fields mapped/retained for safety:
    category: {
        type: String,
        default: 'Support'
    },
    // Description of the issue
    issueDescription: {
        type: String
    },
    // Determine overall ticket status
    status: {
        type: String,
        enum: ['initial', 'open', 'in_progress', 'resolved', 'rejected'],
        default: 'initial'
    },
    // Related Order (optional, for service requests)
    order: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Order'
    },
    // Service Type
    serviceType: {
        type: String,
        enum: ['support', 'free_service', 'paid_service'],
        default: 'support'
    },
    // Count for free services (e.g., 1 out of 6)
    serviceCount: {
        type: Number
    },
    // Flag to ensure we don't double count free services if a ticket is updated multiple times
    isServiceCounted: {
        type: Boolean,
        default: false
    },
    // Who resolved it
    resolvedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
    },
    // Notes added by admin upon resolution
    resolutionNotes: {
        type: String
    },
    resolvedAt: {
        type: Date
    },
    // New SLA and Flow fields
    slaStartTime: {
        type: Date
    },
    slaBreached: {
        type: Boolean,
        default: false
    },
    serviceEngineerRemarks: {
        type: String
    },
    geotagPhoto: {
        type: String
    },
    initialReportBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
    }
}, {
    timestamps: true
});

// Auto-generate ticket number
ticketSchema.pre('save', async function () {
    if (!this.ticketNumber) {
        const count = await this.constructor.countDocuments();
        this.ticketNumber = `TKT-${1000 + count + 1}`;
    }
});

module.exports = mongoose.model('Ticket', ticketSchema);
