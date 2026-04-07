require('dotenv').config();
const { sendEmail } = require('./services/emailService');

(async () => {
    console.log('[DEBUG] Testing email...');
    console.log('User:', process.env.SMTP_USER);
    console.log('Pass:', process.env.SMTP_PASS ? '***' : 'missing');

    const result = await sendEmail(
        process.env.SMTP_USER || 'test@test.com',
        'Test Ticket Assignment',
        '<h1>Hello Test</h1><p>Testing ticket email sending</p>'
    );

    console.log('[DEBUG] Result:', result);
})();
