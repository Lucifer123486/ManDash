const axios = require('axios');

const API_URL = 'http://localhost:5000/api';

async function runTests() {
    try {
        console.log('--- Starting E2E Support Tests ---');

        // 1. Logins
        console.log('\n[1] Logging in test users...');
        const clientLogin = await axios.post(`${API_URL}/auth/login`, { email: 'nehajakate94@gmail.com', password: 'password123' });
        const clientToken = clientLogin.data.token;
        const clientId = clientLogin.data.user.id;

        const staffLogin = await axios.post(`${API_URL}/auth/login`, { email: 'mayurpatiltae@gmail.com', password: 'password123' });
        const staffToken = staffLogin.data.token;
        const staffId = staffLogin.data.user.id;

        const seLogin = await axios.post(`${API_URL}/auth/login`, { email: 'mayurpatil.tae@kjei.edu.in', password: 'password123' });
        const seToken = seLogin.data.token;
        const seId = seLogin.data.user.id;

        const adminLogin = await axios.post(`${API_URL}/auth/login`, { email: 'admin@cerebrospark.com', password: 'password123' });
        const adminToken = adminLogin.data.token;
        console.log('✅ Logins successful');

        // 2. Client creates ticket
        console.log('\n[2] Scenario 1: Client creates a ticket...');
        const clientTicketRes = await axios.post(`${API_URL}/tickets`, {
            customerEmail: 'nehajakate94@gmail.com',
            customerName: 'Neha Jakate',
            customerMobile: '9999999999',
            customerLocation: 'Pune',
            droneSerialNumber: 'DRN-001',
            dateOfPurchase: '2023-01-01',
            warrantyStatus: true,
            problemDescription: 'Client Test: Motor not spinning',
            photoVideoReceived: false,
            problemCategory: 'Call/Video Call',
            contactedCustomerAt: '10:00',
            actionToBeTaken: 'Solve On Call'
        }, { headers: { Authorization: `Bearer ${clientToken}` } });
        const clientTicketId = clientTicketRes.data.data._id;
        console.log('✅ Client ticket created:', clientTicketId);

        // 3. Staff creates ticket for client
        console.log('\n[3] Scenario 2: Staff creates ticket on behalf of client...');
        const staffTicketRes = await axios.post(`${API_URL}/tickets`, {
            customerEmail: 'someclient@gmail.com',
            customerName: 'Some Client',
            customerMobile: '8888888888',
            customerLocation: 'Mumbai',
            droneSerialNumber: 'DRN-002',
            dateOfPurchase: '2023-05-01',
            warrantyStatus: false,
            problemDescription: 'Staff Test: Battery issue',
            photoVideoReceived: true,
            problemCategory: 'Field Visit',
            contactedCustomerAt: '11:00',
            actionToBeTaken: 'Solve On Feild'
        }, { headers: { Authorization: `Bearer ${staffToken}` } });
        const staffTicketId = staffTicketRes.data.data._id;
        console.log('✅ Staff ticket created:', staffTicketId);

        // 4. Admin checking visibility
        console.log('\n[4] Scenario 3: Admin visibility...');
        const adminTicketsRes = await axios.get(`${API_URL}/tickets`, { headers: { Authorization: `Bearer ${adminToken}` } });
        const adminTickets = adminTicketsRes.data.data;
        const foundClient = adminTickets.find(t => t._id === clientTicketId);
        const foundStaff = adminTickets.find(t => t._id === staffTicketId);
        if (foundClient && foundStaff) {
            console.log('✅ Admin can see both newly created tickets.');
        } else {
            throw new Error('Admin cannot see the tickets!');
        }

        // 5. Admin assigns ticket to SE
        console.log('\n[5] Scenario 4: Admin assigns ticket to SE...', 'seId:', seId);
        const assignRes = await axios.patch(`${API_URL}/tickets/${clientTicketId}/assign`, {
            assignedTo: seId
        }, { headers: { Authorization: `Bearer ${adminToken}` } });
        if (assignRes.data.data.assignmentStatus === 'pending_acceptance') {
            console.log('✅ Ticket assigned to SE successfully.');
        } else {
            throw new Error('Assignment failed');
        }

        // 6. SE accepts ticket
        console.log('\n[6] Scenario 5: SE accepts the assigned ticket...');
        const seAcceptRes = await axios.patch(`${API_URL}/tickets/${clientTicketId}/respond`, {
            action: 'accept'
        }, { headers: { Authorization: `Bearer ${seToken}` } });
        if (seAcceptRes.data.data.assignmentStatus === 'accepted' && seAcceptRes.data.data.status === 'in_progress') {
            console.log('✅ SE accepted the ticket successfully.');
        } else {
            throw new Error('SE accept failed');
        }

        // 7. Admin resolves ticket
        console.log('\n[7] Scenario 6: Admin resolves the ticket...');
        const resolveRes = await axios.patch(`${API_URL}/tickets/${clientTicketId}/status`, {
            status: 'resolved',
            resolutionNotes: 'Fixed the motor connection.'
        }, { headers: { Authorization: `Bearer ${adminToken}` } });
        if (resolveRes.data.data.status === 'resolved') {
            console.log('✅ Admin resolved the ticket successfully.');
        } else {
            throw new Error('Admin resolve failed');
        }

        console.log('\n🎉 ALL SCENARIOS PASSED 🎉');
    } catch (err) {
        console.error('\n❌ TEST FAILED:', err.response ? JSON.stringify(err.response.data) : err.message);
    }
}

runTests();
