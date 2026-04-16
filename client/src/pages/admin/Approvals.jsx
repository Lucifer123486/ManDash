import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { formsAPI, dronesAPI } from '../../services/api';

const Approvals = () => {
    const [submissions, setSubmissions] = useState([]);
    const [requests, setRequests] = useState([]);
    const [loading, setLoading] = useState(true);
    const [filter, setFilter] = useState('submitted');
    const [view, setView] = useState('submissions'); // 'submissions' or 'access'

    useEffect(() => {
        if (view === 'submissions') {
            fetchSubmissions();
        } else {
            fetchAccessRequests();
        }
    }, [filter, view]);

    const fetchSubmissions = async () => {
        try {
            setLoading(true);
            const res = await formsAPI.getSubmissions({ status: filter });
            setSubmissions(res.data.data || []);
        } catch (err) {
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    const fetchAccessRequests = async () => {
        try {
            setLoading(true);
            const res = await formsAPI.getAccessRequests({ status: filter === 'submitted' ? 'pending' : filter });
            setRequests(res.data.data || []);
        } catch (err) {
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    /* ================= APPROVE ================= */

    const handleApprove = async (submission) => {
        try {
            // 1️⃣ Approve submission
            await formsAPI.updateSubmissionStatus(submission._id, 'approved');

            // 2️⃣ Update drone workflow ONLY if valid
            if (submission.drone && submission.formSchema?.workflowOrder) {
                const droneId = submission.drone._id;

                const workflowMap = {
                    1: 'material_entry',
                    2: 'material_inspection',
                    3: 'inventory_update',
                    4: 'material_distribution',
                    5: 'soldering',
                    6: 'mechanical_assembly',
                    7: 'payload_assembly',
                    8: 'electronic_assembly',
                    9: 'calibration',
                    10: 'flight_test',
                    11: 'packaging',
                    12: 'dispatch',
                    13: 'delivered'
                };

                const nextStatus = workflowMap[submission.formSchema.workflowOrder];

                if (nextStatus) {
                    await dronesAPI.updateStatus(droneId, {
                        manufacturingStatus: nextStatus
                    });
                }
            }

            fetchSubmissions();
        } catch (error) {
            console.error(error);
            alert('Error approving form');
        }
    };

    /* ================= REJECT ================= */

    const handleReject = async (id) => {
        const remarks = prompt('Enter rejection reason:');
        if (!remarks) return;

        try {
            await formsAPI.updateSubmissionStatus(id, 'rejected', remarks);
            fetchSubmissions();
        } catch (error) {
            console.error(error);
            alert('Error rejecting form');
        }
    };

    /* ================= ACCESS REQUESTS ================= */

    const handleApproveAccess = async (id) => {
        try {
            await formsAPI.updateAccessRequest(id, 'approved');
            fetchAccessRequests();
        } catch (error) {
            alert('Error approving access');
        }
    };

    const handleRejectAccess = async (id) => {
        const remarks = prompt('Enter rejection reason:');
        if (!remarks) return;
        try {
            await formsAPI.updateAccessRequest(id, 'rejected', remarks);
            fetchAccessRequests();
        } catch (error) {
            alert('Error rejecting access');
        }
    };

    const handleApproveAll = async () => {
        const pendingIds = requests.filter(r => r.status === 'pending').map(r => r._id);
        if (pendingIds.length === 0) {
            alert('No pending requests to approve');
            return;
        }

        if (window.confirm(`Are you sure you want to approve ALL ${pendingIds.length} pending requests?`)) {
            try {
                await formsAPI.bulkUpdateAccessRequests(pendingIds, 'approved', 'Bulk approved by admin');
                fetchAccessRequests();
                alert('All pending requests approved successfully');
            } catch (err) {
                console.error('Error in bulk approval:', err);
                alert('Error in bulk approval');
            }
        }
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
                    <h1 className="page-title">Pending Approvals</h1>
                    <p className="page-subtitle">Review and approve form submissions</p>
                </div>
            </div>

            {/* VIEW SELECTOR */}
            <div style={{ display: 'flex', gap: '16px', marginBottom: '24px', borderBottom: '1px solid #eee' }}>
                <button
                    onClick={() => { setView('submissions'); setFilter('submitted'); }}
                    style={{
                        padding: '12px 24px',
                        background: 'none',
                        border: 'none',
                        borderBottom: view === 'submissions' ? '2px solid #2196F3' : 'none',
                        color: view === 'submissions' ? '#2196F3' : '#666',
                        fontWeight: 600,
                        cursor: 'pointer'
                    }}
                >
                    Form Submissions
                </button>
                <button
                    onClick={() => { setView('access'); setFilter('submitted'); }}
                    style={{
                        padding: '12px 24px',
                        background: 'none',
                        border: 'none',
                        borderBottom: view === 'access' ? '2px solid #2196F3' : 'none',
                        color: view === 'access' ? '#2196F3' : '#666',
                        fontWeight: 600,
                        cursor: 'pointer'
                    }}
                >
                    Form Access Requests
                </button>
            </div>

            {/* FILTER & ACTIONS */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
                <div style={{ display: 'flex', gap: '8px' }}>
                    {['submitted', 'approved', 'rejected'].map(s => (
                        <button
                            key={s}
                            onClick={() => setFilter(s)}
                            className={`btn ${filter === s ? 'btn-primary' : 'btn-outline'} btn-sm`}
                            style={{ textTransform: 'capitalize' }}
                        >
                            {view === 'access' && s === 'submitted' ? 'Pending' : s}
                        </button>
                    ))}
                </div>

                {view === 'access' && filter === 'submitted' && requests.length > 0 && (
                    <button
                        onClick={handleApproveAll}
                        className="btn btn-success btn-sm"
                    >
                        Approve All Pending
                    </button>
                )}
            </div>

            {/* LIST */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                {view === 'submissions' ? (
                    submissions.map(sub => (
                        <div key={sub._id} className="card">
                            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                                <div>
                                    <h3>{sub.formSchema?.formName}</h3>
                                    <p className="text-sm text-muted">
                                        {sub.formSchema?.formCode} • {new Date(sub.createdAt).toLocaleDateString()}
                                    </p>
                                </div>
                                <span className={`badge ${sub.status === 'approved'
                                    ? 'badge-success'
                                    : sub.status === 'rejected'
                                        ? 'badge-error'
                                        : 'badge-warning'
                                    }`}>
                                    {sub.status}
                                </span>
                            </div>

                            <div style={{
                                display: 'grid',
                                gridTemplateColumns: 'repeat(3, 1fr)',
                                gap: '16px',
                                margin: '16px 0',
                                padding: '16px',
                                background: '#f9f9f9',
                                borderRadius: '8px'
                            }}>
                                <div>
                                    <div className="text-xs text-muted">Drone</div>
                                    <strong>{sub.drone?.serialNo || 'N/A'}</strong>
                                </div>
                                <div>
                                    <div className="text-xs text-muted">Submitted By</div>
                                    <strong>{sub.submittedBy?.name || 'Unknown'}</strong>
                                </div>
                                <div>
                                    <div className="text-xs text-muted">Model</div>
                                    <strong>{sub.headerData?.modelNo || 'CS_KRISHI_10L'}</strong>
                                </div>
                            </div>

                            <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end' }}>
                                <Link to={`/submission/${sub._id}`} className="btn btn-outline btn-sm">
                                    View Details
                                </Link>

                                {sub.status === 'submitted' && (
                                    <>
                                        <button
                                            onClick={() => handleReject(sub._id)}
                                            className="btn btn-outline btn-sm"
                                            style={{ color: '#F44336', borderColor: '#F44336' }}
                                        >
                                            Reject
                                        </button>
                                        <button
                                            onClick={() => handleApprove(sub)}
                                            className="btn btn-success btn-sm"
                                        >
                                            Approve
                                        </button>
                                    </>
                                )}
                            </div>
                        </div>
                    ))
                ) : (
                    requests.map(req => (
                        <div key={req._id} className="card">
                            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                                <div>
                                    <h3>Form Access: {req.formCode}</h3>
                                    <p className="text-sm text-muted">
                                        Requested on {new Date(req.createdAt).toLocaleDateString()}
                                    </p>
                                </div>
                                <span className={`badge ${req.status === 'approved'
                                    ? 'badge-success'
                                    : req.status === 'rejected'
                                        ? 'badge-error'
                                        : 'badge-warning'
                                    }`}>
                                    {req.status === 'pending' ? 'Pending Approval' : req.status}
                                </span>
                            </div>

                            <div style={{
                                display: 'grid',
                                gridTemplateColumns: 'repeat(3, 1fr)',
                                gap: '16px',
                                margin: '16px 0',
                                padding: '16px',
                                background: '#f9f9f9',
                                borderRadius: '8px'
                            }}>
                                <div>
                                    <div className="text-xs text-muted">Staff Member</div>
                                    <strong>{req.staff?.name}</strong>
                                    <div className="text-xs text-muted">{req.staff?.email}</div>
                                </div>
                                <div>
                                    <div className="text-xs text-muted">Drone</div>
                                    <strong>{req.drone?.serialNo}</strong>
                                    <div className="text-xs text-muted">{req.drone?.modelNo}</div>
                                </div>
                                <div>
                                    <div className="text-xs text-muted">Form Code</div>
                                    <strong>{req.formCode}</strong>
                                </div>
                            </div>

                            {req.status === 'pending' && (
                                <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end' }}>
                                    <button
                                        onClick={() => handleRejectAccess(req._id)}
                                        className="btn btn-outline btn-sm"
                                        style={{ color: '#F44336', borderColor: '#F44336' }}
                                    >
                                        Reject Request
                                    </button>
                                    <button
                                        onClick={() => handleApproveAccess(req._id)}
                                        className="btn btn-success btn-sm"
                                    >
                                        Approve Request
                                    </button>
                                </div>
                            )}
                        </div>
                    ))
                )}
            </div>

            {((view === 'submissions' && submissions.length === 0) || (view === 'access' && requests.length === 0)) && (
                <div className="card" style={{ textAlign: 'center', padding: '60px' }}>
                    <p className="text-muted">No {filter === 'submitted' ? 'pending' : filter} items found</p>
                </div>
            )}
        </div>
    );
};

export default Approvals;
