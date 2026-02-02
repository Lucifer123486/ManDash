const express = require('express');
const router = express.Router();
const {
    createFormSchema,
    getFormSchemas,
    getFormSchema,
    getFormSchemaByCode,
    submitForm,
    getFormSubmissions,
    getFormSubmission,
    updateSubmissionStatus,
    getDroneSubmissions
} = require('../controllers/formController');
const { protect, authorize } = require('../middleware/auth');

router.use(protect); // All routes require authentication

// Schema routes
router.route('/schemas')
    .get(getFormSchemas);

router.route('/schema')
    .post(authorize('admin'), createFormSchema);

router.route('/schema/:id')
    .get(getFormSchema);

router.get('/schema/code/:code', getFormSchemaByCode);

// Submission routes
router.route('/submit')
    .post(authorize('admin', 'staff'), submitForm);

router.route('/submissions')
    .get(getFormSubmissions);

router.route('/submission/:id')
    .get(getFormSubmission);

router.put('/submission/:id/status', authorize('admin'), updateSubmissionStatus);

router.get('/drone/:droneId', getDroneSubmissions);

module.exports = router;
