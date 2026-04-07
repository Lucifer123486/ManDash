import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { usersAPI } from '../../services/api';
import CreateTicketForm from '../../components/CreateTicketForm';
import DroneIcon from '../../components/common/DroneIcon';
import { getRemainingTimeLabel } from '../../utils/dateUtils';

const Users = () => {
    const navigate = useNavigate();
    const [users, setUsers] = useState([]);
    const [loading, setLoading] = useState(true);
    const [showModal, setShowModal] = useState(false);
    const [editingUser, setEditingUser] = useState(null);
    const [submitting, setSubmitting] = useState(false);
    const [supportClient, setSupportClient] = useState(null);
    const [isCreatingTicket, setIsCreatingTicket] = useState(false);

    const [formData, setFormData] = useState({
        name: '',
        email: '',
        password: '',
        role: 'staff',
        staffType: 'service_engineer',
        phone: '',
        address: '',
        pinCode: '',
        certificate10th: '',
        aadharCard: '',
        idProof: '',
        hasAMC: false,
        hasASS: false,
        amcStartDate: '',
        assStartDate: ''
    });

    const [errors, setErrors] = useState({});
    const [filter, setFilter] = useState('all');
    const [searchTerm, setSearchTerm] = useState('');
    const [searchBy, setSearchBy] = useState('all');

    useEffect(() => {
        fetchUsers();
    }, []);

    const fetchUsers = async () => {
        try {
            const response = await usersAPI.getAll();
            setUsers(response.data.data || []);
        } catch (error) {
            console.error('Error fetching users:', error);
        } finally {
            setLoading(false);
        }
    };

    const getEgcaFromDrones = (user) => {
        if (!user.orders || user.orders.length === 0) return '-';
        const egcaIds = new Set();
        user.orders.forEach(order => {
            if (order.drones && order.drones.length > 0) {
                order.drones.forEach(drone => {
                    if (drone.egcaId) egcaIds.add(drone.egcaId);
                });
            }
        });
        return egcaIds.size > 0 ? Array.from(egcaIds).join(', ') : '-';
    };

    const handleDelete = async (userId, userName) => {
        if (window.confirm(`Are you sure you want to delete user "${userName}"? This action cannot be undone.`)) {
            try {
                await usersAPI.delete(userId);
                setUsers(users.filter(u => u._id !== userId));
            } catch (error) {
                console.error('Error deleting user:', error);
                alert(error.response?.data?.message || 'Error deleting user');
            }
        }
    };

    /* ================= VALIDATION ================= */

    const validate = () => {
        const newErrors = {};

        if (!/^[A-Za-z\s]+$/.test(formData.name)) {
            newErrors.name = 'Name should contain only letters';
        }

        if (!/^\S+@\S+\.\S+$/.test(formData.email)) {
            newErrors.email = 'Enter a valid email address';
        }

        if (!editingUser && formData.password.length !== 8) {
            newErrors.password = 'Password must be exactly 8 characters';
        }

        if (formData.phone && !/^\d+$/.test(formData.phone)) {
            newErrors.phone = 'Phone number should contain only digits';
        }

        // Mandatory fields for clients
        if (formData.role === 'client') {
            if (!formData.certificate10th) newErrors.certificate10th = '10th certificate is required';
            if (!formData.aadharCard) newErrors.aadharCard = 'Aadhar card is required';
            if (!formData.idProof) newErrors.idProof = 'ID Proof (DL/Passport/etc) is required';
        }

        setErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    };

    /* ================= HANDLERS ================= */

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!validate()) return;

        setSubmitting(true);
        console.log('[DEBUG] Submitting user data:', { ...formData, password: '***' });

        try {
            if (editingUser) {
                await usersAPI.update(editingUser._id, formData);
            } else {
                await usersAPI.create(formData);
            }
            console.log('[DEBUG] User saved successfully');
            fetchUsers();
            closeModal();
        } catch (error) {
            console.error('[DEBUG] Error saving user:', error);
            const errorMsg = error.response?.data?.error || error.response?.data?.message || 'Error saving user';
            alert(errorMsg);
        } finally {
            setSubmitting(false);
        }
    };

    const handleFileChange = (e, field) => {
        const file = e.target.files[0];
        if (file) {
            const reader = new FileReader();
            reader.onloadend = () => {
                setFormData({ ...formData, [field]: reader.result });
            };
            reader.readAsDataURL(file);
        }
    };

    const openModal = (user = null) => {
        setErrors({});
        if (user) {
            setEditingUser(user);
            setFormData({
                name: user.name,
                email: user.email,
                password: '',
                role: user.role,
                staffType: user.staffType || 'service_engineer',
                phone: user.phone || '',
                address: user.address || '',
                pinCode: user.pinCode || '',
                certificate10th: user.certificate10th || '',
                aadharCard: user.aadharCard || '',
                idProof: user.idProof || '',
                hasAMC: user.hasAMC || false,
                hasASS: user.hasASS || false,
                amcStartDate: user.amcStartDate ? new Date(user.amcStartDate).toISOString().split('T')[0] : '',
                assStartDate: user.assStartDate ? new Date(user.assStartDate).toISOString().split('T')[0] : ''
            });
        } else {
            setEditingUser(null);
            setFormData({
                name: '',
                email: '',
                password: '',
                role: 'staff',
                staffType: 'service_engineer',
                phone: '',
                address: '',
                pinCode: '',
                certificate10th: '',
                aadharCard: '',
                idProof: '',
                hasAMC: false,
                hasASS: false,
                amcStartDate: '',
                assStartDate: ''
            });
        }
        setShowModal(true);
    };

    const closeModal = () => {
        setShowModal(false);
        setEditingUser(null);
        setErrors({});
    };

    /* ================= direct ticket creation ================= */
    const [selectedProblemType, setSelectedProblemType] = useState('');
    const [problemDescription, setProblemDescription] = useState('');
    const [isCreatingTicketDirect, setIsCreatingTicketDirect] = useState(false);

    const handleDirectTicketCreate = async () => {
        if (!selectedProblemType) {
            alert('Please select a problem type first.');
            return;
        }

        setIsCreatingTicketDirect(true);
        let droneSerialNumber = '';

        try {
            // Find drone serial number from orders
            if (supportClient.orders && supportClient.orders.length > 0) {
                for (const order of supportClient.orders) {
                    if (order.drones && order.drones.length > 0) {
                        droneSerialNumber = order.drones[0].serialNo;
                        break;
                    }
                }
            }

            const ticketPayload = {
                category: 'Support',
                customerName: supportClient.name,
                customerEmail: supportClient.email,
                customerMobile: supportClient.phone,
                customerLocation: supportClient.address,
                droneSerialNumber,
                problemType: selectedProblemType,
                problemDescription,
                client: supportClient._id
            };

            const ticketsAPI = (await import('../../services/api')).ticketsAPI;
            await ticketsAPI.create(ticketPayload);

            alert('Support ticket raised successfully!');
            setSupportClient(null);
            setSelectedProblemType('');
            setProblemDescription('');
        } catch (error) {
            console.error('Error creating ticket:', error);
            alert('Failed to raise ticket.');
        } finally {
            setIsCreatingTicketDirect(false);
        }
    };

    const filteredUsers = users.filter(user => {
        const matchesFilter = filter === 'all' || user.role === filter;
        const matchesSearch = user.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
            user.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
            (user.phone && user.phone.includes(searchTerm));
        if (searchBy === 'egcaId' && user.role === 'client') {
            return matchesFilter && getEgcaFromDrones(user).toLowerCase().includes(searchTerm.toLowerCase());
        }
        return matchesFilter && matchesSearch;
    });

    return (
        <div>
            {/* Header */}
            <div className="page-header">
                <div>
                    <h1 className="page-title">Staff & Clients</h1>
                    <p className="page-subtitle">Manage users and their access</p>
                </div>
                <button onClick={() => openModal()} className="btn btn-primary">
                    + Add User
                </button>
            </div>

            {/* Role Tabs */}
            <div style={{ display: 'flex', gap: '8px', marginBottom: '24px' }}>
                {['all', 'staff', 'qi', 'client', 'admin'].map(role => (
                    <button
                        key={role}
                        onClick={() => setFilter(role)}
                        className={`btn ${filter === role ? 'btn-primary' : 'btn-outline'} btn-sm`}
                        style={{ textTransform: 'capitalize' }}
                    >
                        {role === 'all' ? 'All Users' : role === 'qi' ? 'Quality Inspectors' : `${role}s`}
                    </button>
                ))}
            </div>

            {/* Stats */}
            <div className="grid grid-cols-3 gap-lg" style={{ marginBottom: '24px' }}>
                <div className="stat-card">
                    <div className="stat-icon">👥</div>
                    <div className="stat-content">
                        <h3>Total Staff</h3>
                        <div className="stat-value">{users.filter(u => u.role === 'staff').length}</div>
                    </div>
                </div>

                <div className="stat-card" style={{ borderLeftColor: '#4CAF50' }}>
                    <div className="stat-icon" style={{ background: '#E8F5E9', color: '#4CAF50' }}>🧑‍💼</div>
                    <div className="stat-content">
                        <h3>Total Clients</h3>
                        <div className="stat-value">{users.filter(u => u.role === 'client').length}</div>
                    </div>
                </div>

                <div className="stat-card" style={{ borderLeftColor: '#2196F3' }}>
                    <div className="stat-icon" style={{ background: '#E3F2FD', color: '#2196F3' }}>👑</div>
                    <div className="stat-content">
                        <h3>Admins</h3>
                        <div className="stat-value">{users.filter(u => u.role === 'admin').length}</div>
                    </div>
                </div>
            </div>

            {/* Search */}
            <div style={{ display: 'flex', gap: '12px', marginBottom: '16px' }}>
                <input
                    type="text"
                    className="form-input"
                    placeholder="Search users..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    style={{ maxWidth: '300px' }}
                />
                <select
                    className="form-select"
                    value={searchBy}
                    onChange={(e) => setSearchBy(e.target.value)}
                    style={{ maxWidth: '180px' }}
                >
                    <option value="all">All</option>
                </select>
            </div>

            {/* Users Table */}
            <div className="card">
                <div className="table-container">
                    <table className="table">
                        <thead>
                            <tr>
                                <th>Name</th>
                                <th>Email</th>
                                <th>Role</th>
                                <th>EGCA ID</th>
                                <th>Phone</th>
                                <th>Services</th>
                                <th>Status</th>
                                <th>Validity</th>
                                <th>Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            {filteredUsers.map(user => (
                                <tr key={user._id}>
                                    <td>{user.name}</td>
                                    <td>{user.email}</td>
                                    <td>
                                        {user.role}
                                        {user.role === 'staff' && user.staffType && (
                                            <div style={{ fontSize: '12px', color: '#666', marginTop: '4px' }}>
                                                ({user.staffType.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase())})
                                            </div>
                                        )}
                                    </td>
                                    <td>
                                        {user.role === 'client' ? (
                                            <div style={{ color: '#333', fontWeight: '500' }}>
                                                {getEgcaFromDrones(user)}
                                            </div>
                                        ) : (
                                            <div style={{ color: '#ccc' }}>-</div>
                                        )}
                                    </td>
                                    <td>{user.phone || '-'}</td>
                                    <td>
                                        {user.role === 'client' ? (
                                            <div style={{ display: 'flex', alignItems: 'center' }}>
                                                <span style={{
                                                    fontSize: '12px',
                                                    fontWeight: 'bold',
                                                    padding: '4px 8px',
                                                    borderRadius: '4px',
                                                    background: (user.freeServicesUsed || 0) >= 6 ? '#ffebee' : '#f5f5f5',
                                                    color: (user.freeServicesUsed || 0) >= 6 ? '#c62828' : '#333',
                                                    border: `1px solid ${(user.freeServicesUsed || 0) >= 6 ? '#ef9a9a' : '#e0e0e0'}`
                                                }}>
                                                    {user.freeServicesUsed || 0} / 6
                                                </span>
                                            </div>
                                        ) : (
                                            <div style={{ color: '#ccc' }}>-</div>
                                        )}
                                    </td>
                                    <td>
                                        <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                                            <span className={`badge ${user.isActive ? 'badge-success' : 'badge-grey'}`}>
                                                {user.isActive ? 'Active' : 'Inactive'}
                                            </span>
                                        </div>
                                    </td>
                                    <td>
                                        {user.role === 'client' ? (
                                            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                                                {user.hasAMC && (
                                                    <div style={{ fontSize: '11px', lineHeight: '1.2' }}>
                                                        <span style={{ fontWeight: 'bold', color: '#1a237e' }}>AMC:</span>
                                                        <div style={{ 
                                                            color: getRemainingTimeLabel(user.amcStartDate)?.color || '#666',
                                                            fontWeight: '500'
                                                        }}>
                                                            {getRemainingTimeLabel(user.amcStartDate)?.label || 'Not set'}
                                                        </div>
                                                    </div>
                                                )}
                                                {user.hasASS && (
                                                    <div style={{ fontSize: '11px', lineHeight: '1.2' }}>
                                                        <span style={{ fontWeight: 'bold', color: '#1a237e' }}>ASS:</span>
                                                        <div style={{ 
                                                            color: getRemainingTimeLabel(user.assStartDate)?.color || '#666',
                                                            fontWeight: '500'
                                                        }}>
                                                            {getRemainingTimeLabel(user.assStartDate)?.label || 'Not set'}
                                                        </div>
                                                    </div>
                                                )}
                                                {!user.hasAMC && !user.hasASS && <span style={{ color: '#ccc' }}>-</span>}
                                            </div>
                                        ) : (
                                            <div style={{ color: '#ccc' }}>-</div>
                                        )}
                                    </td>
                                    <td>
                                        <div style={{ display: 'flex', gap: '8px' }}>
                                            {user.role === 'client' && (
                                                <button onClick={() => {
                                                    setSupportClient(user);
                                                    setSelectedProblemType('');
                                                    setProblemDescription('');
                                                }} className="btn btn-primary btn-sm" title="Provide Support">🎧 Support</button>
                                            )}
                                            <button onClick={() => openModal(user)} className="btn btn-ghost btn-sm" title="Edit User">✏️</button>
                                            <button onClick={() => handleDelete(user._id, user.name)} className="btn btn-ghost btn-sm" style={{ color: 'red' }} title="Delete User">🗑️</button>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Modal */}
            {showModal && (
                <div className="modal-overlay" onClick={closeModal}>
                    <div className="modal" onClick={e => e.stopPropagation()} style={{ maxWidth: '600px', width: '90%' }}>
                        <div className="modal-header">
                            <h3 className="modal-title">{editingUser ? 'Edit User' : 'Add New User'}</h3>
                            <button onClick={closeModal} className="modal-close">×</button>
                        </div>

                        <form onSubmit={handleSubmit}>
                            <div className="modal-body" style={{ maxHeight: '70vh', overflowY: 'auto' }}>
                                <div className="grid grid-cols-2 gap-md">
                                    <div className="form-group">
                                        <label className="form-label required">Full Name</label>
                                        <input
                                            type="text"
                                            className="form-input"
                                            value={formData.name}
                                            onChange={e => setFormData({ ...formData, name: e.target.value })}
                                            required
                                        />
                                        {errors.name && <p style={{ color: 'red', fontSize: '12px' }}>{errors.name}</p>}
                                    </div>

                                    <div className="form-group">
                                        <label className="form-label required">Email</label>
                                        <input
                                            type="email"
                                            className="form-input"
                                            value={formData.email}
                                            onChange={e => setFormData({ ...formData, email: e.target.value })}
                                            required
                                        />
                                        {errors.email && <p style={{ color: 'red', fontSize: '12px' }}>{errors.email}</p>}
                                    </div>
                                </div>

                                <div className="grid grid-cols-2 gap-md">
                                    <div className="form-group">
                                        <label className="form-label required">Role</label>
                                        <select
                                            className="form-select"
                                            value={formData.role}
                                            onChange={e => setFormData({ ...formData, role: e.target.value })}
                                        >
                                            <option value="staff">Staff</option>
                                            <option value="client">Client</option>
                                            <option value="admin">Admin</option>
                                        </select>
                                    </div>

                                    {formData.role === 'staff' && (
                                        <div className="form-group">
                                            <label className="form-label required">Staff Type</label>
                                            <select
                                                className="form-select"
                                                value={formData.staffType}
                                                onChange={e => setFormData({ ...formData, staffType: e.target.value })}
                                            >
                                                <option value="service_engineer">Service Engineer</option>
                                                <option value="production_manager">Production Manager</option>
                                                <option value="assembly_line_incharge">Assembly Line Incharge</option>
                                                <option value="quality_inspector">Quality Inspector</option>
                                                <option value="packaging_dispatch_operator">Packaging and Dispatch Operator</option>
                                                <option value="director_am">Director / AM</option>
                                                <option value="call_centre_staff">Call Centre Staff</option>
                                                <option value="sales_staff">Sales Staff</option>
                                            </select>
                                        </div>
                                    )}

                                    {formData.role === 'client' && (
                                        <div className="form-group">
                                            <label className="form-label required">Staff Type (N/A for Client)</label>
                                            <select className="form-select" disabled>
                                                <option value="">-</option>
                                            </select>
                                        </div>
                                    )}

                                    {!editingUser && (
                                        <div className="form-group">
                                            <label className="form-label required">Password</label>
                                            <input
                                                type="password"
                                                className="form-input"
                                                value={formData.password}
                                                onChange={e => setFormData({ ...formData, password: e.target.value })}
                                                required
                                            />
                                            {errors.password && <p style={{ color: 'red', fontSize: '12px' }}>{errors.password}</p>}
                                        </div>
                                    )}
                                </div>

                                <div className="grid grid-cols-2 gap-md">
                                    <div className="form-group">
                                        <label className="form-label">Phone</label>
                                        <input
                                            type="tel"
                                            className="form-input"
                                            value={formData.phone}
                                            onChange={e => setFormData({ ...formData, phone: e.target.value })}
                                        />
                                        {errors.phone && <p style={{ color: 'red', fontSize: '12px' }}>{errors.phone}</p>}
                                    </div>
                                </div>

                                {formData.role === 'client' && (
                                    <div style={{ background: '#f0f7ff', padding: '15px', borderRadius: '8px', marginBottom: '15px' }}>
                                        <div className="grid grid-cols-2 gap-md">
                                            <div className="form-group" style={{ marginBottom: 0 }}>
                                                <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '8px' }}>
                                                    <input
                                                        type="checkbox"
                                                        id="hasAMC"
                                                        checked={formData.hasAMC}
                                                        onChange={e => setFormData({ ...formData, hasAMC: e.target.checked })}
                                                        style={{ width: '18px', height: '18px' }}
                                                    />
                                                    <label htmlFor="hasAMC" className="form-label" style={{ marginBottom: 0 }}>Has AMC (Annual Maint.)</label>
                                                </div>
                                                {formData.hasAMC && (
                                                    <div style={{ marginTop: '8px' }}>
                                                        <label className="form-label" style={{ fontSize: '11px', marginBottom: '4px' }}>AMC Start Date</label>
                                                        <input
                                                            type="date"
                                                            className="form-input"
                                                            value={formData.amcStartDate}
                                                            onChange={e => setFormData({ ...formData, amcStartDate: e.target.value })}
                                                            style={{ padding: '4px 8px', fontSize: '13px' }}
                                                        />
                                                    </div>
                                                )}
                                            </div>
                                            <div className="form-group" style={{ marginBottom: 0 }}>
                                                <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '8px' }}>
                                                    <input
                                                        type="checkbox"
                                                        id="hasASS"
                                                        checked={formData.hasASS}
                                                        onChange={e => setFormData({ ...formData, hasASS: e.target.checked })}
                                                        style={{ width: '18px', height: '18px' }}
                                                    />
                                                    <label htmlFor="hasASS" className="form-label" style={{ marginBottom: 0 }}>Has ASS (After Sales Support)</label>
                                                </div>
                                                {formData.hasASS && (
                                                    <div style={{ marginTop: '8px' }}>
                                                        <label className="form-label" style={{ fontSize: '11px', marginBottom: '4px' }}>ASS Start Date</label>
                                                        <input
                                                            type="date"
                                                            className="form-input"
                                                            value={formData.assStartDate}
                                                            onChange={e => setFormData({ ...formData, assStartDate: e.target.value })}
                                                            style={{ padding: '4px 8px', fontSize: '13px' }}
                                                        />
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                )}

                                {/* Mandatory Client Documents */}
                                {formData.role === 'client' && (
                                    <div style={{ background: '#f8f9fa', padding: '15px', borderRadius: '8px', marginTop: '10px' }}>
                                        <h4 style={{ marginBottom: '15px', color: '#1e1e1e' }}>Mandatory Documents</h4>
                                        <div className="form-group">
                                            <label className="form-label required">10th Certificate (PDF/Image)</label>
                                            <input
                                                type="file"
                                                className="form-input"
                                                onChange={e => handleFileChange(e, 'certificate10th')}
                                                accept="image/*,.pdf"
                                            />
                                            {formData.certificate10th && <p style={{ fontSize: '11px', color: 'green' }}>✓ Uploaded</p>}
                                            {errors.certificate10th && <p style={{ color: 'red', fontSize: '12px' }}>{errors.certificate10th}</p>}
                                        </div>

                                        <div className="form-group">
                                            <label className="form-label required">Aadhar Card (PDF/Image)</label>
                                            <input
                                                type="file"
                                                className="form-input"
                                                onChange={e => handleFileChange(e, 'aadharCard')}
                                                accept="image/*,.pdf"
                                            />
                                            {formData.aadharCard && <p style={{ fontSize: '11px', color: 'green' }}>✓ Uploaded</p>}
                                            {errors.aadharCard && <p style={{ color: 'red', fontSize: '12px' }}>{errors.aadharCard}</p>}
                                        </div>

                                        <div className="form-group">
                                            <label className="form-label required">ID Proof (DL/Passport/Voter/Ration/etc) (PDF/Image)</label>
                                            <input
                                                type="file"
                                                className="form-input"
                                                onChange={e => handleFileChange(e, 'idProof')}
                                                accept="image/*,.pdf"
                                            />
                                            {formData.idProof && <p style={{ fontSize: '11px', color: 'green' }}>✓ Uploaded</p>}
                                            {errors.idProof && <p style={{ color: 'red', fontSize: '12px' }}>{errors.idProof}</p>}
                                        </div>
                                    </div>
                                )}

                                <div className="form-group">
                                    <label className="form-label">Address</label>
                                    <textarea
                                        className="form-input"
                                        value={formData.address}
                                        onChange={e => setFormData({ ...formData, address: e.target.value })}
                                        rows="2"
                                    ></textarea>
                                </div>
                            </div>

                            <div className="modal-footer">
                                <button type="button" onClick={closeModal} className="btn btn-outline">Cancel</button>
                                <button type="submit" className="btn btn-primary" disabled={submitting}>
                                    {submitting ? (editingUser ? 'Updating...' : 'Creating...') : (editingUser ? 'Update User' : 'Create User')}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Support Client Modal */}
            {supportClient && !isCreatingTicket && (
                <div className="modal-overlay" onClick={() => setSupportClient(null)}>
                    <div className="modal" onClick={e => e.stopPropagation()} style={{ maxWidth: '500px', width: '90%' }}>
                        <div className="modal-header">
                            <h3 className="modal-title">Client Support Profile</h3>
                            <button onClick={() => setSupportClient(null)} className="modal-close">×</button>
                        </div>
                        <div className="modal-body" style={{ maxHeight: '70vh', overflowY: 'auto' }}>
                            <div style={{ background: '#f8f9fa', padding: '20px', borderRadius: '8px', marginBottom: '20px', border: '1px solid #e0e0e0' }}>
                                <h4 style={{ margin: '0 0 15px 0', fontSize: '20px', color: '#1a1a1a' }}>{supportClient.name}</h4>
                                <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '10px', fontSize: '15px', color: '#444' }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}><span>📧</span> <strong>Email:</strong> {supportClient.email}</div>
                                    {supportClient.phone && <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}><span>📱</span> <strong>Phone:</strong> {supportClient.phone}</div>}
                                    {supportClient.address && <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}><span>📍</span> <strong>Address:</strong> {supportClient.address}</div>}
                                    {supportClient.egcaId && <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}><span>🆔</span> <strong>EGCA ID:</strong> {supportClient.egcaId}</div>}

                                    {/* Display Drone Serial Number if found */}
                                    {supportClient.orders && supportClient.orders.some(o => o.drones && o.drones.length > 0) && (
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#1976d2', fontWeight: '500', marginTop: '10px' }}>
                                            <DroneIcon size={16} color="#1976d2" /> <strong>Assigned Drone:</strong>
                                            {supportClient.orders.find(o => o.drones && o.drones.length > 0).drones[0].serialNo}
                                        </div>
                                    )}
                                </div>
                            </div>

                            {/* Problem Type Checklist */}
                            <div style={{ background: '#f5f5f5', padding: '15px', borderRadius: '8px', marginBottom: '20px', border: '1px solid #e0e0e0' }}>
                                <h4 style={{ margin: '0 0 10px 0', color: '#1e1e1e' }}>Problem Type</h4>
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginBottom: '15px' }}>
                                    {['Software issue', 'Hardware issue', 'Manufacturing issue'].map(type => (
                                        <label key={type} style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}>
                                            <input
                                                type="radio"
                                                name="problemType"
                                                value={type}
                                                checked={selectedProblemType === type}
                                                onChange={(e) => setSelectedProblemType(e.target.value)}
                                                style={{ width: '16px', height: '16px' }}
                                            />
                                            <span style={{ fontSize: '15px' }}>{type}</span>
                                        </label>
                                    ))}
                                </div>
                                <h4 style={{ margin: '0 0 10px 0', color: '#1e1e1e' }}>Problem Description <span style={{fontSize: '13px', fontWeight: 'normal', color: '#666'}}>(Optional)</span></h4>
                                <textarea
                                    className="form-input"
                                    rows="3"
                                    placeholder="Enter a brief description of the problem..."
                                    value={problemDescription}
                                    onChange={(e) => setProblemDescription(e.target.value)}
                                    style={{ width: '100%', resize: 'vertical' }}
                                />
                            </div>

                            <div style={{ background: supportClient.hasAMC || supportClient.hasASS ? '#e8f5e9' : '#ffebee', padding: '15px', borderRadius: '8px', marginBottom: '25px', border: `1px solid ${supportClient.hasAMC || supportClient.hasASS ? '#4caf50' : '#f44336'}` }}>
                                <h4 style={{ margin: '0 0 10px 0', color: supportClient.hasAMC || supportClient.hasASS ? '#2e7d32' : '#c62828' }}>Eligibility Status</h4>
                                <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
                                    {supportClient.hasAMC && <span style={{ background: '#2196F3', color: 'white', padding: '4px 8px', borderRadius: '4px', fontSize: '13px', fontWeight: 'bold' }}>AMC Active</span>}
                                    {supportClient.hasASS && <span style={{ background: '#9C27B0', color: 'white', padding: '4px 8px', borderRadius: '4px', fontSize: '13px', fontWeight: 'bold' }}>ASS Active</span>}
                                    {!supportClient.hasAMC && !supportClient.hasASS && (
                                        <span style={{ color: '#c62828', fontSize: '14px', fontWeight: '500' }}>⚠️ No active AMC or ASS. Services may be chargeable.</span>
                                    )}
                                </div>
                            </div>

                            <button
                                onClick={handleDirectTicketCreate}
                                disabled={isCreatingTicketDirect}
                                className="btn btn-primary"
                                style={{ width: '100%', padding: '14px', fontSize: '16px', display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '8px', opacity: isCreatingTicketDirect ? 0.7 : 1 }}
                            >
                                {isCreatingTicketDirect ? '⏳ Raising Ticket...' : '📝 Raise Support Ticket'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default Users;
