import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { dronesAPI, formsAPI, usersAPI } from '../services/api';

// Workflow stages configuration
const WORKFLOW_STAGES = [
    { order: 1, code: 'PO', name: 'Purchase Order', access: ['gs'], icon: '📋' },
    { order: 2, code: 'MRF', name: 'Material Requisition', access: ['gs'], icon: '📦' },
    { order: 3, code: 'QA_SOLDERING', name: 'Soldering Station', access: ['manufacturing'], icon: '🔧' },
    { order: 4, code: 'QA_MECHANICAL', name: 'Mechanical Station', access: ['manufacturing'], icon: '⚙️' },
    { order: 5, code: 'QA_ELECTRICAL', name: 'Electrical Station', access: ['manufacturing'], icon: '⚡' },
    { order: 6, code: 'QA_PAYLOAD', name: 'Payload Station', access: ['manufacturing'], icon: '📡' },
    { order: 7, code: 'QA_CALIBRATION', name: 'Calibration Station', access: ['manufacturing'], icon: '🎯' },
    { order: 8, code: 'ACTIVATION', name: 'Activation & Pairing', access: ['gs'], icon: '🔗' },
    { order: 9, code: 'FLIGHT_TEST', name: 'Flight Testing', access: ['gs', 'qi'], icon: '✈️' },
    { order: 10, code: 'UIN', name: 'UIN Generation', access: ['gs'], icon: '🆔' },
    { order: 11, code: 'PACKAGING', name: 'Packaging', access: ['qi'], icon: '📦' },
    { order: 12, code: 'CUSTOMER_PROFILE', name: 'Customer Profile', access: ['gs'], icon: '👤' },
    { order: 13, code: 'DISPATCH', name: 'Dispatch', access: ['gs', 'qi'], icon: '🚚' },
    { order: 14, code: 'CERTIFICATE', name: 'Certificate', access: ['gs'], icon: '📜' }
];

