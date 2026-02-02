const nodemailer = require('nodemailer');

/**
 * Email Notification Service
 * Send email notifications for order status updates
 * 
 * Configuration:
 * - For Gmail: Enable 2FA and create App Password
 * - Or use any SMTP service (SendGrid, Mailgun, etc.)
 */

// Create transporter
const createTransporter = () => {
    const config = {
        host: process.env.SMTP_HOST || 'smtp.gmail.com',
        port: parseInt(process.env.SMTP_PORT) || 587,
        secure: process.env.SMTP_SECURE === 'true',
        auth: {
            user: process.env.SMTP_USER,
            pass: process.env.SMTP_PASS
        }
    };

    return nodemailer.createTransport(config);
};

/**
 * Send email
 * @param {string} to - Recipient email
 * @param {string} subject - Email subject
 * @param {string} html - HTML content
 */
const sendEmail = async (to, subject, html) => {
    if (!process.env.SMTP_USER || !process.env.SMTP_PASS) {
        console.log('⚠️ SMTP not configured - Email simulated');
        console.log(`📧 Email would be sent to: ${to}`);
        console.log(`   Subject: ${subject}`);
        return { success: false, simulated: true };
    }

    try {
        const transporter = createTransporter();

        const result = await transporter.sendMail({
            from: `"Cerebrospark Innovations" <${process.env.SMTP_USER}>`,
            to,
            subject,
            html
        });

        console.log(`✅ Email sent to ${to}: ${result.messageId}`);
        return { success: true, messageId: result.messageId };
    } catch (error) {
        console.error(`❌ Email failed to ${to}:`, error.message);
        return { success: false, error: error.message };
    }
};

/**
 * Generate order status email HTML
 */
const generateOrderEmailHTML = (customerName, orderNumber, status, statusMessage) => {
    const statusColors = {
        pending: '#FFC107',
        confirmed: '#4CAF50',
        in_manufacturing: '#2196F3',
        ready_for_testing: '#9C27B0',
        uin_registered: '#00BCD4',
        ready_to_dispatch: '#FF9800',
        dispatched: '#8BC34A',
        delivered: '#4CAF50'
    };

    const color = statusColors[status] || '#FFD600';
    const statusLabel = status.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());

    return `
<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="margin: 0; padding: 0; font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background-color: #f5f5f5;">
    <table width="100%" cellpadding="0" cellspacing="0" style="max-width: 600px; margin: 0 auto; background-color: #ffffff;">
        <!-- Header -->
        <tr>
            <td style="background: linear-gradient(135deg, #FFD600, #FFC107); padding: 30px; text-align: center;">
                <h1 style="margin: 0; color: #212121; font-size: 24px;">CEREBROSPARK</h1>
                <p style="margin: 5px 0 0; color: #424242; font-size: 12px;">INNOVATIONS</p>
            </td>
        </tr>
        
        <!-- Status Badge -->
        <tr>
            <td style="padding: 30px 30px 20px; text-align: center;">
                <div style="display: inline-block; background-color: ${color}20; color: ${color}; padding: 10px 25px; border-radius: 25px; font-weight: 600; font-size: 14px; text-transform: uppercase;">
                    ${statusLabel}
                </div>
            </td>
        </tr>
        
        <!-- Content -->
        <tr>
            <td style="padding: 0 30px 30px;">
                <h2 style="margin: 0 0 15px; color: #212121; font-size: 20px;">Dear ${customerName},</h2>
                <p style="margin: 0 0 20px; color: #616161; font-size: 16px; line-height: 1.6;">
                    ${statusMessage}
                </p>
                
                <!-- Order Details Box -->
                <div style="background-color: #f9f9f9; border-radius: 8px; padding: 20px; margin: 20px 0;">
                    <table width="100%" cellpadding="0" cellspacing="0">
                        <tr>
                            <td style="color: #9e9e9e; font-size: 12px; text-transform: uppercase;">Order Number</td>
                        </tr>
                        <tr>
                            <td style="color: #212121; font-size: 18px; font-weight: 600; padding-top: 5px;">${orderNumber}</td>
                        </tr>
                    </table>
                </div>
                
                <p style="margin: 20px 0 0; color: #9e9e9e; font-size: 14px;">
                    If you have any questions, please contact us at support@cerebrospark.com
                </p>
            </td>
        </tr>
        
        <!-- Footer -->
        <tr>
            <td style="background-color: #212121; padding: 25px 30px; text-align: center;">
                <p style="margin: 0; color: #9e9e9e; font-size: 12px;">
                    © 2026 Cerebrospark Innovations Pvt. Ltd.<br>
                    Agricultural Drone Manufacturing
                </p>
            </td>
        </tr>
    </table>
</body>
</html>
    `;
};

/**
 * Send order status email
 */
const sendOrderStatusEmail = async (email, orderNumber, status, customerName) => {
    const statusMessages = {
        pending: `Your order <strong>${orderNumber}</strong> has been received and is pending confirmation. We will review and confirm your order shortly.`,
        confirmed: `Great news! Your order <strong>${orderNumber}</strong> has been confirmed. Our team will begin manufacturing your drone soon.`,
        in_manufacturing: `Your drone (Order: <strong>${orderNumber}</strong>) is now in manufacturing. Our skilled technicians are working on it.`,
        ready_for_testing: `Your drone (Order: <strong>${orderNumber}</strong>) is ready for quality testing. We ensure every drone meets our high standards.`,
        uin_registered: `Excellent! Your drone (Order: <strong>${orderNumber}</strong>) has been successfully registered with DGCA. UIN registration complete!`,
        ready_to_dispatch: `Your order <strong>${orderNumber}</strong> is packed and ready for dispatch. It will be shipped soon!`,
        dispatched: `Your order <strong>${orderNumber}</strong> has been dispatched! Track your delivery for real-time updates.`,
        delivered: `Your drone (Order: <strong>${orderNumber}</strong>) has been delivered! Thank you for choosing Cerebrospark Innovations. Fly safe!`
    };

    const statusSubjects = {
        pending: `Order Received - ${orderNumber}`,
        confirmed: `Order Confirmed! - ${orderNumber}`,
        in_manufacturing: `Manufacturing Started - ${orderNumber}`,
        ready_for_testing: `Quality Testing Phase - ${orderNumber}`,
        uin_registered: `UIN Registration Complete - ${orderNumber}`,
        ready_to_dispatch: `Ready for Dispatch - ${orderNumber}`,
        dispatched: `Order Shipped! - ${orderNumber}`,
        delivered: `Order Delivered! - ${orderNumber}`
    };

    const subject = statusSubjects[status] || `Order Update - ${orderNumber}`;
    const message = statusMessages[status] || `Your order status has been updated to: ${status}`;

    const html = generateOrderEmailHTML(customerName, orderNumber, status, message);

    return sendEmail(email, subject, html);
};

module.exports = {
    sendEmail,
    sendOrderStatusEmail
};
