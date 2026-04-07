const axios = require('axios');

/**
 * MSG91 SMS Service
 * Send transactional SMS to users via MSG91 API
 * 
 * Setup:
 * 1. Create account at https://msg91.com
 * 2. Get your Auth Key from Dashboard > API Keys
 * 3. Create a DLT template for each message type
 * 4. Add credentials to .env file
 */

const MSG91_API_URL = 'https://control.msg91.com/api/v5/flow/';

/**
 * Send SMS using MSG91 Flow API
 * @param {string} phoneNumber - Phone number with country code (e.g., 919876543210)
 * @param {string} templateId - MSG91 template ID
 * @param {object} variables - Template variables
 */
const sendSMS = async (phoneNumber, templateId, variables = {}) => {
    if (!process.env.MSG91_AUTH_KEY) {
        console.log('⚠️ MSG91_AUTH_KEY not configured - SMS not sent');
        return { success: false, error: 'MSG91 not configured' };
    }

    // Ensure phone number has country code
    let formattedPhone = phoneNumber.replace(/\D/g, ''); // Remove non-digits
    if (!formattedPhone.startsWith('91')) {
        formattedPhone = '91' + formattedPhone;
    }

    try {
        const response = await axios.post(MSG91_API_URL, {
            template_id: templateId,
            short_url: "0",
            recipients: [
                {
                    mobiles: formattedPhone,
                    ...variables
                }
            ]
        }, {
            headers: {
                'authkey': process.env.MSG91_AUTH_KEY,
                'Content-Type': 'application/json'
            }
        });

        console.log(`✅ SMS sent to ${formattedPhone}:`, response.data);
        return { success: true, data: response.data };
    } catch (error) {
        console.error(`❌ SMS failed to ${formattedPhone}:`, error.response?.data || error.message);
        return { success: false, error: error.response?.data || error.message };
    }
};

/**
 * Send a quick SMS without template (using default template)
 * This uses the generic template with just a message variable
 */
const sendQuickSMS = async (phoneNumber, message) => {
    const templateId = process.env.MSG91_DEFAULT_TEMPLATE_ID;

    if (!templateId) {
        console.log('⚠️ MSG91_DEFAULT_TEMPLATE_ID not configured');
        // Fallback: Just log the message
        console.log(`📲 SMS (simulated) to ${phoneNumber}: ${message}`);
        return { success: false, error: 'Template not configured', simulated: true };
    }

    return sendSMS(phoneNumber, templateId, { message });
};

/**
 * Send order status SMS
 * Uses predefined templates for each status
 */
const sendOrderStatusSMS = async (phoneNumber, orderNumber, status, customerName) => {
    // Map status to template IDs (you'll need to create these in MSG91)
    const templateMap = {
        booking_confirmed: process.env.MSG91_TEMPLATE_ORDER_PENDING,
        in_manufacturing: process.env.MSG91_TEMPLATE_ORDER_MANUFACTURING,
        ready_for_testing: process.env.MSG91_TEMPLATE_ORDER_TESTING,
        tested_successfully: process.env.MSG91_TEMPLATE_ORDER_TESTED,
        uin_generated: process.env.MSG91_TEMPLATE_ORDER_UIN,
        uin_transferred_successfully: process.env.MSG91_TEMPLATE_ORDER_UIN_TRANSFERRED,
        ready_to_dispatch: process.env.MSG91_TEMPLATE_ORDER_DISPATCH,
        delivered: process.env.MSG91_TEMPLATE_ORDER_DELIVERED
    };

    const templateId = templateMap[status];

    // Status messages for logging/fallback
    const messages = {
        booking_confirmed: `Dear ${customerName}, your order ${orderNumber} is confirmed! Booking is confirmed. - Cerebrospark`,
        in_manufacturing: `Dear ${customerName}, great news! Your drone (Order: ${orderNumber}) is now in manufacturing. - Cerebrospark`,
        ready_for_testing: `Dear ${customerName}, your drone (Order: ${orderNumber}) is ready for quality testing phase. - Cerebrospark`,
        tested_successfully: `Dear ${customerName}, your drone (Order: ${orderNumber}) has been tested successfully! - Cerebrospark`,
        uin_generated: `Dear ${customerName}, UIN for your drone (Order: ${orderNumber}) has been generated successfully. - Cerebrospark`,
        uin_transferred_successfully: `Dear ${customerName}, UIN for your drone (Order: ${orderNumber}) has been transferred successfully. - Cerebrospark`,
        ready_to_dispatch: `Dear ${customerName}, your drone (Order: ${orderNumber}) is packed and ready for dispatch! - Cerebrospark`,
        delivered: `Dear ${customerName}, your drone (Order: ${orderNumber}) has been received and delivered. Thank you! - Cerebrospark`
    };

    const message = messages[status];

    if (!templateId) {
        // Template not configured - log the message
        console.log(`📲 SMS (would send) to ${phoneNumber}: ${message}`);
        return { success: false, simulated: true, message };
    }

    return sendSMS(phoneNumber, templateId, {
        customer_name: customerName,
        order_number: orderNumber
    });
};

module.exports = {
    sendSMS,
    sendQuickSMS,
    sendOrderStatusSMS
};
