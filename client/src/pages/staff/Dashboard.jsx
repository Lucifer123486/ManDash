import { useState, useEffect } from 'react';
import { formsAPI, dronesAPI } from '../../services/api';

const StaffDashboard = () => {
    const [assignedDrones, setAssignedDrones] = useState([]);
    const [formSchemas, setFormSchemas] = useState([]);
    const [recentSubmissions, setRecentSubmissions] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetchData();
    }, []);

    const fetchData = async () => {
        try {
            const [dronesRes, schemasRes, submissionsRes] = await Promise.all([
                dronesAPI.getAll({ limit: 10 }),
                formsAPI.getSchemas({ role: 'staff' }),
                formsAPI.getSubmissions({ limit: 5 })
            ]);

            setAssignedDrones(dronesRes.data.data || []);
            setFormSchemas(schemasRes.data.data || []);
            setRecentSubmissions(submissionsRes.data.data || []);
        } catch (error) {
            console.error('Error fetching data:', error);
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
                    <h1 className="page-title">Staff Dashboard</h1>
                    <p className="page-subtitle">Manage drones, fill forms, and track manufacturing progress</p>
                </div>
                <div style={{ display: 'flex', gap: '12px' }}>
                    <a href="/staff/orders" className="btn btn-primary">+ Create Order</a>
                </div>
            </div>

            {/* Quick Stats */}
            <div className="grid grid-cols-3 gap-lg" style={{ marginBottom: '32px' }}>
                <div className="stat-card">
                    <div className="stat-icon">🚁</div>
                    <div className="stat-content">
                        <h3>Assigned Drones</h3>
                        <div className="stat-value">{assignedDrones.length}</div>
                    </div>
                </div>

                <div className="stat-card" style={{ borderLeftColor: '#4CAF50' }}>
                    <div className="stat-icon" style={{ background: '#E8F5E9', color: '#4CAF50' }}>📝</div>
                    <div className="stat-content">
                        <h3>Forms Submitted</h3>
                        <div className="stat-value">{recentSubmissions.length}</div>
                    </div>
                </div>

                <div className="stat-card" style={{ borderLeftColor: '#2196F3' }}>
                    <div className="stat-icon" style={{ background: '#E3F2FD', color: '#2196F3' }}>📋</div>
                    <div className="stat-content">
                        <h3>Available Forms</h3>
                        <div className="stat-value">{formSchemas.length}</div>
                    </div>
                </div>
            </div>

            <div className="grid grid-cols-2 gap-lg">
                {/* Active Drones */}
                <div className="card">
                    <div className="card-header">
                        <h3 className="card-title">Active Drones</h3>
                        <a href="/staff/drones" className="btn btn-ghost btn-sm">View All →</a>
                    </div>

                    {assignedDrones.length === 0 ? (
                        <p className="text-muted">No drones assigned yet</p>
                    ) : (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                            {assignedDrones.slice(0, 5).map((drone) => (
                                <div key={drone._id} style={{
                                    display: 'flex',
                                    justifyContent: 'space-between',
                                    alignItems: 'center',
                                    padding: '16px',
                                    background: '#f5f5f5',
                                    borderRadius: '8px'
                                }}>
                                    <div>
                                        <div style={{ fontWeight: 600 }}>{drone.serialNo}</div>
                                        <div className="text-sm text-muted">{drone.modelNo}</div>
                                    </div>
                                    <span className={`badge ${drone.manufacturingStatus === 'delivered' ? 'badge-success' :
                                            drone.manufacturingStatus === 'dispatch' ? 'badge-info' :
                                                'badge-warning'
                                        }`}>
                                        {drone.manufacturingStatus?.replace(/_/g, ' ')}
                                    </span>
                                </div>
                            ))}
                        </div>
                    )}
                </div>

                {/* Available Forms */}
                <div className="card">
                    <div className="card-header">
                        <h3 className="card-title">Quick Fill Forms</h3>
                        <a href="/staff/forms" className="btn btn-ghost btn-sm">All Forms →</a>
                    </div>

                    <div className="grid grid-cols-2 gap-md">
                        {formSchemas.slice(0, 6).map((schema) => (
                            <a
                                key={schema._id}
                                href={`/staff/forms/${schema.formCode}`}
                                style={{
                                    display: 'block',
                                    padding: '16px',
                                    background: '#FFF8E1',
                                    borderRadius: '8px',
                                    textDecoration: 'none',
                                    transition: 'all 0.2s'
                                }}
                            >
                                <div style={{ fontWeight: 500, fontSize: '0.875rem', marginBottom: '4px' }}>
                                    {schema.formName}
                                </div>
                                <div className="text-xs text-muted">{schema.category}</div>
                            </a>
                        ))}
                    </div>
                </div>
            </div>

            {/* Recent Submissions */}
            <div className="card" style={{ marginTop: '24px' }}>
                <div className="card-header">
                    <h3 className="card-title">Recent Form Submissions</h3>
                </div>

                {recentSubmissions.length === 0 ? (
                    <p className="text-muted">No submissions yet</p>
                ) : (
                    <div className="table-container">
                        <table className="table">
                            <thead>
                                <tr>
                                    <th>Form</th>
                                    <th>Drone</th>
                                    <th>Status</th>
                                    <th>Submitted</th>
                                    <th>Actions</th>
                                </tr>
                            </thead>
                            <tbody>
                                {recentSubmissions.map((sub) => (
                                    <tr key={sub._id}>
                                        <td>{sub.formSchema?.formName}</td>
                                        <td>{sub.drone?.serialNo || '-'}</td>
                                        <td>
                                            <span className={`badge ${sub.status === 'approved' ? 'badge-success' :
                                                    sub.status === 'rejected' ? 'badge-error' :
                                                        'badge-warning'
                                                }`}>
                                                {sub.status}
                                            </span>
                                        </td>
                                        <td>{new Date(sub.createdAt).toLocaleDateString()}</td>
                                        <td>
                                            <button className="btn btn-ghost btn-sm">View</button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>
        </div>
    );
};

export default StaffDashboard;
