const Drone = require('../models/Drone');
const Order = require('../models/Order');
const FormSubmission = require('../models/FormSubmission');
const FormAccessRequest = require('../models/FormAccessRequest');

const workflowSequence = [
    'material_entry',
    'material_inspection',
    'inventory_update',
    'material_distribution',
    'soldering',
    'mechanical_assembly',
    'payload_assembly',
    'electronic_assembly',
    'calibration',
    'hash_code',
    'flight_test',
    'packaging',
    'delivery_challan',
    'tax_invoice',
    'dispatch',
    'delivered'
];

const mapFormCodeToStatus = (formCode) => {
    const mapping = {
        'PO': 'material_entry',
        'MRF': 'material_inspection',
        'QA_SOLDERING': 'soldering',
        'QA_MECHANICAL': 'mechanical_assembly',
        'QA_ELECTRONIC': 'electronic_assembly',
        'QA_PAYLOAD': 'payload_assembly',
        'QA_CALIBRATION': 'calibration',
        'HASH_CODE': 'hash_code',
        'ACTIVATION': 'flight_test',
        'FLIGHT_TEST': 'flight_test',
        'PACKAGING': 'packaging',
        'DELIVERY_CHALLAN': 'delivery_challan',
        'TAX_INVOICE': 'tax_invoice',
        'DISPATCH': 'dispatch',
        'CERTIFICATE': 'delivered'
    };
    return mapping[formCode] || null;
};

// @desc    Create a new drone
// @route   POST /api/drones
// @access  Private/Admin/Staff
exports.createDrone = async (req, res) => {
    try {
        const { modelNo, orderId, components } = req.body;

        // Generate serial number
        const serialNo = await Drone.generateSerialNo();

        const drone = await Drone.create({
            modelNo: modelNo || 'CS_KRISHI_10L',
            serialNo,
            order: orderId,
            components
        });

        // If associated with an order, update the order
        if (orderId) {
            await Order.findByIdAndUpdate(orderId, {
                $push: { drones: drone._id }
            });
        }

        res.status(201).json({
            success: true,
            data: drone
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Error creating drone',
            error: error.message
        });
    }
};

// @desc    Get all drones
// @route   GET /api/drones
// @access  Private
exports.getDrones = async (req, res) => {
    try {
        const { status, orderId, page = 1, limit = 20 } = req.query;

        let query = { isActive: true };
        if (status) query.manufacturingStatus = status;
        if (orderId) query.order = orderId;

        const drones = await Drone.find(query)
            .populate('order', 'orderNumber customerName')
            .sort('-createdAt')
            .skip((page - 1) * limit)
            .limit(parseInt(limit));

        const total = await Drone.countDocuments(query);

        res.status(200).json({
            success: true,
            count: drones.length,
            total,
            pages: Math.ceil(total / limit),
            data: drones
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Error fetching drones',
            error: error.message
        });
    }
};

// @desc    Get single drone with all details
// @route   GET /api/drones/:id
// @access  Private
exports.getDrone = async (req, res) => {
    try {
        const drone = await Drone.findById(req.params.id)
            .populate('order')
            .populate({
                path: 'forms',
                populate: {
                    path: 'formSchema',
                    select: 'formName formCode category'
                }
            })
            .populate('completedSteps.completedBy', 'name')
            .populate('assignedGS', 'name email staffType')
            .populate('assignedQI', 'name email staffType');

        if (!drone) {
            return res.status(404).json({
                success: false,
                message: 'Drone not found'
            });
        }

        res.status(200).json({
            success: true,
            data: drone
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Error fetching drone',
            error: error.message
        });
    }
};

// @desc    Get drone by serial number
// @route   GET /api/drones/serial/:serialNo
// @access  Private
exports.getDroneBySerial = async (req, res) => {
    try {
        const drone = await Drone.findOne({ serialNo: req.params.serialNo })
            .populate('order')
            .populate('forms');

        if (!drone) {
            return res.status(404).json({
                success: false,
                message: 'Drone not found'
            });
        }

        res.status(200).json({
            success: true,
            data: drone
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Error fetching drone',
            error: error.message
        });
    }
};

