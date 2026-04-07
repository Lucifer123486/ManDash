import { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useReactToPrint } from 'react-to-print';
import { dronesAPI, formsAPI } from '../services/api';
import { formatSerialNo } from '../utils/serialFormatter';
import CompanyLogo from '../components/common/CompanyLogo';
import FormHeader from '../components/common/FormHeader';

const ManufacturingRecordView = () => {
    const { id } = useParams();
    const navigate = useNavigate();
    const printRef = useRef(null);
    const [drone, setDrone] = useState(null);
    const [submissions, setSubmissions] = useState([]);
    const [accessRequests, setAccessRequests] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchData = async () => {
            try {
                const droneRes = await dronesAPI.getById(id);
                setDrone(droneRes.data.data || droneRes.data);

                const submissionsRes = await dronesAPI.getDocuments(id);
                setSubmissions(submissionsRes.data.data || submissionsRes.data || []);
                setAccessRequests(submissionsRes.data.accessRequests || []);

                setLoading(false);
            } catch (err) {
                console.error("Error loading data:", err);
                setLoading(false);
            }
        };
        fetchData();
    }, [id]);

    const handlePrint = useReactToPrint({
        contentRef: printRef,
        documentTitle: `Manufacturing_Process_Record_${formatSerialNo(drone?.serialNo) || 'Draft'}`,
    });

    if (loading) return <div>Loading Record...</div>;
    if (!drone) return <div>Drone not found</div>;

    // --- HELPER FUNCTIONS TO EXTRACT DATA ---

    // Find submission by form code
    const getSub = (code) => submissions.find(s => s.formSchema?.formCode === code);

    // Get value from form data (Yes/No or text)
    const getVal = (sub, fieldName) => sub?.formData?.[fieldName] || '';

    // Specialized Date Logic as per requirement
    // Start Date: The date filled on the form by the staff (from formData.date field)
    //             Only for submitted/approved forms — draft does not count
    const getStartDate = (sub) => {
        if (!sub) return '';
        // Exclude drafts
        if (sub.status === 'draft') return '';

        // Use the date the staff filled in the form (formData.date field)
        const formDate = sub.formData?.date || sub.formData?.start_date || sub.formData?.Date;
        if (formDate) {
            return new Date(formDate).toLocaleDateString();
        }

        // Fallback: use when the form was first created (not draft)
        return new Date(sub.createdAt).toLocaleDateString();
    };

    // End Date: When the form was actually submitted by the staff
    //           (not when admin approved it)
    const getEndDate = (sub) => {
        if (!sub) return '';
        // Exclude drafts
        if (sub.status === 'draft') return '';

        // Use the actual submission timestamp
        if (sub.submittedAt) {
            return new Date(sub.submittedAt).toLocaleDateString();
        }
        // Fallback: updatedAt is set when form is submitted
        if (sub.updatedAt && sub.status !== 'draft') {
            return new Date(sub.updatedAt).toLocaleDateString();
        }

        return new Date(sub.createdAt).toLocaleDateString();
    };

    // Keep original getDate for generic use if needed
    const getDate = (sub, field = 'createdAt') => {
        if (!sub) return '';
        return new Date(sub[field] || sub.createdAt).toLocaleDateString();
    };

    // Get Operator Name (Submitted By)
    const getOperator = (sub) => sub?.submittedBy?.name || '';

    // Get Approver Name (Checked By)
    const getApprover = (sub) => {
        if (!sub) return '-';
        return sub.approvedBy?.name || sub.footerData?.verifiedBy || sub.footerData?.name || sub.footerData?.verified_by || '-';
    };

    // --- DATA MAPPING FOR TABLE ROWS ---
    // 1. Material Entry
    const subPO = getSub('PO');
    // 2. Material Inspection
    const subMRF = getSub('MRF');
    // 4. Material Distribution (Start Dates)
    const subSolder = getSub('QA_SOLDERING');
    const subMech = getSub('QA_MECHANICAL');
    const subPayload = getSub('QA_PAYLOAD');
    const subElec = getSub('QA_ELECTRONIC');
    const subCalib = getSub('QA_CALIBRATION');
    const subFlight = getSub('FLIGHT_TEST');

    // 13. Calibration Details
    const fwUpdate = getVal(subCalib, 'firmware_update') === 'YES' || getVal(subCalib, 'firmware') === 'YES';
    const motorLevel = getVal(subCalib, 'motor_levelling') === 'YES';
    const paramSet = getVal(subCalib, 'parameter_setting') === 'YES';
    const rcCalib = getVal(subCalib, 'rc_calibration') === 'YES';

    // 14. Flight Details
    const calibFlight = getVal(subFlight, 'compass_calibration') === 'YES'; // Example mapping
    const testFlight = getVal(subFlight, 'flight_stability') === 'YES'; // Example mapping

    // STYLES
    const styles = {
        container: {
            padding: '40px',
            fontFamily: "'Times New Roman', Times, serif",
            fontSize: '10px',
            color: '#000',
            maxWidth: '210mm',
            margin: '0 auto',
            background: 'white',
            border: '1px solid #eee'
        },
        headerLogoArea: {
            display: 'flex',
            alignItems: 'center',
            marginBottom: '20px',
        },
        headerTextArea: {
            flex: 1,
            textAlign: 'center',
            paddingRight: '60px' // Offset logo width to truly center
        },
        mainTitle: {
            fontSize: '28px',
            fontWeight: 'bold',
            fontFamily: "'Times New Roman', Times, serif",
            textTransform: 'uppercase',
            margin: 0
        },
        logoSubText: {
            fontSize: '10px',
            fontFamily: "'Times New Roman', Times, serif",
            marginTop: '2px',
            textAlign: 'center'
        },
        table: {
            width: '100%',
            borderCollapse: 'collapse',
            marginBottom: '0'
        },
        th: {
            border: '1px solid black',
            padding: '6px 4px',
            textAlign: 'center',
            fontWeight: 'bold',
            fontSize: '9px',
            background: '#fff'
        },
        td: {
            border: '1px solid black',
            padding: '4px 6px',
            textAlign: 'left',
            verticalAlign: 'middle',
            fontSize: '9px'
        },
        tdCenter: {
            border: '1px solid black',
            padding: '4px 6px',
            textAlign: 'center',
            verticalAlign: 'middle',
            fontSize: '9px'
        },
        sectionHeader: {
            textAlign: 'center',
            fontWeight: 'bold',
            padding: '6px',
            border: '1px solid black',
            borderBottom: 'none',
            fontSize: '10px',
            textTransform: 'uppercase'
        },
        footerBox: {
            marginTop: '0',
            border: '1px solid black',
            borderTop: 'none',
            padding: '10px',
            fontSize: '10px',
            lineHeight: '2'
        }
    };

    return (
        <div style={{ background: '#eee', minHeight: '100vh', padding: '20px' }}>
            <div className="no-print" style={{ marginBottom: '20px', textAlign: 'center' }}>
                <button
                    onClick={() => {
                        if (window.history.length > 1) {
                            navigate(-1);
                        } else {
                            window.close();
                        }
                    }}
                    style={{
                        marginRight: '10px',
                        padding: '10px 20px',
                        cursor: 'pointer',
                        border: '1px solid #ccc',
                        borderRadius: '4px',
                        background: '#fff'
                    }}
                >
                    Back
                </button>
                <button onClick={handlePrint} style={{ padding: '10px 20px', background: '#4caf50', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer' }}>Download / Print PDF</button>
            </div>

            <div ref={printRef} style={styles.container}>
                <FormHeader
                    formName="MANUFACTURING PROCESS RECORDS"
                    modelNo={drone.modelNo || drone.model}
                    serialNo={drone.serialNo}
                    date={new Date().toLocaleDateString()}
                    docRef={drone.docRef || 'CS_KRISHI_13'}
                    versionNo="1"
                />

                {/* MAIN PROCESS TABLE */}
                <table style={styles.table}>
                    <thead>
                        <tr>
                            <th style={{ ...styles.th, width: '40px' }}>Sr. No.</th>
                            <th style={{ ...styles.th, width: '80px' }}>In process Description</th>
                            <th style={{ ...styles.th, width: '140px' }}>Sub process Description</th>
                            <th style={{ ...styles.th, width: '70px' }}>Start Date</th>
                            <th style={{ ...styles.th, width: '70px' }}>End Date</th>
                            <th style={{ ...styles.th, width: '100px' }}>Operator Name</th>
                            <th style={{ ...styles.th, width: '100px' }}>Checked By</th>
                            <th style={{ ...styles.th, width: '80px' }}>Remark</th>
                        </tr>
                    </thead>
                    <tbody>
                        {/* 1. Material Entry */}
                        <tr>
                            <td style={styles.tdCenter}>1</td>
                            <td style={styles.td}><strong>Material Entry</strong></td>
                            <td style={styles.td}></td>
                            <td style={styles.tdCenter}>{getStartDate(subPO)}</td>
                            <td style={styles.tdCenter}>{getEndDate(subPO)}</td>
                            <td style={styles.tdCenter}>{getOperator(subPO)}</td>
                            <td style={styles.tdCenter}>{getApprover(subPO)}</td>
                            <td style={styles.tdCenter}>{subPO ? 'YES' : '-'}</td>
                        </tr>

                        {/* 2. Material Inspection */}
                        <tr>
                            <td rowSpan="3" style={styles.tdCenter}>2</td>
                            <td rowSpan="3" style={styles.td}><strong>Material Inspection</strong></td>
                            <td style={styles.td}>Quantity check</td>
                            <td style={styles.tdCenter}>{getStartDate(subMRF)}</td>
                            <td style={styles.tdCenter}>{getEndDate(subMRF)}</td>
                            <td style={styles.tdCenter}>{getOperator(subMRF)}</td>
                            <td style={styles.tdCenter}>{getApprover(subMRF)}</td>
                            <td style={styles.tdCenter}>{subMRF ? (getVal(subMRF, 'quantity_check') || 'YES') : '-'}</td>
                        </tr>
                        <tr>
                            <td style={styles.td}>Visual inspection</td>
                            <td style={styles.tdCenter}>{getStartDate(subMRF)}</td>
                            <td style={styles.tdCenter}>{getEndDate(subMRF)}</td>
                            <td style={styles.tdCenter}>{getOperator(subMRF)}</td>
                            <td style={styles.tdCenter}>{getApprover(subMRF)}</td>
                            <td style={styles.tdCenter}>{subMRF ? (getVal(subMRF, 'visual_check') || 'YES') : '-'}</td>
                        </tr>
                        <tr>
                            <td style={styles.td}>Testing</td>
                            <td style={styles.tdCenter}>{getStartDate(subMRF)}</td>
                            <td style={styles.tdCenter}>{getEndDate(subMRF)}</td>
                            <td style={styles.tdCenter}>{getOperator(subMRF)}</td>
                            <td style={styles.tdCenter}>{getApprover(subMRF)}</td>
                            <td style={styles.tdCenter}>{subMRF ? (getVal(subMRF, 'testing_check') || 'YES') : '-'}</td>
                        </tr>

                        {/* 3. Inventory Update */}
                        <tr>
                            <td style={styles.tdCenter}>3</td>
                            <td style={styles.td}><strong>Inventory Update</strong></td>
                            <td style={styles.td}></td>
                            <td style={styles.tdCenter}>{getStartDate(subMRF)}</td>
                            <td style={styles.tdCenter}>{getEndDate(subMRF)}</td>
                            <td style={styles.tdCenter}>{getOperator(subMRF)}</td>
                            <td style={styles.tdCenter}>{getApprover(subMRF)}</td>
                            <td style={styles.tdCenter}>{subMRF ? 'YES' : '-'}</td>
                        </tr>

                        {/* 4. Material Distribution */}
                        <tr>
                            <td rowSpan="5" style={styles.tdCenter}>4</td>
                            <td rowSpan="5" style={styles.td}><strong>Material Distribution</strong></td>
                            <td style={styles.td}>Soldering Station</td>
                            <td style={styles.tdCenter}>{getStartDate(subSolder)}</td>
                            <td style={styles.tdCenter}>{getEndDate(subSolder)}</td>
                            <td style={styles.tdCenter}>{getOperator(subSolder)}</td>
                            <td style={styles.tdCenter}>{getApprover(subSolder)}</td>
                            <td style={styles.tdCenter}>{subSolder ? 'YES' : '-'}</td>
                        </tr>
                        <tr>
                            <td style={styles.td}>Mechanical Assembly Station</td>
                            <td style={styles.tdCenter}>{getStartDate(subMech)}</td>
                            <td style={styles.tdCenter}>{getEndDate(subMech)}</td>
                            <td style={styles.tdCenter}>{getOperator(subMech)}</td>
                            <td style={styles.tdCenter}>{getApprover(subMech)}</td>
                            <td style={styles.tdCenter}>{subMech ? 'YES' : '-'}</td>
                        </tr>
                        <tr>
                            <td style={styles.td}>Payload Assembly</td>
                            <td style={styles.tdCenter}>{getStartDate(subPayload)}</td>
                            <td style={styles.tdCenter}>{getEndDate(subPayload)}</td>
                            <td style={styles.tdCenter}>{getOperator(subPayload)}</td>
                            <td style={styles.tdCenter}>{getApprover(subPayload)}</td>
                            <td style={styles.tdCenter}>{subPayload ? 'YES' : '-'}</td>
                        </tr>
                        <tr>
                            <td style={styles.td}>Electronic Assembly Station</td>
                            <td style={styles.tdCenter}>{getStartDate(subElec)}</td>
                            <td style={styles.tdCenter}>{getEndDate(subElec)}</td>
                            <td style={styles.tdCenter}>{getOperator(subElec)}</td>
                            <td style={styles.tdCenter}>{getApprover(subElec)}</td>
                            <td style={styles.tdCenter}>{subElec ? 'YES' : '-'}</td>
                        </tr>
                        <tr>
                            <td style={styles.td}>Calibration</td>
                            <td style={styles.tdCenter}>{getStartDate(subCalib)}</td>
                            <td style={styles.tdCenter}>{getEndDate(subCalib)}</td>
                            <td style={styles.tdCenter}>{getOperator(subCalib)}</td>
                            <td style={styles.tdCenter}>{getApprover(subCalib)}</td>
                            <td style={styles.tdCenter}>{subCalib ? 'YES' : '-'}</td>
                        </tr>

                        {/* 5. Soldering Station Operations */}
                        <tr>
                            <td style={styles.tdCenter}>5</td>
                            <td colSpan="2" style={styles.td}><strong>Soldering Station Operations</strong></td>
                            <td style={styles.tdCenter}>{getStartDate(subSolder)}</td>
                            <td style={styles.tdCenter}>{getEndDate(subSolder)}</td>
                            <td style={styles.tdCenter}>{getOperator(subSolder)}</td>
                            <td style={styles.tdCenter}>{getApprover(subSolder)}</td>
                            <td style={styles.tdCenter}>{subSolder ? 'YES' : '-'}</td>
                        </tr>

                        {/* 6. Soldering Station Job Quality Checks */}
                        <tr>
                            <td style={styles.tdCenter}>6</td>
                            <td colSpan="2" style={styles.td}><strong>Soldering Station Job Quality Checks</strong></td>
                            <td style={styles.tdCenter}>{getStartDate(subSolder)}</td>
                            <td style={styles.tdCenter}>{getEndDate(subSolder)}</td>
                            <td style={styles.tdCenter}>{getOperator(subSolder)}</td>
                            <td style={styles.tdCenter}>{getApprover(subSolder)}</td>
                            <td style={styles.tdCenter}>{subSolder ? 'OK' : '-'}</td>
                        </tr>

                        {/* 7. Mechanical Assembly Operations */}
                        <tr>
                            <td style={styles.tdCenter}>7</td>
                            <td colSpan="2" style={styles.td}><strong>Mechanical Assembly Operations</strong></td>
                            <td style={styles.tdCenter}>{getStartDate(subMech)}</td>
                            <td style={styles.tdCenter}>{getEndDate(subMech)}</td>
                            <td style={styles.tdCenter}>{getOperator(subMech)}</td>
                            <td style={styles.tdCenter}>{getApprover(subMech)}</td>
                            <td style={styles.tdCenter}>{subMech ? 'YES' : '-'}</td>
                        </tr>

                        {/* 8. Mechanical Assembly Job Quality Checks */}
                        <tr>
                            <td style={styles.tdCenter}>8</td>
                            <td colSpan="2" style={styles.td}><strong>Mechanical Assembly Job Quality Checks</strong></td>
                            <td style={styles.tdCenter}>{getStartDate(subMech)}</td>
                            <td style={styles.tdCenter}>{getEndDate(subMech)}</td>
                            <td style={styles.tdCenter}>{getOperator(subMech)}</td>
                            <td style={styles.tdCenter}>{getApprover(subMech)}</td>
                            <td style={styles.tdCenter}>{subMech ? 'OK' : '-'}</td>
                        </tr>

                        {/* 9. Payload Assembly Operations */}
                        <tr>
                            <td style={styles.tdCenter}>9</td>
                            <td colSpan="2" style={styles.td}><strong>Payload Assembly Operations</strong></td>
                            <td style={styles.tdCenter}>{getStartDate(subPayload)}</td>
                            <td style={styles.tdCenter}>{getEndDate(subPayload)}</td>
                            <td style={styles.tdCenter}>{getOperator(subPayload)}</td>
                            <td style={styles.tdCenter}>{getApprover(subPayload)}</td>
                            <td style={styles.tdCenter}>{subPayload ? 'YES' : '-'}</td>
                        </tr>

                        {/* 10. Payload Assembly Job Quality Checks */}
                        <tr>
                            <td style={styles.tdCenter}>10</td>
                            <td colSpan="2" style={styles.td}><strong>Payload Assembly Job Quality Checks</strong></td>
                            <td style={styles.tdCenter}>{getStartDate(subPayload)}</td>
                            <td style={styles.tdCenter}>{getEndDate(subPayload)}</td>
                            <td style={styles.tdCenter}>{getOperator(subPayload)}</td>
                            <td style={styles.tdCenter}>{getApprover(subPayload)}</td>
                            <td style={styles.tdCenter}>{subPayload ? 'OK' : '-'}</td>
                        </tr>

                        {/* 11. Electronic Assembly Operations */}
                        <tr>
                            <td style={styles.tdCenter}>11</td>
                            <td colSpan="2" style={styles.td}><strong>Electronic Assembly Operations</strong></td>
                            <td style={styles.tdCenter}>{getStartDate(subElec)}</td>
                            <td style={styles.tdCenter}>{getEndDate(subElec)}</td>
                            <td style={styles.tdCenter}>{getOperator(subElec)}</td>
                            <td style={styles.tdCenter}>{getApprover(subElec)}</td>
                            <td style={styles.tdCenter}>{subElec ? 'YES' : '-'}</td>
                        </tr>

                        {/* 12. Electronic Assembly Job Quality Checks */}
                        <tr>
                            <td style={styles.tdCenter}>12</td>
                            <td colSpan="2" style={styles.td}><strong>Electronic Assembly Job Quality Checks</strong></td>
                            <td style={styles.tdCenter}>{getStartDate(subElec)}</td>
                            <td style={styles.tdCenter}>{getEndDate(subElec)}</td>
                            <td style={styles.tdCenter}>{getOperator(subElec)}</td>
                            <td style={styles.tdCenter}>{getApprover(subElec)}</td>
                            <td style={styles.tdCenter}>{subElec ? 'OK' : '-'}</td>
                        </tr>

                        {/* 13. Calibration */}
                        <tr>
                            <td rowSpan="4" style={styles.tdCenter}>13</td>
                            <td rowSpan="4" style={styles.td}><strong>Calibration</strong></td>
                            <td style={styles.td}>Flashing of Firmware</td>
                            <td style={styles.tdCenter}>{getStartDate(subCalib)}</td>
                            <td style={styles.tdCenter}>{getEndDate(subCalib)}</td>
                            <td style={styles.tdCenter}>{getOperator(subCalib)}</td>
                            <td style={styles.tdCenter}>{getApprover(subCalib)}</td>
                            <td style={styles.tdCenter}>{fwUpdate ? 'Done' : '-'}</td>
                        </tr>
                        <tr>
                            <td style={styles.td}>Motor Levelling</td>
                            <td style={styles.tdCenter}>{getStartDate(subCalib)}</td>
                            <td style={styles.tdCenter}>{getEndDate(subCalib)}</td>
                            <td style={styles.tdCenter}>{getOperator(subCalib)}</td>
                            <td style={styles.tdCenter}>{getApprover(subCalib)}</td>
                            <td style={styles.tdCenter}>{motorLevel ? 'OK' : '-'}</td>
                        </tr>
                        <tr>
                            <td style={styles.td}>Advance Parameter Setting</td>
                            <td style={styles.tdCenter}>{getStartDate(subCalib)}</td>
                            <td style={styles.tdCenter}>{getEndDate(subCalib)}</td>
                            <td style={styles.tdCenter}>{getOperator(subCalib)}</td>
                            <td style={styles.tdCenter}>{getApprover(subCalib)}</td>
                            <td style={styles.tdCenter}>{paramSet ? 'Done' : '-'}</td>
                        </tr>
                        <tr>
                            <td style={styles.td}>RC Calibration</td>
                            <td style={styles.tdCenter}>{getStartDate(subCalib)}</td>
                            <td style={styles.tdCenter}>{getEndDate(subCalib)}</td>
                            <td style={styles.tdCenter}>{getOperator(subCalib)}</td>
                            <td style={styles.tdCenter}>{getApprover(subCalib)}</td>
                            <td style={styles.tdCenter}>{rcCalib ? 'Done' : '-'}</td>
                        </tr>

                        {/* 14. Flight Test */}
                        <tr>
                            <td rowSpan="2" style={styles.tdCenter}>14</td>
                            <td rowSpan="2" style={styles.td}><strong>Flight Test</strong></td>
                            <td style={styles.td}>Calibration</td>
                            <td style={styles.tdCenter}>{getStartDate(subFlight)}</td>
                            <td style={styles.tdCenter}>{getEndDate(subFlight)}</td>
                            <td style={styles.tdCenter}>{getOperator(subFlight)}</td>
                            <td style={styles.tdCenter}>{getApprover(subFlight)}</td>
                            <td style={styles.tdCenter}>{calibFlight ? 'Done' : '-'}</td>
                        </tr>
                        <tr>
                            <td style={styles.td}>Test flight</td>
                            <td style={styles.tdCenter}>{getStartDate(subFlight)}</td>
                            <td style={styles.tdCenter}>{getEndDate(subFlight)}</td>
                            <td style={styles.tdCenter}>{getOperator(subFlight)}</td>
                            <td style={styles.tdCenter}>{getApprover(subFlight)}</td>
                            <td style={styles.tdCenter}>{testFlight ? 'OK' : '-'}</td>
                        </tr>
                    </tbody>
                </table>

                {/* CONSOLIDATED FOOTER BOX */}
                <div style={styles.footerBox}>
                    <div><strong>Verified by: -</strong></div>
                    <div style={{ marginTop: '10px' }}><strong>Name:</strong></div>
                    <div style={{ marginTop: '10px' }}><strong>Designation:</strong></div>
                    <div style={{ marginTop: '10px' }}><strong>Signature:</strong></div>
                    <div style={{ marginTop: '10px' }}><strong>Stamp:</strong></div>
                </div>
            </div>
        </div>
    );
};

export default ManufacturingRecordView;
