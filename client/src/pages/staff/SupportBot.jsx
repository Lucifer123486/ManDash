import React, { useState, useEffect } from 'react';
import { TROUBLESHOOTING_DATA } from '../../data/troubleshootingData';
import { useLanguage } from '../../context/LanguageContext';

const SupportBot = () => {
    const { t } = useLanguage();
    const [selectedCategory, setSelectedCategory] = useState('');
    const [activeQuestion, setActiveQuestion] = useState(null);
    const [messages, setMessages] = useState([]);
    const [showContact, setShowContact] = useState(false);

    useEffect(() => {
        if (messages.length === 0) {
            setMessages([
                { type: 'bot', text: t('support.bot.welcome') }
            ]);
        }
    }, [messages.length, t]);

    const handleCategorySelect = (e) => {
        const catId = e.target.value;
        setSelectedCategory(catId);
        setActiveQuestion(null);
        setShowContact(false);

        if (catId) {
            const catItem = TROUBLESHOOTING_DATA.find(c => c.id === catId);
            const catLabel = catItem ? t(catItem.categoryKey) : catId;

            setMessages(prev => [
                ...prev,
                { type: 'user', text: `${t('support.bot.issueWith')} ${catLabel}` },
                { type: 'bot', text: `${t('support.bot.troubleshoot')} ${catLabel}${t('support.bot.selectQuestion')}` }
            ]);
        }
    };

    const handleQuestionClick = (qIndex) => {
        const categoryData = TROUBLESHOOTING_DATA.find(c => c.id === selectedCategory);
        if (!categoryData) return;

        const question = categoryData.questions[qIndex];

        setMessages(prev => [
            ...prev,
            { type: 'user', text: t(question.q) },
            { type: 'bot', text: t(question.a) },
            { type: 'bot', text: t('support.bot.resolutionCheck'), isResolutionCheck: true }
        ]);
        setActiveQuestion(qIndex);
    };

    const handleResolution = (solved) => {
        if (solved) {
            setMessages(prev => [
                ...prev,
                { type: 'user', text: t('support.bot.solvedUser') },
                { type: 'bot', text: t('support.bot.solvedBot') }
            ]);
        } else {
            setMessages(prev => [
                ...prev,
                { type: 'user', text: "No, that didn't help." },
                { type: 'bot', text: "If the issue cannot be resolved here, please search for the customer in the Users panel and click 'Support' to fill out the manual Support Ticket Form on their behalf." }
            ]);
            setShowContact(true);
        }
    };

    return (
        <div className="support-container">
            <h2 className="page-title" style={{ marginBottom: '8px' }}>🤖 Staff Reference Chatbot</h2>
            <p className="page-subtitle" style={{ color: '#666', marginBottom: '24px' }}>
                Use this tool to guide customers through troubleshooting steps over the phone.
            </p>

            <div className="support-grid" style={{ maxWidth: '800px', margin: '0 auto' }}>
                <div className="bot-section">
                    <div className="chat-window">
                        {messages.map((msg, idx) => (
                            <div key={idx} className={`chat-message ${msg.type}`}>
                                <div className="message-bubble">{msg.text}</div>
                                {msg.isResolutionCheck && (
                                    <div className="resolution-actions">
                                        <button onClick={() => handleResolution(true)} className="btn btn-sm btn-success">✅ {t('support.bot.yes')}</button>
                                        <button onClick={() => handleResolution(false)} className="btn btn-sm btn-danger">❌ {t('support.bot.no')}</button>
                                    </div>
                                )}
                            </div>
                        ))}
                    </div>

                    <div className="bot-controls">
                        {!selectedCategory ? (
                            <select
                                className="form-select"
                                value={selectedCategory}
                                onChange={handleCategorySelect}
                            >
                                <option value="">-- {t('support.selectComponent')} --</option>
                                {TROUBLESHOOTING_DATA.map(c => (
                                    <option key={c.id} value={c.id}>
                                        {t(c.categoryKey)}
                                    </option>
                                ))}
                            </select>
                        ) : (
                            !showContact && activeQuestion === null && (
                                <div className="questions-list">
                                    <p>{t('support.bot.selectQuestion')}</p>
                                    {TROUBLESHOOTING_DATA.find(c => c.id === selectedCategory)?.questions.map((q, idx) => (
                                        <button
                                            key={idx}
                                            className="question-btn"
                                            onClick={() => handleQuestionClick(idx)}
                                        >
                                            {t(q.q)}
                                        </button>
                                    ))}
                                    <button
                                        className="btn btn-text reset-btn"
                                        onClick={() => { setSelectedCategory(''); setMessages([{ type: 'bot', text: t('support.bot.welcome') }]); }}
                                    >
                                        {t('support.startOver')}
                                    </button>
                                </div>
                            )
                        )}

                        {activeQuestion !== null && !showContact && (
                            <div className="post-answer-actions">
                                <button
                                    className="btn btn-outline btn-sm"
                                    onClick={() => setActiveQuestion(null)}
                                >
                                    ⬅️ {t('support.backToQuestions') || 'Back to Questions'}
                                </button>
                                <button
                                    className="btn btn-text btn-sm"
                                    onClick={() => {
                                        setSelectedCategory('');
                                        setActiveQuestion(null);
                                        setMessages([{ type: 'bot', text: t('support.bot.welcome') }]);
                                    }}
                                >
                                    🔄 {t('support.startOver')}
                                </button>
                            </div>
                        )}

                        {showContact && (
                            <div className="contact-options" style={{ padding: '15px' }}>
                                <p style={{ fontWeight: '500', color: '#B71C1C' }}>
                                    Is the customer still facing issues?
                                </p>
                                <p style={{ fontSize: '14px', margin: '10px 0' }}>
                                    Please go to the <strong>Staff & Clients</strong> page, locate the customer, and click the yellow <strong>🎧 Support</strong> button to raise a manual ticket.
                                </p>
                                <button className="btn btn-text" onClick={() => setShowContact(false)}>{t('support.back')}</button>
                            </div>
                        )}
                    </div>
                </div>
            </div>

            <style>{`
                .support-container { padding: 20px; }
                .bot-section {
                    background: white; border-radius: 12px;
                    box-shadow: 0 4px 12px rgba(0,0,0,0.1); overflow: hidden;
                    display: flex; flex-direction: column; height: 70vh;
                }
                .chat-window {
                    flex: 1; padding: 20px; overflow-y: auto; background: #f8f9fa;
                    display: flex; flex-direction: column; gap: 15px;
                }
                .chat-message { display: flex; flex-direction: column; max-width: 80%; }
                .chat-message.bot { align-self: flex-start; }
                .chat-message.user { align-self: flex-end; }
                .message-bubble {
                    padding: 12px 16px; border-radius: 12px; font-size: 15px;
                    line-height: 1.4; white-space: pre-wrap;
                }
                .bot .message-bubble { background: #e3f2fd; color: #0d47a1; border-bottom-left-radius: 2px; }
                .user .message-bubble { background: #2196f3; color: white; border-bottom-right-radius: 2px; }
                .resolution-actions { margin-top: 8px; display: flex; gap: 10px; }
                .bot-controls { padding: 20px; background: white; border-top: 1px solid #eee; }
                .questions-list { display: flex; flex-direction: column; gap: 10px; }
                .question-btn {
                    text-align: left; padding: 10px; border: 1px solid #e0e0e0;
                    background: white; border-radius: 6px; cursor: pointer; transition: all 0.2s;
                }
                .question-btn:hover { background: #f5f5f5; border-color: #bdbdbd; }
                .reset-btn { margin-top: 10px; color: #666; }
                .contact-options { text-align: center; }
                .post-answer-actions { display: flex; gap: 15px; justify-content: center; padding-top: 10px; }
            `}</style>
        </div>
    );
};

export default SupportBot;
