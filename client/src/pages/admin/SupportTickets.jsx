import React, { useState, useEffect } from 'react';
import { ticketsAPI, usersAPI, FILE_BASE_URL } from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import CreateTicketForm from '../../components/CreateTicketForm';
import { useLanguage } from '../../context/LanguageContext';
import { TROUBLESHOOTING_DATA } from '../../data/troubleshootingData';
import DroneIcon from '../../components/common/DroneIcon';

const SlaTimer = ({ startTime, initialBreached }) => {
    const [timeLeft, setTimeLeft] = useState('');
    const [breached, setBreached] = useState(initialBreached);

    useEffect(() => {
        if (!startTime) return;
        const interval = setInterval(() => {
            const now = new Date().getTime();
            const start = new Date(startTime).getTime();
            const fiveMins = 5 * 60 * 1000;

            const targetTime = start + fiveMins;
            const diff = targetTime - now;

            if (diff <= 0) {
                setBreached(true);
                const overdueSeconds = Math.floor(Math.abs(diff) / 1000);
                const mins = Math.floor(overdueSeconds / 60);
                const secs = overdueSeconds % 60;
                setTimeLeft(`- ${mins}m ${secs}s`);
            } else {
                const remainingSeconds = Math.floor(diff / 1000);
                const mins = Math.floor(remainingSeconds / 60);
                const secs = remainingSeconds % 60;
                setTimeLeft(`${mins}m ${secs}s`);
            }
        }, 1000);
        return () => clearInterval(interval);
    }, [startTime]);

    if (!startTime) return null;

    return (
        <div style={{
            background: breached ? '#ffebee' : '#e8f5e9',
            color: breached ? '#c62828' : '#2e7d32',
            padding: '4px 8px',
            borderRadius: '4px',
            fontWeight: 'bold',
            fontSize: '12px',
            display: 'inline-block',
            marginTop: '8px',
            border: `1px solid ${breached ? '#ffcdd2' : '#c8e6c9'}`
        }}>
            ⏱ SLA: {timeLeft} {breached ? '(Breached)' : ''}
        </div>
    );
};

