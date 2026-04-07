const express = require('express');
const router = express.Router();
const Ticket = require('../models/Ticket');
const Order = require('../models/Order');
const User = require('../models/User');
const { sendEmail } = require('../services/emailService');
const { protect } = require('../middleware/auth');
const fs = require('fs');
const path = require('path');
const upload = require('../middleware/uploadMiddleware');
const xlsx = require('xlsx');

const logError = (msg, err) => {
    const logPath = path.join(__dirname, '../error.log');
    const content = `${new Date().toISOString()} - ${msg}\n${err?.stack || err}\n\n`;
    try {
        fs.appendFileSync(logPath, content);
    } catch (e) {
        console.error("Failed to write to log file:", e);
    }
};

// @desc    Export tickets to Excel
// @route   GET /api/tickets/export/excel
// @access  Private (Admin/Staff)
router.get('/export/excel', protect, async (req, res) => {
    try {
        let query = {};
        if (req.user.role === 'client') {
            query.user = req.user._id;
        } else if (req.query.user) {
            query.user = req.query.user;
        }
        if (req.query.category) {
            query.category = req.query.category;
        }

        const tickets = await Ticket.find(query)
            .populate('user', 'name email role')
            .populate('client', 'name email role')
            .populate('assignedTo', 'name email')
            .populate('resolvedBy', 'name')
            .populate('allocatedEngineer', 'name')
            .sort({ createdAt: -1 });

        const ExcelJS = require('exceljs');
        const workbook = new ExcelJS.Workbook();
        const worksheet = workbook.addWorksheet('Tickets');

        // Define columns
        worksheet.columns = [
            { header: 'Ticket Number', key: 'ticketNumber', width: 15 },
            { header: 'Status', key: 'status', width: 15 },
            { header: 'Customer Name', key: 'customerName', width: 25 },
            { header: 'Customer Mobile', key: 'customerMobile', width: 18 },
            { header: 'Location', key: 'customerLocation', width: 20 },
            { header: 'Drone Serial No', key: 'droneSerialNumber', width: 20 },
            { header: 'Date Of Purchase', key: 'dateOfPurchase', width: 18 },
            { header: 'Warranty Status', key: 'warrantyStatus', width: 15 },
            { header: 'Problem Type', key: 'problemType', width: 20 },
            { header: 'Issue Description', key: 'issueDescription', width: 40 },
            { header: 'Component', key: 'issueComponent', width: 30 },
            { header: 'Action Taken', key: 'actionToBeTaken', width: 20 },
            { header: 'Interactions', key: 'interactions', width: 15 },
            { header: 'Allocated Engineer', key: 'allocatedEngineer', width: 25 },
            { header: 'Resolution Note', key: 'resolutionNotes', width: 35 },
            { header: 'Remarks', key: 'remarks', width: 35 },
            { header: 'Final Resolution Time', key: 'finalResolutionTime', width: 20 },
            { header: 'Created At', key: 'createdAt', width: 20 }
        ];

        // Add rows
        tickets.forEach(t => {
            worksheet.addRow({
                ticketNumber: t.ticketNumber || '-',
                status: t.status || '-',
                customerName: t.customerName || t.client?.name || t.user?.name || '-',
                customerMobile: t.customerMobile || '-',
                customerLocation: t.customerLocation || '-',
                droneSerialNumber: t.droneSerialNumber || '-',
                dateOfPurchase: t.dateOfPurchase ? new Date(t.dateOfPurchase).toLocaleDateString('en-GB') : '-',
                warrantyStatus: t.warrantyStatus === true ? 'Yes' : (t.warrantyStatus === false ? 'No' : '-'),
                problemType: t.problemType || '-',
                issueDescription: t.issueDescription || t.problemDescription || '-',
                issueComponent: t.issueComponent || '-',
                actionToBeTaken: t.actionToBeTaken || '-',
                interactions: t.callLogs ? t.callLogs.length : 0,
                allocatedEngineer: t.allocatedEngineer?.name || '-',
                resolutionNotes: t.resolutionNotes || '-',
                remarks: t.serviceEngineerRemarks || '-',
                finalResolutionTime: t.finalResolutionTime || '-',
                createdAt: new Date(t.createdAt).toLocaleDateString('en-GB')
            });
        });

        if (tickets.length === 0) {
            worksheet.addRow({});
        }

        // Style header row
        const headerRow = worksheet.getRow(1);
        headerRow.font = { bold: true, color: { argb: 'FFFFFFFF' } };
        headerRow.fill = {
            type: 'pattern',
            pattern: 'solid',
            fgColor: { argb: 'FF4CAF50' } // Green background
        };
        headerRow.alignment = { vertical: 'middle', horizontal: 'center' };
        
        // Auto filter
        worksheet.autoFilter = {
            from: { row: 1, column: 1 },
            to: { row: 1, column: 18 }
        };

        const excelBuffer = await workbook.xlsx.writeBuffer();

        res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
        res.setHeader('Content-Disposition', 'attachment; filename=Tickets.xlsx');
        res.status(200).send(excelBuffer);
    } catch (err) {
        logError('Export tickets error', err);
        res.status(500).json({ success: false, message: 'Error exporting tickets', error: err.message });
    }
});

