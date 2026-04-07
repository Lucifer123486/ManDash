import { useState, useEffect } from 'react';
import { ordersAPI, usersAPI } from '../../services/api';
import { Trash2 } from 'lucide-react';
import { useLanguage } from '../../context/LanguageContext';

const PRICE_PER_UNIT = 500000;

const Orders = () => {
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
    paymentStatus: 'booking_confirmed'
  });

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const [ordersRes, usersRes] = await Promise.all([
        ordersAPI.getAll(),
        usersAPI.getAll({ role: 'client' })
      ]);
      setOrders(ordersRes.data.data || []);
      setClients(usersRes.data.data || []);
    } catch (e) {
      console.error(e);
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

    if (searchBy === 'orderNumber') return o.includes(term);
    if (searchBy === 'customer') return c.includes(term);
    if (searchBy === 'model') return m.includes(term);

    return o.includes(term) || c.includes(term) || m.includes(term);
  });

  const updateStatus = async (id, status) => {
    await ordersAPI.updateStatus(id, status);
    fetchData();
  };

  const handleDelete = async (orderId, orderNo) => {
    const password = window.prompt(`Please enter your password to delete order ${orderNo}:`);
    if (!password) return;

    try {
      await ordersAPI.delete(orderId, password);
      fetchData();
    } catch (err) {
      alert(err.response?.data?.message || 'Error deleting order');
    }
  };

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

  if (loading) {
    return (
      <div className="loading-container">
        <div className="loading-spinner"></div>
      </div>
    );
  }

  return (
    <div>
      {/* HEADER */}
      <div className="page-header">
        <div>
          <h1 className="page-title">Orders</h1>
          <p className="page-subtitle">Manage customer orders and track delivery</p>
        </div>
        <button onClick={() => setShowModal(true)} className="btn btn-primary">
          + New Order
        </button>
      </div>

      {/* STATS — UNTOUCHED */}
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
        </select>
      </div>

      {/* TABLE — UNTOUCHED */}
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
                <th>Status</th>
                <th>Date</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredOrders.map(order => (
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
                    <span className={`badge ${getStatusColor(order.status)}`}>
                      {t(`status.${order.status}`) || order.status?.replace(/_/g, ' ')}
                    </span>
                  </td>
                  <td>{new Date(order.createdAt).toLocaleDateString()}</td>
                  <td>
                    <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                      <select
                        className="form-select"
                        value={order.status}
                        onChange={e => updateStatus(order._id, e.target.value)}
                      >
                        <option value="booking_confirmed">Booking Confirmed</option>
                        <option value="in_manufacturing">In Manufacturing</option>
                        <option value="tested_successfully">Flight Tested Successfully</option>
                        <option value="uin_generated">UIN Generated</option>
                        <option value="uin_transferred_successfully">UIN Transferred Successfully</option>
                        <option value="ready_to_dispatch">Ready to Dispatch</option>
                        <option value="delivered">Received/Delivered</option>
                      </select>
                      <button
                        onClick={() => handleDelete(order._id, order.orderNumber)}
                        className="btn btn-outline"
                        style={{ padding: '6px 8px', borderColor: '#f44336', color: '#f44336', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                        title="Delete Order"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
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

export default Orders;
