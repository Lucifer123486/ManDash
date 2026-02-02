const mongoose = require('mongoose');
const FormSchema = require('../models/FormSchema');
const User = require('../models/User');
require('dotenv').config({ path: '../.env' });

// 15 days = 360 hours, distributed across 11 stages
// Workflow stages with access control and prerequisites
const formSchemas = [
    // Stage 1: Purchase Order Form (GS)
    {
        formName: 'Purchase Order',
        formCode: 'PO',
        description: 'Purchase order for drone manufacturing',
        category: 'material',
        allowedRoles: ['admin', 'staff'],
        accessRoles: ['admin', 'gs'],
        workflowOrder: 1,
        prerequisiteForm: null,
        expectedDuration: 24, // 1 day
        requiresApproval: true,
        headerFields: [
            { name: 'date', label: 'Date', type: 'date', required: true },
            { name: 'poNumber', label: 'PO Number', type: 'text', required: true },
            { name: 'orderNo', label: 'Order No', type: 'text', required: true },
            { name: 'droneSerialNo', label: 'Drone Serial No', type: 'text', required: true }
        ],
        sections: [
            {
                title: 'Purchase Details',
                fields: [
                    { name: 'vendorName', label: 'Vendor Name', type: 'text', required: true },
                    { name: 'vendorAddress', label: 'Vendor Address', type: 'textarea' },
                    { name: 'totalAmount', label: 'Total Amount', type: 'number', required: true },
                    { name: 'paymentTerms', label: 'Payment Terms', type: 'text' }
                ]
            }
        ],
        footerFields: [
            { name: 'preparedBy', label: 'Prepared By', type: 'text' },
            { name: 'approvedBy', label: 'Approved By', type: 'text' }
        ]
    },

    // Stage 2: Material Requisition Form (GS)
    {
        formName: 'Material Requisition',
        formCode: 'MRF',
        description: 'Form for requesting materials for drone manufacturing',
        category: 'material',
        allowedRoles: ['admin', 'staff'],
        accessRoles: ['admin', 'gs'],
        workflowOrder: 2,
        prerequisiteForm: 'PO',
        expectedDuration: 24, // 1 day
        requiresApproval: true,
        headerFields: [
            { name: 'date', label: 'Date', type: 'date', required: true },
            { name: 'materialOrderNo', label: 'Material Order No', type: 'text', required: true },
            { name: 'workOrderNo', label: 'Work Order No', type: 'text', required: true },
            { name: 'droneSeriesNo', label: 'Drone Series No', type: 'text', required: true },
            { name: 'typeOfRequisition', label: 'Type of Requisition', type: 'select', options: ['NEW', 'Maintenance', 'Spare'], required: true }
        ],
        sections: [
            {
                title: 'Item 1',
                fields: [
                    { name: 'particular1', label: 'Particular', type: 'text' },
                    { name: 'partNo1', label: 'Part No', type: 'text' },
                    { name: 'qty1', label: 'Quantity', type: 'number' }
                ]
            },
            {
                title: 'Item 2',
                fields: [
                    { name: 'particular2', label: 'Particular', type: 'text' },
                    { name: 'partNo2', label: 'Part No', type: 'text' },
                    { name: 'qty2', label: 'Quantity', type: 'number' }
                ]
            },
            {
                title: 'Item 3',
                fields: [
                    { name: 'particular3', label: 'Particular', type: 'text' },
                    { name: 'partNo3', label: 'Part No', type: 'text' },
                    { name: 'qty3', label: 'Quantity', type: 'number' }
                ]
            }
        ],
        footerFields: [
            { name: 'initiatedBy', label: 'Initiated By', type: 'text' },
            { name: 'approvedBy', label: 'Approved By', type: 'text' }
        ]
    },

    // Stage 3: Soldering Station QA (Manufacturing Staff)
    {
        formName: 'QA - Soldering Station',
        formCode: 'QA_SOLDERING',
        description: 'Quality assurance checklist for soldering station',
        category: 'manufacturing',
        allowedRoles: ['admin', 'staff'],
        accessRoles: ['admin', 'manufacturing_staff'],
        workflowOrder: 3,
        prerequisiteForm: 'MRF',
        expectedDuration: 32, // ~1.3 days
        requiresApproval: true,
        headerFields: [
            { name: 'modelNo', label: 'Model No', type: 'text', required: true, defaultValue: 'CS_KRISHI_10L' },
            { name: 'serialNo', label: 'Serial No', type: 'text', required: true },
            { name: 'date', label: 'Date', type: 'date', required: true }
        ],
        sections: [
            {
                title: 'Motor Solder Connections',
                fields: [
                    { name: 'motor1', label: 'Motor 1 solder connection', type: 'select', options: ['YES', 'NO'] },
                    { name: 'motor2', label: 'Motor 2 solder connection', type: 'select', options: ['YES', 'NO'] },
                    { name: 'motor3', label: 'Motor 3 solder connection', type: 'select', options: ['YES', 'NO'] },
                    { name: 'motor4', label: 'Motor 4 solder connection', type: 'select', options: ['YES', 'NO'] },
                    { name: 'motor5', label: 'Motor 5 solder connection', type: 'select', options: ['YES', 'NO'] },
                    { name: 'motor6', label: 'Motor 6 solder connection', type: 'select', options: ['YES', 'NO'] }
                ]
            },
            {
                title: 'Connector Checks',
                fields: [
                    { name: 'pmuCheck', label: 'PMU XT60 connector', type: 'select', options: ['YES', 'NO'] },
                    { name: 'canHubCheck', label: 'CAN HUB XT60 connector', type: 'select', options: ['YES', 'NO'] },
                    { name: 'cameraCheck', label: 'Camera XT60 connector', type: 'select', options: ['YES', 'NO'] },
                    { name: 'pumpCheck', label: 'Pump XT60 connector', type: 'select', options: ['YES', 'NO'] },
                    { name: 'nozzle1', label: 'Nozzle 1 connector', type: 'select', options: ['YES', 'NO'] },
                    { name: 'nozzle2', label: 'Nozzle 2 connector', type: 'select', options: ['YES', 'NO'] },
                    { name: 'wireMesh', label: 'Wire mesh installed', type: 'select', options: ['YES', 'NO'] }
                ]
            }
        ],
        footerFields: [
            { name: 'verifiedBy', label: 'Verified By', type: 'text' },
            { name: 'signature', label: 'Signature', type: 'text' }
        ]
    },

    // Stage 4: Mechanical Station QA (Manufacturing Staff)
    {
        formName: 'QA - Mechanical Station',
        formCode: 'QA_MECHANICAL',
        description: 'Quality assurance checklist for mechanical assembly',
        category: 'manufacturing',
        allowedRoles: ['admin', 'staff'],
        accessRoles: ['admin', 'manufacturing_staff'],
        workflowOrder: 4,
        prerequisiteForm: 'QA_SOLDERING',
        expectedDuration: 32,
        requiresApproval: true,
        headerFields: [
            { name: 'modelNo', label: 'Model No', type: 'text', required: true, defaultValue: 'CS_KRISHI_10L' },
            { name: 'serialNo', label: 'Serial No', type: 'text', required: true },
            { name: 'date', label: 'Date', type: 'date', required: true }
        ],
        sections: [
            {
                title: 'Mechanical Assembly Checks',
                fields: [
                    { name: 'armOrientation', label: 'Arm folding orientation (Clockwise)', type: 'select', options: ['YES', 'NO'] },
                    { name: 'motorOrientation', label: 'Motor orientation', type: 'select', options: ['YES', 'NO'] },
                    { name: 'boltsCheck', label: '5 bolts tightening check', type: 'select', options: ['YES', 'NO'] },
                    { name: 'powerCordPolarity', label: 'Power cord polarity (+ve/-ve)', type: 'select', options: ['YES', 'NO'] },
                    { name: 'frameTightness', label: 'Frame tightness check', type: 'select', options: ['YES', 'NO'] }
                ]
            }
        ],
        footerFields: [
            { name: 'verifiedBy', label: 'Verified By', type: 'text' },
            { name: 'signature', label: 'Signature', type: 'text' }
        ]
    },

    // Stage 5: Electrical Station QA (Manufacturing Staff)
    {
        formName: 'QA - Electrical Station',
        formCode: 'QA_ELECTRICAL',
        description: 'Quality assurance checklist for electrical assembly',
        category: 'manufacturing',
        allowedRoles: ['admin', 'staff'],
        accessRoles: ['admin', 'manufacturing_staff'],
        workflowOrder: 5,
        prerequisiteForm: 'QA_MECHANICAL',
        expectedDuration: 32,
        requiresApproval: true,
        headerFields: [
            { name: 'modelNo', label: 'Model No', type: 'text', required: true, defaultValue: 'CS_KRISHI_10L' },
            { name: 'serialNo', label: 'Serial No', type: 'text', required: true },
            { name: 'date', label: 'Date', type: 'date', required: true }
        ],
        sections: [
            {
                title: 'Electrical Checks',
                fields: [
                    { name: 'flightController', label: 'Flight controller installation', type: 'select', options: ['YES', 'NO'] },
                    { name: 'escConnection', label: 'ESC connections', type: 'select', options: ['YES', 'NO'] },
                    { name: 'batteryConnector', label: 'Battery connector check', type: 'select', options: ['YES', 'NO'] },
                    { name: 'gpsModule', label: 'GPS module installation', type: 'select', options: ['YES', 'NO'] },
                    { name: 'receiverBinding', label: 'Receiver binding', type: 'select', options: ['YES', 'NO'] }
                ]
            }
        ],
        footerFields: [
            { name: 'verifiedBy', label: 'Verified By', type: 'text' },
            { name: 'signature', label: 'Signature', type: 'text' }
        ]
    },

    // Stage 6: Payload Station QA (Manufacturing Staff)
    {
        formName: 'QA - Payload Station',
        formCode: 'QA_PAYLOAD',
        description: 'Quality assurance checklist for payload station',
        category: 'manufacturing',
        allowedRoles: ['admin', 'staff'],
        accessRoles: ['admin', 'manufacturing_staff'],
        workflowOrder: 6,
        prerequisiteForm: 'QA_ELECTRICAL',
        expectedDuration: 32,
        requiresApproval: true,
        headerFields: [
            { name: 'modelNo', label: 'Model No', type: 'text', required: true, defaultValue: 'CS_KRISHI_10L' },
            { name: 'serialNo', label: 'Serial No', type: 'text', required: true },
            { name: 'date', label: 'Date', type: 'date', required: true }
        ],
        sections: [
            {
                title: 'Payload Station Checks',
                fields: [
                    { name: 'obstacleAvoidance', label: 'Obstacle Avoidance mounting', type: 'select', options: ['YES', 'NO'] },
                    { name: 'groundRadar', label: 'Ground Radar mounting', type: 'select', options: ['YES', 'NO'] },
                    { name: 'pump', label: 'Pump mounting', type: 'select', options: ['YES', 'NO'] },
                    { name: 'flowmeter', label: 'Flowmeter direction', type: 'select', options: ['YES', 'NO'] },
                    { name: 'tank', label: 'Tank orientation', type: 'select', options: ['YES', 'NO'] },
                    { name: 'waterFlowTube', label: 'Water flow tube attachments', type: 'select', options: ['YES', 'NO'] },
                    { name: 'boltsCheck', label: '5 bolts tightening check', type: 'select', options: ['YES', 'NO'] }
                ]
            }
        ],
        footerFields: [
            { name: 'verifiedBy', label: 'Verified By', type: 'text' },
            { name: 'signature', label: 'Signature', type: 'text' }
        ]
    },

    // Stage 7: Calibration Station QA (Manufacturing Staff)
    {
        formName: 'QA - Calibration Station',
        formCode: 'QA_CALIBRATION',
        description: 'Quality assurance checklist for calibration',
        category: 'manufacturing',
        allowedRoles: ['admin', 'staff'],
        accessRoles: ['admin', 'manufacturing_staff'],
        workflowOrder: 7,
        prerequisiteForm: 'QA_PAYLOAD',
        expectedDuration: 32,
        requiresApproval: true,
        headerFields: [
            { name: 'modelNo', label: 'Model No', type: 'text', required: true, defaultValue: 'CS_KRISHI_10L' },
            { name: 'serialNo', label: 'Serial No', type: 'text', required: true },
            { name: 'date', label: 'Date', type: 'date', required: true }
        ],
        sections: [
            {
                title: 'Calibration Checks',
                fields: [
                    { name: 'accelerometerCal', label: 'Accelerometer calibration', type: 'select', options: ['YES', 'NO'] },
                    { name: 'compassCal', label: 'Compass calibration', type: 'select', options: ['YES', 'NO'] },
                    { name: 'radioBinding', label: 'Radio binding', type: 'select', options: ['YES', 'NO'] },
                    { name: 'escCal', label: 'ESC calibration', type: 'select', options: ['YES', 'NO'] },
                    { name: 'gpsSignal', label: 'GPS signal test', type: 'select', options: ['YES', 'NO'] }
                ]
            }
        ],
        footerFields: [
            { name: 'verifiedBy', label: 'Verified By', type: 'text' },
            { name: 'signature', label: 'Signature', type: 'text' }
        ]
    },

    // Stage 8: Activation & Pairing (GS)
    {
        formName: 'Activation & Pairing',
        formCode: 'ACTIVATION',
        description: 'Drone activation and pairing details',
        category: 'testing',
        allowedRoles: ['admin', 'staff'],
        accessRoles: ['admin', 'gs'],
        workflowOrder: 8,
        prerequisiteForm: 'QA_CALIBRATION',
        expectedDuration: 24,
        requiresApproval: false,
        headerFields: [
            { name: 'modelNo', label: 'Model No', type: 'text', required: true, defaultValue: 'CS_KRISHI_10L' },
            { name: 'serialNo', label: 'Serial No', type: 'text', required: true },
            { name: 'date', label: 'Date', type: 'date', required: true }
        ],
        sections: [
            {
                title: 'Activation Details',
                fields: [
                    { name: 'flightControllerNo', label: 'Flight Controller Number', type: 'text', required: true },
                    { name: 'gcsNumber', label: 'GCS Number', type: 'text', required: true },
                    { name: 'remoteId', label: 'Remote ID', type: 'text' },
                    { name: 'pairingStatus', label: 'Pairing Status', type: 'select', options: ['Success', 'Failed'], required: true }
                ]
            }
        ],
        footerFields: [
            { name: 'activatedBy', label: 'Activated By', type: 'text' },
            { name: 'date', label: 'Activation Date', type: 'date' }
        ]
    },

    // Stage 9: Flight Testing (GS + QI)
    {
        formName: 'Flight Testing Checklist',
        formCode: 'FLIGHT_TEST',
        description: 'Pre-flight and flight testing checklist',
        category: 'testing',
        allowedRoles: ['admin', 'staff', 'qi'],
        accessRoles: ['admin', 'gs', 'qi'],
        workflowOrder: 9,
        prerequisiteForm: 'ACTIVATION',
        expectedDuration: 24,
        requiresApproval: true,
        headerFields: [
            { name: 'modelNo', label: 'Model No', type: 'text', required: true, defaultValue: 'CS_KRISHI_10L' },
            { name: 'serialNo', label: 'Serial No', type: 'text', required: true },
            { name: 'date', label: 'Date', type: 'date', required: true },
            { name: 'pilotName', label: 'Pilot Name', type: 'text', required: true }
        ],
        sections: [
            {
                title: 'Pre-Flight Checks',
                fields: [
                    { name: 'batteryLevel', label: 'Battery level > 80%', type: 'select', options: ['YES', 'NO'] },
                    { name: 'propCheck', label: 'Propeller condition', type: 'select', options: ['YES', 'NO'] },
                    { name: 'gpsLock', label: 'GPS lock obtained', type: 'select', options: ['YES', 'NO'] },
                    { name: 'compassCheck', label: 'Compass calibrated', type: 'select', options: ['YES', 'NO'] }
                ]
            },
            {
                title: 'Flight Tests',
                fields: [
                    { name: 'hoverStability', label: 'Hover stability', type: 'select', options: ['PASS', 'FAIL'] },
                    { name: 'yawControl', label: 'Yaw control', type: 'select', options: ['PASS', 'FAIL'] },
                    { name: 'throttleResponse', label: 'Throttle response', type: 'select', options: ['PASS', 'FAIL'] },
                    { name: 'sprayTest', label: 'Spray system test', type: 'select', options: ['PASS', 'FAIL'] },
                    { name: 'rthTest', label: 'Return to home test', type: 'select', options: ['PASS', 'FAIL'] }
                ]
            }
        ],
        footerFields: [
            { name: 'testResult', label: 'Overall Result', type: 'select', options: ['PASS', 'FAIL'] },
            { name: 'testedBy', label: 'Tested By', type: 'text' },
            { name: 'qiSignature', label: 'QI Signature', type: 'text' }
        ]
    },

    // Stage 10: UIN Generation (GS)
    {
        formName: 'UIN Generation',
        formCode: 'UIN',
        description: 'Unique Identification Number generation',
        category: 'certificate',
        allowedRoles: ['admin', 'staff'],
        accessRoles: ['admin', 'gs'],
        workflowOrder: 10,
        prerequisiteForm: 'FLIGHT_TEST',
        expectedDuration: 24,
        requiresApproval: false,
        headerFields: [
            { name: 'modelNo', label: 'Model No', type: 'text', required: true, defaultValue: 'CS_KRISHI_10L' },
            { name: 'serialNo', label: 'Serial No', type: 'text', required: true },
            { name: 'date', label: 'Date', type: 'date', required: true }
        ],
        sections: [
            {
                title: 'UIN Details',
                fields: [
                    { name: 'uinNumber', label: 'UIN Number', type: 'text', required: true },
                    { name: 'issuedDate', label: 'Issued Date', type: 'date', required: true },
                    { name: 'ownerName', label: 'Owner Name', type: 'text', required: true },
                    { name: 'ownerAddress', label: 'Owner Address', type: 'textarea' }
                ]
            }
        ],
        footerFields: [
            { name: 'generatedBy', label: 'Generated By', type: 'text' }
        ]
    },

    // Stage 11: Packaging Checklist (QI only)
    {
        formName: 'Packaging Checklist',
        formCode: 'PACKAGING',
        description: 'Packaging quality checklist',
        category: 'packaging',
        allowedRoles: ['admin', 'qi'],
        accessRoles: ['admin', 'qi'],
        workflowOrder: 11,
        prerequisiteForm: 'UIN',
        expectedDuration: 16,
        requiresApproval: true,
        headerFields: [
            { name: 'modelNo', label: 'Model No', type: 'text', required: true, defaultValue: 'CS_KRISHI_10L' },
            { name: 'serialNo', label: 'Serial No', type: 'text', required: true },
            { name: 'date', label: 'Date', type: 'date', required: true }
        ],
        sections: [
            {
                title: 'Packaging Checks',
                fields: [
                    { name: 'droneCondition', label: 'Drone condition check', type: 'select', options: ['OK', 'NOT OK'] },
                    { name: 'accessoriesIncluded', label: 'All accessories included', type: 'select', options: ['YES', 'NO'] },
                    { name: 'manualIncluded', label: 'User manual included', type: 'select', options: ['YES', 'NO'] },
                    { name: 'batteryPackaged', label: 'Battery properly packaged', type: 'select', options: ['YES', 'NO'] },
                    { name: 'boxCondition', label: 'Box condition', type: 'select', options: ['OK', 'NOT OK'] }
                ]
            }
        ],
        footerFields: [
            { name: 'packedBy', label: 'Packed By', type: 'text' },
            { name: 'qiApproval', label: 'QI Approval', type: 'text' }
        ]
    },

    // Stage 12: Customer Profile (GS)
    {
        formName: 'Customer Profile',
        formCode: 'CUSTOMER_PROFILE',
        description: 'Customer profile generation form',
        category: 'dispatch',
        allowedRoles: ['admin', 'staff'],
        accessRoles: ['admin', 'gs'],
        workflowOrder: 12,
        prerequisiteForm: 'PACKAGING',
        expectedDuration: 8,
        requiresApproval: false,
        headerFields: [
            { name: 'droneSerialNo', label: 'Drone Serial No', type: 'text', required: true },
            { name: 'date', label: 'Date', type: 'date', required: true }
        ],
        sections: [
            {
                title: 'Customer Information',
                fields: [
                    { name: 'customerName', label: 'Customer Name', type: 'text', required: true },
                    { name: 'customerPhone', label: 'Phone', type: 'text', required: true },
                    { name: 'customerEmail', label: 'Email', type: 'text' },
                    { name: 'customerAddress', label: 'Address', type: 'textarea', required: true },
                    { name: 'gstNumber', label: 'GST Number', type: 'text' }
                ]
            }
        ],
        footerFields: [
            { name: 'preparedBy', label: 'Prepared By', type: 'text' }
        ]
    },

    // Stage 13: Dispatch Checklist (GS + QI)
    {
        formName: 'Dispatch Checklist',
        formCode: 'DISPATCH',
        description: 'Final dispatch verification checklist',
        category: 'dispatch',
        allowedRoles: ['admin', 'staff', 'qi'],
        accessRoles: ['admin', 'gs', 'qi'],
        workflowOrder: 13,
        prerequisiteForm: 'CUSTOMER_PROFILE',
        expectedDuration: 8,
        requiresApproval: true,
        headerFields: [
            { name: 'droneSerialNo', label: 'Drone Serial No', type: 'text', required: true },
            { name: 'orderNo', label: 'Order No', type: 'text', required: true },
            { name: 'date', label: 'Dispatch Date', type: 'date', required: true }
        ],
        sections: [
            {
                title: 'Dispatch Verification',
                fields: [
                    { name: 'allDocsReady', label: 'All documents ready', type: 'select', options: ['YES', 'NO'] },
                    { name: 'certificateReady', label: 'Certificate of conformity ready', type: 'select', options: ['YES', 'NO'] },
                    { name: 'invoiceGenerated', label: 'Invoice generated', type: 'select', options: ['YES', 'NO'] },
                    { name: 'packagingVerified', label: 'Packaging verified', type: 'select', options: ['YES', 'NO'] },
                    { name: 'courierBooked', label: 'Courier/transport booked', type: 'select', options: ['YES', 'NO'] }
                ]
            }
        ],
        footerFields: [
            { name: 'dispatchedBy', label: 'Dispatched By (GS)', type: 'text' },
            { name: 'verifiedBy', label: 'Verified By (QI)', type: 'text' }
        ]
    },

    // Stage 14: Certificate of Confirmation (GS - Auto-fill)
    {
        formName: 'Certificate of Confirmation',
        formCode: 'CERTIFICATE',
        description: 'Final certificate of confirmation - auto-filled from previous forms',
        category: 'certificate',
        allowedRoles: ['admin', 'staff'],
        accessRoles: ['admin', 'gs'],
        workflowOrder: 14,
        prerequisiteForm: 'DISPATCH',
        expectedDuration: 4,
        requiresApproval: true,
        headerFields: [
            { name: 'certificateNo', label: 'Certificate Number', type: 'text', required: true },
            { name: 'date', label: 'Date', type: 'date', required: true },
            { name: 'modelNo', label: 'Model No', type: 'text', required: true, defaultValue: 'CS_KRISHI_10L' },
            { name: 'serialNo', label: 'Serial No', type: 'text', required: true }
        ],
        sections: [
            {
                title: 'UAS Component Details',
                fields: [
                    { name: 'flightControllerNo', label: 'Flight Controller Number', type: 'text' },
                    { name: 'gcsNumber', label: 'GCS Number', type: 'text' },
                    { name: 'obstacleAvoidanceNo', label: 'Obstacle Avoidance Number', type: 'text' },
                    { name: 'groundRadarNo', label: 'Ground Radar Number', type: 'text' },
                    { name: 'gpsNumber', label: 'GPS Number', type: 'text' },
                    { name: 'uinNumber', label: 'UIN Number', type: 'text' }
                ]
            },
            {
                title: 'Confirmation',
                fields: [
                    { name: 'allTestsPassed', label: 'All tests passed', type: 'select', options: ['YES', 'NO'] },
                    { name: 'readyForDelivery', label: 'Ready for delivery', type: 'select', options: ['YES', 'NO'] }
                ]
            }
        ],
        footerFields: [
            { name: 'issuedBy', label: 'Issued By', type: 'text' },
            { name: 'authorizedSignature', label: 'Authorized Signature', type: 'text' }
        ]
    }
];

