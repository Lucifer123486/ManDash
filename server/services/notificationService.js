const admin = require('firebase-admin');
const User = require('../models/User');
const smsService = require('./smsService');
const emailService = require('./emailService');

// Initialize Firebase Admin SDK
// Note: You need to add your Firebase service account credentials
let firebaseInitialized = false;

const initializeFirebase = () => {
    if (!firebaseInitialized && process.env.FIREBASE_PROJECT_ID) {
        try {
            admin.initializeApp({
                credential: admin.credential.cert({
                    projectId: process.env.FIREBASE_PROJECT_ID,
                    privateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
                    clientEmail: process.env.FIREBASE_CLIENT_EMAIL
                })
            });
            firebaseInitialized = true;
            console.log('Firebase Admin SDK initialized');
        } catch (error) {
            console.error('Firebase initialization error:', error);
        }
    }
};

initializeFirebase();

// Send push notification to a single device
const sendToDevice = async (fcmToken, title, body, data = {}) => {
    if (!firebaseInitialized || !fcmToken) {
        console.log('FCM not initialized or no token provided');
        return null;
    }

    try {
        const message = {
            notification: {
                title,
                body
            },
            data: {
                ...data,
                click_action: 'FLUTTER_NOTIFICATION_CLICK'
            },
            token: fcmToken
        };

        const response = await admin.messaging().send(message);
        console.log('Successfully sent message:', response);
        return response;
    } catch (error) {
        console.error('Error sending message:', error);
        return null;
    }
};

// Send to multiple devices
const sendToMultipleDevices = async (fcmTokens, title, body, data = {}) => {
    if (!firebaseInitialized || !fcmTokens?.length) {
        return null;
    }

    try {
        const message = {
            notification: {
                title,
                body
            },
            data: {
                ...data,
                click_action: 'FLUTTER_NOTIFICATION_CLICK'
            },
            tokens: fcmTokens
        };

        const response = await admin.messaging().sendEachForMulticast(message);
        console.log('Sent to multiple devices:', response);
        return response;
    } catch (error) {
        console.error('Error sending to multiple devices:', error);
        return null;
    }
};

// Notify admins about form submission
const notifyFormSubmission = async (submission, schema) => {
    try {
        const admins = await User.find({ role: 'admin', fcmToken: { $ne: null } });
        const tokens = admins.map(a => a.fcmToken).filter(Boolean);

        if (tokens.length > 0) {
            await sendToMultipleDevices(
                tokens,
                'New Form Submission',
                `${schema.formName} has been submitted and requires approval`,
                {
                    type: 'form_submission',
                    submissionId: submission._id.toString(),
                    formCode: schema.formCode
                }
            );
        }
    } catch (error) {
        console.error('Error notifying form submission:', error);
    }
};

// Notify user about submission status change
const notifySubmissionStatus = async (submission, status) => {
    try {
        const user = submission.submittedBy;
        if (user?.fcmToken) {
            const statusMessages = {
                approved: 'Your form submission has been approved',
                rejected: 'Your form submission has been rejected',
                revision_required: 'Your form submission requires revision'
            };

            await sendToDevice(
                user.fcmToken,
                'Submission Update',
                statusMessages[status] || `Submission status changed to ${status}`,
                {
                    type: 'submission_status',
                    submissionId: submission._id.toString(),
                    status
                }
            );
        }
    } catch (error) {
        console.error('Error notifying submission status:', error);
    }
};

