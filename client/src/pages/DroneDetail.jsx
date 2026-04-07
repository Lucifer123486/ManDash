import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { dronesAPI, formsAPI, usersAPI, ordersAPI, FILE_BASE_URL } from '../services/api';
import { formatSerialNo } from '../utils/serialFormatter';
import {
    FaBatteryFull, FaSignal, FaMapMarkerAlt, FaThermometerHalf,
    FaTachometerAlt, FaPlane, FaCheckCircle, FaExclamationTriangle,
    FaBox, FaWrench, FaPaperPlane, FaFileInvoice, FaClipboardCheck,
    FaShippingFast, FaIndustry, FaMicrochip,
    FaUser, FaCertificate, FaTruck, FaFingerprint, FaBolt, FaCogs,
    FaCamera, FaBalanceScale, FaClipboardList, FaBoxOpen, FaHourglassHalf, FaFileUpload
} from 'react-icons/fa';

// Simple Error Boundary Component for debugging
class ErrorBoundary extends React.Component {
    constructor(props) {
        super(props);
        this.state = { hasError: false, error: null, errorInfo: null };
    }

    static getDerivedStateFromError(error) {
        return { hasError: true };
    }

    componentDidCatch(error, errorInfo) {
        console.error("Uncaught error:", error, errorInfo);
        this.setState({ error, errorInfo });
    }

    render() {
        if (this.state.hasError) {
            return (
                <div style={{ padding: '20px', background: '#ffebee', color: '#c62828', border: '2px solid #b71c1c' }}>
                    <h1>Something went wrong.</h1>
                    <details style={{ whiteSpace: 'pre-wrap' }}>
                        {this.state.error && this.state.error.toString()}
                        <br />
                        {this.state.errorInfo && this.state.errorInfo.componentStack}
                    </details>
                </div>
            );
        }

        return this.props.children;
    }
}

