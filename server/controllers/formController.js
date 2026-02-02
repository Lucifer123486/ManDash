const FormSchema = require('../models/FormSchema');
const FormSubmission = require('../models/FormSubmission');
const Drone = require('../models/Drone');
const notificationService = require('../services/notificationService');

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
        const { formSchemaId, droneId, orderId, headerData, formData, footerData } = req.body;

        // Validate form schema exists
        const schema = await FormSchema.findById(formSchemaId);
        if (!schema) {
            return res.status(404).json({
                success: false,
                message: 'Form schema not found'
            });
        }

        // Create submission
        const submission = await FormSubmission.create({
            formSchema: formSchemaId,
            drone: droneId,
            order: orderId,
            submittedBy: req.user._id,
            headerData,
            formData,
            footerData,
            status: 'submitted'
        });

        // Update drone with the form submission
        if (droneId) {
            await Drone.findByIdAndUpdate(droneId, {
                $push: {
                    forms: submission._id,
                    completedSteps: {
                        step: schema.formCode,
                        completedAt: new Date(),
                        completedBy: req.user._id,
                        formSubmission: submission._id
                    }
                }
            });
        }

        // Send notification if form requires approval
        if (schema.requiresApproval) {
            await notificationService.notifyFormSubmission(submission, schema);
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
        const { formSchemaId, droneId, status, page = 1, limit = 20 } = req.query;

        let query = {};

        if (formSchemaId) query.formSchema = formSchemaId;
        if (droneId) query.drone = droneId;
        if (status) query.status = status;

        // If not admin, only show own submissions
        if (req.user.role !== 'admin') {
            query.submittedBy = req.user._id;
        }

        const submissions = await FormSubmission.find(query)
            .populate('formSchema', 'formName formCode')
            .populate('drone', 'serialNo modelNo')
            .populate('submittedBy', 'name email')
            .sort('-createdAt')
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
            .sort('formSchema.workflowOrder');

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
