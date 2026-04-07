import { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
import { formsAPI, dronesAPI, usersAPI, authAPI } from '../services/api';
import CompanyLogo from './common/CompanyLogo';
import FormHeader from './common/FormHeader';
import { useAuth } from '../context/AuthContext';
import { formatSerialNo } from '../utils/serialFormatter';

const FormRenderer = () => {
    const { id, formCode } = useParams();
    const [searchParams] = useSearchParams();
    const droneId = searchParams.get('droneId') || searchParams.get('drone'); // Support both droneId and drone params
    const navigate = useNavigate();

    const [schema, setSchema] = useState(null);
    const [drones, setDrones] = useState([]);
    const [selectedDrone, setSelectedDrone] = useState('');
    const [droneSerial, setDroneSerial] = useState('');

    const [headerData, setHeaderData] = useState({});
    const [formData, setFormData] = useState({});
    const [footerData, setFooterData] = useState({});

    const [loading, setLoading] = useState(true);
    const [submitting, setSubmitting] = useState(false);
    const [error, setError] = useState(null);
    const [staffList, setStaffList] = useState([]);

    const [visibleItems, setVisibleItems] = useState(1);
    const [user, setUser] = useState(null);

    const isPreview = searchParams.get('preview') === 'true';

    useEffect(() => {
        const userData = JSON.parse(localStorage.getItem('user'));
        setUser(userData);
    }, []);

    useEffect(() => {
        fetchSchema();
        fetchDrones();
        fetchStaff();

        const userData = JSON.parse(localStorage.getItem('user'));
        setUser(userData);

        const serial = searchParams.get('droneSerial');
        if (droneId) setSelectedDrone(droneId);
        if (serial) setDroneSerial(serial);
    }, [id, formCode]);

    const fetchStaff = async () => {
        try {
            const response = await usersAPI.getAll({ role: 'staff' });
            const list = response.data?.data || response.data || [];
            setStaffList(Array.isArray(list) ? list : []);
        } catch (error) {
            console.error('Error fetching staff:', error);
            setStaffList([]);
        }
    };





    const fetchSchema = async () => {
        try {
            const res = id
                ? await formsAPI.getSchemaById(id)
                : await formsAPI.getSchemaByCode(formCode);

            const schemaData = res.data?.data || res.data;
            if (!schemaData) throw new Error('Schema not found');
            setSchema(schemaData);

            // AUTO-FILL LOGIC
            const headerInit = {};
            const urlSerial = searchParams.get('droneSerial');
            const urlModel = searchParams.get('modelNo');
            const today = new Date().toISOString().split('T')[0];
            const nowTime = new Date().toLocaleTimeString('en-US', { hour12: false, hour: '2-digit', minute: '2-digit' });

            schemaData.headerFields?.forEach(f => {
                let val = f.defaultValue || '';

                // Auto-fill Rules
                if (f.name === 'date') val = today;
                if (f.name === 'dateOfService') val = today;
                if (f.name === 'time') val = nowTime;
                if ((f.name === 'serialNo' || f.name === 'droneSerialNo') && urlSerial) val = formatSerialNo(urlSerial);
                if (f.name === 'modelNo' && urlModel) val = formatSerialNo(urlModel);

                // SPECIAL: QA forms specific auto-fills
                const isQA = ['QA_SOLDERING', 'QA_MECHANICAL', 'QA_ELECTRONIC', 'QA_PAYLOAD', 'QA_CALIBRATION', 'FLIGHT_TEST', 'PACKAGING', 'DISPATCH'].includes(schemaData.formCode?.toUpperCase());
                if (isQA) {
                    if (f.name === 'issueDate') val = '04/03/2023';
                }

                headerInit[f.name] = val;
            });

            // Initial Issue No derivation
            const isQA = ['QA_SOLDERING', 'QA_MECHANICAL', 'QA_ELECTRONIC', 'QA_PAYLOAD', 'QA_CALIBRATION', 'FLIGHT_TEST', 'PACKAGING', 'DISPATCH'].includes(schemaData.formCode);
            if (isQA && headerInit.serialNo) {
                const match = headerInit.serialNo.match(/CSKRISHI_?(\d+)/);
                if (match) {
                    headerInit.issueNo = parseInt(match[1], 10).toString();
                }
            }

            setHeaderData(headerInit);

            // Initialize Footer Data with Default values
            const footerInit = {};
            schemaData.footerFields?.forEach(f => {
                footerInit[f.name] = f.defaultValue || '';
            });
            setFooterData(footerInit);
        } catch (err) {
            setError('Form not found');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        const currentCode = schema?.formCode?.toUpperCase();
        const isQA = ['QA_SOLDERING', 'QA_MECHANICAL', 'QA_ELECTRONIC', 'QA_PAYLOAD', 'QA_CALIBRATION', 'FLIGHT_TEST', 'PACKAGING', 'DISPATCH'].includes(currentCode);
        if (isQA && headerData.serialNo) {
            // Ensure CSKRISHI prefix
            if (!headerData.serialNo.startsWith('CSKRISHI')) {
                setHeaderData(prev => ({ ...prev, serialNo: 'CSKRISHI' + prev.serialNo.replace(/^[^0-9]*/, '') }));
                return;
            }

            // Derive Issue No
            const match = headerData.serialNo.match(/CSKRISHI_?(\d+)/);
            if (match) {
                const derivedNo = parseInt(match[1], 10).toString();
                if (headerData.issueNo !== derivedNo) {
                    setHeaderData(prev => ({ ...prev, issueNo: derivedNo }));
                }
            }
        }
    }, [headerData.serialNo, schema?.formCode]);

    // Cross-form auto-fill for Certificate
    useEffect(() => {
        if (schema?.formCode === 'CERTIFICATE' && selectedDrone) {
            const autoFillCertificate = async () => {
                try {
                    const droneRes = await dronesAPI.getById(selectedDrone);
                    const drone = droneRes?.data?.data;
                    if (!drone) return;

                    const order = drone.order;
                    const submissions = drone.forms || [];

                    // Use functional updates to avoid dependency issues
                    setHeaderData(prev => {
                        const next = { ...prev };
                        if (order) {
                            next.orderNo = order.poNumber || order.orderNumber || '';
                            next.name = order.customerName || '';
                            next.address = order.customerAddress || '';
                            next.pinCode = order.customerPinCode || '';
                        }
                        next.serialNo = drone.serialNo || '';

                        // Derive Certificate No if issueNo exists
                        if (next.issueNo) {
                            next.certificateNo = `CSI/CS_KRISHI_10L/${next.issueNo.padStart(3, '0')}`;
                        }
                        return next;
                    });

                    setFormData(prev => {
                        const next = { ...prev };
                        const comps = drone.components || {};

                        // Map technical specs
                        next.flightControllerNo = comps.flightControllerNumber || '';
                        next.gcsNumber = comps.gcsNumber || '';
                        next.obstacleAvoidanceNo = comps.obstacleAvoidanceNumber || '';
                        next.groundRadarNo = comps.groundRadarNumber || '';
                        next.gpsNumber = comps.gpsNumber || '';
                        next.uinNumber = comps.uinNumber || '';
                        next.serialNo = drone.serialNo || '';

                        // Fallback to submissions
                        submissions.forEach(sub => {
                            const code = sub.formSchema?.formCode;
                            if (code === 'ACTIVATION') {
                                if (!next.flightControllerNo) next.flightControllerNo = sub.formData?.flightControllerNo || '';
                                if (!next.gcsNumber) next.gcsNumber = sub.formData?.gcsNumber || '';
                                if (!next.obstacleAvoidanceNo) next.obstacleAvoidanceNo = sub.formData?.obstacleAvoidanceNo || '';
                                if (!next.groundRadarNo) next.groundRadarNo = sub.formData?.groundRadarNo || '';
                                if (!next.gpsNumber) next.gpsNumber = sub.formData?.gpsNumber || '';
                            }
                            if (code === 'UIN') {
                                if (!next.uinNumber) next.uinNumber = sub.formData?.uinNumber || '';
                            }
                        });
                        return next;
                    });

                } catch (err) {
                    console.error('Error auto-filling certificate:', err);
                }
            };
            autoFillCertificate();
        }
    }, [selectedDrone, schema?.formCode, headerData.issueNo]);

    // Load existing draft if any
    useEffect(() => {
        if (selectedDrone && schema?._id) {
            const fetchDraft = async () => {
                try {
                    // 1. Try fetching draft first
                    let res = await formsAPI.getSubmissions({
                        droneId: selectedDrone,
                        formSchemaId: schema._id,
                        status: 'draft'
                    });

                    let records = res.data.data;

                    // 2. If no draft, try fetching latest submitted (pending)
                    if (!records || records.length === 0) {
                        res = await formsAPI.getSubmissions({
                            droneId: selectedDrone,
                            formSchemaId: schema._id,
                            status: 'submitted'
                        });
                        records = res.data.data;
                    }

                    if (records && records.length > 0) {
                        const record = records[0];
                        setHeaderData(prev => ({ ...prev, ...(record.headerData || {}) }));
                        setFormData(prev => ({ ...prev, ...(record.formData || {}) }));
                        setFooterData(prev => ({ ...prev, ...(record.footerData || {}) }));
                    }
                } catch (err) {
                    console.error('Error fetching existing record:', err);
                }
            };
            fetchDraft();
        }
    }, [selectedDrone, schema?._id]);
    const fetchDrones = async () => {
        try {
            const res = await dronesAPI.getAll();
            setDrones(res.data.data || []);
        } catch { }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setSubmitting(true);

        try {
            // Check for Signature Verification
            const isVerifiedByLabel = (label) => {
                const l = label?.toLowerCase().trim() || '';
                return l.endsWith(' by') || ['authorised person', 'pilot name', 'verified by'].includes(l);
            };

            const verifiedByField = schema?.footerFields?.find(f => f?.label && isVerifiedByLabel(f.label));
            const signatureField = schema?.footerFields?.find(f => f?.label?.toLowerCase().trim() === 'signature');

            if (verifiedByField && signatureField) {
                const verifiedByName = footerData[verifiedByField.name];
                const signaturePwd = footerData[signatureField.name];

                if (!verifiedByName || !signaturePwd) {
                    alert(`Please select a staff member for ${verifiedByField.label} and provide signature password`);
                    setSubmitting(false);
                    return;
                }

                // Find staff user ID
                const staffUser = staffList.find(s => s.name === verifiedByName);
                if (!staffUser) {
                    alert('Selected staff member not found in user list');
                    setSubmitting(false);
                    return;
                }

                // Call backend verification
                try {
                    await authAPI.verifySignature(staffUser._id, signaturePwd);
                } catch (err) {
                    alert('Signature Verification Failed: Incorrect login password for ' + verifiedByName);
                    setSubmitting(false);
                    return;
                }
            }

            const res = await formsAPI.submit({
                formSchemaId: schema?._id,
                droneId: selectedDrone || undefined,
                headerData,
                formData,
                footerData
            });

            const submissionId = res?.data?.data?._id || res?.data?._id;
            if (submissionId) {
                navigate(`/submission/${submissionId}`);
            } else {
                console.error('Submission successful but no ID returned:', res.data);
                alert('Form submitted, but could not redirect to view. Please check your dashboard.');
                setSubmitting(false);
            }
        } catch (err) {
            console.error('Submission error:', err);
            alert('Error submitting form: ' + (err.response?.data?.message || err.message || 'Unknown error'));
            setSubmitting(false);
        }
    };

    const handleSave = async () => {
        if (!selectedDrone) {
            alert('Please select a drone first');
            return;
        }

        setSubmitting(true);
        try {
            await formsAPI.submit({
                formSchemaId: schema._id,
                droneId: selectedDrone || undefined,
                headerData,
                formData,
                footerData,
                status: 'draft'
            });
            alert('Draft saved successfully!');
            navigate(-1);
        } catch (err) {
            alert('Error saving draft');
        } finally {
            setSubmitting(false);
        }
    };

    /* ================= RENDER LOGIC ================= */

    // Check if this is MRF form
    const isMRF = schema?.formCode === 'MRF';
    const procurementType = headerData.procurementType;

    // Filter sections based on procurement type
    const getVisibleSections = () => {
        if (!schema) return [];
        // UIN Plate and UIN Photo: only show photo upload, not schema sections
        if (['UIN', 'UIN_PHOTO', 'D2_FORM', 'D3_FORM'].includes(schema.formCode)) return [];
        const sections = schema.sections || [];
        if (!isMRF) return sections;

        // If "All Components", show NO item sections
        if (procurementType === 'all') return [];

        // If "Custom", show sections up to visibleItems count (MAX 3 based on schema)
        if (procurementType === 'custom') {
            return sections.slice(0, visibleItems);
        }

        // Default to showing sections up to visibleItems if no type selected yet? 
        // Or keep hidden. Let's match logic: if type is set, show logic, else wait.
        return procurementType ? sections.slice(0, visibleItems) : [];
    };

    /* ================= YES / NO DETECTOR ================= */
    const isYesNoField = (field) => {
        if (!field?.options || !Array.isArray(field.options) || field.options.length !== 2) return false;
        const opts = field.options.filter(o => typeof o === 'string').map(o => o.toLowerCase());
        return opts.includes('yes') && opts.includes('no');
    };

    /* ================= FIELD RENDER ================= */
    /* ================= FIELD RENDER ================= */
    const renderField = (field, onChange, values) => {
        if (!field || !field.name) return null;
        const value = values?.[field.name] ?? '';

        // SPECIAL: MRF Particiular Dropdown
        if (isMRF && field.label === 'Particular') {
            const mrfOptions = [
                'Motor Combo',
                'Frame',
                'Spraying System',
                'Flight Controller',
                'Can Hub',
                'Remote Box',
                'Obstacle Avoidance Radar',
                'Terrain Radar',
                'Charger',
                'Obstacle Avoidance Radar Mount',
                'Terrain Radar Mount',
                'Battery',
                'Centrifugal Nozzle'
            ];

            return (
                <select
                    className="form-select"
                    value={value}
                    onChange={(e) => onChange(field.name, e.target.value)}
                    required={field.required}
                >
                    <option value="">Select a component</option>
                    {mrfOptions.map(opt => (
                        <option key={opt} value={opt}>{opt}</option>
                    ))}
                </select>
            );
        }

        /* TEXT / NUMBER / DATE / PASSWORD (Signature) */
        if (['text', 'number', 'date', 'password'].includes(field.type) || field.label?.toLowerCase() === 'signature') {
            const isSignature = field.label?.toLowerCase() === 'signature';
            const extraProps = {};
            if (field.type === 'date') {
                const isFutureAllowed = ['nextMaintenanceDate', 'nextDue', 'expiryDate'].includes(field.name);
                if (!isFutureAllowed) {
                    extraProps.max = new Date().toISOString().split('T')[0];
                }
            }

            const isSerialField = field.name === 'serialNo' || field.name === 'droneSerialNo';
            const displayValue = isSerialField ? formatSerialNo(value) : value;

            return (
                <input
                    type={isSignature ? 'password' : field.type}
                    className="form-input"
                    value={displayValue ?? ''}
                    onChange={(e) => {
                        let val = e.target.value;
                        if (field.type === 'number') {
                            // Don't force parseInt(0) immediately while typing, allow empty for deletion
                            if (val !== '' && parseFloat(val) < 0) {
                                val = '0';
                            }
                        }
                        onChange(field.name, isSerialField ? formatSerialNo(val) : val);
                    }}
                    required={field.required}
                    placeholder={isSignature ? 'Enter login password for verification' : ''}
                    min={field.type === 'number' ? "0" : undefined}
                    readOnly={schema?.formCode === 'WORK_ORDER' && field.name === 'remark'}
                    disabled={schema?.formCode === 'WORK_ORDER' && field.name === 'remark'}
                    {...extraProps}
                />
            );
        }

        /* TEXTAREA */
        if (field.type === 'textarea') {
            return (
                <textarea
                    className="form-textarea"
                    value={value}
                    onChange={(e) => onChange(field.name, e.target.value)}
                    required={field.required}
                />
            );
        }

        /* ✅ YES / NO CHECKLIST */
        if (field.type === 'select' && isYesNoField(field)) {
            return (
                <div style={{ display: 'flex', gap: '24px', marginTop: '6px' }}>
                    {field.options.map(opt => (
                        <label
                            key={opt}
                            style={{
                                display: 'flex',
                                alignItems: 'center',
                                gap: '6px',
                                cursor: 'pointer',
                                fontWeight: 500
                            }}
                        >
                            <input
                                type="radio"
                                name={field.name}
                                value={opt}
                                checked={value === opt}
                                onChange={() => onChange(field.name, opt)}
                                required={field.required}
                            />
                            {opt}
                        </label>
                    ))}
                </div>
            );
        }

        /* NORMAL SELECT / VERIFIED BY DROPDOWN */
        const isVerifiedByLabel = (label) => {
            const l = label?.toLowerCase().trim() || '';
            return l.endsWith(' by') || ['authorised person', 'pilot name', 'verified by'].includes(l);
        };

        if (field.type === 'select' || isVerifiedByLabel(field.label)) {
            const isVerifiedBy = isVerifiedByLabel(field.label);
            const options = isVerifiedBy ? staffList.map(s => s.name) : field.options;

            return (
                <select
                    className="form-select"
                    value={value}
                    onChange={(e) => onChange(field.name, e.target.value)}
                    required={field.required}
                >
                    <option value="">Select...</option>
                    {options?.map(opt => (
                        <option key={opt} value={opt}>{opt}</option>
                    ))}
                </select>
            );
        }

        /* CHECKBOX */
        if (field.type === 'checkbox') {
            return (
                <label className="checkbox-group">
                    <input
                        type="checkbox"
                        checked={value === true}
                        onChange={(e) => onChange(field.name, e.target.checked)}
                    />
                    <span>{field.label}</span>
                </label>
            );
        }

        /* DEFAULT */
        return (
            <input
                type="text"
                className="form-input"
                value={value}
                onChange={(e) => onChange(field.name, e.target.value)}
            />
        );
    };

    if (loading) {
        return (
            <div className="loading-container">
                <div className="loading-spinner"></div>
            </div>
        );
    }

    if (!schema) {
        return (
            <div style={{ textAlign: 'center', padding: '60px' }}>
                <h2>Form not found</h2>
                <p className="text-muted">{error}</p>
                <button onClick={() => navigate(-1)} className="btn btn-primary">
                    Go Back
                </button>
            </div>
        );
    }



    return (
        <div style={{ maxWidth: '900px', margin: '0 auto' }}>
            <div className="page-header" style={{ justifyContent: 'flex-start' }}>
                <button onClick={() => navigate(-1)} className="btn btn-ghost">
                    ← Back
                </button>
            </div>

            {isPreview && (
                <div style={{
                    background: '#fff3e0',
                    border: '1px solid #ffe0b2',
                    color: '#e65100',
                    padding: '12px',
                    borderRadius: '8px',
                    marginBottom: '20px',
                    textAlign: 'center',
                    fontWeight: 'bold'
                }}>
                    👁️ PREVIEW MODE - Submissions are disabled
                </div>
            )}

            {/* 
                User Request: Hide table header (FormHeader) during filling process.
                Only show simple title with formatted serial number.
            */}
            <div style={{ textAlign: 'center', marginBottom: '30px' }}>
                <h2 style={{ textTransform: 'uppercase', borderBottom: '2px solid #333', display: 'inline-block', paddingBottom: '5px' }}>
                    {schema.formName}
                </h2>
                <div style={{ marginTop: '5px', fontWeight: 'bold' }}>
                    {formatSerialNo(searchParams.get('droneSerial') || headerData.serialNo || headerData.droneSerialNo)}
                </div>
            </div>

            <form onSubmit={handleSubmit}>
                {/* Drone Selection */}
                <div className="card" style={{ marginBottom: '24px' }}>
                    <div className="form-group">
                        {droneSerial ? (
                            <strong>{formatSerialNo(droneSerial)}</strong>
                        ) : (
                            <select
                                className="form-select"
                                value={selectedDrone}
                                onChange={(e) => setSelectedDrone(e.target.value)}
                            >
                                <option value="">Select Drone</option>
                                {drones.map(d => (
                                    <option key={d._id} value={d._id}>
                                        {formatSerialNo(d.serialNo)}
                                    </option>
                                ))}
                            </select>
                        )}
                    </div>
                </div>

                {/* SPECIAL HEADER FOR MRF: Procurement Choice */}
                {isMRF && (
                    <div className="card" style={{ marginBottom: '24px', borderLeft: '4px solid #FFD600' }}>
                        <h3 className="card-title">1. Select Requirement Type</h3>
                        <div className="form-group">
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                                <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', padding: '10px', background: '#f9f9f9', borderRadius: '8px' }}>
                                    <input
                                        type="radio"
                                        name="procurementType"
                                        value="all"
                                        checked={procurementType === 'all'}
                                        onChange={() => setHeaderData(p => ({ ...p, procurementType: 'all' }))}
                                    />
                                    <div>
                                        <strong>All Components Needed</strong>
                                        <div className="text-muted text-xs">Standard Full Kit (Procurement List PDF will be attached automatically)</div>
                                    </div>
                                </label>
                                <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', padding: '10px', background: '#f9f9f9', borderRadius: '8px' }}>
                                    <input
                                        type="radio"
                                        name="procurementType"
                                        value="custom"
                                        checked={procurementType === 'custom'}
                                        onChange={() => setHeaderData(p => ({ ...p, procurementType: 'custom' }))}
                                    />
                                    <div>
                                        <strong>Custom Components Needed</strong>
                                        <div className="text-muted text-xs">Select specific items manually</div>
                                    </div>
                                </label>
                            </div>
                        </div>
                    </div>
                )}

                {/* STANDARD HEADER FIELDS */}
                {schema.headerFields?.length > 0 && (
                    <div className="card" style={{ marginBottom: '24px' }}>
                        <div className="grid grid-cols-3 gap-md">
                            {schema.headerFields.map(f => (
                                <div key={f.name} className="form-group">
                                    <label className={`form-label ${f.required ? 'required' : ''}`}>
                                        {f.label}
                                    </label>
                                    {renderField(f, (n, v) =>
                                        setHeaderData(p => ({ ...p, [n]: v })), headerData)}
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                {/* MESSAGE FOR ALL COMPONENTS */}
                {isMRF && procurementType === 'all' && (
                    <div className="card" style={{ marginBottom: '24px', textAlign: 'center', padding: '40px' }}>
                        <div style={{ fontSize: '48px', marginBottom: '10px' }}>📦</div>
                        <h3>Full Kit Selected</h3>
                        <p className="text-muted">
                            The standard Material Procurement List (5 pages) will be automatically attached to this requisition.
                            <br />
                            No manual item entry is required.
                        </p>
                    </div>
                )}

                {/* SECTIONS / ITEMS */}
                {isMRF && procurementType === 'custom' ? (
                    <div className="card" style={{ marginBottom: '24px', overflowX: 'auto' }}>
                        <h3 className="card-title">List of Required material</h3>
                        <table className="mrf-table" style={{ width: '100%', borderCollapse: 'collapse' }}>
                            <thead>
                                <tr>
                                    <th style={{ border: '1px solid #ddd', padding: '8px', textAlign: 'center', width: '50px' }}>Sr. No.</th>
                                    <th style={{ border: '1px solid #ddd', padding: '8px' }}>Particular</th>
                                    <th style={{ border: '1px solid #ddd', padding: '8px', width: '100px' }}>Part No.</th>
                                    <th style={{ border: '1px solid #ddd', padding: '8px', width: '100px' }}>Part Code</th>
                                    <th style={{ border: '1px solid #ddd', padding: '8px', width: '80px' }}>QTY</th>
                                    <th style={{ border: '1px solid #ddd', padding: '8px', width: '150px' }}>Department</th>
                                    <th style={{ border: '1px solid #ddd', padding: '8px' }}>Remark</th>
                                </tr>
                            </thead>
                            <tbody>
                                {getVisibleSections().map((sec, i) => {
                                    const particular = formData[`particular_${i + 1}`];
                                    const partNo = formData[`partNo_${i + 1}`];
                                    const partCode = formData[`partCode_${i + 1}`];
                                    const qty = formData[`qty_${i + 1}`];
                                    const hasData = particular || partNo || partCode || qty;

                                    return (
                                        <tr key={i}>
                                            <td style={{ border: '1px solid #ddd', padding: '8px', textAlign: 'center' }}>{hasData ? i + 1 : ''}</td>
                                            {sec.fields.map(f => (
                                                <td key={f.name} style={{ border: '1px solid #ddd', padding: '4px' }}>
                                                    {renderField(f, (n, v) =>
                                                        setFormData(p => ({ ...p, [n]: v })), formData)}
                                                </td>
                                            ))}
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                ) : (
                    getVisibleSections().map((sec, i) => (
                        <div key={i} className="card" style={{ marginBottom: '24px' }}>
                            <h3 className="card-title">{sec.title}</h3>
                            {['QA_SOLDERING', 'QA_MECHANICAL', 'QA_ELECTRONIC', 'QA_PAYLOAD', 'QA_CALIBRATION', 'FLIGHT_TEST', 'PACKAGING', 'DISPATCH'].includes(schema.formCode?.toUpperCase()) ? (
                                <table className="mrf-table" style={{ width: '100%', borderCollapse: 'collapse' }}>
                                    <thead>
                                        <tr>
                                            <th style={{ border: '1px solid #ddd', padding: '8px', textAlign: 'center', width: '50px' }}>Sr. No.</th>
                                            <th style={{ border: '1px solid #ddd', padding: '8px' }}>Parameter</th>
                                            <th style={{ border: '1px solid #ddd', padding: '8px', width: '150px' }}>Approved (YES/NO)</th>
                                            <th style={{ border: '1px solid #ddd', padding: '8px' }}>Remark</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {sec.fields.map((f, fIdx) => (
                                            <tr key={f.name}>
                                                <td style={{ border: '1px solid #ddd', padding: '8px', textAlign: 'center' }}>{fIdx + 1}</td>
                                                <td style={{ border: '1px solid #ddd', padding: '8px' }}>
                                                    {f.name === 'compareCodes' ? (
                                                        <div style={{ lineHeight: '1.4' }}>
                                                            <strong>{f.label}</strong><br/>
                                                            It should be as below:<br/>
                                                            Hash code:<br/>
                                                            510d534df3594be7f523e79be817371de6368f5da630751823a0ee60db182da3<br/>
                                                            Data code:<br/>
                                                            f44c6b28a63b9b22d27fc284cb83d852864cff791fb6293193c2c51212d00c8d
                                                        </div>
                                                    ) : f.name === 'obstacleAvoidance' ? (
                                                        <div style={{ lineHeight: '1.4' }}>
                                                            Obstacle avoidance:<br/>
                                                            Sensitivity – 25 &nbsp;&nbsp;&nbsp;&nbsp; Action: Hang<br/>
                                                            Safe distance: 10 m &nbsp;&nbsp;&nbsp;&nbsp; Help distance: 6 m
                                                        </div>
                                                    ) : (
                                                        f.label
                                                    )}
                                                </td>
                                                <td style={{ border: '1px solid #ddd', padding: '8px' }}>
                                                    {renderField(f, (n, v) => setFormData(p => ({ ...p, [n]: v })), formData)}
                                                </td>
                                                <td style={{ border: '1px solid #ddd', padding: '8px' }}>
                                                    <input
                                                        type="text"
                                                        className="form-input"
                                                        value={formData[`${f.name}_remark`] || ''}
                                                        onChange={(e) => setFormData(p => ({ ...p, [`${f.name}_remark`]: e.target.value }))}
                                                        placeholder="Remark"
                                                    />
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            ) : (
                                <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '16px' }}>
                                    {sec.fields.map(f => {
                                        // Conditional logic for 'Other' supplier
                                        if (f.name === 'otherSupplierName' && formData.supplierName !== 'Other') {
                                            return null;
                                        }

                                        const isRequired = f.required || (f.name === 'otherSupplierName' && formData.supplierName === 'Other');

                                        return (
                                            <div key={f.name} className="form-group">
                                                <label className={`form-label ${isRequired ? 'required' : ''}`}>
                                                    {f.label}
                                                </label>
                                                {renderField(f, (n, v) =>
                                                    setFormData(p => ({ ...p, [n]: v })), formData)}
                                            </div>
                                        );
                                    })}
                                </div>
                            )}
                        </div>
                    ))
                )}

                {/* ADD ITEM BUTTON FOR CUSTOM MRF */}
                {isMRF && procurementType === 'custom' && visibleItems < schema.sections.length && (
                    <div style={{ textAlign: 'center', marginBottom: '24px' }}>
                        <button
                            type="button"
                            className="btn btn-outline"
                            onClick={() => setVisibleItems(p => p + 1)}
                        >
                            + Add Another Item
                        </button>
                    </div>
                )}

                {/* UIN PHOTO UPLOAD */}
                {schema?.formCode === 'UIN' && (() => {
                    // Camera modal state (managed via DOM refs to avoid re-render issues inside renderField)
                    const openCamera = async () => {
                        // Create modal overlay
                        const overlay = document.createElement('div');
                        overlay.id = 'uin-camera-modal';
                        overlay.style.cssText = `
                            position:fixed;top:0;left:0;width:100%;height:100%;
                            background:rgba(0,0,0,0.85);z-index:9999;
                            display:flex;flex-direction:column;align-items:center;justify-content:center;gap:16px;
                        `;

                        const title = document.createElement('div');
                        title.innerText = '📷 Camera — position the UIN certificate and click Capture';
                        title.style.cssText = 'color:white;font-size:14px;font-weight:600;text-align:center;padding:0 16px;';

                        const video = document.createElement('video');
                        video.autoplay = true;
                        video.playsInline = true;
                        video.style.cssText = 'max-width:90vw;max-height:60vh;border-radius:12px;border:3px solid #4caf50;background:#000;';

                        const btnRow = document.createElement('div');
                        btnRow.style.cssText = 'display:flex;gap:12px;';

                        const captureBtn = document.createElement('button');
                        captureBtn.innerText = '📸 Capture';
                        captureBtn.style.cssText = `
                            padding:12px 28px;background:#4caf50;color:white;border:none;
                            border-radius:8px;font-size:15px;font-weight:700;cursor:pointer;
                        `;

                        const closeBtn = document.createElement('button');
                        closeBtn.innerText = '✕ Cancel';
                        closeBtn.style.cssText = `
                            padding:12px 24px;background:#555;color:white;border:none;
                            border-radius:8px;font-size:15px;cursor:pointer;
                        `;

                        btnRow.appendChild(captureBtn);
                        btnRow.appendChild(closeBtn);
                        overlay.appendChild(title);
                        overlay.appendChild(video);
                        overlay.appendChild(btnRow);
                        document.body.appendChild(overlay);

                        let stream = null;
                        const cleanup = () => {
                            if (stream) stream.getTracks().forEach(t => t.stop());
                            if (document.body.contains(overlay)) document.body.removeChild(overlay);
                        };

                        try {
                            // Prefer rear camera on mobile, any camera on desktop
                            stream = await navigator.mediaDevices.getUserMedia({
                                video: { facingMode: { ideal: 'environment' }, width: { ideal: 1920 }, height: { ideal: 1080 } }
                            });
                            video.srcObject = stream;
                        } catch (err) {
                            cleanup();
                            // Fallback to file input with capture on error
                            alert('Could not access camera. Please use "Upload from Device" or allow camera permissions in your browser.');
                            document.getElementById('uin-capture-camera').click();
                            return;
                        }

                        captureBtn.onclick = () => {
                            const canvas = document.createElement('canvas');
                            canvas.width = video.videoWidth;
                            canvas.height = video.videoHeight;
                            canvas.getContext('2d').drawImage(video, 0, 0);
                            const dataUrl = canvas.toDataURL('image/jpeg', 0.92);
                            setFormData(p => ({ ...p, uinPhoto: dataUrl }));
                            cleanup();
                        };

                        closeBtn.onclick = cleanup;
                        // Also close on overlay click outside
                        overlay.onclick = (e) => { if (e.target === overlay) cleanup(); };
                    };

                    return (
                        <div className="card" style={{ marginBottom: '24px' }}>
                            <h3 className="card-title">UIN Certificate Photo</h3>
                            <p style={{ fontSize: '13px', color: '#666', marginBottom: '12px' }}>
                                Upload a photo of the UIN certificate — from your device or by clicking a photo with your camera.
                            </p>

                            {/* Hidden file inputs */}
                            <input
                                id="uin-upload-file"
                                type="file"
                                accept="image/*"
                                style={{ display: 'none' }}
                                onChange={(e) => {
                                    const file = e.target.files?.[0];
                                    if (!file) return;
                                    const reader = new FileReader();
                                    reader.onload = (ev) => setFormData(p => ({ ...p, uinPhoto: ev.target.result }));
                                    reader.readAsDataURL(file);
                                    e.target.value = '';
                                }}
                            />
                            {/* Mobile fallback: native camera via file input */}
                            <input
                                id="uin-capture-camera"
                                type="file"
                                accept="image/*"
                                capture="environment"
                                style={{ display: 'none' }}
                                onChange={(e) => {
                                    const file = e.target.files?.[0];
                                    if (!file) return;
                                    const reader = new FileReader();
                                    reader.onload = (ev) => setFormData(p => ({ ...p, uinPhoto: ev.target.result }));
                                    reader.readAsDataURL(file);
                                    e.target.value = '';
                                }}
                            />

                            {/* Action Buttons */}
                            <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap', marginBottom: '16px' }}>
                                <button
                                    type="button"
                                    className="btn btn-outline"
                                    onClick={() => document.getElementById('uin-upload-file').click()}
                                >
                                    📁 Upload from Device
                                </button>
                                <button
                                    type="button"
                                    className="btn btn-outline"
                                    style={{ display: 'flex', alignItems: 'center', gap: '6px' }}
                                    onClick={openCamera}
                                >
                                    📷 Click Photo with Camera
                                </button>
                                {formData.uinPhoto && (
                                    <button
                                        type="button"
                                        className="btn btn-ghost"
                                        style={{ color: '#e53e3e' }}
                                        onClick={() => setFormData(p => ({ ...p, uinPhoto: '' }))}
                                    >
                                        ✕ Remove Photo
                                    </button>
                                )}
                            </div>

                            {/* Photo Preview */}
                            {formData.uinPhoto ? (
                                <div style={{ position: 'relative', display: 'inline-block' }}>
                                    <img
                                        src={formData.uinPhoto}
                                        alt="UIN Certificate"
                                        style={{
                                            maxWidth: '100%',
                                            maxHeight: '400px',
                                            objectFit: 'contain',
                                            borderRadius: '8px',
                                            border: '2px solid #4caf50',
                                            display: 'block'
                                        }}
                                    />
                                </div>
                            ) : (
                                <div style={{
                                    border: '2px dashed #cbd5e0',
                                    borderRadius: '8px',
                                    padding: '40px',
                                    textAlign: 'center',
                                    color: '#a0aec0',
                                    background: '#f7fafc'
                                }}>
                                    <div style={{ fontSize: '40px', marginBottom: '8px' }}>🖼️</div>
                                    <div>No photo selected yet</div>
                                </div>
                            )}
                        </div>
                    );
                })()
                }

                {/* D2 FORM FILE UPLOAD */}
                {schema?.formCode === 'D2_FORM' && (() => {
                    const clearD2 = () => setFormData(p => ({ ...p, d2File: '', d2FileName: '', d2FileType: '' }));
                    return (
                        <div className="card" style={{ marginBottom: '24px' }}>
                            <h3 className="card-title">D2 Form</h3>
                            <p style={{ fontSize: '13px', color: '#666', marginBottom: '12px' }}>
                                Upload the D2 form — PDF or image file from your device.
                            </p>
                            <input
                                id="d2-upload-file"
                                type="file"
                                accept="image/*,application/pdf"
                                style={{ display: 'none' }}
                                onChange={(e) => {
                                    const file = e.target.files?.[0];
                                    if (!file) return;
                                    const reader = new FileReader();
                                    reader.onload = (ev) => setFormData(p => ({ ...p, d2File: ev.target.result, d2FileName: file.name, d2FileType: file.type }));
                                    reader.readAsDataURL(file);
                                    e.target.value = '';
                                }}
                            />
                            <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap', marginBottom: '16px' }}>
                                <button type="button" className="btn btn-outline" onClick={() => document.getElementById('d2-upload-file').click()}>
                                    📁 Upload PDF or Image
                                </button>
                                {formData.d2File && (
                                    <button type="button" className="btn btn-ghost" style={{ color: '#e53e3e' }} onClick={clearD2}>
                                        ✕ Remove File
                                    </button>
                                )}
                            </div>
                            {formData.d2File ? (
                                formData.d2FileType?.includes('pdf') ? (
                                    <div style={{ padding: '20px', background: '#f0fff4', borderRadius: '8px', border: '2px solid #4caf50', textAlign: 'center' }}>
                                        📄 <strong>{formData.d2FileName}</strong> — uploaded successfully
                                    </div>
                                ) : (
                                    <img src={formData.d2File} alt="D2 Form" style={{ maxWidth: '100%', maxHeight: '400px', objectFit: 'contain', borderRadius: '8px', border: '2px solid #4caf50', display: 'block' }} />
                                )
                            ) : (
                                <div style={{ border: '2px dashed #cbd5e0', borderRadius: '8px', padding: '40px', textAlign: 'center', color: '#a0aec0', background: '#f7fafc' }}>
                                    <div style={{ fontSize: '40px', marginBottom: '8px' }}>📄</div>
                                    <div>No file selected yet</div>
                                </div>
                            )}
                        </div>
                    );
                })()}

                {/* UIN PHOTO UPLOAD (UIN_PHOTO step) */}
                {schema?.formCode === 'UIN_PHOTO' && (() => {
                    const openCamera2 = async () => {
                        const overlay = document.createElement('div');
                        overlay.id = 'uin-photo-camera-modal';
                        overlay.style.cssText = 'position:fixed;top:0;left:0;width:100%;height:100%;background:rgba(0,0,0,0.85);z-index:9999;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:16px;';
                        const title = document.createElement('div');
                        title.innerText = '📷 Camera — position the UIN photo and click Capture';
                        title.style.cssText = 'color:white;font-size:14px;font-weight:600;text-align:center;padding:0 16px;';
                        const video = document.createElement('video');
                        video.autoplay = true; video.playsInline = true;
                        video.style.cssText = 'max-width:90vw;max-height:60vh;border-radius:12px;border:3px solid #4caf50;background:#000;';
                        const btnRow = document.createElement('div');
                        btnRow.style.cssText = 'display:flex;gap:12px;';
                        const captureBtn = document.createElement('button');
                        captureBtn.innerText = '📸 Capture';
                        captureBtn.style.cssText = 'padding:12px 28px;background:#4caf50;color:white;border:none;border-radius:8px;font-size:15px;font-weight:700;cursor:pointer;';
                        const closeBtn = document.createElement('button');
                        closeBtn.innerText = '✕ Cancel';
                        closeBtn.style.cssText = 'padding:12px 24px;background:#555;color:white;border:none;border-radius:8px;font-size:15px;cursor:pointer;';
                        btnRow.appendChild(captureBtn); btnRow.appendChild(closeBtn);
                        overlay.appendChild(title); overlay.appendChild(video); overlay.appendChild(btnRow);
                        document.body.appendChild(overlay);
                        let stream = null;
                        const cleanup = () => {
                            if (stream) stream.getTracks().forEach(t => t.stop());
                            if (document.body.contains(overlay)) document.body.removeChild(overlay);
                        };
                        try {
                            stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: { ideal: 'environment' }, width: { ideal: 1920 }, height: { ideal: 1080 } } });
                            video.srcObject = stream;
                        } catch {
                            cleanup();
                            alert('Could not access camera. Please use "Upload from Device".');
                            document.getElementById('uin-photo-capture').click();
                            return;
                        }
                        captureBtn.onclick = () => {
                            const canvas = document.createElement('canvas');
                            canvas.width = video.videoWidth; canvas.height = video.videoHeight;
                            canvas.getContext('2d').drawImage(video, 0, 0);
                            setFormData(p => ({ ...p, uinPhoto: canvas.toDataURL('image/jpeg', 0.92) }));
                            cleanup();
                        };
                        closeBtn.onclick = cleanup;
                        overlay.onclick = (e) => { if (e.target === overlay) cleanup(); };
                    };
                    return (
                        <div className="card" style={{ marginBottom: '24px' }}>
                            <h3 className="card-title">UIN Photo</h3>
                            <p style={{ fontSize: '13px', color: '#666', marginBottom: '12px' }}>
                                Upload a photo of the UIN — from your device or by clicking a photo with your camera.
                            </p>
                            <input id="uin-photo-upload" type="file" accept="image/*" style={{ display: 'none' }}
                                onChange={(e) => {
                                    const file = e.target.files?.[0]; if (!file) return;
                                    const reader = new FileReader();
                                    reader.onload = (ev) => setFormData(p => ({ ...p, uinPhoto: ev.target.result }));
                                    reader.readAsDataURL(file); e.target.value = '';
                                }}
                            />
                            <input id="uin-photo-capture" type="file" accept="image/*" capture="environment" style={{ display: 'none' }}
                                onChange={(e) => {
                                    const file = e.target.files?.[0]; if (!file) return;
                                    const reader = new FileReader();
                                    reader.onload = (ev) => setFormData(p => ({ ...p, uinPhoto: ev.target.result }));
                                    reader.readAsDataURL(file); e.target.value = '';
                                }}
                            />
                            <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap', marginBottom: '16px' }}>
                                <button type="button" className="btn btn-outline" onClick={() => document.getElementById('uin-photo-upload').click()}>📁 Upload from Device</button>
                                <button type="button" className="btn btn-outline" onClick={openCamera2}>📷 Click Photo with Camera</button>
                                {formData.uinPhoto && (
                                    <button type="button" className="btn btn-ghost" style={{ color: '#e53e3e' }} onClick={() => setFormData(p => ({ ...p, uinPhoto: '' }))}>✕ Remove Photo</button>
                                )}
                            </div>
                            {formData.uinPhoto ? (
                                <img src={formData.uinPhoto} alt="UIN Photo" style={{ maxWidth: '100%', maxHeight: '400px', objectFit: 'contain', borderRadius: '8px', border: '2px solid #4caf50', display: 'block' }} />
                            ) : (
                                <div style={{ border: '2px dashed #cbd5e0', borderRadius: '8px', padding: '40px', textAlign: 'center', color: '#a0aec0', background: '#f7fafc' }}>
                                    <div style={{ fontSize: '40px', marginBottom: '8px' }}>🖼️</div>
                                    <div>No photo selected yet</div>
                                </div>
                            )}
                        </div>
                    );
                })()}

                {/* D3 FORM FILE UPLOAD */}
                {schema?.formCode === 'D3_FORM' && (() => {
                    const clearD3 = () => setFormData(p => ({ ...p, d3File: '', d3FileName: '', d3FileType: '' }));
                    return (
                        <div className="card" style={{ marginBottom: '24px' }}>
                            <h3 className="card-title">D3 Form</h3>
                            <p style={{ fontSize: '13px', color: '#666', marginBottom: '12px' }}>
                                Upload the D3 form — PDF or image file from your device.
                            </p>
                            <input
                                id="d3-upload-file"
                                type="file"
                                accept="image/*,application/pdf"
                                style={{ display: 'none' }}
                                onChange={(e) => {
                                    const file = e.target.files?.[0];
                                    if (!file) return;
                                    const reader = new FileReader();
                                    reader.onload = (ev) => setFormData(p => ({ ...p, d3File: ev.target.result, d3FileName: file.name, d3FileType: file.type }));
                                    reader.readAsDataURL(file);
                                    e.target.value = '';
                                }}
                            />
                            <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap', marginBottom: '16px' }}>
                                <button type="button" className="btn btn-outline" onClick={() => document.getElementById('d3-upload-file').click()}>
                                    📁 Upload PDF or Image
                                </button>
                                {formData.d3File && (
                                    <button type="button" className="btn btn-ghost" style={{ color: '#e53e3e' }} onClick={clearD3}>
                                        ✕ Remove File
                                    </button>
                                )}
                            </div>
                            {formData.d3File ? (
                                formData.d3FileType?.includes('pdf') ? (
                                    <div style={{ padding: '20px', background: '#f0fff4', borderRadius: '8px', border: '2px solid #4caf50', textAlign: 'center' }}>
                                        📄 <strong>{formData.d3FileName}</strong> — uploaded successfully
                                    </div>
                                ) : (
                                    <img src={formData.d3File} alt="D3 Form" style={{ maxWidth: '100%', maxHeight: '400px', objectFit: 'contain', borderRadius: '8px', border: '2px solid #4caf50', display: 'block' }} />
                                )
                            ) : (
                                <div style={{ border: '2px dashed #cbd5e0', borderRadius: '8px', padding: '40px', textAlign: 'center', color: '#a0aec0', background: '#f7fafc' }}>
                                    <div style={{ fontSize: '40px', marginBottom: '8px' }}>📄</div>
                                    <div>No file selected yet</div>
                                </div>
                            )}
                        </div>
                    );
                })()}

                {/* FOOTER */}
                {schema.footerFields?.length > 0 && (
                    <div className="card">
                        {schema.footerFields.map(f => (
                            <div key={f.name} className="form-group">
                                <label className="form-label">{f.label}</label>
                                {renderField(f, (n, v) =>
                                    setFooterData(p => ({ ...p, [n]: v })), footerData)}
                            </div>
                        ))}
                    </div>
                )}

                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px', marginTop: '24px' }}>
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '4px' }}>
                        <button
                            type="button"
                            className="btn btn-outline"
                            onClick={handleSave}
                            disabled={submitting || isPreview}
                        >
                            {submitting ? 'Saving...' : 'Save Draft'}
                        </button>
                    </div>
                    <button type="submit" className="btn btn-primary" disabled={submitting || isPreview}>
                        {isPreview ? 'Preview Only' : (submitting ? 'Submitting...' : 'Submit Form')}
                    </button>
                </div>
            </form>
        </div >
    );
};

export default FormRenderer;