// @desc    Create a new ticket
// @route   POST /api/tickets
// @access  Private (Client/Staff)
router.post('/', protect, async (req, res) => {
    try {
        const {
            category, issueDescription, orderId,
            customerEmail, customerName, customerMobile, customerLocation,
            droneSerialNumber, dateOfPurchase, warrantyStatus,
            problemDescription, photoVideoReceived, problemCategory,
            contactedCustomerAt, actionToBeTaken, finalResolutionTime,
            assignedTo, problemType
        } = req.body;
        let serviceType = 'support';

        // Handle Service Requests
        if (orderId && (category === 'Service' || category === 'Maintenance')) {
            const order = await Order.findById(orderId);
            if (!order) {
                return res.status(404).json({ success: false, message: 'Order not found' });
            }

            // Check if free services remaining
            // Treat undefined as 0
            const currentUsed = order.freeServicesUsed || 0;

            if (currentUsed < 6) {
                serviceType = 'free_service';
                order.freeServicesUsed = currentUsed + 1;
                try {
                    await order.save();
                    // Snapshot the count for this ticket (current usage is now +1)
                    req.body.serviceCount = order.freeServicesUsed;
                } catch (orderErr) {
                    logError('Order save error', orderErr);
                    return res.status(500).json({
                        success: false,
                        message: 'Error updating order service count',
                        error: orderErr.message
                    });
                }
            } else {
                // Strict validation: Block request if limit reached, unless it's explicitly paid (but UI handles paid separately usually)
                // For now, if category is Service and limit reached, we return error as per user request
                return res.status(400).json({
                    success: false,
                    message: 'Free service limit reached (6/6). Please contact support for paid service.'
                });
            }
        }

        try {
            const ticketData = {
                user: req.user._id,
                category: category || 'Support', // Fallback to 'Support'
                issueDescription: issueDescription || problemDescription, // fallback
                order: orderId,
                serviceType,
                serviceCount: req.body.serviceCount, // Save the snapshot

                // New Form Fields
                customerEmail, customerName, customerMobile, customerLocation,
                droneSerialNumber, dateOfPurchase, warrantyStatus,
                problemDescription, photoVideoReceived, problemCategory,
                contactedCustomerAt, actionToBeTaken, finalResolutionTime, problemType,
                client: req.body.client,

                status: 'initial',
                slaStartTime: new Date(),
                initialReportBy: req.user._id
            };

            // Auto-assign to the only Service Engineer
            const seUser = await User.findOne({ role: 'staff', staffType: 'service_engineer' });

            if (assignedTo || seUser) {
                ticketData.assignedTo = assignedTo || seUser._id;
                ticketData.assignmentStatus = 'pending_acceptance';
            }

            const ticket = await Ticket.create(ticketData);

            // Notify SE
            if (ticket.assignedTo) {
                const assigneeUser = await User.findById(ticket.assignedTo);
                if (assigneeUser && assigneeUser.email) {
                    const subject = `New Support Ticket Assigned: ${ticket.ticketNumber || 'Ticket'}`;
                    const html = `
                    <h2>New Ticket Assignment</h2>
                    <p>Hello ${seUser.name},</p>
                    <p>You have been assigned a new support ticket.</p>
                    <ul>
                        <li><strong>Ticket Number:</strong> ${ticket.ticketNumber || 'N/A'}</li>
                        <li><strong>Customer Name:</strong> ${ticket.customerName || 'N/A'}</li>
                        <li><strong>Problem:</strong> ${ticket.problemDescription || 'N/A'}</li>
                        <li><strong>Category:</strong> ${ticket.problemCategory || ticket.category || 'N/A'}</li>
                </ul>
                <p>Please log in to the ManDash portal to view this ticket.</p>
                `;
                    sendEmail(assigneeUser.email, subject, html).catch(err => logError('SE Email send error', err));
                }
            }

            res.status(201).json({
                success: true,
                data: ticket
            });
        } catch (ticketErr) {
            logError('Ticket create error', ticketErr);
            return res.status(500).json({
                success: false,
                message: 'Error creating ticket record',
                error: ticketErr.message
            });
        }
    } catch (err) {
        logError('General ticket error', err);
        res.status(500).json({
            success: false,
            message: 'Server error parsing request',
            error: err.message
        });
    }
});

