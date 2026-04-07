const express = require('express');
const router = express.Router();
const { register, login, getMe, updateFcmToken, logout } = require('../controllers/authController');
const { protect } = require('../middleware/auth');

router.post('/register', register);
router.post('/login', login);
router.get('/me', protect, getMe);
router.put('/fcm-token', protect, updateFcmToken);
router.post('/logout', protect, logout);
router.post('/verify-signature', protect, require('../controllers/authController').verifySignature);

module.exports = router;
