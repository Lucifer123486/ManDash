import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ordersAPI } from '../../services/api';
import { useLanguage } from '../../context/LanguageContext';
import VerticalTimeline from '../../components/common/VerticalTimeline';

const ClientOrderDetail = () => {
    const { id } = useParams();
    const navigate = useNavigate();
    const { t } = useLanguage();
    const [order, setOrder] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    useEffect(() => {
        fetchOrderDetails();
    }, [id]);

    const fetchOrderDetails = async () => {
        try {
            // Using getOrderTracking for detailed timeline and drones
            const response = await ordersAPI.getTracking(id);
            setOrder(response.data.data);
        } catch (err) {
            console.error('Error fetching order details:', err);
            setError('Failed to load order details. Please try again.');
        } finally {
            setLoading(false);
        }
    };

    if (loading) return (
        <div className="loading-container">
            <div className="loading-spinner"></div>
        </div>
    );

    if (error) return (
        <div className="container" style={{ padding: '40px', textAlign: 'center' }}>
            <div className="card">
                <h3 className="text-error">{error}</h3>
                <button onClick={() => navigate('/client')} className="btn btn-primary" style={{ marginTop: '20px' }}>
                    Back to Dashboard
                </button>
            </div>
        </div>
    );

    if (!order) return null;

    const { order: orderInfo, timeline, drones } = order;

    return (
        <div className="container">
            <div className="page-header">
                <div>
                    <button onClick={() => navigate('/client')} className="btn btn-ghost btn-sm" style={{ marginBottom: '8px', paddingLeft: 0 }}>
                        ← Back to Dashboard
                    </button>
                    <h1 className="page-title">Order #{orderInfo.orderNumber}</h1>
                    <p className="page-subtitle">
                        {orderInfo.quantity}x {orderInfo.modelNo}
                    </p>
                </div>
                <div className={`badge ${orderInfo.status === 'delivered' ? 'badge-success' : 'badge-primary'}`}>
                    {t(`status.${orderInfo.status}`) || orderInfo.status}
                </div>
            </div>

            {/* Timeline */}
            <div className="card" style={{ marginBottom: '24px' }}>
                <h3 className="card-title" style={{ marginBottom: '24px' }}>Tracking Status</h3>

                <VerticalTimeline
                    steps={['booking_confirmed', 'in_manufacturing', 'ready_for_testing', 'tested_successfully', 'uin_generated', 'uin_transferred_successfully', 'ready_to_dispatch', 'delivered']}
                    currentStatus={orderInfo.status}
                />
            </div>

            {/* Drone Details */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-lg">
                <div className="card">
                    <h3 className="card-title">Drone Units</h3>
                    <div className="table-container" style={{ marginTop: '16px' }}>
                        <table className="table">
                            <thead>
                                <tr>
                                    <th>Serial Number</th>
                                    <th>EGCA ID</th>
                                    <th>EGCA Pass</th>
                                    <th>Status</th>
                                </tr>
                            </thead>
                            <tbody>
                                {drones.map(drone => (
                                    <tr key={drone._id}>
                                        <td style={{ fontFamily: 'monospace' }}>{drone.serialNo}</td>
                                        <td>{drone.egcaId || '-'}</td>
                                        <td>{drone.egcaPassword || '-'}</td>
                                        <td>
                                            <span className="badge badge-grey">
                                                {drone.manufacturingStatus?.replace(/_/g, ' ')}
                                            </span>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>

                <div className="card">
                    <h3 className="card-title">Order Information</h3>
                    <div style={{ marginTop: '16px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                            <span className="text-muted">Order Date</span>
                            <span style={{ fontWeight: 500 }}>{new Date(orderInfo.createdAt || Date.now()).toLocaleDateString()}</span>
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                            <span className="text-muted">Quantity</span>
                            <span style={{ fontWeight: 500 }}>{orderInfo.quantity} Units</span>
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                            <span className="text-muted">Model</span>
                            <span style={{ fontWeight: 500 }}>{orderInfo.modelNo}</span>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default ClientOrderDetail;
