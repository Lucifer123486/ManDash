const User = require('../models/User');
const Order = require('../models/Order');

// @desc    Get all users
// @route   GET /api/users
// @access  Private/Admin
exports.getUsers = async (req, res) => {
    try {
        const { role, staffType, isActive, page = 1, limit = 20 } = req.query;

        let query = {};
        if (role) {
            query.role = role.includes(',') ? { $in: role.split(',') } : role;
        }
        if (staffType) query.staffType = staffType;
        if (isActive !== undefined) query.isActive = isActive === 'true';

        const users = await User.find(query)
            .sort('-createdAt')
            .skip((page - 1) * limit)
            .limit(parseInt(limit));

        // Robustly fetch orders for each user (match by ID or Email)
        const userIds = users.map(u => u._id);
        const userEmails = users.map(u => u.email);
        
        const allOrders = await Order.find({ 
            $or: [
                { customer: { $in: userIds } },
                { customerEmail: { $in: userEmails } }
            ]
        }).populate('drones');

        // Map orders to users
        const usersWithOrders = users.map(user => {
            const userObj = user.toObject();
            userObj.orders = allOrders.filter(order => 
                (order.customer && order.customer.toString() === user._id.toString()) ||
                (order.customerEmail && order.customerEmail.toLowerCase() === user.email.toLowerCase())
            );
            return userObj;
        });

        const total = await User.countDocuments(query);

        res.status(200).json({
            success: true,
            count: users.length,
            total,
            pages: Math.ceil(total / limit),
            data: usersWithOrders
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Error fetching users',
            error: error.message
        });
    }
};

// @desc    Get single user
// @route   GET /api/users/:id
// @access  Private/Admin
exports.getUser = async (req, res) => {
    try {
        const user = await User.findById(req.params.id)
            .populate('assignedDrones');

        if (!user) {
            return res.status(404).json({
                success: false,
                message: 'User not found'
            });
        }

        // Robustly fetch orders (match by ID or Email)
        const orders = await Order.find({ 
            $or: [
                { customer: user._id },
                { customerEmail: user.email }
            ]
        }).populate('drones');
        
        const userObj = user.toObject();
        userObj.orders = orders;

        res.status(200).json({
            success: true,
            data: userObj
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Error fetching user',
            error: error.message
        });
    }
};

// @desc    Create user (Admin creates staff/client)
// @route   POST /api/users
// @access  Private/Admin
exports.createUser = async (req, res) => {
    try {
        console.log('[DEBUG] createUser request received:', {
            name: req.body.name,
            email: req.body.email,
            role: req.body.role,
            hasDocs: !!(req.body.certificate10th || req.body.aadharCard || req.body.idProof)
        });

        const {
            name, email, password, role, staffType, phone, address, pinCode,
            certificate10th, aadharCard, idProof, egcaId, hasAMC, hasASS, amcStartDate, assStartDate
        } = req.body;

        // If staff is creating, they can ONLY create clients
        if (req.user.role === 'staff' && role !== 'client') {
            return res.status(403).json({
                success: false,
                message: 'Staff can only create client users'
            });
        }

        const existingUser = await User.findOne({ email });
        if (existingUser) {
            return res.status(400).json({
                success: false,
                message: 'Email already registered'
            });
        }

        console.log('[DEBUG] Attempting to create user in DB...');
        const user = await User.create({
            name,
            email,
            password,
            role,
            staffType: role === 'staff' ? staffType : undefined,
            phone,
            address,
            pinCode,
            // Only assign client-specific fields if role is client
            certificate10th: role === 'client' ? certificate10th : undefined,
            aadharCard: role === 'client' ? aadharCard : undefined,
            idProof: role === 'client' ? idProof : undefined,
            egcaId: role === 'client' ? egcaId : undefined,
            hasAMC: role === 'client' ? hasAMC : false,
            hasASS: role === 'client' ? hasASS : false,
            amcStartDate: role === 'client' ? amcStartDate : undefined,
            assStartDate: role === 'client' ? assStartDate : undefined,
            freeServicesUsed: role === 'client' ? 0 : 0, // Ensure it's 0 for non-clients
            createdBy: req.user._id
        });
        console.log('[DEBUG] User created successfully:', user._id);

        res.status(201).json({
            success: true,
            data: {
                id: user._id,
                name: user.name,
                email: user.email,
                role: user.role
            }
        });
    } catch (error) {
        console.error('[DEBUG] createUser Error:', error);
        res.status(500).json({
            success: false,
            message: 'Error creating user',
            error: error.message
        });
    }
};