// @desc    Update drone status
// @route   PUT /api/drones/:id/status
// @access  Private/Staff
exports.updateDroneStatus = async (req, res) => {
    try {
        const { manufacturingStatus, qualityStatus, remarks } = req.body;

        const updateData = {};
        if (manufacturingStatus) updateData.manufacturingStatus = manufacturingStatus;
        if (qualityStatus) updateData.qualityStatus = qualityStatus;
        if (remarks) updateData.remarks = remarks;

        const drone = await Drone.findByIdAndUpdate(
            req.params.id,
            updateData,
            { new: true }
        );

        if (!drone) {
            return res.status(404).json({
                success: false,
                message: 'Drone not found'
            });
        }

        res.status(200).json({
            success: true,
            data: drone
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Error updating drone status',
            error: error.message
        });
    }
};
// @desc    Update drone components (UAS details)
// @route   PUT /api/drones/:id/components
// @access  Private/Staff
exports.updateDroneComponents = async (req, res) => {
    try {
        const { components } = req.body;

        const drone = await Drone.findByIdAndUpdate(
            req.params.id,
            { components },
            { new: true }
        );

        if (!drone) {
            return res.status(404).json({
                success: false,
                message: 'Drone not found'
            });
        }

        res.status(200).json({
            success: true,
            data: drone
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Error updating drone components',
            error: error.message
        });
    }
};

// @desc    Upload Delivery Challan PDF File
// @route   PUT /api/drones/:id/delivery-challan
// @access  Private/Staff
exports.uploadDeliveryChallan = async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({
                success: false,
                message: 'Please upload a PDF file'
            });
        }

        const drone = await Drone.findById(req.params.id);

        if (!drone) {
            return res.status(404).json({
                success: false,
                message: 'Drone not found'
            });
        }

        // Store relative URL: /uploads/delivery_challan/filename.pdf
        const fileUrl = `/uploads/delivery_challan/${req.file.filename}`;
        drone.deliveryChallan = fileUrl;

        // Add to completed steps
        const alreadyCompleted = drone.completedSteps.some(s => s.step === 'DELIVERY_CHALLAN');
        if (!alreadyCompleted) {
            drone.completedSteps.push({
                step: 'DELIVERY_CHALLAN',
                completedAt: Date.now(),
                completedBy: req.user._id
            });
        }

        // Advance manufacturing status only if it's further along
        const newStatus = 'delivery_challan';
        if (workflowSequence.indexOf(newStatus) > workflowSequence.indexOf(drone.manufacturingStatus)) {
            drone.manufacturingStatus = newStatus;
        }

        await drone.save();

        res.status(200).json({
            success: true,
            data: drone,
            fileUrl: fileUrl
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Error uploading delivery challan',
            error: error.message
        });
    }
};

// @desc    Upload Hash Code File
// @route   PUT /api/drones/:id/hash-code
// @access  Private/Staff
exports.uploadHashCode = async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({
                success: false,
                message: 'No file received. Please upload a file (PDF or Image).'
            });
        }

        const drone = await Drone.findById(req.params.id);
        if (!drone) {
            return res.status(404).json({
                success: false,
                message: 'Drone not found'
            });
        }

        const fileUrl = `/uploads/hash_code/${req.file.filename}`;
        drone.hashCode = fileUrl;

        const alreadyCompleted = drone.completedSteps.some(s => s.step === 'HASH_CODE');
        if (!alreadyCompleted) {
            drone.completedSteps.push({
                step: 'HASH_CODE',
                completedAt: Date.now(),
                completedBy: req.user._id
            });
        }

        const newStatus = 'hash_code';
        if (workflowSequence.indexOf(newStatus) > workflowSequence.indexOf(drone.manufacturingStatus)) {
            drone.manufacturingStatus = newStatus;
        }
        await drone.save();

        res.status(200).json({
            success: true,
            data: drone,
            fileUrl
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Error uploading hash code',
            error: error.message
        });
    }
};

// @desc    Upload Tax Invoice File
// @route   PUT /api/drones/:id/tax-invoice
// @access  Private/Staff
exports.uploadTaxInvoice = async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({
                success: false,
                message: 'No file received. Please upload a file (PDF or Image).'
            });
        }

        const drone = await Drone.findById(req.params.id);
        if (!drone) {
            return res.status(404).json({
                success: false,
                message: 'Drone not found'
            });
        }

        const fileUrl = `/uploads/tax_invoice/${req.file.filename}`;
        drone.taxInvoice = fileUrl;

        const alreadyCompleted = drone.completedSteps.some(s => s.step === 'TAX_INVOICE');
        if (!alreadyCompleted) {
            drone.completedSteps.push({
                step: 'TAX_INVOICE',
                completedAt: Date.now(),
                completedBy: req.user._id
            });
        }

        const newStatus = 'tax_invoice';
        if (workflowSequence.indexOf(newStatus) > workflowSequence.indexOf(drone.manufacturingStatus)) {
            drone.manufacturingStatus = newStatus;
        }
        await drone.save();

        res.status(200).json({
            success: true,
            data: drone,
            fileUrl
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Error uploading tax invoice',
            error: error.message
        });
    }
};

