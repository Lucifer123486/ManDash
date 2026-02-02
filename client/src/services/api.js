import axios from 'axios';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

// Create axios instance
const api = axios.create({
    baseURL: API_BASE_URL,
    headers: {
        'Content-Type': 'application/json'
    }
});

// Request interceptor - add token
api.interceptors.request.use(
    (config) => {
        const token = localStorage.getItem('token');
        if (token) {
            config.headers.Authorization = `Bearer ${token}`;
        }
        return config;
    },
    (error) => {
        return Promise.reject(error);
    }
);

// Response interceptor - handle errors
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

// Auth API
export const authAPI = {
    login: (email, password) => api.post('/auth/login', { email, password }),
    register: (userData) => api.post('/auth/register', userData),
    getMe: () => api.get('/auth/me'),
    logout: () => api.post('/auth/logout'),
    updateFcmToken: (fcmToken) => api.put('/auth/fcm-token', { fcmToken })
};

// Users API
export const usersAPI = {
    getAll: (params) => api.get('/users', { params }),
    getById: (id) => api.get(`/users/${id}`),
    create: (userData) => api.post('/users', userData),
    update: (id, userData) => api.put(`/users/${id}`, userData),
    delete: (id) => api.delete(`/users/${id}`),
    assignDrones: (id, droneIds) => api.put(`/users/${id}/assign-drones`, { droneIds })
};

// Forms API
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
    getDroneSubmissions: (droneId) => api.get(`/forms/drone/${droneId}`)
};

// Drones API
export const dronesAPI = {
    getAll: (params) => api.get('/drones', { params }),
    getById: (id) => api.get(`/drones/${id}`),
    getBySerial: (serialNo) => api.get(`/drones/serial/${serialNo}`),
    create: (droneData) => api.post('/drones', droneData),
    updateStatus: (id, statusData) => api.put(`/drones/${id}/status`, statusData),
    updateComponents: (id, components) => api.put(`/drones/${id}/components`, { components }),
    getWorkflow: (id) => api.get(`/drones/${id}/workflow`),
    getDocuments: (id) => api.get(`/drones/${id}/documents`),
    assignStaff: (id, staffData) => api.put(`/drones/${id}/assign-staff`, staffData)
};

// Orders API
export const ordersAPI = {
    getAll: (params) => api.get('/orders', { params }),
    getById: (id) => api.get(`/orders/${id}`),
    create: (orderData) => api.post('/orders', orderData),
    updateStatus: (id, status, remarks) => api.put(`/orders/${id}/status`, { status, remarks }),
    confirmBooking: (id) => api.put(`/orders/${id}/confirm`),
    addDocument: (id, docData) => api.post(`/orders/${id}/documents`, docData),
    getTracking: (id) => api.get(`/orders/${id}/tracking`)
};

// Notifications API
export const notificationsAPI = {
    send: (userId, message, title) => api.post('/notifications/send', { userId, message, title }),
    sendBulk: (role, message, title) => api.post('/notifications/bulk', { role, message, title }),
    sendFestive: (message, title) => api.post('/notifications/festive', { message, title }),
    sendService: (message, title) => api.post('/notifications/service', { message, title })
};

export default api;
