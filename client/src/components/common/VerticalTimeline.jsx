import React from 'react';
import { useLanguage } from '../../context/LanguageContext';

const VerticalTimeline = ({ steps, currentStatus }) => {
    const { t } = useLanguage();

    const getStepStatus = (step, current) => {
        const stepIndex = steps.indexOf(step);
        const currentIndex = steps.indexOf(current);
        if (stepIndex < currentIndex) return 'completed';
        if (stepIndex === currentIndex) return 'active';
        return 'pending';
    };

    return (
        <div className="vertical-timeline" style={{ padding: '10px 0 10px 10px' }}>
            {steps.map((step, index) => {
                const status = getStepStatus(step, currentStatus);
                const isLast = index === steps.length - 1;

                // Color Logic
                let color = '#bdbdbd'; // Grey (Pending)
                let bgColor = '#f5f5f5';
                if (status === 'completed') {
                    color = '#4CAF50'; // Green
                    bgColor = '#e8f5e9';
                } else if (status === 'active') {
                    color = '#FFD600'; // Yellow
                    bgColor = '#fffde7'; // Light Yellow
                }

                return (
                    <div key={step} style={{ display: 'flex', minHeight: '40px', position: 'relative' }}>
                        {/* 1. Icon & Line Column */}
                        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', marginRight: '16px', width: '24px' }}>
                            {/* Dot / Icon */}
                            <div style={{
                                width: '20px',
                                height: '20px',
                                borderRadius: '50%',
                                background: status === 'completed' || status === 'active' ? color : 'transparent',
                                border: `2px solid ${color}`,
                                zIndex: 2,
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                color: status === 'completed' ? 'white' : 'transparent',
                                fontSize: '12px'
                            }}>
                                {status === 'completed' && '✓'}
                            </div>

                            {/* Vertical Connector Line */}
                            {!isLast && (
                                <div style={{
                                    width: '2px',
                                    flex: 1,
                                    background: status === 'completed' ? '#4CAF50' : '#e0e0e0',
                                    margin: '4px 0',
                                    minHeight: '24px'
                                }}></div>
                            )}
                        </div>

                        {/* 2. Content Column */}
                        <div style={{ paddingBottom: '16px', flex: 1 }}>
                            <div style={{
                                fontWeight: status === 'active' ? 'bold' : 'normal',
                                color: status === 'active' ? '#f57f17' : (status === 'completed' ? '#2e7d32' : '#757575'),
                                fontSize: '0.9rem',
                                lineHeight: '1.2'
                            }}>
                                {t(`status.${step}`) || step.replace(/_/g, ' ')}
                            </div>

                            {/* Optional: Add date or description here later */}
                            {status === 'active' && (
                                <span className="badge badge-warning" style={{ marginTop: '4px', fontSize: '0.7rem', display: 'inline-block' }}>
                                    Current Stage
                                </span>
                            )}
                        </div>
                    </div>
                );
            })}
        </div>
    );
};

export default VerticalTimeline;