// Default admin user
const defaultAdmin = {
    name: 'Admin',
    email: 'admin@cerebrospark.com',
    password: 'admin123',
    role: 'admin',
    staffType: 'general',
    isActive: true
};

// Seed function
const seedDatabase = async () => {
    try {
        // Connect to MongoDB
        await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/cerebrospark');
        console.log('Connected to MongoDB');

        // Clear existing form schemas
        await FormSchema.deleteMany({});
        console.log('Cleared existing form schemas');

        // Insert form schemas
        const insertedForms = await FormSchema.insertMany(formSchemas);
        console.log(`Inserted ${insertedForms.length} form schemas`);

        // Check if admin exists
        const existingAdmin = await User.findOne({ email: defaultAdmin.email });
        if (!existingAdmin) {
            await User.create(defaultAdmin);
            console.log('\nCreated default admin user:');
            console.log('  Email: admin@cerebrospark.com');
            console.log('  Password: admin123');
        } else {
            console.log('\nAdmin user already exists');
        }

        console.log('\n✅ Database seeded successfully!');
        console.log('\nWorkflow Stages:');
        formSchemas.forEach((form, idx) => {
            console.log(`  ${idx + 1}. ${form.formName} (${form.formCode}) - Access: ${form.accessRoles.join(', ')}`);
        });

        process.exit(0);
    } catch (error) {
        console.error('Error seeding database:', error);
        process.exit(1);
    }
};

seedDatabase();
