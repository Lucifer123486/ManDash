const mongoose = require('mongoose');

const droneSchema = new mongoose.Schema({
    modelNo: {
        type: String,
        required: [true, 'Model number is required'],
        default: 'CS_KRISHI_10L'
    },
    serialNo: {
        type: String,
        required: [true, 'Serial number is required'],
        unique: true
    },
    // Reference information
    documentReferenceNo: {
        type: String
    },
    typeCertificateNumber: {
        type: String
    },
    // UAS Component details (from Certificate of Conformity)
    components: {
        flightControllerNumber: String,
        gcsNumber: String,
        obstacleAvoidanceNumber: String,
        groundRadarNumber: String,
        gpsNumber: String,
        uinNumber: String
    },
    // Manufacturing status
    manufacturingStatus: {
        type: String,
        enum: [
            'material_entry',
            'material_inspection',
            'inventory_update',
            'material_distribution',
            'soldering',
            'mechanical_assembly',
            'payload_assembly',
            'electronic_assembly',
            'calibration',
            'flight_test',
            'packaging',
            'dispatch',
            'delivered'
        ],
        default: 'material_entry'
    },
    // Completed workflow steps
    completedSteps: [{
        step: String,
        completedAt: Date,
        completedBy: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User'
        },
        formSubmission: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'FormSubmission'
        }
    }],
    // Assigned to which order
    order: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Order'
    },
    // Quality check status
    qualityStatus: {
        type: String,
        enum: ['pending', 'in_progress', 'passed', 'failed'],
        default: 'pending'
    },
    // Dispatch and delivery
    dispatchDate: Date,
    deliveryDate: Date,
    // All associated forms
    forms: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: 'FormSubmission'
    }],
    // Current workflow stage (1-11)
    workflowStage: {
        type: Number,
        default: 1,
        min: 1,
        max: 11
    },
    // Stage history with timestamps
    stageHistory: [{
        stage: Number,
        stageName: String,
        startedAt: Date,
        completedAt: Date,
        completedBy: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User'
        }
    }],
    // Deadline for each stage (15 days total distributed)
    stageDeadlines: {
        stage1: Date, // Prebooking
        stage2: Date, // Booking
        stage3: Date, // Purchase Order
        stage4: Date, // Material Requisition
        stage5: Date, // Soldering
        stage6: Date, // Mechanical
        stage7: Date, // Electrical
        stage8: Date, // Payload
        stage9: Date, // Calibration
        stage10: Date, // Activation
        stage11: Date // Final stages
    },
    // Assigned quality inspector
    assignedQI: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
    },
    // Assigned general staff
    assignedGS: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
    },
    // Workflow started date
    workflowStartedAt: {
        type: Date,
        default: Date.now
    },
    // Notes and remarks
    remarks: String,
    // Active status
    isActive: {
        type: Boolean,
        default: true
    }
}, {
    timestamps: true
});

// Generate serial number
droneSchema.statics.generateSerialNo = async function () {
    const count = await this.countDocuments();
    return `CSKRISHI_${String(count + 1).padStart(3, '0')}`;
};

module.exports = mongoose.model('Drone', droneSchema);