// @desc    Get all tickets (Admin sees all, User sees theirs)
// @route   GET /api/tickets
// @access  Private
router.get('/', protect, async (req, res) => {
    try {
        let query = {};

        if (req.user.role === 'client') {
            query.user = req.user._id;
        } else if (req.query.user) {
            query.user = req.query.user;
        }

        if (req.query.category) {
            query.category = req.query.category;
        }

        const tickets = await Ticket.find(query)
            .populate({
                path: 'user',
                select: 'name email role hasAMC hasASS orders',
                populate: {
                    path: 'orders',
                    populate: { path: 'drones', select: 'serialNo' }
                }
            })
            .populate({
                path: 'client',
                select: 'name email role hasAMC hasASS orders',
                populate: {
                    path: 'orders',
                    populate: { path: 'drones', select: 'serialNo' }
                }
            })
            .populate('assignedTo', 'name email role staffType')
            .populate('resolvedBy', 'name')
            .sort({ createdAt: -1 });

        res.status(200).json({
            success: true,
            count: tickets.length,
            data: tickets
        });
    } catch (err) {
        logError('Fetch tickets error', err);
        res.status(500).json({
            success: false,
            message: 'Error fetching tickets',
            error: err.message
        });
    }
});

// @desc    Update ticket status (Resolve, Reject, In Progress)
// @route   PATCH /api/tickets/:id/status
// @access  Private (Admin/Staff)
router.patch('/:id/status', protect, async (req, res) => {
    try {
        const {
            status,
            resolutionNotes,
            serviceEngineerRemarks,
            geotagPhoto,
            actionToBeTaken,
            customerEmail,
            customerLocation,
            dateOfPurchase,
            warrantyStatus,
            photoVideoReceived,
            problemCategory,
            contactedCustomerAt,
            finalResolutionTime,
            issueDescription,
            actionToBeTakenOtherReason,
            finalResolutionStatus,
            finalResolutionOtherReason,
            issueComponent,
            issueQuestion,
            issueAnswer,
            customerMedia,
            allocatedEngineer
        } = req.body;

        if (req.user.role === 'client') {
            return res.status(403).json({ success: false, message: 'Not authorized' });
        }

        const ticket = await Ticket.findById(req.params.id);

        if (!ticket) {
            return res.status(404).json({ success: false, message: 'Ticket not found' });
        }

        // Validate status
        const validStatuses = ['initial', 'open', 'in_progress', 'resolved', 'rejected'];
        if (status && !validStatuses.includes(status)) {
            return res.status(400).json({ success: false, message: 'Invalid status' });
        }

        if (status) ticket.status = status;

        // If resolving or rejecting, set resolvedBy/At and notes
        if (status === 'resolved' || status === 'rejected') {
            ticket.resolvedBy = req.user._id;
            ticket.resolvedAt = Date.now();
            ticket.resolutionNotes = resolutionNotes || (status === 'rejected' ? 'Request rejected.' : 'Resolved by support team.');
            if (serviceEngineerRemarks) ticket.serviceEngineerRemarks = serviceEngineerRemarks;
            if (geotagPhoto) ticket.geotagPhoto = geotagPhoto;
            if (actionToBeTaken) ticket.actionToBeTaken = actionToBeTaken;
            if (actionToBeTakenOtherReason) ticket.actionToBeTakenOtherReason = actionToBeTakenOtherReason;
            if (finalResolutionStatus) ticket.finalResolutionStatus = finalResolutionStatus;
            if (finalResolutionOtherReason) ticket.finalResolutionOtherReason = finalResolutionOtherReason;
            if (issueComponent) ticket.issueComponent = issueComponent;
            if (issueQuestion) ticket.issueQuestion = issueQuestion;
            if (issueAnswer) ticket.issueAnswer = issueAnswer;
            if (customerMedia) ticket.customerMedia = customerMedia;
            if (allocatedEngineer) ticket.allocatedEngineer = allocatedEngineer;

            // New detailed fields
            if (customerEmail) ticket.customerEmail = customerEmail;
            if (customerLocation) ticket.customerLocation = customerLocation;
            if (dateOfPurchase) ticket.dateOfPurchase = dateOfPurchase;
            if (warrantyStatus !== undefined) ticket.warrantyStatus = warrantyStatus;
            if (photoVideoReceived !== undefined) ticket.photoVideoReceived = photoVideoReceived;
            if (problemCategory) ticket.problemCategory = problemCategory;
            if (contactedCustomerAt) ticket.contactedCustomerAt = contactedCustomerAt;
            if (finalResolutionTime) ticket.finalResolutionTime = finalResolutionTime;
            if (issueDescription) ticket.issueDescription = issueDescription;

            // FREE SERVICES TRACKER LOGIC
            // Ensure we don't double count, and exclude manufacturing issues
            console.log('Resolving ticket status:', status, 'isServiceCounted:', ticket.isServiceCounted, 'problemType:', ticket.problemType);
            if (status === 'resolved' && !ticket.isServiceCounted && ticket.problemType !== 'Manufacturing issue') {
                try {
                    // Try to use the explicit 'client' association, fallback to 'user' creator
                    const clientId = ticket.client || ticket.user;
                    console.log('Found clientId for tracker:', clientId);
                    if (clientId) {
                        const clientUser = await User.findById(clientId);
                        if (clientUser) {
                            console.log('Client user before increment:', clientUser.freeServicesUsed);
                            // Only increment if below the maximum limit of 6
                            const currentUsed = clientUser.freeServicesUsed || 0;
                            if (currentUsed < 6) {
                                clientUser.freeServicesUsed = currentUsed + 1;
                                await clientUser.save();
                                console.log('Successfully incremented free services. New count:', clientUser.freeServicesUsed);
                            } else {
                                console.log('Max free services reached (6).');
                            }
                        } else {
                            console.log('Client user not found in DB for ID:', clientId);
                        }
                    }
                    // Mark as counted regardless of client found or not (so we don't keep trying)
                    ticket.isServiceCounted = true;
                } catch (serviceErr) {
                    console.error('Error updating free services count', serviceErr);
                    logError('Error updating free services count', serviceErr);
                    // Don't block ticket resolution because of this error, but do log it
                }
            } else if (status === 'resolved' && !ticket.isServiceCounted && ticket.problemType === 'Manufacturing issue') {
                console.log('Ticket is Manufacturing issue, skipping free services increment.');
                // If it is a manufacturing issue, mark it as counted so we bypass it in future updates
                ticket.isServiceCounted = true;
            }
        } else if (status === 'in_progress') {
            // Check SLA breach if transitioning from initial to in_progress
            if (ticket.slaStartTime) {
                const timeDiff = Date.now() - new Date(ticket.slaStartTime).getTime();
                const fiveMins = 5 * 60 * 1000;
                if (timeDiff > fiveMins) {
                    ticket.slaBreached = true;
                }
            }
            if (resolutionNotes) ticket.resolutionNotes = resolutionNotes;
        }

        await ticket.save();

        res.status(200).json({
            success: true,
            data: ticket
        });
    } catch (err) {
        logError('Update ticket status error', err);
        res.status(500).json({
            success: false,
            message: 'Error resolving ticket',
            error: err.message
        });
    }
});

