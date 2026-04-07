import { useState } from 'react';
import { useLanguage } from '../../context/LanguageContext';
import { useNavigate } from 'react-router-dom';

const ClientFAQ = () => {
    const { t } = useLanguage();
    const navigate = useNavigate();
    const [activeIndex, setActiveIndex] = useState(null);

    const toggleAccordion = (index) => {
        setActiveIndex(activeIndex === index ? null : index);
    };

    // We assume keys faq.q1, faq.a1 ... faq.q5, faq.a5 exist
    const faqs = [1, 2, 5];

    return (
        <div className="container">
            <div className="page-header">
                <div>
                    <h1 className="page-title">{t('faq.title') || 'Frequently Asked Questions'}</h1>
                    <p className="page-subtitle">{t('faq.subtitle') || 'Find answers to common questions'}</p>
                </div>
                <button className="btn btn-secondary" onClick={() => navigate('/client')}>
                    {t('common.back') || 'Back'}
                </button>
            </div>

            <div className="faq-list" style={{ maxWidth: '800px', margin: '0 auto' }}>
                {faqs.map((i) => (
                    <div key={i} className={`faq-item ${activeIndex === i ? 'active' : ''}`} style={{
                        border: '1px solid #e0e0e0',
                        borderRadius: '8px',
                        marginBottom: '16px',
                        overflow: 'hidden',
                        background: 'white'
                    }}>
                        <button
                            className="faq-question"
                            onClick={() => toggleAccordion(i)}
                            style={{
                                width: '100%',
                                textAlign: 'left',
                                padding: '20px',
                                background: 'white',
                                border: 'none',
                                display: 'flex',
                                justifyContent: 'space-between',
                                alignItems: 'center',
                                fontSize: '1rem',
                                fontWeight: 600,
                                cursor: 'pointer'
                            }}
                        >
                            <span>{t(`faq.q${i}`) || `Question ${i}`}</span>
                            <span style={{ fontSize: '1.5rem', lineHeight: 1 }}>{activeIndex === i ? '−' : '+'}</span>
                        </button>

                        {activeIndex === i && (
                            <div className="faq-answer" style={{
                                padding: '0 20px 20px 20px',
                                color: '#666',
                                lineHeight: 1.6,
                                borderTop: '1px solid #f0f0f0'
                            }}>
                                {t(`faq.a${i}`) || `Answer ${i}`}
                            </div>
                        )}
                    </div>
                ))}
            </div>

            <div style={{ textAlign: 'center', marginTop: '40px' }}>
                <p className="text-muted">{t('faq.stillHaveQuestions') || 'Still have questions?'}</p>
                <button
                    className="btn btn-primary"
                    style={{ marginTop: '16px' }}
                    onClick={() => window.location.href = "mailto:support.agri@cerebrospark.in?subject=state ur issue or query"}
                >
                    {t('faq.contactSupport') || 'Contact Support'}
                </button>
            </div>
        </div>
    );
};

export default ClientFAQ;
