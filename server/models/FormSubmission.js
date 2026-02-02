const mongoose = require('mongoose');

const formSubmissionSchema = new mongoose.Schema({
    formSchema: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'FormSchema',
        required: true
    },
    // Reference to the drone this form is for
    drone: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Drone'
    },
    // Reference to the order
    order: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Order'
    },
    // Who submitted the form
    submittedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    // Header data (Model No, Serial No, Date, etc.)
    headerData: {
        type: mongoose.Schema.Types.Mixed,
        default: {}
    },
    // Main form data - stores all field values
    formData: {
        type: mongoose.Schema.Types.Mixed,
        required: true
    },
    // Footer data (Signatures, verified by, etc.)
    footerData: {
        type: mongoose.Schema.Types.Mixed,
        default: {}
    },
    // Form status
    status: {
        type: String,
        enum: ['draft', 'submitted', 'approved', 'rejected', 'revision_required'],
        default: 'submitted'
    },
    // If rejected or revision required
    remarks: {
        type: String
    },
    // Approval tracking
    approvedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
    },
    approvedAt: {
        type: Date
    },
    // Version for tracking changes
    version: {
        type: Number,
        default: 1
    },
    // For storing signature images
    signatures: [{
        field: String,
        imageUrl: String,
        signedBy: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User'
        },
        signedAt: Date
    }]
}, {
    timestamps: true
});

// Index for faster queries
formSubmissionSchema.index({ formSchema: 1, drone: 1 });
formSubmissionSchema.index({ submittedBy: 1, status: 1 });

module.exports = mongoose.model('FormSubmission', formSubmissionSchema);
