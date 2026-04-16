import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { dronesAPI, FILE_BASE_URL } from '../../services/api';
import { Trash2 } from 'lucide-react';
import DroneIcon from '../../components/common/DroneIcon';
import { formatSerialNo } from '../../utils/serialFormatter';
import {
    FaPlane, FaCheckCircle, FaExclamationTriangle,
    FaFileInvoice, FaIndustry, FaSignal, FaBolt, FaCogs,
    FaCamera, FaBalanceScale, FaClipboardList, FaBoxOpen, FaHourglassHalf,
    FaUser, FaCertificate, FaTruck, FaFingerprint, FaFileUpload, FaWrench
} from 'react-icons/fa';

const StaffDrones = () => {
    const navigate = useNavigate();
    const [drones, setDrones] = useState([]);
    const [loading, setLoading] = useState(true);
    const [filter, setFilter] = useState('all');
    const [selectedDrone, setSelectedDrone] = useState(null);
    const [submissions, setSubmissions] = useState([]);
    const [completedForms, setCompletedForms] = useState([]);
    const [saving, setSaving] = useState(false);
    const [uploadingStage, setUploadingStage] = useState(null);
    const fileInputRef = useRef(null);

    // Define Workflow Stages - Exact match to DroneDetail.jsx (Admin side)
    const WORKFLOW_STAGES = [
        { name: 'Purchase Order', code: 'PO', icon: <FaFileInvoice />, color: '#4caf50' },
        { name: 'Work Order', code: 'WORK_ORDER', icon: <FaClipboardList />, color: '#4caf50' },
        { name: 'Material Requisition', code: 'MRF', icon: <FaClipboardList />, color: '#4caf50' },
        { name: 'Soldering Station', code: 'QA_SOLDERING', icon: <FaIndustry />, color: '#4caf50' },
        { name: 'Mechanical Station', code: 'QA_MECHANICAL', icon: <FaCogs />, color: '#4caf50' },
        { name: 'Electrical Station', code: 'QA_ELECTRONIC', icon: <FaBolt />, color: '#4caf50' },
        { name: 'Payload Station', code: 'QA_PAYLOAD', icon: <FaCamera />, color: '#4caf50' },
        { name: 'Calibration Station', code: 'QA_CALIBRATION', icon: <FaBalanceScale />, color: '#4caf50' },
        { name: 'Data/Hash Code', code: 'HASH_CODE', icon: <FaFileUpload />, color: '#4caf50' },
        { name: 'Activation & Pairing', code: 'ACTIVATION', icon: <FaSignal />, color: '#4caf50' },
        { name: 'Flight Testing', code: 'FLIGHT_TEST', icon: <FaPlane />, color: '#2196f3' },
        { name: 'UIN Plate', code: 'UIN', icon: <FaFingerprint />, color: '#9c27b0' },
        { name: 'D2 Form', code: 'D2_FORM', icon: <FaFileUpload />, color: '#9c27b0' },
        { name: 'UIN Photo', code: 'UIN_PHOTO', icon: <FaCamera />, color: '#9c27b0' },
        { name: 'D3 Form', code: 'D3_FORM', icon: <FaFileUpload />, color: '#9c27b0' },
        { name: 'Packaging', code: 'PACKAGING', icon: <FaBoxOpen />, color: '#4caf50' },
        { name: 'Customer Profile', code: 'CUSTOMER_PROFILE', icon: <FaUser />, color: '#2196f3' },
        { name: 'Delivery Challan', code: 'DELIVERY_CHALLAN', icon: <FaFileInvoice />, color: '#4caf50' },
        { name: 'Tax Invoice', code: 'TAX_INVOICE', icon: <FaFileInvoice />, color: '#4caf50' },
        { name: 'Dispatch', code: 'DISPATCH', icon: <FaTruck />, color: '#ff9800' },
        { name: 'Certificate', code: 'CERTIFICATE', icon: <FaCertificate />, color: '#795548' },
        { name: 'Maintenance / Replacement', code: 'MAINTENANCE_REPLACEMENT', icon: <FaWrench />, color: '#f44336' }
    ];

    useEffect(() => {
        fetchInitialDrones();
    }, []);

    const fetchInitialDrones = async () => {
        try {
            setLoading(true);
            const response = await dronesAPI.getAll();
            const droneList = response.data.data || [];
            setDrones(droneList);
            if (droneList.length > 0) {
                handleDroneSelect(droneList[0]);
            }
        } catch (error) {
            console.error('Error fetching drones:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleDroneSelect = async (drone) => {
        setSelectedDrone(drone);
        try {
            // Fetch documents for the selected drone to show workflow status
            const submissionsRes = await dronesAPI.getDocuments(drone._id);
            const docs = submissionsRes.data.data || submissionsRes.data || [];
            setSubmissions(Array.isArray(docs) ? docs : []);

            // Identify completed steps
            const approvedForms = docs
                .filter(s => s && (
                    s.status === 'approved' || 
                    (s.status === 'submitted' && (s.formSchema?.requiresApproval === false || s.formSchema?.formCode === 'MAINTENANCE_REPLACEMENT'))
                ))
                .map(s => s.formSchema?.formCode);

            const skippedSteps = drone.completedSteps
                ?.filter(step => !docs.some(doc => doc.formSchema?.formCode === step.step))
                .map(s => s.step) || [];

            setCompletedForms([...new Set([...approvedForms, ...skippedSteps])]);
        } catch (error) {
            console.error('Error fetching drone workflow data:', error);
        }
    };

    const getStageStatus = (stageCode) => {
        // PRIORITY: Customer Profile is always available unless completed (same as admin)
        if (stageCode === 'CUSTOMER_PROFILE' && !completedForms.includes('CUSTOMER_PROFILE')) {
            return 'current';
        }

        // If it's in the approved/skipped list, it's completed
        if (completedForms.includes(stageCode)) return 'completed';

        // Check if there's a submission for this stage
        const stageSubmissions = submissions.filter(s => s?.formSchema?.formCode === stageCode);
        if (stageSubmissions.length > 0) {
            // Priority: approved > draft > submitted > rejected
            if (stageSubmissions.some(s => s.status === 'approved')) return 'completed';
            if (stageSubmissions.some(s => s.status === 'draft')) return 'draft';
            if (stageSubmissions.some(s => s.status === 'submitted')) return 'pending';
            if (stageSubmissions.some(s => s.status === 'rejected')) return 'rejected';
        }

        const stageIndex = WORKFLOW_STAGES.findIndex(s => s.code === stageCode);

        // Special logic for Dispatch and Certificate: STRICT preceding submission requirement
        if (stageCode === 'DISPATCH' || stageCode === 'CERTIFICATE') {
            const allPrecedingDone = WORKFLOW_STAGES.slice(0, stageIndex).every(s => {
                if (s.code === 'DELIVERY_CHALLAN') return !!selectedDrone?.deliveryChallan;
                return submissions.some(sub => sub.formSchema?.formCode === s.code && sub.status === 'approved') ||
                    (completedForms.includes(s.code) && (s.code === 'PO' || s.code === 'WORK_ORDER' || s.code === 'ACTIVATION'));
            });
            return allPrecedingDone ? 'current' : 'locked';
        }

        // First stage is always current if not completed
        if (stageIndex === 0) return 'current';

        const qaForms = ['QA_SOLDERING', 'QA_MECHANICAL', 'QA_ELECTRONIC', 'QA_PAYLOAD', 'QA_CALIBRATION'];

        if (qaForms.includes(stageCode)) {
            if (completedForms.includes('MRF')) return 'current';
            return 'locked';
        }

        // It is current ONLY if the immediately preceding stage is completed
        // However, some stages (PO, WORK_ORDER, ACTIVATION) are skippable and don't block
        const exemptStages = ['CUSTOMER_PROFILE', 'PO', 'WORK_ORDER', 'ACTIVATION'];
        
        if (exemptStages.includes(stageCode)) {
            return completedForms.includes(stageCode) ? 'completed' : 'current';
        }

        const prevStages = WORKFLOW_STAGES.slice(0, stageIndex).filter(s => !exemptStages.includes(s.code));
        if (prevStages.length === 0) return 'current';

        const lastRequiredStage = prevStages[prevStages.length - 1];
        
        const isUploadStageCompleted = (code) => {
            if (code === 'DELIVERY_CHALLAN') return !!selectedDrone?.deliveryChallan;
            if (code === 'HASH_CODE') return !!selectedDrone?.hashCode;
            if (code === 'TAX_INVOICE') return !!selectedDrone?.taxInvoice;
            if (code === 'D2_FORM') return !!selectedDrone?.d2Form;
            if (code === 'D3_FORM') return !!selectedDrone?.d3Form;
            return completedForms.includes(code);
        };

        if (isUploadStageCompleted(lastRequiredStage.code)) return 'current';

        return 'locked';
    };

    const calculateProgress = (drone) => {
        if (!drone?.completedSteps || drone.completedSteps.length === 0) return 0;

        // Find the index of the furthest completed step in our predefined workflow
        let furthestIndex = -1;
        drone.completedSteps.forEach(completedStep => {
            const index = WORKFLOW_STAGES.findIndex(s => s.code === completedStep.step);
            if (index > furthestIndex) furthestIndex = index;
        });

        if (furthestIndex === -1) return 0;

        // Calculate percentage based on position in workflow (excluding Customer Profile which is floating)
        const totalSteps = WORKFLOW_STAGES.length;
        const progress = Math.round(((furthestIndex + 1) / totalSteps) * 100);
        return Math.min(progress, 100);
    };

    const getStatusLabel = (drone) => {
        if (drone?.manufacturingStatus === 'delivered') return 'Completed';

        // Find furthest step for label
        let furthestIndex = -1;
        let furthestStep = null;

        if (drone?.completedSteps) {
            drone.completedSteps.forEach(cs => {
                const index = WORKFLOW_STAGES.findIndex(s => s.code === cs.step);
                if (index > furthestIndex) {
                    furthestIndex = index;
                    furthestStep = WORKFLOW_STAGES[index];
                }
            });
        }

        if (furthestStep) return furthestStep.name;

        return drone?.manufacturingStatus?.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase()) || 'Material Entry';
    };

    const getStatusColor = (drone) => {
        if (drone?.manufacturingStatus === 'delivered') return '#CDDC39';

        let furthestIndex = -1;
        let furthestStep = null;

        if (drone?.completedSteps) {
            drone.completedSteps.forEach(cs => {
                const index = WORKFLOW_STAGES.findIndex(s => s.code === cs.step);
                if (index > furthestIndex) {
                    furthestIndex = index;
                    furthestStep = WORKFLOW_STAGES[index];
                }
            });
        }

        if (furthestStep) return furthestStep.color;

        return '#9E9E9E'; // Default gray for initial stage
    };

    const handleViewSubmission = (stageCode) => {
        // 1. Check for specialized activation route
        if (stageCode === 'ACTIVATION') {
            navigate(`/staff/activation/${selectedDrone._id}`);
            return;
        }

        // 2. Check for file upload stages
        if (stageCode === 'DELIVERY_CHALLAN' && selectedDrone.deliveryChallan) {
            window.open(`${FILE_BASE_URL}${selectedDrone.deliveryChallan}`, '_blank');
            return;
        }
        if (stageCode === 'HASH_CODE' && selectedDrone.hashCode) {
            window.open(`${FILE_BASE_URL}${selectedDrone.hashCode}`, '_blank');
            return;
        }
        if (stageCode === 'TAX_INVOICE' && selectedDrone.taxInvoice) {
            window.open(`${FILE_BASE_URL}${selectedDrone.taxInvoice}`, '_blank');
            return;
        }
        if (stageCode === 'D2_FORM' && selectedDrone.d2Form) {
            window.open(`${FILE_BASE_URL}${selectedDrone.d2Form}`, '_blank');
            return;
        }
        if (stageCode === 'D3_FORM' && selectedDrone.d3Form) {
            window.open(`${FILE_BASE_URL}${selectedDrone.d3Form}`, '_blank');
            return;
        }

        // 3. Find submission in state
        const submission = submissions.find(s => s.formSchema?.formCode === stageCode);
        if (submission?._id) {
            navigate(`/submission/${submission._id}`);
        } else {
            console.warn(`No submission found in state for: ${stageCode}`);
            alert(`No detailed form submission found for ${stageCode}. It may have been completed as a skipped step or directly uploaded.`);
        }
    };

    const handleFillForm = (stageCode) => {
        if (!selectedDrone) return;
        if (stageCode === 'ACTIVATION') {
            navigate(`/staff/activation/${selectedDrone._id}`);
            return;
        }
        const serial = selectedDrone.serialNo || selectedDrone.droneId || '';
        const model = selectedDrone.model || selectedDrone.modelNo || 'CS_KRISHI_10L';
        navigate(`/staff/forms/${stageCode}?droneId=${selectedDrone._id}&droneSerial=${serial}&modelNo=${model}`);
    };

    const handleUploadClick = (stageCode) => {
        setUploadingStage(stageCode);
        fileInputRef.current.click();
    };

    const handleFileUpload = async (e) => {
        const file = e.target.files[0];
        if (!file || !uploadingStage || !selectedDrone) return;
        e.target.value = ''; // reset so same file can be re-selected

        const allowedTypes = ['application/pdf', 'image/jpeg', 'image/png', 'image/jpg'];
        if (!allowedTypes.includes(file.type)) {
            alert('Please upload a PDF or an image file.');
            return;
        }

        try {
            setSaving(true);
            if (uploadingStage === 'DELIVERY_CHALLAN') {
                await dronesAPI.uploadDeliveryChallan(selectedDrone._id, file);
            } else if (uploadingStage === 'HASH_CODE') {
                await dronesAPI.uploadHashCode(selectedDrone._id, file);
            } else if (uploadingStage === 'TAX_INVOICE') {
                await dronesAPI.uploadTaxInvoice(selectedDrone._id, file);
            }
            alert('File uploaded successfully!');
            await handleDroneSelect(selectedDrone); // Refresh workflow
        } catch (err) {
            console.error('Upload error:', err);
            alert(`Upload failed: ${err.response?.data?.message || err.message}`);
        } finally {
            setSaving(false);
            setUploadingStage(null);
        }
    };

    const handleSkipStage = async (stageCode) => {
        if (!selectedDrone) return;
        if (!window.confirm(`Skip ${stageCode}?`)) return;
        try {
            await dronesAPI.skipStage(selectedDrone._id, stageCode);
            handleDroneSelect(selectedDrone); // Refresh current drone
        } catch (err) {
            console.error("Error skipping:", err);
        }
    };

    const handleDelete = async (droneId, droneSerial) => {
        const password = window.prompt(`Please enter your password to delete drone ${droneSerial}:`);
        if (!password) return;

        try {
            await dronesAPI.delete(droneId, password);
            fetchInitialDrones();
        } catch (err) {
            alert(err.response?.data?.message || 'Error deleting drone');
        }
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
                    <h1 className="page-title">Manufacturing Workflow</h1>
                    <p className="page-subtitle">Track and manage drone manufacturing process</p>
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
                </div>
            </div>

            {/* Stats - Synced with Admin */}
            <div className="grid grid-cols-4 gap-lg" style={{ marginBottom: '24px' }}>
                <div className="stat-card">
                    <div className="stat-icon" style={{ background: '#eeeeee' }}><DroneIcon size={24} color="#1a237e" /></div>
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

            <div className="grid grid-cols-3 gap-lg">
                {filteredDrones.map(drone => (
                    <div key={drone._id} className="card">
                        <h3>{formatSerialNo(drone.serialNo || drone.droneId)}</h3>
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
                                        background: getStatusColor(drone)
                                    }}
                                />
                            </div>
                        </div>

                        <span style={{
                            fontSize: '12px',
                            color: getStatusColor(drone)
                        }}>
                            {getStatusLabel(drone)}
                        </span>

                        <div style={{ display: 'flex', gap: '8px' }}>
                            <button
                                onClick={() => navigate(`/staff/drones/${drone._id}`)}
                                className="btn btn-outline btn-sm"
                                style={{ flex: 1, marginTop: '12px', display: 'block', textAlign: 'center' }}
                            >
                                View Workflow →
                            </button>
                        </div>
                    </div>
                ))}
                {drones.length === 0 && (
                    <div className="card" style={{ gridColumn: 'span 3', textAlign: 'center', padding: '40px' }}>
                        <p className="text-muted">No drones found in the system.</p>
                    </div>
                )}
            </div>

            {/* Hidden file input for HASH_CODE / DELIVERY_CHALLAN / TAX_INVOICE uploads */}
            <input
                type="file"
                ref={fileInputRef}
                style={{ display: 'none' }}
                accept=".pdf,image/*"
                onChange={handleFileUpload}
            />

            {/* Responsive styles */}
            <style>{`
                .drones-stats-grid {
                    display: grid;
                    grid-template-columns: repeat(3, 1fr);
                    gap: 16px;
                }
                .drones-master-detail {
                    display: grid;
                    grid-template-columns: 350px 1fr;
                    gap: 24px;
                    align-items: start;
                }
                .drones-stage-row {
                    display: flex;
                    align-items: center;
                    margin-bottom: 20px;
                    position: relative;
                    z-index: 2;
                    gap: 8px;
                }
                .drones-stage-info { flex: 1; min-width: 0; }
                .drones-stage-name { font-weight: 600; color: #333; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
                .drones-stage-status { font-size: 12px; color: #999; }
                .drones-stage-action { flex-shrink: 0; }

                @media (max-width: 900px) {
                    .drones-master-detail {
                        grid-template-columns: 1fr;
                    }
                    .drones-stats-grid {
                        grid-template-columns: repeat(3, 1fr);
                    }
                }

                @media (max-width: 600px) {
                    .drones-stats-grid {
                        grid-template-columns: repeat(2, 1fr);
                    }
                    .drones-stage-row {
                        flex-wrap: wrap;
                        margin-bottom: 14px;
                    }
                    .drones-stage-name {
                        font-size: 13px;
                    }
                    .drones-stage-status {
                        font-size: 11px;
                    }
                    .btn.btn-sm, .btn-sm {
                        font-size: 10px !important;
                        padding: 3px 10px !important;
                    }
                }
            `}</style>
        </div>
    );
};

export default StaffDrones;
