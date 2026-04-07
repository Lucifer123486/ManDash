require('dotenv').config();
const { sendEmail } = require('./services/emailService');

(async () => {
    console.log('[DEBUG] Testing email to SE...');

    // Test the SE email
    const targetEmail = 'mayurpatil.tae@kjei.edu.in';
    const result = await sendEmail(
        targetEmail,
        'Test Ticket Assignment - Direct',
        '<h1>Hello Test</h1><p>Testing ticket email sending to your kjei.edu.in account.</p>'
    );

    console.log('[DEBUG] Result:', result);
})();
