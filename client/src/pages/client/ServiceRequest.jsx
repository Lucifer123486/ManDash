import { useState, useEffect } from 'react';
import { ordersAPI, ticketsAPI } from '../../services/api'; // Ensure ticketsAPI is exported
import { useAuth } from '../../context/AuthContext';
import { useLanguage } from '../../context/LanguageContext';
import { useNavigate } from 'react-router-dom';

const ServiceRequest = () => {
    const { user } = useAuth();
    const { t } = useLanguage();
    const navigate = useNavigate();
    const [orders, setOrders] = useState([]);
    const [loading, setLoading] = useState(true);
    const [requestModal, setRequestModal] = useState({ open: false, orderId: null });
    const [issueDescription, setIssueDescription] = useState('');
    const [submitting, setSubmitting] = useState(false);

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

    const handleRequestService = (orderId) => {
        setRequestModal({ open: true, orderId });
        setIssueDescription('');
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setSubmitting(true);
        try {
            await ticketsAPI.create({
                category: 'Service',
                issueDescription: issueDescription,
                orderId: requestModal.orderId
            });
            alert(t('service.successPayload') || 'Service request submitted successfully!');
            setRequestModal({ open: false, orderId: null });
            // Refresh orders to update free service count
            fetchOrders();
        } catch (error) {
            alert(error.response?.data?.message || 'Failed to submit request');
        } finally {
            setSubmitting(false);
        }
    };

    if (loading) return <div className="loading-container"><div className="loading-spinner"></div></div>;

    return (
        <div className="container">
            <div className="page-header">
                <div>
                    <h1 className="page-title">{t('service.title') || 'Service & Maintenance'}</h1>
                    <p className="page-subtitle">{t('service.subtitle') || 'Request service for your drones'}</p>
                </div>
                <button className="btn btn-secondary" onClick={() => navigate('/client')}>
                    {t('common.back') || 'Back'}
                </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-lg">
                {orders.map(order => (
                    <div key={order._id} className="card">
                        <div className="card-header">
                            <h3 className="card-title">Order #{order.orderNumber}</h3>
                            <span className={`badge ${order.status === 'delivered' ? 'badge-success' : 'badge-info'}`}>
                                {t(`status.${order.status}`) || order.status}
                            </span>
                        </div>
                        <div style={{ marginBottom: '16px' }}>
                            <p className="text-sm text-muted">{t('common.model')}: {order.modelNo || 'N/A'}</p>
                            <p className="text-sm text-muted">{t('common.date')}: {new Date(order.createdAt).toLocaleDateString()}</p>

                            <div style={{ marginTop: '12px', padding: '10px', background: '#f5f5f5', borderRadius: '8px' }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
                                    <span className="text-sm font-medium">{t('service.freeServices') || 'Free Services'}:</span>
                                    <span className={`badge ${order.freeServicesUsed >= 6 ? 'badge-grey' : 'badge-success'}`}>
                                        {order.freeServicesUsed || 0} / 6
                                    </span>
                                </div>
                                <div style={{ height: '6px', background: '#e0e0e0', borderRadius: '3px', overflow: 'hidden' }}>
                                    <div style={{
                                        width: `${((order.freeServicesUsed || 0) / 6) * 100}%`,
                                        background: order.freeServicesUsed >= 6 ? '#9e9e9e' : '#4CAF50',
                                        height: '100%'
                                    }}></div>
                                </div>
                                <p className="text-xs text-muted" style={{ marginTop: '4px' }}>
                                    {order.freeServicesUsed >= 6
                                        ? (t('service.paidStatus') || 'Paid service applies')
                                        : (t('service.freeStatus') || 'Free service available')}
                                </p>
                            </div>
                        </div>

                        <button
                            className="btn btn-primary"
                            style={{ width: '100%', opacity: order.freeServicesUsed >= 6 ? 0.6 : 1 }}
                            onClick={() => handleRequestService(order._id)}
                            disabled={order.freeServicesUsed >= 6}
                        >
                            {order.freeServicesUsed >= 6 ? 'Limit Reached' : (t('service.requestBtn') || 'Request Service')}
                        </button>
                    </div>
                ))}

                {orders.length === 0 && (
                    <div className="col-span-full text-center py-10">
                        <p className="text-muted">{t('dashboard.noOrders')}</p>
                    </div>
                )}
            </div>

            {/* Request Modal */}
            {requestModal.open && (
                <div className="modal-overlay" onClick={() => setRequestModal({ open: false, orderId: null })}>
                    <div className="modal" onClick={e => e.stopPropagation()}>
                        <div className="modal-header">
                            <h3 className="modal-title">{t('service.requestTitle') || 'Request Service'}</h3>
                            <button className="modal-close" onClick={() => setRequestModal({ open: false, orderId: null })}>×</button>
                        </div>
                        <form onSubmit={handleSubmit}>
                            <div className="modal-body">
                                <div className="form-group">
                                    <label className="form-label required">{t('service.issueDesc') || 'Issue Description'}</label>
                                    <textarea
                                        className="form-textarea"
                                        value={issueDescription}
                                        onChange={e => setIssueDescription(e.target.value)}
                                        required
                                        placeholder={t('service.issuePlaceholder') || "Describe the issue..."}
                                    ></textarea>
                                </div>
                            </div>
                            <div className="modal-footer">
                                <button type="button" className="btn btn-secondary" onClick={() => setRequestModal({ open: false, orderId: null })}>
                                    {t('common.cancel') || 'Cancel'}
                                </button>
                                <button type="submit" className="btn btn-primary" disabled={submitting}>
                                    {submitting ? (t('common.submitting') || 'Submitting...') : (t('common.submit') || 'Submit Request')}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};

export default ServiceRequest;
