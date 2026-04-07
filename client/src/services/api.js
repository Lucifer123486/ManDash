import axios from 'axios';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5001/api';

// Base URL for uploaded files (strips /api suffix so /uploads/... paths work correctly)
export const FILE_BASE_URL = API_BASE_URL.replace(/\/api$/, '');

// Axios instance
const api = axios.create({
    baseURL: API_BASE_URL
});

// Attach JWT token
api.interceptors.request.use(
    (config) => {
        const token = localStorage.getItem('token');
        if (token) {
            config.headers.Authorization = `Bearer ${token}`;
        }
        return config;
    },
    (error) => Promise.reject(error)
);

// Handle auth expiry
api.interceptors.response.use(
    (response) => response,
    (error) => {
        if (error.response?.status === 401) {
            localStorage.removeItem('token');
            localStorage.removeItem('user');
            window.location.href = '/login';
        }
        return Promise.reject(error);
    }
);

/* ===================== AUTH ===================== */
export const authAPI = {
    login: (email, password) => api.post('/auth/login', { email, password }),
    register: (userData) => api.post('/auth/register', userData),
    getMe: () => api.get('/auth/me'),
    logout: () => api.post('/auth/logout'),
    updateFcmToken: (fcmToken) => api.put('/auth/fcm-token', { fcmToken }),
    verifySignature: (userId, password) => api.post('/auth/verify-signature', { userId, password })
};

/* ===================== USERS ===================== */
export const usersAPI = {
    getAll: (params) => api.get('/users', { params }),
    getById: (id) => api.get(`/users/${id}`),
    create: (userData) => api.post('/users', userData),
    update: (id, userData) => api.put(`/users/${id}`, userData),
    delete: (id) => api.delete(`/users/${id}`),
    assignDrones: (id, droneIds) =>
        api.put(`/users/${id}/assign-drones`, { droneIds })
};

/* ===================== FORMS ===================== */
export const formsAPI = {
    // Schemas
    getSchemas: (params) => api.get('/forms/schemas', { params }),
    getSchemaById: (id) => api.get(`/forms/schema/${id}`),
    getSchemaByCode: (code) => api.get(`/forms/schema/code/${code}`),
    createSchema: (schemaData) => api.post('/forms/schema', schemaData),

    // Submissions
    submit: (submissionData) => api.post('/forms/submit', submissionData),
    getSubmissions: (params) => api.get('/forms/submissions', { params }),
    getSubmissionById: (id) => api.get(`/forms/submission/${id}`),
    updateSubmissionStatus: (id, status, remarks) =>
        api.put(`/forms/submission/${id}/status`, { status, remarks }),
    getDroneSubmissions: (droneId) =>
        api.get(`/forms/drone/${droneId}`),

    // Access Requests
    requestAccess: (droneId, formCode) =>
        api.post('/forms/access-request', { droneId, formCode }),
    requestBulkAccess: (droneId, formCodes) =>
        api.post('/forms/access-request/bulk', { droneId, formCodes }),
    getAccessRequests: (params) =>
        api.get('/forms/access-requests', { params }),
    updateAccessRequest: (id, status, remarks) =>
        api.put(`/forms/access-request/${id}`, { status, remarks }),
    bulkUpdateAccessRequests: (ids, status, remarks) =>
        api.put('/forms/access-requests/bulk', { ids, status, remarks }),
    checkAccess: (droneId, formCode) =>
        api.get(`/forms/check-access/${droneId}/${formCode}`)
};

