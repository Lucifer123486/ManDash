import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { formsAPI } from '../../services/api';
import { useAuth } from '../../context/AuthContext';

const StaffForms = () => {
    const [schemas, setSchemas] = useState([]);
    const [loading, setLoading] = useState(true);
    const { user } = useAuth();

    useEffect(() => {
        fetchSchemas();
    }, []);

    const fetchSchemas = async () => {
        try {
            const response = await formsAPI.getSchemas();
            const allSchemas = response.data.data || [];

            // Filter by user role
            const userRole = user?.role;
            let filteredSchemas = allSchemas;

            if (userRole === 'qi') {
                // QI sees only qi-accessible forms
                filteredSchemas = allSchemas.filter(s =>
                    s.allowedRoles?.includes('qi')
                );
            } else if (userRole === 'staff') {
                // Staff sees gs and manufacturing_staff forms
                filteredSchemas = allSchemas.filter(s =>
                    s.allowedRoles?.includes('gs') ||
                    s.allowedRoles?.includes('manufacturing_staff') ||
                    s.allowedRoles?.includes('staff')
                );
            }
            // Admin sees all

            setSchemas(filteredSchemas);
        } catch (error) {
            console.error('Error fetching schemas:', error);
        } finally {
            setLoading(false);
        }
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
                    <p className="page-subtitle">Select a form to fill out</p>
                </div>
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
                            <Link
                                key={schema._id}
                                to={`/staff/forms/${schema.formCode}`}
                                className="card"
                                style={{
                                    textDecoration: 'none',
                                    borderLeft: `4px solid ${getCategoryColor(schema.category)}`,
                                    transition: 'transform 0.2s, box-shadow 0.2s'
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
                            </Link>
                        ))}
                    </div>
                </div>
            ))}
        </div>
    );
};

export default StaffForms;
