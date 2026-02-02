import { useState } from 'react';
import { notificationsAPI } from '../../services/api';

const Notifications = () => {
    const [formData, setFormData] = useState({
        type: 'individual',
        role: 'all',
        title: '',
        message: ''
    });
    const [sending, setSending] = useState(false);
    const [success, setSuccess] = useState(false);

    const handleSubmit = async (e) => {
        e.preventDefault();
        setSending(true);

        try {
            if (formData.type === 'individual') {
                // This would need a user selector - simplified for now
                alert('Individual notifications require FCM setup. Use bulk notifications for now.');
            } else if (formData.type === 'festive') {
                await notificationsAPI.sendFestive(formData.message, formData.title);
            } else if (formData.type === 'service') {
                await notificationsAPI.sendService(formData.message, formData.title);
            } else {
                await notificationsAPI.sendBulk(formData.role, formData.message, formData.title);
            }

            setSuccess(true);
            setFormData({ type: 'individual', role: 'all', title: '', message: '' });
            setTimeout(() => setSuccess(false), 3000);
        } catch (error) {
            alert(error.response?.data?.message || 'Error sending notification');
        } finally {
            setSending(false);
        }
    };

    const templates = [
        { title: 'Order Confirmation', message: 'Your order has been confirmed. We will start manufacturing soon.' },
        { title: 'Manufacturing Started', message: 'Good news! Your drone is now in manufacturing.' },
        { title: 'Ready for Dispatch', message: 'Your drone is ready and will be dispatched soon.' },
        { title: 'Diwali Greetings', message: 'Wishing you a Happy Diwali from Cerebrospark Innovations!' },
        { title: 'Service Reminder', message: 'It\'s time for your drone service. Please schedule an appointment.' }
    ];

    return (
        <div>
            <div className="page-header">
                <div>
                    <h1 className="page-title">Send Notifications</h1>
                    <p className="page-subtitle">Send SMS/Push notifications to users</p>
                </div>
            </div>

            {success && (
                <div style={{
                    background: '#E8F5E9',
                    color: '#4CAF50',
                    padding: '16px',
                    borderRadius: '8px',
                    marginBottom: '24px',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '12px'
                }}>
                    ✅ Notification sent successfully!
                </div>
            )}

            <div className="grid grid-cols-2 gap-lg">
                {/* Compose Form */}
                <div className="card">
                    <div className="card-header">
                        <h3 className="card-title">Compose Message</h3>
                    </div>

                    <form onSubmit={handleSubmit}>
                        <div className="form-group">
                            <label className="form-label">Notification Type</label>
                            <select
                                className="form-select"
                                value={formData.type}
                                onChange={(e) => setFormData({ ...formData, type: e.target.value })}
                            >
                                <option value="individual">Individual User</option>
                                <option value="bulk">Bulk (by Role)</option>
                                <option value="festive">Festive Greeting (All)</option>
                                <option value="service">Service Reminder (All)</option>
                            </select>
                        </div>

                        {formData.type === 'bulk' && (
                            <div className="form-group">
                                <label className="form-label">Target Role</label>
                                <select
                                    className="form-select"
                                    value={formData.role}
                                    onChange={(e) => setFormData({ ...formData, role: e.target.value })}
                                >
                                    <option value="all">All Users</option>
                                    <option value="client">All Clients</option>
                                    <option value="staff">All Staff</option>
                                </select>
                            </div>
                        )}

                        <div className="form-group">
                            <label className="form-label required">Title</label>
                            <input
                                type="text"
                                className="form-input"
                                value={formData.title}
                                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                                placeholder="Notification title"
                                required
                            />
                        </div>

                        <div className="form-group">
                            <label className="form-label required">Message</label>
                            <textarea
                                className="form-textarea"
                                value={formData.message}
                                onChange={(e) => setFormData({ ...formData, message: e.target.value })}
                                placeholder="Enter your message..."
                                required
                                rows={5}
                            />
                            <div className="text-xs text-muted" style={{ marginTop: '4px' }}>
                                {formData.message.length}/160 characters
                            </div>
                        </div>

                        <button type="submit" className="btn btn-primary" disabled={sending} style={{ width: '100%' }}>
                            {sending ? 'Sending...' : '📲 Send Notification'}
                        </button>
                    </form>
                </div>

                {/* Templates */}
                <div className="card">
                    <div className="card-header">
                        <h3 className="card-title">Quick Templates</h3>
                    </div>

                    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                        {templates.map((template, idx) => (
                            <div
                                key={idx}
                                onClick={() => setFormData({ ...formData, title: template.title, message: template.message })}
                                style={{
                                    padding: '12px 16px',
                                    background: '#f9f9f9',
                                    borderRadius: '8px',
                                    cursor: 'pointer',
                                    transition: 'all 0.2s'
                                }}
                            >
                                <div style={{ fontWeight: 500, marginBottom: '4px' }}>{template.title}</div>
                                <div className="text-sm text-muted">{template.message}</div>
                            </div>
                        ))}
                    </div>
                </div>
            </div>

            {/* Info Box */}
            <div className="card" style={{ marginTop: '24px', background: '#FFF8E1' }}>
                <div style={{ display: 'flex', gap: '16px', alignItems: 'flex-start' }}>
                    <span style={{ fontSize: '24px' }}>💡</span>
                    <div>
                        <h4 style={{ marginBottom: '8px' }}>Firebase Cloud Messaging Setup</h4>
                        <p className="text-sm">
                            To enable push notifications, configure your Firebase credentials in the server's
                            <code style={{ background: '#fff', padding: '2px 6px', borderRadius: '4px' }}>.env</code> file:
                        </p>
                        <ul className="text-sm" style={{ marginTop: '8px', paddingLeft: '20px' }}>
                            <li>FIREBASE_PROJECT_ID</li>
                            <li>FIREBASE_PRIVATE_KEY</li>
                            <li>FIREBASE_CLIENT_EMAIL</li>
                        </ul>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default Notifications;
