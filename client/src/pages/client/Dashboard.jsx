import { useState, useEffect } from 'react';
import { ordersAPI, authAPI } from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import { useLanguage } from '../../context/LanguageContext';
import DroneIcon from '../../components/common/DroneIcon';
import { Link } from 'react-router-dom';
import VerticalTimeline from '../../components/common/VerticalTimeline';
import { getRemainingTimeLabel } from '../../utils/dateUtils';

const ClientDashboard = () => {
    const { user } = useAuth();
    const { t } = useLanguage();
    const [orders, setOrders] = useState([]);
    const [loading, setLoading] = useState(true);

    const [currentUser, setCurrentUser] = useState(user);

    useEffect(() => {
        const fetchProfile = async () => {
            try {
                const response = await authAPI.getMe();
                if (response.data.user) {
                    console.log('[DEBUG] Fetched latest user profile:', response.data.user);
                    setCurrentUser(response.data.user);
                }
            } catch (error) {
                console.error('Error fetching profile:', error);
            }
        };
        fetchProfile();
        fetchOrders();
    }, [user]);

    const fetchOrders = async () => {
        try {
            const response = await ordersAPI.getAll();
            setOrders(response.data.data || []);
        } catch (error) {
            console.error('Error fetching orders:', error);
        } finally {
            setLoading(false);
        }
    };

    const getStatusStep = (status) => {
        const steps = ['booking_confirmed', 'in_manufacturing', 'ready_for_testing', 'tested_successfully', 'uin_generated', 'uin_transferred_successfully', 'ready_to_dispatch', 'delivered'];
        return steps.indexOf(status);
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
                    <h1 className="page-title">{t('dashboard.welcome')}, {currentUser?.name || user?.name}!</h1>
                    <p className="page-subtitle">{t('dashboard.subtitle')}</p>
                </div>
            </div>

            {/* Order Stats */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-lg" style={{ marginBottom: '32px' }}>
                <div className="stat-card">
                    <div className="stat-icon">📋</div>
                    <div className="stat-content">
                        <h3>{t('dashboard.totalOrders')}</h3>
                        <div className="stat-value">{orders.length}</div>
                    </div>
                </div>

                <div className="stat-card" style={{ borderLeftColor: '#4CAF50' }}>
                    <div className="stat-icon" style={{ background: '#E8F5E9', color: '#4CAF50' }}>✅</div>
                    <div className="stat-content">
                        <h3>{t('dashboard.delivered')}</h3>
                        <div className="stat-value">
                            {orders.filter(o => o.status === 'delivered').length}
                        </div>
                    </div>
                </div>

                <div className="stat-card" style={{ borderLeftColor: '#2196F3' }}>
                    <div className="stat-icon" style={{ background: '#E3F2FD', color: '#2196F3' }}><DroneIcon size={24} /></div>
                    <div className="stat-content">
                        <h3>{t('dashboard.inProgress')}</h3>
                        <div className="stat-value">
                            {orders.filter(o => o.status !== 'delivered').length}
                        </div>
                    </div>
                </div>

                <div className="stat-card" style={{ borderLeftColor: '#FFD600' }}>
                    <div className="stat-icon" style={{ background: '#FFFDE7', color: '#FFD600' }}>🆔</div>
                    <div className="stat-content">
                        <h3>EGCA ID</h3>
                        <div className="stat-value" style={{ fontSize: '1.25rem' }}>
                            {currentUser?.egcaId || user?.egcaId || 'Not Assigned'}
                        </div>
                    </div>
                </div>
            </div>

            {/* AMC/ASS Validity */}
            {(currentUser?.hasAMC || currentUser?.hasASS) && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-lg" style={{ marginBottom: '32px' }}>
                    {currentUser?.hasAMC && (
                        <div className="stat-card" style={{ borderLeftColor: getRemainingTimeLabel(currentUser.amcStartDate)?.color || '#2196F3', background: '#f8faff' }}>
                             <div className="stat-icon" style={{ background: '#E3F2FD', color: getRemainingTimeLabel(currentUser.amcStartDate)?.color || '#2196F3' }}>🛡️</div>
                             <div className="stat-content">
                                 <h3 style={{ color: '#1a237e' }}>AMC (Annual Maintenance)</h3>
                                 <div className="stat-value" style={{ fontSize: '1.2rem', color: getRemainingTimeLabel(currentUser.amcStartDate)?.color || '#2196F3' }}>
                                     {getRemainingTimeLabel(currentUser.amcStartDate)?.label}
                                 </div>
                                 <div style={{ fontSize: '0.8rem', color: '#666', marginTop: '4px' }}>
                                     Valid until: {new Date(new Date(currentUser.amcStartDate).setFullYear(new Date(currentUser.amcStartDate).getFullYear() + 1)).toLocaleDateString()}
                                 </div>
                             </div>
                        </div>
                    )}
                    {currentUser?.hasASS && (
                        <div className="stat-card" style={{ borderLeftColor: getRemainingTimeLabel(currentUser.assStartDate)?.color || '#4CAF50', background: '#f8fffa' }}>
                             <div className="stat-icon" style={{ background: '#E8F5E9', color: getRemainingTimeLabel(currentUser.assStartDate)?.color || '#4CAF50' }}>🛠️</div>
                             <div className="stat-content">
                                 <h3 style={{ color: '#00695c' }}>ASS (After Sales Support)</h3>
                                 <div className="stat-value" style={{ fontSize: '1.2rem', color: getRemainingTimeLabel(currentUser.assStartDate)?.color || '#4CAF50' }}>
                                     {getRemainingTimeLabel(currentUser.assStartDate)?.label}
                                 </div>
                                 <div style={{ fontSize: '0.8rem', color: '#666', marginTop: '4px' }}>
                                     Valid until: {new Date(new Date(currentUser.assStartDate).setFullYear(new Date(currentUser.assStartDate).getFullYear() + 1)).toLocaleDateString()}
                                 </div>
                             </div>
                        </div>
                    )}
                </div>
            )}

            {/* Orders List & Timeline */}
            <div className="card" style={{ marginBottom: '24px' }}>
                <div className="card-header">
                    <h3 className="card-title">{t('dashboard.yourOrders')}</h3>
                    <Link to="/client/orders" className="btn btn-outline btn-sm">
                        {t('dashboard.viewDetails')}
                    </Link>
                </div>

                {orders.length === 0 ? (
                    <div style={{ textAlign: 'center', padding: '40px' }}>
                        <p className="text-muted">{t('dashboard.noOrders')}</p>
                    </div>
                ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
                        {orders.slice(0, 3).map((order) => { // Show max 3 recent orders
                            const steps = ['booking_confirmed', 'in_manufacturing', 'ready_for_testing', 'tested_successfully', 'uin_generated', 'uin_transferred_successfully', 'ready_to_dispatch', 'delivered'];
                            const currentStepIndex = getStatusStep(order.status);
                            const progressPercent = (currentStepIndex / (steps.length - 1)) * 100;

                            return (
                                <div key={order._id} style={{ padding: '0 10px' }}>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '16px', flexWrap: 'wrap', gap: '8px' }}>
                                        <div>
                                            <h4 style={{ fontSize: '1.1rem', marginBottom: '4px' }}>
                                                {order.modelNo || 'Drone Order'} <span className="text-muted">#{order.orderNumber}</span>
                                            </h4>
                                            <p className="text-sm text-muted">
                                                {new Date(order.createdAt).toLocaleDateString()}
                                            </p>
                                        </div>
                                        <span className={`badge ${order.status === 'delivered' ? 'badge-success' : 'badge-primary'}`}>
                                            {t(`status.${order.status}`) || order.status}
                                        </span>
                                    </div>

                                    {/* Vertical Order Timeline */}
                                    <VerticalTimeline
                                        steps={steps}
                                        currentStatus={order.status}
                                    />
                                </div>
                            );
                        })}
                    </div>
                )}
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-lg">
                <Link to="/client/support" className="card" style={{ textDecoration: 'none' }}>
                    <div style={{ textAlign: 'center', padding: '20px' }}>
                        <div style={{ fontSize: '2.5rem', marginBottom: '12px' }}>🎧</div>
                        <h4>{t('actions.support')}</h4>
                        <p className="text-sm text-muted">{t('actions.supportDesc')}</p>
                    </div>
                </Link>

                <Link to="/client/faq" className="card" style={{ textDecoration: 'none' }}>
                    <div style={{ textAlign: 'center', padding: '20px' }}>
                        <div style={{ fontSize: '2.5rem', marginBottom: '12px' }}>❓</div>
                        <h4>{t('actions.faqs')}</h4>
                        <p className="text-sm text-muted">{t('actions.faqsDesc')}</p>
                    </div>
                </Link>

                <Link to="/client/service" className="card" style={{ textDecoration: 'none' }}>
                    <div style={{ textAlign: 'center', padding: '20px' }}>
                        <div style={{ fontSize: '2.5rem', marginBottom: '12px' }}>🔧</div>
                        <h4>{t('actions.service')}</h4>
                        <p className="text-sm text-muted">{t('actions.serviceDesc')}</p>
                    </div>
                </Link>
            </div>
        </div>
    );
};

export default ClientDashboard;
