import { useState, useEffect } from 'react';
import { formsAPI, dronesAPI, ordersAPI, usersAPI } from '../../services/api';

const AdminDashboard = () => {
  const [stats, setStats] = useState({
    totalDrones: 0,
    totalOrders: 0,
    pendingApprovals: 0,
    totalStaff: 0,
    totalClients: 0
  });
  const [recentOrders, setRecentOrders] = useState([]);
  const [pendingForms, setPendingForms] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    try {
      const [dronesRes, ordersRes, usersRes, submissionsRes] = await Promise.all([
        dronesAPI.getAll({ limit: 100 }),
        ordersAPI.getAll({ limit: 5 }),
        usersAPI.getAll({ limit: 100 }),
        formsAPI.getSubmissions({ status: 'submitted', limit: 5 })
      ]);

      const users = usersRes.data.data || [];

      setStats({
        totalDrones: dronesRes.data.total || 0,
        totalOrders: ordersRes.data.total || 0,
        pendingApprovals: submissionsRes.data.total || 0,
        totalStaff: users.filter(u => u.role === 'staff').length,
        totalClients: users.filter(u => u.role === 'client').length
      });

      setRecentOrders(ordersRes.data.data || []);
      setPendingForms(submissionsRes.data.data || []);
    } catch (error) {
      console.error('Error fetching dashboard data:', error);
    } finally {
      setLoading(false);
    }
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
          <h1 className="page-title">Admin Dashboard</h1>
          <p className="page-subtitle">Welcome back! Here's an overview of your operations.</p>
        </div>
        <div style={{ display: 'flex', gap: '12px' }}>
          <button className="btn btn-primary">+ New Order</button>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-4 gap-lg" style={{ marginBottom: '32px' }}>
        <div className="stat-card">
          <div className="stat-icon">🚁</div>
          <div className="stat-content">
            <h3>Total Drones</h3>
            <div className="stat-value">{stats.totalDrones}</div>
            <div className="stat-change positive">In manufacturing</div>
          </div>
        </div>

        <div className="stat-card" style={{ borderLeftColor: '#4CAF50' }}>
          <div className="stat-icon" style={{ background: '#E8F5E9', color: '#4CAF50' }}>📋</div>
          <div className="stat-content">
            <h3>Total Orders</h3>
            <div className="stat-value">{stats.totalOrders}</div>
            <div className="stat-change positive">Active orders</div>
          </div>
        </div>

        <div className="stat-card" style={{ borderLeftColor: '#FF9800' }}>
          <div className="stat-icon" style={{ background: '#FFF3E0', color: '#FF9800' }}>⏳</div>
          <div className="stat-content">
            <h3>Pending Approvals</h3>
            <div className="stat-value">{stats.pendingApprovals}</div>
            <div className="stat-change">Forms to review</div>
          </div>
        </div>

        <div className="stat-card" style={{ borderLeftColor: '#2196F3' }}>
          <div className="stat-icon" style={{ background: '#E3F2FD', color: '#2196F3' }}>👥</div>
          <div className="stat-content">
            <h3>Team</h3>
            <div className="stat-value">{stats.totalStaff + stats.totalClients}</div>
            <div className="stat-change">{stats.totalStaff} staff, {stats.totalClients} clients</div>
          </div>
        </div>
      </div>

      {/* Two Column Layout */}
      <div className="grid grid-cols-2 gap-lg">
        {/* Recent Orders */}
        <div className="card">
          <div className="card-header">
            <h3 className="card-title">Recent Orders</h3>
            <a href="/admin/orders" className="btn btn-ghost btn-sm">View All →</a>
          </div>

          {recentOrders.length === 0 ? (
            <p className="text-muted">No orders yet</p>
          ) : (
            <div className="table-container">
              <table className="table">
                <thead>
                  <tr>
                    <th>Order #</th>
                    <th>Customer</th>
                    <th>Status</th>
                    <th>Qty</th>
                  </tr>
                </thead>
                <tbody>
                  {recentOrders.map((order) => (
                    <tr key={order._id}>
                      <td>{order.orderNumber}</td>
                      <td>{order.customerName || order.customer?.name}</td>
                      <td>
                        <span className={`badge badge-${order.status === 'delivered' ? 'success' :
                            order.status === 'dispatched' ? 'info' :
                              order.status === 'confirmed' ? 'primary' : 'warning'
                          }`}>
                          {order.status?.replace(/_/g, ' ')}
                        </span>
                      </td>
                      <td>{order.quantity}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Pending Approvals */}
        <div className="card">
          <div className="card-header">
            <h3 className="card-title">Pending Approvals</h3>
            <a href="/admin/approvals" className="btn btn-ghost btn-sm">View All →</a>
          </div>

          {pendingForms.length === 0 ? (
            <p className="text-muted">No pending approvals</p>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {pendingForms.map((form) => (
                <div key={form._id} style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  padding: '12px 16px',
                  background: '#FFF8E1',
                  borderRadius: '8px',
                  border: '1px solid #FFE082'
                }}>
                  <div>
                    <div style={{ fontWeight: 500 }}>{form.formSchema?.formName}</div>
                    <div className="text-sm text-muted">
                      {form.drone?.serialNo} • {form.submittedBy?.name}
                    </div>
                  </div>
                  <a href={`/submission/${form._id}`} className="btn btn-primary btn-sm">Review</a>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Manufacturing Workflow Overview */}
      <div className="card" style={{ marginTop: '24px' }}>
        <div className="card-header">
          <h3 className="card-title">Manufacturing Workflow Steps</h3>
        </div>
        <div className="workflow-timeline" style={{ justifyContent: 'space-between' }}>
          {[
            { label: 'Material Entry', icon: '📦' },
            { label: 'Inspection', icon: '🔍' },
            { label: 'Distribution', icon: '📤' },
            { label: 'Soldering', icon: '🔧' },
            { label: 'Mechanical', icon: '⚙️' },
            { label: 'Payload', icon: '🎯' },
            { label: 'Electronic', icon: '💡' },
            { label: 'Calibration', icon: '📐' },
            { label: 'Flight Test', icon: '✈️' },
            { label: 'Packaging', icon: '📦' },
            { label: 'Dispatch', icon: '🚚' },
            { label: 'COC', icon: '📜' }
          ].map((step, index) => (
            <div key={index} className="workflow-step">
              <div className="workflow-step-icon">{step.icon}</div>
              <span className="workflow-step-label">{step.label}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default AdminDashboard;
