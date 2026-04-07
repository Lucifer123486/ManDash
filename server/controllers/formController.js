const FormSchema = require('../models/FormSchema');
const FormSubmission = require('../models/FormSubmission');
const Drone = require('../models/Drone');
const FormAccessRequest = require('../models/FormAccessRequest');
const notificationService = require('../services/notificationService');

// Helper to map form codes to manufacturing status
const mapFormCodeToStatus = (formCode) => {
    const mapping = {
        'PO': 'material_entry',
        'WORK_ORDER': 'material_entry',
        'MRF': 'material_inspection',
        'QA_SOLDERING': 'soldering',
        'QA_MECHANICAL': 'mechanical_assembly',
        'QA_ELECTRONIC': 'electronic_assembly',
        'QA_PAYLOAD': 'payload_assembly',
        'QA_CALIBRATION': 'calibration',
        'FLIGHT_TEST': 'flight_test',
        'PACKAGING': 'packaging',
        'DELIVERY_CHALLAN': 'delivery_challan',
        'DISPATCH': 'dispatch',
        'CERTIFICATE': 'delivered',
        'MAINTENANCE_REPLACEMENT': 'maintenance'
    };
    return mapping[formCode] || null;
};

// @desc    Create form schema (Admin only)
// @route   POST /api/forms/schema
// @access  Private/Admin
exports.createFormSchema = async (req, res) => {
    try {
        const formSchema = await FormSchema.create(req.body);

        res.status(201).json({
            success: true,
            data: formSchema
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Error creating form schema',
            error: error.message
        });
    }
};

// @desc    Get all form schemas
// @route   GET /api/forms/schemas
// @access  Private
exports.getFormSchemas = async (req, res) => {
    try {
        const { category, role } = req.query;

        let query = { isActive: true };

        if (category) {
            query.category = category;
        }

        if (role) {
            query.allowedRoles = role;
        }

        const schemas = await FormSchema.find(query).sort('workflowOrder');

        res.status(200).json({
            success: true,
            count: schemas.length,
            data: schemas
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Error fetching form schemas',
            error: error.message
        });
    }
};

// @desc    Get single form schema
// @route   GET /api/forms/schema/:id
// @access  Private
exports.getFormSchema = async (req, res) => {
    try {
        const schema = await FormSchema.findById(req.params.id);

        if (!schema) {
            return res.status(404).json({
                success: false,
                message: 'Form schema not found'
            });
        }

        res.status(200).json({
            success: true,
            data: schema
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Error fetching form schema',
            error: error.message
        });
    }
};

// @desc    Get form schema by code
// @route   GET /api/forms/schema/code/:code
// @access  Private
exports.getFormSchemaByCode = async (req, res) => {
    try {
        const schema = await FormSchema.findOne({ formCode: req.params.code, isActive: true });

        if (!schema) {
            return res.status(404).json({
                success: false,
                message: 'Form schema not found'
            });
        }

        res.status(200).json({
            success: true,
            data: schema
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Error fetching form schema',
            error: error.message
        });
    }
};

// @desc    Submit a form
// @route   POST /api/forms/submit
// @access  Private
exports.submitForm = async (req, res) => {
    try {
        const { formSchemaId, droneId, orderId, headerData, formData, footerData, status = 'submitted' } = req.body;

        // Validate form schema exists
        const schema = await FormSchema.findById(formSchemaId);
        if (!schema) {
            return res.status(404).json({
                success: false,
                message: 'Form schema not found'
            });
        }

        let submission;

        // Check if a draft already exists for this user, drone, and schema
        if (status === 'draft' || status === 'submitted') {
            const existingDraft = await FormSubmission.findOne({
                formSchema: formSchemaId,
                drone: droneId,
                submittedBy: req.user._id,
                status: 'draft'
            });

            if (existingDraft) {
                // Update existing draft
                existingDraft.headerData = headerData;
                existingDraft.formData = formData;
                existingDraft.footerData = footerData;
                existingDraft.status = status;
                submission = await existingDraft.save();
            }
        }

        if (!submission) {
            // Create submission
            submission = await FormSubmission.create({
                formSchema: formSchemaId,
                drone: droneId,
                order: orderId,
                submittedBy: req.user._id,
                headerData,
                formData,
                footerData,
                status
            });
        }

        // Only update drone and send notifications if status is 'submitted'
        if (status === 'submitted' && droneId) {
            const nextStatus = mapFormCodeToStatus(schema.formCode);
            const updatePayload = {
                $push: {
                    forms: submission._id,
                    completedSteps: {
                        step: schema.formCode,
                        completedAt: new Date(),
                        completedBy: req.user._id,
                        formSubmission: submission._id
                    }
                }
            };

            if (nextStatus) {
                updatePayload.manufacturingStatus = nextStatus;
            }

            await Drone.findByIdAndUpdate(droneId, updatePayload);

            // Send notification if form requires approval
            if (schema.requiresApproval) {
                await notificationService.notifyFormSubmission(submission, schema);
            }
        }

        res.status(201).json({
            success: true,
            data: submission
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Error submitting form',
            error: error.message
        });
    }
};

