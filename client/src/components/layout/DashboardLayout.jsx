import { useState, useEffect } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import Sidebar from '../Sidebar';
import { useAuth } from '../../context/AuthContext';
import CompanyLogo from '../common/CompanyLogo';
import NotificationBell from '../common/NotificationBell';

const DashboardLayout = () => {
    const [collapsed, setCollapsed] = useState(false);
    const [mobileOpen, setMobileOpen] = useState(false);
    const { user } = useAuth();
    const location = useLocation();

    // Close mobile sidebar on route change
    useEffect(() => {
        setMobileOpen(false);
    }, [location.pathname]);

    // Handle screen resize
    useEffect(() => {
        const handleResize = () => {
            if (window.innerWidth < 768) {
                setCollapsed(false); // On mobile, it's either hidden or full width (drawer)
            } else {
                setMobileOpen(false); // Reset mobile state on desktop
            }
        };

        window.addEventListener('resize', handleResize);
        return () => window.removeEventListener('resize', handleResize);
    }, []);

    const toggleSidebar = () => {
        if (window.innerWidth < 768) {
            setMobileOpen(false); // Mobile: Close the drawer entirely
        } else {
            setCollapsed(!collapsed); // Desktop: Toggle collapse state
        }
    };

    const toggleMobileSidebar = () => {
        setMobileOpen(!mobileOpen);
    };

    return (
        <div className="dashboard-layout">
            {/* Mobile Header / Hamburger */}
            <div className="mobile-header">
                <button className="hamburger-btn" onClick={toggleMobileSidebar}>
                    ☰
                </button>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <CompanyLogo size={40} />
                    <span className="mobile-logo" style={{ fontFamily: "'Times New Roman', Times, serif" }}>CerebroSpark</span>

                </div>
            </div>

            {/* Overlay for mobile */}
            {mobileOpen && (
                <div
                    className="sidebar-overlay"
                    onClick={() => setMobileOpen(false)}
                />
            )}

            {/* Sidebar */}
            <div className={`sidebar-wrapper ${mobileOpen ? 'mobile-open' : ''} ${collapsed ? 'collapsed' : ''}`}>
                <Sidebar collapsed={collapsed && !mobileOpen} toggleSidebar={toggleSidebar} />
            </div>

            {/* Main Content */}
            <main className={`main-content ${collapsed ? 'collapsed' : ''}`}>
                <div style={{ position: 'absolute', top: '20px', right: '30px', zIndex: 1000 }}>
                    <NotificationBell />
                </div>
                <div className="content-container" style={{ paddingTop: '40px' }}>
                    <Outlet />
                </div>
            </main>

            <style>{`
                .dashboard-layout {
                    display: flex;
                    min-height: 100vh;
                    background-color: #f5f7fa;
                }

                .sidebar-wrapper {
                    position: fixed;
                    left: 0;
                    top: 0;
                    bottom: 0;
                    width: 260px; /* Default width */
                    z-index: 1000;
                    transition: width 0.3s ease, transform 0.3s ease;
                    display: flex;
                    flex-direction: column;
                    background: #1e1e1e;
                    overflow: hidden; /* Fix: Prevent content spill during collapse */
                }

                .sidebar-wrapper.collapsed {
                    width: 80px; /* Collapsed width */
                }

                .main-content {
                    flex: 1;
                    margin-left: 260px;
                    padding: 20px;
                    transition: margin-left 0.3s ease;
                    width: 100%;
                }

                .main-content.collapsed {
                    margin-left: 80px;
                }



                .mobile-header {
                    display: none;
                    position: fixed;
                    top: 0;
                    left: 0;
                    right: 0;
                    height: 60px;
                    background: white;
                    padding: 0 20px;
                    align-items: center;
                    gap: 15px;
                    box-shadow: 0 2px 4px rgba(0,0,0,0.1);
                    z-index: 100; /* Ensure clickable */
                }

                .hamburger-btn {
                    background: none;
                    border: none;
                    font-size: 24px;
                    cursor: pointer;
                    padding: 5px; /* Increase click area */
                }

                .mobile-logo {
                    font-weight: bold;
                    font-size: 1.2rem;
                    color: #333;
                }

                /* Mobile Styles */
                @media (max-width: 768px) {
                    .dashboard-layout {
                        flex-direction: column;
                    }

                    .mobile-header {
                        display: flex;
                        z-index: 1500; /* Ensure header is above content but below overlay/sidebar if needed */
                    }

                    .sidebar-wrapper {
                        position: fixed;
                        top: 0;
                        left: 0;
                        bottom: 0;
                        width: 260px; /* Force width on mobile */
                        background: #1e1e1e; /* Fallback background */
                        transform: translateX(-100%);
                        z-index: 2001;
                        transition: transform 0.3s ease;
                        display: flex;
                        flex-direction: column;
                    }

                    .sidebar-wrapper.mobile-open {
                        transform: translateX(0);
                        box-shadow: 4px 0 10px rgba(0,0,0,0.3); /* Add shadow for visibility */
                    }

                    .main-content {
                        margin-left: 0 !important;
                        padding-top: 80px; 
                    }

                    .collapse-btn {
                        display: none;
                    }

                    .sidebar-overlay {
                        display: block;
                        z-index: 2000; /* High z-index for overlay */
                    }
                }
            `}</style>
        </div>
    );
};

export default DashboardLayout;
