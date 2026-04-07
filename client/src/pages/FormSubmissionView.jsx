import { useState, useEffect, useRef, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useReactToPrint } from 'react-to-print';
import { formsAPI } from '../services/api';
import { formatSerialNo } from '../utils/serialFormatter';
import ProcurementListImages from '../components/ProcurementListImages';
import FormHeader from '../components/common/FormHeader';
import CompanyLogo from '../components/common/CompanyLogo';

const FormSubmissionView = () => {
    const { id } = useParams();
    const navigate = useNavigate();
    const printRef = useRef(null);
    const [submission, setSubmission] = useState(null);
    const [loading, setLoading] = useState(true);
    const [dispatchEndDate, setDispatchEndDate] = useState(null);
    const [renderError, setRenderError] = useState(null);

    const fetchSubmission = useCallback(async () => {
        setLoading(true);
        console.log('[FormSubmissionView] START fetchSubmission for ID:', id);
        try {
            const response = await formsAPI.getSubmissionById(id);
            console.log('[FormSubmissionView] API Response:', response);
            const sub = response?.data?.data || response?.data;
            if (!sub) {
                console.error('[FormSubmissionView] No submission data found in response');
                setLoading(false);
                return;
            }
            setSubmission(sub);
            console.log('[FormSubmissionView] Submission state set:', sub);

            // Fetch dispatch date for CERTIFICATE if needed
            if (sub?.formSchema?.formCode === 'CERTIFICATE' && sub?.drone?._id) {
                try {
                    const allSubs = await formsAPI.getDroneSubmissions(sub.drone._id);
                    const droneSubmissions = allSubs?.data?.data || allSubs?.data || [];
                    const dispatchSub = droneSubmissions
                        .filter(s => s?.formSchema?.formCode === 'DISPATCH' && s?.status !== 'draft')
                        .sort((a, b) => new Date(b?.submittedAt || b?.updatedAt || b?.createdAt) - new Date(a?.submittedAt || a?.updatedAt || a?.createdAt))[0];
                    if (dispatchSub) {
                        const endTs = dispatchSub.submittedAt || dispatchSub.updatedAt || dispatchSub.createdAt;
                        setDispatchEndDate(new Date(endTs).toLocaleDateString());
                    }
                } catch (e) {
                    console.warn('[FormSubmissionView] Could not fetch dispatch date:', e);
                }
            }
        } catch (error) {
            console.error('[FormSubmissionView] fetchSubmission FATAL ERROR:', error);
        } finally {
            setLoading(false);
            console.log('[FormSubmissionView] END fetchSubmission');
        }
    }, [id]);

    useEffect(() => {
        fetchSubmission();
    }, [fetchSubmission]);

    const handlePrint = useReactToPrint({
        contentRef: printRef,
        documentTitle: `${submission?.formSchema?.formName || 'Form'}_${formatSerialNo(submission?.headerData?.serialNo) || 'Print'}`,
    });

    if (loading) {
        return (
            <div className="loading-container" style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '200px' }}>
                <div className="loading-spinner"></div>
                <div style={{ marginLeft: '10px' }}>Loading Submission...</div>
            </div>
        );
    }

    if (renderError) {
        return (
            <div style={{ color: 'red', padding: '20px', border: '1px solid red', margin: '20px', borderRadius: '8px', background: '#fff' }}>
                <h3>Critical Render Error</h3>
                <p>{renderError.message}</p>
                <pre style={{ fontSize: '10px', overflow: 'auto' }}>{renderError.stack}</pre>
                <button onClick={() => window.location.reload()} className="btn btn-primary">Retry</button>
            </div>
        );
    }

    if (!submission) {
        return (
            <div style={{ textAlign: 'center', padding: '60px' }}>
                <h2>Submission Data Missing</h2>
                <p>We couldn't retrieve the details for this submission ID: {id}</p>
                <button onClick={() => navigate(-1)} className="btn btn-primary" style={{ marginTop: '20px' }}>
                    Go Back
                </button>
            </div>
        );
    }

    const schema = submission?.formSchema;
    const isQAForm = ['QA_SOLDERING', 'QA_MECHANICAL', 'QA_ELECTRONIC', 'QA_PAYLOAD', 'QA_CALIBRATION'].includes(schema?.formCode);
    const isCalibration = schema?.formCode === 'QA_CALIBRATION';
    const allFields = schema?.sections?.flatMap(s => s?.fields || []) || [];

    const styles = {
        page: {
            background: '#fff',
            padding: '20px 40px', // Standardized padding for better look
            width: '210mm', // Fixed A4 width
            minHeight: '297mm', // Fixed A4 height
            margin: '20px auto', // Center and add breathing room on screen
            fontFamily: 'Arial, sans-serif',
            fontSize: '11px',
            lineHeight: '1.2',
            boxSizing: 'border-box',
            boxShadow: '0 0 20px rgba(0,0,0,0.1)', // Premium document look
            border: '1px solid #eee',
            position: 'relative'
        },
        compactTh: { border: '1px solid #000', padding: '6px', background: '#f5f5f5', fontWeight: 'bold', fontSize: '10px', textAlign: 'center' },
        compactTd: { border: '1px solid #000', padding: '6px 4px', fontSize: '8.5px', verticalAlign: 'middle', lineHeight: '1.4' },
        compactTdCenter: { border: '1px solid #000', padding: '6px 4px', fontSize: '8.5px', textAlign: 'center', verticalAlign: 'middle', lineHeight: '1.4' },
        mainTable: { width: '100%', borderCollapse: 'collapse', marginBottom: '4px' },
        th: { border: '1px solid #000', padding: '8px', background: '#f5f5f5', fontWeight: 'bold', fontSize: '10px', textAlign: 'center' },
        td: { border: '1px solid #000', padding: '6px 8px', fontSize: '10px', verticalAlign: 'top' },
        tdCenter: { border: '1px solid #000', padding: '6px 8px', fontSize: '10px', textAlign: 'center', verticalAlign: 'middle' },
        footer: { marginTop: '8px', fontSize: '10px' },
        printButton: { padding: '8px 16px', background: '#007bff', color: '#fff', border: 'none', borderRadius: '4px', cursor: 'pointer' }
    };

    // Diagnostic log
    console.log('[FormSubmissionView] Rendering with schema:', schema?.formCode);

    try {
        return (
            <div className="submission-view-container">
                <style>{`
                    @page { size: A4; margin: 0; }
                    @media print {
                        body { margin: 0; padding: 0; background: white; }
                        .no-print { display: none !important; }
                        .page-break { page-break-before: always; display: block; width: 100%; }
                        .submission-view-container { padding: 0 !important; margin: 0 !important; }
                        div[ref="printRef"], .page-ref { 
                            margin: 0 !important; 
                            padding: 10mm !important; 
                            box-shadow: none !important; 
                            border: none !important;
                            width: 210mm !important;
                            height: 297mm !important;
                        }
                    }
                    .submission-view-container {
                        background: #f0f2f5;
                        min-height: 100vh;
                        padding-bottom: 40px;
                    }
                `}</style>
                <div className="page-header no-print" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '20px', background: '#fff', boxShadow: '0 2px 4px rgba(0,0,0,0.1)', marginBottom: '10px' }}>
                    <div>
                        <h1 style={{ margin: 0, fontSize: '20px' }}>{schema?.formName || 'Submission View'}</h1>
                        <p style={{ margin: '4px 0 0', color: '#666' }}>ID: {id}</p>
                    </div>
                    <div style={{ display: 'flex', gap: '10px' }}>
                        <button onClick={() => navigate(-1)} style={{ padding: '8px 16px', background: '#eee', border: 'none', borderRadius: '4px', cursor: 'pointer' }}>← Back</button>
                        <button onClick={handlePrint} style={styles.printButton}>🖨️ Print / Save PDF</button>
                    </div>
                </div>

                {submission.status === 'rejected' && (
                    <div className="no-print" style={{ 
                        margin: '0 auto 20px', 
                        maxWidth: '210mm', 
                        background: '#fdecea', 
                        border: '1px solid #f44336', 
                        borderRadius: '8px', 
                        padding: '16px 24px',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '16px',
                        color: '#d32f2f'
                    }}>
                        <div style={{ fontSize: '24px' }}>⚠️</div>
                        <div>
                            <div style={{ fontWeight: 'bold', fontSize: '16px', marginBottom: '4px' }}>Submission Rejected</div>
                            <div style={{ fontSize: '14px' }}>
                                <strong>Reason from Admin:</strong> {submission.remarks || 'No reason provided.'}
                            </div>
                            <div style={{ fontSize: '12px', marginTop: '8px', opacity: 0.8 }}>
                                Please correct the highlights in the form and resubmit or contact your supervisor.
                            </div>
                        </div>
                    </div>
                )}

                <div ref={printRef} style={styles.page}>
                    {schema?.formCode !== 'CERTIFICATE' && schema?.formCode !== 'MRF' && schema?.formCode !== 'PO' && schema?.formCode !== 'WORK_ORDER' && schema?.formCode !== 'MAINTENANCE_REPLACEMENT' && <FormHeader
                        formName={schema?.formName}
                        modelNo={submission?.headerData?.modelNo || submission?.drone?.modelNo}
                        serialNo={submission?.headerData?.serialNo || submission?.drone?.serialNo || submission?.headerData?.droneSeriesNo}
                        issueNo={submission?.headerData?.issueNo}
                        issueDate={submission?.headerData?.issueDate || '04/03/2023'}
                        date={submission?.headerData?.date || (submission?.createdAt ? new Date(submission.createdAt).toLocaleDateString() : '')}
                        versionNo={submission?.headerData?.versionNo || '1'}
                        time={submission?.headerData?.time || ''}
                        showTime={['PACKAGING', 'FLIGHT_TEST', 'DISPATCH'].includes(schema?.formCode)}
                        hideTable={['UIN', 'D2_FORM', 'UIN_PHOTO', 'D3_FORM'].includes(schema?.formCode)}
                        variant={['QA_SOLDERING', 'QA_MECHANICAL', 'QA_ELECTRONIC', 'QA_PAYLOAD', 'QA_CALIBRATION', 'ACTIVATION', 'UIN', 'D2_FORM', 'UIN_PHOTO', 'D3_FORM', 'PACKAGING', 'FLIGHT_TEST', 'DISPATCH'].includes(schema?.formCode) ? 'qa' : 'rich'}
                    />}

                    {schema?.formCode === 'MRF' && (
                        <div style={{ marginBottom: '20px', fontFamily: "'Times New Roman', Times, serif", color: '#000' }}>
                            {/* Custom Header for MRF */}
                            <div style={{ display: 'flex', alignItems: 'center', marginBottom: '20px', width: '100%' }}>
                                <div style={{ width: '150px', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                                    <CompanyLogo size={80} theme="light" />
                                    <div style={{ fontSize: '13px', fontWeight: 'bold', fontFamily: "'Times New Roman', Times, serif", marginTop: '2px' }}>CerebroSpark</div>
                                </div>
                                <div style={{ flex: 1, textAlign: 'center', whiteSpace: 'nowrap' }}>
                                    <h1 style={{ margin: 0, fontSize: '28px', letterSpacing: '1px', fontWeight: 'bold', fontFamily: "'Times New Roman', Times, serif", textTransform: 'uppercase', whiteSpace: 'nowrap' }}>
                                        CEREBROSPARK INNOVATIONS
                                    </h1>
                                </div>
                                <div style={{ width: '150px' }}></div>
                            </div>

                            {/* Boxed Title */}
                            <div style={{ textAlign: 'center', marginBottom: '30px' }}>
                                <div style={{
                                    display: 'inline-block',
                                    border: '2px solid #000',
                                    padding: '5px 40px',
                                    fontWeight: 'bold',
                                    fontSize: '18px',
                                    fontFamily: "Arial, sans-serif"
                                }}>
                                    Material Requisition
                                </div>
                            </div>

                            {/* Fields Area */}
                            <div style={{ padding: '0 40px', fontSize: '14px', lineHeight: '2.4', fontWeight: 'bold' }}>
                                <div style={{ display: 'flex', alignItems: 'center', marginBottom: '10px' }}>
                                    <span style={{ marginRight: '5px' }}>DATE:</span>
                                    <span style={{
                                        borderBottom: '1px solid #000',
                                        display: 'inline-block',
                                        minWidth: '150px',
                                        textAlign: 'center',
                                        fontWeight: 'normal'
                                    }}>
                                        {submission?.headerData?.date ? new Date(submission.headerData.date).toLocaleDateString('en-GB') : ''}
                                    </span>
                                </div>

                                <div style={{ display: 'flex', alignItems: 'center' }}>
                                    <span style={{ minWidth: '220px' }}>A. Material Order No.:</span>
                                    <span style={{ borderBottom: '1px solid #000', flex: 1, paddingLeft: '10px', fontWeight: 'normal' }}>{submission?.headerData?.materialOrderNo || ''}</span>
                                </div>
                                <div style={{ display: 'flex', alignItems: 'center' }}>
                                    <span style={{ minWidth: '220px' }}>B. Work Order No.:</span>
                                    <span style={{ borderBottom: '1px solid #000', flex: 1, paddingLeft: '10px', fontWeight: 'normal' }}>{submission?.headerData?.workOrderNo || ''}</span>
                                </div>
                                <div style={{ display: 'flex', alignItems: 'center' }}>
                                    <span style={{ minWidth: '220px' }}>C. Drone series No.:</span>
                                    <span style={{ borderBottom: '1px solid #000', flex: 1, paddingLeft: '10px', fontWeight: 'normal' }}>{submission?.headerData?.droneSeriesNo || ''}</span>
                                </div>
                                <div style={{ display: 'flex', alignItems: 'center' }}>
                                    <span style={{ minWidth: '380px' }}>D. Type of Requisition: (NEW/Maintenance/Spare)</span>
                                    <span style={{ borderBottom: '1px solid #000', flex: 1, paddingLeft: '10px', fontWeight: 'normal' }}>{submission?.headerData?.typeOfRequisition || ''}</span>
                                </div>
                            </div>
                        </div>
                    )}

                    {schema?.formCode === 'WORK_ORDER' && (
                        <div style={{ padding: '0 40px', fontFamily: "'Times New Roman', Times, serif", color: '#000', backgroundColor: '#fff' }}>
                            {/* Header: Logo + Professional Title */}
                            <div style={{ display: 'flex', alignItems: 'center', marginBottom: '25px', width: '100%', borderBottom: 'none' }}>
                                <div style={{ width: '100px', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                                    <CompanyLogo size={75} theme="light" />
                                    <div style={{ fontSize: '12px', fontWeight: 'bold', fontFamily: "'Times New Roman', Times, serif", marginTop: '3px' }}>CerebroSpark</div>
                                </div>
                                <div style={{ flex: 1, textAlign: 'center', paddingLeft: '10px' }}>
                                    <h1 style={{ margin: 0, fontSize: '28px', letterSpacing: '0.5px', fontWeight: 'bold', fontFamily: "'Times New Roman', Times, serif", textTransform: 'uppercase', whiteSpace: 'nowrap' }}>
                                        CEREBROSPARK INNOVATIONS
                                    </h1>
                                </div>
                                <div style={{ width: '100px' }}></div>
                            </div>

                            {/* Centered Boxed Title */}
                            <div style={{ textAlign: 'center', margin: '25px 0' }}>
                                <div style={{
                                    display: 'inline-block',
                                    border: '1.5px solid #000',
                                    padding: '8px 80px',
                                    fontWeight: 'bold',
                                    fontSize: '22px',
                                    fontFamily: "Arial, sans-serif",
                                    textTransform: 'none'
                                }}>
                                    Work Order
                                </div>
                            </div>

                            {/* Date and Work Order No Block */}
                            <div style={{ fontSize: '14px', fontWeight: 'bold', marginTop: '25px', marginBottom: '25px' }}>
                                <div style={{ display: 'flex', alignItems: 'flex-end', marginBottom: '12px' }}>
                                    <span style={{ minWidth: '60px', paddingBottom: '2px' }}>Date:</span>
                                    <div style={{ borderBottom: '1px solid #000', minWidth: '150px', marginLeft: '5px', textAlign: 'center', paddingBottom: '2px', fontWeight: 'bold' }}>
                                        {(submission?.headerData?.date || submission?.formData?.date) ? new Date(submission?.headerData?.date || submission?.formData?.date).toLocaleDateString('en-GB') : (submission?.createdAt ? new Date(submission.createdAt).toLocaleDateString('en-GB') : '')}
                                    </div>
                                </div>
                                <div style={{ display: 'flex', alignItems: 'flex-end', marginBottom: '25px' }}>
                                    <span style={{ minWidth: '130px', paddingBottom: '2px' }}>Work Order No.:</span>
                                    <div style={{ borderBottom: '1px solid #000', width: '220px', marginLeft: '5px', paddingLeft: '10px', paddingBottom: '2px', fontWeight: 'bold' }}>
                                        {submission?.headerData?.workOrderNo || submission?.formData?.workOrderNo || ''}
                                    </div>
                                </div>
                            </div>

                            {/* Section A: Client Details Header */}
                            <div style={{ fontSize: '16px', fontWeight: 'bold', marginTop: '30px', marginBottom: '12px' }}>A. &nbsp; Client Details:</div>
                            <div style={{ fontSize: '14px', marginLeft: '30px', marginTop: '8px' }}>
                                <div style={{ display: 'flex', alignItems: 'flex-end', marginBottom: '20px' }}>
                                    <span style={{ fontWeight: 'normal', minWidth: '150px', paddingBottom: '2px' }}>1. &nbsp;&nbsp;&nbsp; Name of Client:</span>
                                    <div style={{ borderBottom: '1px solid #000', flex: 1, marginLeft: '5px', paddingBottom: '2px', paddingLeft: '10px', fontWeight: 'bold' }}>
                                        {submission?.formData?.clientName || ''}
                                    </div>
                                </div>
                            </div>

                            {/* Section B: Product Details Header */}
                            <div style={{ fontSize: '16px', fontWeight: 'bold', marginTop: '40px', marginBottom: '12px' }}>B. &nbsp; Product Details:</div>
                            <div style={{ fontSize: '14px', marginLeft: '30px', marginTop: '8px' }}>
                                <div style={{ display: 'flex', alignItems: 'flex-end', marginBottom: '15px' }}>
                                    <span style={{ fontWeight: 'normal', minWidth: '150px', paddingBottom: '2px' }}>1. &nbsp;&nbsp;&nbsp; Model Name:</span>
                                    <div style={{ borderBottom: '1px solid #000', width: '250px', marginLeft: '5px', paddingBottom: '2px', paddingLeft: '10px', fontWeight: 'bold' }}>
                                        {submission?.formData?.modelName || submission?.drone?.modelNo || 'CS_KRISHI_10L'}
                                    </div>
                                </div>
                                <div style={{ display: 'flex', alignItems: 'flex-end', marginBottom: '15px' }}>
                                    <span style={{ fontWeight: 'normal', minWidth: '150px', paddingBottom: '2px' }}>2. &nbsp;&nbsp;&nbsp; Quantity:</span>
                                    <div style={{ borderBottom: '1px solid #000', flex: 1, marginLeft: '5px', paddingBottom: '2px', paddingLeft: '10px', fontWeight: 'bold' }}>
                                        {submission?.formData?.quantity || ''}
                                    </div>
                                </div>
                                <div style={{ display: 'flex', alignItems: 'flex-end', marginBottom: '15px' }}>
                                    <span style={{ fontWeight: 'normal', minWidth: '150px', paddingBottom: '2px' }}>3. &nbsp;&nbsp;&nbsp; Type of Nozzle:</span>
                                    <div style={{ borderBottom: '1px solid #000', flex: 1, marginLeft: '5px', paddingBottom: '2px', paddingLeft: '10px', fontWeight: 'bold' }}>
                                        {submission?.formData?.typeOfNozzle || ''}
                                    </div>
                                </div>
                                <div style={{ display: 'flex', alignItems: 'flex-end', marginBottom: '15px' }}>
                                    <span style={{ fontWeight: 'normal', minWidth: '150px', paddingBottom: '2px' }}>4. &nbsp;&nbsp;&nbsp; Accessories:</span>
                                    <div style={{ borderBottom: '1px solid #000', flex: 1, marginLeft: '5px', paddingBottom: '2px', paddingLeft: '10px', fontWeight: 'bold' }}>
                                        {submission?.formData?.accessories || ''}
                                    </div>
                                </div>
                            </div>

                            {/* Large Prominent Signature Box */}
                            <div style={{ 
                                border: '1.5px solid #000', 
                                marginTop: '70px', 
                                height: '200px', 
                                position: 'relative',
                                display: 'flex',
                                alignItems: 'flex-end',
                                padding: '40px 60px'
                            }}>
                                <div style={{ fontWeight: 'bold', fontSize: '15px' }}>Sales manager</div>
                                <div style={{ flex: 1 }}></div>
                                <div style={{ fontWeight: 'bold', fontSize: '15px', textAlign: 'right' }}>Planning Manager</div>
                            </div>

                            {/* Fixed Footer Remark */}
                            <div style={{ marginTop: '60px', marginBottom: '40px', fontSize: '14px', fontWeight: 'bold', fontStyle: 'italic' }}>
                                Remark: To Production Manager
                            </div>
                        </div>
                    )}

                    {schema?.formCode === 'MAINTENANCE_REPLACEMENT' && (
                        <div style={{ padding: '0 40px', fontFamily: "'Times New Roman', Times, serif", color: '#000', backgroundColor: '#fff' }}>
                            {/* Header Section: Logo and Title side-by-side (Image 1 Style) */}
                            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '20px', width: '100%' }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '20px' }}>
                                    <CompanyLogo size={80} theme="light" />
                                    <h1 style={{ 
                                        margin: 0, 
                                        fontSize: '32px', 
                                        fontWeight: 'bold', 
                                        fontFamily: "'Times New Roman', Times, serif", 
                                        textTransform: 'uppercase',
                                        letterSpacing: '1px'
                                    }}>
                                        CEREBROSPARK INNOVATIONS
                                    </h1>
                                </div>
                            </div>

                            {/* Section Title: Maintenance / Replacement FOR END USER */}
                            <div style={{ textAlign: 'center', marginBottom: '20px' }}>
                                <div style={{
                                    border: '1.5px solid #000',
                                    padding: '6px 20px',
                                    fontWeight: 'bold',
                                    fontSize: '18px',
                                    textTransform: 'uppercase',
                                    background: '#fff'
                                }}>
                                    MAINTENANCE / REPLACEMENT FOR END USER
                                </div>
                            </div>

                            {/* Data Table: Precise Sr. Nos and Labels (Image 1 Style) */}
                            <table style={{ width: '100%', borderCollapse: 'collapse', border: '1.5px solid #000' }}>
                                <tbody>
                                    {[
                                        { sr: '1.', label: 'DRONE MODEL', val: submission?.formData?.droneModel || 'CS_KRISHI_10L' },
                                        { sr: '2.', label: 'DRONE UIN NUMBER', val: submission?.formData?.droneUin || '' },
                                        { sr: '3.', label: 'SERIAL NUMBER', val: submission?.formData?.serialNo || '' },
                                        { sr: '3.', label: 'CUSTOMER NAME', val: submission?.formData?.customerName || '' },
                                        { sr: '4.', label: 'DATE OF PURCHASE', val: submission?.formData?.dateOfPurchase ? new Date(submission.formData.dateOfPurchase).toLocaleDateString('en-GB') : '' },
                                        { sr: '5.', label: 'CONTACT DETAILS', val: submission?.formData?.contactDetails || '' },
                                        { sr: '6.', label: 'ADDRESS', val: submission?.formData?.address || '' },
                                        { sr: '8.', label: 'DATE OF SERVICE', val: submission?.headerData?.dateOfService ? new Date(submission.headerData.dateOfService).toLocaleDateString('en-GB') : '' },
                                        { sr: '9.', label: 'LOCATION OF SERVICE', val: submission?.formData?.locationOfService || '' },
                                        { sr: '10.', label: 'DEFECT DESCRIPTION', val: submission?.formData?.defectDescription || '' },
                                        { sr: '11.', label: 'DATE OF DEFECT', val: submission?.formData?.dateOfDefect ? new Date(submission.formData.dateOfDefect).toLocaleDateString('en-GB') : '' },
                                        { sr: '13.', label: 'COMPONENTS REPLACED', val: submission?.formData?.componentsReplaced || '' },
                                        { sr: '15.', label: 'MAINTENANCE CARRIED OUT', val: submission?.formData?.maintenanceCarriedOut || '', taller: true },
                                        { sr: '16.', label: 'ENGINEER NAME', val: submission?.formData?.engineerName || '' },
                                        { sr: '17.', label: 'REMARK', val: submission?.formData?.remark || '' },
                                        { sr: '18.', label: 'SUGGESTION', val: submission?.formData?.suggestion || '' },
                                        { sr: '19.', label: 'NEXT MAINTENANCE DUE DATE', val: submission?.formData?.nextMaintenanceDate ? new Date(submission.formData.nextMaintenanceDate).toLocaleDateString('en-GB') : '' }
                                    ].map((row, idx) => (
                                        <tr key={idx}>
                                            <td style={{ border: '1.5px solid #000', padding: '6px', width: '40px', textAlign: 'center', fontWeight: 'bold', fontSize: '11px', verticalAlign: 'top' }}>{row.sr}</td>
                                            <td style={{ border: '1.5px solid #000', padding: '6px', width: '220px', fontWeight: 'bold', fontSize: '11px', textTransform: 'uppercase', verticalAlign: 'top' }}>{row.label}</td>
                                            <td style={{ 
                                                border: '1.5px solid #000', 
                                                padding: '6px', 
                                                minHeight: row.taller ? '100px' : 'auto', 
                                                height: row.taller ? '100px' : 'auto', 
                                                verticalAlign: 'top', 
                                                textAlign: 'center',
                                                fontWeight: 'bold',
                                                fontSize: '12px'
                                            }}>
                                                {row.val}
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>

                            {/* Signatures Area: Boxed Footer (Image 1 Style) */}
                            <div style={{
                                border: '1.5px solid #000',
                                borderTop: 'none',
                                padding: '50px 20px 15px',
                                display: 'flex',
                                justifyContent: 'space-between',
                                fontSize: '13px',
                                fontWeight: 'bold',
                                minHeight: '120px'
                            }}>
                                <div style={{ alignSelf: 'flex-end' }}>Sign of Person In-charge</div>
                                <div style={{ alignSelf: 'flex-end' }}>Receivers sign</div>
                            </div>
                        </div>
                    )}

                    {schema?.formCode === 'PO' && (
                        <div style={{ fontFamily: "Arial, sans-serif", border: '1px solid #000', color: '#000', boxSizing: 'border-box' }}>
                            {/* Header */}
                            <div style={{ textAlign: 'center', fontWeight: 'bold', fontSize: '16px', padding: '4px', borderBottom: '1px solid #000' }}>
                                PURCHASE ORDER
                            </div>

                            {/* Top Info Grid */}
                            <div style={{ display: 'flex', borderBottom: '1px solid #000' }}>
                                {/* Left Side: Invoice To & Supplier */}
                                <div style={{ flex: 1, borderRight: '1px solid #000', display: 'flex', flexDirection: 'column' }}>
                                    {/* Invoice To */}
                                    <div style={{ padding: '4px', flex: 1, borderBottom: '1px solid #000' }}>
                                        <div style={{ fontSize: '11px', marginBottom: '2px' }}>Invoice To</div>
                                        <div style={{ fontWeight: 'bold', fontSize: '13px', marginBottom: '4px' }}>CEREBROSPARK INNOVATIONS LLP</div>
                                        <div style={{ fontSize: '11px', lineHeight: '1.2' }}>
                                            Plot No. 14, Sai Niwas Society, Undri, Pune 411 060<br />
                                            GSTIN: 27AAPFC8198Q1Z7<br />
                                            Contact: +91 8600104934/7387515448<br />
                                            Email: info@cerebrospark.in
                                        </div>
                                    </div>
                                    {/* Supplier */}
                                    <div style={{ padding: '4px', flex: 1 }}>
                                        <div style={{ fontSize: '11px', marginBottom: '2px' }}>Supplier (Bill From)</div>
                                        <strong style={{ fontSize: '12px' }}>{submission?.headerData?.supplierName || submission?.formData?.[allFields?.[0]?.name] || 'Tiltas Systems LLP'}</strong>
                                        <div style={{ fontSize: '11px', lineHeight: '1.2' }}>
                                            {submission?.headerData?.supplierAddress || 'ABOVE SHREE GANESH SHUPERSHOPEE,\nMARIMATA\nROADNEAR MARIMATA MANDIR,BAJAR PETHA,\nBHUSAWALMaharashtra 425201'}
                                        </div>
                                        <div style={{ fontSize: '11px', marginTop: '4px' }}>
                                            GSTIN: {submission?.headerData?.supplierGSTIN || '27AAQFT7704A1Z4'}
                                        </div>
                                    </div>
                                </div>

                                {/* Right Side: Voucher, Delivery, Details */}
                                <div style={{ flex: 1, display: 'flex', flexDirection: 'column', fontSize: '11px' }}>
                                    <div style={{ display: 'flex', borderBottom: '1px solid #000' }}>
                                        <div style={{ flex: 1, padding: '4px', borderRight: '1px solid #000' }}>
                                            Voucher No.:<br />
                                            <strong>{submission?.headerData?.voucherNo || 'PO/CSI/23-24/01'}</strong>
                                        </div>
                                        <div style={{ flex: 1, padding: '4px' }}>
                                            Dated<br />
                                            <strong>{submission?.headerData?.date ? new Date(submission.headerData.date).toLocaleDateString('en-GB') : '22/02/2024'}</strong>
                                        </div>
                                    </div>
                                    <div style={{ padding: '4px', borderBottom: '1px solid #000', flex: 1 }}>
                                        Mode/Term of Payment<br />
                                        <strong>{submission?.headerData?.paymentTerms || '10% Advance, 90% Upon batch delivery'}</strong>
                                    </div>
                                    <div style={{ display: 'flex', borderBottom: '1px solid #000' }}>
                                        <div style={{ flex: 1, padding: '4px', borderRight: '1px solid #000' }}>
                                            Dispatch Through<br />
                                            <strong>{submission?.headerData?.dispatchThrough || ''}</strong>
                                        </div>
                                        <div style={{ flex: 1, padding: '4px' }}>
                                            Location<br />
                                            <strong>{submission?.headerData?.location || 'Pune'}</strong>
                                        </div>
                                    </div>
                                    <div style={{ padding: '4px', borderBottom: '1px solid #000', flex: 2 }}>
                                        Term of Delivery<br />
                                        {submission?.headerData?.deliveryTerm || 'As per requirement the batch will be delivered.'}
                                    </div>
                                    <div style={{ padding: '4px', borderBottom: '1px solid #000', flex: 1 }}>
                                        Quotation No. (From Supplier) <strong style={{ marginLeft: '4px' }}>{submission?.headerData?.quotationNo || 'TSL/EST/23-24/0386'}</strong>
                                    </div>
                                    <div style={{ padding: '4px', borderBottom: '1px solid #000', display: 'flex', flex: 1 }}>
                                        <div style={{ width: '80px' }}>Under of</div>
                                        <strong>{submission?.headerData?.underOf || 'CSKRISHI'}</strong>
                                    </div>
                                    <div style={{ padding: '4px', flex: 1 }}>
                                        Transit Insurance
                                    </div>
                                </div>
                            </div>

                            {/* Item Table */}
                            <table style={{ width: '100%', borderCollapse: 'collapse', borderBottom: '1px solid #000' }}>
                                <thead>
                                    <tr>
                                        <th style={{ borderRight: '1px solid #000', borderBottom: '1px solid #000', padding: '6px', fontSize: '11px', width: '40px' }}>Sr. No.</th>
                                        <th style={{ borderRight: '1px solid #000', borderBottom: '1px solid #000', padding: '6px', fontSize: '11px' }}>Description</th>
                                        <th style={{ borderRight: '1px solid #000', borderBottom: '1px solid #000', padding: '6px', fontSize: '11px', width: '100px' }}>HSN/SAC</th>
                                        <th style={{ borderBottom: '1px solid #000', padding: '6px', fontSize: '11px', width: '80px' }}>Qty</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {(() => {
                                        // Standard HSN map matching the reference image items
                                        const hsnMap = ['88073000', '88079000', '88079000', '88079000', '88073000', '85013210', '85013210', '88079000', '85269200', '85068090', '88079000', '88079000', '88079000', '85269200', '85044030', '88073000', '88073000'];

                                        // Grab the items from the form schema fields (skip the first two which are supplier info)
                                        const itemFields = allFields ? allFields.slice(2, 19) : [];

                                        // Generate precisely 17 rows
                                        return [...Array(17)].map((_, i) => {
                                            const f = itemFields[i];
                                            const description = f?.label?.replace(' (Qty)', '') || '';
                                            const hsn = hsnMap[i] || '';
                                            const qty = f?.name ? (submission?.formData?.[f.name] || '') : '';

                                            return (
                                                <tr key={i} style={{ height: '20px' }}>
                                                    <td style={{ border: '1px solid #000', textAlign: 'center', fontSize: '10px' }}>{i + 1}</td>
                                                    <td style={{ border: '1px solid #000', padding: '2px 4px', fontSize: '10px' }}>{description}</td>
                                                    <td style={{ border: '1px solid #000', textAlign: 'center', fontSize: '10px' }}>{hsn}</td>
                                                    <td style={{ border: '1px solid #000', textAlign: 'center', fontSize: '10px' }}>{qty}</td>
                                                </tr>
                                            );
                                        });
                                    })()}
                                    {/* Tax Rows */}
                                    <tr style={{ height: '20px' }}>
                                        <td style={{ border: '1px solid #000' }}></td>
                                        <td style={{ border: '1px solid #000', paddingLeft: '4px', fontSize: '10px' }}>CGST2.5 (2.5%)</td>
                                        <td style={{ border: '1px solid #000' }}></td>
                                        <td style={{ border: '1px solid #000' }}></td>
                                    </tr>
                                    <tr style={{ height: '20px' }}>
                                        <td style={{ border: '1px solid #000' }}></td>
                                        <td style={{ border: '1px solid #000', paddingLeft: '4px', fontSize: '10px' }}>SGST2.5 (2.5%)</td>
                                        <td style={{ border: '1px solid #000' }}></td>
                                        <td style={{ border: '1px solid #000' }}></td>
                                    </tr>
                                    <tr style={{ height: '20px' }}>
                                        <td style={{ border: '1px solid #000' }}></td>
                                        <td style={{ border: '1px solid #000', paddingLeft: '4px', fontSize: '10px' }}>CGST9 (9%)</td>
                                        <td style={{ border: '1px solid #000' }}></td>
                                        <td style={{ border: '1px solid #000' }}></td>
                                    </tr>
                                    <tr style={{ height: '20px' }}>
                                        <td style={{ border: '1px solid #000' }}></td>
                                        <td style={{ border: '1px solid #000', paddingLeft: '4px', fontSize: '10px' }}>SGST9 (9%)</td>
                                        <td style={{ border: '1px solid #000' }}></td>
                                        <td style={{ border: '1px solid #000' }}></td>
                                    </tr>
                                </tbody>
                            </table>

                            <div style={{ padding: '4px', fontSize: '11px', borderBottom: '1px solid #000', minHeight: '60px' }}>
                                <strong>Note:</strong><br />
                                <div style={{ paddingLeft: '4px', marginTop: '2px', whiteSpace: 'pre-line' }}>
                                    {submission?.headerData?.note || '1. Total material quantity is for the 10 complete unit.\n2. 10 % Advance is gainst the total material order.\n3. 90% payment will be provided against the batch size requirement.\n4. Batch size will be one drone aslo and 10 drone also.\n5. Total Drone is 10 against this Purchase Order.'}
                                </div>
                            </div>

                            <div style={{ padding: '4px', fontSize: '11px', borderBottom: '1px solid #000', display: 'flex', justifyContent: 'space-between' }}>
                                <div>
                                    <strong>Remark:</strong><br />
                                    <strong>Any Clarification Please contact Mr. Ganesh Thorat (CEO) (8600104934)</strong>
                                </div>
                                <div style={{ fontWeight: 'bold' }}>For</div>
                            </div>

                            <div style={{ padding: '4px', fontSize: '11px', borderBottom: '1px solid #000', fontWeight: 'bold' }}>
                                Company's PAN: AAPFC8198Q
                            </div>

                            {/* Signatures */}
                            <div style={{ display: 'flex', height: '80px' }}>
                                <div style={{ flex: 1, borderRight: '1px solid #000', padding: '4px', fontSize: '12px', fontWeight: 'bold', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
                                    <div>Order Confirm &amp; Accepted</div>
                                    <div style={{ textAlign: 'center', marginBottom: '4px' }}>By Supplier's Seal &amp; Signature</div>
                                </div>
                                <div style={{ flex: 1, padding: '4px', fontSize: '12px', fontWeight: 'bold', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
                                    <div>Ordered by</div>
                                    <div style={{ textAlign: 'center', marginBottom: '4px' }}>By Cerebrospark Innovations LLP Pune</div>
                                </div>
                            </div>
                        </div>
                    )}

                    {['MRF'].includes(schema?.formCode) ? (
                        <div style={{ padding: '0 40px', fontFamily: "'Times New Roman', Times, serif" }}>
                            <h3 style={{ textAlign: 'center', textDecoration: 'underline', fontSize: '14px', marginBottom: '10px', marginTop: '20px', fontWeight: 'bold' }}>List of Required material</h3>
                            <table style={{ ...styles.mainTable, border: '2px solid #000' }}>
                                <thead>
                                    <tr>
                                        <th style={{ ...styles.th, border: '1px solid #000', padding: '10px 4px', width: '40px', fontSize: '13px' }}>Sr.<br />No.</th>
                                        <th style={{ ...styles.th, border: '1px solid #000', padding: '10px', fontSize: '13px' }}>Particular</th>
                                        <th style={{ ...styles.th, border: '1px solid #000', padding: '10px', width: '90px', fontSize: '13px' }}>Part No.</th>
                                        <th style={{ ...styles.th, border: '1px solid #000', padding: '10px', width: '90px', fontSize: '13px' }}>Part<br />Code</th>
                                        <th style={{ ...styles.th, border: '1px solid #000', padding: '10px', width: '50px', fontSize: '13px' }}>QTY</th>
                                        <th style={{ ...styles.th, border: '1px solid #000', padding: '10px', width: '100px', fontSize: '13px' }}>Department</th>
                                        <th style={{ ...styles.th, border: '1px solid #000', padding: '10px', width: '80px', fontSize: '13px' }}>Remark</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {/* Generate 15 rows exactly to match the image spacing */}
                                    {[...Array(15)].map((_, idx) => {
                                        const hasData = submission?.formData?.[`particular_${idx + 1}`] || 
                                                       submission?.formData?.[`partNo_${idx + 1}`] || 
                                                       submission?.formData?.[`partCode_${idx + 1}`] || 
                                                       submission?.formData?.[`qty_${idx + 1}`];
                                        return (
                                            <tr key={idx} style={{ height: '28px' }}>
                                                <td style={{ ...styles.tdCenter, border: '1px solid #000', fontSize: '12px', padding: '4px' }}>{hasData ? idx + 1 : ''}</td>
                                            <td style={{ ...styles.td, border: '1px solid #000', fontSize: '12px', padding: '4px 8px' }}>{submission?.formData?.[`particular_${idx + 1}`] || ''}</td>
                                            <td style={{ ...styles.tdCenter, border: '1px solid #000', fontSize: '12px', padding: '4px' }}>{submission?.formData?.[`partNo_${idx + 1}`] || ''}</td>
                                            <td style={{ ...styles.tdCenter, border: '1px solid #000', fontSize: '12px', padding: '4px' }}>{submission?.formData?.[`partCode_${idx + 1}`] || ''}</td>
                                            <td style={{ ...styles.tdCenter, border: '1px solid #000', fontSize: '12px', padding: '4px' }}>{submission?.formData?.[`qty_${idx + 1}`] || ''}</td>
                                            <td style={{ ...styles.tdCenter, border: '1px solid #000', fontSize: '12px', padding: '4px' }}>{submission?.formData?.[`department_${idx + 1}`] || ''}</td>
                                            <td style={{ ...styles.tdCenter, border: '1px solid #000', fontSize: '12px', padding: '4px' }}>{submission?.formData?.[`remark_${idx + 1}`] || ''}</td>
                                            </tr>
                                        );
                                    })}
                                </tbody>
                            </table>

                            {/* MRF Footer */}
                            <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '60px', padding: '0 40px', fontWeight: 'bold', fontSize: '14px' }}>
                                <div>Initiated By</div>
                                <div>Approved By</div>
                            </div>
                        </div>
                    ) : schema?.formCode === 'PACKAGING' ? (() => {
                        const getVal = (field) => submission?.formData?.[field] || '';
                        return (
                            <>
                                <table style={{ ...styles.mainTable, tableLayout: 'fixed' }}>
                                    <thead>
                                        <tr>
                                            <th style={{ ...styles.th, width: '60px' }}>SR.NO</th>
                                            <th colSpan={2} style={styles.th}>PACKAGING CHECKS</th>
                                            <th style={{ ...styles.th, width: '150px' }}>REMARK (YES/NO)</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {/* Rows 1-7 */}
                                        <tr>
                                            <td style={styles.tdCenter}>1</td>
                                            <td colSpan={2} style={{ ...styles.tdCenter, textAlign: 'left' }}>CS_KRISHI_10L (with void tape)</td>
                                            <td style={styles.tdCenter}>{getVal('droneCondition')}</td>
                                        </tr>
                                        <tr>
                                            <td style={styles.tdCenter}>2</td>
                                            <td colSpan={2} style={{ ...styles.tdCenter, textAlign: 'left' }}>Remote controller</td>
                                            <td style={styles.tdCenter}>{getVal('remoteController')}</td>
                                        </tr>
                                        <tr>
                                            <td style={styles.tdCenter}>3</td>
                                            <td colSpan={2} style={{ ...styles.tdCenter, textAlign: 'left' }}>Battery Plate</td>
                                            <td style={styles.tdCenter}>{getVal('batteryPlate')}</td>
                                        </tr>
                                        <tr>
                                            <td style={styles.tdCenter}>4</td>
                                            <td colSpan={2} style={{ ...styles.tdCenter, textAlign: 'left' }}>Smart Phone</td>
                                            <td style={styles.tdCenter}>{getVal('smartPhone')}</td>
                                        </tr>
                                        <tr>
                                            <td style={styles.tdCenter}>5</td>
                                            <td colSpan={2} style={{ ...styles.tdCenter, textAlign: 'left' }}>Battery set (Labelled)</td>
                                            <td style={styles.tdCenter}>{getVal('batterySet')}</td>
                                        </tr>
                                        <tr>
                                            <td style={styles.tdCenter}>6</td>
                                            <td colSpan={2} style={{ ...styles.tdCenter, textAlign: 'left' }}>Battery charger</td>
                                            <td style={styles.tdCenter}>{getVal('batteryCharger')}</td>
                                        </tr>
                                        <tr>
                                            <td style={styles.tdCenter}>7</td>
                                            <td colSpan={2} style={{ ...styles.tdCenter, textAlign: 'left' }}>Centrifugal Nozzle (if asked)</td>
                                            <td style={styles.tdCenter}>{getVal('centrifugalNozzle')}</td>
                                        </tr>

                                        {/* Row 8: Manuals (RowSpan=5) */}
                                        <tr>
                                            <td rowSpan={5} style={styles.tdCenter}>8</td>
                                            <td rowSpan={5} style={{ ...styles.tdCenter, textAlign: 'left', width: '35%' }}>Manuals</td>
                                            <td style={{ ...styles.tdCenter, textAlign: 'left' }}>Flight Manual</td>
                                            <td style={styles.tdCenter}>{getVal('flightManual')}</td>
                                        </tr>
                                        <tr>
                                            <td style={{ ...styles.tdCenter, textAlign: 'left' }}>Maintenance Manual</td>
                                            <td style={styles.tdCenter}>{getVal('maintenanceManual')}</td>
                                        </tr>
                                        <tr>
                                            <td style={{ ...styles.tdCenter, textAlign: 'left' }}>Battery Log Book</td>
                                            <td style={styles.tdCenter}>{getVal('batteryLogBook')}</td>
                                        </tr>
                                        <tr>
                                            <td style={{ ...styles.tdCenter, textAlign: 'left' }}>Maintenance Log book</td>
                                            <td style={styles.tdCenter}>{getVal('maintenanceLogBook')}</td>
                                        </tr>
                                        <tr>
                                            <td style={{ ...styles.tdCenter, textAlign: 'left' }}>Operational Log Book</td>
                                            <td style={styles.tdCenter}>{getVal('operationalLogBook')}</td>
                                        </tr>

                                        {/* Row 9-14 */}
                                        <tr>
                                            <td style={styles.tdCenter}>9</td>
                                            <td colSpan={2} style={{ ...styles.tdCenter, textAlign: 'left' }}>Tool box</td>
                                            <td style={styles.tdCenter}>{getVal('toolBox')}</td>
                                        </tr>
                                        <tr>
                                            <td style={styles.tdCenter}>10</td>
                                            <td colSpan={2} style={{ ...styles.tdCenter, textAlign: 'left' }}>Drone case (if asked)</td>
                                            <td style={styles.tdCenter}>{getVal('droneCase')}</td>
                                        </tr>
                                        <tr>
                                            <td style={styles.tdCenter}>11</td>
                                            <td colSpan={2} style={{ ...styles.tdCenter, textAlign: 'left' }}>Extra propeller (1 set)</td>
                                            <td style={styles.tdCenter}>{getVal('extraPropeller')}</td>
                                        </tr>
                                        <tr>
                                            <td style={styles.tdCenter}>12</td>
                                            <td colSpan={2} style={{ ...styles.tdCenter, textAlign: 'left' }}>Pneumatic connector</td>
                                            <td style={styles.tdCenter}>{getVal('pneumaticConnector')}</td>
                                        </tr>
                                        <tr>
                                            <td style={styles.tdCenter}>13</td>
                                            <td colSpan={2} style={{ ...styles.tdCenter, textAlign: 'left' }}>Extra battery set (if asked)</td>
                                            <td style={styles.tdCenter}>{getVal('extraBatterySet')}</td>
                                        </tr>
                                        <tr>
                                            <td style={styles.tdCenter}>14</td>
                                            <td colSpan={2} style={{ ...styles.tdCenter, textAlign: 'left' }}>Extra battery charger (if asked)</td>
                                            <td style={styles.tdCenter}>{getVal('extraBatteryCharger')}</td>
                                        </tr>
                                    </tbody>
                                </table>

                                <div style={{
                                    border: '1px solid #000',
                                    borderTop: 'none',
                                    padding: '20px',
                                    minHeight: '200px',
                                    fontFamily: "'Segoe UI', Roboto, Helvetica, Arial, sans-serif",
                                    display: 'flex',
                                    flexDirection: 'column',
                                    justifyContent: 'space-between'
                                }}>
                                    <div style={{ fontSize: '11px' }}>Authorised person: <strong>{submission?.footerData?.name || submission?.footerData?.authorisedPerson || ''}</strong></div>
                                    <div style={{ fontSize: '11px' }}>Signature: <strong>{submission?.footerData?.signature ? '(Digitally Signed)' : 'Pending'}</strong></div>
                                </div>
                            </>
                        );
                    })() : schema?.formCode === 'FLIGHT_TEST' ? (() => {
                        const getVal = (field) => submission?.formData?.[field] || '';
                        return (
                            <>
                                <table style={{ ...styles.mainTable, tableLayout: 'fixed' }}>
                                    <thead>
                                        <tr>
                                            <th style={{ ...styles.th, width: '60px' }}>SR.NO</th>
                                            <th colSpan={2} style={styles.th}>GROUND CHECKS</th>
                                            <th style={{ ...styles.th, width: '150px' }}>REMARK (YES/NO)</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {/* Row 1-4 */}
                                        <tr>
                                            <td style={styles.tdCenter}>1</td>
                                            <td colSpan={2} style={{ ...styles.tdCenter, textAlign: 'left' }}>Compass Calibration</td>
                                            <td style={styles.tdCenter}>{getVal('compassCalibration')}</td>
                                        </tr>
                                        <tr>
                                            <td style={styles.tdCenter}>2</td>
                                            <td colSpan={2} style={{ ...styles.tdCenter, textAlign: 'left' }}>Accelerometer Calibration</td>
                                            <td style={styles.tdCenter}>{getVal('accelerometerCalibration')}</td>
                                        </tr>
                                        <tr>
                                            <td style={styles.tdCenter}>3</td>
                                            <td colSpan={2} style={{ ...styles.tdCenter, textAlign: 'left' }}>Flowmeter Calibration</td>
                                            <td style={styles.tdCenter}>{getVal('flowmeterCalibration')}</td>
                                        </tr>
                                        <tr>
                                            <td style={styles.tdCenter}>4</td>
                                            <td colSpan={2} style={{ ...styles.tdCenter, textAlign: 'left' }}>GPS Satellite Count</td>
                                            <td style={styles.tdCenter}>{getVal('gpsSatelliteCount')}</td>
                                        </tr>

                                        {/* Row 5: Control Checks */}
                                        <tr>
                                            <td rowSpan={4} style={styles.tdCenter}>5</td>
                                            <td rowSpan={4} style={{ ...styles.tdCenter, textAlign: 'left', width: '35%' }}>Control Checks</td>
                                            <td style={{ ...styles.tdCenter, textAlign: 'left' }}>Throttle</td>
                                            <td style={styles.tdCenter}>{getVal('throttle')}</td>
                                        </tr>
                                        <tr>
                                            <td style={{ ...styles.tdCenter, textAlign: 'left' }}>Pitch</td>
                                            <td style={styles.tdCenter}>{getVal('pitch')}</td>
                                        </tr>
                                        <tr>
                                            <td style={{ ...styles.tdCenter, textAlign: 'left' }}>Roll</td>
                                            <td style={styles.tdCenter}>{getVal('roll')}</td>
                                        </tr>
                                        <tr>
                                            <td style={{ ...styles.tdCenter, textAlign: 'left' }}>Yaw</td>
                                            <td style={styles.tdCenter}>{getVal('yaw')}</td>
                                        </tr>

                                        {/* Row 6: Sensors Check */}
                                        <tr>
                                            <td rowSpan={3} style={styles.tdCenter}>6</td>
                                            <td rowSpan={3} style={{ ...styles.tdCenter, textAlign: 'left' }}>Sensors Check</td>
                                            <td style={{ ...styles.tdCenter, textAlign: 'left' }}>Camera</td>
                                            <td style={styles.tdCenter}>{getVal('camera')}</td>
                                        </tr>
                                        <tr>
                                            <td style={{ ...styles.tdCenter, textAlign: 'left' }}>Obstacle Avoidance</td>
                                            <td style={styles.tdCenter}>{getVal('obstacleAvoidance')}</td>
                                        </tr>
                                        <tr>
                                            <td style={{ ...styles.tdCenter, textAlign: 'left' }}>Ground Radar</td>
                                            <td style={styles.tdCenter}>{getVal('groundRadar')}</td>
                                        </tr>

                                        {/* Row 7: Spraying System */}
                                        <tr>
                                            <td rowSpan={4} style={styles.tdCenter}>7</td>
                                            <td rowSpan={4} style={{ ...styles.tdCenter, textAlign: 'left' }}>Spraying System</td>
                                            <td style={{ ...styles.tdCenter, textAlign: 'left' }}>Pump Operation</td>
                                            <td style={styles.tdCenter}>{getVal('pumpOperation')}</td>
                                        </tr>
                                        <tr>
                                            <td style={{ ...styles.tdCenter, textAlign: 'left' }}>Flowmeter Operation</td>
                                            <td style={styles.tdCenter}>{getVal('flowmeterOperation')}</td>
                                        </tr>
                                        <tr>
                                            <td style={{ ...styles.tdCenter, textAlign: 'left' }}>Nozzles Operation</td>
                                            <td style={styles.tdCenter}>{getVal('nozzlesOperation')}</td>
                                        </tr>
                                        <tr>
                                            <td style={{ ...styles.tdCenter, textAlign: 'left' }}>Tank Operation</td>
                                            <td style={styles.tdCenter}>{getVal('tankOperation')}</td>
                                        </tr>

                                        {/* Row 8 */}
                                        <tr>
                                            <td style={styles.tdCenter}>8</td>
                                            <td colSpan={2} style={{ ...styles.tdCenter, textAlign: 'left' }}>Battery Failsafe</td>
                                            <td style={styles.tdCenter}>{getVal('batteryFailsafe')}</td>
                                        </tr>
                                    </tbody>
                                </table>

                                <div style={{
                                    border: '1px solid #000',
                                    borderTop: 'none', // attach to table seamlessly
                                    padding: '20px',
                                    minHeight: '120px',
                                    fontFamily: "'Segoe UI', Roboto, Helvetica, Arial, sans-serif"
                                }}>
                                    <div style={{ marginBottom: '30px', fontSize: '11px' }}>Pilot Name: <strong>{submission?.footerData?.name || submission?.footerData?.pilotName || ''}</strong></div>
                                    <div style={{ fontSize: '11px' }}>Signature: <strong>{submission?.footerData?.signature ? '(Digitally Signed)' : 'Pending'}</strong></div>
                                </div>
                            </>
                        );
                    })() : schema?.formCode === 'CERTIFICATE' ? (
                        <div style={{ padding: '20px 40px', fontFamily: "'Times New Roman', Times, serif", color: '#000', lineHeight: '1.6', fontSize: '14px' }}>
                            <h1 style={{ textAlign: 'center', textDecoration: 'underline', marginBottom: '40px', fontSize: '24px', fontWeight: 'bold' }}>Certificate of Conformity.</h1>

                            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '20px' }}>
                                <div>
                                    <div style={{ marginBottom: '5px' }}>
                                        <strong>Certificate Number: </strong><span style={{ fontWeight: 'normal' }}>{submission?.headerData?.certificateNo || submission?.formData?.certificateNo || ''}</span>
                                    </div>
                                    <div>
                                        <strong>Order Number / PO Number: </strong><span style={{ fontWeight: 'normal' }}>{submission?.headerData?.orderNo || submission?.formData?.orderNo || ''}</span>
                                    </div>
                                </div>
                                <div style={{ fontWeight: 'bold' }}>
                                    Date: <span style={{ fontWeight: 'normal' }}>{submission?.headerData?.date ? new Date(submission.headerData.date).toLocaleDateString('en-GB') : ''}</span>
                                </div>
                            </div>

                            <div style={{ marginBottom: '30px', marginTop: '30px' }}>
                                <div><strong>To,</strong></div>
                                <div><strong>Name: </strong> {submission?.headerData?.name || submission?.formData?.name || ''}</div>
                                <div><strong>Address: </strong> {submission?.headerData?.address || submission?.formData?.address || ''}</div>
                                <div><strong>Pin Code: </strong> {submission?.headerData?.pinCode || submission?.formData?.pinCode || ''}</div>
                            </div>

                            <div style={{ textAlign: 'justify', marginBottom: '10px' }}>
                                This CERTIFICATE serves as an official confirmation regarding PO Number/ order Number <strong>{submission?.headerData?.orderNo || submission?.formData?.orderNo || ''}</strong> Cerebrospark Innovations
                                Private Limited is pleased to inform you that we will supply and deliver a quantity of <strong>{submission?.formData?.quantity || '1'}</strong> systems to your esteemed organization on
                                dated <strong>{submission?.headerData?.date ? new Date(submission.headerData.date).toLocaleDateString('en-GB') : ''}</strong>.
                            </div>

                            <div style={{ textAlign: 'justify', marginBottom: '30px' }}>
                                We assure you that all UAS models provided with fully adhere to the technical specifications detailed in the officially sanctioned
                                Type Certificate. Cerebrospark Innovations Private limited is committed to meeting all specified requirements and ensuring the
                                quality and compliance of the delivered systems.
                            </div>

                            <div style={{ marginBottom: '5px' }}>
                                <div>Reference:</div>
                                <div style={{ marginTop: '5px' }}><strong>Serial Number: </strong> <span style={{ fontWeight: 'normal' }}>{submission?.headerData?.serialNo || submission?.formData?.serialNo || submission?.drone?.serialNo || ''}</span></div>
                                <div style={{ marginTop: '10px', fontWeight: 'bold' }}>Type Certificate Number: T0725000003G</div>
                                <div style={{ marginTop: '10px', fontWeight: 'bold' }}>Date of issue of Type Certificate: 04 July, 2025</div>
                                <div style={{ marginTop: '15px', fontWeight: 'bold' }}>Details of UAS:</div>
                            </div>

                            <table style={{ width: '100%', borderCollapse: 'collapse', marginBottom: '40px' }}>
                                <tbody>
                                    <tr>
                                        <td style={{ border: '1px solid #000', padding: '12px 14px', fontWeight: 'bold', width: '60%' }}>MODEL NO.: CS_KRISHI_10L</td>
                                        <td style={{ border: '1px solid #000', padding: '12px 14px', fontWeight: 'bold' }}>
                                            SERIAL NO: <span style={{ fontWeight: 'normal' }}>{submission?.headerData?.serialNo || submission?.formData?.serialNo || submission?.drone?.serialNo || ''}</span>
                                        </td>
                                    </tr>
                                    <tr>
                                        <td style={{ border: '1px solid #000', padding: '6px 8px', fontWeight: 'bold' }}>Flight Controller Number :</td>
                                        <td style={{ border: '1px solid #000', padding: '6px 8px' }}>{submission?.formData?.flightControllerNo || ''}</td>
                                    </tr>
                                    <tr>
                                        <td style={{ border: '1px solid #000', padding: '6px 8px', fontWeight: 'bold' }}>GCS Number :</td>
                                        <td style={{ border: '1px solid #000', padding: '6px 8px' }}>{submission?.formData?.gcsNumber || ''}</td>
                                    </tr>
                                    <tr>
                                        <td style={{ border: '1px solid #000', padding: '6px 8px', fontWeight: 'bold' }}>Obstacle Avoidance Number:</td>
                                        <td style={{ border: '1px solid #000', padding: '6px 8px' }}>{submission?.formData?.obstacleAvoidanceNo || ''}</td>
                                    </tr>
                                    <tr>
                                        <td style={{ border: '1px solid #000', padding: '6px 8px', fontWeight: 'bold' }}>Ground Radar Number:</td>
                                        <td style={{ border: '1px solid #000', padding: '6px 8px' }}>{submission?.formData?.groundRadarNo || ''}</td>
                                    </tr>
                                    <tr>
                                        <td style={{ border: '1px solid #000', padding: '6px 8px', fontWeight: 'bold' }}>GPS Number :</td>
                                        <td style={{ border: '1px solid #000', padding: '6px 8px' }}>{submission?.formData?.gpsNumber || ''}</td>
                                    </tr>
                                    <tr>
                                        <td style={{ border: '1px solid #000', padding: '6px 8px', fontWeight: 'bold' }}>UIN Number:</td>
                                        <td style={{ border: '1px solid #000', padding: '10px 14px' }}>{submission?.formData?.uinNumber || ''}</td>
                                    </tr>
                                </tbody>
                            </table>

                            <div style={{ marginTop: '80px' }}>
                                <div>Sincerely,</div>
                                <div>For,</div>
                                <div>Cerebrospark Innovations Private Limited.</div>
                            </div>
                        </div>
                    ) : schema?.formCode === 'QA_SOLDERING' ? (() => {
                        const getVal = (field) => submission?.formData?.[field] || '';
                        return (
                            <>
                                <table style={{ ...styles.mainTable, tableLayout: 'fixed', marginBottom: 0 }}>
                                    <thead>
                                        <tr>
                                            <th style={{ ...styles.th, width: '40px' }}>SR.<br />NO</th>
                                            <th colSpan={2} style={styles.th}>PARAMETERS</th>
                                            <th style={{ ...styles.th, width: '90px' }}>Approved<br />(YES/ NO)</th>
                                            <th style={styles.th}>REMARK</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {/* Row 1: Motor 1..6 */}
                                        <tr>
                                            <td rowSpan={6} style={{ ...styles.tdCenter, fontWeight: 'bold' }}>1</td>
                                            <td rowSpan={6} style={{ ...styles.td, fontWeight: 'bold', verticalAlign: 'middle', width: '35%' }}>
                                                Check solder connection of motor and XT60 connectors
                                            </td>
                                            <td style={{ ...styles.tdCenter, fontWeight: 'bold' }}>Motor 1</td>
                                            <td style={styles.tdCenter}>{getVal('motor1')}</td>
                                            <td style={styles.tdCenter}>{getVal('motor1_remark')}</td>
                                        </tr>
                                        <tr>
                                            <td style={{ ...styles.tdCenter, fontWeight: 'bold' }}>Motor 2</td>
                                            <td style={styles.tdCenter}>{getVal('motor2')}</td>
                                            <td style={styles.tdCenter}>{getVal('motor2_remark')}</td>
                                        </tr>
                                        <tr>
                                            <td style={{ ...styles.tdCenter, fontWeight: 'bold' }}>Motor 3</td>
                                            <td style={styles.tdCenter}>{getVal('motor3')}</td>
                                            <td style={styles.tdCenter}>{getVal('motor3_remark')}</td>
                                        </tr>
                                        <tr>
                                            <td style={{ ...styles.tdCenter, fontWeight: 'bold' }}>Motor 4</td>
                                            <td style={styles.tdCenter}>{getVal('motor4')}</td>
                                            <td style={styles.tdCenter}>{getVal('motor4_remark')}</td>
                                        </tr>
                                        <tr>
                                            <td style={{ ...styles.tdCenter, fontWeight: 'bold' }}>Motor 5</td>
                                            <td style={styles.tdCenter}>{getVal('motor5')}</td>
                                            <td style={styles.tdCenter}>{getVal('motor5_remark')}</td>
                                        </tr>
                                        <tr>
                                            <td style={{ ...styles.tdCenter, fontWeight: 'bold' }}>Motor 6</td>
                                            <td style={styles.tdCenter}>{getVal('motor6')}</td>
                                            <td style={styles.tdCenter}>{getVal('motor6_remark')}</td>
                                        </tr>

                                        {/* Row 2: PMU */}
                                        <tr>
                                            <td style={{ ...styles.tdCenter, fontWeight: 'bold' }}>2</td>
                                            <td colSpan={2} style={{ ...styles.td, fontWeight: 'bold' }}>Check solder connection of PMU and XT60 connector</td>
                                            <td style={styles.tdCenter}>{getVal('pmuCheck')}</td>
                                            <td style={styles.tdCenter}>{getVal('pmuCheck_remark')}</td>
                                        </tr>

                                        {/* Row 3: CAN HUB */}
                                        <tr>
                                            <td style={{ ...styles.tdCenter, fontWeight: 'bold' }}>3</td>
                                            <td colSpan={2} style={{ ...styles.td, fontWeight: 'bold' }}>Check solder connection of CAN HUB and XT60 connector</td>
                                            <td style={styles.tdCenter}>{getVal('canHubCheck')}</td>
                                            <td style={styles.tdCenter}>{getVal('canHubCheck_remark')}</td>
                                        </tr>

                                        {/* Row 4: Camera */}
                                        <tr>
                                            <td style={{ ...styles.tdCenter, fontWeight: 'bold' }}>4</td>
                                            <td colSpan={2} style={{ ...styles.td, fontWeight: 'bold' }}>Check solder connection of Camera and XT60 connector</td>
                                            <td style={styles.tdCenter}>{getVal('cameraCheck')}</td>
                                            <td style={styles.tdCenter}>{getVal('cameraCheck_remark')}</td>
                                        </tr>

                                        {/* Row 5: Pump */}
                                        <tr>
                                            <td style={{ ...styles.tdCenter, fontWeight: 'bold' }}>5</td>
                                            <td colSpan={2} style={{ ...styles.td, fontWeight: 'bold' }}>Check solder connection of Pump and XT60 connector</td>
                                            <td style={styles.tdCenter}>{getVal('pumpCheck')}</td>
                                            <td style={styles.tdCenter}>{getVal('pumpCheck_remark')}</td>
                                        </tr>

                                        {/* Row 6: Nozzle 1 & 2 */}
                                        <tr>
                                            <td rowSpan={2} style={{ ...styles.tdCenter, fontWeight: 'bold' }}>6</td>
                                            <td rowSpan={2} style={{ ...styles.td, fontWeight: 'bold', verticalAlign: 'middle' }}>
                                                Check solder connection of Centrifugal Nozzle and XT60 connector
                                            </td>
                                            <td style={{ ...styles.tdCenter, fontWeight: 'bold' }}>Nozzle 1</td>
                                            <td style={styles.tdCenter}>{getVal('nozzle1')}</td>
                                            <td style={styles.tdCenter}>{getVal('nozzle1_remark')}</td>
                                        </tr>
                                        <tr>
                                            <td style={{ ...styles.tdCenter, fontWeight: 'bold' }}>Nozzle 2</td>
                                            <td style={styles.tdCenter}>{getVal('nozzle2')}</td>
                                            <td style={styles.tdCenter}>{getVal('nozzle2_remark')}</td>
                                        </tr>

                                        {/* Row 7: Wire Mesh */}
                                        <tr>
                                            <td style={{ ...styles.tdCenter, fontWeight: 'bold' }}>7</td>
                                            <td colSpan={2} style={{ ...styles.td, fontWeight: 'bold' }}>Check the wire mesh is properly installed</td>
                                            <td style={styles.tdCenter}>{getVal('wireMesh')}</td>
                                            <td style={styles.tdCenter}>{getVal('wireMesh_remark')}</td>
                                        </tr>
                                    </tbody>
                                </table>

                                {/* Footer Verification Block exactly appended */}
                                <div style={{
                                    border: '1px solid #000',
                                    borderTop: 'none',
                                    padding: '10px',
                                    minHeight: '200px',
                                    fontFamily: 'Arial, sans-serif'
                                }}>
                                    <div style={{ marginBottom: '15px', fontSize: '13px', fontWeight: 'bold' }}>Verified by: -</div>
                                    <div style={{ marginBottom: '35px', fontSize: '13px', fontWeight: 'bold' }}>Name: <span style={{ fontWeight: 'normal' }}>{submission?.footerData?.name || submission?.footerData?.verifiedBy || ''}</span></div>
                                    <div style={{ marginBottom: '50px', fontSize: '13px', fontWeight: 'bold' }}>Signature: <span style={{ fontWeight: 'normal' }}>{submission?.footerData?.signature ? '(Digitally Signed)' : 'Pending'}</span></div>
                                    <div style={{ fontSize: '13px', fontWeight: 'bold' }}>Stamp:</div>
                                </div>
                            </>
                        );
                    })() : schema?.formCode === 'QA_MECHANICAL' ? (() => {
                        const getVal = (field) => submission?.formData?.[field] || '';
                        return (
                            <>
                                <table style={{ ...styles.mainTable, tableLayout: 'fixed', marginBottom: 0 }}>
                                    <thead>
                                        <tr>
                                            <th style={{ ...styles.th, width: '40px' }}>SR.<br />NO</th>
                                            <th colSpan={2} style={styles.th}>PARAMETERS</th>
                                            <th style={{ ...styles.th, width: '90px' }}>Approved<br />(YES/ NO)</th>
                                            <th style={styles.th}>REMARK</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {/* Row 1 */}
                                        <tr>
                                            <td style={{ ...styles.tdCenter, fontWeight: 'bold' }}>1</td>
                                            <td colSpan={2} style={{ ...styles.td, fontWeight: 'bold' }}>Check the folding orientation of arm (Clockwise)</td>
                                            <td style={styles.tdCenter}>{getVal('armOrientation')}</td>
                                            <td style={styles.tdCenter}>{getVal('armOrientation_remark')}</td>
                                        </tr>
                                        {/* Row 2 */}
                                        <tr>
                                            <td style={{ ...styles.tdCenter, fontWeight: 'bold' }}>2</td>
                                            <td colSpan={2} style={{ ...styles.td, fontWeight: 'bold' }}>Check the motor orientation</td>
                                            <td style={styles.tdCenter}>{getVal('motorOrientation')}</td>
                                            <td style={styles.tdCenter}>{getVal('motorOrientation_remark')}</td>
                                        </tr>
                                        {/* Row 3 */}
                                        <tr>
                                            <td style={{ ...styles.tdCenter, fontWeight: 'bold' }}>3</td>
                                            <td colSpan={2} style={{ ...styles.td, fontWeight: 'bold' }}>Randomly check any 5 bolts tightening with calibrated torque wrench</td>
                                            <td style={styles.tdCenter}>{getVal('boltsCheck')}</td>
                                            <td style={styles.tdCenter}>{getVal('boltsCheck_remark')}</td>
                                        </tr>
                                        {/* Row 4 */}
                                        <tr>
                                            <td style={{ ...styles.tdCenter, fontWeight: 'bold' }}>4</td>
                                            <td colSpan={2} style={{ ...styles.td, fontWeight: 'bold' }}>Check the Power cord polarity (Backside positive and Front negative)</td>
                                            <td style={styles.tdCenter}>{getVal('powerCordPolarity')}</td>
                                            <td style={styles.tdCenter}>{getVal('powerCordPolarity_remark')}</td>
                                        </tr>
                                        {/* Row 5 */}
                                        <tr>
                                            <td style={{ ...styles.tdCenter, fontWeight: 'bold' }}>5</td>
                                            <td colSpan={2} style={{ ...styles.td, fontWeight: 'bold' }}>Check whether power cord bolts are tight or not</td>
                                            <td style={styles.tdCenter}>{getVal('powerCordBolts')}</td>
                                            <td style={styles.tdCenter}>{getVal('powerCordBolts_remark')}</td>
                                        </tr>
                                        {/* Row 6 */}
                                        <tr>
                                            <td style={{ ...styles.tdCenter, fontWeight: 'bold' }}>6</td>
                                            <td colSpan={2} style={{ ...styles.td, fontWeight: 'bold' }}>Check if all bolts are inserted in hub to arm from top and bottom</td>
                                            <td style={styles.tdCenter}>{getVal('hubBolts')}</td>
                                            <td style={styles.tdCenter}>{getVal('hubBolts_remark')}</td>
                                        </tr>
                                        {/* Row 7 */}
                                        <tr>
                                            <td style={{ ...styles.tdCenter, fontWeight: 'bold' }}>7</td>
                                            <td colSpan={2} style={{ ...styles.td, fontWeight: 'bold' }}>Check if landing gear joint is attached properly to hub</td>
                                            <td style={styles.tdCenter}>{getVal('landingGearJoint')}</td>
                                            <td style={styles.tdCenter}>{getVal('landingGearJoint_remark')}</td>
                                        </tr>
                                        {/* Row 8 */}
                                        <tr>
                                            <td style={{ ...styles.tdCenter, fontWeight: 'bold' }}>8</td>
                                            <td colSpan={2} style={{ ...styles.td, fontWeight: 'bold' }}>Check vertical landing gear is attached firmly to landing gear</td>
                                            <td style={styles.tdCenter}>{getVal('verticalLandingGear')}</td>
                                            <td style={styles.tdCenter}>{getVal('verticalLandingGear_remark')}</td>
                                        </tr>
                                        {/* Row 9 */}
                                        <tr>
                                            <td style={{ ...styles.tdCenter, fontWeight: 'bold' }}>9</td>
                                            <td colSpan={2} style={{ ...styles.td, fontWeight: 'bold' }}>Check Horizontal landing gear are firmly attached</td>
                                            <td style={styles.tdCenter}>{getVal('horizontalLandingGear')}</td>
                                            <td style={styles.tdCenter}>{getVal('horizontalLandingGear_remark')}</td>
                                        </tr>
                                        {/* Row 10 */}
                                        <tr>
                                            <td rowSpan={6} style={{ ...styles.tdCenter, fontWeight: 'bold' }}>10</td>
                                            <td rowSpan={6} style={{ ...styles.td, fontWeight: 'bold', verticalAlign: 'middle', width: '35%' }}>
                                                Check if motor number is correct on respective arm
                                            </td>
                                            <td style={{ ...styles.tdCenter, fontWeight: 'bold' }}>Motor number 1</td>
                                            <td style={styles.tdCenter}>{getVal('motorNumber1')}</td>
                                            <td style={styles.tdCenter}>{getVal('motorNumber1_remark')}</td>
                                        </tr>
                                        <tr>
                                            <td style={{ ...styles.tdCenter, fontWeight: 'bold' }}>Motor number 2</td>
                                            <td style={styles.tdCenter}>{getVal('motorNumber2')}</td>
                                            <td style={styles.tdCenter}>{getVal('motorNumber2_remark')}</td>
                                        </tr>
                                        <tr>
                                            <td style={{ ...styles.tdCenter, fontWeight: 'bold' }}>Motor number 3</td>
                                            <td style={styles.tdCenter}>{getVal('motorNumber3')}</td>
                                            <td style={styles.tdCenter}>{getVal('motorNumber3_remark')}</td>
                                        </tr>
                                        <tr>
                                            <td style={{ ...styles.tdCenter, fontWeight: 'bold' }}>Motor number 4</td>
                                            <td style={styles.tdCenter}>{getVal('motorNumber4')}</td>
                                            <td style={styles.tdCenter}>{getVal('motorNumber4_remark')}</td>
                                        </tr>
                                        <tr>
                                            <td style={{ ...styles.tdCenter, fontWeight: 'bold' }}>Motor number 5</td>
                                            <td style={styles.tdCenter}>{getVal('motorNumber5')}</td>
                                            <td style={styles.tdCenter}>{getVal('motorNumber5_remark')}</td>
                                        </tr>
                                        <tr>
                                            <td style={{ ...styles.tdCenter, fontWeight: 'bold' }}>Motor number 6</td>
                                            <td style={styles.tdCenter}>{getVal('motorNumber6')}</td>
                                            <td style={styles.tdCenter}>{getVal('motorNumber6_remark')}</td>
                                        </tr>
                                    </tbody>
                                </table>

                                {/* Footer Verification Block exactly appended */}
                                <div style={{
                                    border: '1px solid #000',
                                    borderTop: 'none',
                                    padding: '10px',
                                    minHeight: '200px',
                                    fontFamily: 'Arial, sans-serif'
                                }}>
                                    <div style={{ marginBottom: '15px', fontSize: '13px', fontWeight: 'bold' }}>Verified by: -</div>
                                    <div style={{ marginBottom: '35px', fontSize: '13px', fontWeight: 'bold' }}>Name: <span style={{ fontWeight: 'normal' }}>{submission?.footerData?.name || submission?.footerData?.verifiedBy || ''}</span></div>
                                    <div style={{ marginBottom: '50px', fontSize: '13px', fontWeight: 'bold' }}>Signature: <span style={{ fontWeight: 'normal' }}>{submission?.footerData?.signature ? '(Digitally Signed)' : 'Pending'}</span></div>
                                    <div style={{ fontSize: '13px', fontWeight: 'bold' }}>Stamp:</div>
                                </div>
                            </>
                        );
                    })() : schema?.formCode === 'QA_ELECTRONIC' ? (() => {
                        const getVal = (field) => submission?.formData?.[field] || '';
                        return (
                            <>
                                <table style={{ ...styles.mainTable, tableLayout: 'fixed', marginBottom: 0 }}>
                                    <thead>
                                        <tr>
                                            <th style={{ ...styles.th, width: '40px' }}>SR.<br />NO</th>
                                            <th colSpan={2} style={styles.th}>PARAMETERS</th>
                                            <th style={{ ...styles.th, width: '90px' }}>Approved<br />(YES/ NO)</th>
                                            <th style={styles.th}>REMARK</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {/* Row 1: Positions (5 sub-rows) */}
                                        <tr>
                                            <td rowSpan={5} style={{ ...styles.tdCenter, fontWeight: 'bold' }}>1</td>
                                            <td rowSpan={5} style={{ ...styles.td, fontWeight: 'bold', verticalAlign: 'middle', width: '35%' }}>
                                                Check the position of components
                                            </td>
                                            <td style={{ ...styles.tdCenter, fontWeight: 'bold' }}>Flight controller</td>
                                            <td style={styles.tdCenter}>{getVal('fcPosition')}</td>
                                            <td style={styles.tdCenter}>{getVal('fcPosition_remark')}</td>
                                        </tr>
                                        <tr>
                                            <td style={{ ...styles.tdCenter, fontWeight: 'bold' }}>PMU</td>
                                            <td style={styles.tdCenter}>{getVal('pmuPosition')}</td>
                                            <td style={styles.tdCenter}>{getVal('pmuPosition_remark')}</td>
                                        </tr>
                                        <tr>
                                            <td style={{ ...styles.tdCenter, fontWeight: 'bold' }}>CANHUB</td>
                                            <td style={styles.tdCenter}>{getVal('canhubPosition')}</td>
                                            <td style={styles.tdCenter}>{getVal('canhubPosition_remark')}</td>
                                        </tr>
                                        <tr>
                                            <td style={{ ...styles.tdCenter, fontWeight: 'bold' }}>Receiver</td>
                                            <td style={styles.tdCenter}>{getVal('receiverPosition')}</td>
                                            <td style={styles.tdCenter}>{getVal('receiverPosition_remark')}</td>
                                        </tr>
                                        <tr>
                                            <td style={{ ...styles.tdCenter, fontWeight: 'bold' }}>PDB</td>
                                            <td style={styles.tdCenter}>{getVal('pdbPosition')}</td>
                                            <td style={styles.tdCenter}>{getVal('pdbPosition_remark')}</td>
                                        </tr>

                                        {/* Row 2 */}
                                        <tr>
                                            <td style={{ ...styles.tdCenter, fontWeight: 'bold' }}>2</td>
                                            <td colSpan={2} style={{ ...styles.td, fontWeight: 'bold' }}>Check the motor connections to flight controller</td>
                                            <td style={styles.tdCenter}>{getVal('motorConnections')}</td>
                                            <td style={styles.tdCenter}>{getVal('motorConnections_remark')}</td>
                                        </tr>

                                        {/* Row 3 */}
                                        <tr>
                                            <td style={{ ...styles.tdCenter, fontWeight: 'bold' }}>3</td>
                                            <td colSpan={2} style={{ ...styles.td, fontWeight: 'bold' }}>Check the camera direction, position and connection.</td>
                                            <td style={styles.tdCenter}>{getVal('cameraCheck')}</td>
                                            <td style={styles.tdCenter}>{getVal('cameraCheck_remark')}</td>
                                        </tr>

                                        {/* Row 4 */}
                                        <tr>
                                            <td style={{ ...styles.tdCenter, fontWeight: 'bold' }}>4</td>
                                            <td colSpan={2} style={{ ...styles.td, fontWeight: 'bold' }}>Check the direction of GPS</td>
                                            <td style={styles.tdCenter}>{getVal('gpsDirection')}</td>
                                            <td style={styles.tdCenter}>{getVal('gpsDirection_remark')}</td>
                                        </tr>

                                        {/* Row 5 */}
                                        <tr>
                                            <td style={{ ...styles.tdCenter, fontWeight: 'bold' }}>5</td>
                                            <td colSpan={2} style={{ ...styles.td, fontWeight: 'bold' }}>Check the position of antenna</td>
                                            <td style={styles.tdCenter}>{getVal('antennaPosition')}</td>
                                            <td style={styles.tdCenter}>{getVal('antennaPosition_remark')}</td>
                                        </tr>

                                        {/* Row 6 */}
                                        <tr>
                                            <td style={{ ...styles.tdCenter, fontWeight: 'bold' }}>6</td>
                                            <td colSpan={2} style={{ ...styles.td, fontWeight: 'bold' }}>Check the connections of flight controller</td>
                                            <td style={styles.tdCenter}>{getVal('fcConnections')}</td>
                                            <td style={styles.tdCenter}>{getVal('fcConnections_remark')}</td>
                                        </tr>
                                        {/* Row 7 */}
                                        <tr>
                                            <td style={{ ...styles.tdCenter, fontWeight: 'bold' }}>7</td>
                                            <td colSpan={2} style={{ ...styles.td, fontWeight: 'bold' }}>Check if all electronics are stuck properly to plate using 3M tape</td>
                                            <td style={styles.tdCenter}>{getVal('electronicsTape')}</td>
                                            <td style={styles.tdCenter}>{getVal('electronicsTape_remark')}</td>
                                        </tr>
                                        {/* Row 8 */}
                                        <tr>
                                            <td rowSpan={6} style={{ ...styles.tdCenter, fontWeight: 'bold' }}>8</td>
                                            <td rowSpan={6} style={{ ...styles.td, fontWeight: 'bold', verticalAlign: 'middle', width: '35%' }}>
                                                Check if all motor number is correctly installed
                                            </td>
                                            <td style={{ ...styles.tdCenter, fontWeight: 'bold' }}>Motor number 1</td>
                                            <td style={styles.tdCenter}>{getVal('motorNumber1')}</td>
                                            <td style={styles.tdCenter}>{getVal('motorNumber1_remark')}</td>
                                        </tr>
                                        <tr>
                                            <td style={{ ...styles.tdCenter, fontWeight: 'bold' }}>Motor number 2</td>
                                            <td style={styles.tdCenter}>{getVal('motorNumber2')}</td>
                                            <td style={styles.tdCenter}>{getVal('motorNumber2_remark')}</td>
                                        </tr>
                                        <tr>
                                            <td style={{ ...styles.tdCenter, fontWeight: 'bold' }}>Motor number 3</td>
                                            <td style={styles.tdCenter}>{getVal('motorNumber3')}</td>
                                            <td style={styles.tdCenter}>{getVal('motorNumber3_remark')}</td>
                                        </tr>
                                        <tr>
                                            <td style={{ ...styles.tdCenter, fontWeight: 'bold' }}>Motor number 4</td>
                                            <td style={styles.tdCenter}>{getVal('motorNumber4')}</td>
                                            <td style={styles.tdCenter}>{getVal('motorNumber4_remark')}</td>
                                        </tr>
                                        <tr>
                                            <td style={{ ...styles.tdCenter, fontWeight: 'bold' }}>Motor number 5</td>
                                            <td style={styles.tdCenter}>{getVal('motorNumber5')}</td>
                                            <td style={styles.tdCenter}>{getVal('motorNumber5_remark')}</td>
                                        </tr>
                                        <tr>
                                            <td style={{ ...styles.tdCenter, fontWeight: 'bold' }}>Motor number 6</td>
                                            <td style={styles.tdCenter}>{getVal('motorNumber6')}</td>
                                            <td style={styles.tdCenter}>{getVal('motorNumber6_remark')}</td>
                                        </tr>
                                    </tbody>
                                </table>

                                {/* Footer Verification Block exactly appended */}
                                <div style={{
                                    border: '1px solid #000',
                                    borderTop: 'none',
                                    padding: '10px',
                                    minHeight: '200px',
                                    fontFamily: 'Arial, sans-serif'
                                }}>
                                    <div style={{ marginBottom: '15px', fontSize: '13px', fontWeight: 'bold' }}>Verified by: -</div>
                                    <div style={{ marginBottom: '35px', fontSize: '13px', fontWeight: 'bold' }}>Name: <span style={{ fontWeight: 'normal' }}>{submission?.footerData?.name || submission?.footerData?.verifiedBy || ''}</span></div>
                                    <div style={{ marginBottom: '50px', fontSize: '13px', fontWeight: 'bold' }}>Signature: <span style={{ fontWeight: 'normal' }}>{submission?.footerData?.signature ? '(Digitally Signed)' : 'Pending'}</span></div>
                                    <div style={{ fontSize: '13px', fontWeight: 'bold' }}>Stamp:</div>
                                </div>
                            </>
                        );
                    })() : schema?.formCode === 'QA_PAYLOAD' ? (() => {
                        const getVal = (field) => submission?.formData?.[field] || '';
                        return (
                            <>
                                <table style={{ ...styles.mainTable, tableLayout: 'fixed', marginBottom: 0 }}>
                                    <thead>
                                        <tr>
                                            <th style={{ ...styles.th, width: '40px' }}>SR.<br />NO</th>
                                            <th style={styles.th}>PARAMETERS</th>
                                            <th style={{ ...styles.th, width: '90px' }}>Approved<br />(YES/ NO)</th>
                                            <th style={styles.th}>REMARK</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {/* Row 1 */}
                                        <tr>
                                            <td style={{ ...styles.tdCenter, fontWeight: 'bold' }}>1</td>
                                            <td style={{ ...styles.td, fontWeight: 'bold' }}>Check the mounting of Obstacle Avoidance</td>
                                            <td style={styles.tdCenter}>{getVal('obstacleAvoidance')}</td>
                                            <td style={styles.tdCenter}>{getVal('obstacleAvoidance_remark')}</td>
                                        </tr>
                                        {/* Row 2 */}
                                        <tr>
                                            <td style={{ ...styles.tdCenter, fontWeight: 'bold' }}>2</td>
                                            <td style={{ ...styles.td, fontWeight: 'bold' }}>Check the mounting of Ground Radar</td>
                                            <td style={styles.tdCenter}>{getVal('groundRadar')}</td>
                                            <td style={styles.tdCenter}>{getVal('groundRadar_remark')}</td>
                                        </tr>
                                        {/* Row 3 */}
                                        <tr>
                                            <td style={{ ...styles.tdCenter, fontWeight: 'bold' }}>3</td>
                                            <td style={{ ...styles.td, fontWeight: 'bold' }}>Check the mounting of Pump</td>
                                            <td style={styles.tdCenter}>{getVal('pumpMounting')}</td>
                                            <td style={styles.tdCenter}>{getVal('pumpMounting_remark')}</td>
                                        </tr>
                                        {/* Row 4 */}
                                        <tr>
                                            <td style={{ ...styles.tdCenter, fontWeight: 'bold' }}>4</td>
                                            <td style={{ ...styles.td, fontWeight: 'bold' }}>Check the direction of flowmeter</td>
                                            <td style={styles.tdCenter}>{getVal('flowmeterDirection')}</td>
                                            <td style={styles.tdCenter}>{getVal('flowmeterDirection_remark')}</td>
                                        </tr>
                                        {/* Row 5 */}
                                        <tr>
                                            <td style={{ ...styles.tdCenter, fontWeight: 'bold' }}>5</td>
                                            <td style={{ ...styles.td, fontWeight: 'bold' }}>Check the orientation of tank. (Cap should be in front)</td>
                                            <td style={styles.tdCenter}>{getVal('tankOrientation')}</td>
                                            <td style={styles.tdCenter}>{getVal('tankOrientation_remark')}</td>
                                        </tr>
                                        {/* Row 6 */}
                                        <tr>
                                            <td style={{ ...styles.tdCenter, fontWeight: 'bold' }}>6</td>
                                            <td style={{ ...styles.td, fontWeight: 'bold' }}>Check attachments of water flow tube</td>
                                            <td style={styles.tdCenter}>{getVal('waterFlowTube')}</td>
                                            <td style={styles.tdCenter}>{getVal('waterFlowTube_remark')}</td>
                                        </tr>
                                        {/* Row 7 */}
                                        <tr>
                                            <td style={{ ...styles.tdCenter, fontWeight: 'bold' }}>7</td>
                                            <td style={{ ...styles.td, fontWeight: 'bold' }}>Randomly check any 5 bolts tightening with calibrated torque wrench</td>
                                            <td style={styles.tdCenter}>{getVal('boltsCheck')}</td>
                                            <td style={styles.tdCenter}>{getVal('boltsCheck_remark')}</td>
                                        </tr>
                                    </tbody>
                                </table>

                                {/* Footer Verification Block exactly appended */}
                                <div style={{
                                    border: '1px solid #000',
                                    borderTop: 'none',
                                    padding: '10px',
                                    minHeight: '200px',
                                    fontFamily: 'Arial, sans-serif'
                                }}>
                                    <div style={{ marginBottom: '15px', fontSize: '13px', fontWeight: 'bold' }}>Verified by: -</div>
                                    <div style={{ marginBottom: '35px', fontSize: '13px', fontWeight: 'bold' }}>Name: <span style={{ fontWeight: 'normal' }}>{submission?.footerData?.name || submission?.footerData?.verifiedBy || ''}</span></div>
                                    <div style={{ marginBottom: '50px', fontSize: '13px', fontWeight: 'bold' }}>Signature: <span style={{ fontWeight: 'normal' }}>{submission?.footerData?.signature ? '(Digitally Signed)' : 'Pending'}</span></div>
                                    <div style={{ fontSize: '13px', fontWeight: 'bold' }}>Stamp:</div>
                                </div>
                            </>
                        );
                    })() : schema?.formCode === 'QA_CALIBRATION' ? (() => {
                        const getVal = (field) => submission?.formData?.[field] || '';
                        return (
                            <>
                                <table style={{ ...styles.mainTable, tableLayout: 'fixed', marginBottom: 0 }}>
                                    <thead>
                                        <tr>
                                            <th style={{ ...styles.th, width: '40px' }}>SR.<br />NO</th>
                                            <th colSpan={2} style={styles.th}>PARAMETERS</th>
                                            <th style={{ ...styles.th, width: '90px' }}>Approved<br />(YES/ NO)</th>
                                            <th style={styles.th}>REMARK</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {/* Row 1 */}
                                        <tr>
                                            <td rowSpan={22} style={{ ...styles.tdCenter, fontWeight: 'bold' }}>1</td>
                                            <td rowSpan={22} style={{ ...styles.td, fontWeight: 'bold', verticalAlign: 'middle', width: '25%' }}>Check all the<br />parameters</td>
                                            <td style={styles.td}>RC calibration</td>
                                            <td style={styles.tdCenter}><strong>{getVal('rcCalibration')}</strong></td>
                                            <td style={styles.tdCenter}>{getVal('rcCalibration_remark')}</td>
                                        </tr>
                                        <tr>
                                            <td style={styles.td}>Low voltage protection: Return to Home</td>
                                            <td style={styles.tdCenter}><strong>{getVal('lowVoltageProtection')}</strong></td>
                                            <td style={styles.tdCenter}>{getVal('lowVoltageProtection_remark')}</td>
                                        </tr>
                                        <tr>
                                            <td style={styles.td}>
                                                Low voltage alarm: 1<sup>st</sup> level – 42 V<br />
                                                <span style={{ display: 'inline-block', width: '82px' }}></span> 2<sup>nd</sup> level – 41 V
                                            </td>
                                            <td style={styles.tdCenter}><strong>{getVal('lowVoltageAlarm')}</strong></td>
                                            <td style={styles.tdCenter}>{getVal('lowVoltageAlarm_remark')}</td>
                                        </tr>
                                        <tr>
                                            <td style={styles.td}>PMU calibration</td>
                                            <td style={styles.tdCenter}><strong>{getVal('pmuCalibration')}</strong></td>
                                            <td style={styles.tdCenter}>{getVal('pmuCalibration_remark')}</td>
                                        </tr>
                                        <tr>
                                            <td style={styles.td}>Liquid protection: Return to Home</td>
                                            <td style={styles.tdCenter}><strong>{getVal('liquidProtection')}</strong></td>
                                            <td style={styles.tdCenter}>{getVal('liquidProtection_remark')}</td>
                                        </tr>
                                        <tr>
                                            <td style={styles.td}>Liquid Type: Single</td>
                                            <td style={styles.tdCenter}><strong>{getVal('liquidType')}</strong></td>
                                            <td style={styles.tdCenter}>{getVal('liquidType_remark')}</td>
                                        </tr>
                                        <tr>
                                            <td style={styles.td}>Level type: None</td>
                                            <td style={styles.tdCenter}><strong>{getVal('levelType')}</strong></td>
                                            <td style={styles.tdCenter}>{getVal('levelType_remark')}</td>
                                        </tr>
                                        <tr>
                                            <td style={styles.td}>Max speed in GPS mode: 8 m/s</td>
                                            <td style={styles.tdCenter}><strong>{getVal('maxSpeedGPS')}</strong></td>
                                            <td style={styles.tdCenter}>{getVal('maxSpeedGPS_remark')}</td>
                                        </tr>
                                        <tr>
                                            <td style={styles.td}>Max angle: 20°</td>
                                            <td style={styles.tdCenter}><strong>{getVal('maxAngle')}</strong></td>
                                            <td style={styles.tdCenter}>{getVal('maxAngle_remark')}</td>
                                        </tr>
                                        <tr>
                                            <td style={styles.td}>Back altitude: 20 m</td>
                                            <td style={styles.tdCenter}><strong>{getVal('backAltitude')}</strong></td>
                                            <td style={styles.tdCenter}>{getVal('backAltitude_remark')}</td>
                                        </tr>
                                        <tr>
                                            <td style={styles.td}>Spray width: 3.5 m</td>
                                            <td style={styles.tdCenter}><strong>{getVal('sprayWidth')}</strong></td>
                                            <td style={styles.tdCenter}>{getVal('sprayWidth_remark')}</td>
                                        </tr>
                                        <tr>
                                            <td style={styles.td}>Route speed: 8m/s</td>
                                            <td style={styles.tdCenter}><strong>{getVal('routeSpeed')}</strong></td>
                                            <td style={styles.tdCenter}>{getVal('routeSpeed_remark')}</td>
                                        </tr>
                                        <tr>
                                            <td style={styles.td}>Work end action: Return to Home</td>
                                            <td style={styles.tdCenter}><strong>{getVal('workEndAction')}</strong></td>
                                            <td style={styles.tdCenter}>{getVal('workEndAction_remark')}</td>
                                        </tr>
                                        <tr>
                                            <td style={styles.td}>
                                                Obstacle avoidance:<br />
                                                Sensitivity – 25 &nbsp;&nbsp;&nbsp;&nbsp; Action: Hang<br />
                                                Safe distance: 10 m &nbsp;&nbsp;&nbsp;&nbsp; Help distance: 6 m
                                            </td>
                                            <td style={styles.tdCenter}><strong>{getVal('obstacleAvoidance')}</strong></td>
                                            <td style={styles.tdCenter}>{getVal('obstacleAvoidance_remark')}</td>
                                        </tr>
                                        <tr>
                                            <td style={styles.td}>Maximum rising speed: 3 m</td>
                                            <td style={styles.tdCenter}><strong>{getVal('maxRisingSpeed')}</strong></td>
                                            <td style={styles.tdCenter}>{getVal('maxRisingSpeed_remark')}</td>
                                        </tr>
                                        <tr>
                                            <td style={styles.td}>Maximum descending speed: 1 m</td>
                                            <td style={styles.tdCenter}><strong>{getVal('maxDescendingSpeed')}</strong></td>
                                            <td style={styles.tdCenter}>{getVal('maxDescendingSpeed_remark')}</td>
                                        </tr>
                                        <tr>
                                            <td style={styles.td}>Land speed: 0.50 m</td>
                                            <td style={styles.tdCenter}><strong>{getVal('landSpeed')}</strong></td>
                                            <td style={styles.tdCenter}>{getVal('landSpeed_remark')}</td>
                                        </tr>
                                        <tr>
                                            <td style={styles.td}>Maximum altitude: 60 m</td>
                                            <td style={styles.tdCenter}><strong>{getVal('maxAltitude')}</strong></td>
                                            <td style={styles.tdCenter}>{getVal('maxAltitude_remark')}</td>
                                        </tr>
                                        <tr>
                                            <td style={styles.td}>Maximum Distance: 1000 m</td>
                                            <td style={styles.tdCenter}><strong>{getVal('maxDistance')}</strong></td>
                                            <td style={styles.tdCenter}>{getVal('maxDistance_remark')}</td>
                                        </tr>
                                        <tr>
                                            <td style={styles.td}>Map type: Google map</td>
                                            <td style={styles.tdCenter}><strong>{getVal('mapType')}</strong></td>
                                            <td style={styles.tdCenter}>{getVal('mapType_remark')}</td>
                                        </tr>
                                        <tr>
                                            <td style={styles.td}>Remote: T12</td>
                                            <td style={styles.tdCenter}><strong>{getVal('remoteT12')}</strong></td>
                                            <td style={styles.tdCenter}>{getVal('remoteT12_remark')}</td>
                                        </tr>
                                        <tr>
                                            <td style={styles.td}>Voice prompt: on</td>
                                            <td style={styles.tdCenter}><strong>{getVal('voicePrompt')}</strong></td>
                                            <td style={styles.tdCenter}>{getVal('voicePrompt_remark')}</td>
                                        </tr>
                                        {/* Row 2 */}
                                        <tr>
                                            <td style={{ ...styles.tdCenter, fontWeight: 'bold' }}>2</td>
                                            <td colSpan={2} style={{ ...styles.td, fontWeight: 'bold' }}>Check the canopy fixation and tightening.</td>
                                            <td style={styles.tdCenter}><strong>{getVal('canopyFixation')}</strong></td>
                                            <td style={styles.tdCenter}>{getVal('canopyFixation_remark')}</td>
                                        </tr>
                                        {/* Row 3 */}
                                        <tr>
                                            <td style={{ ...styles.tdCenter, fontWeight: 'bold' }}>3</td>
                                            <td colSpan={2} style={styles.td}>
                                                <strong>Compare Hash code and data code</strong><br />
                                                It should be as below:<br />
                                                Hash code:<br />
                                                510d534df3594be7f523e79be817371de6368f5da630751823a0ee60db182da3<br />
                                                Data code:<br />
                                                f44c6b28a63b9b22d27fc284cb83d852864cff791fb6293193c2c51212d00c8d
                                            </td>
                                            <td style={styles.tdCenter}><strong>{getVal('compareCodes')}</strong></td>
                                            <td style={styles.tdCenter}>{getVal('compareCodes_remark')}</td>
                                        </tr>
                                    </tbody>
                                </table>

                                {/* Footer Verification Block exactly appended */}
                                <div style={{
                                    border: '1px solid #000',
                                    borderTop: 'none',
                                    padding: '10px',
                                    minHeight: '200px',
                                    fontFamily: 'Arial, sans-serif'
                                }}>
                                    <div style={{ marginBottom: '15px', fontSize: '13px', fontWeight: 'bold' }}>Verified by: -</div>
                                    <div style={{ marginBottom: '35px', fontSize: '13px', fontWeight: 'bold' }}>Name: <span style={{ fontWeight: 'normal' }}>{submission?.footerData?.name || submission?.footerData?.verifiedBy || ''}</span></div>
                                    <div style={{ marginBottom: '50px', fontSize: '13px', fontWeight: 'bold' }}>Signature: <span style={{ fontWeight: 'normal' }}>{submission?.footerData?.signature ? '(Digitally Signed)' : 'Pending'}</span></div>
                                    <div style={{ fontSize: '13px', fontWeight: 'bold' }}>Stamp:</div>
                                </div>
                            </>
                        );
                    })() : ['UIN', 'D2_FORM', 'UIN_PHOTO', 'D3_FORM', 'PO', 'WORK_ORDER', 'MAINTENANCE_REPLACEMENT'].includes(schema?.formCode) ? null : (() => {
                        const isCustProfile = schema?.formCode === 'CUSTOMER_PROFILE';
                        return (
                            <table style={{ ...styles.mainTable, tableLayout: 'fixed' }}>
                                <thead>
                                    <tr>
                                        <th style={{ ...isQAForm ? styles.compactTh : styles.th, width: '40px' }}>SR.<br />NO</th>
                                        <th style={{ ...isQAForm ? styles.compactTh : styles.th, width: isCustProfile ? '200px' : 'auto' }}>
                                            {isCustProfile ? 'DETAILS' : 'PARAMETERS'}
                                        </th>
                                        <th style={{ ...isQAForm ? styles.compactTh : styles.th, width: isCustProfile ? 'auto' : '70px' }}>
                                            {isCustProfile ? '' : 'Approved (YES/ NO)'}
                                        </th>
                                        {!isCustProfile && <th style={{ ...isQAForm ? styles.compactTh : styles.th, width: '100px' }}>REMARK</th>}
                                    </tr>
                                </thead>
                                <tbody>
                                    {allFields.map((f, i) => (
                                        <tr key={i}>
                                            <td style={styles.tdCenter}>{i + 1}</td>
                                            <td style={{ ...styles.td, fontWeight: isCustProfile ? 'bold' : 'normal' }}>{f?.label || f?.name || ''}</td>
                                            <td style={styles.td}>
                                                <strong>{submission.formData?.[f?.name] || ''}</strong>
                                            </td>
                                            {!isCustProfile && (
                                                <td style={styles.tdCenter}>
                                                    {submission.formData?.[`${f?.name}_remark`] || ''}
                                                </td>
                                            )}
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        );
                    })()}

                    {['UIN', 'UIN_PHOTO'].includes(schema?.formCode) && submission?.formData?.uinPhoto && (
                        <div style={{ marginTop: '20px', textAlign: 'center' }}>
                            <img src={submission.formData.uinPhoto} alt="UIN Photo" style={{ maxWidth: '100%', maxHeight: '600px', objectFit: 'contain', border: '1px solid #ddd', borderRadius: '4px', padding: '4px' }} />
                        </div>
                    )}

                    {!['FLIGHT_TEST', 'CERTIFICATE', 'QA_SOLDERING', 'QA_MECHANICAL', 'QA_ELECTRONIC', 'QA_PAYLOAD', 'QA_CALIBRATION', 'PO', 'WORK_ORDER', 'MAINTENANCE_REPLACEMENT'].includes(schema?.formCode) && (
                        <div style={styles.footer}>
                            <p><strong>Verified by:</strong> {submission?.footerData?.name || submission?.footerData?.verifiedBy || ''}</p>
                            <p><strong>Signature:</strong> {submission?.footerData?.signature ? '(Digitally Signed)' : 'Pending'}</p>
                        </div>
                    )}

                    {submission?.headerData?.procurementType === 'all' && <ProcurementListImages />}
                </div>
            </div>
        );
    } catch (e) {
        console.error('[FormSubmissionView] RENDER CRASHED:', e);
        setRenderError(e);
        return null;
    }
};

export default FormSubmissionView;

