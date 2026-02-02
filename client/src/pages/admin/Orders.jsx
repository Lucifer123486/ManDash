import { useState, useEffect } from 'react';
import { ordersAPI, usersAPI } from '../../services/api';

const Orders = () => {
    const [orders, setOrders] = useState([]);
    const [clients, setClients] = useState([]);
    const [loading, setLoading] = useState(true);
    const [showModal, setShowModal] = useState(false);
    const [formData, setFormData] = useState({
        customerId: '',
        customerName: '',
        customerEmail: '',
        customerAddress: '',
        customerPhone: '',
        customerPinCode: '',
        modelNo: 'CS_KRISHI_10L',
        quantity: 1,
        pricePerUnit: 450000,
        paymentStatus: 'pending'
    });

    useEffect(() => {
        fetchData();
    }, []);

    const fetchData = async () => {
        try {
            const [ordersRes, usersRes] = await Promise.all([
                ordersAPI.getAll(),
                usersAPI.getAll()
            ]);
            setOrders(ordersRes.data.data || []);
            setClients((usersRes.data.data || []).filter(u => u.role === 'client'));
        } catch (error) {
            console.error('Error fetching data:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        try {
            await ordersAPI.create(formData);
            fetchData();
            setShowModal(false);
            setFormData({
                customerId: '',
                customerName: '',
                customerEmail: '',
                customerAddress: '',
                customerPhone: '',
                customerPinCode: '',
                modelNo: 'CS_KRISHI_10L',
                quantity: 1,
                pricePerUnit: 450000,
                paymentStatus: 'pending'
            });
        } catch (error) {
            alert(error.response?.data?.message || 'Error creating order');
        }
    };

    const handleClientSelect = (clientId) => {
        const client = clients.find(c => c._id === clientId);
        if (client) {
            setFormData({
                ...formData,
                customerId: client._id,
                customerName: client.name,
                customerEmail: client.email || '',
                customerAddress: client.address || '',
                customerPhone: client.phone || '',
                customerPinCode: client.pinCode || ''
            });
        }
    };

    const updateStatus = async (orderId, status) => {
        try {
            await ordersAPI.updateStatus(orderId, status);
            fetchData();
        } catch (error) {
            alert('Error updating status');
        }
    };

    const getStatusColor = (status) => {
        const colors = {
            pending: 'badge-warning',
            confirmed: 'badge-primary',
            in_manufacturing: 'badge-info',
            ready_for_testing: 'badge-info',
            uin_registered: 'badge-primary',
            ready_to_dispatch: 'badge-success',
            dispatched: 'badge-success',
            delivered: 'badge-success'
        };
        return colors[status] || 'badge-grey';
    };

    if (loading) {
        return (
            <div className="loading-container">
                <div className="loading-spinner"></div>
            </div>
        );
    }

    return (
        <div>
            <div className="page-header">
                <div>
                    <h1 className="page-title">Orders</h1>
                    <p className="page-subtitle">Manage customer orders and track delivery</p>
                </div>
                <button onClick={() => setShowModal(true)} className="btn btn-primary">
                    + New Order
                </button>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-4 gap-lg" style={{ marginBottom: '24px' }}>
                <div className="stat-card">
                    <div className="stat-icon">📋</div>
                    <div className="stat-content">
                        <h3>Total Orders</h3>
                        <div className="stat-value">{orders.length}</div>
                    </div>
                </div>
                <div className="stat-card" style={{ borderLeftColor: '#FF9800' }}>
                    <div className="stat-icon" style={{ background: '#FFF3E0', color: '#FF9800' }}>⏳</div>
                    <div className="stat-content">
                        <h3>Pending</h3>
                        <div className="stat-value">{orders.filter(o => o.status === 'pending').length}</div>
                    </div>
                </div>
                <div className="stat-card" style={{ borderLeftColor: '#2196F3' }}>
                    <div className="stat-icon" style={{ background: '#E3F2FD', color: '#2196F3' }}>🏭</div>
                    <div className="stat-content">
                        <h3>In Progress</h3>
                        <div className="stat-value">{orders.filter(o => ['confirmed', 'in_manufacturing'].includes(o.status)).length}</div>
                    </div>
                </div>
                <div className="stat-card" style={{ borderLeftColor: '#4CAF50' }}>
                    <div className="stat-icon" style={{ background: '#E8F5E9', color: '#4CAF50' }}>✅</div>
                    <div className="stat-content">
                        <h3>Delivered</h3>
                        <div className="stat-value">{orders.filter(o => o.status === 'delivered').length}</div>
                    </div>
                </div>
            </div>

            {/* Orders Table */}
            <div className="card">
                <div className="table-container">
                    <table className="table">
                        <thead>
                            <tr>
                                <th>Order #</th>
                                <th>Customer</th>
                                <th>Model</th>
                                <th>Qty</th>
                                <th>Amount</th>
                                <th>Status</th>
                                <th>Date</th>
                                <th>Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            {orders.map((order) => (
                                <tr key={order._id}>
                                    <td><strong>{order.orderNumber}</strong></td>
                                    <td>
                                        <div>
                                            <div>{order.customerName}</div>
                                            <div className="text-xs text-muted">{order.customerPhone}</div>
                                        </div>
                                    </td>
                                    <td>{order.modelNo}</td>
                                    <td>{order.quantity}</td>
                                    <td>₹{(order.totalAmount || order.quantity * order.pricePerUnit).toLocaleString()}</td>
                                    <td>
                                        <span className={`badge ${getStatusColor(order.status)}`}>
                                            {order.status?.replace(/_/g, ' ')}
                                        </span>
                                    </td>
                                    <td>{new Date(order.createdAt).toLocaleDateString()}</td>
                                    <td>
                                        <select
                                            className="form-select"
                                            style={{ width: 'auto', padding: '4px 8px', fontSize: '0.75rem' }}
                                            value={order.status}
                                            onChange={(e) => updateStatus(order._id, e.target.value)}
                                        >
                                            <option value="pending">Pending</option>
                                            <option value="confirmed">Confirmed</option>
                                            <option value="in_manufacturing">In Manufacturing</option>
                                            <option value="ready_for_testing">Ready for Testing</option>
                                            <option value="uin_registered">UIN Registered</option>
                                            <option value="ready_to_dispatch">Ready to Dispatch</option>
                                            <option value="dispatched">Dispatched</option>
                                            <option value="delivered">Delivered</option>
                                        </select>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>

                {orders.length === 0 && (
                    <div style={{ textAlign: 'center', padding: '40px' }}>
                        <p className="text-muted">No orders yet</p>
                    </div>
                )}
            </div>

            {/* Create Order Modal */}
            {showModal && (
                <div className="modal-overlay" onClick={() => setShowModal(false)}>
                    <div className="modal" style={{ maxWidth: '700px' }} onClick={e => e.stopPropagation()}>
                        <div className="modal-header">
                            <h3 className="modal-title">Create New Order</h3>
                            <button onClick={() => setShowModal(false)} className="modal-close">×</button>
                        </div>
                        <form onSubmit={handleSubmit}>
                            <div className="modal-body">
                                {/* Select Existing Client */}
                                <div className="form-group">
                                    <label className="form-label">Select Existing Client (optional)</label>
                                    <select
                                        className="form-select"
                                        onChange={(e) => handleClientSelect(e.target.value)}
                                    >
                                        <option value="">-- Or enter new customer below --</option>
                                        {clients.map(client => (
                                            <option key={client._id} value={client._id}>{client.name} - {client.email}</option>
                                        ))}
                                    </select>
                                </div>

                                <div className="grid grid-cols-2 gap-md">
                                    <div className="form-group">
                                        <label className="form-label required">Customer Name</label>
                                        <input
                                            type="text"
                                            className="form-input"
                                            value={formData.customerName}
                                            onChange={(e) => setFormData({ ...formData, customerName: e.target.value })}
                                            required
                                        />
                                    </div>
                                    <div className="form-group">
                                        <label className="form-label required">Phone</label>
                                        <input
                                            type="tel"
                                            className="form-input"
                                            value={formData.customerPhone}
                                            onChange={(e) => setFormData({ ...formData, customerPhone: e.target.value })}
                                            required
                                        />
                                    </div>
                                </div>

                                <div className="form-group">
                                    <label className="form-label required">Email</label>
                                    <input
                                        type="email"
                                        className="form-input"
                                        placeholder="customer@example.com"
                                        value={formData.customerEmail}
                                        onChange={(e) => setFormData({ ...formData, customerEmail: e.target.value })}
                                        required
                                    />
                                </div>

                                <div className="form-group">
                                    <label className="form-label required">Address</label>
                                    <textarea
                                        className="form-textarea"
                                        value={formData.customerAddress}
                                        onChange={(e) => setFormData({ ...formData, customerAddress: e.target.value })}
                                        required
                                    />
                                </div>

                                <div className="grid grid-cols-3 gap-md">
                                    <div className="form-group">
                                        <label className="form-label">Pin Code</label>
                                        <input
                                            type="text"
                                            className="form-input"
                                            value={formData.customerPinCode}
                                            onChange={(e) => setFormData({ ...formData, customerPinCode: e.target.value })}
                                        />
                                    </div>
                                    <div className="form-group">
                                        <label className="form-label required">Model</label>
                                        <select
                                            className="form-select"
                                            value={formData.modelNo}
                                            onChange={(e) => setFormData({ ...formData, modelNo: e.target.value })}
                                        >
                                            <option value="CS_KRISHI_10L">CS_KRISHI_10L</option>
                                            <option value="CS_KRISHI_16L">CS_KRISHI_16L</option>
                                        </select>
                                    </div>
                                    <div className="form-group">
                                        <label className="form-label required">Quantity</label>
                                        <input
                                            type="number"
                                            className="form-input"
                                            min="1"
                                            value={formData.quantity}
                                            onChange={(e) => setFormData({ ...formData, quantity: parseInt(e.target.value) })}
                                            required
                                        />
                                    </div>
                                </div>

                                <div className="grid grid-cols-2 gap-md">
                                    <div className="form-group">
                                        <label className="form-label">Price Per Unit (₹)</label>
                                        <input
                                            type="number"
                                            className="form-input"
                                            value={formData.pricePerUnit}
                                            onChange={(e) => setFormData({ ...formData, pricePerUnit: parseInt(e.target.value) })}
                                        />
                                    </div>
                                    <div className="form-group">
                                        <label className="form-label">Total Amount</label>
                                        <input
                                            type="text"
                                            className="form-input"
                                            value={`₹${(formData.quantity * formData.pricePerUnit).toLocaleString()}`}
                                            disabled
                                        />
                                    </div>
                                </div>
                            </div>
                            <div className="modal-footer">
                                <button type="button" onClick={() => setShowModal(false)} className="btn btn-outline">
                                    Cancel
                                </button>
                                <button type="submit" className="btn btn-primary">
                                    Create Order
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};

export default Orders;
