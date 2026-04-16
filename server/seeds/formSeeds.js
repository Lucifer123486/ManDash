const mongoose = require('mongoose');
const FormSchema = require('../models/FormSchema');
const FormSubmission = require('../models/FormSubmission');
const Drone = require('../models/Drone');
const User = require('../models/User');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });

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
            { name: 'voucherNo', label: 'Voucher No.', type: 'text', required: true },
            { name: 'date', label: 'Dated', type: 'date', required: true },
            {
                name: 'modeOfPayment',
                label: 'Mode/Term of Payment',
                type: 'select',
                options: [
                    '50% Advance, 50% After delivery',
                    '10% advance, 90% after delivery',
                    'online',
                    'offline',
                    '100% advance',
                    '100% after delivery'
                ],
                required: true
            },
            { name: 'quotationNo', label: 'Quotation No. (From Supplier)', type: 'text', required: true }
        ],
        sections: [
            {
                title: 'Supplier Information',
                fields: [
                    {
                        name: 'supplierName',
                        label: 'Supplier (Bill From)',
                        type: 'select',
                        options: ['Tiltas Systems LLP', 'Aeromat creative Labs Pvt. Ltd.', 'Robu', 'Other'],
                        required: true
                    },
                    {
                        name: 'otherSupplierName',
                        label: 'Other Supplier Name',
                        type: 'text',
                        placeholder: 'Enter other supplier name',
                        required: false // Only required if 'Other' is selected (handled in UI)
                    }
                ]
            },
            {
                title: 'Material Quantities',
                fields: [
                    { name: 'qty_1', label: 'EFT-E610P AGRI FRAME (Qty)', type: 'number' },
                    { name: 'qty_2', label: '10L STDD TANK WITH PLATE (Qty)', type: 'number' },
                    { name: 'qty_3', label: 'EFT-VERTICAL SPRAY SYSTEM (Qty)', type: 'number' },
                    { name: 'qty_4', label: 'EFT-EXT VERTICAL NOZZLE (Qty)', type: 'number' },
                    { name: 'qty_5', label: 'HOBBYWING-5L PUMP (Qty)', type: 'number' },
                    { name: 'qty_6', label: 'X6 PLUS WITH PROP. CW (Qty)', type: 'number' },
                    { name: 'qty_7', label: 'X6 PLUS WITH PROP CCW (Qty)', type: 'number' },
                    { name: 'qty_8', label: 'JIYI-FLOW METER SENSOR (Qty)', type: 'number' },
                    { name: 'qty_9', label: 'SKYDROID-T12 TRANSMITTER (Qty)', type: 'number' },
                    { name: 'qty_10', label: 'TATTU 22000MAH BATTERY (Qty)', type: 'number' },
                    { name: 'qty_11', label: 'JIYI-GROUND RADAR (Qty)', type: 'number' },
                    { name: 'qty_12', label: 'JIYI-OBSTACLE SENSOR (Qty)', type: 'number' },
                    { name: 'qty_13', label: 'JIYI-CAN HUB SENSOR (Qty)', type: 'number' },
                    { name: 'qty_14', label: 'JIYI-K++ V2 FC (Qty)', type: 'number' },
                    { name: 'qty_15', label: 'UP1100 CHARGER (Qty)', type: 'number' },
                    { name: 'qty_16', label: 'EFT-GROUND RADAR SEAT (Qty)', type: 'number' },
                    { name: 'qty_17', label: 'EFT-OBSTACLE RADAR SEAT (Qty)', type: 'number' }
                ]
            }
        ],
        footerFields: [
            { name: 'preparedBy', label: 'Ordered By', type: 'text' },
            { name: 'approvedBy', label: 'Approved By', type: 'text' }
        ]
    },

    // Stage 1.5: Work Order Form (GS)
    {
        formName: 'Work Order',
        formCode: 'WORK_ORDER',
        description: 'Internal work order for drone manufacturing',
        category: 'material',
        allowedRoles: ['admin', 'staff'],
        accessRoles: ['admin', 'gs'],
        workflowOrder: 2,
        prerequisiteForm: 'PO',
        expectedDuration: 8,
        requiresApproval: false,
        headerFields: [
            { name: 'date', label: 'Date', type: 'date', required: true },
            { name: 'workOrderNo', label: 'Work Order No.', type: 'text', required: true }
        ],
        sections: [
            {
                title: 'Client Details',
                fields: [
                    { name: 'clientName', label: '1. Name of Client', type: 'text', required: true }
                ]
            },
            {
                title: 'Product Details',
                fields: [
                    { name: 'modelName', label: '1. Model Name', type: 'text', defaultValue: 'CS_KRISHI_10L', required: true },
                    { name: 'quantity', label: '2. Quantity', type: 'number', required: true },
                    { name: 'typeOfNozzle', label: '3. Type of Nozzle', type: 'text', required: true },
                    { name: 'accessories', label: '4. Accessories', type: 'text' }
                ]
            }
        ],
        footerFields: [
            { name: 'salesManager', label: 'Sales manager', type: 'text' },
            { name: 'planningManager', label: 'Planning Manager', type: 'text' },
            { name: 'remark', label: 'Remark', type: 'text', defaultValue: 'To Production Manager' }
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
        workflowOrder: 3,
        prerequisiteForm: 'WORK_ORDER',
        expectedDuration: 24, // 1 day
        requiresApproval: true,
        headerFields: [
            { name: 'date', label: 'Date', type: 'date', required: true },
            { name: 'materialOrderNo', label: 'A. Material Order No.', type: 'text', required: true },
            { name: 'workOrderNo', label: 'B. Work Order No.', type: 'text', required: true },
            { name: 'droneSeriesNo', label: 'C. Drone series No.', type: 'text', required: true },
            { name: 'typeOfRequisition', label: 'D. Type of Requisition', type: 'select', options: ['NEW', 'Maintenance', 'Onfield Maintenance', 'Spare'], required: true }
        ],
        sections: [
            {
                title: 'Item 1',
                fields: [
                    { name: 'particular_1', label: 'Particular', type: 'text' },
                    { name: 'partNo_1', label: 'Part No.', type: 'text' },
                    { name: 'partCode_1', label: 'Part Code', type: 'text' },
                    { name: 'qty_1', label: 'QTY', type: 'number' },
                    { name: 'department_1', label: 'Department', type: 'select', options: ['Soldering', 'Mechanical', 'Payload', 'Electrical', 'Callibration', 'Maintenance', 'Spare'] },
                    { name: 'remark_1', label: 'Remark', type: 'text' }
                ]
            },
            {
                title: 'Item 2',
                fields: [
                    { name: 'particular_2', label: 'Particular', type: 'text' },
                    { name: 'partNo_2', label: 'Part No.', type: 'text' },
                    { name: 'partCode_2', label: 'Part Code', type: 'text' },
                    { name: 'qty_2', label: 'QTY', type: 'number' },
                    { name: 'department_2', label: 'Department', type: 'select', options: ['Soldering', 'Mechanical', 'Payload', 'Electrical', 'Callibration', 'Maintenance', 'Spare'] },
                    { name: 'remark_2', label: 'Remark', type: 'text' }
                ]
            },
            {
                title: 'Item 3',
                fields: [
                    { name: 'particular_3', label: 'Particular', type: 'text' },
                    { name: 'partNo_3', label: 'Part No.', type: 'text' },
                    { name: 'partCode_3', label: 'Part Code', type: 'text' },
                    { name: 'qty_3', label: 'QTY', type: 'number' },
                    { name: 'department_3', label: 'Department', type: 'select', options: ['Soldering', 'Mechanical', 'Payload', 'Electrical', 'Callibration', 'Maintenance', 'Spare'] },
                    { name: 'remark_3', label: 'Remark', type: 'text' }
                ]
            },
            {
                title: 'Item 4',
                fields: [
                    { name: 'particular_4', label: 'Particular', type: 'text' },
                    { name: 'partNo_4', label: 'Part No.', type: 'text' },
                    { name: 'partCode_4', label: 'Part Code', type: 'text' },
                    { name: 'qty_4', label: 'QTY', type: 'number' },
                    { name: 'department_4', label: 'Department', type: 'select', options: ['Soldering', 'Mechanical', 'Payload', 'Electrical', 'Callibration', 'Maintenance', 'Spare'] },
                    { name: 'remark_4', label: 'Remark', type: 'text' }
                ]
            },
            {
                title: 'Item 5',
                fields: [
                    { name: 'particular_5', label: 'Particular', type: 'text' },
                    { name: 'partNo_5', label: 'Part No.', type: 'text' },
                    { name: 'partCode_5', label: 'Part Code', type: 'text' },
                    { name: 'qty_5', label: 'QTY', type: 'number' },
                    { name: 'department_5', label: 'Department', type: 'select', options: ['Soldering', 'Mechanical', 'Payload', 'Electrical', 'Callibration', 'Maintenance', 'Spare'] },
                    { name: 'remark_5', label: 'Remark', type: 'text' }
                ]
            },
            {
                title: 'Item 6',
                fields: [
                    { name: 'particular_6', label: 'Particular', type: 'text' },
                    { name: 'partNo_6', label: 'Part No.', type: 'text' },
                    { name: 'partCode_6', label: 'Part Code', type: 'text' },
                    { name: 'qty_6', label: 'QTY', type: 'number' },
                    { name: 'department_6', label: 'Department', type: 'select', options: ['Soldering', 'Mechanical', 'Payload', 'Electrical', 'Callibration', 'Maintenance', 'Spare'] },
                    { name: 'remark_6', label: 'Remark', type: 'text' }
                ]
            },
            {
                title: 'Item 7',
                fields: [
                    { name: 'particular_7', label: 'Particular', type: 'text' },
                    { name: 'partNo_7', label: 'Part No.', type: 'text' },
                    { name: 'partCode_7', label: 'Part Code', type: 'text' },
                    { name: 'qty_7', label: 'QTY', type: 'number' },
                    { name: 'department_7', label: 'Department', type: 'select', options: ['Soldering', 'Mechanical', 'Payload', 'Electrical', 'Callibration', 'Maintenance', 'Spare'] },
                    { name: 'remark_7', label: 'Remark', type: 'text' }
                ]
            },
            {
                title: 'Item 8',
                fields: [
                    { name: 'particular_8', label: 'Particular', type: 'text' },
                    { name: 'partNo_8', label: 'Part No.', type: 'text' },
                    { name: 'partCode_8', label: 'Part Code', type: 'text' },
                    { name: 'qty_8', label: 'QTY', type: 'number' },
                    { name: 'department_8', label: 'Department', type: 'select', options: ['Soldering', 'Mechanical', 'Payload', 'Electrical', 'Callibration', 'Maintenance', 'Spare'] },
                    { name: 'remark_8', label: 'Remark', type: 'text' }
                ]
            },
            {
                title: 'Item 9',
                fields: [
                    { name: 'particular_9', label: 'Particular', type: 'text' },
                    { name: 'partNo_9', label: 'Part No.', type: 'text' },
                    { name: 'partCode_9', label: 'Part Code', type: 'text' },
                    { name: 'qty_9', label: 'QTY', type: 'number' },
                    { name: 'department_9', label: 'Department', type: 'select', options: ['Soldering', 'Mechanical', 'Payload', 'Electrical', 'Callibration', 'Maintenance', 'Spare'] },
                    { name: 'remark_9', label: 'Remark', type: 'text' }
                ]
            },
            {
                title: 'Item 10',
                fields: [
                    { name: 'particular_10', label: 'Particular', type: 'text' },
                    { name: 'partNo_10', label: 'Part No.', type: 'text' },
                    { name: 'partCode_10', label: 'Part Code', type: 'text' },
                    { name: 'qty_10', label: 'QTY', type: 'number' },
                    { name: 'department_10', label: 'Department', type: 'select', options: ['Soldering', 'Mechanical', 'Payload', 'Electrical', 'Callibration', 'Maintenance', 'Spare'] },
                    { name: 'remark_10', label: 'Remark', type: 'text' }
                ]
            },
            {
                title: 'Item 11',
                fields: [
                    { name: 'particular_11', label: 'Particular', type: 'text' },
                    { name: 'partNo_11', label: 'Part No.', type: 'text' },
                    { name: 'partCode_11', label: 'Part Code', type: 'text' },
                    { name: 'qty_11', label: 'QTY', type: 'number' },
                    { name: 'department_11', label: 'Department', type: 'select', options: ['Soldering', 'Mechanical', 'Payload', 'Electrical', 'Callibration', 'Maintenance', 'Spare'] },
                    { name: 'remark_11', label: 'Remark', type: 'text' }
                ]
            },
            {
                title: 'Item 12',
                fields: [
                    { name: 'particular_12', label: 'Particular', type: 'text' },
                    { name: 'partNo_12', label: 'Part No.', type: 'text' },
                    { name: 'partCode_12', label: 'Part Code', type: 'text' },
                    { name: 'qty_12', label: 'QTY', type: 'number' },
                    { name: 'department_12', label: 'Department', type: 'select', options: ['Soldering', 'Mechanical', 'Payload', 'Electrical', 'Callibration', 'Maintenance', 'Spare'] },
                    { name: 'remark_12', label: 'Remark', type: 'text' }
                ]
            },
            {
                title: 'Item 13',
                fields: [
                    { name: 'particular_13', label: 'Particular', type: 'text' },
                    { name: 'partNo_13', label: 'Part No.', type: 'text' },
                    { name: 'partCode_13', label: 'Part Code', type: 'text' },
                    { name: 'qty_13', label: 'QTY', type: 'number' },
                    { name: 'department_13', label: 'Department', type: 'select', options: ['Soldering', 'Mechanical', 'Payload', 'Electrical', 'Callibration', 'Maintenance', 'Spare'] },
                    { name: 'remark_13', label: 'Remark', type: 'text' }
                ]
            },
            {
                title: 'Item 14',
                fields: [
                    { name: 'particular_14', label: 'Particular', type: 'text' },
                    { name: 'partNo_14', label: 'Part No.', type: 'text' },
                    { name: 'partCode_14', label: 'Part Code', type: 'text' },
                    { name: 'qty_14', label: 'QTY', type: 'number' },
                    { name: 'department_14', label: 'Department', type: 'select', options: ['Soldering', 'Mechanical', 'Payload', 'Electrical', 'Callibration', 'Maintenance', 'Spare'] },
                    { name: 'remark_14', label: 'Remark', type: 'text' }
                ]
            },
            {
                title: 'Item 15',
                fields: [
                    { name: 'particular_15', label: 'Particular', type: 'text' },
                    { name: 'partNo_15', label: 'Part No.', type: 'text' },
                    { name: 'partCode_15', label: 'Part Code', type: 'text' },
                    { name: 'qty_15', label: 'QTY', type: 'number' },
                    { name: 'department_15', label: 'Department', type: 'select', options: ['Soldering', 'Mechanical', 'Payload', 'Electrical', 'Callibration', 'Maintenance', 'Spare'] },
                    { name: 'remark_15', label: 'Remark', type: 'text' }
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
        formName: 'Quality Assurance Procedure for Soldering Station',
        formCode: 'QA_SOLDERING',
        description: 'Quality assurance checklist for soldering station',
        category: 'manufacturing',
        allowedRoles: ['admin', 'staff'],
        accessRoles: ['admin', 'manufacturing_staff'],
        workflowOrder: 4,
        prerequisiteForm: 'MRF',
        expectedDuration: 32, // ~1.3 days
        requiresApproval: true,
        headerFields: [
            { name: 'modelNo', label: 'Model No', type: 'text', required: true, defaultValue: 'CS_KRISHI_10L' },
            { name: 'versionNo', label: 'Version No', type: 'text', required: true, defaultValue: '1' },
            { name: 'date', label: 'Date', type: 'date', required: true },
            { name: 'serialNo', label: 'Serial No', type: 'text', required: true, defaultValue: 'CSKRISHI' },
            { name: 'issueDate', label: 'Issue Date', type: 'text', required: true, defaultValue: '04/03/2023' },
            { name: 'issueNo', label: 'Issue No', type: 'text', required: true }
        ],
        sections: [
            {
                title: 'Motor Checks',
                fields: [
                    { name: 'motor1', label: '1. Check solder connection of motor and XT60 connectors - Motor 1', type: 'select', options: ['YES', 'NO'] },
                    { name: 'motor2', label: '1. Check solder connection of motor and XT60 connectors - Motor 2', type: 'select', options: ['YES', 'NO'] },
                    { name: 'motor3', label: '1. Check solder connection of motor and XT60 connectors - Motor 3', type: 'select', options: ['YES', 'NO'] },
                    { name: 'motor4', label: '1. Check solder connection of motor and XT60 connectors - Motor 4', type: 'select', options: ['YES', 'NO'] },
                    { name: 'motor5', label: '1. Check solder connection of motor and XT60 connectors - Motor 5', type: 'select', options: ['YES', 'NO'] },
                    { name: 'motor6', label: '1. Check solder connection of motor and XT60 connectors - Motor 6', type: 'select', options: ['YES', 'NO'] }
                ]
            },
            {
                title: 'Component Checks',
                fields: [
                    { name: 'pmuCheck', label: '2. Check solder connection of PMU and XT60 connector', type: 'select', options: ['YES', 'NO'] },
                    { name: 'canHubCheck', label: '3. Check solder connection of CAN HUB and XT60 connector', type: 'select', options: ['YES', 'NO'] },
                    { name: 'cameraCheck', label: '4. Check solder connection of Camera and XT60 connector', type: 'select', options: ['YES', 'NO'] },
                    { name: 'pumpCheck', label: '5. Check solder connection of Pump and XT60 connector', type: 'select', options: ['YES', 'NO'] }
                ]
            },
            {
                title: 'Nozzle Checks',
                fields: [
                    { name: 'nozzle1', label: '6. Check solder connection of Centrifugal Nozzle and XT60 connector - Nozzle 1', type: 'select', options: ['YES', 'NO'] },
                    { name: 'nozzle2', label: '6. Check solder connection of Centrifugal Nozzle and XT60 connector - Nozzle 2', type: 'select', options: ['YES', 'NO'] }
                ]
            },
            {
                title: 'Other Checks',
                fields: [
                    { name: 'wireMesh', label: '7. Check the wire mesh is properly installed', type: 'select', options: ['YES', 'NO'] }
                ]
            }
        ],
        footerFields: [
            { name: 'verifiedBy', label: 'Verified By', type: 'text' },
            { name: 'name', label: 'Name', type: 'text' },
            { name: 'signature', label: 'Signature', type: 'text' },
            { name: 'stamp', label: 'Stamp', type: 'text' }
        ]
    },

    // Stage 4: Mechanical Station QA (Manufacturing Staff)
    {
        formName: 'Quality Assurance Procedure for Mechanical Assembly Station',
        formCode: 'QA_MECHANICAL',
        description: 'Quality assurance checklist for mechanical assembly',
        category: 'manufacturing',
        allowedRoles: ['admin', 'staff'],
        accessRoles: ['admin', 'manufacturing_staff'],
        workflowOrder: 5,
        prerequisiteForm: 'QA_SOLDERING',
        requiresApproval: true,
        headerFields: [
            { name: 'modelNo', label: 'Model No', type: 'text', required: true, defaultValue: 'CS_KRISHI_10L' },
            { name: 'versionNo', label: 'Version No', type: 'text', required: true, defaultValue: '1' },
            { name: 'date', label: 'Date', type: 'date', required: true },
            { name: 'serialNo', label: 'Serial No', type: 'text', required: true, defaultValue: 'CSKRISHI' },
            { name: 'issueDate', label: 'Issue Date', type: 'text', required: true, defaultValue: '04/03/2023' },
            { name: 'issueNo', label: 'Issue No', type: 'text', required: true }
        ],
        sections: [
            {
                title: 'Mechanical Assembly Checks',
                fields: [
                    { name: 'armOrientation', label: '1. Check the folding orientation of arm (Clockwise)', type: 'select', options: ['YES', 'NO'] },
                    { name: 'motorOrientation', label: '2. Check the motor orientation', type: 'select', options: ['YES', 'NO'] },
                    { name: 'boltsCheck', label: '3. Randomly check any 5 bolts tightening with calibrated torque wrench', type: 'select', options: ['YES', 'NO'] },
                    { name: 'powerCordPolarity', label: '4. Check the Power cord polarity (Backside positive and Front negative)', type: 'select', options: ['YES', 'NO'] },
                    { name: 'powerCordBolts', label: '5. Check whether power cord bolts are tight or not', type: 'select', options: ['YES', 'NO'] },
                    { name: 'hubBolts', label: '6. Check if all bolts are inserted in hub to arm from top and bottom', type: 'select', options: ['YES', 'NO'] },
                    { name: 'landingGearJoint', label: '7. Check if landing gear joint is attached properly to hub', type: 'select', options: ['YES', 'NO'] },
                    { name: 'verticalLandingGear', label: '8. Check vertical landing gear is attached firmly to landing gear', type: 'select', options: ['YES', 'NO'] },
                    { name: 'horizontalLandingGear', label: '9. Check Horizontal landing gear are firmly attached', type: 'select', options: ['YES', 'NO'] },
                    { name: 'motorNumber1', label: '10. Check if motor number is correct on respective arm - Motor number 1', type: 'select', options: ['YES', 'NO'] },
                    { name: 'motorNumber2', label: '10. Check if motor number is correct on respective arm - Motor number 2', type: 'select', options: ['YES', 'NO'] },
                    { name: 'motorNumber3', label: '10. Check if motor number is correct on respective arm - Motor number 3', type: 'select', options: ['YES', 'NO'] },
                    { name: 'motorNumber4', label: '10. Check if motor number is correct on respective arm - Motor number 4', type: 'select', options: ['YES', 'NO'] },
                    { name: 'motorNumber5', label: '10. Check if motor number is correct on respective arm - Motor number 5', type: 'select', options: ['YES', 'NO'] },
                    { name: 'motorNumber6', label: '10. Check if motor number is correct on respective arm - Motor number 6', type: 'select', options: ['YES', 'NO'] }
                ]
            }
        ],
        footerFields: [
            { name: 'verifiedBy', label: 'Verified By', type: 'text' },
            { name: 'name', label: 'Name', type: 'text' },
            { name: 'signature', label: 'Signature', type: 'text' },
            { name: 'stamp', label: 'Stamp', type: 'text' }
        ]
    },

    // Stage 5: Electronic Station QA (Manufacturing Staff)
    {
        formName: 'Quality Assurance Procedure for Electronic Assembly Station',
        formCode: 'QA_ELECTRONIC',
        description: 'Quality assurance checklist for electronic assembly',
        category: 'manufacturing',
        allowedRoles: ['admin', 'staff'],
        accessRoles: ['admin', 'manufacturing_staff'],
        workflowOrder: 6,
        prerequisiteForm: 'QA_MECHANICAL',
        requiresApproval: true,
        headerFields: [
            { name: 'modelNo', label: 'Model No', type: 'text', required: true, defaultValue: 'CS_KRISHI_10L' },
            { name: 'versionNo', label: 'Version No', type: 'text', required: true, defaultValue: '1' },
            { name: 'date', label: 'Date', type: 'date', required: true },
            { name: 'serialNo', label: 'Serial No', type: 'text', required: true, defaultValue: 'CSKRISHI' },
            { name: 'issueDate', label: 'Issue Date', type: 'text', required: true, defaultValue: '04/03/2023' },
            { name: 'issueNo', label: 'Issue No', type: 'text', required: true }
        ],
        sections: [
            {
                title: 'Electronic Assembly Checks',
                fields: [
                    { name: 'fcPosition', label: '1.1 Check the position of components: Flight controller', type: 'select', options: ['YES', 'NO'] },
                    { name: 'pmuPosition', label: '1.2 Check the position of components: PMU', type: 'select', options: ['YES', 'NO'] },
                    { name: 'canhubPosition', label: '1.3 Check the position of components: CANHUB', type: 'select', options: ['YES', 'NO'] },
                    { name: 'receiverPosition', label: '1.4 Check the position of components: Receiver', type: 'select', options: ['YES', 'NO'] },
                    { name: 'pdbPosition', label: '1.5 Check the position of components: PDB', type: 'select', options: ['YES', 'NO'] },
                    { name: 'motorConnections', label: '2. Check the motor connections to flight controller', type: 'select', options: ['YES', 'NO'] },
                    { name: 'cameraCheck', label: '3. Check the camera direction, position and connection.', type: 'select', options: ['YES', 'NO'] },
                    { name: 'gpsDirection', label: '4. Check the direction of GPS', type: 'select', options: ['YES', 'NO'] },
                    { name: 'antennaPosition', label: '5. Check the position of antenna', type: 'select', options: ['YES', 'NO'] },
                    { name: 'fcConnections', label: '6. Check the connections of flight controller', type: 'select', options: ['YES', 'NO'] },
                    { name: 'electronicsTape', label: '7. Check if all electronics are stuck properly to plate using 3M tape', type: 'select', options: ['YES', 'NO'] },
                    { name: 'motorNumber1', label: '8. Check if all motor number is correctly installed - Motor number 1', type: 'select', options: ['YES', 'NO'] },
                    { name: 'motorNumber2', label: '8. Check if all motor number is correctly installed - Motor number 2', type: 'select', options: ['YES', 'NO'] },
                    { name: 'motorNumber3', label: '8. Check if all motor number is correctly installed - Motor number 3', type: 'select', options: ['YES', 'NO'] },
                    { name: 'motorNumber4', label: '8. Check if all motor number is correctly installed - Motor number 4', type: 'select', options: ['YES', 'NO'] },
                    { name: 'motorNumber5', label: '8. Check if all motor number is correctly installed - Motor number 5', type: 'select', options: ['YES', 'NO'] },
                    { name: 'motorNumber6', label: '8. Check if all motor number is correctly installed - Motor number 6', type: 'select', options: ['YES', 'NO'] }
                ]
            }
        ],
        footerFields: [
            { name: 'verifiedBy', label: 'Verified By', type: 'text' },
            { name: 'name', label: 'Name', type: 'text' },
            { name: 'signature', label: 'Signature', type: 'text' },
            { name: 'stamp', label: 'Stamp', type: 'text' }
        ]
    },

    // Stage 6: Payload Station QA (Manufacturing Staff)
    {
        formName: 'Quality Assurance Procedure for Payload Station',
        formCode: 'QA_PAYLOAD',
        description: 'Quality assurance checklist for payload station',
        category: 'manufacturing',
        allowedRoles: ['admin', 'staff'],
        accessRoles: ['admin', 'manufacturing_staff'],
        workflowOrder: 7,
        prerequisiteForm: 'QA_ELECTRONIC',
        requiresApproval: true,
        headerFields: [
            { name: 'modelNo', label: 'Model No', type: 'text', required: true, defaultValue: 'CS_KRISHI_10L' },
            { name: 'versionNo', label: 'Version No', type: 'text', required: true, defaultValue: '1' },
            { name: 'date', label: 'Date', type: 'date', required: true },
            { name: 'serialNo', label: 'Serial No', type: 'text', required: true, defaultValue: 'CSKRISHI' },
            { name: 'issueDate', label: 'Issue Date', type: 'text', required: true, defaultValue: '04/03/2023' },
            { name: 'issueNo', label: 'Issue No', type: 'text', required: true }
        ],
        sections: [
            {
                title: 'Payload Station Checks',
                fields: [
                    { name: 'obstacleAvoidance', label: '1. Check the mounting of Obstacle Avoidance', type: 'select', options: ['YES', 'NO'] },
                    { name: 'groundRadar', label: '2. Check the mounting of Ground Radar', type: 'select', options: ['YES', 'NO'] },
                    { name: 'pumpMounting', label: '3. Check the mounting of Pump', type: 'select', options: ['YES', 'NO'] },
                    { name: 'flowmeterDirection', label: '4. Check the direction of flowmeter', type: 'select', options: ['YES', 'NO'] },
                    { name: 'tankOrientation', label: '5. Check the orientation of tank. (Cap should be in front)', type: 'select', options: ['YES', 'NO'] },
                    { name: 'waterFlowTube', label: '6. Check attachments of water flow tube', type: 'select', options: ['YES', 'NO'] },
                    { name: 'boltsCheck', label: '7. Randomly check any 5 bolts tightening with calibrated torque wrench', type: 'select', options: ['YES', 'NO'] }
                ]
            }
        ],
        footerFields: [
            { name: 'verifiedBy', label: 'Verified By', type: 'text' },
            { name: 'name', label: 'Name', type: 'text' },
            { name: 'signature', label: 'Signature', type: 'text' },
            { name: 'stamp', label: 'Stamp', type: 'text' }
        ]
    },

    // Stage 7: Calibration Station QA (Manufacturing Staff)
    {
        formName: 'Quality Assurance Procedure for Calibration Station',
        formCode: 'QA_CALIBRATION',
        description: 'Quality assurance checklist for calibration station',
        category: 'manufacturing',
        allowedRoles: ['admin', 'staff'],
        accessRoles: ['admin', 'manufacturing_staff'],
        workflowOrder: 8,
        prerequisiteForm: 'QA_PAYLOAD',
        requiresApproval: true,
        headerFields: [
            { name: 'modelNo', label: 'Model No', type: 'text', required: true, defaultValue: 'CS_KRISHI_10L' },
            { name: 'versionNo', label: 'Version No', type: 'text', required: true, defaultValue: '1' },
            { name: 'date', label: 'Date', type: 'date', required: true },
            { name: 'serialNo', label: 'Serial No', type: 'text', required: true, defaultValue: 'CSKRISHI' },
            { name: 'issueDate', label: 'Issue Date', type: 'text', required: true, defaultValue: '04/03/2023' },
            { name: 'issueNo', label: 'Issue No', type: 'text', required: true }
        ],
        sections: [
            {
                title: 'Calibration Station Checks',
                fields: [
                    { name: 'rcCalibration', label: 'RC calibration', type: 'select', options: ['YES', 'NO'] },
                    { name: 'lowVoltageProtection', label: 'Low voltage protection: Return to Home', type: 'select', options: ['YES', 'NO'] },
                    { name: 'lowVoltageAlarm', label: 'Low voltage alarm: 1st level – 42 V, 2nd level – 41 V', type: 'select', options: ['YES', 'NO'] },
                    { name: 'pmuCalibration', label: 'PMU calibration', type: 'select', options: ['YES', 'NO'] },
                    { name: 'liquidProtection', label: 'Liquid protection: Return to Home', type: 'select', options: ['YES', 'NO'] },
                    { name: 'liquidType', label: 'Liquid Type: Single', type: 'select', options: ['YES', 'NO'] },
                    { name: 'levelType', label: 'Level type: None', type: 'select', options: ['YES', 'NO'] },
                    { name: 'maxSpeedGPS', label: 'Max speed in GPS mode: 8 m/s', type: 'select', options: ['YES', 'NO'] },
                    { name: 'maxAngle', label: 'Max angle: 20°', type: 'select', options: ['YES', 'NO'] },
                    { name: 'backAltitude', label: 'Back altitude: 20 m', type: 'select', options: ['YES', 'NO'] },
                    { name: 'sprayWidth', label: 'Spray width: 3.5 m', type: 'select', options: ['YES', 'NO'] },
                    { name: 'routeSpeed', label: 'Route speed: 8m/s', type: 'select', options: ['YES', 'NO'] },
                    { name: 'workEndAction', label: 'Work end action: Return to Home', type: 'select', options: ['YES', 'NO'] },
                    { name: 'obstacleAvoidance', label: 'Obstacle avoidance: Sensitivity – 25, Action: Hang, Safe distance: 10 m, Help distance: 6 m', type: 'select', options: ['YES', 'NO'] },
                    { name: 'maxRisingSpeed', label: 'Maximum rising speed: 3 m', type: 'select', options: ['YES', 'NO'] },
                    { name: 'maxDescendingSpeed', label: 'Maximum descending speed: 1 m', type: 'select', options: ['YES', 'NO'] },
                    { name: 'landSpeed', label: 'Land speed: 0.50 m', type: 'select', options: ['YES', 'NO'] },
                    { name: 'maxAltitude', label: 'Maximum altitude: 60 m', type: 'select', options: ['YES', 'NO'] },
                    { name: 'maxDistance', label: 'Maximum Distance: 1000 m', type: 'select', options: ['YES', 'NO'] },
                    { name: 'mapType', label: 'Map type: Google map', type: 'select', options: ['YES', 'NO'] },
                    { name: 'remoteT12', label: 'Remote: T12', type: 'select', options: ['YES', 'NO'] },
                    { name: 'voicePrompt', label: 'Voice prompt: on', type: 'select', options: ['YES', 'NO'] },
                    { name: 'canopyFixation', label: 'Check the canopy fixation and tightening.', type: 'select', options: ['YES', 'NO'] },
                    { name: 'compareCodes', label: 'Compare Hash code and data code', type: 'select', options: ['YES', 'NO'] }
                ]
            }
        ],
        footerFields: [
            { name: 'verifiedBy', label: 'Verified By', type: 'text' },
            { name: 'name', label: 'Name', type: 'text' },
            { name: 'signature', label: 'Signature', type: 'text' },
            { name: 'stamp', label: 'Stamp', type: 'text' }
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
        workflowOrder: 9,
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
                    { name: 'obstacleAvoidanceNo', label: 'Obstacle Avoidance Number', type: 'text' },
                    { name: 'groundRadarNo', label: 'Ground Radar Number', type: 'text' },
                    { name: 'gpsNumber', label: 'GPS Number', type: 'text' },
                    { name: 'remoteId', label: 'Remote ID', type: 'text' },
                    { name: 'pairingStatus', label: 'Pairing Status', type: 'select', options: ['Verified', 'Not Verified'], required: true }
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
        formName: 'ONGROUND FLIGHT TEST CHECKLIST',
        formCode: 'FLIGHT_TEST',
        description: 'Pre-flight and flight testing checklist',
        category: 'testing',
        allowedRoles: ['admin', 'staff', 'qi'],
        accessRoles: ['admin', 'gs', 'qi'],
        workflowOrder: 10,
        prerequisiteForm: 'ACTIVATION',
        expectedDuration: 24,
        requiresApproval: true,
        headerFields: [
            { name: 'modelNo', label: 'Model No', type: 'text', required: true, defaultValue: 'CS_KRISHI_10L' },
            { name: 'versionNo', label: 'Version No', type: 'text', required: true, defaultValue: '1' },
            { name: 'date', label: 'Date', type: 'date', required: true },
            { name: 'serialNo', label: 'Serial No', type: 'text', required: true, defaultValue: 'CSKRISHI' },
            { name: 'issueDate', label: 'Issue Date', type: 'text', required: true, defaultValue: '04/03/2023' },
            { name: 'time', label: 'Time', type: 'text', required: true },
            { name: 'issueNo', label: 'Issue No', type: 'text', required: true }
        ],
        sections: [
            {
                title: 'Ground Checks',
                fields: [
                    { name: 'compassCalibration', label: 'Compass Calibration', type: 'select', options: ['YES', 'NO'] },
                    { name: 'accelerometerCalibration', label: 'Accelerometer Calibration', type: 'select', options: ['YES', 'NO'] },
                    { name: 'flowmeterCalibration', label: 'Flowmeter Calibration', type: 'select', options: ['YES', 'NO'] },
                    { name: 'gpsSatelliteCount', label: 'GPS Satellite Count', type: 'select', options: ['YES', 'NO'] },
                    { name: 'throttle', label: 'Throttle', type: 'select', options: ['YES', 'NO'] },
                    { name: 'pitch', label: 'Pitch', type: 'select', options: ['YES', 'NO'] },
                    { name: 'roll', label: 'Roll', type: 'select', options: ['YES', 'NO'] },
                    { name: 'yaw', label: 'Yaw', type: 'select', options: ['YES', 'NO'] },
                    { name: 'camera', label: 'Camera', type: 'select', options: ['YES', 'NO'] },
                    { name: 'obstacleAvoidance', label: 'Obstacle Avoidance', type: 'select', options: ['YES', 'NO'] },
                    { name: 'groundRadar', label: 'Ground Radar', type: 'select', options: ['YES', 'NO'] },
                    { name: 'pumpOperation', label: 'Pump Operation', type: 'select', options: ['YES', 'NO'] },
                    { name: 'flowmeterOperation', label: 'Flowmeter Operation', type: 'select', options: ['YES', 'NO'] },
                    { name: 'nozzlesOperation', label: 'Nozzles Operation', type: 'select', options: ['YES', 'NO'] },
                    { name: 'tankOperation', label: 'Tank Operation', type: 'select', options: ['YES', 'NO'] },
                    { name: 'batteryFailsafe', label: 'Battery Failsafe', type: 'select', options: ['YES', 'NO'] }
                ]
            }
        ],
        footerFields: [
            { name: 'pilotName', label: 'Pilot Name', type: 'text' },
            { name: 'signature', label: 'Signature', type: 'text' }
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
        workflowOrder: 11,
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

    // Stage 10a: D2 Form upload
    {
        formName: 'D2 Form',
        formCode: 'D2_FORM',
        description: 'D2 Form document upload (PDF or image)',
        category: 'certificate',
        allowedRoles: ['admin', 'staff'],
        accessRoles: ['admin', 'gs'],
        workflowOrder: 11.1,
        prerequisiteForm: 'UIN',
        expectedDuration: 4,
        requiresApproval: false,
        headerFields: [],
        sections: [],
        footerFields: []
    },

    // Stage 10b: UIN Photo
    {
        formName: 'UIN Photo',
        formCode: 'UIN_PHOTO',
        description: 'UIN Photo — click or upload a photo of the UIN',
        category: 'certificate',
        allowedRoles: ['admin', 'staff'],
        accessRoles: ['admin', 'gs'],
        workflowOrder: 11.2,
        prerequisiteForm: 'D2_FORM',
        expectedDuration: 4,
        requiresApproval: false,
        headerFields: [],
        sections: [],
        footerFields: []
    },

    // Stage 10c: D3 Form upload
    {
        formName: 'D3 Form',
        formCode: 'D3_FORM',
        description: 'D3 Form document upload (PDF or image)',
        category: 'certificate',
        allowedRoles: ['admin', 'staff'],
        accessRoles: ['admin', 'gs'],
        workflowOrder: 11.3,
        prerequisiteForm: 'UIN_PHOTO',
        expectedDuration: 4,
        requiresApproval: false,
        headerFields: [],
        sections: [],
        footerFields: []
    },

    // Stage 11: Packaging Checklist (QI only)
    {
        formName: 'PACKAGING CHECKLIST FOR DRONE',
        formCode: 'PACKAGING',
        description: 'Packaging quality checklist',
        category: 'packaging',
        allowedRoles: ['admin', 'qi'],
        accessRoles: ['admin', 'qi'],
        workflowOrder: 12,
        prerequisiteForm: 'D3_FORM',
        expectedDuration: 16,
        requiresApproval: true,
        headerFields: [
            { name: 'modelNo', label: 'Model No', type: 'text', required: true, defaultValue: 'CS_KRISHI_10L' },
            { name: 'versionNo', label: 'Version No', type: 'text', required: true, defaultValue: '1' },
            { name: 'date', label: 'Date', type: 'date', required: true },
            { name: 'serialNo', label: 'Serial No', type: 'text', required: true, defaultValue: 'CSKRISHI' },
            { name: 'issueDate', label: 'Issue Date', type: 'text', required: true, defaultValue: '04/03/2023' },
            { name: 'time', label: 'Time', type: 'text', required: true }
        ],
        sections: [
            {
                title: 'Packaging Checks',
                fields: [
                    { name: 'droneCondition', label: 'CS_KRISHI_10L (with void tape)', type: 'select', options: ['YES', 'NO'] },
                    { name: 'remoteController', label: 'Remote controller', type: 'select', options: ['YES', 'NO'] },
                    { name: 'batteryPlate', label: 'Battery Plate', type: 'select', options: ['YES', 'NO'] },
                    { name: 'smartPhone', label: 'Smart Phone', type: 'select', options: ['YES', 'NO'] },
                    { name: 'batterySet', label: 'Battery set (Labelled)', type: 'select', options: ['YES', 'NO'] },
                    { name: 'batteryCharger', label: 'Battery charger', type: 'select', options: ['YES', 'NO'] },
                    { name: 'centrifugalNozzle', label: 'Centrifugal Nozzle (if asked)', type: 'select', options: ['YES', 'NO'] },
                    { name: 'flightManual', label: 'Flight Manual', type: 'select', options: ['YES', 'NO'] },
                    { name: 'maintenanceManual', label: 'Maintenance Manual', type: 'select', options: ['YES', 'NO'] },
                    { name: 'batteryLogBook', label: 'Battery Log Book', type: 'select', options: ['YES', 'NO'] },
                    { name: 'maintenanceLogBook', label: 'Maintenance Log book', type: 'select', options: ['YES', 'NO'] },
                    { name: 'operationalLogBook', label: 'Operational Log Book', type: 'select', options: ['YES', 'NO'] },
                    { name: 'toolBox', label: 'Tool box', type: 'select', options: ['YES', 'NO'] },
                    { name: 'droneCase', label: 'Drone case (if asked)', type: 'select', options: ['YES', 'NO'] },
                    { name: 'extraPropeller', label: 'Extra propeller (1 set)', type: 'select', options: ['YES', 'NO'] },
                    { name: 'pneumaticConnector', label: 'Pneumatic connector', type: 'select', options: ['YES', 'NO'] },
                    { name: 'extraBatterySet', label: 'Extra battery set (if asked)', type: 'select', options: ['YES', 'NO'] },
                    { name: 'extraBatteryCharger', label: 'Extra battery charger (if asked)', type: 'select', options: ['YES', 'NO'] }
                ]
            }
        ],
        footerFields: [
            { name: 'authorisedPerson', label: 'Authorised person', type: 'text' },
            { name: 'signature', label: 'Signature', type: 'text' }
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
        workflowOrder: 13,
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
                    { name: 'gstNumber', label: 'GST Number', type: 'text' },
                    { name: 'egcaId', label: 'EGCA ID', type: 'text', required: false }
                ]
            }
        ],
        footerFields: [
            { name: 'preparedBy', label: 'Prepared By', type: 'text' }
        ]
    },

    // Stage 13: Dispatch Checklist (GS + QI)
    {
        formName: 'DISPATCH CHECKLIST',
        formCode: 'DISPATCH',
        description: 'Final dispatch verification checklist',
        category: 'dispatch',
        allowedRoles: ['admin', 'staff', 'qi'],
        accessRoles: ['admin', 'gs', 'qi'],
        workflowOrder: 14,
        prerequisiteForm: 'CUSTOMER_PROFILE',
        expectedDuration: 8,
        requiresApproval: true,
        headerFields: [
            { name: 'modelNo', label: 'Model No', type: 'text', required: true, defaultValue: 'CS_KRISHI_10L' },
            { name: 'versionNo', label: 'Version No', type: 'text', required: true, defaultValue: '1' },
            { name: 'date', label: 'Date', type: 'date', required: true },
            { name: 'serialNo', label: 'Serial No', type: 'text', required: true, defaultValue: 'CSKRISHI' },
            { name: 'issueDate', label: 'Issue Date', type: 'text', required: true, defaultValue: '04/03/2023' },
            { name: 'time', label: 'Time', type: 'text', required: true }
        ],
        sections: [
            {
                title: 'Dispatch Checks',
                fields: [
                    { name: 'invoice', label: 'Invoice', type: 'select', options: ['YES', 'NO'] },
                    { name: 'deliveryChallan', label: 'Delivery challan (*2)', type: 'select', options: ['YES', 'NO'] },
                    { name: 'customerUndertaking', label: 'Customer undertaking', type: 'select', options: ['YES', 'NO'] },
                    { name: 'loanDocument', label: 'Loan document (if any)', type: 'select', options: ['YES', 'NO'] },
                    { name: 'subsidyDocument', label: 'Subsidy/ scheme document (if any)', type: 'select', options: ['YES', 'NO'] },
                    { name: 'remark', label: 'Remark', type: 'text' }
                ]
            }
        ],
        footerFields: [
            { name: 'authorisedPerson', label: 'Authorised person', type: 'text' },
            { name: 'signature', label: 'Signature', type: 'text' }
        ]
    },

    // Stage 14: Certificate of Conformity (GS - Auto-fill)
    {
        formName: 'Certificate of Conformity',
        formCode: 'CERTIFICATE',
        description: 'Final certificate of conformity - auto-filled from previous forms',
        category: 'certificate',
        allowedRoles: ['admin', 'staff'],
        accessRoles: ['admin', 'gs'],
        workflowOrder: 15,
        prerequisiteForm: 'DISPATCH',
        expectedDuration: 4,
        requiresApproval: true,
        headerFields: [
            { name: 'certificateNo', label: 'Certificate Number', type: 'text', required: true, defaultValue: 'CSI/CS_KRISHI_10L/' },
            { name: 'orderNo', label: 'Order Number / PO Number', type: 'text', required: true },
            { name: 'date', label: 'Date', type: 'date', required: true },
            { name: 'name', label: 'Name', type: 'text', required: true },
            { name: 'address', label: 'Address', type: 'text', required: true },
            { name: 'pinCode', label: 'Pin Code', type: 'text', required: true }
        ],
        sections: [
            {
                title: 'Details of UAS',
                fields: [
                    { name: 'modelNo', label: 'MODEL NO.', type: 'text', defaultValue: 'CS_KRISHI_10L' },
                    { name: 'serialNo', label: 'SERIAL NO.', type: 'text' },
                    { name: 'flightControllerNo', label: 'Flight Controller Number', type: 'text' },
                    { name: 'gcsNumber', label: 'GCS Number', type: 'text' },
                    { name: 'obstacleAvoidanceNo', label: 'Obstacle Avoidance Number', type: 'text' },
                    { name: 'groundRadarNo', label: 'Ground Radar Number', type: 'text' },
                    { name: 'gpsNumber', label: 'GPS Number', type: 'text' },
                    { name: 'uinNumber', label: 'UIN Number', type: 'text' }
                ]
            }
        ],
        footerFields: [
            { name: 'sincerely', label: 'Sincerely', type: 'text', defaultValue: 'Sincerely' },
            { name: 'forCompany', label: 'For Company', type: 'text', defaultValue: 'Cerebrospark Innovations Private Limited.' }
        ]
    },

    // Stage 15: Maintenance / Replacement Form (QI/Staff)
    {
        formName: 'Maintenance / Replacement Form',
        formCode: 'MAINTENANCE_REPLACEMENT',
        description: 'Form for recording drone maintenance or component replacement',
        category: 'maintenance',
        allowedRoles: ['admin', 'staff', 'qi'],
        accessRoles: ['admin', 'gs', 'qi'],
        workflowOrder: 16,
        prerequisiteForm: 'CERTIFICATE',
        expectedDuration: 24,
        requiresApproval: false,
        headerFields: [
            { name: 'dateOfService', label: 'DATE OF SERVICE', type: 'date', required: true }
        ],
        sections: [
            {
                title: 'Drone & Client Details',
                fields: [
                    { name: 'droneModel', label: 'DRONE MODEL', type: 'text', defaultValue: 'CS_KRISHI_10L', required: true },
                    { name: 'droneUin', label: 'DRONE UIN NUMBER', type: 'text' },
                    { name: 'serialNo', label: 'SERIAL NUMBER', type: 'text', required: true },
                    { name: 'customerName', label: 'CUSTOMER NAME', type: 'text', required: true },
                    { name: 'dateOfPurchase', label: 'DATE OF PURCHASE', type: 'date' },
                    { name: 'contactDetails', label: 'CONTACT DETAILS', type: 'text' },
                    { name: 'address', label: 'ADDRESS', type: 'textarea' }
                ]
            },
            {
                title: 'Service Details',
                fields: [
                    { name: 'locationOfService', label: 'LOCATION OF SERVICE', type: 'text' },
                    { name: 'defectDescription', label: 'DEFECT DESCRIPTION', type: 'textarea' },
                    { name: 'dateOfDefect', label: 'DATE OF DEFECT', type: 'date' },
                    { name: 'componentsReplaced', label: 'COMPONENTS REPLACED', type: 'textarea' },
                    { name: 'maintenanceCarriedOut', label: 'MAINTENANCE CARRIED OUT', type: 'textarea' },
                    { name: 'engineerName', label: 'ENGINEER NAME', type: 'text' },
                    { name: 'remark', label: 'REMARK', type: 'text' },
                    { name: 'suggestion', label: 'SUGGESTION', type: 'text' },
                    { name: 'nextMaintenanceDate', label: 'NEXT MAINTENANCE DUE DATE', type: 'date' }
                ]
            }
        ],
        footerFields: [
            { name: 'personInCharge', label: 'Person In-charge', type: 'text' },
            { name: 'receiver', label: 'Receiver', type: 'text' }
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

        // --- MIGRATION: Re-link existing submissions to new schemas ---
        console.log('\nMigrating existing submissions to new schema IDs...');
        const submissions = await FormSubmission.find({});
        console.log(`Found ${submissions.length} submissions to check`);

        const schemaMap = {}; // code -> _id
        insertedForms.forEach(f => { schemaMap[f.formCode] = f._id; });

        let migratedCount = 0;
        for (const sub of submissions) {
            try {
                let detectedCode = null;

                // Try to detect form code from field signatures
                if (sub.formData?.motor1 !== undefined) detectedCode = 'QA_SOLDERING';
                else if (sub.formData?.armOrientation !== undefined) detectedCode = 'QA_MECHANICAL';
                else if (sub.formData?.fcPosition !== undefined || sub.formData?.pmuPosition !== undefined || sub.formData?.fc_position !== undefined) detectedCode = 'QA_ELECTRONIC';
                else if (sub.formData?.poNumber !== undefined || sub.headerData?.supplierName !== undefined) detectedCode = 'PO';
                else if (sub.formData?.clientName !== undefined || sub.headerData?.workOrderNo !== undefined) detectedCode = 'WORK_ORDER';
                else if (sub.formData?.items !== undefined || sub.formData?.particular_0 !== undefined || sub.formData?.particular_1 !== undefined) detectedCode = 'MRF';
                else if (sub.formData?.payloadWeight !== undefined || sub.formData?.obstacleAvoidance !== undefined && sub.formData?.pumpMounting !== undefined) detectedCode = 'QA_PAYLOAD';
                else if (sub.formData?.firmware_update !== undefined || sub.formData?.rcCalibration !== undefined) detectedCode = 'QA_CALIBRATION';
                else if (sub.formData?.gcsNumber !== undefined && sub.formData?.pairingStatus !== undefined) detectedCode = 'ACTIVATION';
                else if (sub.formData?.compassCalibration !== undefined && sub.formData?.accelerometerCalibration !== undefined) detectedCode = 'FLIGHT_TEST';
                else if (sub.formData?.uinNumber !== undefined && sub.formData?.ownerName !== undefined) detectedCode = 'UIN';
                else if (sub.formData?.d2Form !== undefined) detectedCode = 'D2_FORM';
                else if (sub.formData?.uinPhoto !== undefined) detectedCode = 'UIN_PHOTO';
                else if (sub.formData?.d3Form !== undefined) detectedCode = 'D3_FORM';
                else if (sub.formData?.droneCondition !== undefined && sub.formData?.flightManual !== undefined) detectedCode = 'PACKAGING';
                else if (sub.formData?.customerName !== undefined && sub.formData?.customerAddress !== undefined) detectedCode = 'CUSTOMER_PROFILE';
                else if (sub.formData?.invoice !== undefined && sub.formData?.deliveryChallan !== undefined) detectedCode = 'DISPATCH';
                else if (sub.formData?.certificateNo !== undefined || sub.headerData?.certificateNo !== undefined) detectedCode = 'CERTIFICATE';
                else if (sub.formData?.defectDescription !== undefined && sub.formData?.engineerName !== undefined) detectedCode = 'MAINTENANCE_REPLACEMENT';

                if (detectedCode && schemaMap[detectedCode]) {
                    const newSchemaId = schemaMap[detectedCode];
                    if (!sub.formSchema || sub.formSchema.toString() !== newSchemaId.toString()) {
                        await FormSubmission.updateOne({ _id: sub._id }, { formSchema: newSchemaId });
                        migratedCount++;
                    }
                }
            } catch (err) {
                console.warn(`Failed to migrate submission ${sub._id}:`, err.message);
            }
        }
        console.log(`Successfully migrated ${migratedCount} submissions`);

        // --- END MIGRATION ---

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
