import { useState, useEffect } from 'react';
import { dronesAPI, formsAPI } from '../../services/api';
import { formatSerialNo } from '../../utils/serialFormatter';

const Workflow = () => {
    const [drones, setDrones] = useState([]);
    const [formSchemas, setFormSchemas] = useState([]);
    const [loading, setLoading] = useState(true);
    const [selectedDrone, setSelectedDrone] = useState(null);
    const [droneSubmissions, setDroneSubmissions] = useState([]);

    const workflowSteps = [
        { key: 'material_entry', name: 'Material Entry', form: 'PO', icon: '📦' },
        { key: 'material_inspection', name: 'Material Inspection', form: 'MRF', icon: '🔍' },
        { key: 'soldering', name: 'Soldering Station', form: 'QA_SOLDERING', icon: '🔧' },
        { key: 'mechanical_assembly', name: 'Mechanical Assembly', form: 'QA_MECHANICAL', icon: '⚙️' },
        { key: 'electronic_assembly', name: 'Electronic Assembly', form: 'QA_ELECTRONIC', icon: '💡' },
        { key: 'payload_assembly', name: 'Payload Assembly', form: 'QA_PAYLOAD', icon: '🔌' },
        { key: 'calibration', name: 'Calibration', form: 'QA_CALIBRATION', icon: '📡' },
        { key: 'hash_code', name: 'Data/Hash Code', form: 'HASH_CODE', icon: '📑' },
        { key: 'flight_test', name: 'Activation / Flight Test', form: 'ACTIVATION', icon: '✈️' },
        { key: 'packaging', name: 'Packaging', form: 'PACKAGING', icon: '📦' },
        { key: 'customer_profile', name: 'Customer Profile', form: 'CUSTOMER_PROFILE', icon: '👤' },
        { key: 'delivery_challan', name: 'Delivery Challan', form: 'DELIVERY_CHALLAN', icon: '📄' },
        { key: 'tax_invoice', name: 'Tax Invoice', form: 'TAX_INVOICE', icon: '💰' },
        { key: 'dispatch', name: 'Dispatch', form: 'DISPATCH', icon: '🚚' },
        { key: 'delivered', name: 'Certificate', form: 'CERTIFICATE', icon: '📜' }
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

    const fetchDroneSubmissions = async (droneId) => {
        try {
            const res = await formsAPI.getDroneSubmissions(droneId);
            setDroneSubmissions(res.data.data || []);
        } catch (error) {
            console.error('Error fetching drone submissions:', error);
        }
    };

    useEffect(() => {
        if (selectedDrone) {
            fetchDroneSubmissions(selectedDrone._id);
        } else {
            setDroneSubmissions([]);
        }
    }, [selectedDrone]);

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
                                <div style={{ fontWeight: 600 }}>{formatSerialNo(drone.serialNo)}</div>
                                <div className="text-xs text-muted" style={{ textTransform: 'uppercase' }}>{drone.manufacturingStatus?.replace(/_/g, ' ')}</div>
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
                        {selectedDrone ? `Workflow for ${formatSerialNo(selectedDrone.serialNo)}` : 'Select a drone to view workflow'}
                    </div>

                    {selectedDrone ? (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                            {workflowSteps.map((step, index) => {
                                const currentIndex = getCurrentStepIndex(selectedDrone.manufacturingStatus);

                                // Robust completion check
                                const actualSubmission = droneSubmissions.find(s => s.formSchema?.formCode === step.form);
                                const isCompleted = actualSubmission?.status === 'approved' ||
                                    (selectedDrone.completedSteps?.some(s => s.step === step.form)) ||
                                    (index < currentIndex && step.form !== 'CUSTOMER_PROFILE');

                                const isCurrent = index === currentIndex;
                                const isPending = index > currentIndex;

                                const hasDraft = actualSubmission?.status === 'draft';
                                const hasPending = actualSubmission?.status === 'submitted';
                                const canContinue = hasDraft || hasPending;

                                return (
                                    <div
                                        key={step.key}
                                        style={{
                                            display: 'flex',
                                            alignItems: 'center',
                                            gap: '16px',
                                            padding: '16px',
                                            background: isCurrent || (step.key === 'customer_profile' && !isCompleted) ? '#FFF8E1' : isCompleted ? '#E8F5E9' : '#f9f9f9',
                                            borderRadius: '8px',
                                            border: (isCurrent || (step.key === 'customer_profile' && !isCompleted)) ? '2px solid #FFD600' : '2px solid transparent',
                                            opacity: (isCurrent || isCompleted || canContinue || step.key === 'customer_profile') ? 1 : 0.6
                                        }}
                                    >
                                        <div style={{
                                            width: '40px',
                                            height: '40px',
                                            borderRadius: '50%',
                                            background: isCompleted ? '#4CAF50' : (isCurrent || step.key === 'customer_profile') ? '#FFD600' : '#e0e0e0',
                                            display: 'flex',
                                            alignItems: 'center',
                                            justifyContent: 'center',
                                            fontSize: '18px'
                                        }}>
                                            {isCompleted ? '✓' : step.icon}
                                        </div>
                                        <div style={{ flex: 1 }}>
                                            <div style={{ fontWeight: 600, color: (isPending && step.key !== 'customer_profile') ? '#9e9e9e' : '#212121' }}>
                                                {step.name}
                                            </div>
                                            <div className="text-xs text-muted">
                                                {isCompleted ? 'Completed' : canContinue ? 'Draft Saved' : (isCurrent || step.key === 'customer_profile') ? 'In Progress' : 'Pending'}
                                            </div>
                                            {actualSubmission?.status === 'rejected' && actualSubmission?.remarks && (
                                                <div style={{
                                                    marginTop: '10px',
                                                    padding: '12px 16px',
                                                    background: '#FFEBEE',
                                                    borderRadius: '8px',
                                                    borderLeft: '4px solid #F44336',
                                                    fontSize: '0.9rem',
                                                    color: '#C62828',
                                                    fontWeight: 500,
                                                    boxShadow: '0 2px 4px rgba(0,0,0,0.05)'
                                                }}>
                                                    <div style={{ fontSize: '11px', fontWeight: 700, textTransform: 'uppercase', marginBottom: '4px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                                                        <span>❗</span> Rejection Reason:
                                                    </div>
                                                    <div style={{ marginBottom: '8px' }}>{actualSubmission.remarks}</div>
                                                    
                                                    <a
                                                        href={`/staff/forms/${step.form}?droneId=${selectedDrone._id}&droneSerial=${selectedDrone.serialNo || ''}&modelNo=${selectedDrone.model || ''}`}
                                                        className="btn btn-sm"
                                                        style={{
                                                            background: '#F44336',
                                                            color: '#fff',
                                                            border: 'none',
                                                            fontWeight: 600,
                                                            padding: '4px 12px',
                                                            borderRadius: '4px',
                                                            fontSize: '0.75rem',
                                                            display: 'inline-block',
                                                            textDecoration: 'none'
                                                        }}
                                                    >
                                                        Refill Form →
                                                    </a>
                                                </div>
                                            )}
                                        </div>
                                        {(isCurrent || canContinue || (step.key === 'customer_profile' && !isCompleted)) && (
                                            (step.key === 'delivery_challan' || step.key === 'hash_code' || step.key === 'tax_invoice') ? (
                                                <button
                                                    onClick={() => navigate(`/drones/${selectedDrone._id}`)}
                                                    className="btn btn-primary btn-sm"
                                                >
                                                    UPLOAD
                                                </button>
                                            ) : (
                                                <button
                                                    onClick={() => navigate(`/staff/forms/${step.form}?droneId=${selectedDrone._id}`)}
                                                    className="btn btn-primary btn-sm"
                                                    style={canContinue ? { background: '#FFD600', color: '#000', borderColor: '#FFD600' } : {}}
                                                >
                                                    {canContinue ? 'Continue' : 'Fill Form'}
                                                </button>
                                            )
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