const DroneDetail = () => {
    const { id } = useParams();
    const navigate = useNavigate();
    const [drone, setDrone] = useState(null);
    const [forms, setForms] = useState([]);
    const [completedForms, setCompletedForms] = useState([]);
    const [staffList, setStaffList] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [saving, setSaving] = useState(false);

    useEffect(() => {
        fetchDroneDetails();
        fetchStaff();
    }, [id]);

    const fetchDroneDetails = async () => {
        try {
            setLoading(true);
            
            // Fetch drone details
            const droneRes = await dronesAPI.getById(id);
            setDrone(droneRes.data.data);
            
            // Fetch all form schemas
            const formsRes = await formsAPI.getSchemas();
            setForms(formsRes.data.data || []);
            
            // Fetch completed form submissions for this drone
            const submissionsRes = await dronesAPI.getDocuments(id);
            const completed = submissionsRes.data.data || [];
            setCompletedForms(completed.map(s => s.formSchema?.formCode));
            
        } catch (err) {
            setError(err.response?.data?.message || 'Error loading drone details');
        } finally {
            setLoading(false);
        }
    };

    const fetchStaff = async () => {
        try {
            const res = await usersAPI.getAll({ role: 'staff' });
            const qiRes = await usersAPI.getAll({ role: 'qi' });
            setStaffList([...(res.data.data || []), ...(qiRes.data.data || [])]);
        } catch (err) {
            console.error('Error fetching staff:', err);
        }
    };

    const handleAssignStaff = async (type, userId) => {
        try {
            setSaving(true);
            const data = type === 'gs' 
                ? { assignedGS: userId } 
                : { assignedQI: userId };
            
            const res = await dronesAPI.assignStaff(id, data);
            setDrone(res.data.data);
            alert(`${type.toUpperCase()} assigned successfully!`);
        } catch (err) {
            alert('Error assigning staff: ' + err.message);
        } finally {
            setSaving(false);
        }
    };

    const getStageStatus = (stageCode) => {
        if (completedForms.includes(stageCode)) {
            return 'completed';
        }
        
        const stageIndex = WORKFLOW_STAGES.findIndex(s => s.code === stageCode);
        
        // First form is always accessible
        if (stageIndex === 0) {
            return 'current';
        }
        
        // Check if previous form is completed
        const prevStage = WORKFLOW_STAGES[stageIndex - 1];
        if (completedForms.includes(prevStage.code)) {
            return 'current';
        }
        
        return 'locked';
    };

    const handleFillForm = (stageCode) => {
        const form = forms.find(f => f.formCode === stageCode);
        if (form) {
            // Navigate to form with drone context
            navigate(`/form/${form._id}?droneId=${id}&droneSerial=${drone.serialNo}`);
        } else {
            alert('Form not found. Please run the seed script.');
        }
    };

    const handleViewSubmission = async (stageCode) => {
        try {
            const submissionsRes = await dronesAPI.getDocuments(id);
            const submissions = submissionsRes.data.data || [];
            const submission = submissions.find(s => s.formSchema?.formCode === stageCode);
            if (submission) {
                navigate(`/submission/${submission._id}`);
            }
        } catch (err) {
            alert('Error finding submission');
        }
    };

    const calculateProgress = () => {
        const completed = completedForms.length;
        const total = WORKFLOW_STAGES.length;
        return Math.round((completed / total) * 100);
    };

    // Get staff by type
    const generalStaff = staffList.filter(s => s.role === 'staff' && s.staffType !== 'quality_inspector');
    const qualityInspectors = staffList.filter(s => s.role === 'qi' || s.staffType === 'quality_inspector');

    if (loading) {
        return (
            <div className="loading-container">
                <div className="spinner"></div>
                <p>Loading drone details...</p>
            </div>
        );
    }

    if (error) {
        return (
            <div className="error-container">
                <h2>Error</h2>
                <p>{error}</p>
                <button onClick={() => navigate(-1)} className="btn btn-secondary">Go Back</button>
            </div>
        );
    }

    if (!drone) {
        return (
            <div className="error-container">
                <h2>Drone Not Found</h2>
                <button onClick={() => navigate('/admin/drones')} className="btn btn-primary">Back to Drones</button>
            </div>
        );
    }

    return (
        <div className="drone-detail-page">
            {/* Header Section */}
            <div className="drone-header">
                <div className="drone-header-left">
                    <button onClick={() => navigate(-1)} className="btn-back">
                        ← Back
                    </button>
                    <div className="drone-title">
                        <h1>{drone.serialNo}</h1>
                        <span className="model-badge">{drone.modelNo}</span>
                    </div>
                </div>
                <div className="drone-header-right">
                    <div className="status-badge" data-status={drone.manufacturingStatus}>
                        {drone.manufacturingStatus?.replace(/_/g, ' ')}
                    </div>
                </div>
            </div>

            {/* Progress Bar */}
            <div className="workflow-progress">
                <div className="progress-header">
                    <h3>Manufacturing Progress</h3>
                    <span className="progress-percentage">{calculateProgress()}%</span>
                </div>
                <div className="progress-bar">
                    <div 
                        className="progress-fill" 
                        style={{ width: `${calculateProgress()}%` }}
                    ></div>
                </div>
                <div className="progress-stats">
                    <span>{completedForms.length} of {WORKFLOW_STAGES.length} stages completed</span>
                </div>
            </div>

            {/* Drone Info Cards */}
            <div className="drone-info-grid">
                <div className="info-card">
                    <h4>Order Details</h4>
                    {drone.order ? (
                        <>
                            <p><strong>Order #:</strong> {drone.order.orderNumber || 'N/A'}</p>
                            <p><strong>Customer:</strong> {drone.order.customerName || 'N/A'}</p>
                        </>
                    ) : (
                        <p>No order assigned</p>
                    )}
                </div>
                
                {/* Staff Assignment Card */}
                <div className="info-card staff-card">
                    <h4>Assigned Staff</h4>
                    <div className="staff-assignment">
                        <div className="staff-row">
                            <label>General Staff (GS):</label>
                            <select 
                                value={drone.assignedGS?._id || ''}
                                onChange={(e) => handleAssignStaff('gs', e.target.value)}
                                disabled={saving}
                            >
                                <option value="">-- Select GS --</option>
                                {generalStaff.map(staff => (
                                    <option key={staff._id} value={staff._id}>
                                        {staff.name}
                                    </option>
                                ))}
                            </select>
                            {drone.assignedGS && (
                                <span className="assigned-name">✓ {drone.assignedGS.name}</span>
                            )}
                        </div>
                        <div className="staff-row">
                            <label>Quality Inspector (QI):</label>
                            <select 
                                value={drone.assignedQI?._id || ''}
                                onChange={(e) => handleAssignStaff('qi', e.target.value)}
                                disabled={saving}
                            >
                                <option value="">-- Select QI --</option>
                                {qualityInspectors.map(staff => (
                                    <option key={staff._id} value={staff._id}>
                                        {staff.name}
                                    </option>
                                ))}
                            </select>
                            {drone.assignedQI && (
                                <span className="assigned-name">✓ {drone.assignedQI.name}</span>
                            )}
                        </div>
                    </div>
                </div>

                <div className="info-card">
                    <h4>Component Details</h4>
                    <p><strong>FC#:</strong> {drone.components?.flightControllerNumber || 'Pending'}</p>
                    <p><strong>GCS#:</strong> {drone.components?.gcsNumber || 'Pending'}</p>
                    <p><strong>UIN:</strong> {drone.components?.uinNumber || 'Pending'}</p>
                </div>
            </div>

            {/* Workflow Timeline */}
            <div className="workflow-timeline">
                <h3>Workflow Stages</h3>
                <div className="timeline-container">
                    {WORKFLOW_STAGES.map((stage, index) => {
                        const status = getStageStatus(stage.code);
                        
                        return (
                            <div 
                                key={stage.code} 
                                className={`timeline-item ${status}`}
                            >
                                <div className="timeline-marker">
                                    {status === 'completed' ? '✓' : stage.icon}
                                </div>
                                <div className="timeline-content">
                                    <div className="timeline-header">
                                        <h4>{stage.name}</h4>
                                        <div className="access-badges">
                                            {stage.access.map(a => (
                                                <span key={a} className={`access-badge ${a}`}>
                                                    {a.toUpperCase()}
                                                </span>
                                            ))}
                                        </div>
                                    </div>
                                    <p className="stage-code">Form: {stage.code}</p>
                                    <div className="timeline-actions">
                                        {status === 'completed' ? (
                                            <button 
                                                onClick={() => handleViewSubmission(stage.code)}
                                                className="btn btn-sm btn-secondary"
                                            >
                                                View Submission
                                            </button>
                                        ) : status === 'current' ? (
                                            <button 
                                                onClick={() => handleFillForm(stage.code)}
                                                className="btn btn-sm btn-primary"
                                            >
                                                Fill Form
                                            </button>
                                        ) : (
                                            <button 
                                                className="btn btn-sm btn-disabled"
                                                disabled
                                            >
                                                🔒 Locked
                                            </button>
                                        )}
                                    </div>
                                </div>
                                {index < WORKFLOW_STAGES.length - 1 && (
                                    <div className={`timeline-connector ${status === 'completed' ? 'completed' : ''}`}></div>
                                )}
                            </div>
                        );
                    })}
                </div>
            </div>

            {/* Styles */}
            <style>{`
                .drone-detail-page {
                    padding: 20px;
                    max-width: 1200px;
                    margin: 0 auto;
                }

                .drone-header {
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                    margin-bottom: 30px;
                    padding-bottom: 20px;
                    border-bottom: 1px solid #e0e0e0;
                }

                .drone-header-left {
                    display: flex;
                    align-items: center;
                    gap: 20px;
                }

                .btn-back {
                    background: none;
                    border: 1px solid #ddd;
                    padding: 8px 16px;
                    border-radius: 8px;
                    cursor: pointer;
                    transition: all 0.2s;
                }

                .btn-back:hover {
                    background: #f5f5f5;
                }

                .drone-title h1 {
                    margin: 0;
                    font-size: 24px;
                }

                .model-badge {
                    background: #e3f2fd;
                    color: #1976d2;
                    padding: 4px 12px;
                    border-radius: 20px;
                    font-size: 12px;
                    margin-left: 10px;
                }

                .status-badge {
                    padding: 8px 16px;
                    border-radius: 20px;
                    font-weight: 500;
                    text-transform: capitalize;
                }

                .status-badge[data-status="material_entry"] { background: #fff3e0; color: #e65100; }
                .status-badge[data-status="soldering"] { background: #e8f5e9; color: #2e7d32; }
                .status-badge[data-status="flight_test"] { background: #e3f2fd; color: #1976d2; }
                .status-badge[data-status="delivered"] { background: #c8e6c9; color: #1b5e20; }

                .workflow-progress {
                    background: white;
                    padding: 20px;
                    border-radius: 12px;
                    box-shadow: 0 2px 8px rgba(0,0,0,0.1);
                    margin-bottom: 30px;
                }

                .progress-header {
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                    margin-bottom: 15px;
                }

                .progress-header h3 {
                    margin: 0;
                }

                .progress-percentage {
                    font-size: 24px;
                    font-weight: bold;
                    color: #4caf50;
                }

                .progress-bar {
                    height: 12px;
                    background: #e0e0e0;
                    border-radius: 6px;
                    overflow: hidden;
                }

                .progress-fill {
                    height: 100%;
                    background: linear-gradient(90deg, #4caf50, #8bc34a);
                    border-radius: 6px;
                    transition: width 0.5s ease;
                }

                .progress-stats {
                    margin-top: 10px;
                    color: #666;
                    font-size: 14px;
                }

                .drone-info-grid {
                    display: grid;
                    grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
                    gap: 20px;
                    margin-bottom: 30px;
                }

                .info-card {
                    background: white;
                    padding: 20px;
                    border-radius: 12px;
                    box-shadow: 0 2px 8px rgba(0,0,0,0.1);
                }

                .info-card h4 {
                    margin: 0 0 15px 0;
                    color: #333;
                    border-bottom: 2px solid #4caf50;
                    padding-bottom: 10px;
                }

                .info-card p {
                    margin: 8px 0;
                    color: #555;
                }

                .staff-card {
                    grid-column: span 1;
                }

                .staff-assignment {
                    display: flex;
                    flex-direction: column;
                    gap: 15px;
                }

                .staff-row {
                    display: flex;
                    flex-direction: column;
                    gap: 5px;
                }

                .staff-row label {
                    font-weight: 500;
                    color: #555;
                    font-size: 13px;
                }

                .staff-row select {
                    padding: 8px 12px;
                    border: 1px solid #ddd;
                    border-radius: 8px;
                    font-size: 14px;
                }

                .assigned-name {
                    color: #4caf50;
                    font-size: 12px;
                    margin-top: 3px;
                }

                .workflow-timeline {
                    background: white;
                    padding: 30px;
                    border-radius: 12px;
                    box-shadow: 0 2px 8px rgba(0,0,0,0.1);
                }

                .workflow-timeline h3 {
                    margin: 0 0 25px 0;
                }

                .timeline-container {
                    position: relative;
                }

                .timeline-item {
                    display: flex;
                    gap: 20px;
                    position: relative;
                    padding-bottom: 30px;
                }

                .timeline-marker {
                    width: 50px;
                    height: 50px;
                    border-radius: 50%;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    font-size: 20px;
                    flex-shrink: 0;
                    z-index: 1;
                }

                .timeline-item.completed .timeline-marker {
                    background: #4caf50;
                    color: white;
                }

                .timeline-item.current .timeline-marker {
                    background: #2196f3;
                    color: white;
                    animation: pulse 2s infinite;
                }

                .timeline-item.locked .timeline-marker {
                    background: #e0e0e0;
                    color: #999;
                }

                @keyframes pulse {
                    0%, 100% { box-shadow: 0 0 0 0 rgba(33, 150, 243, 0.4); }
                    50% { box-shadow: 0 0 0 10px rgba(33, 150, 243, 0); }
                }

                .timeline-content {
                    flex: 1;
                    background: #f9f9f9;
                    padding: 15px 20px;
                    border-radius: 10px;
                }

                .timeline-item.current .timeline-content {
                    border: 2px solid #2196f3;
                    background: #e3f2fd;
                }

                .timeline-item.locked .timeline-content {
                    opacity: 0.6;
                }

                .timeline-header {
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                    margin-bottom: 8px;
                }

                .timeline-header h4 {
                    margin: 0;
                }

                .access-badges {
                    display: flex;
                    gap: 5px;
                }

                .access-badge {
                    padding: 2px 8px;
                    border-radius: 10px;
                    font-size: 10px;
                    font-weight: 600;
                }

                .access-badge.gs { background: #e3f2fd; color: #1976d2; }
                .access-badge.qi { background: #fce4ec; color: #c2185b; }
                .access-badge.manufacturing { background: #fff3e0; color: #e65100; }

                .stage-code {
                    color: #888;
                    font-size: 12px;
                    margin: 5px 0;
                }

                .timeline-actions {
                    margin-top: 10px;
                }

                .timeline-connector {
                    position: absolute;
                    left: 24px;
                    top: 50px;
                    width: 2px;
                    height: calc(100% - 50px);
                    background: #e0e0e0;
                }

                .timeline-connector.completed {
                    background: #4caf50;
                }

                .btn {
                    padding: 8px 16px;
                    border: none;
                    border-radius: 6px;
                    cursor: pointer;
                    font-weight: 500;
                    transition: all 0.2s;
                }

                .btn-sm {
                    padding: 6px 12px;
                    font-size: 13px;
                }

                .btn-primary {
                    background: #4caf50;
                    color: white;
                }

                .btn-primary:hover {
                    background: #43a047;
                }

                .btn-secondary {
                    background: #e0e0e0;
                    color: #333;
                }

                .btn-secondary:hover {
                    background: #d0d0d0;
                }

                .btn-disabled {
                    background: #f5f5f5;
                    color: #bbb;
                    cursor: not-allowed;
                }

                .loading-container, .error-container {
                    display: flex;
                    flex-direction: column;
                    align-items: center;
                    justify-content: center;
                    height: 50vh;
                    gap: 20px;
                }

                .spinner {
                    width: 50px;
                    height: 50px;
                    border: 4px solid #e0e0e0;
                    border-top-color: #4caf50;
                    border-radius: 50%;
                    animation: spin 1s linear infinite;
                }

                @keyframes spin {
                    to { transform: rotate(360deg); }
                }
            `}</style>
        </div>
    );
};

export default DroneDetail;
