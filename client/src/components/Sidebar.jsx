import { NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useLanguage } from '../context/LanguageContext';
import LanguageSwitcher from './common/LanguageSwitcher';
import CompanyLogo from './common/CompanyLogo';
import DroneIcon from './common/DroneIcon';

const Sidebar = ({ collapsed, toggleSidebar }) => {
    const navigate = useNavigate();

    // SAFE HOOK INTEGRATION
    const auth = useAuth();
    const language = useLanguage();

    const user = auth?.user || { name: 'Guest', role: 'guest' };
    const isAdmin = auth?.user?.role === 'admin';
    const isStaff = auth?.user?.role === 'staff';
    const isServiceEngineer = auth?.user?.role === 'staff' && auth?.user?.staffType === 'service_engineer';
    const isCallCentreStaff = auth?.user?.role === 'staff' && auth?.user?.staffType === 'call_centre_staff';
    const isSalesStaff = auth?.user?.role === 'staff' && auth?.user?.staffType === 'sales_staff';
    const isQI = auth?.user?.role === 'qi';
    const isClient = auth?.user?.role === 'client';

    const t = language?.t || ((k) => k);

    const handleLogout = async () => {
        if (auth?.logout) await auth.logout();
        navigate('/login');
    };

    // LINK DEFINITIONS
    const adminLinks = [
        { to: '/admin', label: 'Dashboard', icon: '📊', end: true },
        { to: '/admin/users', label: 'Users', icon: '👥' },
        { to: '/admin/drones', label: 'Drones', icon: <DroneIcon size={18} /> },
        { to: '/admin/orders', label: 'Orders', icon: '📋' },
        { to: '/admin/forms', label: 'Forms', icon: '📝' },
        { to: '/staff/maintenance', label: 'Maintenance Form', icon: '🔧' },
        { to: '/admin/approvals', label: 'Approvals', icon: '✅' },
        { to: '/admin/activations', label: 'Activation Sheet', icon: '📄' },
        { to: '/admin/notifications', label: 'Notifications', icon: '📱' },
        { to: '/admin/prebooking', label: 'Prebooking', icon: '📞' },
        { to: '/admin/support', label: 'Support', icon: '❓' }
    ];

    const staffLinks = [
        { to: '/staff', label: 'Dashboard', icon: '📊', end: true },
        { to: '/staff/users', label: 'Users', icon: '👥' },
        { to: '/staff/orders', label: 'Orders', icon: '📋' },
        { to: '/staff/drones', label: 'Drones', icon: <DroneIcon size={18} /> },
        { to: '/staff/forms', label: 'Fill Forms', icon: '📝' },
        { to: '/staff/maintenance', label: 'Maintenance/Replacement Form', icon: '🔧' },
        { to: '/staff/prebooking', label: 'Prebooking', icon: '📞' },
        { to: '/staff/support', label: 'Support', icon: '❓' },
        { to: '/staff/chatbot', label: 'Chatbot', icon: '🤖' }
    ];

    const qiLinks = [
        { to: '/staff', label: 'Dashboard', icon: '📊', end: true },
        { to: '/staff/drones', label: 'My Drones', icon: <DroneIcon size={18} /> },
        { to: '/staff/forms', label: 'QI Forms', icon: '📝' },
        { to: '/staff/maintenance', label: 'Maintenance Form', icon: '🔧' }
    ];

    const clientLinks = [
        { to: '/client', label: 'sidebar.dashboard', icon: '📊', end: true },
        { to: '/client/orders', label: 'sidebar.myOrders', icon: '📋' },
        { to: '/client/service', label: 'sidebar.service', icon: '🔧' },
        { to: '/client/faq', label: 'sidebar.faq', icon: '❓' },
        { to: '/client/support', label: 'sidebar.support', icon: '🎫' }
    ];

    const seLinks = [
        { to: '/staff/support', label: 'Support Queue', icon: '❓' },
        { to: '/staff/maintenance', label: 'Maintenance/Replacement Form', icon: '🔧' }
    ];
    
    const callCentreStaffLinks = [
        { to: '/staff/users', label: 'Users', icon: '👥' },
        { to: '/staff/support', label: 'Support', icon: '❓' }
    ];

    const salesStaffLinks = [
        { to: '/staff/users', label: 'Users', icon: '👥' },
        { to: '/staff/prebooking', label: 'Prebooking', icon: '📅' }
    ];

    const links = isAdmin ? adminLinks : isQI ? qiLinks : isServiceEngineer ? seLinks : isCallCentreStaff ? callCentreStaffLinks : isSalesStaff ? salesStaffLinks : isStaff ? staffLinks : clientLinks;


    // STYLES
    const sidebarStyle = {
        width: '100%',
        height: '100%',
        background: '#1e1e1e',
        color: 'white',
        display: 'flex',
        flexDirection: 'column',
        padding: collapsed ? '10px' : '20px',
        boxSizing: 'border-box',
        overflowX: 'hidden', // Hide overflow during transition
        transition: 'padding 0.3s ease'
    };

    const logoStyle = {
        display: 'flex',
        alignItems: 'center',
        justifyContent: collapsed ? 'center' : 'space-between',
        marginBottom: '30px',
        height: '40px'
    };

    // Link Style Generator
    const linkStyle = ({ isActive }) => ({
        display: 'flex',
        alignItems: 'center',
        justifyContent: collapsed ? 'center' : 'flex-start',
        padding: '12px 15px',
        marginBottom: '8px',
        background: isActive ? '#FFD600' : 'transparent',
        color: isActive ? '#000' : '#ccc',
        textDecoration: 'none',
        borderRadius: '8px',
        fontWeight: isActive ? '600' : 'normal',
        transition: 'all 0.2s',
        whiteSpace: 'nowrap' // Prevent text wrapping when shrinking
    });

    return (
        <aside style={sidebarStyle}>

            {/* 1. LOGO */}
            <div style={logoStyle}>
                {!collapsed ? (
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <CompanyLogo size={40} theme="dark" />
                        <h1 style={{
                            margin: 0,
                            fontSize: '20px',
                            fontWeight: 'bold',
                            color: 'white',
                            fontFamily: "'Times New Roman', Times, serif"
                        }}>
                            CerebroSpark
                        </h1>
                    </div>

                ) : (
                    <CompanyLogo size={32} theme="dark" />
                )}

                <button
                    onClick={toggleSidebar}
                    className="nav-collapse-btn"
                    title={collapsed ? "Expand" : "Collapse"}
                    style={{
                        background: 'rgba(255,255,255,0.1)',
                        border: 'none',
                        color: 'white',
                        width: '32px',
                        height: '32px',
                        borderRadius: '4px',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center'
                    }}
                >
                    {collapsed ? '→' : '←'}
                </button>
            </div>

            {/* 2. NAV */}
            <nav className="sidebar-nav-scroll" style={{ flex: 1, overflowY: 'auto', overflowX: 'hidden', paddingRight: '4px' }}>
                {!collapsed && (
                    <div style={{ fontSize: '12px', color: '#666', marginBottom: '10px', textTransform: 'uppercase' }}>Menu</div>
                )}
                {links.map((link) => (
                    <NavLink
                        key={link.to}
                        to={link.to}
                        end={link.end} // Fix: Exact matching for dashboard
                        style={linkStyle}
                        title={collapsed ? (isClient ? t(link.label) : link.label) : ''}
                    >
                        <span style={{ marginRight: collapsed ? '0' : '12px', fontSize: '18px', display: 'flex' }}>
                            {link.icon}
                        </span>
                        {!collapsed && (
                            <span>
                                {(isClient && link.label.startsWith('sidebar.')) ? t(link.label) : link.label}
                            </span>
                        )}
                    </NavLink>
                ))}
            </nav>

            {/* 3. FOOTER */}
            <div style={{ borderTop: '1px solid #333', paddingTop: '20px', marginTop: 'auto' }}>
                {!collapsed ? (
                    <>
                        {/* Language Switcher for Clients */}
                        {isClient && (
                            <div style={{ marginBottom: '15px' }}>
                                <div style={{ fontSize: '12px', color: '#888', marginBottom: '8px' }}>Language</div>
                                <LanguageSwitcher />
                            </div>
                        )}

                        <div style={{ display: 'flex', alignItems: 'center', marginBottom: '15px' }}>
                            <div style={{ width: '36px', height: '36px', background: '#6c5ce7', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 'bold', marginRight: '10px' }}>
                                {user.name && user.name.charAt(0)}
                            </div>
                            <div>
                                <div style={{ fontWeight: '600', fontSize: '14px' }}>{user.name}</div>
                                <div style={{ fontSize: '12px', color: '#888', textTransform: 'capitalize' }}>{user.role}</div>
                            </div>
                        </div>

                        <button
                            onClick={handleLogout}
                            style={{
                                width: '100%',
                                padding: '12px',
                                background: '#ffebee',
                                color: '#d32f2f',
                                border: '1px solid #ffcdd2',
                                borderRadius: '8px',
                                cursor: 'pointer',
                                fontWeight: '600',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                gap: '8px'
                            }}
                        >
                            <span>🚪</span> {isClient ? t('actions.logout') : 'Logout'}
                        </button>
                    </>
                ) : (
                    // COLLAPSED FOOTER (Icons Only)
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '10px' }}>
                        <div style={{ width: '32px', height: '32px', background: '#6c5ce7', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 'bold' }}>
                            {user.name && user.name.charAt(0)}
                        </div>
                        <button
                            onClick={handleLogout}
                            title="Logout"
                            style={{
                                width: '32px',
                                height: '32px',
                                background: '#ffebee',
                                color: '#d32f2f',
                                border: 'none',
                                borderRadius: '8px',
                                cursor: 'pointer',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center'
                            }}
                        >
                            🚪
                        </button>
                    </div>
                )}
            </div>

        </aside>
    );
};

export default Sidebar;
