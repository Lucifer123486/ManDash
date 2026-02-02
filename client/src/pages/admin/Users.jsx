import { useState, useEffect } from 'react';
import { usersAPI } from '../../services/api';

const Users = () => {
    const [users, setUsers] = useState([]);
    const [loading, setLoading] = useState(true);
    const [showModal, setShowModal] = useState(false);
    const [editingUser, setEditingUser] = useState(null);
    const [formData, setFormData] = useState({
        name: '',
        email: '',
        password: '',
        role: 'staff',
        phone: '',
        address: '',
        pinCode: ''
    });
    const [filter, setFilter] = useState('all');

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

    const handleSubmit = async (e) => {
        e.preventDefault();
        try {
            if (editingUser) {
                await usersAPI.update(editingUser._id, formData);
            } else {
                await usersAPI.create(formData);
            }
            fetchUsers();
            closeModal();
        } catch (error) {
            alert(error.response?.data?.message || 'Error saving user');
        }
    };

    const handleDelete = async (id) => {
        if (!window.confirm('Are you sure you want to delete this user?')) return;
        try {
            await usersAPI.delete(id);
            fetchUsers();
        } catch (error) {
            alert('Error deleting user');
        }
    };

    const openModal = (user = null) => {
        if (user) {
            setEditingUser(user);
            setFormData({
                name: user.name,
                email: user.email,
                password: '',
                role: user.role,
                phone: user.phone || '',
                address: user.address || '',
                pinCode: user.pinCode || ''
            });
        } else {
            setEditingUser(null);
            setFormData({
                name: '',
                email: '',
                password: '',
                role: 'staff',
                phone: '',
                address: '',
                pinCode: ''
            });
        }
        setShowModal(true);
    };

    const closeModal = () => {
        setShowModal(false);
        setEditingUser(null);
    };

    const filteredUsers = users.filter(u =>
        filter === 'all' ? true : u.role === filter
    );

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
                    <h1 className="page-title">Staff & Clients</h1>
                    <p className="page-subtitle">Manage users and their access</p>
                </div>
                <button onClick={() => openModal()} className="btn btn-primary">
                    + Add User
                </button>
            </div>

            {/* Filter Tabs */}
            <div style={{ display: 'flex', gap: '8px', marginBottom: '24px' }}>
                {['all', 'staff', 'qi', 'client', 'admin'].map((role) => (
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

            {/* Users Table */}
            <div className="card">
                <div className="table-container">
                    <table className="table">
                        <thead>
                            <tr>
                                <th>Name</th>
                                <th>Email</th>
                                <th>Role</th>
                                <th>Phone</th>
                                <th>Status</th>
                                <th>Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            {filteredUsers.map((user) => (
                                <tr key={user._id}>
                                    <td>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                                            <div style={{
                                                width: '36px',
                                                height: '36px',
                                                borderRadius: '50%',
                                                background: user.role === 'admin' ? '#FFD600' :
                                                    user.role === 'staff' ? '#2196F3' : '#4CAF50',
                                                display: 'flex',
                                                alignItems: 'center',
                                                justifyContent: 'center',
                                                fontWeight: 600,
                                                color: user.role === 'admin' ? '#000' : '#fff'
                                            }}>
                                                {user.name?.charAt(0)?.toUpperCase()}
                                            </div>
                                            <span>{user.name}</span>
                                        </div>
                                    </td>
                                    <td>{user.email}</td>
                                    <td>
                                        <span className={`badge ${user.role === 'admin' ? 'badge-primary' :
                                            user.role === 'staff' ? 'badge-info' : 'badge-success'
                                            }`}>
                                            {user.role}
                                        </span>
                                    </td>
                                    <td>{user.phone || '-'}</td>
                                    <td>
                                        <span className={`badge ${user.isActive ? 'badge-success' : 'badge-grey'}`}>
                                            {user.isActive ? 'Active' : 'Inactive'}
                                        </span>
                                    </td>
                                    <td>
                                        <div style={{ display: 'flex', gap: '8px' }}>
                                            <button onClick={() => openModal(user)} className="btn btn-ghost btn-sm">
                                                ✏️
                                            </button>
                                            {user.role !== 'admin' && (
                                                <button onClick={() => handleDelete(user._id)} className="btn btn-ghost btn-sm">
                                                    🗑️
                                                </button>
                                            )}
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>

                {filteredUsers.length === 0 && (
                    <div style={{ textAlign: 'center', padding: '40px' }}>
                        <p className="text-muted">No users found</p>
                    </div>
                )}
            </div>

            {/* Modal */}
            {showModal && (
                <div className="modal-overlay" onClick={closeModal}>
                    <div className="modal" onClick={e => e.stopPropagation()}>
                        <div className="modal-header">
                            <h3 className="modal-title">{editingUser ? 'Edit User' : 'Add New User'}</h3>
                            <button onClick={closeModal} className="modal-close">×</button>
                        </div>
                        <form onSubmit={handleSubmit}>
                            <div className="modal-body">
                                <div className="form-group">
                                    <label className="form-label required">Full Name</label>
                                    <input
                                        type="text"
                                        className="form-input"
                                        value={formData.name}
                                        onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                        required
                                    />
                                </div>

                                <div className="form-group">
                                    <label className="form-label required">Email</label>
                                    <input
                                        type="email"
                                        className="form-input"
                                        value={formData.email}
                                        onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                                        required
                                    />
                                </div>

                                <div className="form-group">
                                    <label className="form-label required">Password {editingUser && '(leave blank to keep current)'}</label>
                                    <input
                                        type="password"
                                        className="form-input"
                                        value={formData.password}
                                        onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                                        required={!editingUser}
                                        minLength={6}
                                    />
                                </div>

                                <div className="form-group">
                                    <label className="form-label required">Role</label>
                                    <select
                                        className="form-select"
                                        value={formData.role}
                                        onChange={(e) => setFormData({ ...formData, role: e.target.value })}
                                    >
                                        <option value="staff">Staff (General)</option>
                                        <option value="qi">Quality Inspector</option>
                                        <option value="client">Client</option>
                                        <option value="admin">Admin</option>
                                    </select>
                                </div>

                                <div className="form-group">
                                    <label className="form-label">Phone</label>
                                    <input
                                        type="tel"
                                        className="form-input"
                                        value={formData.phone}
                                        onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                                    />
                                </div>

                                {formData.role === 'client' && (
                                    <>
                                        <div className="form-group">
                                            <label className="form-label">Address</label>
                                            <textarea
                                                className="form-textarea"
                                                value={formData.address}
                                                onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                                            />
                                        </div>
                                        <div className="form-group">
                                            <label className="form-label">Pin Code</label>
                                            <input
                                                type="text"
                                                className="form-input"
                                                value={formData.pinCode}
                                                onChange={(e) => setFormData({ ...formData, pinCode: e.target.value })}
                                            />
                                        </div>
                                    </>
                                )}
                            </div>
                            <div className="modal-footer">
                                <button type="button" onClick={closeModal} className="btn btn-outline">
                                    Cancel
                                </button>
                                <button type="submit" className="btn btn-primary">
                                    {editingUser ? 'Update User' : 'Create User'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};

export default Users;
