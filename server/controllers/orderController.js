const Order = require('../models/Order');
const Drone = require('../models/Drone');
const User = require('../models/User');
const notificationService = require('../services/notificationService');

// @desc    Create a new order
// @route   POST /api/orders
// @access  Private/Staff
exports.createOrder = async (req, res) => {
    try {
        const {
            poNumber,
            customerId,
            customerName,
            customerEmail,
            customerPhone,
            customerAddress,
            customerPinCode,
            quantity,
            modelNo,
            pricePerUnit,
            expectedDeliveryDate,
            totalAmount
        } = req.body;

        // Generate order number
        const orderNumber = await Order.generateOrderNumber();

        // Calculate total if not provided
        const calculatedTotal = totalAmount || (quantity * (pricePerUnit || 450000));

        const order = await Order.create({
            orderNumber,
            poNumber: poNumber || '',
            customer: customerId || undefined,
            customerName,
            customerEmail,
            customerPhone,
            customerAddress,
            customerPinCode,
            quantity,
            modelNo,
            expectedDeliveryDate,
            totalAmount: calculatedTotal,
            createdBy: req.user._id,
            status: 'booking_confirmed'
        });

        // Update customer's orders array
        if (customerId) {
            await User.findByIdAndUpdate(customerId, {
                $push: { orders: order._id }
            });
        }

        res.status(201).json({
            success: true,
            data: order
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Error creating order',
            error: error.message
        });
    }
};

// @desc    Get all orders
// @route   GET /api/orders
// @access  Private
exports.getOrders = async (req, res) => {
    try {
        const { status, customerId, page = 1, limit = 20 } = req.query;

        let query = {};
        if (status) query.status = status;
        if (customerId) query.customer = customerId;

        // Clients can only see their own orders (ID or Email match)
        if (req.user.role === 'client') {
            query.$or = [
                { customer: req.user._id },
                { customerEmail: req.user.email }
            ];
            delete query.customer; // Clear explicit id check to allow $or
        }

        const orders = await Order.find(query)
            .populate('customer', 'name email phone')
            .populate('drones', 'serialNo manufacturingStatus')
            .populate('createdBy', 'name')
            .sort('-createdAt')
            .skip((page - 1) * limit)
            .limit(parseInt(limit));

        const total = await Order.countDocuments(query);

        res.status(200).json({
            success: true,
            count: orders.length,
            total,
            pages: Math.ceil(total / limit),
            data: orders
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Error fetching orders',
            error: error.message
        });
    }
};

// @desc    Get single order
// @route   GET /api/orders/:id
// @access  Private
exports.getOrder = async (req, res) => {
    try {
        const order = await Order.findById(req.params.id)
            .populate('customer', 'name email phone address')
            .populate({
                path: 'drones',
                populate: {
                    path: 'forms',
                    select: 'formSchema status createdAt'
                }
            })
            .populate('createdBy', 'name');

        if (!order) {
            return res.status(404).json({
                success: false,
                message: 'Order not found'
            });
        }

        // Check if client is accessing their own order (ID or Email)
        const isOwner = order.customer?._id?.toString() === req.user._id.toString();
        const isEmailMatch = order.customerEmail === req.user.email;

        if (req.user.role === 'client' && !isOwner && !isEmailMatch) {
            return res.status(403).json({
                success: false,
                message: 'Not authorized to access this order'
            });
        }

        res.status(200).json({
            success: true,
            data: order
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Error fetching order',
            error: error.message
        });
    }
};

// @desc    Update order status
// @route   PUT /api/orders/:id/status
// @access  Private/Staff/Admin
exports.updateOrderStatus = async (req, res) => {
    try {
        const { status, remarks } = req.body;

        const order = await Order.findById(req.params.id)
            .populate('customer', 'name email phone fcmToken');

        if (!order) {
            return res.status(404).json({
                success: false,
                message: 'Order not found'
            });
        }

        order.status = status;
        if (remarks) order.remarks = remarks;
        await order.save();

        // Send notification to customer
        await notificationService.notifyOrderStatus(order, status);

        res.status(200).json({
            success: true,
            data: order
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Error updating order status',
            error: error.message
        });
    }
};

