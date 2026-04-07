import { useState, useEffect } from 'react';
import { ordersAPI } from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import { useLanguage } from '../../context/LanguageContext';
import { Link, useNavigate } from 'react-router-dom';
import VerticalTimeline from '../../components/common/VerticalTimeline';

const ClientTracking = () => {
    const { user } = useAuth();
    const { t } = useLanguage();
    const navigate = useNavigate();
    const [orders, setOrders] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetchOrders();
    }, []);

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
        <div className="container">
            <div className="page-header">
                <div>
                    <h1 className="page-title">{t('sidebar.trackOrder')}</h1>
                    <p className="page-subtitle">Track the live status of your drone orders</p>
                </div>
            </div>

            {orders.length === 0 ? (
                <div className="card" style={{ textAlign: 'center', padding: '40px' }}>
                    <p className="text-muted">{t('dashboard.noOrders')}</p>
                    <Link to="/client/support" className="btn btn-primary" style={{ marginTop: '16px' }}>
                        Contact Support
                    </Link>
                </div>
            ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
                    {orders.map((order) => {
                        const steps = ['booking_confirmed', 'in_manufacturing', 'ready_for_testing', 'tested_successfully', 'uin_generated', 'uin_transferred_successfully', 'ready_to_dispatch', 'delivered'];
                        const currentStepIndex = getStatusStep(order.status);
                        const progressPercent = (currentStepIndex / (steps.length - 1)) * 100;

                        return (
                            <div key={order._id} className="card">
                                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '24px', flexWrap: 'wrap', gap: '8px' }}>
                                    <div>
                                        <h4 style={{ fontSize: '1.25rem', marginBottom: '4px' }}>
                                            {order.modelNo || 'Drone Order'} <span className="text-muted">#{order.orderNumber}</span>
                                        </h4>
                                        <p className="text-sm text-muted">
                                            Ordered on {new Date(order.createdAt).toLocaleDateString()}
                                        </p>
                                    </div>
                                    <span className={`badge ${order.status === 'delivered' ? 'badge-success' :
                                        order.status === 'dispatched' ? 'badge-info' :
                                            'badge-primary'
                                        }`} style={{ height: 'fit-content', fontSize: '0.9rem' }}>
                                        {t(`status.${order.status}`) || order.status?.replace(/_/g, ' ').toUpperCase()}
                                    </span>
                                </div>

                                {/* Order Timeline */}
                                <VerticalTimeline
                                    steps={steps}
                                    currentStatus={order.status}
                                />

                                <div style={{
                                    display: 'flex',
                                    justifyContent: 'flex-end',
                                    borderTop: '1px solid #eee',
                                    paddingTop: '16px',
                                    gap: '12px'
                                }}>
                                    <button onClick={() => navigate(`/client/orders/${order._id}`)} className="btn btn-outline">
                                        View Full Details
                                    </button>
                                </div>
                            </div>
                        )
                    })}
                </div>
            )}
        </div>
    );
};

export default ClientTracking;