// @desc    Upload D2 Form PDF File
// @route   PUT /api/drones/:id/d2-form
// @access  Private/Staff
exports.uploadD2Form = async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({
                success: false,
                message: 'No file received. Please upload a file (PDF or Image).'
            });
        }

        const drone = await Drone.findById(req.params.id);
        if (!drone) {
            return res.status(404).json({
                success: false,
                message: 'Drone not found'
            });
        }

        const fileUrl = `/uploads/d2_form/${req.file.filename}`;
        drone.d2Form = fileUrl;

        const alreadyCompleted = drone.completedSteps.some(s => s.step === 'D2_FORM');
        if (!alreadyCompleted) {
            drone.completedSteps.push({
                step: 'D2_FORM',
                completedAt: Date.now(),
                completedBy: req.user._id
            });
        }

        const newStatus = 'packaging';
        if (workflowSequence.indexOf(newStatus) > workflowSequence.indexOf(drone.manufacturingStatus)) {
            drone.manufacturingStatus = newStatus;
        }
        await drone.save();

        res.status(200).json({
            success: true,
            data: drone,
            fileUrl
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Error uploading D2 form',
            error: error.message
        });
    }
};

// @desc    Upload D3 Form PDF File
// @route   PUT /api/drones/:id/d3-form
// @access  Private/Staff
exports.uploadD3Form = async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({
                success: false,
                message: 'No file received. Please upload a file (PDF or Image).'
            });
        }

        const drone = await Drone.findById(req.params.id);
        if (!drone) {
            return res.status(404).json({
                success: false,
                message: 'Drone not found'
            });
        }

        const fileUrl = `/uploads/d3_form/${req.file.filename}`;
        drone.d3Form = fileUrl;

        const alreadyCompleted = drone.completedSteps.some(s => s.step === 'D3_FORM');
        if (!alreadyCompleted) {
            drone.completedSteps.push({
                step: 'D3_FORM',
                completedAt: Date.now(),
                completedBy: req.user._id
            });
        }

        const newStatus = 'packaging';
        if (workflowSequence.indexOf(newStatus) > workflowSequence.indexOf(drone.manufacturingStatus)) {
            drone.manufacturingStatus = newStatus;
        }
        await drone.save();

        res.status(200).json({
            success: true,
            data: drone,
            fileUrl
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Error uploading D3 form',
            error: error.message
        });
    }
};

// @desc    Get manufacturing workflow progress
// @route   GET /api/drones/:id/workflow
// @access  Private
exports.getDroneWorkflow = async (req, res) => {
    try {
        const drone = await Drone.findById(req.params.id)
            .populate({
                path: 'completedSteps.completedBy',
                select: 'name'
            })
            .populate({
                path: 'completedSteps.formSubmission',
                select: 'status createdAt'
            });

        if (!drone) {
            return res.status(404).json({
                success: false,
                message: 'Drone not found'
            });
        }

        // Define workflow steps
        const workflowSteps = [
            { code: 'MATERIAL_ENTRY', name: 'Material Entry', order: 1 },
            { code: 'MATERIAL_INSPECTION', name: 'Material Inspection', order: 2 },
            { code: 'INVENTORY_UPDATE', name: 'Inventory Update', order: 3 },
            { code: 'MATERIAL_DISTRIBUTION', name: 'Material Distribution', order: 4 },
            { code: 'QA_SOLDERING', name: 'Soldering Station QA', order: 5 },
            { code: 'QA_MECHANICAL', name: 'Mechanical Assembly QA', order: 6 },
            { code: 'QA_PAYLOAD', name: 'Payload Station QA', order: 7 },
            { code: 'QA_ELECTRONIC', name: 'Electronic Assembly QA', order: 8 },
            { code: 'QA_CALIBRATION', name: 'Calibration Station QA', order: 9 },
            { code: 'HASH_CODE', name: 'Data/Hash Code', order: 10 },
            { code: 'FLIGHT_TEST', name: 'Onground Flight Test', order: 11 },
            { code: 'PACKAGING', name: 'Packaging', order: 12 },
            { code: 'DELIVERY_CHALLAN', name: 'Delivery Challan', order: 13 },
            { code: 'TAX_INVOICE', name: 'Tax Invoice', order: 14 },
            { code: 'DISPATCH', name: 'Dispatch', order: 15 },
            { code: 'COC', name: 'Certificate of Conformity', order: 16 }
        ];

        // Map completed steps
        const completedCodes = drone.completedSteps.map(s => s.step);
        const workflow = workflowSteps.map(step => ({
            ...step,
            completed: completedCodes.includes(step.code),
            completedStep: drone.completedSteps.find(s => s.step === step.code)
        }));

        res.status(200).json({
            success: true,
            data: {
                drone: {
                    id: drone._id,
                    serialNo: drone.serialNo,
                    modelNo: drone.modelNo,
                    currentStatus: drone.manufacturingStatus
                },
                workflow
            }
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Error fetching workflow',
            error: error.message
        });
    }
};

