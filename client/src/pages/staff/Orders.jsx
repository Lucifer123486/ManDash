import { useState, useEffect } from 'react';
import { ordersAPI } from '../../services/api';

const StaffOrders = () => {
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

    const getStatusColor = (status) => {
        const colors = {
            pending: 'badge-warning',
            confirmed: 'badge-primary',
            in_manufacturing: 'badge-info',
            ready_for_testing: 'badge-info',
            dispatched: 'badge-success',
            delivered: 'badge-success'
        };
        return colors[status] || 'badge-grey';
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
                    <h1 className="page-title">Orders</h1>
                    <p className="page-subtitle">View and track customer orders</p>
                </div>
            </div>

            <div className="card">
                <div className="table-container">
                    <table className="table">
                        <thead>
                            <tr>
                                <th>Order #</th>
                                <th>Customer</th>
                                <th>Model</th>
                                <th>Qty</th>
                                <th>Status</th>
                                <th>Date</th>
                            </tr>
                        </thead>
                        <tbody>
                            {orders.map((order) => (
                                <tr key={order._id}>
                                    <td><strong>{order.orderNumber}</strong></td>
                                    <td>{order.customerName}</td>
                                    <td>{order.modelNo}</td>
                                    <td>{order.quantity}</td>
                                    <td>
                                        <span className={`badge ${getStatusColor(order.status)}`}>
                                            {order.status?.replace(/_/g, ' ')}
                                        </span>
                                    </td>
                                    <td>{new Date(order.createdAt).toLocaleDateString()}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>

                {orders.length === 0 && (
                    <div style={{ textAlign: 'center', padding: '40px' }}>
                        <p className="text-muted">No orders yet</p>
                    </div>
                )}
            </div>
        </div>
    );
};

export default StaffOrders;
