import { useState, useEffect } from 'react';
import { formsAPI, dronesAPI, ordersAPI, usersAPI } from '../../services/api';
import DroneIcon from '../../components/common/DroneIcon';

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
      {/* Header */}
      <div className="page-header">
        <div>
          <h1 className="page-title">Admin Dashboard</h1>
          <p className="page-subtitle">
            Welcome back! Here's an overview of your operations.
          </p>
        </div>
        {/* ❌ + New Order button REMOVED from dashboard */}
      </div>

      {/* Stats */}
      <div className="grid grid-cols-4 gap-lg" style={{ marginBottom: '32px' }}>
        <div className="stat-card">
          <div className="stat-icon"><DroneIcon size={32} color="#1a237e" /></div>
          <div className="stat-content">
            <h3>Total Drones</h3>
            <div className="stat-value">{stats.totalDrones}</div>
            <div className="stat-change positive">In manufacturing</div>
          </div>
        </div>

        <div className="stat-card" style={{ borderLeftColor: '#4CAF50' }}>
          <div className="stat-icon">📋</div>
          <div className="stat-content">
            <h3>Total Orders</h3>
            <div className="stat-value">{stats.totalOrders}</div>
            <div className="stat-change positive">Active orders</div>
          </div>
        </div>

        <div className="stat-card" style={{ borderLeftColor: '#FF9800' }}>
          <div className="stat-icon">⏳</div>
          <div className="stat-content">
            <h3>Pending Approvals</h3>
            <div className="stat-value">{stats.pendingApprovals}</div>
            <div className="stat-change">Forms to review</div>
          </div>
        </div>

        <div className="stat-card" style={{ borderLeftColor: '#2196F3' }}>
          <div className="stat-icon">👥</div>
          <div className="stat-content">
            <h3>Team</h3>
            <div className="stat-value">
              {stats.totalStaff + stats.totalClients}
            </div>
            <div className="stat-change">
              {stats.totalStaff} staff, {stats.totalClients} clients
            </div>
          </div>
        </div>
      </div>

      {/* Orders + Approvals */}
      <div className="grid grid-cols-2 gap-lg">
        {/* Recent Orders */}
        <div className="card">
          <div className="card-header">
            <h3 className="card-title">Recent Orders</h3>
            <a href="/admin/orders">View All →</a>
          </div>

          {recentOrders.length === 0 ? (
            <p>No orders yet</p>
          ) : (
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
                {recentOrders.map(order => (
                  <tr key={order._id}>
                    <td>{order.orderNumber}</td>
                    <td>{order.customerName || order.customer?.name}</td>
                    <td>{order.status}</td>
                    <td>{order.quantity}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        {/* Pending Approvals */}
        <div className="card">
          <div className="card-header">
            <h3 className="card-title">Pending Approvals</h3>
            <a href="/admin/approvals" className="btn btn-ghost btn-sm">View All →</a>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            {pendingForms.length === 0 ? (
              <p className="text-muted">No pending approvals</p>
            ) : (
              pendingForms.map(form => (
                <div key={form._id} style={{
                  padding: '16px',
                  background: '#f9f9f9',
                  borderRadius: '12px',
                  border: '1px solid #eee'
                }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '12px' }}>
                    <div>
                      <h4 style={{ margin: 0, fontSize: '1rem', fontWeight: 600 }}>{form.formSchema?.formName}</h4>
                      <p className="text-xs text-muted" style={{ marginTop: '2px' }}>
                        {form.drone?.serialNo || 'General'} • {new Date(form.createdAt).toLocaleDateString()}
                      </p>
                    </div>
                    <span className="badge badge-warning" style={{ fontSize: '10px' }}>Pending</span>
                  </div>

                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div className="text-xs">
                      <span className="text-muted">By:</span> <strong>{form.submittedBy?.name || 'Staff'}</strong>
                    </div>
                    <div style={{ display: 'flex', gap: '8px' }}>
                      <a href={`/submission/${form._id}`} className="btn btn-outline btn-xs">View</a>
                      <button 
                        onClick={async () => {
                          const remarks = prompt('Enter rejection reason:');
                          if (!remarks) return;
                          try {
                            await formsAPI.updateSubmissionStatus(form._id, 'rejected', remarks);
                            fetchDashboardData();
                          } catch (err) {
                            alert('Error rejecting form');
                          }
                        }}
                        className="btn btn-outline btn-xs" 
                        style={{ color: '#F44336', borderColor: '#F44336' }}
                      >
                        Reject
                      </button>
                      <button 
                        onClick={async () => {
                          if (!window.confirm('Approve this submission?')) return;
                          try {
                            await formsAPI.updateSubmissionStatus(form._id, 'approved');
                            
                            // Optional: Update workflow if order exists
                            if (form.drone && form.formSchema?.workflowOrder) {
                              const workflowMap = {
                                1: 'material_entry', 2: 'material_inspection', 3: 'inventory_update',
                                4: 'material_distribution', 5: 'soldering', 6: 'mechanical_assembly',
                                7: 'payload_assembly', 8: 'electronic_assembly', 9: 'calibration',
                                10: 'flight_test', 11: 'packaging', 12: 'dispatch', 13: 'delivered'
                              };
                              const nextStatus = workflowMap[form.formSchema.workflowOrder];
                              if (nextStatus) {
                                await dronesAPI.updateStatus(form.drone._id, { manufacturingStatus: nextStatus });
                              }
                            }
                            fetchDashboardData();
                          } catch (err) {
                            alert('Error approving form');
                          }
                        }}
                        className="btn btn-success btn-xs"
                      >
                        Approve
                      </button>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default AdminDashboard;