// @desc    Update user
// @route   PUT /api/users/:id
// @access  Private/Admin
exports.updateUser = async (req, res) => {
    try {
        const {
            name, email, phone, address, pinCode, isActive, role, staffType,
            certificate10th, aadharCard, idProof, egcaId, hasAMC, hasASS, amcStartDate, assStartDate
        } = req.body;

        // If staff is updating, they can only update clients
        if (req.user.role === 'staff') {
            const targetUser = await User.findById(req.params.id);
            if (!targetUser || targetUser.role !== 'client') {
                return res.status(403).json({
                    success: false,
                    message: 'Staff can only update client users'
                });
            }
        }

        const updateData = {
            name, email, phone, address, pinCode, isActive, role
        };

        // Only update client-specific fields if role is client
        if (role === 'client') {
            updateData.certificate10th = certificate10th;
            updateData.aadharCard = aadharCard;
            updateData.idProof = idProof;
            updateData.egcaId = egcaId;
            updateData.hasAMC = hasAMC;
            updateData.hasASS = hasASS;
            updateData.amcStartDate = amcStartDate;
            updateData.assStartDate = assStartDate;
        } else {
            // Remove these fields if role is not client (optional but cleaner)
            updateData.hasAMC = false;
            updateData.hasASS = false;
            updateData.freeServicesUsed = 0;
            updateData.$unset = { 
                certificate10th: 1, 
                aadharCard: 1, 
                idProof: 1, 
                egcaId: 1,
                amcStartDate: 1,
                assStartDate: 1
            };
        }
        // Only update staffType if role is staff, otherwise remove it
        if (role === 'staff') {
            updateData.staffType = staffType;
        } else {
            updateData.$unset = { staffType: 1 };
        }

        const user = await User.findByIdAndUpdate(
            req.params.id,
            updateData,
            { new: true, runValidators: true }
        );

        if (!user) {
            return res.status(404).json({
                success: false,
                message: 'User not found'
            });
        }

        res.status(200).json({
            success: true,
            data: user
        });
    } catch (error) {
        require('fs').appendFileSync('error_debug.log', `[updateUser error] ${error.stack}\n`);
        res.status(500).json({
            success: false,
            message: 'Error updating user',
            error: error.message
        });
    }
};

// @desc    Delete user (hard delete)
// @route   DELETE /api/users/:id
// @access  Private/Admin
exports.deleteUser = async (req, res) => {
    try {
        const user = await User.findByIdAndDelete(req.params.id);

        if (!user) {
            return res.status(404).json({
                success: false,
                message: 'User not found'
            });
        }

        res.status(200).json({
            success: true,
            message: 'User deleted successfully'
        });
    } catch (error) {
        require('fs').appendFileSync('error_debug.log', `[deleteUser error] ${error.stack}\n`);
        res.status(500).json({
            success: false,
            message: 'Error deleting user',
            error: error.message
        });
    }
};

// @desc    Assign drones to staff
// @route   PUT /api/users/:id/assign-drones
// @access  Private/Admin
exports.assignDrones = async (req, res) => {
    try {
        const { droneIds } = req.body;

        const user = await User.findByIdAndUpdate(
            req.params.id,
            { assignedDrones: droneIds },
            { new: true }
        ).populate('assignedDrones');

        if (!user) {
            return res.status(404).json({
                success: false,
                message: 'User not found'
            });
        }

        res.status(200).json({
            success: true,
            data: user
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Error assigning drones',
            error: error.message
        });
    }
};
