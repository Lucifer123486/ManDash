import { useState, useEffect } from 'react';
import { dronesAPI, formsAPI } from '../../services/api';

const Workflow = () => {
    const [drones, setDrones] = useState([]);
    const [formSchemas, setFormSchemas] = useState([]);
    const [loading, setLoading] = useState(true);
    const [selectedDrone, setSelectedDrone] = useState(null);

    const workflowSteps = [
        { key: 'material_entry', name: 'Material Entry', form: 'MPR', icon: '📦' },
        { key: 'soldering', name: 'Soldering Station', form: 'QA-SS', icon: '🔧' },
        { key: 'mechanical_assembly', name: 'Mechanical Assembly', form: 'QA-MA', icon: '⚙️' },
        { key: 'payload_assembly', name: 'Payload Assembly', form: 'QA-PS', icon: '🔌' },
        { key: 'electronic_assembly', name: 'Electronic Assembly', form: 'QA-EA', icon: '💡' },
        { key: 'calibration', name: 'Calibration', form: 'QA-CS', icon: '📡' },
        { key: 'flight_test', name: 'Flight Test', form: 'FTC', icon: '✈️' },
        { key: 'packaging', name: 'Packaging', form: 'PCL', icon: '📦' },
        { key: 'dispatch', name: 'Dispatch', form: 'DCL', icon: '🚚' }
    ];

    useEffect(() => {
        fetchData();
    }, []);

    const fetchData = async () => {
        try {
            const [dronesRes, schemasRes] = await Promise.all([
                dronesAPI.getAll(),
                formsAPI.getSchemas()
            ]);
            setDrones(dronesRes.data.data || []);
            setFormSchemas(schemasRes.data.data || []);
        } catch (error) {
            console.error('Error fetching data:', error);
        } finally {
            setLoading(false);
        }
    };

    const getCurrentStepIndex = (status) => {
        return workflowSteps.findIndex(step => step.key === status);
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
                    <h1 className="page-title">Manufacturing Workflow</h1>
                    <p className="page-subtitle">Track and manage drone manufacturing process</p>
                </div>
            </div>

            <div className="grid grid-cols-3 gap-lg">
                {/* Drone List */}
                <div className="card" style={{ gridColumn: 'span 1' }}>
                    <div className="card-header">
                        <h3 className="card-title">Select Drone</h3>
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                        {drones.map((drone) => (
                            <div
                                key={drone._id}
                                onClick={() => setSelectedDrone(drone)}
                                style={{
                                    padding: '12px 16px',
                                    background: selectedDrone?._id === drone._id ? '#FFF8E1' : '#f9f9f9',
                                    borderRadius: '8px',
                                    cursor: 'pointer',
                                    border: selectedDrone?._id === drone._id ? '2px solid #FFD600' : '2px solid transparent',
                                    transition: 'all 0.2s'
                                }}
                            >
                                <div style={{ fontWeight: 600 }}>{drone.serialNo}</div>
                                <div className="text-xs text-muted">{drone.manufacturingStatus?.replace(/_/g, ' ')}</div>
                            </div>
                        ))}
                        {drones.length === 0 && (
                            <p className="text-muted">No drones available</p>
                        )}
                    </div>
                </div>

                {/* Workflow Steps */}
                <div className="card" style={{ gridColumn: 'span 2' }}>
                    <div className="card-header">
                        <h3 className="card-title">
                            {selectedDrone ? `Workflow for ${selectedDrone.serialNo}` : 'Select a drone to view workflow'}
                        </h3>
                    </div>

                    {selectedDrone ? (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                            {workflowSteps.map((step, index) => {
                                const currentIndex = getCurrentStepIndex(selectedDrone.manufacturingStatus);
                                const isCompleted = index < currentIndex;
                                const isCurrent = index === currentIndex;
                                const isPending = index > currentIndex;

                                return (
                                    <div
                                        key={step.key}
                                        style={{
                                            display: 'flex',
                                            alignItems: 'center',
                                            gap: '16px',
                                            padding: '16px',
                                            background: isCurrent ? '#FFF8E1' : isCompleted ? '#E8F5E9' : '#f9f9f9',
                                            borderRadius: '8px',
                                            border: isCurrent ? '2px solid #FFD600' : '2px solid transparent'
                                        }}
                                    >
                                        <div style={{
                                            width: '40px',
                                            height: '40px',
                                            borderRadius: '50%',
                                            background: isCompleted ? '#4CAF50' : isCurrent ? '#FFD600' : '#e0e0e0',
                                            display: 'flex',
                                            alignItems: 'center',
                                            justifyContent: 'center',
                                            fontSize: '18px'
                                        }}>
                                            {isCompleted ? '✓' : step.icon}
                                        </div>
                                        <div style={{ flex: 1 }}>
                                            <div style={{ fontWeight: 600, color: isPending ? '#9e9e9e' : '#212121' }}>
                                                {step.name}
                                            </div>
                                            <div className="text-xs text-muted">
                                                {isCompleted ? 'Completed' : isCurrent ? 'In Progress' : 'Pending'}
                                            </div>
                                        </div>
                                        {isCurrent && (
                                            <a
                                                href={`/staff/forms/${step.form}?drone=${selectedDrone._id}`}
                                                className="btn btn-primary btn-sm"
                                            >
                                                Fill Form
                                            </a>
                                        )}
                                        {isCompleted && (
                                            <span className="badge badge-success">Done</span>
                                        )}
                                    </div>
                                );
                            })}
                        </div>
                    ) : (
                        <div style={{ textAlign: 'center', padding: '60px' }}>
                            <p className="text-muted">← Select a drone from the list to view its workflow</p>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default Workflow;