// @desc    Assign ticket to Service Engineer
// @route   PATCH /api/tickets/:id/assign
// @access  Private (Admin/Staff)
router.patch('/:id/assign', protect, async (req, res) => {
    try {
        if (req.user.role !== 'admin' && req.user.staffType !== 'call_centre_staff') {
            return res.status(403).json({ success: false, message: 'Only Admin or Call Centre Staff can assign tickets' });
        }

        const { assignedTo } = req.body;
        if (!assignedTo) {
            return res.status(400).json({ success: false, message: 'assignedTo user ID is required' });
        }

        const ticket = await Ticket.findById(req.params.id);
        if (!ticket) {
            return res.status(404).json({ success: false, message: 'Ticket not found' });
        }

        ticket.assignedTo = assignedTo;
        ticket.assignmentStatus = 'pending_acceptance';

        await ticket.save();

        // Send Email Notification to SE
        const seUser = await User.findById(assignedTo);
        console.log('[DEBUG] Assigned ticket. assignedTo:', assignedTo, 'seUser found:', !!seUser, 'has email:', seUser?.email);

        if (seUser && seUser.email) {
            const subject = `New Support Ticket Assigned: ${ticket.ticketNumber || 'Ticket'}`;
            const html = `
            <h2>New Ticket Assignment</h2>
            <p>Hello ${seUser.name},</p>
            <p>You have been assigned a new support ticket.</p>
            <ul>
                <li><strong>Ticket Number:</strong> ${ticket.ticketNumber || 'N/A'}</li>
                <li><strong>Customer Name:</strong> ${ticket.customerName || 'N/A'}</li>
                <li><strong>Problem:</strong> ${ticket.problemDescription || 'N/A'}</li>
                <li><strong>Category:</strong> ${ticket.problemCategory || 'N/A'}</li>
            </ul>
            <p>Please log in to the ManDash portal to Accept or Reject this ticket.</p>
            `;
            console.log(`[DEBUG] Attempting to send email to ${seUser.email}`);
            // Fire and forget
            sendEmail(seUser.email, subject, html)
                .then(res => console.log('[DEBUG] sendEmail result:', res))
                .catch(err => logError('SE Email send error', err));
        }

        res.status(200).json({
            success: true,
            data: ticket
        });
    } catch (err) {
        logError('Assign ticket error', err);
        res.status(500).json({ success: false, message: 'Error assigning ticket', error: err.message });
    }
});

