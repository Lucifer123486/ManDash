import { useState, useEffect } from 'react';
import { dronesAPI } from '../../services/api';

const StaffDrones = () => {
    const [drones, setDrones] = useState([]);
    const [loading, setLoading] = useState(true);

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

    const getStatusColor = (status) => {
        const colors = {
            material_entry: '#9E9E9E',
            soldering: '#FF9800',
            mechanical_assembly: '#FF5722',
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

    const getProgressPercent = (status) => {
        const progress = {
            material_entry: 8, material_inspection: 16, inventory_update: 24,
            material_distribution: 32, soldering: 40, mechanical_assembly: 48,
            payload_assembly: 56, electronic_assembly: 64, calibration: 72,
            flight_test: 80, packaging: 90, dispatch: 95, delivered: 100
        };
        return progress[status] || 0;
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
                    <h1 className="page-title">My Drones</h1>
                    <p className="page-subtitle">Track manufacturing progress of assigned drones</p>
                </div>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-3 gap-lg" style={{ marginBottom: '24px' }}>
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
                    <div className="stat-icon" style={{ background: '#E8F5E9', color: '#4CAF50' }}>✅</div>
                    <div className="stat-content">
                        <h3>Completed</h3>
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
                                    width: `${getProgressPercent(drone.manufacturingStatus)}%`,
                                    transition: 'width 0.3s'
                                }}></div>
                            </div>
                            <div className="text-xs text-muted" style={{ marginTop: '4px', textAlign: 'right' }}>
                                {getProgressPercent(drone.manufacturingStatus)}% complete
                            </div>
                        </div>

                        <a href={`/staff/forms/MPR`} className="btn btn-primary btn-sm" style={{ width: '100%' }}>
                            Fill Forms →
                        </a>
                    </div>
                ))}
            </div>

            {drones.length === 0 && (
                <div className="card" style={{ textAlign: 'center', padding: '60px' }}>
                    <p className="text-muted">No drones assigned yet.</p>
                </div>
            )}
        </div>
    );
};

export default StaffDrones;