// @desc    Confirm booking (from prebooking)
// @route   PUT /api/orders/:id/confirm
// @access  Private/Staff
exports.confirmBooking = async (req, res) => {
    try {
        const order = await Order.findById(req.params.id)
            .populate('customer', 'name email phone fcmToken');

        if (!order) {
            return res.status(404).json({
                success: false,
                message: 'Order not found'
            });
        }

        order.status = 'in_manufacturing';
        await order.save();

        // Create drones for the order
        const drones = [];
        for (let i = 0; i < order.quantity; i++) {
            const serialNo = await Drone.generateSerialNo();
            const drone = await Drone.create({
                modelNo: order.modelNo,
                serialNo,
                order: order._id
            });
            drones.push(drone._id);
        }

        // Update order with drones
        order.drones = drones;
        await order.save();

        // Send confirmation SMS
        await notificationService.notifyOrderStatus(order, 'in_manufacturing');

        res.status(200).json({
            success: true,
            data: order
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Error confirming booking',
            error: error.message
        });
    }
};

// @desc    Add document to order
// @route   POST /api/orders/:id/documents
// @access  Private/Staff
exports.addDocument = async (req, res) => {
    try {
        const { name, type, url } = req.body;

        const order = await Order.findByIdAndUpdate(
            req.params.id,
            {
                $push: {
                    documents: { name, type, url }
                }
            },
            { new: true }
        );

        if (!order) {
            return res.status(404).json({
                success: false,
                message: 'Order not found'
            });
        }

        res.status(200).json({
            success: true,
            data: order
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Error adding document',
            error: error.message
        });
    }
};

// @desc    Get order tracking (for clients)
// @route   GET /api/orders/:id/tracking
// @access  Private/Client
exports.getOrderTracking = async (req, res) => {
    try {
        const order = await Order.findById(req.params.id)
            .populate({
                path: 'drones',
                select: 'serialNo manufacturingStatus completedSteps',
                populate: {
                    path: 'completedSteps.formSubmission',
                    select: 'formSchema createdAt',
                    populate: {
                        path: 'formSchema',
                        select: 'formName'
                    }
                }
            });

        if (!order) {
            return res.status(404).json({
                success: false,
                message: 'Order not found'
            });
        }

        // Build tracking timeline
        const statusTimeline = [
            { status: 'booking_confirmed', label: 'Booking Confirmed', date: order.createdAt },
            { status: 'in_manufacturing', label: 'In Manufacturing Process', date: null },
            { status: 'ready_for_testing', label: 'Ready for Testing', date: null },
            { status: 'tested_successfully', label: 'Tested Successfully', date: null },
            { status: 'uin_generated', label: 'UIN Generated', date: null },
            { status: 'uin_transferred_successfully', label: 'UIN Transferred Successfully', date: null },
            { status: 'ready_to_dispatch', label: 'Ready to Dispatch', date: order.dispatchDate },
            { status: 'delivered', label: 'Received/Delivered', date: order.actualDeliveryDate }
        ];

        res.status(200).json({
            success: true,
            data: {
                order: {
                    orderNumber: order.orderNumber,
                    status: order.status,
                    quantity: order.quantity,
                    modelNo: order.modelNo
                },
                timeline: statusTimeline,
                drones: order.drones
            }
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Error fetching tracking',
            error: error.message
        });
    }
};

// @desc    Delete order (Password Protected)
// @route   DELETE /api/orders/:id
// @access  Private/Admin/Staff
exports.deleteOrder = async (req, res) => {
    try {
        const { password } = req.body;

        if (!password) {
            return res.status(400).json({
                success: false,
                message: 'Password is required to delete an order'
            });
        }

        const user = await User.findById(req.user._id).select('+password');
        if (!user) {
            return res.status(404).json({
                success: false,
                message: 'User not found'
            });
        }

        const isMatch = await user.comparePassword(password);
        if (!isMatch) {
            return res.status(401).json({
                success: false,
                message: 'Incorrect password'
            });
        }

        const order = await Order.findById(req.params.id);
        if (!order) {
            return res.status(404).json({
                success: false,
                message: 'Order not found'
            });
        }

        // Remove order reference from customer
        if (order.customer) {
            await User.findByIdAndUpdate(order.customer, {
                $pull: { orders: order._id }
            });
        }

        await order.deleteOne();

        res.status(200).json({
            success: true,
            data: {}
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Error deleting order',
            error: error.message
        });
    }
};