/* ===================== DRONES ===================== */
export const dronesAPI = {
    getAll: (params) => api.get('/drones', { params }),
    getById: (id) => api.get(`/drones/${id}`),
    getBySerial: (serialNo) => api.get(`/drones/serial/${serialNo}`),
    create: (droneData) => api.post('/drones', droneData),
    updateStatus: (id, statusData) =>
        api.put(`/drones/${id}/status`, statusData),
    updateComponents: (id, components) =>
        api.put(`/drones/${id}/components`, { components }),
    getWorkflow: (id) => api.get(`/drones/${id}/workflow`),
    getDocuments: (id) => api.get(`/drones/${id}/documents`),
    assignStaff: (id, staffData) =>
        api.put(`/drones/${id}/assign-staff`, staffData),
    skipStage: (id, stageCode) =>
        api.put(`/drones/${id}/skip-stage`, { stageCode }),
    uploadDeliveryChallan: (id, file) => {
        const formData = new FormData();
        formData.append('file', file);
        return api.put(`/drones/${id}/delivery-challan`, formData);
    },
    uploadHashCode: (id, file) => {
        const formData = new FormData();
        formData.append('file', file);
        return api.put(`/drones/${id}/hash-code`, formData);
    },
    uploadTaxInvoice: (id, file) => {
        const formData = new FormData();
        formData.append('file', file);
        return api.put(`/drones/${id}/tax-invoice`, formData, {
            headers: { 'Content-Type': 'multipart/form-data' }
        });
    },
    uploadD2Form: (id, file) => {
        const formData = new FormData();
        formData.append('file', file);
        return api.put(`/drones/${id}/d2-form`, formData, {
            headers: { 'Content-Type': 'multipart/form-data' }
        });
    },
    uploadD3Form: (id, file) => {
        const formData = new FormData();
        formData.append('file', file);
        return api.put(`/drones/${id}/d3-form`, formData, {
            headers: { 'Content-Type': 'multipart/form-data' }
        });
    },
    assignOrder: (id, orderId) =>
        api.put(`/drones/${id}/assign-order`, { orderId }),
    updateEgcaDetails: (id, egcaData) =>
        api.put(`/drones/${id}/egca`, egcaData),
    unassignOrder: (id) =>
        api.put(`/drones/${id}/unassign-order`),
    delete: (id, password) =>
        api.delete(`/drones/${id}`, { data: { password } })
};

/* ===================== ORDERS ===================== */
export const ordersAPI = {
    getAll: (params) => api.get('/orders', { params }),
    getById: (id) => api.get(`/orders/${id}`),
    create: (orderData) => api.post('/orders', orderData),
    updateStatus: (id, status, remarks) =>
        api.put(`/orders/${id}/status`, { status, remarks }),
    confirmBooking: (id) => api.put(`/orders/${id}/confirm`),
    addDocument: (id, docData) =>
        api.post(`/orders/${id}/documents`, docData),
    getTracking: (id) => api.get(`/orders/${id}/tracking`),
    delete: (id, password) =>
        api.delete(`/orders/${id}`, { data: { password } })
};

/* ===================== NOTIFICATIONS ===================== */
export const notificationsAPI = {
    send: (userId, message, title) =>
        api.post('/notifications/send', { userId, message, title }),
    sendBulk: (role, message, title) =>
        api.post('/notifications/bulk', { role, message, title }),
    sendFestive: (message, title) =>
        api.post('/notifications/festive', { message, title }),
    sendService: (message, title) =>
        api.post('/notifications/service', { message, title })
};

/* ===================== TICKETS ===================== */
export const ticketsAPI = {
    exportExcel: () => api.get('/tickets/export/excel', { responseType: 'blob' }),
    create: (ticketData) => api.post('/tickets', ticketData),
    getAll: (params) => api.get('/tickets', { params }),
    updateStatus: (id, payload) =>
        api.patch(`/tickets/${id}/status`, payload),
    assign: (id, assignedTo) =>
        api.patch(`/tickets/${id}/assign`, { assignedTo }),
    respond: (id, action, rejectionReason) =>
        api.patch(`/tickets/${id}/respond`, { action, rejectionReason }),
    addCallLog: (id, payload) =>
        api.post(`/tickets/${id}/calls`, payload, {
            headers: { 'Content-Type': 'multipart/form-data' }
        }),
    uploadPhoto: (file) => {
        const formData = new FormData();
        formData.append('geotagPhoto', file);
        return api.post('/tickets/upload-photo', formData, {
            headers: { 'Content-Type': 'multipart/form-data' }
        });
    }
};

/* ===================== ACTIVATION ===================== */
export const activationAPI = {
    getAll: (params) => api.get('/activations', { params }),
    get: (droneId) => api.get(`/activations/${droneId}`),
    save: (droneId, data) => api.post(`/activations/${droneId}`, data),
    exportExcel: () => api.get('/activations/export/excel', { responseType: 'blob' })
};

/* ===================== PREBOOKING ===================== */
export const prebookingAPI = {
    getAll: (params) => api.get('/prebooking', { params }),
    getById: (id) => api.get(`/prebooking/${id}`),
    create: (data) => api.post('/prebooking', data),
    update: (id, data) => api.patch(`/prebooking/${id}`, data),
    addCall: (id, formData) => api.post(`/prebooking/${id}/call`, formData),
    exportExcel: () => api.get('/prebooking/admin/export', { responseType: 'blob' })
};

export default api;
