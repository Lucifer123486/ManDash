import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { formsAPI, dronesAPI } from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import DroneIcon from '../../components/common/DroneIcon';

const MaintenanceFormPage = () => {
    const [drones, setDrones] = useState([]);
    const [selectedDroneId, setSelectedDroneId] = useState('');
    const [loading, setLoading] = useState(true);
    const [submitting, setSubmitting] = useState(false);
    const [maintenanceSchema, setMaintenanceSchema] = useState(null);
    const [existingSubmissions, setExistingSubmissions] = useState({});
    const { user } = useAuth();
    const navigate = useNavigate();

    useEffect(() => {
        fetchInitialData();
    }, []);

    const fetchInitialData = async () => {
        try {
            setLoading(true);
            const [dronesRes, schemasRes, submissionsRes] = await Promise.all([
                dronesAPI.getAll(),
                formsAPI.getSchemas(),
                formsAPI.getSubmissions({ formCode: 'MAINTENANCE_REPLACEMENT' }) // Get all maintenance submissions
            ]);

            setDrones(dronesRes.data.data || []);
            
            const schema = (schemasRes.data.data || []).find(s => s.formCode === 'MAINTENANCE_REPLACEMENT');
            setMaintenanceSchema(schema);

            // Group submissions by drone ID for history view
            const submissions = submissionsRes.data.data || [];
            const subMap = {};
            submissions.forEach(s => {
                const dId = s.drone?._id || s.drone;
                if (dId) {
                    const idString = dId.toString();
                    if (!subMap[idString]) subMap[idString] = [];
                    subMap[idString].push(s);
                }
            });
            // Sort each group by date descending
            Object.values(subMap).forEach(list => {
                list.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
            });
            setExistingSubmissions(subMap);

        } catch (error) {
            console.error('Error fetching maintenance data:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleFormTransition = () => {
        // Multiple submissions allowed, so we don't block here.
        if (!selectedDroneId) {
            alert('Please select a drone first.');
            return;
        }

        if (!maintenanceSchema) {
            alert('Maintenance form configuration not found.');
            return;
        }

        const drone = drones.find(d => d._id === selectedDroneId);
        const serial = drone?.serialNo || drone?.droneId || '';
        const model = drone?.model || drone?.modelNo || 'CS_KRISHI_10L';

        setSubmitting(true);
        try {
            navigate(`/staff/forms/MAINTENANCE_REPLACEMENT?droneId=${selectedDroneId}&droneSerial=${serial}&modelNo=${model}`);
        } catch (error) {
            console.error('Error:', error);
            alert('Error processing request.');
        } finally {
            setSubmitting(false);
        }
    };

    const getSelectedDroneStatus = () => {
        if (!selectedDroneId) return null;
        
        return {
            label: 'READY FOR MAINTENANCE',
            color: '#2196F3',
            isCompleted: false
        };
    };

    const currentStatus = getSelectedDroneStatus();

    if (loading) {
        return (
            <div className="loading-container">
                <div className="loading-spinner"></div>
            </div>
        );
    }

    return (
        <div style={{ maxWidth: '800px', margin: '0 auto', padding: '20px' }}>
            <div className="page-header" style={{ marginBottom: '30px', textAlign: 'center' }}>
                <h1 className="page-title" style={{ fontSize: '24px', fontWeight: 'bold', color: '#1e1e1e' }}>
                    🔧 Maintenance / Replacement Portal
                </h1>
                <p className="page-subtitle" style={{ color: '#666' }}>
                    Direct entry point for Service Engineers to update maintenance history.
                </p>
            </div>

            <div className="card" style={{ padding: '30px', boxShadow: '0 4px 20px rgba(0,0,0,0.08)', borderRadius: '12px', borderTop: currentStatus ? `5px solid ${currentStatus.color}` : 'none' }}>
                
                {currentStatus && (
                    <div style={{ 
                        marginBottom: '20px', 
                        padding: '10px', 
                        background: currentStatus.isCompleted ? '#E8F5E9' : '#E3F2FD',
                        color: currentStatus.color,
                        borderRadius: '6px',
                        textAlign: 'center',
                        fontWeight: 'bold',
                        fontSize: '14px',
                        textTransform: 'uppercase'
                    }}>
                        {currentStatus.label}
                    </div>
                )}

                <div className="form-group" style={{ marginBottom: '25px' }}>
                    <label className="form-label" style={{ fontWeight: '600', marginBottom: '10px', display: 'block' }}>
                        Search Drone by Serial Number
                    </label>
                    <select
                        className="form-select"
                        value={selectedDroneId}
                        onChange={(e) => setSelectedDroneId(e.target.value)}
                        style={{ 
                            width: '100%', 
                            padding: '12px 15px', 
                            borderRadius: '8px', 
                            border: '2px solid #ddd',
                            fontSize: '16px'
                        }}
                    >
                        <option value="">-- Choose a Drone --</option>
                        {drones.map(d => (
                            <option key={d._id} value={d._id}>
                                {d.serialNo} | {d.modelNo || d.model}
                            </option>
                        ))}
                    </select>
                </div>

                <div style={{ textAlign: 'center' }}>
                    <button
                        onClick={handleFormTransition}
                        disabled={!selectedDroneId || submitting}
                        className="btn btn-primary"
                        style={{ 
                            width: '100%', 
                            padding: '14px', 
                            fontSize: '18px', 
                            fontWeight: 'bold',
                            backgroundColor: currentStatus?.isCompleted ? '#4CAF50' : '#2196F3',
                            border: 'none',
                            borderRadius: '8px',
                            cursor: 'pointer',
                            opacity: selectedDroneId ? 1 : 0.6
                        }}
                    >
                        {submitting ? 'Connecting...' : 'Proceed to Fill Form'}
                    </button>
                </div>

                {/* HISTORICAL RECORDS LIST */}
                {selectedDroneId && existingSubmissions[selectedDroneId] && existingSubmissions[selectedDroneId].length > 0 && (
                    <div style={{ marginTop: '30px', borderTop: '1px solid #eee', paddingTop: '20px' }}>
                        <h3 style={{ fontSize: '16px', fontWeight: 'bold', marginBottom: '15px', color: '#333' }}>
                            📜 Previous Maintenance Records ({existingSubmissions[selectedDroneId].length})
                        </h3>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                            {existingSubmissions[selectedDroneId].map((sub, idx) => (
                                <div key={sub._id} style={{ 
                                    padding: '12px', 
                                    background: '#f8f9fa', 
                                    borderRadius: '8px', 
                                    display: 'flex', 
                                    justifyContent: 'space-between', 
                                    alignItems: 'center',
                                    border: '1px solid #eaeaea'
                                }}>
                                    <div>
                                        <div style={{ fontWeight: '600', fontSize: '14px' }}>Maintenance Record #{existingSubmissions[selectedDroneId].length - idx}</div>
                                        <div style={{ fontSize: '12px', color: '#666' }}>Submitted on {new Date(sub.createdAt).toLocaleDateString()} at {new Date(sub.createdAt).toLocaleTimeString()}</div>
                                        <div style={{ marginTop: '4px' }}>
                                            <span className={`badge ${sub.status === 'approved' ? 'badge-success' : 'badge-warning'}`} style={{ fontSize: '10px' }}>
                                                {sub.status?.toUpperCase()}
                                            </span>
                                        </div>
                                    </div>
                                    <button 
                                        onClick={() => navigate(`/submission/${sub._id}`)}
                                        className="btn btn-ghost btn-sm"
                                        style={{ fontSize: '12px', color: '#2196F3' }}
                                    >
                                        View Details →
                                    </button>
                                </div>
                            ))}
                        </div>
                    </div>
                )}
            </div>

            {/* Quick Helper Info */}
            <div style={{ marginTop: '40px', background: '#E3F2FD', padding: '20px', borderRadius: '10px', borderLeft: '4px solid #2196F3' }}>
                <h4 style={{ margin: '0 0 10px 0', color: '#0D47A1', fontSize: '16px' }}>📌 Important Note</h4>
                <ul style={{ margin: 0, paddingLeft: '20px', color: '#1565C0', fontSize: '14px', lineHeight: '1.6' }}>
                    <li>Ensure you have the drone's UIN and technical details ready.</li>
                    <li>Submitting this form will automatically update the drone's manufacturing/maintenance status.</li>
                    <li>This record will be visible in the drone's history after approval (if required).</li>
                </ul>
            </div>
        </div>
    );
};

export default MaintenanceFormPage;
