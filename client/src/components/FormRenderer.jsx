import { useState, useEffect } from 'react';
import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
import { formsAPI, dronesAPI } from '../services/api';

const FormRenderer = () => {
    // Support both /form/:id and /staff/forms/:formCode routes
    const { id, formCode } = useParams();
    const [searchParams] = useSearchParams();
    const navigate = useNavigate();
    const [schema, setSchema] = useState(null);
    const [drones, setDrones] = useState([]);
    const [selectedDrone, setSelectedDrone] = useState('');
    const [droneSerial, setDroneSerial] = useState('');
    const [formData, setFormData] = useState({});
    const [headerData, setHeaderData] = useState({});
    const [footerData, setFooterData] = useState({});
    const [loading, setLoading] = useState(true);
    const [submitting, setSubmitting] = useState(false);
    const [success, setSuccess] = useState(false);
    const [error, setError] = useState(null);

    useEffect(() => {
        fetchFormSchema();
        fetchDrones();
        
        // Check for droneId in URL query params
        const droneIdParam = searchParams.get('droneId');
        const droneSerialParam = searchParams.get('droneSerial');
        if (droneIdParam) {
            setSelectedDrone(droneIdParam);
        }
        if (droneSerialParam) {
            setDroneSerial(droneSerialParam);
        }
    }, [id, formCode]);

    const fetchFormSchema = async () => {
        try {
            let response;
            if (id) {
                // Fetch by ID (from drone workflow)
                response = await formsAPI.getSchemaById(id);
            } else if (formCode) {
                // Fetch by code (from staff forms)
                response = await formsAPI.getSchemaByCode(formCode);
            } else {
                throw new Error('No form ID or code provided');
            }
            
            setSchema(response.data.data);

            // Initialize header data with defaults
            const initialHeader = {};
            response.data.data.headerFields?.forEach(field => {
                initialHeader[field.name] = field.defaultValue || '';
            });
            setHeaderData(initialHeader);
            setError(null);
        } catch (err) {
            console.error('Error fetching form schema:', err);
            setError(err.response?.data?.message || 'Form not found');
        } finally {
            setLoading(false);
        }
    };

    const fetchDrones = async () => {
        try {
            const response = await dronesAPI.getAll();
            setDrones(response.data.data || []);
        } catch (err) {
            console.error('Error fetching drones:', err);
        }
    };

    const handleHeaderChange = (name, value) => {
        setHeaderData(prev => ({ ...prev, [name]: value }));
    };

    const handleFieldChange = (fieldName, value) => {
        setFormData(prev => ({ ...prev, [fieldName]: value }));
    };

    const handleFooterChange = (name, value) => {
        setFooterData(prev => ({ ...prev, [name]: value }));
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setSubmitting(true);

        try {
            const response = await formsAPI.submit({
                formSchemaId: schema._id,
                droneId: selectedDrone || undefined,
                headerData,
                formData,
                footerData
            });

            // Redirect to submission view page for printing
            const submissionId = response.data.data._id;
            navigate(`/submission/${submissionId}`);
        } catch (error) {
            console.error('Error submitting form:', error);
            alert('Error submitting form. Please try again.');
            setSubmitting(false);
        }
    };

    const renderField = (field, onChange, values) => {
        const value = values[field.name] || '';

        switch (field.type) {
            case 'text':
            case 'number':
            case 'date':
                return (
                    <input
                        type={field.type}
                        className="form-input"
                        value={value}
                        onChange={(e) => onChange(field.name, e.target.value)}
                        placeholder={field.placeholder}
                        required={field.required}
                    />
                );

            case 'textarea':
                return (
                    <textarea
                        className="form-textarea"
                        value={value}
                        onChange={(e) => onChange(field.name, e.target.value)}
                        placeholder={field.placeholder}
                        required={field.required}
                    />
                );

            case 'select':
                return (
                    <select
                        className="form-select"
                        value={value}
                        onChange={(e) => onChange(field.name, e.target.value)}
                        required={field.required}
                    >
                        <option value="">Select...</option>
                        {field.options?.map((opt) => (
                            <option key={opt} value={opt}>{opt}</option>
                        ))}
                    </select>
                );

            case 'checkbox':
                return (
                    <label className="checkbox-group">
                        <input
                            type="checkbox"
                            className="checkbox-input"
                            checked={value === true || value === 'true'}
                            onChange={(e) => onChange(field.name, e.target.checked)}
                        />
                        <span>{field.label}</span>
                    </label>
                );

            case 'table':
                return (
                    <div style={{ marginTop: '8px' }}>
                        {/* Sub-fields as individual checkboxes/inputs */}
                        {field.subFields?.map((sub) => (
                            <div key={sub.name} style={{
                                display: 'flex',
                                alignItems: 'center',
                                gap: '12px',
                                padding: '8px 12px',
                                background: '#f9f9f9',
                                marginBottom: '4px',
                                borderRadius: '4px'
                            }}>
                                <span style={{ flex: 1, fontSize: '0.875rem' }}>{sub.label}</span>
                                {sub.type === 'select' ? (
                                    <select
                                        className="form-select"
                                        style={{ width: '120px' }}
                                        value={formData[`${field.name}_${sub.name}`] || ''}
                                        onChange={(e) => handleFieldChange(`${field.name}_${sub.name}`, e.target.value)}
                                    >
                                        <option value="">-</option>
                                        {sub.options?.map((opt) => (
                                            <option key={opt} value={opt}>{opt}</option>
                                        ))}
                                    </select>
                                ) : (
                                    <input
                                        type={sub.type || 'text'}
                                        className="form-input"
                                        style={{ width: '120px' }}
                                        value={formData[`${field.name}_${sub.name}`] || ''}
                                        onChange={(e) => handleFieldChange(`${field.name}_${sub.name}`, e.target.value)}
                                    />
                                )}
                            </div>
                        ))}

                        {/* Main table columns */}
                        {field.columns && !field.subFields && (
                            <div className="table-container">
                                <table className="table">
                                    <thead>
                                        <tr>
                                            {field.columns.map((col) => (
                                                <th key={col.name}>{col.label}</th>
                                            ))}
                                        </tr>
                                    </thead>
                                    <tbody>
                                        <tr>
                                            {field.columns.map((col) => (
                                                <td key={col.name}>
                                                    <input
                                                        type={col.type || 'text'}
                                                        className="form-input"
                                                        style={{ minWidth: '100px' }}
                                                        value={formData[`${field.name}_${col.name}`] || ''}
                                                        onChange={(e) => handleFieldChange(`${field.name}_${col.name}`, e.target.value)}
                                                    />
                                                </td>
                                            ))}
                                        </tr>
                                    </tbody>
                                </table>
                            </div>
                        )}
                    </div>
                );

            case 'signature':
                return (
                    <div style={{
                        border: '2px dashed #e0e0e0',
                        borderRadius: '8px',
                        padding: '40px',
                        textAlign: 'center',
                        background: '#fafafa'
                    }}>
                        <p className="text-muted">Click to add signature</p>
                        <input
                            type="text"
                            className="form-input"
                            placeholder="Type name as signature"
                            value={value}
                            onChange={(e) => onChange(field.name, e.target.value)}
                            style={{ marginTop: '12px', maxWidth: '300px' }}
                        />
                    </div>
                );

            default:
                return (
                    <input
                        type="text"
                        className="form-input"
                        value={value}
                        onChange={(e) => onChange(field.name, e.target.value)}
                    />
                );
        }
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
                <p className="text-muted">{error || `The form could not be found.`}</p>
                <button onClick={() => navigate(-1)} className="btn btn-primary" style={{ marginTop: '20px' }}>
                    Go Back
                </button>
            </div>
        );
    }

    if (success) {
        return (
            <div style={{ textAlign: 'center', padding: '60px' }}>
                <div style={{ fontSize: '4rem', marginBottom: '20px' }}>✅</div>
                <h2>Form Submitted Successfully!</h2>
                <p className="text-muted">Redirecting...</p>
            </div>
        );
    }

    return (
        <div style={{ maxWidth: '900px', margin: '0 auto' }}>
            <div className="page-header">
                <div>
                    <h1 className="page-title">{schema.formName}</h1>
                    <p className="page-subtitle">{schema.description}</p>
                </div>
                <button onClick={() => navigate(-1)} className="btn btn-ghost">
                    ← Back
                </button>
            </div>

            <form onSubmit={handleSubmit}>
                {/* Drone Selection */}
                <div className="card" style={{ marginBottom: '24px' }}>
                    <div className="card-header">
                        <h3 className="card-title">Select Drone</h3>
                    </div>
                    <div className="form-group">
                        {droneSerial ? (
                            // Pre-selected drone from URL
                            <div style={{ 
                                padding: '12px', 
                                background: '#e8f5e9', 
                                borderRadius: '8px',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '10px'
                            }}>
                                <span style={{ fontSize: '1.5rem' }}>✓</span>
                                <div>
                                    <strong>{droneSerial}</strong>
                                    <p style={{ margin: 0, fontSize: '0.875rem', color: '#666' }}>
                                        Drone pre-selected from workflow
                                    </p>
                                </div>
                            </div>
                        ) : (
                            <select
                                className="form-select"
                                value={selectedDrone}
                                onChange={(e) => setSelectedDrone(e.target.value)}
                            >
                                <option value="">Select a drone (optional)</option>
                                {drones.map((drone) => (
                                    <option key={drone._id} value={drone._id}>
                                        {drone.serialNo} - {drone.modelNo}
                                    </option>
                                ))}
                            </select>
                        )}
                    </div>
                </div>

                {/* Header Fields */}
                {schema.headerFields?.length > 0 && (
                    <div className="card" style={{ marginBottom: '24px' }}>
                        <div className="card-header">
                            <h3 className="card-title">Form Details</h3>
                        </div>
                        <div className="grid grid-cols-3 gap-md">
                            {schema.headerFields.map((field) => (
                                <div key={field.name} className="form-group">
                                    <label className={`form-label ${field.required ? 'required' : ''}`}>
                                        {field.label}
                                    </label>
                                    {renderField(field, handleHeaderChange, headerData)}
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                {/* Form Sections */}
                {schema.sections?.map((section, sIdx) => (
                    <div key={sIdx} className="card" style={{ marginBottom: '24px' }}>
                        <div className="card-header">
                            <h3 className="card-title">{section.title}</h3>
                        </div>

                        {section.fields?.map((field) => (
                            <div key={field.name} className="form-group">
                                <label className={`form-label ${field.required ? 'required' : ''}`}>
                                    {field.label}
                                </label>
                                {renderField(field, handleFieldChange, formData)}
                            </div>
                        ))}
                    </div>
                ))}

                {/* Footer Fields */}
                {schema.footerFields?.length > 0 && (
                    <div className="card" style={{ marginBottom: '24px' }}>
                        <div className="card-header">
                            <h3 className="card-title">Verification</h3>
                        </div>
                        <div className="grid grid-cols-2 gap-lg">
                            {schema.footerFields.map((field) => (
                                <div key={field.name} className="form-group">
                                    <label className="form-label">{field.label}</label>
                                    {renderField(field, handleFooterChange, footerData)}
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                {/* Submit Button */}
                <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end' }}>
                    <button type="button" onClick={() => navigate(-1)} className="btn btn-outline">
                        Cancel
                    </button>
                    <button type="submit" className="btn btn-primary btn-lg" disabled={submitting}>
                        {submitting ? 'Submitting...' : 'Submit Form'}
                    </button>
                </div>
            </form>
        </div>
    );
};

export default FormRenderer;