// @desc    Get all documents for a drone (for download)
// @route   GET /api/drones/:id/documents
// @access  Private
exports.getDroneDocuments = async (req, res) => {
    try {
        const drone = await Drone.findById(req.params.id);
        if (!drone) {
            return res.status(404).json({
                success: false,
                message: 'Drone not found'
            });
        }

        const submissions = await FormSubmission.find({
            $or: [
                { drone: req.params.id },
                { "headerData.serialNo": drone.serialNo },
                { "headerData.droneSerialNo": drone.serialNo }
            ]
        })
            .populate('formSchema', 'formName formCode category')
            .populate('submittedBy', 'name')
            .populate('approvedBy', 'name')
            .sort({ createdAt: -1 });

        // New logic: Fetch approved access requests for dates
        const accessRequests = await FormAccessRequest.find({
            drone: req.params.id,
            status: 'approved'
        }).populate('staff', 'name').populate('approvedBy', 'name');

        res.status(200).json({
            success: true,
            count: submissions.length,
            data: submissions,
            accessRequests: accessRequests // Send requests along with submissions
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Error fetching documents',
            error: error.message
        });
    }
};

// @desc    Assign staff (GS/QI) to drone
// @route   PUT /api/drones/:id/assign-staff
// @access  Private/Admin
exports.assignStaff = async (req, res) => {
    try {
        const { assignedGS, assignedQI } = req.body;

        const updateData = {};
        if (assignedGS !== undefined) updateData.assignedGS = assignedGS || null;
        if (assignedQI !== undefined) updateData.assignedQI = assignedQI || null;

        const drone = await Drone.findByIdAndUpdate(
            req.params.id,
            updateData,
            { new: true }
        ).populate('assignedGS', 'name email')
            .populate('assignedQI', 'name email');

        if (!drone) {
            return res.status(404).json({
                success: false,
                message: 'Drone not found'
            });
        }

        res.status(200).json({
            success: true,
            data: drone
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Error assigning staff',
            error: error.message
        });
    }
};
// @desc    Skip a workflow stage (PO/Activation)
// @route   PUT /api/drones/:id/skip-stage
// @access  Private/Admin/Staff
exports.skipStage = async (req, res) => {
    try {
        const { stageCode } = req.body;

        const drone = await Drone.findById(req.params.id);

        if (!drone) {
            return res.status(404).json({
                success: false,
                message: 'Drone not found'
            });
        }

        // Delivery Challan is mandatory
        if (stageCode === 'DELIVERY_CHALLAN') {
            return res.status(400).json({
                success: false,
                message: 'Delivery Challan is a mandatory step and cannot be skipped'
            });
        }

        // Add to completed steps if not already there
        const alreadyCompleted = drone.completedSteps.some(s => s.step === stageCode);

        if (!alreadyCompleted) {
            drone.completedSteps.push({
                step: stageCode,
                completedAt: Date.now(),
                completedBy: req.user.id,
                // No form submission ID for skipped stages
            });

            // Also advance manufacturing status if skipping (if it's further along)
            const targetStatus = mapFormCodeToStatus(stageCode);
            if (targetStatus && workflowSequence.indexOf(targetStatus) > workflowSequence.indexOf(drone.manufacturingStatus)) {
                drone.manufacturingStatus = targetStatus;
            }

            await drone.save();
        }

        res.status(200).json({
            success: true,
            data: drone
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Error skipping stage',
            error: error.message
        });
    }
};

