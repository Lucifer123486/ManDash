import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { dronesAPI } from '../../services/api';
import { Trash2 } from 'lucide-react';
import DroneIcon from '../../components/common/DroneIcon';
import { formatSerialNo } from '../../utils/serialFormatter';

const Drones = () => {
    const [drones, setDrones] = useState([]);
    const [loading, setLoading] = useState(true);
    const [showModal, setShowModal] = useState(false);
    const [filter, setFilter] = useState('all');

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

    /* ================= SERIAL AUTO INCREMENT ================= */

    const generateSerialNumber = () => {
        if (drones.length === 0) return 'CSKRISHI001';

        const numbers = drones
            .map(d => d.serialNo)
            .filter(sn => sn?.startsWith('CSKRISHI'))
            .map(sn => {
                const match = sn.match(/\d+$/);
                return match ? parseInt(match[0], 10) : 0;
            })
            .filter(n => n > 0);

        const next = numbers.length ? Math.max(...numbers) + 1 : 1;
        return `CSKRISHI${String(next).padStart(3, '0')}`;
    };

    const openModal = () => {
        setFormData({
            serialNo: generateSerialNumber(),
            modelNo: 'CS_KRISHI_10L',
            manufacturingStatus: 'material_entry'
        });
        setShowModal(true);
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        try {
            await dronesAPI.create(formData);
            fetchDrones();
            setShowModal(false);
        } catch (error) {
            alert(error.response?.data?.message || 'Error creating drone');
        }
    };

    const handleDelete = async (droneId, droneSerial) => {
        const password = window.prompt(`Please enter your password to delete drone ${droneSerial}:`);
        if (!password) return;

        try {
            await dronesAPI.delete(droneId, password);
            fetchDrones();
        } catch (err) {
            alert(err.response?.data?.message || 'Error deleting drone');
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
        if (status === 'delivered') return 'Completed';
        return status?.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
    };

    const filteredDrones = drones.filter(drone => {
        if (filter === 'assigned') return !!drone.order;
        if (filter === 'completed') return drone.manufacturingStatus === 'delivered';
        if (filter === 'manufacturing') return !['packaging', 'dispatch', 'delivered'].includes(drone.manufacturingStatus);
        return true;
    });

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
                <div style={{ display: 'flex', gap: '16px', alignItems: 'center' }}>
                    <select
                        className="form-select"
                        value={filter}
                        onChange={(e) => setFilter(e.target.value)}
                        style={{ width: '200px', margin: 0 }}
                    >
                        <option value="all">All Drones</option>
                        <option value="assigned">Assigned to Customers</option>
                        <option value="completed">Completed Drones</option>
                        <option value="manufacturing">In Manufacturing</option>
                    </select>
                    <button onClick={openModal} className="btn btn-primary">
                        + Add Drone
                    </button>
                </div>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-4 gap-lg" style={{ marginBottom: '24px' }}>
                <div className="stat-card">
                    <div className="stat-icon"><DroneIcon size={24} color="#1a237e" /></div>
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
                            {drones.filter(d => !['packaging', 'dispatch', 'delivered'].includes(d.manufacturingStatus)).length}
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
                        <h3>Completed</h3>
                        <div className="stat-value">
                            {drones.filter(d => d.manufacturingStatus === 'delivered').length}
                        </div>
                    </div>
                </div>
            </div>

            {/* Drone Cards */}
            <div className="grid grid-cols-3 gap-lg">
                {filteredDrones.map(drone => (
                    <div key={drone._id} className="card">
                        <h3>{formatSerialNo(drone.serialNo)}</h3>
                        <p className="text-muted">{drone.modelNo}</p>

                        <div style={{ marginTop: '10px', marginBottom: '10px' }}>
                            <div style={{ height: '6px', background: '#e0e0e0', borderRadius: '3px' }}>
                                <div
                                    style={{
                                        height: '100%',
                                        width: `${{
                                            material_entry: 8,
                                            material_inspection: 16,
                                            inventory_update: 24,
                                            material_distribution: 32,
                                            soldering: 40,
                                            mechanical_assembly: 48,
                                            payload_assembly: 56,
                                            electronic_assembly: 64,
                                            calibration: 72,
                                            flight_test: 80,
                                            packaging: 85,
                                            delivery_challan: 92,
                                            dispatch: 97,
                                            delivered: 100
                                        }[drone.manufacturingStatus] || 0}%`,
                                        background: getStatusColor(drone.manufacturingStatus)
                                    }}
                                />
                            </div>
                        </div>

                        <span style={{
                            fontSize: '12px',
                            color: getStatusColor(drone.manufacturingStatus)
                        }}>
                            {getStatusLabel(drone.manufacturingStatus)}
                        </span>

                        <div style={{ display: 'flex', gap: '8px' }}>
                            <Link
                                to={`/admin/drones/${drone._id}`}
                                className="btn btn-outline btn-sm"
                                style={{ flex: 1, marginTop: '12px', display: 'block', textAlign: 'center' }}
                            >
                                View Workflow →
                            </Link>
                            <button
                                onClick={() => handleDelete(drone._id, drone.serialNo)}
                                className="btn btn-outline btn-sm"
                                style={{ marginTop: '12px', padding: '0 12px', borderColor: '#f44336', color: '#f44336', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                                title="Delete Drone"
                            >
                                <Trash2 size={16} />
                            </button>
                        </div>
                    </div>
                ))}
            </div>

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
                                    <label className="form-label">Serial Number</label>
                                    <input className="form-input" value={formData.serialNo} disabled />
                                </div>

                                <div className="form-group">
                                    <label className="form-label">Model</label>
                                    <input className="form-input" value={formData.modelNo} disabled />
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
