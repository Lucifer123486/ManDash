import { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useReactToPrint } from 'react-to-print';
import { formsAPI } from '../services/api';

const FormSubmissionView = () => {
    const { id } = useParams();
    const navigate = useNavigate();
    const printRef = useRef(null);
    const [submission, setSubmission] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetchSubmission();
    }, [id]);

    const fetchSubmission = async () => {
        try {
            const response = await formsAPI.getSubmissionById(id);
            setSubmission(response.data.data);
        } catch (error) {
            console.error('Error fetching submission:', error);
        } finally {
            setLoading(false);
        }
    };

    const handlePrint = useReactToPrint({
        contentRef: printRef,
        documentTitle: `${submission?.formSchema?.formName || 'Form'}_${submission?.headerData?.serialNo || 'Print'}`,
    });

    if (loading) {
        return (
            <div className="loading-container">
                <div className="loading-spinner"></div>
            </div>
        );
    }

    if (!submission) {
        return (
            <div style={{ textAlign: 'center', padding: '60px' }}>
                <h2>Submission not found</h2>
                <button onClick={() => navigate(-1)} className="btn btn-primary" style={{ marginTop: '20px' }}>
                    Go Back
                </button>
            </div>
        );
    }

    const schema = submission.formSchema;

    // Styles matching original form
    const styles = {
        page: {
            background: '#fff',
            padding: '40px',
            maxWidth: '850px',
            fontFamily: 'Arial, sans-serif',
            fontSize: '11px',
            lineHeight: '1.4'
        },
        header: {
            display: 'flex',
            alignItems: 'center',
            gap: '12px',
            marginBottom: '20px'
        },
        logo: {
            display: 'flex',
            alignItems: 'center',
            gap: '8px'
        },
        logoCircle: {
            width: '45px',
            height: '45px',
            background: '#FFD600',
            borderRadius: '50%',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontWeight: 'bold',
            fontSize: '14px'
        },
        companyName: {
            fontSize: '24px',
            fontWeight: 'bold',
            letterSpacing: '1px'
        },
        subText: {
            fontSize: '10px',
            color: '#666'
        },
        formTitle: {
            textAlign: 'center',
            fontSize: '12px',
            fontWeight: 'bold',
            textTransform: 'uppercase',
            padding: '8px',
            background: '#f0f0f0',
            border: '1px solid #000',
            marginBottom: '0'
        },
        headerTable: {
            width: '100%',
            borderCollapse: 'collapse',
            marginBottom: '15px'
        },
        headerCell: {
            border: '1px solid #000',
            padding: '6px 8px',
            fontSize: '10px'
        },
        mainTable: {
            width: '100%',
            borderCollapse: 'collapse',
            marginBottom: '20px'
        },
        th: {
            border: '1px solid #000',
            padding: '8px',
            background: '#f5f5f5',
            fontWeight: 'bold',
            fontSize: '10px',
            textAlign: 'center'
        },
        td: {
            border: '1px solid #000',
            padding: '6px 8px',
            fontSize: '10px',
            verticalAlign: 'top'
        },
        tdCenter: {
            border: '1px solid #000',
            padding: '6px 8px',
            fontSize: '10px',
            textAlign: 'center',
            verticalAlign: 'middle'
        },
        footer: {
            marginTop: '30px',
            fontSize: '10px'
        },
        signatureRow: {
            display: 'flex',
            justifyContent: 'space-between',
            marginTop: '20px'
        },
        signatureBlock: {
            width: '200px'
        },
        signatureLine: {
            borderBottom: '1px solid #000',
            minHeight: '40px',
            marginBottom: '4px'
        }
    };

    return (
        <div>
            {/* Action Bar - Not printed */}
            <div className="page-header no-print">
                <div>
                    <h1 className="page-title">{schema?.formName}</h1>
                    <p className="page-subtitle">Submission #{submission._id?.slice(-8)}</p>
                </div>
                <div style={{ display: 'flex', gap: '12px' }}>
                    <button onClick={() => navigate(-1)} className="btn btn-outline">
                        ← Back
                    </button>
                    <button onClick={handlePrint} className="btn btn-primary">
                        🖨️ Print / Download PDF
                    </button>
                </div>
            </div>

            {/* Printable Document */}
            <div ref={printRef} style={styles.page}>
                {/* Company Header with Logo */}
                <div style={styles.header}>
                    <div style={styles.logo}>
                        <div style={styles.logoCircle}>
                            <span style={{ color: '#000' }}>C</span>
                            <span style={{ color: '#FFD600', textShadow: '0 0 2px #000' }}>O</span>
                            <span style={{ color: '#000' }}>S</span>
                        </div>
                        <div>
                            <div style={styles.companyName}>CEREBROSPARK INNOVATIONS</div>
                            <div style={styles.subText}>Cerebrospark</div>
                        </div>
                    </div>
                </div>

                {/* Form Title */}
                <div style={styles.formTitle}>
                    {schema?.formName?.toUpperCase()}
                </div>

                {/* Header Data Table */}
                <table style={styles.headerTable}>
                    <tbody>
                        <tr>
                            <td style={{ ...styles.headerCell, width: '15%' }}><strong>Model No:</strong></td>
                            <td style={{ ...styles.headerCell, width: '18%' }}>{submission.headerData?.modelNo || 'CS_KRISHI_10L'}</td>
                            <td style={{ ...styles.headerCell, width: '18%' }}><strong>Version No:</strong></td>
                            <td style={{ ...styles.headerCell, width: '12%' }}>{submission.headerData?.versionNo || '1'}</td>
                            <td style={{ ...styles.headerCell, width: '12%' }}><strong>Date:</strong></td>
                            <td style={{ ...styles.headerCell, width: '15%' }}>{submission.headerData?.date || new Date().toLocaleDateString()}</td>
                        </tr>
                        <tr>
                            <td style={styles.headerCell}><strong>Serial No:</strong></td>
                            <td style={styles.headerCell}>{submission.headerData?.serialNo || 'CSKRISHI___'}</td>
                            <td style={styles.headerCell}><strong>Issue Date:</strong></td>
                            <td style={styles.headerCell}>{submission.headerData?.issueDate || ''}</td>
                            <td style={styles.headerCell}><strong>Issue No:</strong></td>
                            <td style={styles.headerCell}>{submission.headerData?.issueNo || ''}</td>
                        </tr>
                    </tbody>
                </table>

                {/* Main Parameters Table */}
                <table style={styles.mainTable}>
                    <thead>
                        <tr>
                            <th style={{ ...styles.th, width: '50px' }}>SR. NO</th>
                            <th style={styles.th}>PARAMETERS</th>
                            <th style={{ ...styles.th, width: '100px' }}>Approved<br />(YES/ NO)</th>
                            <th style={{ ...styles.th, width: '120px' }}>REMARK</th>
                        </tr>
                    </thead>
                    <tbody>
                        {schema?.sections?.map((section) =>
                            section.fields?.map((field, fIdx) => {
                                // Check if this is a nested field (like Motor 1-6)
                                const isParentField = field.label.includes('1.') || field.label.includes('2.') ||
                                    field.label.includes('3.') || field.label.includes('4.') ||
                                    field.label.includes('5.') || field.label.includes('6.') ||
                                    field.label.includes('7.');

                                // Extract SR number from label if it starts with a number
                                const labelMatch = field.label.match(/^(\d+[a-z]?)\.\s*(.*)/);
                                const srNo = labelMatch ? labelMatch[1] : (fIdx + 1);
                                const paramText = labelMatch ? labelMatch[2] : field.label;

                                return (
                                    <tr key={field.name}>
                                        <td style={styles.tdCenter}>{srNo}</td>
                                        <td style={styles.td}>{paramText}</td>
                                        <td style={styles.tdCenter}>
                                            <strong style={{
                                                color: submission.formData?.[field.name] === 'YES' ? '#000' : '#000'
                                            }}>
                                                {submission.formData?.[field.name] || ''}
                                            </strong>
                                        </td>
                                        <td style={styles.td}>{submission.formData?.[`${field.name}_remark`] || ''}</td>
                                    </tr>
                                );
                            })
                        )}
                    </tbody>
                </table>

                {/* Footer - Verification Section */}
                <div style={styles.footer}>
                    <p><strong>Verified by: -</strong></p>
                    <p><strong>Name:</strong> {submission.footerData?.verifiedBy || submission.footerData?.name || ''}</p>
                    <br />
                    <p><strong>Designation:</strong> {submission.footerData?.designation || ''}</p>
                    <br />
                    <p><strong>Signature:</strong></p>
                    <div style={{ borderBottom: '1px solid #000', width: '200px', minHeight: '40px', marginTop: '5px' }}>
                        {submission.footerData?.signature || ''}
                    </div>
                    <br />
                    <p><strong>Stamp:</strong></p>
                    <div style={{ border: '1px solid #000', width: '150px', height: '80px', marginTop: '5px' }}></div>
                </div>

                {/* Document Metadata - Small print at bottom */}
                <div style={{
                    marginTop: '40px',
                    paddingTop: '10px',
                    borderTop: '1px solid #ccc',
                    fontSize: '8px',
                    color: '#888',
                    display: 'flex',
                    justifyContent: 'space-between'
                }}>
                    <span>Form: {schema?.formCode} | Submitted: {new Date(submission.createdAt).toLocaleString()}</span>
                    <span>By: {submission.submittedBy?.name || 'Staff'} | Cerebrospark Innovations Pvt. Ltd.</span>
                </div>
            </div>
        </div>
    );
};

export default FormSubmissionView;