// @desc    Assign an order to a drone
// @route   PUT /api/drones/:id/assign-order
// @access  Private/Admin/Staff
exports.assignOrder = async (req, res) => {
    try {
        const { orderId } = req.body;
        const droneId = req.params.id;

        console.log(`[AssignOrder] Request - DroneID: ${droneId}, OrderID: ${orderId}`);

        // 1. Find the drone
        const drone = await Drone.findById(droneId);
        if (!drone) {
            console.log(`[AssignOrder] Drone not found: ${droneId}`);
            return res.status(404).json({
                success: false,
                message: `Drone with ID ${droneId} not found`
            });
        }

        // 2. Find the order
        const order = await Order.findById(orderId);
        if (!order) {
            console.log(`[AssignOrder] Order not found: ${orderId}`);
            return res.status(404).json({
                success: false,
                message: `Order with ID ${orderId} not found`
            });
        }

        console.log(`[AssignOrder] Linking Drone ${drone.serialNo} to Order ${order.orderNumber}`);

        // 3. Handle Reassignment: Remove from old order if exists
        if (drone.order && drone.order.toString() !== orderId) {
            console.log(`[AssignOrder] Removing from old order: ${drone.order}`);
            await Order.findByIdAndUpdate(drone.order, {
                $pull: { drones: droneId }
            });
        }

        // 4. Update Drone
        drone.order = orderId;
        await drone.save();

        // 5. Update New Order (add to drones array if not exists)
        if (!order.drones.includes(droneId)) {
            order.drones.push(droneId);
            await order.save();
        }

        // 6. Ensure Order is linked to User (Self-healing)
        if (order.customer) {
            await User.findByIdAndUpdate(order.customer, {
                $addToSet: { orders: orderId }
            });
        }

        console.log(`[AssignOrder] Link successful`);

        // Return updated drone with populated order
        const updatedDrone = await Drone.findById(droneId).populate('order');

        res.status(200).json({
            success: true,
            data: updatedDrone
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Error assigning order',
            error: error.message
        });
    }
};

// @desc    Update EGCA Details
// @route   PUT /api/drones/:id/egca
// @access  Private/Admin/Staff
exports.updateEgcaDetails = async (req, res) => {
    try {
        const { egcaId, egcaPassword } = req.body;
        const droneId = req.params.id;

        const drone = await Drone.findByIdAndUpdate(
            droneId,
            { egcaId, egcaPassword },
            { new: true }
        );

        if (!drone) {
            return res.status(404).json({
                success: false,
                message: 'Drone not found'
            });
        }

        res.status(200).json({
            success: true,
            data: drone
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Error updating EGCA details',
            error: error.message
        });
    }
};

// @desc    Unassign order from a drone
// @route   PUT /api/drones/:id/unassign-order
// @access  Private/Admin/Staff
exports.unassignOrder = async (req, res) => {
    try {
        const droneId = req.params.id;

        const drone = await Drone.findById(droneId);
        if (!drone) {
            return res.status(404).json({
                success: false,
                message: 'Drone not found'
            });
        }

        if (drone.order) {
            console.log(`[UnassignOrder] Unlinking Drone ${drone.serialNo} from Order ${drone.order}`);

            // Remove from Order
            await Order.findByIdAndUpdate(drone.order, {
                $pull: { drones: droneId }
            });

            // Update Drone
            drone.order = null;
            await drone.save();
        }

        res.status(200).json({
            success: true,
            data: drone
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Error unassigning order',
            error: error.message
        });
    }
};

// @desc    Delete drone (Password Protected)
// @route   DELETE /api/drones/:id
// @access  Private/Admin/Staff
exports.deleteDrone = async (req, res) => {
    try {
        const { password } = req.body;

        if (!password) {
            return res.status(400).json({
                success: false,
                message: 'Password is required to delete a drone'
            });
        }

        const user = await User.findById(req.user._id).select('+password');
        if (!user) {
            return res.status(404).json({
                success: false,
                message: 'User not found'
            });
        }

        const isMatch = await user.comparePassword(password);
        if (!isMatch) {
            return res.status(401).json({
                success: false,
                message: 'Incorrect password'
            });
        }

        const drone = await Drone.findById(req.params.id);
        if (!drone) {
            return res.status(404).json({
                success: false,
                message: 'Drone not found'
            });
        }

        // Remove drone reference from order
        if (drone.order) {
            await Order.findByIdAndUpdate(drone.order, {
                $pull: { drones: drone._id }
            });
        }

        await drone.deleteOne();

        res.status(200).json({
            success: true,
            data: {}
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Error deleting drone',
            error: error.message
        });
    }
};