const SupportTickets = () => {
    const { user } = useAuth();
    const { t } = useLanguage();
    const [tickets, setTickets] = useState([]);
    const [loading, setLoading] = useState(true);
    const [resolvingId, setResolvingId] = useState(null);
    const [resolutionNote, setResolutionNote] = useState('');
    const [serviceEngineerRemarks, setServiceEngineerRemarks] = useState('');
    const [geotagPhoto, setGeotagPhoto] = useState('');
    const [customerMedia, setCustomerMedia] = useState('');
    const [allocatedEngineer, setAllocatedEngineer] = useState('');
    const [actionToBeTaken, setActionToBeTaken] = useState('');
    const [loggingCallId, setLoggingCallId] = useState(null);
    const [callLogData, setCallLogData] = useState({ timeContacted: '', duration: '', notes: '' });
    const queryClientId = new URLSearchParams(window.location.search).get('clientId');
    const [isCreating, setIsCreating] = useState(!!queryClientId);
    const [engineers, setEngineers] = useState([]);
    const [assigningId, setAssigningId] = useState(null);
    const [selectedEngineer, setSelectedEngineer] = useState('');
    const [rejectingId, setRejectingId] = useState(null);
    const [rejectionReason, setRejectionReason] = useState('');
    const [filterType, setFilterType] = useState('all');
    const [selectedLog, setSelectedLog] = useState(null);
    const [isFinalReportMode, setIsFinalReportMode] = useState(false);

    const [resolutionFormData, setResolutionFormData] = useState({
        customerEmail: '',
        customerLocation: '',
        dateOfPurchase: '',
        photoVideoReceived: '',
        contactedCustomerAt: '',
        finalResolutionTime: '',
        issueDescription: '',
        issueComponent: [],
        otherIssueComponent: '',
        issueAnswer: '',
        actionToBeTakenOtherReason: '',
        finalResolutionStatus: 'Resolved',
        finalResolutionOtherReason: '',
        droneSerialNumber: ''
    });

    useEffect(() => {
        fetchTickets();
        fetchEngineers();
    }, []);

    const fetchEngineers = async () => {
        try {
            const res = await usersAPI.getAll({ role: 'staff', staffType: 'service_engineer' });
            if (res.data?.data) setEngineers(res.data.data);
        } catch (err) {
            console.error('Error fetching engineers', err);
        }
    };

    const handleOpenLogCall = (ticket, isFinal = false) => {
        setLoggingCallId(ticket._id);
        setIsFinalReportMode(isFinal);
        
        // Helper to format date for input field (YYYY-MM-DD)
        const formatDate = (dateStr) => {
            if (!dateStr) return '';
            try {
                const date = new Date(dateStr);
                return date.toISOString().split('T')[0];
            } catch (err) {
                return '';
            }
        };

        setResolutionFormData(prev => ({
            ...prev,
            customerEmail: ticket.customerEmail || '',
            customerLocation: ticket.customerLocation || '',
            droneSerialNumber: ticket.droneSerialNumber || '',
            dateOfPurchase: formatDate(ticket.dateOfPurchase),
            finalResolutionStatus: isFinal ? 'Resolved' : 'Initial'
        }));
    };

    const handleSaveCallLog = async (isFinal = false) => {
        if (!callLogData.notes) return alert('Description/Notes are required for this interaction.');
        if (isFinal) {
            if (!resolutionFormData.customerEmail || !resolutionFormData.customerLocation || !resolutionFormData.issueDescription) {
                return alert('Please fill in all mandatory final report fields marked with *');
            }
        }

        try {
            setLoading(true);
            const formData = new FormData();
            
            // Basic call log data
            formData.append('timeContacted', callLogData.timeContacted);
            formData.append('duration', callLogData.duration || '');
            formData.append('notes', callLogData.notes);
            formData.append('specialNote', callLogData.specialNote || '');
            if (callLogData.recordingFile) {
                formData.append('callRecording', callLogData.recordingFile);
            }

            // Final report data (send even if not final, for logging)
            formData.append('customerEmail', resolutionFormData.customerEmail);
            formData.append('customerLocation', resolutionFormData.customerLocation);
            formData.append('droneSerialNumber', resolutionFormData.droneSerialNumber);
            formData.append('issueDescription', resolutionFormData.issueDescription);
            formData.append('photoVideoReceived', resolutionFormData.photoVideoReceived);
            formData.append('actionToBeTaken', actionToBeTaken);
            formData.append('actionToBeTakenOtherReason', resolutionFormData.actionToBeTakenOtherReason);
            formData.append('finalResolutionStatus', resolutionFormData.finalResolutionStatus);
            formData.append('finalResolutionOtherReason', resolutionFormData.finalResolutionOtherReason);
            formData.append('finalResolutionTime', resolutionFormData.finalResolutionTime);
            formData.append('serviceEngineerRemarks', serviceEngineerRemarks);
            formData.append('geotagPhoto', geotagPhoto);
            formData.append('contactedCustomerAt', resolutionFormData.contactedCustomerAt);
            formData.append('dateOfPurchase', resolutionFormData.dateOfPurchase);
            
            const components = resolutionFormData.otherIssueComponent?.trim() 
                ? [...resolutionFormData.issueComponent, resolutionFormData.otherIssueComponent.trim()].join(', ')
                : resolutionFormData.issueComponent.join(', ');
            formData.append('issueComponent', components);

            if (isFinal) {
                formData.append('isFinalResolution', 'true');
            }

            await ticketsAPI.addCallLog(loggingCallId, formData);
            
            alert(isFinal ? 'Ticket resolved and interaction logged!' : 'Interaction logged successfully');
            
            setLoggingCallId(null);
            setCallLogData({ timeContacted: '', duration: '', notes: '', specialNote: '', recordingFile: null });
            setResolutionNote('');
            setServiceEngineerRemarks('');
            setGeotagPhoto('');
            setCustomerMedia('');
            setActionToBeTaken('');
            setResolutionFormData({
                customerEmail: '',
                customerLocation: '',
                dateOfPurchase: '',
                photoVideoReceived: '',
                contactedCustomerAt: '',
                finalResolutionTime: '',
                issueDescription: '',
                issueComponent: [],
                otherIssueComponent: '',
                issueAnswer: '',
                actionToBeTakenOtherReason: '',
                finalResolutionStatus: 'Resolved',
                finalResolutionOtherReason: '',
                droneSerialNumber: ''
            });

            fetchTickets();
        } catch (err) {
            alert('Error logging interaction: ' + (err.response?.data?.message || err.message));
        } finally {
            setLoading(false);
        }
    };

    const handleExportExcel = async () => {
        try {
            const res = await ticketsAPI.exportExcel();
            const url = window.URL.createObjectURL(new Blob([res.data]));
            const link = document.createElement('a');
            link.href = url;
            link.setAttribute('download', 'Tickets.xlsx');
            document.body.appendChild(link);
            link.click();
            link.remove();
        } catch (error) {
            console.error('Export failed:', error);
            alert('Failed to export tickets to Excel');
        }
    };

    const fetchTickets = async () => {
        try {
            const res = await ticketsAPI.getAll();
            setTickets(res.data.data); // Adjust based on actual API response structure
            setLoading(false);
        } catch (err) {
            console.error(err);
            setLoading(false);
        }
    };

    const handleStatusUpdate = async (id, status) => {
        if ((status === 'resolved' || status === 'rejected') && !resolutionNote.trim()) {
            alert('Please add a resolution note');
            return;
        }

        try {
            const payload = {
                status,
                resolutionNotes: resolutionNote,
                serviceEngineerRemarks,
                geotagPhoto,
                customerMedia,
                allocatedEngineer,
                actionToBeTaken,
                // New final resolution fields
                customerEmail: resolutionFormData.customerEmail,
                customerLocation: resolutionFormData.customerLocation,
                dateOfPurchase: resolutionFormData.dateOfPurchase,
                photoVideoReceived: resolutionFormData.photoVideoReceived,
                contactedCustomerAt: resolutionFormData.contactedCustomerAt,
                finalResolutionTime: resolutionFormData.finalResolutionTime,
                issueDescription: resolutionFormData.issueDescription,
                actionToBeTakenOtherReason: resolutionFormData.actionToBeTakenOtherReason,
                finalResolutionStatus: resolutionFormData.finalResolutionStatus,
                finalResolutionOtherReason: resolutionFormData.finalResolutionOtherReason,
                issueComponent: resolutionFormData.otherIssueComponent?.trim() 
                    ? [...resolutionFormData.issueComponent, resolutionFormData.otherIssueComponent.trim()].join(', ')
                    : resolutionFormData.issueComponent.join(', '),
                issueQuestion: '',
                issueAnswer: '',
                droneSerialNumber: resolutionFormData.droneSerialNumber
            };

            await ticketsAPI.updateStatus(id, payload);

            alert(`Ticket marked as ${status}`);
            setResolvingId(null);
            setResolutionNote('');
            setServiceEngineerRemarks('');
            setGeotagPhoto('');
            setCustomerMedia('');
            setAllocatedEngineer('');
            setActionToBeTaken('');
            setResolutionFormData({
                customerEmail: '',
                customerLocation: '',
                dateOfPurchase: '',
                photoVideoReceived: '',
                contactedCustomerAt: '',
                finalResolutionTime: '',
                issueDescription: '',
                issueComponent: [],
                otherIssueComponent: '',
                issueAnswer: '',
                actionToBeTakenOtherReason: '',
                finalResolutionStatus: 'Resolved',
                finalResolutionOtherReason: '',
                droneSerialNumber: ''
            });
            fetchTickets();
        } catch (err) {
            alert('Error updating ticket: ' + err.message);
        }
    };

    const handleCallCustomer = async (ticket) => {
        // Automatically set to in_progress when calling
        if (ticket.status === 'initial') {
            try {
                await ticketsAPI.updateStatus(ticket._id, { status: 'in_progress' });
                fetchTickets();
            } catch (err) {
                console.error('Failed to update status to in_process', err);
            }
        }
        window.location.href = `tel:${ticket.customerMobile}`;
    };

    const handleFileChange = async (e) => {
        const file = e.target.files[0];
        if (file) {
            try {
                setLoading(true);
                const res = await ticketsAPI.uploadPhoto(file);
                if (res.data.success) {
                    setGeotagPhoto(res.data.data);
                }
                setLoading(false);
            } catch (err) {
                setLoading(false);
                alert('Error uploading photo: ' + (err.response?.data?.message || err.message));
            }
        }
    };

    const handleAssign = async (id) => {
        if (!selectedEngineer) return alert('Please select an engineer');
        try {
            await ticketsAPI.assign(id, selectedEngineer);
            alert('Ticket assigned successfully!');
            setAssigningId(null);
            setSelectedEngineer('');
            fetchTickets();
        } catch (err) {
            alert('Error assigning ticket: ' + (err.response?.data?.message || err.message));
        }
    };

    const handleRespond = async (id, action) => {
        try {
            if (action === 'reject' && !rejectionReason.trim()) {
                alert('Please provide a reason for rejection.');
                return;
            }
            await ticketsAPI.respond(id, action, action === 'reject' ? rejectionReason : undefined);
            alert(`Ticket ${action}ed successfully!`);
            setRejectingId(null);
            setRejectionReason('');
            fetchTickets();
        } catch (err) {
            alert('Error responding to ticket: ' + (err.response?.data?.message || err.message));
        }
    };

    if (loading) return <div className="loading-container"><div className="loading-spinner"></div></div>;

    const visibleTickets = (user?.staffType === 'service_engineer' && user?.role !== 'admin')
        ? tickets.filter(t => {
            const assignedId = typeof t.assignedTo === 'object' ? t.assignedTo?._id : t.assignedTo;
            return assignedId === user._id;
        })
        : tickets;

    const getTicketPriority = (ticket) => {
        const hasAMC = ticket.client?.hasAMC || ticket.user?.hasAMC;
        const hasASS = ticket.client?.hasASS || ticket.user?.hasASS;
        if (hasAMC && hasASS) return 3;
        if (hasAMC || hasASS) return 2;
        return 1;
    };

    const _unsortedOpen = visibleTickets.filter(t => {
        if (t.status === 'resolved' || t.status === 'rejected') return false;
        
        if (filterType !== 'all') {
            const priority = getTicketPriority(t);
            if (filterType === 'high' && priority !== 3) return false;
            if (filterType === 'medium' && priority !== 2) return false;
            if (filterType === 'standard' && priority !== 1) return false;
        }
        return true;
    });

    const openTickets = _unsortedOpen.sort((a, b) => {
        const priorityA = getTicketPriority(a);
        const priorityB = getTicketPriority(b);
        if (priorityA !== priorityB) {
            return priorityB - priorityA; // Descending (3, 2, 1)
        }
        return new Date(b.createdAt) - new Date(a.createdAt);
    });

    const resolvedTickets = visibleTickets.filter(t => t.status === 'resolved');

    const LogDetailModal = ({ log, onClose }) => {
        if (!log) return null;
        return (
            <div style={{ position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh', background: 'rgba(0,0,0,0.5)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 3000, padding: '20px' }} onClick={onClose}>
                <div style={{ background: 'white', padding: '30px', borderRadius: '16px', maxWidth: '600px', width: '100%', maxHeight: '90vh', overflowY: 'auto', position: 'relative' }} onClick={e => e.stopPropagation()}>
                    <button onClick={onClose} style={{ position: 'absolute', right: '20px', top: '20px', background: 'none', border: 'none', fontSize: '20px', cursor: 'pointer' }}>✕</button>
                    <h3 style={{ margin: '0 0 20px 0', color: '#e65100', borderBottom: '2px solid #ffcc80', paddingBottom: '10px' }}>📄 Interaction Details</h3>
                    
                    <div className="detail-grid" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px' }}>
                        <div className="detail-item"><strong>Time:</strong> {log.timeContacted || 'N/A'}</div>
                        <div className="detail-item"><strong>Duration:</strong> {log.duration || 'N/A'}</div>
                        <div className="detail-item" style={{ gridColumn: 'span 2' }}><strong>Summary/Notes:</strong> {log.notes || 'N/A'}</div>
                        {log.specialNote && <div className="detail-item" style={{ gridColumn: 'span 2', background: '#fff9c4', padding: '8px', borderRadius: '4px' }}><strong>Internal Note:</strong> {log.specialNote}</div>}
                        
                        <div className="detail-item" style={{ gridColumn: 'span 2', marginTop: '10px', borderTop: '1px solid #eee', paddingTop: '10px' }}>
                            <h4 style={{ margin: '0 0 10px 0', fontSize: '14px', color: '#555' }}>Technical Data Captured</h4>
                        </div>
                        
                        <div className="detail-item"><strong>Drone Serial:</strong> {log.droneSerialNumber || 'N/A'}</div>
                        <div className="detail-item"><strong>Location:</strong> {log.customerLocation || 'N/A'}</div>
                        <div className="detail-item" style={{ gridColumn: 'span 2' }}><strong>Affected Component(s):</strong> {log.issueComponent || 'N/A'}</div>
                        <div className="detail-item" style={{ gridColumn: 'span 2' }}><strong>Problem Detail:</strong> {log.issueDescription || 'N/A'}</div>
                        <div className="detail-item"><strong>Action Taken:</strong> {log.actionToBeTaken || 'N/A'}</div>
                        <div className="detail-item"><strong>Resolution Status:</strong> {log.finalResolutionStatus || 'N/A'}</div>
                        
                        {log.callRecording && (
                            <div className="detail-item" style={{ gridColumn: 'span 2', marginTop: '10px' }}>
                                <strong>Recording:</strong><br />
                                <audio controls src={`${FILE_BASE_URL}${log.callRecording}`} style={{ width: '100%', marginTop: '5px' }} />
                            </div>
                        )}
                        {log.geotagPhoto && (
                            <div className="detail-item" style={{ gridColumn: 'span 2', marginTop: '10px' }}>
                                <strong>On-Field Photo:</strong><br />
                                <img src={`${FILE_BASE_URL}${log.geotagPhoto}`} style={{ width: '100%', borderRadius: '8px', marginTop: '5px' }} />
                            </div>
                        )}
                         <div className="detail-item" style={{ gridColumn: 'span 2', fontSize: '12px', color: '#888', textAlign: 'right', marginTop: '20px' }}>
                            Logged At: {new Date(log.loggedAt).toLocaleString()}
                        </div>
                    </div>
                </div>
            </div>
        );
    };

    return (
        <div className="tickets-container">
            <h2 className="page-title">🎫 Support Tickets</h2>

            <div className="tickets-stats">
                <div className="stat-card">
                    <h3>{openTickets.length}</h3>
                    <p>Open Tickets</p>
                </div>
                <div className="stat-card resolved">
                    <h3>{resolvedTickets.length}</h3>
                    <p>Resolved</p>
                </div>
            </div>

            <div className="tickets-list">
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '15px' }}>
                    <h3 style={{ margin: 0 }}>Open Issues</h3>
                    <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
                        {user?.role === 'admin' && (
                            <button 
                                onClick={handleExportExcel} 
                                className="btn btn-sm" 
                                style={{ backgroundColor: '#4CAF50', color: 'white', display: 'flex', alignItems: 'center', gap: '5px' }}
                            >
                                📊 Export to Excel
                            </button>
                        )}
                        <select
                            className="form-input"
                            style={{ padding: '6px', fontSize: '14px', width: 'auto' }}
                            value={filterType}
                            onChange={(e) => setFilterType(e.target.value)}
                        >
                            <option value="all">All Tickets</option>
                            <option value="high">High Priority</option>
                            <option value="medium">Medium Priority</option>
                            <option value="standard">Standard Priority</option>
                        </select>
                    </div>
                </div>
                {openTickets.length === 0 ? <p className="empty-msg">No open tickets.</p> : (
                    openTickets.map(ticket => (
                        <div key={ticket._id} className="ticket-card open">
                            <div className="ticket-header">
                                <span className="ticket-id">
                                    {ticket.ticketNumber || ticket._id.substr(-6).toUpperCase()}
                                    {ticket.serviceCount && <span className="badge-service">Service {ticket.serviceCount}/6</span>}
                                </span>
                                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end' }}>
                                    <span className="ticket-date">{new Date(ticket.createdAt).toLocaleDateString()}</span>
                                    {ticket.problemType && (
                                        <span style={{ fontSize: '13px', fontWeight: 'bold', color: '#666', marginTop: '4px' }}>
                                            {ticket.problemType}
                                        </span>
                                    )}
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '5px', marginTop: '6px' }}>
                                        {(() => {
                                            const p = getTicketPriority(ticket);
                                            const label = p === 3 ? 'High Priority' : (p === 2 ? 'Medium Priority' : 'Standard Priority');
                                            const bg = p === 3 ? '#d32f2f' : (p === 2 ? '#ed6c02' : '#757575');
                                            return (
                                                <span style={{ fontSize: '10px', background: bg, color: 'white', padding: '2px 6px', borderRadius: '10px', fontWeight: 'bold' }}>
                                                    {label}
                                                </span>
                                            );
                                        })()}
                                        {(ticket.client?.hasAMC || ticket.user?.hasAMC) && (
                                            <span style={{ fontSize: '10px', background: '#2196F3', color: 'white', padding: '2px 4px', borderRadius: '3px', fontWeight: 'bold' }}>
                                                AMC
                                            </span>
                                        )}
                                        {(ticket.client?.hasASS || ticket.user?.hasASS) && (
                                            <span style={{ fontSize: '10px', background: '#9C27B0', color: 'white', padding: '2px 4px', borderRadius: '3px', fontWeight: 'bold' }}>
                                                ASS
                                            </span>
                                        )}
                                    </div>
                                </div>
                            </div>
                            <div className="ticket-body">
                                <div className="ticket-user">
                                    <div style={{ fontWeight: 'bold', marginBottom: '4px' }}>
                                        👤 {ticket.customerName || ticket.user?.name}
                                        {ticket.user?.role === 'staff' && (
                                            <span style={{ marginLeft: '8px', background: '#ffebee', color: '#c62828', padding: '2px 6px', borderRadius: '4px', fontSize: '11px' }}>
                                                🛠️ Raised by Staff ({ticket.user?.name})
                                            </span>
                                        )}
                                    </div>
                                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', fontSize: '12px', marginTop: '8px' }}>
                                        {ticket.customerMobile && <div>📱 {ticket.customerMobile}</div>}
                                        {ticket.customerEmail && <div>📧 {ticket.customerEmail}</div>}
                                        {ticket.customerLocation && <div>📍 {ticket.customerLocation}</div>}
                                        {ticket.droneSerialNumber && <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}><DroneIcon size={14} color="#1a73e8" /> Base: {ticket.droneSerialNumber}</div>}
                                        {ticket.dateOfPurchase && <div>📅 DoP: {new Date(ticket.dateOfPurchase).toLocaleDateString()}</div>}
                                        {(() => {
                                            const drones = [];
                                            const source = ticket.client || ticket.user;
                                            if (source?.orders) {
                                                source.orders.forEach(o => {
                                                    if (o.drones) {
                                                        o.drones.forEach(d => {
                                                            if (d.serialNo && !drones.includes(d.serialNo)) {
                                                                drones.push(d.serialNo);
                                                            }
                                                        });
                                                    }
                                                });
                                            }
                                            if (drones.length > 0) {
                                                return (
                                                    <div style={{ gridColumn: '1 / -1', marginTop: '5px', color: '#1a73e8', fontWeight: 'bold' }}>
                                                        🔗 Linked Drones: {drones.join(', ')}
                                                    </div>
                                                );
                                            }
                                            return null;
                                        })()}
                                    </div>
                                </div>

                                <div className="ticket-assignment" style={{ marginTop: '8px', fontSize: '13px' }}>
                                    <strong>Status: </strong>
                                    {ticket.assignedTo ? (
                                        <span style={{ color: '#1b5e20', fontWeight: 'bold' }}>
                                           Assigned to {ticket.assignedTo.name} ({ticket.assignmentStatus})
                                        </span>
                                    ) : (
                                        <span style={{ color: '#666' }}>Unassigned</span>
                                    )}
                                </div>
                                {ticket.status === 'in_progress' && <div className="status-badge in-progress">In Process</div>}
                                {ticket.status === 'initial' && <SlaTimer startTime={ticket.slaStartTime} initialBreached={ticket.slaBreached} />}
                                
                                {ticket.callLogs && ticket.callLogs.length > 0 && (
                                    <div style={{ marginTop: '10px', padding: '10px', background: '#fff8e1', border: '1px dashed #ffc107', borderRadius: '4px' }}>
                                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '5px' }}>
                                            <h5 style={{ margin: 0, fontSize: '12px' }}>Interaction Logs</h5>
                                            <span style={{ fontSize: '10px', color: '#888' }}>Total: {ticket.callLogs.length}</span>
                                        </div>
                                        {ticket.callLogs.map((log, i) => (
                                            <div key={i} style={{ fontSize: '11px', marginBottom: '4px', borderBottom: '1px solid #ffecb3', paddingBottom: '4px', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                                                <div style={{ flex: 1 }}>
                                                    <strong>{log.timeContacted || 'No Time'}</strong> {log.duration ? `(${log.duration})` : ''}: {log.notes}
                                                </div>
                                                <button 
                                                    onClick={() => setSelectedLog(log)} 
                                                    style={{ background: '#ffcc80', border: 'none', borderRadius: '4px', padding: '2px 6px', fontSize: '10px', cursor: 'pointer', marginLeft: '8px', fontWeight: 'bold', color: '#e65100' }}
                                                >
                                                    🔍 Details
                                                </button>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                            <div className="ticket-actions">
                                {ticket.assignedTo?._id === user?._id && ticket.assignmentStatus === 'pending_acceptance' && (
                                    <div className="action-buttons" style={{ marginBottom: '10px' }}>
                                        {rejectingId === ticket._id ? (
                                            <div style={{ display: 'flex', gap: '10px', flexDirection: 'column', width: '100%' }}>
                                                <input
                                                    type="text"
                                                    className="form-input"
                                                    placeholder="Reason for rejection..."
                                                    value={rejectionReason}
                                                    onChange={(e) => setRejectionReason(e.target.value)}
                                                />
                                                <div style={{ display: 'flex', gap: '10px' }}>
                                                    <button onClick={() => handleRespond(ticket._id, 'reject')} className="btn btn-sm btn-danger">Confirm Reject</button>
                                                    <button onClick={() => setRejectingId(null)} className="btn btn-sm btn-text">Cancel</button>
                                                </div>
                                            </div>
                                        ) : (
                                            <>
                                                <button onClick={() => handleRespond(ticket._id, 'accept')} className="btn btn-sm btn-success">Accept Ticket</button>
                                                <button onClick={() => setRejectingId(ticket._id)} className="btn btn-sm btn-danger">Reject Ticket</button>
                                            </>
                                        )}
                                    </div>
                                )}

                                {/* Assignment Actions for Admin/Call Centre Staff */}
                                {(user?.role === 'admin' || user?.staffType === 'call_centre_staff') && (ticket.assignmentStatus === 'unassigned' || ticket.assignmentStatus === 'rejected') && (
                                    <div className="assign-box" style={{ marginBottom: '15px', width: '100%' }}>
                                        {assigningId === ticket._id ? (
                                            <div style={{ display: 'flex', gap: '10px', alignItems: 'center', background: '#f5f5f5', padding: '10px', borderRadius: '4px' }}>
                                                <select
                                                    className="form-input"
                                                    value={selectedEngineer}
                                                    onChange={(e) => setSelectedEngineer(e.target.value)}
                                                    style={{ flex: 1, marginBottom: 0 }}
                                                >
                                                    <option value="">-- Select Engineer --</option>
                                                    {engineers.map(e => <option key={e._id} value={e._id}>{e.name}</option>)}
                                                </select>
                                                <button onClick={() => handleAssign(ticket._id)} className="btn btn-sm btn-primary">Confirm</button>
                                                <button onClick={() => setAssigningId(null)} className="btn btn-sm btn-text">Cancel</button>
                                            </div>
                                        ) : (
                                            <button 
                                                onClick={() => setAssigningId(ticket._id)} 
                                                className="btn btn-sm" 
                                                style={{ 
                                                    backgroundColor: '#424242', 
                                                    color: 'white', 
                                                    padding: '8px 20px', 
                                                    borderRadius: '6px',
                                                    fontWeight: 'bold',
                                                    fontSize: '13px',
                                                    width: 'auto'
                                                }}
                                            >
                                                Assign Engineer
                                            </button>
                                        )}
                                    </div>
                                )}

                                {/* Log Interaction Section */}
                                {ticket.assignmentStatus === 'accepted' && ticket.status !== 'resolved' && (
                                    <div className="action-buttons" style={{ display: 'flex', gap: '8px', flexDirection: 'column', alignItems: 'flex-start', width: '100%' }}>
                                        {loggingCallId === ticket._id ? (
                                            <div className="unified-log-form" style={{ padding: '20px', background: '#fdf3e7', borderRadius: '12px', border: '1px solid #ffcc80', marginTop: '10px', width: '100%', boxSizing: 'border-box' }}>
                                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '15px' }}>
                                                    <h4 style={{ margin: 0, color: '#e65100' }}>📞 Log Interaction & Final Report</h4>
                                                    <button onClick={() => setLoggingCallId(null)} className="btn-close-text">✕</button>
                                                </div>

                                                <div className="grid grid-cols-2 gap-md">
                                                    <div className="form-group" style={{ marginBottom: '10px' }}>
                                                        <label style={{ fontSize: '12px', fontWeight: 'bold' }}>Time Contacted <span style={{ color: 'red' }}>*</span></label>
                                                        <input type="time" className="form-input" value={callLogData.timeContacted} onChange={e => setCallLogData({...callLogData, timeContacted: e.target.value})} />
                                                    </div>
                                                    <div className="form-group" style={{ marginBottom: '10px' }}>
                                                        <label style={{ fontSize: '12px', fontWeight: 'bold' }}>Duration (e.g. 5m)</label>
                                                        <input type="text" className="form-input" value={callLogData.duration} onChange={e => setCallLogData({...callLogData, duration: e.target.value})} />
                                                    </div>
                                                </div>

                                                <div className="form-group" style={{ marginBottom: '10px' }}>
                                                    <label style={{ fontSize: '12px', fontWeight: 'bold' }}>Call Recording (Direct Audio File) <span style={{ color: 'red' }}>*</span></label>
                                                    <input 
                                                        type="file" 
                                                        className="form-input" 
                                                        accept="audio/*" 
                                                        onChange={e => setCallLogData({...callLogData, recordingFile: e.target.files[0]})} 
                                                    />
                                                </div>

                                                <div className="form-group" style={{ marginBottom: '10px' }}>
                                                    <label style={{ fontSize: '12px', fontWeight: 'bold' }}>Description/Notes <span style={{ color: 'red' }}>*</span></label>
                                                    <textarea 
                                                        className="form-input" 
                                                        placeholder="What was discussed?" 
                                                        value={callLogData.notes} 
                                                        onChange={e => setCallLogData({...callLogData, notes: e.target.value})} 
                                                        rows="2" 
                                                    />
                                                </div>

                                                <div className="form-group" style={{ marginBottom: '15px' }}>
                                                    <label style={{ fontSize: '12px', fontWeight: 'bold' }}>Special Note (Internal)</label>
                                                    <input 
                                                        type="text" 
                                                        className="form-input" 
                                                        placeholder="Any internal reminders?" 
                                                        value={callLogData.specialNote} 
                                                        onChange={e => setCallLogData({...callLogData, specialNote: e.target.value})} 
                                                    />
                                                </div>

                                                <div style={{ borderTop: '2px solid #ffcc80', paddingTop: '15px', marginTop: '10px' }}>
                                                    <h5 style={{ margin: '0 0 10px 0', fontSize: '13px', color: '#e65100' }}>📊 Expanded Data / Resolution Fields</h5>
                                                    
                                                    <div className="grid grid-cols-2 gap-md">
                                                        <div className="form-group">
                                                            <label style={{ fontSize: '12px', fontWeight: 'bold' }}>Customer Email <span style={{ color: 'red' }}>*</span></label>
                                                            <input
                                                                type="email"
                                                                className="form-input"
                                                                value={resolutionFormData.customerEmail}
                                                                onChange={e => setResolutionFormData({ ...resolutionFormData, customerEmail: e.target.value })}
                                                            />
                                                        </div>
                                                        <div className="form-group">
                                                            <label style={{ fontSize: '12px', fontWeight: 'bold' }}>Location <span style={{ color: 'red' }}>*</span></label>
                                                            <input
                                                                type="text"
                                                                className="form-input"
                                                                value={resolutionFormData.customerLocation}
                                                                onChange={e => setResolutionFormData({ ...resolutionFormData, customerLocation: e.target.value })}
                                                            />
                                                        </div>
                                                         <div className="form-group">
                                                            <label style={{ fontSize: '12px', fontWeight: 'bold' }}>Drone Serial No <span style={{ color: 'red' }}>*</span></label>
                                                            <input
                                                                type="text"
                                                                className="form-input"
                                                                value={resolutionFormData.droneSerialNumber}
                                                                onChange={e => setResolutionFormData({ ...resolutionFormData, droneSerialNumber: e.target.value })}
                                                            />
                                                        </div>
                                                        <div className="form-group">
                                                            <label style={{ fontSize: '12px', fontWeight: 'bold' }}>Date of Purchase</label>
                                                            <input
                                                                type="date"
                                                                className="form-input"
                                                                value={resolutionFormData.dateOfPurchase}
                                                                onChange={e => setResolutionFormData({ ...resolutionFormData, dateOfPurchase: e.target.value })}
                                                            />
                                                        </div>
                                                    </div>

                                                    <div className="form-group">
                                                        <label style={{ fontSize: '12px', fontWeight: 'bold' }}>Select Component(s) <span style={{ color: 'red' }}>*</span></label>
                                                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', background: '#fff', border: '1px solid #ccc', borderRadius: '4px', padding: '10px', maxHeight: '120px', overflowY: 'auto' }}>
                                                            {TROUBLESHOOTING_DATA.map(c => (
                                                                <label key={c.id} style={{ display: 'flex', alignItems: 'center', gap: '6px', cursor: 'pointer', fontSize: '12px' }}>
                                                                    <input 
                                                                        type="checkbox" 
                                                                        checked={resolutionFormData.issueComponent.includes(c.id)}
                                                                        onChange={(e) => {
                                                                            let newArr = [...resolutionFormData.issueComponent];
                                                                            if (e.target.checked) newArr.push(c.id);
                                                                            else newArr = newArr.filter(id => id !== c.id);
                                                                            setResolutionFormData({ ...resolutionFormData, issueComponent: newArr });
                                                                        }}
                                                                    />
                                                                    {t ? t(c.categoryKey) : c.categoryKey}
                                                                </label>
                                                            ))}
                                                        </div>
                                                    </div>

                                                    <div className="form-group" style={{ marginTop: '10px' }}>
                                                        <label style={{ fontSize: '12px', fontWeight: 'bold' }}>Detailed Problem Description <span style={{ color: 'red' }}>*</span></label>
                                                        <textarea
                                                            className="form-input"
                                                            value={resolutionFormData.issueDescription}
                                                            onChange={e => setResolutionFormData({ ...resolutionFormData, issueDescription: e.target.value })}
                                                            rows="2"
                                                        />
                                                    </div>

                                                    <div className="grid grid-cols-2 gap-md">
                                                        <div className="form-group">
                                                            <label style={{ fontSize: '12px', fontWeight: 'bold' }}>Action To be Taken <span style={{ color: 'red' }}>*</span></label>
                                                            <select className="form-input" value={actionToBeTaken} onChange={e => setActionToBeTaken(e.target.value)}>
                                                                <option value="">-- Select --</option>
                                                                <option value="Solve On Call">Solve On Call</option>
                                                                <option value="Solve On Feild">Solve On Field</option>
                                                                <option value="Service Center">Service Center</option>
                                                                <option value="Send Spare">Send Spare</option>
                                                                <option value="Other">Other</option>
                                                            </select>
                                                        </div>
                                                        <div className="form-group">
                                                            <label style={{ fontSize: '12px', fontWeight: 'bold' }}>Resolution Status <span style={{ color: 'red' }}>*</span></label>
                                                            <select className="form-input" value={resolutionFormData.finalResolutionStatus} onChange={e => setResolutionFormData({ ...resolutionFormData, finalResolutionStatus: e.target.value })}>
                                                                <option value="Initial">Pending</option>
                                                                <option value="Resolved">Resolved</option>
                                                                <option value="Other">Other</option>
                                                            </select>
                                                        </div>
                                                    </div>
                                                </div>

                                                <div style={{ display: 'flex', gap: '10px', marginTop: '20px', borderTop: '2px solid #ffcc80', paddingTop: '15px' }}>
                                                    <button 
                                                        onClick={() => handleSaveCallLog(false)} 
                                                        className="btn btn-primary" 
                                                        style={{ flex: 1, backgroundColor: '#FF9800', border: 'none' }}
                                                        disabled={loading}
                                                    >
                                                        {loading ? 'Logging...' : '💾 Log Interaction'}
                                                    </button>
                                                    <button 
                                                        onClick={() => handleSaveCallLog(true)} 
                                                        className="btn btn-success" 
                                                        style={{ flex: 1 }}
                                                        disabled={loading}
                                                    >
                                                        {loading ? 'Submitting...' : '✅ Final Submission'}
                                                    </button>
                                                </div>
                                            </div>
                                        ) : (
                                                <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                                                    {ticket.customerMobile && (
                                                        <button
                                                            onClick={() => handleCallCustomer(ticket)}
                                                            className="btn btn-sm"
                                                            style={{ backgroundColor: '#2196F3', color: 'white', display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '5px', padding: '8px 16px' }}
                                                        >
                                                            📞 Call Client
                                                        </button>
                                                    )}
                                                    <button onClick={() => handleOpenLogCall(ticket, false)} className="btn btn-sm" style={{ backgroundColor: '#FF9800', color: 'white', padding: '8px 16px' }}>📝 Log Interaction</button>
                                                    <button onClick={() => handleOpenLogCall(ticket, true)} className="btn btn-sm" style={{ backgroundColor: '#4caf50', color: 'white', padding: '8px 16px', fontWeight: 'bold' }}>✅ Final Report</button>
                                                </div>
                                        )}
                                    </div>
                                )}
                            </div>
                        </div>
                    ))
                )}

                <h3 style={{ marginTop: '40px' }}>History</h3>
                {resolvedTickets.concat(tickets.filter(t => t.status === 'rejected')).map(ticket => (
                    <div key={ticket._id} className={`ticket-card ${ticket.status === 'rejected' ? 'rejected-item' : 'resolved-item'}`}>
                        <div className="ticket-header">
                            <span className="ticket-id">
                                {ticket.ticketNumber}
                                {ticket.serviceCount && <span className="badge-service">Service {ticket.serviceCount}/6</span>}
                            </span>
                            <span className={`badge-${ticket.status}`}>
                                {ticket.status === 'rejected' ? '✕ Rejected' : '✓ Resolved'}
                            </span>
                        </div>
                        <div className="ticket-body">
                            <h4>{ticket.category}</h4>
                            <div className="ticket-user" style={{ display: 'inline-block', marginBottom: '8px' }}>
                                <div style={{ fontWeight: 'bold' }}>
                                    👤 {ticket.customerName || ticket.user?.name}
                                    {ticket.user?.role === 'staff' && (
                                        <span style={{ marginLeft: '8px', background: '#ffebee', color: '#c62828', padding: '2px 6px', borderRadius: '4px', fontSize: '11px' }}>
                                            🛠️ Raised by Staff ({ticket.user?.name})
                                        </span>
                                    )}
                                </div>
                            </div>
                            <p className="desc">{ticket.issueDescription || ticket.problemDescription}</p>
                            <div className="resolution-info">
                                <strong>Status Note:</strong> {ticket.resolutionNotes}
                                {ticket.finalResolutionStatus && (
                                    <span> (Final Resolution: {ticket.finalResolutionStatus}{ticket.finalResolutionStatus === 'Other' ? ` - ${ticket.finalResolutionOtherReason}` : ''})</span>
                                )}
                                {ticket.issueComponent && (
                                    <div style={{ marginTop: '8px', padding: '8px', background: '#fff', borderRadius: '4px', border: '1px solid #c8e6c9' }}>
                                        <strong>Reported Component(s):</strong> {ticket.issueComponent.split(',').map(id => {
                                            const trimmedId = id.trim();
                                            const found = TROUBLESHOOTING_DATA.find(c => c.id === trimmedId);
                                            return found ? (t ? t(found.categoryKey) : found.categoryKey) : trimmedId;
                                        }).join(', ')}<br />
                                    </div>
                                )}
                                {ticket.serviceEngineerRemarks && <div style={{ marginTop: '8px' }}><strong>SE Remarks:</strong> {ticket.serviceEngineerRemarks}</div>}
                                {ticket.actionToBeTaken && <div><strong>Action Taken:</strong> {ticket.actionToBeTaken}{ticket.actionToBeTaken === 'Other' ? ` - ${ticket.actionToBeTakenOtherReason}` : ''}</div>}
                                {ticket.allocatedEngineer && <div><strong>Allocated Engineer:</strong> {engineers.find(e => e._id === (typeof ticket.allocatedEngineer === 'object' ? ticket.allocatedEngineer._id : ticket.allocatedEngineer))?.name || ticket.allocatedEngineer}</div>}
                                {(ticket.customerMedia || ticket.geotagPhoto) && (
                                    <div style={{ display: 'flex', gap: '8px', marginTop: '10px', flexWrap: 'wrap' }}>
                                        {ticket.customerMedia && (
                                            <button 
                                                onClick={() => window.open(`${FILE_BASE_URL}${ticket.customerMedia}`, '_blank')} 
                                                className="btn btn-sm" 
                                                style={{ backgroundColor: '#2196F3', color: 'white', flex: 1, padding: '6px 12px', fontSize: '12px', fontWeight: 'bold', minWidth: '150px' }}
                                            >
                                                View Received Media
                                            </button>
                                        )}
                                        {ticket.geotagPhoto && (
                                            <button
                                                onClick={() => window.open(`${FILE_BASE_URL}${ticket.geotagPhoto}`, '_blank')}
                                                className="btn btn-sm"
                                                style={{ backgroundColor: '#FF9800', color: 'white', flex: 1, padding: '6px 12px', fontSize: '12px', fontWeight: 'bold', minWidth: '150px' }}
                                            >
                                                View On-Field Photo
                                            </button>
                                        )}
                                    </div>
                                )}
                                {ticket.callLogs && ticket.callLogs.length > 0 && (
                                    <div style={{ marginTop: '10px', padding: '10px', background: '#fff8e1', border: '1px dashed #ffc107', borderRadius: '4px' }}>
                                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '5px' }}>
                                            <h5 style={{ margin: 0, fontSize: '12px' }}>Interaction Logs</h5>
                                            <span style={{ fontSize: '10px', color: '#888' }}>Total: {ticket.callLogs.length}</span>
                                        </div>
                                        {ticket.callLogs.map((log, i) => (
                                            <div key={i} style={{ fontSize: '11px', marginBottom: '4px', borderBottom: '1px solid #ffecb3', paddingBottom: '4px', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                                                <div style={{ flex: 1 }}>
                                                    <strong>{log.timeContacted || 'No Time'}</strong> {log.duration ? `(${log.duration})` : ''}: {log.notes}
                                                </div>
                                                <button 
                                                    onClick={() => setSelectedLog(log)} 
                                                    style={{ background: '#ffcc80', border: 'none', borderRadius: '4px', padding: '2px 6px', fontSize: '10px', cursor: 'pointer', marginLeft: '8px', fontWeight: 'bold', color: '#e65100' }}
                                                >
                                                    🔍 Details
                                                </button>
                                            </div>
                                        ))}
                                    </div>
                                )}
                                <div className="meta">By {ticket.resolvedBy?.name} on {new Date(ticket.resolvedAt).toLocaleDateString()}</div>
                                {ticket.slaBreached && <div style={{ color: '#d32f2f', fontWeight: 'bold', fontSize: '11px', marginTop: '5px' }}>⚠️ SLA Breached (Response &gt; 5 mins)</div>}
                            </div>
                        </div>
                    </div>
                ))}
            </div>

            {
                isCreating && (
                    <CreateTicketForm
                        clientId={queryClientId}
                        onClose={() => {
                            setIsCreating(false);
                            if (queryClientId) {
                                // clear query param
                                window.history.replaceState({}, '', window.location.pathname);
                            }
                        }}
                        onSuccess={() => {
                            setIsCreating(false);
                            if (queryClientId) {
                                window.history.replaceState({}, '', window.location.pathname);
                            }
                            fetchTickets();
                        }}
                    />
                )
            }

            <style>{`
                .tickets-container {
                    padding: 20px;
                    max-width: 1000px;
                }
                .tickets-stats {
                    display: flex;
                    gap: 20px;
                    margin-bottom: 30px;
                }
                .stat-card {
                    background: white;
                    padding: 20px;
                    border-radius: 12px;
                    flex: 1;
                    box-shadow: 0 2px 8px rgba(0,0,0,0.05);
                    text-align: center;
                    border-bottom: 4px solid #f44336;
                }
                .stat-card.resolved {
                    border-bottom-color: #4caf50;
                }
                .stat-card.sell-form {
                    border-bottom-color: #9c27b0;
                    transition: transform 0.2s, background-color 0.2s;
                }
                .stat-card.sell-form:hover {
                    transform: translateY(-5px);
                    background-color: #f3e5f5;
                }
                .stat-card h3 {
                    font-size: 32px;
                    margin: 0;
                    color: #333;
                }
                .ticket-card {
                    background: white;
                    border-radius: 12px;
                    padding: 20px;
                    margin-bottom: 15px;
                    box-shadow: 0 2px 8px rgba(0,0,0,0.05);
                    border: 1px solid #eee;
                }
                .ticket-card.open {
                    border-left: 5px solid #f44336;
                }
                .ticket-card.resolved-item {
                    border-left: 5px solid #4caf50;
                    opacity: 0.8;
                }
                .ticket-header {
                    display: flex;
                    justify-content: space-between;
                    margin-bottom: 10px;
                    font-size: 14px;
                    color: #666;
                }
                .ticket-body h4 {
                    margin: 0 0 8px 0;
                    color: #333;
                }
                .ticket-user {
                    margin-top: 10px;
                    font-size: 13px;
                    font-weight: 500;
                    color: #555;
                    background: #f5f5f5;
                    display: inline-block;
                    padding: 4px 8px;
                    border-radius: 4px;
                }
                .ticket-actions {
                    margin-top: 15px;
                    border-top: 1px solid #eee;
                    padding-top: 15px;
                }
                .resolve-box {
                    display: flex;
                    gap: 10px;
                }
                .resolution-info {
                    margin-top: 10px;
                    background: #e8f5e9;
                    padding: 10px;
                    border-radius: 6px;
                    font-size: 14px;
                    color: #2e7d32;
                }
                .resolution-info .meta {
                    font-size: 12px;
                    margin-top: 4px;
                    opacity: 0.8;
                }
                .badge-resolved {
                    background: #4caf50;
                    color: white;
                    padding: 2px 8px;
                    border-radius: 4px;
                    font-size: 12px;
                }
                .badge-rejected {
                    background: #f44336;
                    color: white;
                    padding: 2px 8px;
                    border-radius: 4px;
                    font-size: 12px;
                }
                .badge-service {
                    background: #2196f3;
                    color: white;
                    padding: 2px 6px;
                    border-radius: 4px;
                    font-size: 11px;
                    margin-left: 8px;
                }
                .action-buttons {
                    display: flex;
                    gap: 10px;
                }
                .status-badge.in-progress {
                    display: inline-block;
                    background: #ff9800;
                    color: white;
                    padding: 2px 8px;
                    border-radius: 12px;
                    font-size: 12px;
                    margin-top: 5px;
                }
                .ticket-card.rejected-item {
                    border-left: 5px solid #d32f2f;
                    opacity: 0.8;
                }
            `}</style>
            {selectedLog && <LogDetailModal log={selectedLog} onClose={() => setSelectedLog(null)} />}
        </div >
    );
};

export default SupportTickets;