// @desc    Get form submissions
// @route   GET /api/forms/submissions
// @access  Private
exports.getFormSubmissions = async (req, res) => {
    try {
        const { formSchemaId, droneId, status, formCode, page = 1, limit = 20 } = req.query;

        let query = {};

        if (formSchemaId) query.formSchema = formSchemaId;
        if (droneId) query.drone = droneId;
        if (status) query.status = status;

        // NEW: Handle formCode in query
        if (formCode) {
            const schema = await FormSchema.findOne({ formCode });
            if (schema) query.formSchema = schema._id;
        }

        // If not admin, restrict to own submissions UNLESS it's a shared form (like MAINTENANCE_REPLACEMENT)
        // OR if the query is for a specific drone (for team visibility in workflow/MPR)
        if (req.user.role !== 'admin') {
            const maintenanceSchema = await FormSchema.findOne({ formCode: 'MAINTENANCE_REPLACEMENT' });
            const maintenanceId = maintenanceSchema?._id.toString();
            
            const isSharedView = droneId || 
                               formCode === 'MAINTENANCE_REPLACEMENT' || 
                               (query.formSchema && query.formSchema.toString() === maintenanceId);

            if (!isSharedView) {
                query.submittedBy = req.user._id;
            }
        }

        const submissions = await FormSubmission.find(query)
            .populate('formSchema', 'formName formCode')
            .populate('drone', 'serialNo modelNo')
            .populate('submittedBy', 'name email')
            .sort({ 'formSchema.workflowOrder': 1, 'createdAt': -1 })
            .skip((page - 1) * limit)
            .limit(parseInt(limit));

        const total = await FormSubmission.countDocuments(query);

        res.status(200).json({
            success: true,
            count: submissions.length,
            total,
            pages: Math.ceil(total / limit),
            data: submissions
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Error fetching submissions',
            error: error.message
        });
    }
};

// @desc    Get single form submission (for printing)
// @route   GET /api/forms/submission/:id
// @access  Private
exports.getFormSubmission = async (req, res) => {
    try {
        const submission = await FormSubmission.findById(req.params.id)
            .populate('formSchema')
            .populate('drone')
            .populate('submittedBy', 'name email')
            .populate('approvedBy', 'name email');

        if (!submission) {
            return res.status(404).json({
                success: false,
                message: 'Submission not found'
            });
        }

        res.status(200).json({
            success: true,
            data: submission
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Error fetching submission',
            error: error.message
        });
    }
};

// @desc    Approve/Reject form submission
// @route   PUT /api/forms/submission/:id/status
// @access  Private/Admin
exports.updateSubmissionStatus = async (req, res) => {
    try {
        const { status, remarks } = req.body;

        const submission = await FormSubmission.findByIdAndUpdate(
            req.params.id,
            {
                status,
                remarks,
                approvedBy: req.user._id,
                approvedAt: new Date()
            },
            { new: true }
        ).populate('submittedBy', 'name email fcmToken');

        if (!submission) {
            return res.status(404).json({
                success: false,
                message: 'Submission not found'
            });
        }

        // Notify the submitter
        await notificationService.notifySubmissionStatus(submission, status);

        res.status(200).json({
            success: true,
            data: submission
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Error updating submission status',
            error: error.message
        });
    }
};

// @desc    Get submissions for a specific drone
// @route   GET /api/forms/drone/:droneId
// @access  Private
exports.getDroneSubmissions = async (req, res) => {
    try {
        const submissions = await FormSubmission.find({ drone: req.params.droneId })
            .populate('formSchema', 'formName formCode workflowOrder category')
            .populate('submittedBy', 'name')
            .sort({ createdAt: -1 });

        res.status(200).json({
            success: true,
            count: submissions.length,
            data: submissions
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Error fetching drone submissions',
            error: error.message
        });
    }
};

