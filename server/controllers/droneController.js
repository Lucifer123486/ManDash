const Drone = require('../models/Drone');
const Order = require('../models/Order');
const FormSubmission = require('../models/FormSubmission');

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
            { code: 'FLIGHT_TEST', name: 'Onground Flight Test', order: 10 },
            { code: 'PACKAGING', name: 'Packaging', order: 11 },
            { code: 'DISPATCH', name: 'Dispatch', order: 12 },
            { code: 'COC', name: 'Certificate of Conformity', order: 13 }
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
        const submissions = await FormSubmission.find({ drone: req.params.id })
            .populate('formSchema', 'formName formCode category')
            .populate('submittedBy', 'name')
            .sort('formSchema.workflowOrder');

        res.status(200).json({
            success: true,
            count: submissions.length,
            data: submissions
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