// @desc    Service Engineer Accepts or Rejects ticket
// @route   PATCH /api/tickets/:id/respond
// @access  Private (Staff - Service Engineer)
router.patch('/:id/respond', protect, async (req, res) => {
    try {
        const { action, rejectionReason } = req.body; // 'accept' or 'reject'

        if (!['accept', 'reject'].includes(action)) {
            return res.status(400).json({ success: false, message: 'Invalid action. Use accept or reject.' });
        }
        if (action === 'reject' && !rejectionReason) {
            return res.status(400).json({ success: false, message: 'Rejection reason is required.' });
        }

        const ticket = await Ticket.findById(req.params.id);
        if (!ticket) {
            return res.status(404).json({ success: false, message: 'Ticket not found' });
        }

        // Verify the user responding is the assigned SE
        if (ticket.assignedTo?.toString() !== req.user._id.toString()) {
            return res.status(403).json({ success: false, message: 'Not authorized to respond to this ticket' });
        }

        if (action === 'accept') {
            ticket.assignmentStatus = 'accepted';
            ticket.status = 'in_progress';
        } else if (action === 'reject') {
            ticket.assignmentStatus = 'rejected';
            ticket.rejectionReason = rejectionReason;
            ticket.assignedTo = null; // Clear assignment so staff can reassign
        }

        // Notify STAFF/ADMIN about the response
        try {
            const staffUsers = await User.find({ role: { $in: ['staff', 'admin'] } });

            // Emitting Socket Events and Saving In-App Notifications
            const io = req.app.get('io');
            const title = action === 'accept' ? 'Ticket Accepted' : 'Ticket Rejected';
            const message = action === 'accept'
                ? `Service Engineer (${req.user.name}) accepted ticket ${ticket.ticketNumber || ticket._id}.`
                : `Service Engineer (${req.user.name}) rejected ticket ${ticket.ticketNumber || ticket._id}. Reason: ${rejectionReason}`;
            const notifType = action === 'accept' ? 'ticket_accepted' : 'ticket_rejected';
            const link = '/admin/support'; // Redirect link

            for (const staff of staffUsers) {
                // Create DB record
                const notif = await require('../models/InAppNotification').create({
                    user: staff._id,
                    title,
                    message,
                    type: notifType,
                    link
                });

                // Emit to online users
                if (io) {
                    io.to(staff._id.toString()).emit('new_notification', notif);
                }
            }

            // Email fallback for Rejection only (to keep existing behavior intact)
            if (action === 'reject') {
                const staffEmails = staffUsers.map(u => u.email).filter(Boolean);
                if (staffEmails.length > 0) {
                    const subject = `Ticket Rejected: ${ticket.ticketNumber || 'Ticket'}`;
                    const html = `
                    <h2>Service Engineer Rejected Ticket</h2>
                    <p>A Support Ticket has been rejected by the Service Engineer (${req.user.name}).</p>
                    <ul>
                        <li><strong>Ticket Number:</strong> ${ticket.ticketNumber || 'N/A'}</li>
                        <li><strong>Reason:</strong> ${rejectionReason}</li>
                    </ul>
                    <p>Please log in to re-assign this ticket to another Service Engineer.</p>
                    `;
                    staffEmails.forEach(email => {
                        sendEmail(email, subject, html).catch(e => console.error(e));
                    });
                }
            }
        } catch (notifyErr) {
            console.error("Failed to notify staff:", notifyErr);
        }

        await ticket.save();

        res.status(200).json({
            success: true,
            data: ticket
        });
    } catch (err) {
        logError('SE ticket respond error', err);
        res.status(500).json({ success: false, message: 'Error responding to ticket', error: err.message });
    }
});

