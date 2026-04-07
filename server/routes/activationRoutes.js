const express = require('express');
const router = express.Router();
const activationController = require('../controllers/activationController');
const { protect } = require('../middleware/auth');

// Allow staff and admins
router.use(protect);

router.get('/', activationController.getAllRecords);
router.get('/export/excel', activationController.exportExcel);
router.get('/:droneId', activationController.getRecord);
router.post('/:droneId', activationController.saveRecord);

module.exports = router;
