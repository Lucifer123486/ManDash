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
    assignStaff
} = require('../controllers/droneController');
const { protect, authorize } = require('../middleware/auth');

router.use(protect); // All routes require authentication

router.route('/')
    .get(getDrones)
    .post(authorize('admin', 'staff'), createDrone);

router.route('/:id')
    .get(getDrone);

router.get('/serial/:serialNo', getDroneBySerial);

router.put('/:id/status', authorize('admin', 'staff'), updateDroneStatus);
router.put('/:id/components', authorize('admin', 'staff'), updateDroneComponents);
router.put('/:id/assign-staff', authorize('admin'), assignStaff);
router.get('/:id/workflow', getDroneWorkflow);
router.get('/:id/documents', getDroneDocuments);

module.exports = router;

