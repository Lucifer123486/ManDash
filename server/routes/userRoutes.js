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
    .get(authorize('admin'), getUsers)
    .post(authorize('admin'), createUser);

router.route('/:id')
    .get(authorize('admin'), getUser)
    .put(authorize('admin'), updateUser)
    .delete(authorize('admin'), deleteUser);

router.put('/:id/assign-drones', authorize('admin'), assignDrones);

module.exports = router;
