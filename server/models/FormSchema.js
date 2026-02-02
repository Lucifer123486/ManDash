const mongoose = require('mongoose');

// Field definition for dynamic form generation
const fieldSchema = new mongoose.Schema({
    name: {
        type: String,
        required: true
    },
    label: {
        type: String,
        required: true
    },
    type: {
        type: String,
        enum: ['text', 'number', 'date', 'select', 'checkbox', 'textarea', 'radio', 'signature', 'table'],
        default: 'text'
    },
    required: {
        type: Boolean,
        default: false
    },
    options: [{
        type: String
    }],
    placeholder: String,
    defaultValue: mongoose.Schema.Types.Mixed,
    // For nested fields (like sub-checks in a category)
    subFields: [{
        name: String,
        label: String,
        type: String,
        options: [String]
    }],
    // For table type fields
    columns: [{
        name: String,
        label: String,
        type: String
    }]
}, { _id: false });

// Section for grouping fields
const sectionSchema = new mongoose.Schema({
    title: {
        type: String,
        required: true
    },
    fields: [fieldSchema]
}, { _id: false });

const formSchemaDefinition = new mongoose.Schema({
    formName: {
        type: String,
        required: [true, 'Form name is required'],
        unique: true
    },
    formCode: {
        type: String,
        required: [true, 'Form code is required'],
        unique: true
    },
    description: {
        type: String
    },
    category: {
        type: String,
        enum: ['manufacturing', 'quality', 'testing', 'packaging', 'dispatch', 'certificate', 'material'],
        required: true
    },
    // Which roles can access this form
    allowedRoles: [{
        type: String,
        enum: ['admin', 'staff', 'qi', 'client']
    }],
    // Workflow step number in manufacturing process
    workflowOrder: {
        type: Number,
        default: 0
    },
    // Header fields (Model No, Serial No, Date, etc.)
    headerFields: [fieldSchema],
    // Main form sections with fields
    sections: [sectionSchema],
    // Footer fields (Verified by, Signature, etc.)
    footerFields: [fieldSchema],
    // Whether form requires approval
    requiresApproval: {
        type: Boolean,
        default: false
    },
    // Prerequisite form that must be completed before this one
    prerequisiteForm: {
        type: String,
        default: null
    },
    // Expected duration in hours
    expectedDuration: {
        type: Number,
        default: 24 // 1 day default
    },
    // Specific roles that can access (more granular than allowedRoles)
    accessRoles: [{
        type: String,
        enum: ['admin', 'gs', 'qi', 'manufacturing_staff']
    }],
    // Version control
    version: {
        type: Number,
        default: 1
    },
    isActive: {
        type: Boolean,
        default: true
    }
}, {
    timestamps: true
});

module.exports = mongoose.model('FormSchema', formSchemaDefinition);
