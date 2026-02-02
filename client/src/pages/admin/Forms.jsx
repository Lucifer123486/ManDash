import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { formsAPI } from '../../services/api';

const Forms = () => {
    const [schemas, setSchemas] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetchSchemas();
    }, []);

    const fetchSchemas = async () => {
        try {
            const response = await formsAPI.getSchemas();
            setSchemas(response.data.data || []);
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

    return (
        <div>
            <div className="page-header">
                <div>
                    <h1 className="page-title">Form Schemas</h1>
                    <p className="page-subtitle">All {schemas.length} forms available in the system</p>
                </div>
            </div>

            {/* Category Filter */}
            <div style={{ display: 'flex', gap: '8px', marginBottom: '24px', flexWrap: 'wrap' }}>
                {['All', 'manufacturing', 'quality', 'testing', 'packaging', 'dispatch', 'certificate', 'material'].map((cat) => (
                    <span
                        key={cat}
                        style={{
                            padding: '6px 16px',
                            borderRadius: '20px',
                            fontSize: '0.75rem',
                            background: cat === 'All' ? '#FFD600' : '#f5f5f5',
                            color: cat === 'All' ? '#212121' : '#666',
                            cursor: 'pointer',
                            textTransform: 'capitalize'
                        }}
                    >
                        {cat}
                    </span>
                ))}
            </div>

            {/* Forms Grid */}
            <div className="grid grid-cols-3 gap-lg">
                {schemas.map((schema) => (
                    <div key={schema._id} className="card" style={{ position: 'relative', overflow: 'hidden' }}>
                        {/* Category Badge */}
                        <div style={{
                            position: 'absolute',
                            top: '16px',
                            right: '16px',
                            padding: '4px 12px',
                            borderRadius: '12px',
                            fontSize: '0.625rem',
                            fontWeight: 600,
                            textTransform: 'uppercase',
                            background: getCategoryColor(schema.category) + '20',
                            color: getCategoryColor(schema.category)
                        }}>
                            {schema.category}
                        </div>

                        {/* Form Code */}
                        <div style={{
                            background: '#f5f5f5',
                            padding: '8px 12px',
                            borderRadius: '8px',
                            display: 'inline-block',
                            marginBottom: '12px'
                        }}>
                            <span style={{ fontFamily: 'monospace', fontWeight: 600, fontSize: '0.875rem' }}>
                                {schema.formCode}
                            </span>
                        </div>

                        {/* Form Name */}
                        <h3 style={{ fontSize: '1rem', marginBottom: '8px', paddingRight: '60px' }}>
                            {schema.formName}
                        </h3>

                        {/* Description */}
                        <p className="text-sm text-muted" style={{ marginBottom: '16px', minHeight: '40px' }}>
                            {schema.description || 'No description'}
                        </p>

                        {/* Fields Count */}
                        <div style={{
                            display: 'flex',
                            gap: '16px',
                            fontSize: '0.75rem',
                            color: '#666',
                            marginBottom: '16px'
                        }}>
                            <span>📋 {schema.sections?.reduce((acc, s) => acc + (s.fields?.length || 0), 0) || 0} fields</span>
                            <span>📝 {schema.headerFields?.length || 0} header fields</span>
                        </div>

                        {/* Workflow Order */}
                        <div style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '8px',
                            marginBottom: '16px',
                            fontSize: '0.75rem'
                        }}>
                            <span style={{
                                width: '24px',
                                height: '24px',
                                borderRadius: '50%',
                                background: '#FFD600',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                fontWeight: 600
                            }}>
                                {schema.workflowOrder}
                            </span>
                            <span className="text-muted">Workflow Step</span>
                            {schema.requiresApproval && (
                                <span className="badge badge-warning" style={{ marginLeft: 'auto' }}>
                                    Requires Approval
                                </span>
                            )}
                        </div>

                        {/* Actions */}
                        <div style={{ display: 'flex', gap: '8px' }}>
                            <Link
                                to={`/staff/forms/${schema.formCode}`}
                                className="btn btn-primary btn-sm"
                                style={{ flex: 1 }}
                            >
                                Fill Form
                            </Link>
                            <button className="btn btn-outline btn-sm">
                                Preview
                            </button>
                        </div>
                    </div>
                ))}
            </div>

            {schemas.length === 0 && (
                <div style={{ textAlign: 'center', padding: '60px' }}>
                    <p className="text-muted">No form schemas found. Run the seed script to add forms.</p>
                </div>
            )}
        </div>
    );
};

export default Forms;
