import { NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const Sidebar = () => {
    const { user, logout, isAdmin, isStaff, isQI, isClient } = useAuth();
    const navigate = useNavigate();

    const handleLogout = async () => {
        await logout();
        navigate('/login');
    };

    const adminLinks = [
        { to: '/admin', label: 'Dashboard', icon: '📊' },
        { to: '/admin/users', label: 'Staff & Clients', icon: '👥' },
        { to: '/admin/drones', label: 'All Drones', icon: '🚁' },
        { to: '/admin/orders', label: 'Orders', icon: '📋' },
        { to: '/admin/forms', label: 'Forms', icon: '📝' },
        { to: '/admin/approvals', label: 'Approvals', icon: '✅' },
        { to: '/admin/notifications', label: 'Send SMS', icon: '📱' }
    ];

    const staffLinks = [
        { to: '/staff', label: 'Dashboard', icon: '📊' },
        { to: '/staff/orders', label: 'Create Order', icon: '➕' },
        { to: '/staff/drones', label: 'My Drones', icon: '🚁' },
        { to: '/staff/workflow', label: 'Manufacturing', icon: '🏭' },
        { to: '/staff/forms', label: 'Fill Forms', icon: '📝' }
    ];

    const qiLinks = [
        { to: '/staff', label: 'Dashboard', icon: '📊' },
        { to: '/staff/drones', label: 'My Drones', icon: '🚁' },
        { to: '/staff/forms', label: 'QI Forms', icon: '📝' }
    ];

    const clientLinks = [
        { to: '/client', label: 'Dashboard', icon: '📊' },
        { to: '/client/orders', label: 'My Orders', icon: '📋' },
        { to: '/client/tracking', label: 'Track Order', icon: '📍' },
        { to: '/client/support', label: 'Support', icon: '🎧' }
    ];

    const links = isAdmin ? adminLinks : isQI ? qiLinks : isStaff ? staffLinks : clientLinks;

    return (
        <aside className="sidebar">
            <div className="sidebar-logo">
                <div style={{
                    width: 50,
                    height: 50,
                    borderRadius: '50%',
                    background: 'linear-gradient(135deg, #FFD600, #FFC107)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontWeight: 'bold',
                    fontSize: '1.5rem',
                    color: '#212121'
                }}>
                    CS
                </div>
                <div>
                    <h1>CEREBROSPARK</h1>
                    <span style={{ fontSize: '0.75rem', color: '#9e9e9e' }}>INNOVATIONS</span>
                </div>
            </div>

            <nav className="sidebar-nav">
                {links.map((link) => (
                    <NavLink
                        key={link.to}
                        to={link.to}
                        className={({ isActive }) => `sidebar-link ${isActive ? 'active' : ''}`}
                        end={link.to === '/admin' || link.to === '/staff' || link.to === '/client'}
                    >
                        <span>{link.icon}</span>
                        <span>{link.label}</span>
                    </NavLink>
                ))}
            </nav>

            <div style={{ marginTop: 'auto', paddingTop: '24px', borderTop: '1px solid rgba(255,255,255,0.1)' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '16px' }}>
                    <div style={{
                        width: 40,
                        height: 40,
                        borderRadius: '50%',
                        background: '#FFD600',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontWeight: 600,
                        color: '#212121'
                    }}>
                        {user?.name?.charAt(0)?.toUpperCase() || 'U'}
                    </div>
                    <div>
                        <div style={{ fontWeight: 500, color: '#fff' }}>{user?.name}</div>
                        <div style={{ fontSize: '0.75rem', color: '#9e9e9e', textTransform: 'capitalize' }}>
                            {user?.role}
                        </div>
                    </div>
                </div>
                <button onClick={handleLogout} className="btn btn-outline" style={{ width: '100%', color: '#fff', borderColor: 'rgba(255,255,255,0.2)' }}>
                    🚪 Logout
                </button>
            </div>
        </aside>
    );
};

export default Sidebar;
