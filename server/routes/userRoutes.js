const express = require('express');
const router = express.Router();
const {
    getUsers,
    getUser,
    createUser,
    updateUser,
    deleteUser,
    assignDrones
} = require('../controllers/userController');
const { protect, authorize } = require('../middleware/auth');

router.use(protect); // All routes require authentication

router.route('/')
    .get(authorize('admin', 'staff'), getUsers)
    .post(authorize('admin', 'staff'), createUser);

router.route('/:id')
    .get(authorize('admin', 'staff'), getUser)
    .put(authorize('admin', 'staff'), updateUser)
    .delete(authorize('admin'), deleteUser);

router.put('/:id/assign-drones', authorize('admin'), assignDrones);

module.exports = router;
