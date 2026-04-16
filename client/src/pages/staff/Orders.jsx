import { useState, useEffect } from 'react';
import { ordersAPI, usersAPI } from '../../services/api';
import { Trash2 } from 'lucide-react';
import { useLanguage } from '../../context/LanguageContext';

const PRICE_PER_UNIT = 500000;

const StaffOrders = () => {
    const { t } = useLanguage();
    const [orders, setOrders] = useState([]);
    const [clients, setClients] = useState([]);
    const [loading, setLoading] = useState(true);
    const [showModal, setShowModal] = useState(false);
    const [errors, setErrors] = useState({});

    /* 🔍 SEARCH STATE */
    const [searchTerm, setSearchTerm] = useState('');
    const [searchBy, setSearchBy] = useState('all');

    const [formData, setFormData] = useState({
        customerId: '',
        customerName: '',
        customerEmail: '',
        customerAddress: '',
        customerPhone: '',
        customerPinCode: '',
        modelNo: 'CS_KRISHI_10L',
        quantity: 1,
        pricePerUnit: PRICE_PER_UNIT,
        totalAmount: PRICE_PER_UNIT,
        paymentMethod: '',
        paymentStatus: 'booking_confirmed',
        remarks: ''
    });

    useEffect(() => {
        fetchData();
    }, []);

    const fetchData = async () => {
        setLoading(true);
        try {
            // Fetch Orders
            const ordersRes = await ordersAPI.getAll();
            setOrders(ordersRes.data.data || []);
        } catch (error) {
            console.error('Error fetching orders:', error);
            alert('Could not fetch orders. Please check your connection or restart the server.');
        }

        try {
            // Fetch Clients specifically
            const usersRes = await usersAPI.getAll({ role: 'client' });
            setClients(usersRes.data.data || []);
        } catch (error) {
            console.error('Error fetching clients:', error);
            if (error.response?.status === 403) {
                alert('CRITICAL: Staff is not authorized to view the customer list. Please RESTART the backend server to apply the new permissions.');
            }
        } finally {
            setLoading(false);
        }
    };

    /* ================= VALIDATION ================= */
    const validate = () => {
        const e = {};
        if (!formData.customerId) e.customerId = 'Customer is required';
        if (!formData.quantity || formData.quantity <= 0)
            e.quantity = 'Quantity must be greater than 0';
        if (!formData.paymentMethod)
            e.paymentMethod = 'Payment method is required';
        setErrors(e);
        return Object.keys(e).length === 0;
    };

    /* ================= CREATE ORDER ================= */
    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!validate()) return;

        try {
            await ordersAPI.create(formData);
            fetchData();
            setShowModal(false);
            setErrors({});
            setFormData({
                customerId: '',
                customerName: '',
                customerEmail: '',
                customerAddress: '',
                customerPhone: '',
                customerPinCode: '',
                modelNo: 'CS_KRISHI_10L',
                quantity: 1,
                pricePerUnit: PRICE_PER_UNIT,
                totalAmount: PRICE_PER_UNIT,
                paymentMethod: '',
                paymentStatus: 'booking_confirmed'
            });
        } catch (err) {
            alert(err.response?.data?.message || 'Error creating order');
        }
    };

    /* ================= FILTER ================= */
    const filteredOrders = orders.filter(order => {
        const term = searchTerm.toLowerCase();
        if (!term) return true;

        const o = order.orderNumber?.toLowerCase() || '';
        const c = order.customerName?.toLowerCase() || '';
        const m = order.modelNo?.toLowerCase() || '';
        const s = order.drones?.map(d => d.serialNo).join(', ').toLowerCase() || '';

        if (searchBy === 'orderNumber') return o.includes(term);
        if (searchBy === 'customer') return c.includes(term);
        if (searchBy === 'model') return m.includes(term);
        if (searchBy === 'serialNo') return s.includes(term);

        return o.includes(term) || c.includes(term) || m.includes(term) || s.includes(term);
    });

    const getStatusColor = (status) => {
        const map = {
            booking_confirmed: 'badge-warning',
            in_manufacturing: 'badge-info',
            ready_for_testing: 'badge-info',
            tested_successfully: 'badge-primary',
            uin_generated: 'badge-primary',
            uin_transferred_successfully: 'badge-success',
            ready_to_dispatch: 'badge-success',
            delivered: 'badge-success'
        };
        return map[status] || 'badge-grey';
    };



    const [pendingStatuses, setPendingStatuses] = useState({});

    const handleStatusUpdate = async (orderId) => {
        const newStatus = pendingStatuses[orderId];
        if (!newStatus) return;

        try {
            setLoading(true);
            await ordersAPI.updateStatus(orderId, newStatus);
            // Clear pending status for this order
            const updatedPending = { ...pendingStatuses };
            delete updatedPending[orderId];
            setPendingStatuses(updatedPending);
            await fetchData();
        } catch (err) {
            alert(err.response?.data?.message || 'Error updating status');
        } finally {
            setLoading(false);
        }
    };

    const handleStatusChange = (orderId, value) => {
        setPendingStatuses({
            ...pendingStatuses,
            [orderId]: value
        });
    };

    const cancelStatusUpdate = (orderId) => {
        const updatedPending = { ...pendingStatuses };
        delete updatedPending[orderId];
        setPendingStatuses(updatedPending);
    };

    const STATUS_SEQUENCE = [
        'booking_confirmed',
        'in_manufacturing',
        'tested_successfully',
        'uin_generated',
        'uin_transferred_successfully',
        'ready_to_dispatch',
        'delivered'
    ];

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
                    <p className="page-subtitle">Track and manage manufacturing orders</p>
                </div>
                <button onClick={() => setShowModal(true)} className="btn btn-primary">
                    + New Order
                </button>
            </div>

            {/* STATS — Linked to Admin logic */}
            <div className="grid grid-cols-4 gap-lg" style={{ marginBottom: '24px' }}>
                <div className="stat-card">
                    <div className="stat-icon">📋</div>
                    <div className="stat-content">
                        <h3>Total Orders</h3>
                        <div className="stat-value">{orders.length}</div>
                    </div>
                </div>

                <div className="stat-card" style={{ borderLeftColor: '#FF9800' }}>
                    <div className="stat-icon">⏳</div>
                    <div className="stat-content">
                        <h3>Confirmed</h3>
                        <div className="stat-value">
                            {orders.filter(o => o.status === 'booking_confirmed').length}
                        </div>
                    </div>
                </div>

                <div className="stat-card" style={{ borderLeftColor: '#2196F3' }}>
                    <div className="stat-icon">🏭</div>
                    <div className="stat-content">
                        <h3>In Progress</h3>
                        <div className="stat-value">
                            {orders.filter(o =>
                                ['in_manufacturing', 'ready_for_testing', 'tested_successfully'].includes(o.status)
                            ).length}
                        </div>
                    </div>
                </div>

                <div className="stat-card" style={{ borderLeftColor: '#4CAF50' }}>
                    <div className="stat-icon">✅</div>
                    <div className="stat-content">
                        <h3>Delivered</h3>
                        <div className="stat-value">
                            {orders.filter(o => o.status === 'delivered').length}
                        </div>
                    </div>
                </div>
            </div>

            {/* SEARCH */}
            <div style={{ display: 'flex', gap: '12px', marginBottom: '16px' }}>
                <input
                    className="form-input"
                    placeholder="Search orders..."
                    value={searchTerm}
                    onChange={e => setSearchTerm(e.target.value)}
                    style={{ maxWidth: '300px' }}
                />
                <select
                    className="form-select"
                    value={searchBy}
                    onChange={e => setSearchBy(e.target.value)}
                    style={{ maxWidth: '180px' }}
                >
                    <option value="all">All</option>
                    <option value="orderNumber">Order Number</option>
                    <option value="customer">Customer</option>
                    <option value="model">Model</option>
                    <option value="serialNo">Serial No.</option>
                </select>
            </div>

            <div className="card">
                <div className="table-container">
                    <table className="table">
                        <thead>
                            <tr>
                                <th>Order #</th>
                                <th>Customer</th>
                                <th>Model</th>
                                <th>Qty</th>
                                <th>Assigned</th>
                                <th>Serial No.</th>
                                <th>Status</th>
                                <th>Date</th>
                                <th>Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            {filteredOrders.map((order) => {
                                const isPending = pendingStatuses[order._id] && pendingStatuses[order._id] !== order.status;
                                return (
                                    <tr key={order._id}>
                                        <td><strong>{order.orderNumber}</strong></td>
                                        <td>
                                            <div>{order.customerName}</div>
                                            <div className="text-xs text-muted">{order.customerPhone}</div>
                                        </td>
                                        <td>{order.modelNo}</td>
                                        <td>{order.quantity}</td>
                                        <td>
                                            {order.drones?.length || 0}/{order.quantity}
                                            {(order.drones?.length || 0) >= order.quantity && <span style={{ color: 'green', marginLeft: '4px' }}>✔</span>}
                                        </td>
                                        <td>
                                            {order.drones && order.drones.length > 0 ? (
                                                <div style={{ fontSize: '12px', fontWeight: '500', color: '#1a237e' }}>
                                                    {order.drones.map(d => d.serialNo).join(', ')}
                                                </div>
                                            ) : (
                                                <span style={{ color: '#ccc' }}>-</span>
                                            )}
                                        </td>
                                        <td>
                                            <span className={`badge ${getStatusColor(order.status)}`}>
                                                {t(`status.${order.status}`) || order.status?.replace(/_/g, ' ')}
                                            </span>
                                        </td>
                                        <td>{new Date(order.createdAt).toLocaleDateString()}</td>
                                        <td>
                                            <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                                                {/* DYNAMIC FOR STAFF */}
                                                <select
                                                    className="form-select"
                                                    value={pendingStatuses[order._id] || order.status}
                                                    onChange={(e) => handleStatusChange(order._id, e.target.value)}
                                                    style={{ 
                                                        borderColor: isPending ? '#2196F3' : '#ddd',
                                                        backgroundColor: isPending ? '#E3F2FD' : '#fff',
                                                        fontSize: '13px',
                                                        padding: '6px'
                                                    }}
                                                >
                                                    {STATUS_SEQUENCE.map((status, index) => {
                                                        const currentIndex = STATUS_SEQUENCE.indexOf(order.status);
                                                        return (
                                                            <option
                                                                key={status}
                                                                value={status}
                                                                disabled={index < currentIndex}
                                                            >
                                                                {status === 'tested_successfully' ? 'Flight Tested Successfully' :
                                                                 status === 'delivered' ? 'Received/Delivered' :
                                                                 status.split('_').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ')}
                                                            </option>
                                                        );
                                                    })}
                                                </select>

                                                {isPending && (
                                                    <div style={{ display: 'flex', gap: '4px' }}>
                                                        <button
                                                            onClick={() => handleStatusUpdate(order._id)}
                                                            className="btn btn-primary"
                                                            style={{ padding: '6px 12px', fontSize: '12px', display: 'flex', alignItems: 'center', gap: '4px' }}
                                                            title="Confirm & Send Update"
                                                        >
                                                            <span style={{ fontSize: '14px' }}>✓</span> Send
                                                        </button>
                                                        <button
                                                            onClick={() => cancelStatusUpdate(order._id)}
                                                            className="btn btn-ghost"
                                                            style={{ padding: '6px 8px', fontSize: '14px', color: '#666' }}
                                                            title="Cancel"
                                                        >
                                                            ✕
                                                        </button>
                                                    </div>
                                                )}


                                            </div>
                                        </td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                </div>

                {orders.length === 0 && (
                    <div style={{ textAlign: 'center', padding: '40px' }}>
                        <p className="text-muted">No orders yet</p>
                    </div>
                )}
            </div>

            {/* CREATE ORDER MODAL */}
            {showModal && (
                <div className="modal-overlay" onClick={() => setShowModal(false)}>
                    <div className="modal" onClick={e => e.stopPropagation()}>
                        <form onSubmit={handleSubmit}>
                            <div className="modal-header">
                                <h3 className="modal-title">New Order</h3>
                            </div>

                            <div className="modal-body">
                                <div className="form-group">
                                    <label className="form-label">Order #</label>
                                    <input className="form-input" value="Auto generated" disabled />
                                </div>

                                <div className="form-group">
                                    <label className="form-label required">Customer</label>
                                    <select
                                        className="form-select"
                                        value={formData.customerId}
                                        onChange={e => {
                                            const c = clients.find(x => x._id === e.target.value);
                                            setFormData({
                                                ...formData,
                                                customerId: c._id,
                                                customerName: c.name,
                                                customerEmail: c.email,
                                                customerPhone: c.phone || '',
                                                customerAddress: c.address || '',
                                                customerPinCode: c.pinCode || ''
                                            });
                                        }}
                                    >
                                        <option value="">Select</option>
                                        {clients.map(c => (
                                            <option key={c._id} value={c._id}>{c.name}</option>
                                        ))}
                                    </select>
                                    {errors.customerId && <p className="text-xs text-error">{errors.customerId}</p>}
                                </div>

                                <div className="form-group">
                                    <label className="form-label">Model</label>
                                    <input className="form-input" value="CS_KRISHI_10L" disabled />
                                </div>

                                <div className="form-group">
                                    <label className="form-label required">Quantity</label>
                                    <input
                                        type="number"
                                        min="1"
                                        className="form-input"
                                        value={formData.quantity}
                                        onChange={e => {
                                            const qty = Number(e.target.value);
                                            setFormData({
                                                ...formData,
                                                quantity: qty,
                                                totalAmount: qty * PRICE_PER_UNIT
                                            });
                                        }}
                                    />
                                    {errors.quantity && <p className="text-xs text-error">{errors.quantity}</p>}
                                </div>

                                <div className="form-group">
                                    <label className="form-label required">Payment Method</label>
                                    <select
                                        className="form-select"
                                        value={formData.paymentMethod}
                                        onChange={e =>
                                            setFormData({ ...formData, paymentMethod: e.target.value })
                                        }
                                    >
                                        <option value="">Select</option>
                                        <option value="cash">Cash</option>
                                        <option value="loan">Loan</option>
                                        <option value="subsidy">Subsidy</option>
                                    </select>
                                    {errors.paymentMethod && (
                                        <p className="text-xs text-error">{errors.paymentMethod}</p>
                                    )}
                                </div>
                            </div>

                            <div className="modal-footer">
                                <button
                                    type="button"
                                    className="btn btn-outline"
                                    onClick={() => setShowModal(false)}
                                >
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

export default StaffOrders;
