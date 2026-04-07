import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { formsAPI, dronesAPI } from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import { useNavigate } from 'react-router-dom';

const StaffForms = () => {
    const [schemas, setSchemas] = useState([]);
    const [drones, setDrones] = useState([]);
    const [selectedDrone, setSelectedDrone] = useState('');
    const [loading, setLoading] = useState(true);
    const { user } = useAuth();
    const navigate = useNavigate();

    useEffect(() => {
        fetchSchemas();
        fetchDrones();
    }, []);

    const fetchDrones = async () => {
        try {
            const res = await dronesAPI.getAll();
            setDrones(res.data.data || []);
        } catch (err) {
            console.error('Error fetching drones:', err);
        }
    };

    const fetchSchemas = async () => {
        try {
            const response = await formsAPI.getSchemas();
            const allSchemas = response.data.data || [];

            // Filter by user role
            const userRole = user?.role;
            let filteredSchemas = allSchemas;

            if (userRole === 'qi') {
                filteredSchemas = allSchemas.filter(s =>
                    s.allowedRoles?.includes('qi')
                );
            } else if (userRole === 'staff') {
                filteredSchemas = allSchemas.filter(s =>
                    s.allowedRoles?.includes('gs') ||
                    s.allowedRoles?.includes('manufacturing_staff') ||
                    s.allowedRoles?.includes('staff')
                );
            }

            setSchemas(filteredSchemas);
        } catch (error) {
            console.error('Error fetching schemas:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleFormClick = (schema) => {
        if (!selectedDrone) {
            alert('Please select a drone first to fill this form.');
            return;
        }

        const drone = drones.find(d => d._id === selectedDrone);
        const serial = drone?.serialNo || drone?.droneId || '';
        const model = drone?.model || drone?.modelNo || 'CS_KRISHI_10L';
        
        navigate(`/staff/forms/${schema.formCode}?droneId=${selectedDrone}&droneSerial=${serial}&modelNo=${model}`);
    };

    const handleRequestAll = async () => {
        alert('Access requests are no longer required. You can fill any form directly.');
    };

    const getCategoryColor = (category) => {
        const colors = {
            manufacturing: '#2196F3',
            quality: '#4CAF50',
            testing: '#FF9800',
            packaging: '#9C27B0',
            dispatch: '#F44336',
            certificate: '#FFD600',
            material: '#00BCD4'
        };
        return colors[category] || '#757575';
    };

    if (loading) {
        return (
            <div className="loading-container">
                <div className="loading-spinner"></div>
            </div>
        );
    }

    // Group schemas by category
    const grouped = schemas.reduce((acc, schema) => {
        const cat = schema.category || 'other';
        if (!acc[cat]) acc[cat] = [];
        acc[cat].push(schema);
        return acc;
    }, {});

    return (
        <div>
            <div className="page-header">
                <div>
                    <h1 className="page-title">Available Forms</h1>
                    <p className="page-subtitle">Select a drone and form to fill out</p>
                </div>
            </div>

            {/* Drone Selection */}
            <div className="card" style={{ marginBottom: '24px', maxWidth: '600px', display: 'flex', gap: '16px', alignItems: 'flex-end' }}>
                <div className="form-group" style={{ flex: 1, marginBottom: 0 }}>
                    <label className="form-label">Select Drone Target</label>
                    <select
                        className="form-select"
                        value={selectedDrone}
                        onChange={(e) => setSelectedDrone(e.target.value)}
                        style={{ border: '2px solid #2196F3' }}
                    >
                        <option value="">-- Select a Drone Serial No --</option>
                        {drones.map(d => (
                            <option key={d._id} value={d._id}>
                                {d.serialNo} ({d.model || d.modelNo})
                            </option>
                        ))}
                    </select>
                </div>
                <button
                    onClick={handleRequestAll}
                    className="btn btn-primary"
                    disabled={!selectedDrone}
                    style={{ height: '42px', padding: '0 20px' }}
                >
                    Request All
                </button>
            </div>

            {Object.entries(grouped).map(([category, forms]) => (
                <div key={category} style={{ marginBottom: '32px' }}>
                    <h2 style={{
                        fontSize: '1rem',
                        textTransform: 'uppercase',
                        color: getCategoryColor(category),
                        marginBottom: '16px',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '8px'
                    }}>
                        <span style={{
                            width: '8px',
                            height: '8px',
                            borderRadius: '50%',
                            background: getCategoryColor(category)
                        }}></span>
                        {category} Forms
                    </h2>

                    <div className="grid grid-cols-3 gap-md">
                        {forms.map((schema) => (
                            <div
                                key={schema._id}
                                onClick={() => handleFormClick(schema)}
                                className="card"
                                style={{
                                    textDecoration: 'none',
                                    borderLeft: `4px solid ${getCategoryColor(schema.category)}`,
                                    transition: 'transform 0.2s, box-shadow 0.2s',
                                    cursor: 'pointer'
                                }}
                            >
                                <div style={{
                                    display: 'flex',
                                    justifyContent: 'space-between',
                                    alignItems: 'flex-start',
                                    marginBottom: '8px'
                                }}>
                                    <span style={{
                                        background: '#f5f5f5',
                                        padding: '4px 8px',
                                        borderRadius: '4px',
                                        fontFamily: 'monospace',
                                        fontSize: '0.75rem',
                                        fontWeight: 600
                                    }}>
                                        {schema.formCode}
                                    </span>
                                    <span style={{
                                        width: '24px',
                                        height: '24px',
                                        borderRadius: '50%',
                                        background: '#FFD600',
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        fontSize: '0.625rem',
                                        fontWeight: 600
                                    }}>
                                        {schema.workflowOrder}
                                    </span>
                                </div>

                                <h3 style={{ fontSize: '0.9rem', marginBottom: '4px' }}>
                                    {schema.formName}
                                </h3>
                                <p className="text-xs text-muted">
                                    {schema.sections?.reduce((acc, s) => acc + (s.fields?.length || 0), 0) || 0} fields
                                </p>
                            </div>
                        ))}
                    </div>
                </div>
            ))}
        </div>
    );
};

export default StaffForms;
