import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { formsAPI, dronesAPI, ticketsAPI } from '../../services/api';
import DroneIcon from '../../components/common/DroneIcon';

const StaffDashboard = () => {
    const [assignedDrones, setAssignedDrones] = useState([]);
    const [formSchemas, setFormSchemas] = useState([]);
    const [recentSubmissions, setRecentSubmissions] = useState([]);
    const [assignedTickets, setAssignedTickets] = useState([]);
    const [ticketStats, setTicketStats] = useState({ active: 0, resolved: 0, total: 0 });
    const [loading, setLoading] = useState(true);

    const { user } = useAuth();
    const navigate = useNavigate();

    useEffect(() => {
        if (['call_centre_staff', 'sales_staff'].includes(user?.staffType)) {
            navigate('/staff/users', { replace: true });
            return;
        }
        fetchData();
    }, [user, navigate]);

    const fetchData = async () => {
        try {
            const [dronesRes, schemasRes, submissionsRes, ticketsRes] = await Promise.all([
                dronesAPI.getAll({ limit: 10 }),
                formsAPI.getSchemas({ role: 'staff' }),
                formsAPI.getSubmissions({ limit: 5 }),
                user?.staffType === 'service_engineer' ? ticketsAPI.getAll() : Promise.resolve({ data: { data: [] } })
            ]);

            setAssignedDrones(dronesRes.data.data || []);
            setFormSchemas(schemasRes.data.data || []);
            setRecentSubmissions(submissionsRes.data.data || []);
            
            if (user?.staffType === 'service_engineer') {
                const allMyTickets = (ticketsRes.data.data || []).filter(t => {
                    const assignedId = typeof t.assignedTo === 'object' ? t.assignedTo?._id : t.assignedTo;
                    return assignedId === user._id;
                });
                
                const active = allMyTickets.filter(t => t.status !== 'resolved').length;
                const resolved = allMyTickets.filter(t => t.status === 'resolved').length;
                
                setTicketStats({
                    active,
                    resolved,
                    total: allMyTickets.length
                });

                // For the "My Assigned Tickets" section, show only non-resolved ones
                setAssignedTickets(allMyTickets.filter(t => t.status !== 'resolved'));
            }
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
            </div>

            {/* Quick Stats */}
            <div className="grid grid-cols-3 gap-lg" style={{ marginBottom: '32px' }}>
                <div className="stat-card">
                    <div className="stat-icon"><DroneIcon size={32} color="#1a237e" /></div>
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

                {user?.staffType === 'service_engineer' && (
                    <>
                        <div className="stat-card" style={{ borderLeftColor: '#f44336' }}>
                            <div className="stat-icon" style={{ background: '#FFEBEE', color: '#f44336' }}>🎫</div>
                            <div className="stat-content">
                                <h3>Active Tickets</h3>
                                <div className="stat-value">{ticketStats.active}</div>
                            </div>
                        </div>
                        <div className="stat-card" style={{ borderLeftColor: '#4CAF50' }}>
                            <div className="stat-icon" style={{ background: '#E8F5E9', color: '#4CAF50' }}>✅</div>
                            <div className="stat-content">
                                <h3>Resolved Tickets</h3>
                                <div className="stat-value">{ticketStats.resolved}</div>
                            </div>
                        </div>
                        <div className="stat-card" style={{ borderLeftColor: '#673AB7' }}>
                            <div className="stat-icon" style={{ background: '#EDE7F6', color: '#673AB7' }}>📊</div>
                            <div className="stat-content">
                                <h3>Total Tickets</h3>
                                <div className="stat-value">{ticketStats.total}</div>
                            </div>
                        </div>
                    </>
                )}
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
                                        {drone.manufacturingStatus === 'delivered' ? 'Completed' : drone.manufacturingStatus?.replace(/_/g, ' ')}
                                    </span>
                                </div>
                            ))}
                        </div>
                    )}
                </div>

                {/* Recent Submissions */}
                <div className="card">
                    <div className="card-header">
                        <h3 className="card-title">Recent Submissions</h3>
                        <a href="/staff/submissions" className="btn btn-ghost btn-sm">View All →</a>
                    </div>

                    {recentSubmissions.length === 0 ? (
                        <p className="text-muted">No submissions yet</p>
                    ) : (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                            {recentSubmissions.slice(0, 5).map((sub) => (
                                <div key={sub._id} style={{
                                    padding: '16px',
                                    background: '#f9f9f9',
                                    borderRadius: '12px',
                                    fontSize: '0.875rem',
                                    display: 'flex',
                                    flexDirection: 'column',
                                    gap: '12px'
                                }}>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                        <div style={{ flex: 1, minWidth: 0 }}>
                                            <div style={{ fontWeight: 600, fontSize: '0.95rem', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                                {sub.formSchema?.formName}
                                            </div>
                                            <div className="text-sm text-muted">
                                                {sub.drone?.serialNo || 'General'} • {new Date(sub.createdAt).toLocaleDateString()}
                                            </div>
                                        </div>
                                        <span className={`badge ${sub.status === 'approved' ? 'badge-success' :
                                            sub.status === 'rejected' ? 'badge-error' :
                                                'badge-warning'
                                            }`} style={{ padding: '4px 12px', fontSize: '11px' }}>
                                            {sub.status}
                                        </span>
                                    </div>

                                    {sub.status === 'rejected' && sub.remarks && (
                                        <div style={{
                                            padding: '12px 16px',
                                            background: '#FFEBEE',
                                            borderRadius: '8px',
                                            borderLeft: '4px solid #F44336',
                                            fontSize: '0.9rem',
                                            color: '#C62828',
                                            fontWeight: 500,
                                            boxShadow: 'inset 0 1px 2px rgba(0,0,0,0.05)',
                                            display: 'flex',
                                            flexDirection: 'column',
                                            gap: '8px'
                                        }}>
                                            <div>
                                                <div style={{ fontSize: '11px', fontWeight: 700, textTransform: 'uppercase', marginBottom: '4px', letterSpacing: '0.5px' }}>
                                                    ❗ Attention Needed
                                                </div>
                                                {sub.remarks}
                                            </div>

                                            <div style={{ marginTop: '4px' }}>
                                                <a
                                                    href={`/staff/forms/${sub.formSchema?.formCode}?droneId=${sub.drone?._id}&droneSerial=${sub.drone?.serialNo || ''}&modelNo=${sub.drone?.model || ''}`}
                                                    className="btn btn-sm"
                                                    style={{
                                                        background: '#F44336',
                                                        color: '#fff',
                                                        border: 'none',
                                                        fontWeight: 600,
                                                        padding: '4px 16px',
                                                        borderRadius: '6px'
                                                    }}
                                                >
                                                    Refill & Resubmit →
                                                </a>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            ))}
                        </div>
                    )}
                </div>

                {/* Assigned Tickets (Special for Service Engineers) */}
                {user?.staffType === 'service_engineer' && (
                    <div className="card" style={{ gridColumn: '1 / -1' }}>
                        <div className="card-header">
                            <h3 className="card-title">🎫 My Assigned Tickets</h3>
                            <a href="/staff/support" className="btn btn-ghost btn-sm">Manage All →</a>
                        </div>
                        {assignedTickets.length === 0 ? (
                            <p className="text-muted">No tickets assigned to you at the moment.</p>
                        ) : (
                            <div className="grid grid-cols-2 gap-md">
                                {assignedTickets.map(ticket => (
                                    <div key={ticket._id} style={{
                                        padding: '16px',
                                        background: '#f8f9fa',
                                        borderRadius: '12px',
                                        border: '1px solid #e0e0e0',
                                        display: 'flex',
                                        flexDirection: 'column',
                                        gap: '10px'
                                    }}>
                                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                                            <div>
                                                <div style={{ fontWeight: 'bold', color: '#1a237e' }}>{ticket.ticketNumber}</div>
                                                <div style={{ fontSize: '12px', color: '#666' }}>{new Date(ticket.createdAt).toLocaleDateString()}</div>
                                            </div>
                                            <span className={`badge ${ticket.assignmentStatus === 'pending_acceptance' ? 'badge-warning' : 'badge-info'}`}>
                                                {ticket.assignmentStatus?.replace(/_/g, ' ')}
                                            </span>
                                        </div>
                                        <div style={{ fontSize: '14px', fontWeight: '500' }}>
                                            👤 {ticket.customerName || ticket.user?.name}
                                        </div>
                                        <div style={{ fontSize: '13px', color: '#444', fontStyle: 'italic' }}>
                                            "{ticket.problemDescription || 'No description provided'}"
                                        </div>
                                        <div style={{ marginTop: '5px' }}>
                                            <button 
                                                onClick={() => navigate('/staff/support')}
                                                className="btn btn-primary btn-sm"
                                                style={{ width: '100%' }}
                                            >
                                                Take Action
                                            </button>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                )}
            </div>

            {/* Quick Fill Forms */}
            <div className="card" style={{ marginTop: '24px' }}>
                <div className="card-header">
                    <h3 className="card-title">Quick Fill Forms</h3>
                    <p className="text-muted text-sm">Select a form to start filling</p>
                </div>

                <div className="grid grid-cols-4 gap-md">
                    {formSchemas.map((schema) => (
                        <a
                            key={schema._id}
                            href={`/staff/forms/${schema.formCode}`}
                            className="stat-card"
                            style={{
                                display: 'block',
                                padding: '16px',
                                background: '#FFFDE7',
                                borderRadius: '12px',
                                textDecoration: 'none',
                                border: '1px solid #FFF59D',
                                transition: 'transform 0.2s, box-shadow 0.2s',
                                textAlign: 'center'
                            }}
                            onMouseOver={e => {
                                e.currentTarget.style.transform = 'translateY(-2px)';
                                e.currentTarget.style.boxSpace = '0 4px 12px rgba(0,0,0,0.05)';
                            }}
                            onMouseOut={e => {
                                e.currentTarget.style.transform = 'translateY(0)';
                                e.currentTarget.style.boxShadow = 'none';
                            }}
                        >
                            <div style={{ fontSize: '24px', marginBottom: '8px' }}>📝</div>
                            <div style={{ fontWeight: 600, fontSize: '0.9rem', color: '#333', marginBottom: '4px' }}>
                                {schema.formName}
                            </div>
                            <div className="badge badge-info" style={{ fontSize: '10px' }}>{schema.category}</div>
                        </a>
                    ))}
                </div>
            </div>
        </div>
    );
};

export default StaffDashboard;
