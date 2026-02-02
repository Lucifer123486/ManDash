import { useState, useEffect } from 'react';
import { dronesAPI } from '../../services/api';

const Drones = () => {
    const [drones, setDrones] = useState([]);
    const [loading, setLoading] = useState(true);
    const [showModal, setShowModal] = useState(false);
    const [formData, setFormData] = useState({
        serialNo: '',
        modelNo: 'CS_KRISHI_10L',
        manufacturingStatus: 'material_entry'
    });

    useEffect(() => {
        fetchDrones();
    }, []);

    const fetchDrones = async () => {
        try {
            const response = await dronesAPI.getAll();
            setDrones(response.data.data || []);
        } catch (error) {
            console.error('Error fetching drones:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        try {
            await dronesAPI.create(formData);
            fetchDrones();
            setShowModal(false);
            setFormData({ serialNo: '', modelNo: 'CS_KRISHI_10L', manufacturingStatus: 'material_entry' });
        } catch (error) {
            alert(error.response?.data?.message || 'Error creating drone');
        }
    };

    const getStatusColor = (status) => {
        const colors = {
            material_entry: '#9E9E9E',
            material_inspection: '#2196F3',
            inventory_update: '#00BCD4',
            material_distribution: '#009688',
            soldering: '#FF9800',
            mechanical_assembly: '#FF5722',
            payload_assembly: '#E91E63',
            electronic_assembly: '#9C27B0',
            calibration: '#673AB7',
            flight_test: '#3F51B5',
            packaging: '#4CAF50',
            dispatch: '#8BC34A',
            delivered: '#CDDC39'
        };
        return colors[status] || '#757575';
    };

    const getStatusLabel = (status) => {
        return status?.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
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
                    <h1 className="page-title">All Drones</h1>
                    <p className="page-subtitle">Track manufacturing progress for all drones</p>
                </div>
                <button onClick={() => setShowModal(true)} className="btn btn-primary">
                    + Add Drone
                </button>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-4 gap-lg" style={{ marginBottom: '24px' }}>
                <div className="stat-card">
                    <div className="stat-icon">🚁</div>
                    <div className="stat-content">
                        <h3>Total Drones</h3>
                        <div className="stat-value">{drones.length}</div>
                    </div>
                </div>
                <div className="stat-card" style={{ borderLeftColor: '#FF9800' }}>
                    <div className="stat-icon" style={{ background: '#FFF3E0', color: '#FF9800' }}>🏭</div>
                    <div className="stat-content">
                        <h3>In Manufacturing</h3>
                        <div className="stat-value">
                            {drones.filter(d => d.manufacturingStatus && !['packaging', 'dispatch', 'delivered'].includes(d.manufacturingStatus)).length}
                        </div>
                    </div>
                </div>
                <div className="stat-card" style={{ borderLeftColor: '#4CAF50' }}>
                    <div className="stat-icon" style={{ background: '#E8F5E9', color: '#4CAF50' }}>📦</div>
                    <div className="stat-content">
                        <h3>Ready to Ship</h3>
                        <div className="stat-value">
                            {drones.filter(d => d.manufacturingStatus === 'packaging').length}
                        </div>
                    </div>
                </div>
                <div className="stat-card" style={{ borderLeftColor: '#2196F3' }}>
                    <div className="stat-icon" style={{ background: '#E3F2FD', color: '#2196F3' }}>✅</div>
                    <div className="stat-content">
                        <h3>Delivered</h3>
                        <div className="stat-value">
                            {drones.filter(d => d.manufacturingStatus === 'delivered').length}
                        </div>
                    </div>
                </div>
            </div>

            {/* Drones Grid */}
            <div className="grid grid-cols-3 gap-lg">
                {drones.map((drone) => (
                    <div key={drone._id} className="card">
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '12px' }}>
                            <div>
                                <h3 style={{ fontSize: '1.125rem', marginBottom: '4px' }}>{drone.serialNo}</h3>
                                <p className="text-sm text-muted">{drone.modelNo}</p>
                            </div>
                            <span style={{
                                padding: '4px 12px',
                                borderRadius: '12px',
                                fontSize: '0.625rem',
                                fontWeight: 600,
                                background: getStatusColor(drone.manufacturingStatus) + '20',
                                color: getStatusColor(drone.manufacturingStatus)
                            }}>
                                {getStatusLabel(drone.manufacturingStatus)}
                            </span>
                        </div>

                        {/* Progress Bar */}
                        <div style={{ marginBottom: '16px' }}>
                            <div style={{
                                height: '6px',
                                background: '#e0e0e0',
                                borderRadius: '3px',
                                overflow: 'hidden'
                            }}>
                                <div style={{
                                    height: '100%',
                                    background: getStatusColor(drone.manufacturingStatus),
                                    width: `${Math.min(100, (Object.keys({
                                        material_entry: 8, material_inspection: 16, inventory_update: 24,
                                        material_distribution: 32, soldering: 40, mechanical_assembly: 48,
                                        payload_assembly: 56, electronic_assembly: 64, calibration: 72,
                                        flight_test: 80, packaging: 90, dispatch: 95, delivered: 100
                                    })[drone.manufacturingStatus] || 0))}%`,
                                    transition: 'width 0.3s'
                                }}></div>
                            </div>
                        </div>

                        {/* Details */}
                        <div style={{ fontSize: '0.75rem', color: '#666', marginBottom: '16px' }}>
                            <p>Created: {new Date(drone.createdAt).toLocaleDateString()}</p>
                            {drone.order && <p>Order: #{drone.order.orderNumber}</p>}
                        </div>

                        <a href={`/admin/drones/${drone._id}`} className="btn btn-outline btn-sm" style={{ width: '100%' }}>
                            View Workflow →
                        </a>
                    </div>
                ))}
            </div>

            {drones.length === 0 && (
                <div className="card" style={{ textAlign: 'center', padding: '60px' }}>
                    <p className="text-muted">No drones yet. Create your first drone to start manufacturing.</p>
                </div>
            )}

            {/* Add Drone Modal */}
            {showModal && (
                <div className="modal-overlay" onClick={() => setShowModal(false)}>
                    <div className="modal" onClick={e => e.stopPropagation()}>
                        <div className="modal-header">
                            <h3 className="modal-title">Add New Drone</h3>
                            <button onClick={() => setShowModal(false)} className="modal-close">×</button>
                        </div>
                        <form onSubmit={handleSubmit}>
                            <div className="modal-body">
                                <div className="form-group">
                                    <label className="form-label required">Serial Number</label>
                                    <input
                                        type="text"
                                        className="form-input"
                                        placeholder="e.g., CSKRISHI_001"
                                        value={formData.serialNo}
                                        onChange={(e) => setFormData({ ...formData, serialNo: e.target.value })}
                                        required
                                    />
                                </div>
                                <div className="form-group">
                                    <label className="form-label required">Model</label>
                                    <select
                                        className="form-select"
                                        value={formData.modelNo}
                                        onChange={(e) => setFormData({ ...formData, modelNo: e.target.value })}
                                    >
                                        <option value="CS_KRISHI_10L">CS_KRISHI_10L</option>
                                        <option value="CS_KRISHI_16L">CS_KRISHI_16L</option>
                                    </select>
                                </div>
                            </div>
                            <div className="modal-footer">
                                <button type="button" onClick={() => setShowModal(false)} className="btn btn-outline">
                                    Cancel
                                </button>
                                <button type="submit" className="btn btn-primary">
                                    Create Drone
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};

export default Drones;
