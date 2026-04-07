const express = require('express');
const router = express.Router();
const {
    createPrebooking,
    getAllPrebookings,
    getPrebookingById,
    updatePrebooking,
    addCallLog,
    exportPrebookingsExcel
} = require('../controllers/prebookingController');
const { protect, authorize } = require('../middleware/auth');
const upload = require('../middleware/uploadMiddleware');

// Admin only route for export (Using /admin/export sub-path to avoid any :id conflicts)
router.get('/admin/export', protect, authorize('admin'), exportPrebookingsExcel);

// All other routes are protected
router.use(protect);

// Default auth for staff/admin
router.use(authorize('admin', 'staff'));

router.route('/')
    .post(createPrebooking)
    .get(getAllPrebookings);

router.route('/:id')
    .get(getPrebookingById)
    .patch(updatePrebooking);

router.post('/:id/call', upload.single('callRecording'), addCallLog);

module.exports = router;