// @desc    Add a call log to a ticket
// @route   POST /api/tickets/:id/calls
// @access  Private (Admin/Staff)
router.post('/:id/calls', protect, upload.single('callRecording'), async (req, res) => {
    console.log('[DEBUG] Incoming add call log. Headers:', req.headers['content-type']);
    console.log('[DEBUG] req.body:', req.body);
    try {
        const body = req.body || {};
        const { 
            timeContacted, duration, notes, specialNote,
            customerEmail, customerLocation, droneSerialNumber,
            issueComponent, issueDescription, photoVideoReceived,
            actionToBeTaken, actionToBeTakenOtherReason,
            finalResolutionStatus, finalResolutionOtherReason,
            finalResolutionTime, serviceEngineerRemarks,
            geotagPhoto, isFinalResolution
        } = body;

        const ticket = await Ticket.findById(req.params.id);
        if (!ticket) {
            return res.status(404).json({ success: false, message: 'Ticket not found' });
        }

        const callRecording = req.file ? `/${req.file.path.replace(/\\/g, '/')}` : undefined;

        const newLog = {
            timeContacted,
            duration,
            notes,
            specialNote,
            callRecording,
            
            // Detailed resolution fields
            customerEmail,
            customerLocation,
            droneSerialNumber,
            issueComponent,
            issueDescription,
            photoVideoReceived: photoVideoReceived === 'true',
            actionToBeTaken,
            actionToBeTakenOtherReason,
            finalResolutionStatus,
            finalResolutionOtherReason,
            finalResolutionTime,
            serviceEngineerRemarks,
            geotagPhoto,
            
            loggedBy: req.user._id
        };

        ticket.callLogs = ticket.callLogs || [];
        ticket.callLogs.push(newLog);

        // If this is a final resolution, update the main ticket fields as well
        if (isFinalResolution === 'true' || isFinalResolution === true) {
            ticket.status = 'resolved';
            ticket.resolvedBy = req.user._id;
            ticket.resolvedAt = Date.now();
            ticket.resolutionNotes = notes || 'Resolved via final call log.';
            
            if (serviceEngineerRemarks) ticket.serviceEngineerRemarks = serviceEngineerRemarks;
            if (geotagPhoto) ticket.geotagPhoto = geotagPhoto;
            if (actionToBeTaken) ticket.actionToBeTaken = actionToBeTaken;
            if (actionToBeTakenOtherReason) ticket.actionToBeTakenOtherReason = actionToBeTakenOtherReason;
            if (finalResolutionStatus) ticket.finalResolutionStatus = finalResolutionStatus;
            if (finalResolutionOtherReason) ticket.finalResolutionOtherReason = finalResolutionOtherReason;
            if (issueComponent) ticket.issueComponent = issueComponent;
            if (customerEmail) ticket.customerEmail = customerEmail;
            if (customerLocation) ticket.customerLocation = customerLocation;
            if (droneSerialNumber) ticket.droneSerialNumber = droneSerialNumber;
            if (issueDescription) ticket.issueDescription = issueDescription;
            if (finalResolutionTime) ticket.finalResolutionTime = finalResolutionTime;
            if (photoVideoReceived !== undefined) ticket.photoVideoReceived = photoVideoReceived === 'true';

            // Special logic for free services (same as the patch route)
            if (!ticket.isServiceCounted && ticket.problemType !== 'Manufacturing issue') {
                const clientId = ticket.client || ticket.user;
                if (clientId) {
                    const clientUser = await User.findById(clientId);
                    if (clientUser && (clientUser.freeServicesUsed || 0) < 6) {
                        clientUser.freeServicesUsed = (clientUser.freeServicesUsed || 0) + 1;
                        await clientUser.save();
                        ticket.isServiceCounted = true;
                    }
                }
            }
        }

        await ticket.save();

        res.status(200).json({
            success: true,
            data: ticket
        });
    } catch (err) {
        logError('Add call log error', err);
        res.status(500).json({
            success: false,
            message: 'Error adding call log',
            error: err.message
        });
    }
});

// @desc    Upload Geotagged Photo
// @route   POST /api/tickets/upload-photo
// @access  Private (Staff)
router.post('/upload-photo', protect, upload.single('geotagPhoto'), async (req, res) => {
    try {
        console.log('[DEBUG] Photo upload request received. File:', req.file ? req.file.filename : 'none');
        if (!req.file) {
            return res.status(400).json({ success: false, message: 'Please upload a photo' });
        }

        // Use the actual path from Multer, ensuring it starts with / and uses forward slashes
        const filePath = `/${req.file.path.replace(/\\/g, '/')}`;
        console.log('[DEBUG] Returning file path:', filePath);

        res.status(200).json({
            success: true,
            data: filePath
        });
    } catch (err) {
        logError('Upload photo error', err);
        res.status(500).json({ success: false, message: 'Error uploading photo', error: err.message });
    }
});

module.exports = router;
