import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { formsAPI } from '../../services/api';

const Approvals = () => {
    const [submissions, setSubmissions] = useState([]);
    const [loading, setLoading] = useState(true);
    const [filter, setFilter] = useState('submitted');

    useEffect(() => {
        fetchSubmissions();
    }, [filter]);

    const fetchSubmissions = async () => {
        try {
            const response = await formsAPI.getSubmissions({ status: filter });
            setSubmissions(response.data.data || []);
        } catch (error) {
            console.error('Error fetching submissions:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleApprove = async (id) => {
        console.log('Approving submission:', id);
        try {
            const response = await formsAPI.updateSubmissionStatus(id, 'approved');
            console.log('Approve response:', response);
            fetchSubmissions();
        } catch (error) {
            console.error('Error approving form:', error);
            alert('Error approving form: ' + (error.response?.data?.message || error.message));
        }
    };

    const handleReject = async (id) => {
        const remarks = prompt('Enter rejection reason:');
        if (remarks === null) return;
        console.log('Rejecting submission:', id, 'with remarks:', remarks);
        try {
            const response = await formsAPI.updateSubmissionStatus(id, 'rejected', remarks);
            console.log('Reject response:', response);
            fetchSubmissions();
        } catch (error) {
            console.error('Error rejecting form:', error);
            alert('Error rejecting form: ' + (error.response?.data?.message || error.message));
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

            {/* Filter Tabs */}
            <div style={{ display: 'flex', gap: '8px', marginBottom: '24px' }}>
                {['submitted', 'approved', 'rejected'].map((status) => (
                    <button
                        key={status}
                        onClick={() => setFilter(status)}
                        className={`btn ${filter === status ? 'btn-primary' : 'btn-outline'} btn-sm`}
                        style={{ textTransform: 'capitalize' }}
                    >
                        {status}
                    </button>
                ))}
            </div>

            {/* Submissions List */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                {submissions.map((sub) => (
                    <div key={sub._id} className="card">
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                            <div>
                                <h3 style={{ fontSize: '1.125rem', marginBottom: '4px' }}>
                                    {sub.formSchema?.formName}
                                </h3>
                                <p className="text-sm text-muted">
                                    {sub.formSchema?.formCode} • Submitted on {new Date(sub.createdAt).toLocaleDateString()}
                                </p>
                            </div>
                            <span className={`badge ${sub.status === 'approved' ? 'badge-success' :
                                sub.status === 'rejected' ? 'badge-error' : 'badge-warning'
                                }`}>
                                {sub.status}
                            </span>
                        </div>

                        <div style={{
                            display: 'grid',
                            gridTemplateColumns: 'repeat(4, 1fr)',
                            gap: '16px',
                            margin: '16px 0',
                            padding: '16px',
                            background: '#f9f9f9',
                            borderRadius: '8px'
                        }}>
                            <div>
                                <div className="text-xs text-muted">Drone</div>
                                <div style={{ fontWeight: 500 }}>{sub.drone?.serialNo || 'N/A'}</div>
                            </div>
                            <div>
                                <div className="text-xs text-muted">Model</div>
                                <div style={{ fontWeight: 500 }}>{sub.headerData?.modelNo || 'CS_KRISHI_10L'}</div>
                            </div>
                            <div>
                                <div className="text-xs text-muted">Submitted By</div>
                                <div style={{ fontWeight: 500 }}>{sub.submittedBy?.name || 'Unknown'}</div>
                            </div>
                            <div>
                                <div className="text-xs text-muted">Serial No</div>
                                <div style={{ fontWeight: 500 }}>{sub.headerData?.serialNo || 'N/A'}</div>
                            </div>
                        </div>

                        <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end' }}>
                            <Link to={`/submission/${sub._id}`} className="btn btn-outline btn-sm">
                                View Details
                            </Link>
                            {sub.status === 'submitted' && (
                                <>
                                    <button onClick={() => handleReject(sub._id)} className="btn btn-outline btn-sm" style={{ color: '#F44336', borderColor: '#F44336' }}>
                                        Reject
                                    </button>
                                    <button onClick={() => handleApprove(sub._id)} className="btn btn-success btn-sm">
                                        Approve
                                    </button>
                                </>
                            )}
                        </div>
                    </div>
                ))}
            </div>

            {submissions.length === 0 && (
                <div className="card" style={{ textAlign: 'center', padding: '60px' }}>
                    <p className="text-muted">No {filter} submissions found</p>
                </div>
            )}
        </div>
    );
};

export default Approvals;
