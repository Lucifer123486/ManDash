const express = require('express');
const router = express.Router();
const {
    createDrone,
    getDrones,
    getDrone,
    getDroneBySerial,
    updateDroneStatus,
    updateDroneComponents,
    getDroneWorkflow,
    getDroneDocuments,
    assignStaff,
    skipStage,
    uploadDeliveryChallan,
    uploadHashCode,
    uploadTaxInvoice,
    uploadD2Form,
    uploadD3Form,
    assignOrder,
    updateEgcaDetails,
    unassignOrder,
    deleteDrone
} = require('../controllers/droneController');
const { protect, authorize } = require('../middleware/auth');
const upload = require('../middleware/uploadMiddleware');

router.use(protect); // All routes require authentication

// Specific routes first
router.put('/:id/assign-order', authorize('admin', 'staff'), assignOrder); // Link Order
router.put('/:id/unassign-order', authorize('admin', 'staff'), unassignOrder); // Unlink Order
router.put('/:id/egca', authorize('admin', 'staff'), updateEgcaDetails); // Update EGCA Details

router.route('/')
    .get(getDrones)
    .post(authorize('admin', 'staff'), createDrone);

router.route('/:id')
    .get(getDrone)
    .delete(authorize('admin', 'staff'), deleteDrone);

router.get('/serial/:serialNo', getDroneBySerial);

router.put('/:id/status', authorize('admin', 'staff'), updateDroneStatus);
router.put('/:id/components', authorize('admin', 'staff'), updateDroneComponents);
router.put('/:id/assign-staff', authorize('admin'), assignStaff);
router.put('/:id/skip-stage', authorize('admin', 'staff'), skipStage);
router.put('/:id/delivery-challan', authorize('admin', 'staff'), upload.single('file'), uploadDeliveryChallan);
router.put('/:id/hash-code', authorize('admin', 'staff'), upload.single('file'), uploadHashCode);
router.put('/:id/tax-invoice', authorize('admin', 'staff'), upload.single('file'), uploadTaxInvoice);
router.put('/:id/d2-form', authorize('admin', 'staff'), upload.single('file'), uploadD2Form);
router.put('/:id/d3-form', authorize('admin', 'staff'), upload.single('file'), uploadD3Form);
router.get('/:id/workflow', getDroneWorkflow);
router.get('/:id/documents', getDroneDocuments);

module.exports = router;

