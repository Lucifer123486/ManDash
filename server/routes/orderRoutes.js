const express = require('express');
const router = express.Router();
const {
    createOrder,
    getOrders,
    getOrder,
    updateOrderStatus,
    confirmBooking,
    addDocument,
    getOrderTracking
} = require('../controllers/orderController');
const { protect, authorize } = require('../middleware/auth');

router.use(protect); // All routes require authentication

router.route('/')
    .get(getOrders)
    .post(authorize('admin', 'staff'), createOrder);

router.route('/:id')
    .get(getOrder);

router.put('/:id/status', authorize('admin', 'staff'), updateOrderStatus);
router.put('/:id/confirm', authorize('admin', 'staff'), confirmBooking);
router.post('/:id/documents', authorize('admin', 'staff'), addDocument);
router.get('/:id/tracking', getOrderTracking);

module.exports = router;