/* ================= ACCESS REQUESTS ================= */

// @desc    Request bulk access to forms
// @route   POST /api/forms/access-request/bulk
// @access  Private
exports.requestBulkAccess = async (req, res) => {
    try {
        const { droneId, formCodes } = req.body;

        if (!formCodes || !Array.isArray(formCodes)) {
            return res.status(400).json({
                success: false,
                message: 'Please provide an array of form codes'
            });
        }

        const requests = [];
        for (const formCode of formCodes) {
            try {
                const request = await FormAccessRequest.create({
                    staff: req.user._id,
                    drone: droneId,
                    formCode
                });
                requests.push(request);
            } catch (err) {
                // Ignore duplicates in bulk request
                if (err.code !== 11000) throw err;
            }
        }

        res.status(201).json({
            success: true,
            data: requests
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Error creating bulk access requests',
            error: error.message
        });
    }
};

// @desc    Request access to fill a form
// @route   POST /api/forms/access-request
// @access  Private
exports.requestFormAccess = async (req, res) => {
    try {
        const { droneId, formCode } = req.body;

        const request = await FormAccessRequest.create({
            staff: req.user._id,
            drone: droneId,
            formCode
        });

        res.status(201).json({
            success: true,
            data: request
        });
    } catch (error) {
        if (error.code === 11000) {
            return res.status(400).json({
                success: false,
                message: 'Access already requested for this form'
            });
        }
        res.status(500).json({
            success: false,
            message: 'Error creating access request',
            error: error.message
        });
    }
};

// @desc    Get all form access requests (Admin Only)
// @route   GET /api/forms/access-requests
// @access  Private/Admin
exports.getAccessRequests = async (req, res) => {
    try {
        const { status } = req.query;
        let query = {};
        if (status) query.status = status;

        const requests = await FormAccessRequest.find(query)
            .populate('staff', 'name email role')
            .populate('drone', 'serialNo modelNo')
            .sort('-createdAt');

        res.status(200).json({
            success: true,
            count: requests.length,
            data: requests
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Error fetching access requests',
            error: error.message
        });
    }
};

// @desc    Approve/Reject all pending access requests (Admin Only)
// @route   PUT /api/forms/access-requests/bulk
// @access  Private/Admin
exports.bulkUpdateAccessRequests = async (req, res) => {
    try {
        const { ids, status, remarks } = req.body;

        if (!ids || !Array.isArray(ids)) {
            return res.status(400).json({
                success: false,
                message: 'Please provide an array of request IDs'
            });
        }

        const result = await FormAccessRequest.updateMany(
            { _id: { $in: ids } },
            {
                status,
                remarks,
                approvedBy: req.user._id,
                approvedAt: new Date()
            }
        );

        res.status(200).json({
            success: true,
            data: result
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Error updating bulk access requests',
            error: error.message
        });
    }
};

// @desc    Approve/Reject access request (Admin Only)
// @route   PUT /api/forms/access-request/:id
// @access  Private/Admin
exports.updateAccessRequest = async (req, res) => {
    try {
        const { status, remarks } = req.body;

        const request = await FormAccessRequest.findByIdAndUpdate(
            req.params.id,
            {
                status,
                remarks,
                approvedBy: req.user._id,
                approvedAt: new Date()
            },
            { new: true }
        );

        if (!request) {
            return res.status(404).json({
                success: false,
                message: 'Request not found'
            });
        }

        res.status(200).json({
            success: true,
            data: request
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Error updating access request',
            error: error.message
        });
    }
};

// @desc    Check if user has access to a specific form for a drone
// @route   GET /api/forms/check-access/:droneId/:formCode
// @access  Private
exports.checkFormAccess = async (req, res) => {
    try {
        // Admins have access to everything
        if (req.user.role === 'admin') {
            return res.status(200).json({
                success: true,
                hasAccess: true,
                status: 'approved'
            });
        }

        const request = await FormAccessRequest.findOne({
            staff: req.user._id,
            drone: req.params.droneId,
            formCode: req.params.formCode
        });

        if (!request) {
            return res.status(200).json({
                success: true,
                hasAccess: false,
                status: 'none'
            });
        }

        res.status(200).json({
            success: true,
            hasAccess: request.status === 'approved',
            status: request.status
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Error checking form access',
            error: error.message
        });
    }
};