// Notify customer about order status
const notifyOrderStatus = async (order, status) => {
    try {
        const customer = order.customer;

        // Notification messages for each status
        const notificationMap = {
            pending: { check: null, title: 'Order Received', body: `Your order ${order.orderNumber} has been received and is pending confirmation` },
            confirmed: { check: 'orderConfirmed', title: 'Order Confirmed', body: `Your order ${order.orderNumber} has been confirmed. Manufacturing will begin soon.` },
            in_manufacturing: { check: 'inManufacturing', title: 'Manufacturing Started', body: `Great news! Your drone is now in manufacturing process` },
            ready_for_testing: { check: 'readyForTesting', title: 'Testing Phase', body: `Your drone is ready for testing` },
            uin_registered: { check: 'uinRegistered', title: 'UIN Registered', body: `Your drone has been successfully registered with DGCA` },
            ready_to_dispatch: { check: 'readyToDispatch', title: 'Ready for Dispatch', body: `Your order is packed and ready to be dispatched` },
            dispatched: { check: null, title: 'Order Dispatched', body: `Your order ${order.orderNumber} has been dispatched. Track your delivery!` },
            delivered: { check: null, title: 'Order Delivered', body: `Your order ${order.orderNumber} has been delivered. Enjoy your drone!` }
        };

        const notification = notificationMap[status];
        if (!notification) {
            console.log(`No notification template for status: ${status}`);
            return;
        }

        // Check if customer wants this notification (based on order preferences)
        if (notification.check && order.smsNotifications && !order.smsNotifications[notification.check]) {
            console.log(`Customer opted out of ${notification.check} notification`);
            return;
        }

        // Send FCM notification if customer has FCM token
        if (customer?.fcmToken) {
            console.log(`📱 Sending FCM notification to customer for status: ${status}`);
            await sendToDevice(
                customer.fcmToken,
                notification.title,
                notification.body,
                {
                    type: 'order_status',
                    orderId: order._id.toString(),
                    orderNumber: order.orderNumber,
                    status
                }
            );
            console.log(`✅ FCM notification sent for order ${order.orderNumber}`);
        } else {
            console.log(`⚠️ No FCM token for customer - Order ${order.orderNumber}`);
        }

        // Send SMS notification via MSG91
        const phoneNumber = customer?.phone || order.customerPhone;
        const customerName = customer?.name || order.customerName || 'Customer';
        if (phoneNumber) {
            console.log(`📲 Sending SMS to ${phoneNumber} for status: ${status}`);
            await smsService.sendOrderStatusSMS(phoneNumber, order.orderNumber, status, customerName);
        } else {
            console.log(`⚠️ No phone number for order ${order.orderNumber}`);
        }

        // Send Email notification
        const customerEmail = customer?.email || order.customerEmail;
        if (customerEmail) {
            console.log(`📧 Sending email to ${customerEmail} for status: ${status}`);
            await emailService.sendOrderStatusEmail(customerEmail, order.orderNumber, status, customerName);
        } else {
            console.log(`⚠️ No email for order ${order.orderNumber}`);
        }
    } catch (error) {
        console.error('Error notifying order status:', error);
    }
};

// Send custom SMS to customer
const sendCustomMessage = async (userId, message, title = 'Cerebrospark Update') => {
    try {
        const user = await User.findById(userId);

        if (user?.fcmToken) {
            await sendToDevice(user.fcmToken, title, message, {
                type: 'custom_message'
            });
        }

        // TODO: Send actual SMS
        console.log(`SMS would be sent to ${user?.phone}: ${message}`);

        return true;
    } catch (error) {
        console.error('Error sending custom message:', error);
        return false;
    }
};

// Send festive or service SMS to all clients
const sendBulkMessage = async (userRole, message, title) => {
    try {
        const users = await User.find({ role: userRole, isActive: true, fcmToken: { $ne: null } });
        const tokens = users.map(u => u.fcmToken).filter(Boolean);

        if (tokens.length > 0) {
            await sendToMultipleDevices(tokens, title, message, { type: 'bulk_message' });
        }

        // TODO: Send bulk SMS
        console.log(`Bulk SMS would be sent to ${users.length} ${userRole}s`);

        return users.length;
    } catch (error) {
        console.error('Error sending bulk message:', error);
        return 0;
    }
};

module.exports = {
    sendToDevice,
    sendToMultipleDevices,
    notifyFormSubmission,
    notifySubmissionStatus,
    notifyOrderStatus,
    sendCustomMessage,
    sendBulkMessage
};