const DroneDetail = () => {
    const { id } = useParams();
    const navigate = useNavigate();
    const [drone, setDrone] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [submissions, setSubmissions] = useState([]);
    const [allStaff, setAllStaff] = useState([]);
    const [allOrders, setAllOrders] = useState([]); // List of available orders for linking
    const [saving, setSaving] = useState(false);
    const [completedForms, setCompletedForms] = useState([]);
    const [userRole, setUserRole] = useState(null);
    const [egcaId, setEgcaId] = useState('');
    const [egcaPassword, setEgcaPassword] = useState('');
    const [uploadingStage, setUploadingStage] = useState(null);
    const fileInputRef = useRef(null);

    useEffect(() => {
        const user = JSON.parse(localStorage.getItem('user'));
        if (user && user.role) setUserRole(user.role.toLowerCase());
    }, []);

    // Define Workflow Stages - Exact Match to Screenshot & Seed Data
    const WORKFLOW_STAGES = [
        { name: 'Purchase Order', code: 'PO', icon: <FaFileInvoice />, access: 'gs', color: '#4caf50' },
        { name: 'Work Order', code: 'WORK_ORDER', icon: <FaClipboardList />, access: 'gs', color: '#4caf50' },
        { name: 'Material Requisition', code: 'MRF', icon: <FaClipboardList />, access: 'manufacturing', color: '#4caf50' },
        { name: 'Soldering Station', code: 'QA_SOLDERING', icon: <FaIndustry />, access: 'manufacturing', color: '#4caf50' },
        { name: 'Mechanical Station', code: 'QA_MECHANICAL', icon: <FaCogs />, access: 'manufacturing', color: '#4caf50' },
        { name: 'Electrical Station', code: 'QA_ELECTRONIC', icon: <FaBolt />, access: 'manufacturing', color: '#4caf50' },
        { name: 'Payload Station', code: 'QA_PAYLOAD', icon: <FaCamera />, access: 'manufacturing', color: '#4caf50' },
        { name: 'Calibration Station', code: 'QA_CALIBRATION', icon: <FaBalanceScale />, access: 'manufacturing', color: '#4caf50' },
        { name: 'Data/Hash Code', code: 'HASH_CODE', icon: <FaFileUpload />, access: 'manufacturing', color: '#4caf50' },
        { name: 'Activation & Pairing', code: 'ACTIVATION', icon: <FaSignal />, access: 'gs', color: '#4caf50' },
        { name: 'Flight Testing', code: 'FLIGHT_TEST', icon: <FaPlane />, access: 'manufacturing', color: '#2196f3' }, // Blue
        { name: 'UIN Plate', code: 'UIN', icon: <FaFingerprint />, access: 'admin', color: '#9c27b0' },
        { name: 'D2 Form', code: 'D2_FORM', icon: <FaFileUpload />, access: 'admin', color: '#9c27b0' },
        { name: 'UIN Photo', code: 'UIN_PHOTO', icon: <FaCamera />, access: 'admin', color: '#9c27b0' },
        { name: 'D3 Form', code: 'D3_FORM', icon: <FaFileUpload />, access: 'admin', color: '#9c27b0' },
        { name: 'Packaging', code: 'PACKAGING', icon: <FaBoxOpen />, access: 'manufacturing', color: '#4caf50' },
        { name: 'Customer Profile', code: 'CUSTOMER_PROFILE', icon: <FaUser />, access: 'gs', color: '#2196f3' }, // Blue
        { name: 'Delivery Challan', code: 'DELIVERY_CHALLAN', icon: <FaFileInvoice />, access: 'gs', color: '#4caf50' },
        { name: 'Tax Invoice', code: 'TAX_INVOICE', icon: <FaFileInvoice />, access: 'gs', color: '#4caf50' },
        { name: 'Dispatch', code: 'DISPATCH', icon: <FaTruck />, access: 'gs', color: '#ff9800' }, // Orange/Truck
        { name: 'Certificate', code: 'CERTIFICATE', icon: <FaCertificate />, access: 'admin', color: '#795548' }, // Brown
        { name: 'Maintenance / Replacement', code: 'MAINTENANCE_REPLACEMENT', icon: <FaWrench />, access: 'qi', color: '#f44336' }
    ];

    useEffect(() => {
        const fetchDroneData = async () => {
            try {
                setLoading(true);
                const [droneRes, submissionsRes, usersRes, ordersRes] = await Promise.all([
                    dronesAPI.getById(id),
                    dronesAPI.getDocuments(id),
                    usersAPI.getAll(),
                    ordersAPI.getAll({ limit: 100 })
                ]);

                const droneData = droneRes.data.data || droneRes.data;
                setDrone(droneData);
                setEgcaId(droneData.egcaId || '');
                setEgcaPassword(droneData.egcaPassword || '');

                let docs = submissionsRes.data.data || submissionsRes.data || [];
                if (!Array.isArray(docs)) docs = [];
                setSubmissions(docs);

                setAllStaff(usersRes.data.data || usersRes.data || []);

                const ordersData = Array.isArray(ordersRes.data.data) ? ordersRes.data.data : (Array.isArray(ordersRes.data) ? ordersRes.data : []);
                const availableOrders = ordersData.filter(o => {
                    const assignedCount = o.drones?.length || 0;
                    return assignedCount < (o.quantity || 1);
                });
                setAllOrders(availableOrders);

                // Filter valid workflow codes from submissions
                const validStageCodes = WORKFLOW_STAGES.map(s => s.code);

                // Only count APPROVED forms (or submitted forms for shared stages like maintenance)
                const approvedForms = docs
                    .filter(s => s && (
                        s.status === 'approved' || 
                        (s.status === 'submitted' && (s.formSchema?.requiresApproval === false || s.formSchema?.formCode === 'MAINTENANCE_REPLACEMENT'))
                    ) && validStageCodes.includes(s.formSchema?.formCode))
                    .map(s => s.formSchema?.formCode);

                // Steps marked as skipped in backend (completed but no doc)
                const skippedSteps = (droneData.completedSteps || [])
                    .filter(step => !docs.some(doc => doc.formSchema?.formCode === step.step))
                    .map(s => s.step)
                    .filter(code => validStageCodes.includes(code));

                setCompletedForms([...new Set([...approvedForms, ...skippedSteps])]);

                setLoading(false);
            } catch (err) {
                console.error("Error fetching drone data:", err);
                setError(err.response?.data?.message || err.message || "Failed to load drone details.");
                setLoading(false);
            }
        };

        if (id) {
            fetchDroneData();
        }
    }, [id]);



    const handleAssignStaff = async (role, userId) => {
        try {
            setSaving(true);
            let payload = {};
            if (role === 'gs') payload = { assignedGS: userId };
            else if (role === 'qi') payload = { assignedQI: userId };
            else payload = { [role]: userId };

            await dronesAPI.assignStaff(id, payload);
            const droneRes = await dronesAPI.getById(id);
            setDrone(droneRes.data.data || droneRes.data);
            setSaving(false);
        } catch (err) {
            console.error("Error assigning staff:", err);
            alert("Failed to assign staff");
            setSaving(false);
        }
    };

    const handleLinkOrder = async (orderId) => {
        if (!orderId) return;
        if (!window.confirm("Link this drone to the selected order?")) return;
        try {
            setSaving(true);
            console.log("Linking Drone:", id, "to Order:", orderId);
            await dronesAPI.assignOrder(id, orderId);
            const droneRes = await dronesAPI.getById(id);
            setDrone(droneRes.data.data || droneRes.data);
            setSaving(false);
            alert("Order linked successfully!");
        } catch (err) {
            console.error("Error linking order:", err);
            const errMsg = err.response?.data?.message || err.message || "Failed to link order";
            // Construct full URL for debugging
            const baseURL = err.config?.baseURL || '';
            const url = err.config?.url || 'unknown';
            const method = err.config?.method || 'unknown';
            alert(`Failed: ${errMsg} \nTrying to reach: ${method.toUpperCase()} ${baseURL}${url} `);
            setSaving(false);
        }
    };

    const handleUnlinkOrder = async () => {
        if (!window.confirm("Are you sure you want to unlink this order?")) return;
        try {
            setSaving(true);
            await dronesAPI.unassignOrder(id);
            const droneRes = await dronesAPI.getById(id);
            setDrone(droneRes.data.data || droneRes.data);
            setSaving(false);
            alert("Order unlinked successfully!");
        } catch (err) {
            console.error("Error unlinking order:", err);
            const errMsg = err.response?.data?.message || err.message || "Failed to unlink order";
            alert(`Failed: ${errMsg}`);
            setSaving(false);
        }
    };


    const handleSaveEgca = async () => {
        try {
            setSaving(true);
            await dronesAPI.updateEgcaDetails(id, { egcaId, egcaPassword });
            alert("EGCA details saved successfully!");
            setSaving(false);
        } catch (err) {
            console.error("Error saving EGCA details:", err);
            alert("Failed to save EGCA details");
            setSaving(false);
        }
    };


    const handleViewSubmission = (stageCode) => {
        // 1. Check for specialized activation route (usually for staff, but good to have)
        if (stageCode === 'ACTIVATION') {
            navigate(`/staff/activation/${id}`);
            return;
        }

        // 2. Check for upload-only stages (direct file links)
        if (stageCode === 'DELIVERY_CHALLAN' && drone?.deliveryChallan) {
            window.open(`${FILE_BASE_URL}${drone.deliveryChallan}`, '_blank');
            return;
        }
        if (stageCode === 'HASH_CODE' && drone?.hashCode) {
            window.open(`${FILE_BASE_URL}${drone.hashCode}`, '_blank');
            return;
        }
        if (stageCode === 'TAX_INVOICE' && drone?.taxInvoice) {
            window.open(`${FILE_BASE_URL}${drone.taxInvoice}`, '_blank');
            return;
        }
        if (stageCode === 'D2_FORM' && drone?.d2Form) {
            window.open(`${FILE_BASE_URL}${drone.d2Form}`, '_blank');
            return;
        }
        if (stageCode === 'D3_FORM' && drone?.d3Form) {
            window.open(`${FILE_BASE_URL}${drone.d3Form}`, '_blank');
            return;
        }

        // 3. Search in submissions list (for QA forms and other data forms)
        const submission = submissions.find(s => s?.formSchema?.formCode === stageCode);
        if (submission?._id) {
            navigate(`/submission/${submission._id}`);
        } else {
            console.warn(`No submission found for stage: ${stageCode}`);
            alert(`No detailed form submission found for ${stageCode}. It may have been completed as a skipped step or directly uploaded.`);
        }
    };

    const handleFillForm = (stageCode) => {
        if (stageCode === 'ACTIVATION') {
            navigate(`/staff/activation/${id}`);
            return;
        }

        // Pass droneId, serial, and model to auto-fill the form
        const serial = drone.serialNo || drone.droneId || '';
        const model = drone.model || drone.modelNo || 'CS_KRISHI_10L';
        navigate(`/staff/forms/${stageCode}?droneId=${id}&droneSerial=${serial}&modelNo=${model}`);
    };



    const handleSkipStage = async (stageCode) => {
        if (!window.confirm(`Skip ${stageCode}?`)) return;
        try {
            await dronesAPI.skipStage(id, stageCode);
            window.location.reload();
        } catch (err) {
            console.error("Error skipping:", err);
        }
    };

    const handleUploadClick = (stageCode) => {
        setUploadingStage(stageCode);
        fileInputRef.current.click();
    };

    const handleFileUpload = async (e) => {
        const file = e.target.files[0];
        if (!file || !uploadingStage) return;

        // Allow PDF and major image types
        const allowedTypes = ['application/pdf', 'image/jpeg', 'image/png', 'image/jpg'];
        if (!allowedTypes.includes(file.type)) {
            alert('Please upload a PDF or an Image file.');
            return;
        }

        try {
            setSaving(true);
            if (uploadingStage === 'DELIVERY_CHALLAN') {
                await dronesAPI.uploadDeliveryChallan(id, file);
            } else if (uploadingStage === 'HASH_CODE') {
                await dronesAPI.uploadHashCode(id, file);
            } else if (uploadingStage === 'TAX_INVOICE') {
                await dronesAPI.uploadTaxInvoice(id, file);
            } else if (uploadingStage === 'D2_FORM') {
                await dronesAPI.uploadD2Form(id, file);
            } else if (uploadingStage === 'D3_FORM') {
                await dronesAPI.uploadD3Form(id, file);
            }
            window.location.reload();
        } catch (err) {
            console.error('Error uploading:', err);
            const serverMsg = err.response?.data?.message;
            const errorMsg = serverMsg || err.message || `An unknown error occurred during ${uploadingStage} upload`;
            alert(`UPLOAD ERROR: ${errorMsg}`);
            setSaving(false);
        }
    };

    const getStageStatus = (stageCode) => {
        try {
            // PRIORITY: Customer Profile is always available unless completed
            if (stageCode === 'CUSTOMER_PROFILE') {
                return completedForms.includes('CUSTOMER_PROFILE') ? 'completed' : 'current';
            }

        // Skip option forms are always available (or current in flow)
        if (stageCode === 'PO' || stageCode === 'WORK_ORDER' || stageCode === 'ACTIVATION') {
            if (completedForms.includes(stageCode)) return 'completed';
            return 'current';
        }

        // If it's in the approved list, it's definitely completed
        if (completedForms.includes(stageCode)) return 'completed';

        // Check if there's a submission for this stage
        const stageSubmissions = (submissions || []).filter(s => s?.formSchema?.formCode === stageCode);

        if (stageSubmissions.length > 0) {
            // Priority: approved > draft > submitted > rejected
            if (stageSubmissions.some(s => s?.status === 'approved')) return 'completed';
            // Shared forms like maintenance are considered completed once submitted
            if (stageCode === 'MAINTENANCE_REPLACEMENT' && stageSubmissions.some(s => s?.status === 'submitted')) return 'completed';
            
            if (stageSubmissions.some(s => s?.status === 'draft')) return 'draft';
            if (stageSubmissions.some(s => s?.status === 'submitted')) return 'pending';
            if (stageSubmissions.some(s => s?.status === 'rejected')) return 'rejected';
        }

        // Determine if it's the current active stage (next after last completion)
        const stageIndex = WORKFLOW_STAGES.findIndex(s => s.code === stageCode);

        // Special logic for Dispatch and Certificate: STRICT approval requirement
        if (stageCode === 'DISPATCH' || stageCode === 'CERTIFICATE') {
            const allPrecedingActuallyApproved = WORKFLOW_STAGES.slice(0, stageIndex).every(s => {
                // Customer Profile and Skip options don't block
                if (s.code === 'CUSTOMER_PROFILE' || s.code === 'PO' || s.code === 'WORK_ORDER' || s.code === 'ACTIVATION') return true;

                // For Delivery Challan/Tax Invoice/Hash Code, check drone fields
                if (s.code === 'DELIVERY_CHALLAN') return !!drone?.deliveryChallan;
                if (s.code === 'HASH_CODE') return !!drone?.hashCode;
                if (s.code === 'TAX_INVOICE') return !!drone?.taxInvoice;
                if (s.code === 'D2_FORM') return !!drone?.d2Form;
                if (s.code === 'D3_FORM') return !!drone?.d3Form;

                // For others, check approved submissions
                return (completedForms || []).includes(s.code);
            });

            if (allPrecedingActuallyApproved) return 'current';
            return 'locked';
        }

        // First stage (PO) is handled above.
        // For any other stage, check if the previous NON-EXEMPT stage is completed.
        const prevStages = WORKFLOW_STAGES.slice(0, stageIndex).filter(s => s.code !== 'CUSTOMER_PROFILE' && s.code !== 'PO' && s.code !== 'WORK_ORDER' && s.code !== 'ACTIVATION');
        if (prevStages.length === 0) return 'current';

        const qaForms = ['QA_SOLDERING', 'QA_MECHANICAL', 'QA_ELECTRONIC', 'QA_PAYLOAD', 'QA_CALIBRATION'];

        // Special logic for concurrent QA forms after MRF
        if (qaForms.includes(stageCode)) {
            if (completedForms.includes('MRF')) return 'current';
            return 'locked';
        }

        const lastRequiredPrevStage = prevStages[prevStages.length - 1];

        // Check if the preceding stage is a file-upload only stage
        const isUploadStageCompleted = (code) => {
            if (code === 'DELIVERY_CHALLAN') return !!drone?.deliveryChallan;
            if (code === 'HASH_CODE') return !!drone?.hashCode;
            if (code === 'TAX_INVOICE') return !!drone?.taxInvoice;
            if (code === 'D2_FORM') return !!drone?.d2Form;
            if (code === 'D3_FORM') return !!drone?.d3Form;
            return (completedForms || []).includes(code);
        };

        // If the immediate preceding stage is one of the QA forms (e.g. for HASH_CODE),
        // we demand that ALL 5 QA forms are completed before advancing.
        if (qaForms.includes(lastRequiredPrevStage.code)) {
            const allQACompleted = qaForms.every(qa => completedForms.includes(qa));
            if (allQACompleted) return 'current';
            return 'locked';
        }

        // Standard sequential logic for everything else
        if (isUploadStageCompleted(lastRequiredPrevStage.code)) return 'current';

        return 'locked';
        } catch (err) {
            console.error(`[DroneDetail] Error in getStageStatus for ${stageCode}:`, err);
            return 'locked';
        }
    };

    const calculateProgress = () => {
        try {
            if (!completedForms || completedForms.length === 0) return 0;
            // Ensure we don't exceed 100% by counting only valid matches
            const validMatches = completedForms.filter(code => WORKFLOW_STAGES.some(s => s.code === code));
            return Math.min(100, Math.round((validMatches.length / WORKFLOW_STAGES.length) * 100));
        } catch (err) {
            console.error("[DroneDetail] Error in calculateProgress:", err);
            return 0;
        }
    };

    // Force stop loading after 5 seconds (DEBUG ONLY)
    useEffect(() => {
        const timer = setTimeout(() => {
            if (loading) {
                console.error("Force stopping loading state after timeout");
                setLoading(false);
                setError("Timed out waiting for data (15s exceeded)");
            }
        }, 15000);
        return () => clearTimeout(timer);
    }, [loading]);

    // RENDER SAFEGUARDS
    if (loading) {
        return (
            <div style={{ padding: '50px', fontSize: '24px', textAlign: 'center' }}>
                LOADING DATA for ID: {id}... <br />
                <small>Please wait...</small>
            </div>
        );
    }

    if (error) return <div className="error-container" style={{ padding: '50px', color: 'red' }}>Error: {error}</div>;

    // Explicit null check with visible message
    if (!drone) {
        return (
            <div style={{ padding: '50px', textAlign: 'center' }}>
                <h1>Drone data is NULL</h1>
                <p>ID from URL: {id}</p>
            </div>
        );
    }

    // --- RENDER SAFEGUARDS ---

    // 1. Calculate Progress
    const progress = calculateProgress();

    // 2. Safe Assessors for potentially missing data
    const safeOrder = (drone.order && typeof drone.order === 'object') ? drone.order : null;
    const safeComponents = drone.components || {};

    console.log('[DroneDetail] Render:', { id, loading, error, drone });

    return (
        <ErrorBoundary>
            <div className="drone-detail-page">
                <div className="detail-layout">
                    {/* Main Content Area */}
                    <div className="detail-content">
                        {/* Header Row */}
                        <div className="page-header">
                            <button onClick={() => navigate(userRole === 'admin' ? '/admin/drones' : '/staff/drones')} className="btn-back">← Back</button>
                            <div className="header-info">
                                <h1>{formatSerialNo(drone?.droneId || drone?.serialNo)} <span className="model-tag">{formatSerialNo(drone?.model || drone?.modelNo)}</span></h1>
                                <span className="current-stage-tag">{drone?.currentStage || 'Material Entry'}</span>
                            </div>
                            <div className="header-actions">
                                <button
                                    className="btn-download-record"
                                    onClick={() => window.open(`/manufacturing-record/${id}`, '_blank')}
                                    disabled={!completedForms.includes('FLIGHT_TEST')}
                                    title={!completedForms.includes('FLIGHT_TEST') ? "Available after Flight Test" : "Download Manufacturing Record"}
                                >
                                    <FaFileInvoice style={{ marginRight: '8px' }} />
                                    Process Record
                                </button>
                            </div>
                        </div>

                        {/* Dashboard Grid */}
                        <div className="dashboard-grid">

                            {/* 1. Manufacturing Progress (Full Width) */}
                            <div className="dashboard-card progress-card">
                                <div className="card-header">
                                    <h3>Manufacturing Progress</h3>
                                    <span className="progress-value">{progress}%</span>
                                </div>
                                <div className="progress-track">
                                    <div className="progress-fill" style={{ width: `${progress}%` }}></div>
                                </div>
                                <p className="progress-text">{completedForms.length} of {WORKFLOW_STAGES.length} stages completed</p>
                            </div>

                            {/* 2. Middle Row: Order Details + Assigned Staff — Admin & Staff */}
                            {(userRole === 'admin' || userRole === 'staff') && <div className="split-row">
                                <div className="dashboard-card">
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                        <h3>Order Details</h3>
                                        <div style={{ display: 'flex', gap: '8px' }}>
                                            <input 
                                                type="text" 
                                                placeholder="EGCA ID" 
                                                value={egcaId}
                                                onChange={(e) => setEgcaId(e.target.value)}
                                                style={{ padding: '4px 8px', fontSize: '12px', border: '1px solid #ddd', borderRadius: '4px', width: '100px' }}
                                            />
                                            <input 
                                                type="text" 
                                                placeholder="EGCA Pass" 
                                                value={egcaPassword}
                                                onChange={(e) => setEgcaPassword(e.target.value)}
                                                style={{ padding: '4px 8px', fontSize: '12px', border: '1px solid #ddd', borderRadius: '4px', width: '100px' }}
                                            />
                                            <button 
                                                onClick={handleSaveEgca}
                                                disabled={saving}
                                                style={{ padding: '4px 12px', fontSize: '12px', backgroundColor: '#4caf50', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer' }}
                                            >
                                                Save
                                            </button>
                                        </div>
                                    </div>
                                    <div className="card-divider"></div>
                                    <div className="details-list">
                                        {drone?.order && typeof drone.order === 'object' ? (
                                            <>
                                                <div className="detail-row"><label>Work Order</label><span>{drone.order.orderNumber || 'N/A'}</span></div>
                                                <div className="detail-row"><label>Client</label><span>{drone.order.customerName || 'N/A'}</span></div>

                                                <div style={{ marginTop: '10px', borderTop: '1px solid #eee', paddingTop: '10px' }}>
                                                    <label style={{ fontSize: '11px', color: '#999', marginBottom: '4px', display: 'block' }}>Change Order:</label>
                                                    <select
                                                        className="order-select"
                                                        onChange={(e) => handleLinkOrder(e.target.value)}
                                                        defaultValue=""
                                                        disabled={saving}
                                                        style={{ width: '100%', padding: '6px', borderRadius: '4px', border: '1px solid #ddd', fontSize: '12px' }}
                                                    >
                                                        <option value="" disabled>Select New Order...</option>
                                                        {allOrders.map(o => (
                                                            <option key={o._id} value={o._id}>
                                                                {o.orderNumber} - {o.customerName} ({o.drones?.length || 0}/{o.quantity} assigned)
                                                            </option>
                                                        ))}
                                                    </select>

                                                    <button
                                                        onClick={handleUnlinkOrder}
                                                        style={{
                                                            marginTop: '10px',
                                                            backgroundColor: '#ffebee',
                                                            color: '#c62828',
                                                            border: '1px solid #ef9a9a',
                                                            borderRadius: '4px',
                                                            padding: '8px 12px',
                                                            fontSize: '12px',
                                                            fontWeight: '600',
                                                            cursor: 'pointer',
                                                            width: '100%',
                                                            textAlign: 'center',
                                                            transition: 'all 0.2s',
                                                            display: 'flex',
                                                            alignItems: 'center',
                                                            justifyContent: 'center',
                                                            gap: '6px'
                                                        }}
                                                        onMouseOver={(e) => e.target.style.backgroundColor = '#ffcdd2'}
                                                        onMouseOut={(e) => e.target.style.backgroundColor = '#ffebee'}
                                                    >
                                                        <FaExclamationTriangle style={{ fontSize: '10px' }} />
                                                        Unlink Order
                                                    </button>
                                                </div>
                                            </>
                                        ) : (
                                            <div className="link-order-section">
                                                <p className="no-data" style={{ marginBottom: '10px' }}>No order assigned</p>
                                                <label style={{ fontSize: '12px', color: '#666', marginBottom: '5px', display: 'block' }}>Link to Order:</label>
                                                <div style={{ display: 'flex', gap: '10px' }}>
                                                    <select
                                                        className="order-select"
                                                        onChange={(e) => handleLinkOrder(e.target.value)}
                                                        defaultValue=""
                                                        disabled={saving}
                                                        style={{ flex: 1, padding: '8px', borderRadius: '6px', border: '1px solid #ddd' }}
                                                    >
                                                        <option value="" disabled>Select Order...</option>
                                                        {allOrders.map(o => (
                                                            <option key={o._id} value={o._id}>
                                                                {o.orderNumber} - {o.customerName} ({o.drones?.length || 0}/{o.quantity} assigned)
                                                            </option>
                                                        ))}
                                                    </select>
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                </div>

                                <div className="dashboard-card">
                                    <h3>Assigned Staff</h3>
                                    <div className="card-divider"></div>
                                    <div className="staff-form">
                                        <div className="staff-input-group">
                                            <label>General Staff (GS)</label>
                                            <select
                                                value={drone.assignedGS?._id || ''}
                                                onChange={(e) => handleAssignStaff('gs', e.target.value)}
                                                disabled={saving}
                                            >
                                                <option value="">Select Staff</option>
                                                {allStaff.filter(u => u.role === 'staff' || u.role === 'admin' || u.role === 'gs').map(u => (
                                                    <option key={u._id} value={u._id}>{u.name}</option>
                                                ))}
                                            </select>
                                            {drone.assignedGS && <span className="verified-tick">✓ {drone.assignedGS.name}</span>}
                                        </div>
                                        <div className="staff-input-group">
                                            <label>Quality Inspector (QI)</label>
                                            <select
                                                value={drone.assignedQI?._id || ''}
                                                onChange={(e) => handleAssignStaff('qi', e.target.value)}
                                                disabled={saving}
                                            >
                                                <option value="">Select QI</option>
                                                {allStaff.filter(u => u.role === 'qi' || u.role === 'admin').map(u => (
                                                    <option key={u._id} value={u._id}>{u.name}</option>
                                                ))}
                                            </select>
                                            {drone.assignedQI && <span className="verified-tick">✓ {drone.assignedQI.name}</span>}
                                        </div>
                                    </div>
                                </div>
                            </div>}

                            {/* 2b. Read-only order info for staff */}
                            {userRole !== 'admin' && (
                                <div className="dashboard-card">
                                    <h3>Order Details</h3>
                                    <div className="card-divider"></div>
                                    {drone.order && typeof drone.order === 'object' ? (
                                        <div>
                                            <div className="detail-row"><label>Work Order</label><span>{drone.order.orderNumber || 'N/A'}</span></div>
                                            <div className="detail-row"><label>Client</label><span>{drone.order.customerName || 'N/A'}</span></div>
                                        </div>
                                    ) : (
                                        <p className="no-data">No order assigned</p>
                                    )}
                                </div>
                            )}

                            {/* 3. Component Details (Full Width) - Hidden for admins */}
                            {userRole !== 'admin' && (
                                <div className="dashboard-card">
                                    <h3>Component Details</h3>
                                    <div className="card-divider"></div>
                                    <div className="components-grid">
                                        <div className="comp-item"><label>Configuration</label><span>{drone.configuration || 'Standard'}</span></div>
                                        <div className="comp-item"><label>Motors</label><span>{safeComponents.motorType || 'Standard'}</span></div>
                                        <div className="comp-item"><label>Battery</label><span>{safeComponents.batteryType || 'Standard'}</span></div>
                                        <div className="comp-item"><label>Flight Controller</label><span>{safeComponents.flightController || 'Standard'}</span></div>
                                    </div>
                                </div>
                            )}

                        </div>
                    </div>

                    {/* Right Sidebar: Workflow Timeline */}
                    <div className="detail-sidebar">
                        <div className="sidebar-header">
                            <h3>Workflow Stages</h3>
                        </div>
                        <div className="timeline-wrapper">
                            <div className="timeline-track"></div>
                            {WORKFLOW_STAGES.map((stage, index) => {
                                try {
                                    const status = getStageStatus(stage.code);
                                    // FIND BEST SUBMISSION: 
                                    // 1. If rejected, find the rejected one specifically
                                    // 2. Otherwise find approved/submitted
                                    const stageSubmissions = submissions.filter(s => s?.formSchema?.formCode === stage.code);
                                    let submission = stageSubmissions.find(s => s.status === 'rejected') || 
                                                     stageSubmissions.find(s => s.status === 'approved') || 
                                                     stageSubmissions.find(s => s.status === 'submitted') || 
                                                     stageSubmissions[0];

                                return (
                                    <div key={stage.code} className={`timeline-node ${status}`}>
                                        <div className="node-row">
                                            <div className="node-left">
                                                <div
                                                    className="node-marker"
                                                    style={{
                                                        // Color logic: only white if completed WITH submission
                                                        color: (status === 'completed' && submission) ? 'white' :
                                                            status === 'current' ? stage.color :
                                                                status === 'pending' ? '#ff9800' :
                                                                    status === 'completed' ? '#666' : stage.color,

                                                        background: (status === 'completed' && submission) ? '#4caf50' :
                                                            status === 'pending' ? '#fff3e0' : 'white',

                                                        borderColor: status === 'current' ? '#2196f3' :
                                                            status === 'pending' ? '#ff9800' :
                                                                (status === 'completed' && !submission) ? '#ccc' : '#e0e0e0',

                                                        boxShadow: status === 'current' ? '0 0 0 5px white, 0 0 10px rgba(33, 150, 243, 0.2)' : 'none'
                                                    }}
                                                >
                                                    {(status === 'completed' && submission) ? <FaCheckCircle /> :
                                                        status === 'current' ? <div className="pulse-dot" style={{ background: stage.color }}></div> :
                                                            status === 'pending' ? <FaHourglassHalf style={{ fontSize: '14px' }} /> :
                                                                stage.icon
                                                    }
                                                </div>

                                                <span className="node-name">{stage.name}</span>
                                            </div>
                                            <div className="node-action">
                                                {status === 'completed' ? (
                                                    submission ? (
                                                        <button className="btn-action view" onClick={() => handleViewSubmission(stage.code)}>VIEW</button>
                                                    ) : (
                                                        (['PO', 'WORK_ORDER', 'ACTIVATION', 'DELIVERY_CHALLAN', 'HASH_CODE', 'TAX_INVOICE', 'D2_FORM', 'D3_FORM'].includes(stage.code)) ? (
                                                            <div style={{ display: 'flex', gap: '5px' }}>
                                                                {stage.code === 'DELIVERY_CHALLAN' && drone?.deliveryChallan ? (
                                                                    <button className="btn-action view" onClick={() => window.open(`${FILE_BASE_URL}${drone.deliveryChallan}`, '_blank')}>VIEW</button>
                                                                ) : (stage.code === 'HASH_CODE' && drone?.hashCode) ? (
                                                                    <button className="btn-action view" onClick={() => window.open(`${FILE_BASE_URL}${drone.hashCode}`, '_blank')}>VIEW</button>
                                                                ) : (stage.code === 'TAX_INVOICE' && drone?.taxInvoice) ? (
                                                                    <button className="btn-action view" onClick={() => window.open(`${FILE_BASE_URL}${drone.taxInvoice}`, '_blank')}>VIEW</button>
                                                                ) : (stage.code === 'D2_FORM' && drone?.d2Form) ? (
                                                                    <button className="btn-action view" onClick={() => window.open(`${FILE_BASE_URL}${drone.d2Form}`, '_blank')}>VIEW</button>
                                                                ) : (stage.code === 'D3_FORM' && drone?.d3Form) ? (
                                                                    <button className="btn-action view" onClick={() => window.open(`${FILE_BASE_URL}${drone.d3Form}`, '_blank')}>VIEW</button>
                                                                ) : (
                                                                    // It's completed but no file is attached for an upload form (or it's skipped PO/WORK_ORDER/ACTIVATION)
                                                                    (!['DELIVERY_CHALLAN', 'HASH_CODE', 'TAX_INVOICE', 'D2_FORM', 'D3_FORM'].includes(stage.code)) && <button className="btn-action skip" disabled>SKIPPED</button>
                                                                )}
                                                                <button
                                                                    className="btn-action fill"
                                                                    onClick={() => {
                                                                        if (stage.code === 'ACTIVATION') {
                                                                            navigate(`/staff/activation/${id}`);
                                                                        } else if (['DELIVERY_CHALLAN', 'HASH_CODE', 'TAX_INVOICE', 'D2_FORM', 'D3_FORM'].includes(stage.code)) {
                                                                           handleUploadClick(stage.code);
                                                                        } else {
                                                                            handleFillForm(stage.code);
                                                                        }
                                                                    }}
                                                                >
                                                                    {['DELIVERY_CHALLAN', 'HASH_CODE', 'TAX_INVOICE', 'D2_FORM', 'D3_FORM'].includes(stage.code) ?
                                                                        ((drone?.deliveryChallan && stage.code === 'DELIVERY_CHALLAN') ||
                                                                            (drone?.hashCode && stage.code === 'HASH_CODE') ||
                                                                            (drone?.taxInvoice && stage.code === 'TAX_INVOICE') ||
                                                                            (drone?.d2Form && stage.code === 'D2_FORM') ||
                                                                            (drone?.d3Form && stage.code === 'D3_FORM') ? 'UPLOAD AGAIN' : 'UPLOAD') :
                                                                        (stage.code === 'ACTIVATION') ? 'UPDATE' : 'FILL'}
                                                                </button>
                                                            </div>
                                                        ) : (
                                                            /* For all other forms, if marked completed but no submission found, show VIEW */
                                                            <button className="btn-action view" onClick={() => handleViewSubmission(stage.code)}>VIEW</button>
                                                        )
                                                    )
                                                ) : status === 'pending' ? (
                                                    <button className="btn-action fill" onClick={() => handleFillForm(stage.code)} style={{ background: '#FFD600', color: '#000' }}>CONTINUE</button>
                                                ) : status === 'rejected' ? (
                                                    <button className="btn-action fill" style={{ background: '#f44336' }} onClick={() => handleFillForm(stage.code)}>RETRY</button>
                                                ) : status === 'draft' ? (
                                                    <button className="btn-action fill" onClick={() => handleFillForm(stage.code)} style={{ background: '#FFD600', color: '#000' }}>CONTINUE</button>
                                                ) : status === 'current' ? (
                                                    (stage.code === 'PO' || stage.code === 'WORK_ORDER' || stage.code === 'ACTIVATION' || stage.code === 'DELIVERY_CHALLAN' || stage.code === 'HASH_CODE' || stage.code === 'TAX_INVOICE' || stage.code === 'D2_FORM' || stage.code === 'D3_FORM') ? (
                                                        <div style={{ display: 'flex', gap: '5px' }}>
                                                            {(stage.code !== 'DELIVERY_CHALLAN' && stage.code !== 'HASH_CODE' && stage.code !== 'TAX_INVOICE' && stage.code !== 'D2_FORM' && stage.code !== 'D3_FORM') && (
                                                                <button className="btn-action skip" onClick={() => handleSkipStage(stage.code)} style={{ background: '#eeeeee', color: '#666', border: '1px solid #ccc' }}>SKIP</button>
                                                            )}
                                                            {['DELIVERY_CHALLAN', 'HASH_CODE', 'TAX_INVOICE', 'D2_FORM', 'D3_FORM'].includes(stage.code) ? (
                                                                <button className="btn-action fill" onClick={() => handleUploadClick(stage.code)}>UPLOAD</button>
                                                            ) : (
                                                                <button className="btn-action fill" onClick={() => handleFillForm(stage.code)}>FILL</button>
                                                            )}
                                                        </div>
                                                    ) : (
                                                        <button className="btn-action fill" onClick={() => handleFillForm(stage.code)}>FILL</button>
                                                    )
                                                ) : (
                                                    <button className="btn-action view disabled">VIEW</button>
                                                )}
                                            </div>
                                        </div>

                                        {status === 'rejected' && submission?.remarks && (
                                            <div className="rejection-reason-block">
                                                <div className="rejection-header">
                                                    <span>❗</span> Rejection Reason:
                                                </div>
                                                <div className="rejection-text">{submission.remarks}</div>
                                                <button 
                                                    className="btn-refill"
                                                    onClick={() => handleFillForm(stage.code)}
                                                >
                                                    Refill Form →
                                                </button>
                                            </div>
                                        )}
                                    </div>
                                );
                                } catch (err) {
                                    console.error(`[DroneDetail] Error rendering stage ${stage.code}:`, err);
                                    return (
                                        <div key={stage.code} className="timeline-node error" style={{ color: 'red', fontSize: '10px', padding: '10px', border: '1px solid red', borderRadius: '4px', margin: '5px 0' }}>
                                            ⚠️ Error in {stage.name}
                                        </div>
                                    );
                                }
                            })}
                        </div>
                    </div>
                </div>

                <input
                    type="file"
                    ref={fileInputRef}
                    style={{ display: 'none' }}
                    accept=".pdf,image/*"
                    onChange={handleFileUpload}
                />

                <style>{`
                /* Font Import (Optional, relies on project defaults) */
                
                .drone-detail-page {
                    height: 100vh;
                    width: 100%;
                    overflow: hidden;
                    background-color: #f4f7fa;
                    font-family: 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
                }

                .detail-layout {
                    display: flex;
                    height: 100%;
                    width: 100%;
                }

                /* --- Main Content --- */
                .detail-content {
                    flex: 1;
                    padding: 40px;
                    overflow-y: auto;
                    display: flex;
                    flex-direction: column;
                    gap: 30px;
                }

                .page-header {
                    display: flex;
                    align-items: center;
                    justify-content: space-between;
                }

                .btn-back {
                    background: white;
                    border: 1px solid #e1e4e8;
                    padding: 8px 16px;
                    border-radius: 6px;
                    font-weight: 600;
                    color: #555;
                    cursor: pointer;
                    transition: all 0.2s;
                    box-shadow: 0 1px 3px rgba(0,0,0,0.05);
                }
                .btn-back:hover { background: #f8f9fa; }

                .header-info h1 {
                    font-size: 24px;
                    color: #2d3436;
                    margin: 0;
                    display: flex;
                    align-items: center;
                    gap: 10px;
                }

                .model-tag {
                    background: #e3f2fd;
                    color: #1976d2;
                    font-size: 13px;
                    padding: 3px 10px;
                    border-radius: 12px;
                    font-weight: 500;
                }

                .current-stage-tag {
                    font-size: 14px;
                    color: #636e72;
                    font-weight: 500;
                }

                .btn-download-record {
                    background: #2d3436;
                    color: white;
                    border: none;
                    padding: 10px 20px;
                    border-radius: 8px;
                    font-weight: 600;
                    cursor: pointer;
                    display: flex;
                    align-items: center;
                    transition: all 0.2s;
                    box-shadow: 0 2px 5px rgba(0,0,0,0.1);
                }

                .btn-download-record:hover {
                    background: #000;
                    transform: translateY(-1px);
                }

                .btn-download-record:disabled {
                    background: #dfe6e9;
                    color: #b2bec3;
                    cursor: not-allowed;
                    transform: none;
                    box-shadow: none;
                }

                /* --- Dashboard Grid --- */
                .dashboard-grid {
                    display: flex;
                    flex-direction: column;
                    gap: 24px;
                }

                .dashboard-card {
                    background: white;
                    border-radius: 12px;
                    padding: 25px;
                    box-shadow: 0 2px 10px rgba(0,0,0,0.03);
                    border: 1px solid #edf2f7;
                }

                .dashboard-card h3 {
                    margin: 0;
                    font-size: 18px;
                    color: #2d3436;
                    font-weight: 600;
                }

                .card-divider {
                    height: 2px;
                    background: #4caf50;
                    width: 40px;
                    margin: 8px 0 20px 0;
                }

                /* Progress Card */
                .progress-card .card-header {
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                    margin-bottom: 15px;
                }

                .progress-value {
                    font-size: 24px;
                    font-weight: 700;
                    color: #4caf50;
                }

                .progress-track {
                    height: 12px;
                    background: #e0e0e0;
                    border-radius: 6px;
                    overflow: hidden;
                    margin-bottom: 10px;
                }

                .progress-fill {
                    height: 100%;
                    background: #4caf50; /* Solid green matches screenshot */
                    border-radius: 6px;
                    transition: width 0.5s ease;
                }

                .progress-text {
                    font-size: 13px;
                    color: #b2bec3;
                    margin: 0;
                }

                /* Split Row */
                .split-row {
                    display: grid;
                    grid-template-columns: 1fr 1fr;
                    gap: 24px;
                }

                .no-data { color: #b2bec3; font-style: italic; }

                .detail-row {
                    display: flex;
                    flex-direction: column;
                    margin-bottom: 15px;
                }

                .detail-row label, .comp-item label {
                    font-size: 12px;
                    color: #b2bec3;
                    margin-bottom: 4px;
                    font-weight: 500;
                }

                .detail-row span, .comp-item span {
                    font-size: 16px;
                    color: #2d3436;
                    font-weight: 500;
                }

                /* Staff Inputs */
                .staff-form {
                    display: flex;
                    flex-direction: column;
                    gap: 15px;
                }

                .staff-input-group label {
                    font-size: 13px;
                    color: #636e72;
                    font-weight: 600;
                    margin-bottom: 6px;
                    display: block;
                }

                .staff-input-group select {
                    width: 100%;
                    padding: 10px;
                    border: 1px solid #dfe6e9;
                    border-radius: 8px;
                    background: #fff;
                    font-size: 14px;
                    color: #2d3436;
                    outline: none;
                }
                .staff-input-group select:focus { border-color: #4caf50; }

                .verified-tick {
                    display: block;
                    margin-top: 5px;
                    font-size: 12px;
                    color: #4caf50;
                    font-weight: 500;
                }

                /* Components Grid */
                .components-grid {
                    display: grid;
                    grid-template-columns: repeat(4, 1fr);
                    gap: 20px;
                }

                /* --- Sidebar --- */
                .detail-sidebar {
                    width: 350px;
                    background: white;
                    border-left: 1px solid #e1e4e8;
                    display: flex;
                    flex-direction: column;
                    height: 100%;
                    z-index: 50;
                    box-shadow: -4px 0 16px rgba(0,0,0,0.02);
                }

                .sidebar-header {
                    padding: 25px;
                    border-bottom: 1px solid #f0f0f0;
                }
                .sidebar-header h3 {
                    margin: 0;
                    font-size: 16px;
                    color: #2d3436;
                    font-weight: 700;
                }

                .timeline-wrapper {
                    padding: 25px;
                    overflow-y: auto;
                    flex: 1;
                    position: relative;
                    display: flex;
                    flex-direction: column;
                    gap: 0;
                    justify-content: space-between; /* Space them out evenly */
                    min-height: 600px; /* Ensure spacing */
                }

                /* Continuous Line */
                .timeline-track {
                    position: absolute;
                    top: 40px;
                    bottom: 40px;
                    left: 41px; /* 25px padding + 16px (half marker) */
                    width: 2px;
                    background: #e0e0e0;
                    z-index: 0;
                }

                .timeline-node {
                    position: relative;
                    z-index: 1;
                    display: flex;
                    align-items: center;
                    justify-content: space-between;
                    padding: 8px 0;
                }

                .node-left {
                    display: flex;
                    align-items: center;
                    gap: 15px;
                }

                .node-marker {
                    width: 32px;
                    height: 32px;
                    border-radius: 50%;
                    background: #e0e0e0;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    color: white;
                    font-size: 14px;
                    box-shadow: 0 0 0 5px white; /* Mask the line */
                }

                .timeline-node.completed .node-marker {
                    background: #4caf50; /* Green check */
                }

                .timeline-node.current .node-marker {
                    background: #dfe6e9; /* Gray/Actionable */
                    border: 2px solid #2196f3;
                }

                .pulse-dot {
                    width: 10px;
                    height: 10px;
                    background: #2196f3;
                    border-radius: 50%;
                }

                .node-name {
                    font-size: 14px;
                    color: #636e72;
                    font-weight: 500;
                }

                .timeline-node.current .node-name { font-weight: 700; color: #2d3436; }

                /* Action Buttons */
                .btn-action {
                    font-size: 10px;
                    font-weight: 700;
                    padding: 6px 12px;
                    border-radius: 4px;
                    border: none;
                    cursor: pointer;
                    text-transform: uppercase;
                    min-width: 60px;
                }

                .btn-action.view { background: #f1f2f6; color: #b2bec3; }
                .btn-action.view:hover { background: #dfe6e9; color: #636e72; }
                .btn-action.view.disabled { opacity: 0.5; cursor: default; }

                .btn-action.fill { background: #4caf50; color: white; }
                .btn-action.fill:hover { background: #43a047; }
                
                .btn-action.skip { background: #fff3e0; color: #fab1a0; }

                /* Rejection Reason Block */
                .rejection-reason-block {
                    margin-top: 10px;
                    margin-left: 47px;
                    padding: 12px 16px;
                    background: #FFEBEE;
                    border-radius: 8px;
                    border-left: 4px solid #F44336;
                    font-size: 0.9rem;
                    color: #C62828;
                    box-shadow: 0 2px 4px rgba(0,0,0,0.05);
                }

                .rejection-header {
                    font-size: 11px;
                    font-weight: 700;
                    text-transform: uppercase;
                    margin-bottom: 4px;
                    display: flex;
                    align-items: center;
                    gap: 6px;
                }

                .rejection-text {
                    margin-bottom: 8px;
                    line-height: 1.4;
                }

                .btn-refill {
                    background: #F44336;
                    color: #fff;
                    border: none;
                    font-weight: 600;
                    padding: 6px 14px;
                    border-radius: 4px;
                    font-size: 0.75rem;
                    cursor: pointer;
                    transition: all 0.2s;
                }
                .btn-refill:hover {
                    background: #D32F2F;
                    box-shadow: 0 2px 4px rgba(0,0,0,0.1);
                }

                .timeline-node {
                    position: relative;
                    z-index: 1;
                    display: flex;
                    flex-direction: column; /* Changed to allow stacking rejection block */
                    padding: 12px 0;
                }

                .node-row {
                    display: flex;
                    align-items: center;
                    justify-content: space-between;
                    width: 100%;
                }

                /* Loading/Error */
                .loading-container, .error-container {
                    height: 100vh;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    background: #f4f7fa;
                }
                .spinner {
                    width: 40px; height: 40px;
                    border: 4px solid #dfe6e9;
                    border-top-color: #4caf50;
                    border-radius: 50%;
                    animation: spin 1s infinite linear;
                }
                @keyframes spin { 100% { transform: rotate(360deg); } }

                @media (max-width: 1100px) {
                    .split-row { grid-template-columns: 1fr; }
                    .components-grid { grid-template-columns: 1fr 1fr; }
                }

                /* Hiding scrolls */
                ::-webkit-scrollbar { width: 6px; }
                ::-webkit-scrollbar-track { background: transparent; }
                ::-webkit-scrollbar-thumb { background: #ced6e0; border-radius: 3px; }
                ::-webkit-scrollbar-thumb:hover { background: #b2bec3; }

            `}</style>
            </div>
        </ErrorBoundary>
    );
};

export default DroneDetail;