import { useState, useEffect } from 'react';
import { ordersAPI } from '../../services/api';
import { useAuth } from '../../context/AuthContext';

const ClientDashboard = () => {
    const { user } = useAuth();
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
        const steps = ['confirmed', 'in_manufacturing', 'ready_for_testing', 'uin_registered', 'ready_to_dispatch', 'dispatched', 'delivered'];
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
                    <h1 className="page-title">Welcome, {user?.name}!</h1>
                    <p className="page-subtitle">Track your drone orders and get support</p>
                </div>
            </div>

            {/* Order Stats */}
            <div className="grid grid-cols-3 gap-lg" style={{ marginBottom: '32px' }}>
                <div className="stat-card">
                    <div className="stat-icon">📋</div>
                    <div className="stat-content">
                        <h3>Total Orders</h3>
                        <div className="stat-value">{orders.length}</div>
                    </div>
                </div>

                <div className="stat-card" style={{ borderLeftColor: '#4CAF50' }}>
                    <div className="stat-icon" style={{ background: '#E8F5E9', color: '#4CAF50' }}>✅</div>
                    <div className="stat-content">
                        <h3>Delivered</h3>
                        <div className="stat-value">
                            {orders.filter(o => o.status === 'delivered').length}
                        </div>
                    </div>
                </div>

                <div className="stat-card" style={{ borderLeftColor: '#2196F3' }}>
                    <div className="stat-icon" style={{ background: '#E3F2FD', color: '#2196F3' }}>🚁</div>
                    <div className="stat-content">
                        <h3>In Progress</h3>
                        <div className="stat-value">
                            {orders.filter(o => o.status !== 'delivered').length}
                        </div>
                    </div>
                </div>
            </div>

            {/* Orders List */}
            <div className="card" style={{ marginBottom: '24px' }}>
                <div className="card-header">
                    <h3 className="card-title">Your Orders</h3>
                </div>

                {orders.length === 0 ? (
                    <div style={{ textAlign: 'center', padding: '40px' }}>
                        <p className="text-muted">No orders found</p>
                    </div>
                ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                        {orders.map((order) => (
                            <div key={order._id} style={{
                                padding: '20px',
                                background: '#f9f9f9',
                                borderRadius: '12px',
                                border: '1px solid #e0e0e0'
                            }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '16px' }}>
                                    <div>
                                        <h4 style={{ fontSize: '1.125rem', marginBottom: '4px' }}>
                                            Order #{order.orderNumber}
                                        </h4>
                                        <p className="text-sm text-muted">
                                            {order.quantity}x {order.modelNo || 'CS_KRISHI_10L'}
                                        </p>
                                    </div>
                                    <span className={`badge ${order.status === 'delivered' ? 'badge-success' :
                                            order.status === 'dispatched' ? 'badge-info' :
                                                'badge-primary'
                                        }`}>
                                        {order.status?.replace(/_/g, ' ').toUpperCase()}
                                    </span>
                                </div>

                                {/* Order Timeline */}
                                <div style={{
                                    display: 'flex',
                                    justifyContent: 'space-between',
                                    position: 'relative',
                                    padding: '0 10px'
                                }}>
                                    {/* Progress Line */}
                                    <div style={{
                                        position: 'absolute',
                                        top: '15px',
                                        left: '30px',
                                        right: '30px',
                                        height: '3px',
                                        background: '#e0e0e0',
                                        zIndex: 0
                                    }}>
                                        <div style={{
                                            height: '100%',
                                            background: '#4CAF50',
                                            width: `${(getStatusStep(order.status) / 6) * 100}%`,
                                            transition: 'width 0.3s'
                                        }}></div>
                                    </div>

                                    {['Confirmed', 'Manufacturing', 'Testing', 'Registered', 'Ready', 'Dispatched', 'Delivered'].map((step, idx) => (
                                        <div key={idx} style={{
                                            display: 'flex',
                                            flexDirection: 'column',
                                            alignItems: 'center',
                                            zIndex: 1
                                        }}>
                                            <div style={{
                                                width: '32px',
                                                height: '32px',
                                                borderRadius: '50%',
                                                background: idx <= getStatusStep(order.status) ? '#4CAF50' : '#e0e0e0',
                                                color: idx <= getStatusStep(order.status) ? '#fff' : '#9e9e9e',
                                                display: 'flex',
                                                alignItems: 'center',
                                                justifyContent: 'center',
                                                fontSize: '0.75rem',
                                                fontWeight: 600
                                            }}>
                                                {idx <= getStatusStep(order.status) ? '✓' : idx + 1}
                                            </div>
                                            <span style={{
                                                fontSize: '0.625rem',
                                                marginTop: '4px',
                                                color: idx <= getStatusStep(order.status) ? '#4CAF50' : '#9e9e9e',
                                                textAlign: 'center',
                                                maxWidth: '60px'
                                            }}>
                                                {step}
                                            </span>
                                        </div>
                                    ))}
                                </div>

                                <div style={{
                                    display: 'flex',
                                    justifyContent: 'flex-end',
                                    marginTop: '16px',
                                    gap: '8px'
                                }}>
                                    <a href={`/client/orders/${order._id}`} className="btn btn-outline btn-sm">
                                        View Details
                                    </a>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>

            {/* Quick Actions */}
            <div className="grid grid-cols-3 gap-lg">
                <a href="/client/support" className="card" style={{ textDecoration: 'none' }}>
                    <div style={{ textAlign: 'center', padding: '20px' }}>
                        <div style={{ fontSize: '2.5rem', marginBottom: '12px' }}>🎧</div>
                        <h4>Support</h4>
                        <p className="text-sm text-muted">Raise a ticket or get help</p>
                    </div>
                </a>

                <a href="/client/faq" className="card" style={{ textDecoration: 'none' }}>
                    <div style={{ textAlign: 'center', padding: '20px' }}>
                        <div style={{ fontSize: '2.5rem', marginBottom: '12px' }}>❓</div>
                        <h4>FAQs</h4>
                        <p className="text-sm text-muted">Common questions answered</p>
                    </div>
                </a>

                <a href="/client/service" className="card" style={{ textDecoration: 'none' }}>
                    <div style={{ textAlign: 'center', padding: '20px' }}>
                        <div style={{ fontSize: '2.5rem', marginBottom: '12px' }}>🔧</div>
                        <h4>Service</h4>
                        <p className="text-sm text-muted">Maintenance & repairs</p>
                    </div>
                </a>
            </div>
        </div>
    );
};

export default ClientDashboard;
