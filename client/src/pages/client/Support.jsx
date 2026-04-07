import React, { useState, useEffect } from 'react';
import { TROUBLESHOOTING_DATA } from '../../data/troubleshootingData';
import { ticketsAPI } from '../../services/api';
import { useLanguage } from '../../context/LanguageContext';

const Support = () => {
    const { t } = useLanguage();
    const [selectedCategory, setSelectedCategory] = useState('');
    const [activeQuestion, setActiveQuestion] = useState(null);
    // Initial message based on language
    const [messages, setMessages] = useState([]);

    // Reset/Init messages when component mounts or language changes (optional, but good for dynamic switch)
    useEffect(() => {
        // Only reset if empty or on language change if we want to force refresh context
        if (messages.length === 0) {
            setMessages([
                { type: 'bot', text: t('support.bot.welcome') }
            ]);
        }
        fetchUserTickets();
    }, []); // Run once on mount

    const fetchUserTickets = async () => {
        try {
            setTicketsLoading(true);
            const response = await ticketsAPI.getAll();
            setUserTickets(response.data.data || []);
        } catch (error) {
            console.error('Error fetching tickets:', error);
        } finally {
            setTicketsLoading(false);
        }
    };

    const [showContact, setShowContact] = useState(false);
    const [ticketMode, setTicketMode] = useState(false);
    const [ticketData, setTicketData] = useState({ category: '', description: '' });
    const [ticketLoading, setTicketLoading] = useState(false);
    const [userTickets, setUserTickets] = useState([]);
    const [ticketsLoading, setTicketsLoading] = useState(true);

    // Helper to get translated category label
    const getCategoryLabel = (catKey) => t(catKey);

    const handleCategorySelect = (e) => {
        const catId = e.target.value;
        setSelectedCategory(catId);
        setActiveQuestion(null);
        setTicketMode(false);

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
        // Hide contact/tickets temporarily and definitely hide the list by resetting selectedCategory or using a flag
        // Let's use setActiveQuestion to control visibility
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
                { type: 'user', text: t('support.bot.unsolvedUser') },
                { type: 'bot', text: t('support.bot.unsolvedBot') }
            ]);
            setShowContact(true);
        }
    };

    const handleRaiseTicket = async (e) => {
        e.preventDefault();
        try {
            setTicketLoading(true);
            const categoryData = TROUBLESHOOTING_DATA.find(c => c.id === selectedCategory);
            const catLabel = categoryData ? t(categoryData.categoryKey) : 'General';

            await ticketsAPI.create({
                category: catLabel,
                issueDescription: ticketData.description
            });
            alert(t('support.ticketCreated'));
            setTicketMode(false);
            setTicketData({ category: '', description: '' });
            setMessages(prev => [...prev, { type: 'bot', text: t('support.ticketCreated') }]);
            fetchUserTickets(); // Refresh list
        } catch (err) {
            alert('Failed to raise ticket: ' + err.message);
        } finally {
            setTicketLoading(false);
        }
    };

    return (
        <div className="support-container">
            <h2 className="page-title">🛸 {t('support.title')}</h2>

            <div className="support-grid">
                {/* Chat / Bot Area */}
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

                    {/* Controls */}
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
                            !showContact && !ticketMode && activeQuestion === null && (
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

                        {activeQuestion !== null && !showContact && !ticketMode && (
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

                        {/* Contact Options */}
                        {showContact && (
                            <div className="contact-options">
                                <p>{t('support.bot.sorry')}</p>
                                <button onClick={() => setTicketMode(true)} className="btn btn-primary">🎫 {t('support.raiseTicket')}</button>
                                <div className="direct-contact">
                                    <p>{t('support.contactUs')}</p>
                                    <a href="mailto:komalrnikam2019@gmail.com" className="contact-email">📧 komalrnikam2019@gmail.com</a>
                                </div>
                                <button className="btn btn-text" onClick={() => setShowContact(false)}>{t('support.back')}</button>
                            </div>
                        )}
                    </div>
                </div>

                {/* Ticket Form */}
                {ticketMode && (
                    <div className="ticket-modal">
                        <div className="ticket-form-card">
                            <h3>{t('support.raiseTicket')}</h3>
                            <form onSubmit={handleRaiseTicket}>
                                <div className="form-group">
                                    <label>Category</label>
                                    <input type="text" className="form-input" value={selectedCategory ? t(TROUBLESHOOTING_DATA.find(c => c.id === selectedCategory).categoryKey) : ''} disabled />
                                </div>
                                <div className="form-group">
                                    <label>Issue Description</label>
                                    <textarea
                                        className="form-input"
                                        rows="5"
                                        value={ticketData.description}
                                        onChange={(e) => setTicketData({ ...ticketData, description: e.target.value })}
                                        required
                                        placeholder={t('support.description')}
                                    ></textarea>
                                </div>
                                <div className="form-actions">
                                    <button type="button" onClick={() => setTicketMode(false)} className="btn btn-secondary">{t('common.cancel') || 'Cancel'}</button>
                                    <button type="submit" className="btn btn-primary" disabled={ticketLoading}>
                                        {ticketLoading ? 'Submitting...' : t('support.submitTicket')}
                                    </button>
                                </div>
                            </form>
                        </div>
                    </div>
                )}
            </div>

            {/* Ticket History Section */}
            <div className="ticket-history-section" style={{ marginTop: '40px' }}>
                <h3 style={{ marginBottom: '15px' }}>🎫 {t('support.myTickets') || 'My Support Tickets'}</h3>
                {ticketsLoading ? (
                    <div className="loading-small">Loading tickets...</div>
                ) : userTickets.length === 0 ? (
                    <div className="empty-state">
                        <p className="text-muted">You haven't raised any tickets yet.</p>
                    </div>
                ) : (
                    <div className="ticket-list">
                        {userTickets.map(ticket => (
                            <div key={ticket._id} className="ticket-card">
                                <div className="ticket-header">
                                    <span className="ticket-id">#{ticket.ticketNo || ticket._id.slice(-6)}</span>
                                    <span className={`ticket-status status-${ticket.status.toLowerCase().replace(' ', '-')}`}>
                                        {ticket.status}
                                    </span>
                                </div>
                                <div className="ticket-body">
                                    <div className="ticket-category"><strong>Category:</strong> {ticket.category}</div>
                                    <div className="ticket-desc">{ticket.issueDescription}</div>
                                </div>
                                <div className="ticket-footer">
                                    <span className="ticket-date">{new Date(ticket.createdAt).toLocaleDateString()}</span>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>

            <style>{`
                .support-container {
                    padding: 20px;
                    max-width: 1000px;
                    margin: 0 auto;
                }
                .support-grid {
                    display: grid;
                    gap: 20px;
                }
                .bot-section {
                    background: white;
                    border-radius: 12px;
                    box-shadow: 0 4px 12px rgba(0,0,0,0.1);
                    overflow: hidden;
                    display: flex;
                    flex-direction: column;
                    height: 70vh;
                }
                .chat-window {
                    flex: 1;
                    padding: 20px;
                    overflow-y: auto;
                    background: #f8f9fa;
                    display: flex;
                    flex-direction: column;
                    gap: 15px;
                }
                .chat-message {
                    display: flex;
                    flex-direction: column;
                    max-width: 80%;
                }
                .chat-message.bot {
                    align-self: flex-start;
                }
                .chat-message.user {
                    align-self: flex-end;
                }
                .message-bubble {
                    padding: 12px 16px;
                    border-radius: 12px;
                    font-size: 15px;
                    line-height: 1.4;
                    white-space: pre-wrap;
                }
                .bot .message-bubble {
                    background: #e3f2fd;
                    color: #0d47a1;
                    border-bottom-left-radius: 2px;
                }
                .user .message-bubble {
                    background: #2196f3;
                    color: white;
                    border-bottom-right-radius: 2px;
                }
                .resolution-actions {
                    margin-top: 8px;
                    display: flex;
                    gap: 10px;
                }
                .bot-controls {
                    padding: 20px;
                    background: white;
                    border-top: 1px solid #eee;
                }
                .questions-list {
                    display: flex;
                    flex-direction: column;
                    gap: 10px;
                }
                .question-btn {
                    text-align: left;
                    padding: 10px;
                    border: 1px solid #e0e0e0;
                    background: white;
                    border-radius: 6px;
                    cursor: pointer;
                    transition: all 0.2s;
                }
                .question-btn:hover {
                    background: #f5f5f5;
                    border-color: #bdbdbd;
                }
                .reset-btn {
                    margin-top: 10px;
                    color: #666;
                }
                .contact-options {
                    text-align: center;
                    padding: 20px;
                }
                .contact-email {
                    display: block;
                    font-size: 18px;
                    color: #d32f2f;
                    font-weight: bold;
                    margin: 10px 0;
                    text-decoration: none;
                }
                .ticket-modal {
                    position: fixed;
                    top: 0; left: 0; right: 0; bottom: 0;
                    background: rgba(0,0,0,0.5);
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    z-index: 1000;
                }
                .ticket-form-card {
                    background: white;
                    padding: 30px;
                    border-radius: 12px;
                    width: 100%;
                    max-width: 500px;
                }
                .post-answer-actions {
                    display: flex;
                    gap: 15px;
                    justify-content: center;
                    padding-top: 10px;
                }
                .ticket-list {
                    display: grid;
                    grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
                    gap: 20px;
                }
                .ticket-card {
                    background: white;
                    border: 1px solid #eee;
                    border-radius: 8px;
                    padding: 16px;
                    box-shadow: 0 2px 4px rgba(0,0,0,0.05);
                }
                .ticket-header {
                    display: flex;
                    justify-content: space-between;
                    margin-bottom: 10px;
                    padding-bottom: 8px;
                    border-bottom: 1px solid #f5f5f5;
                }
                .ticket-id {
                    font-weight: bold;
                    color: #666;
                    font-size: 13px;
                }
                .ticket-status {
                    font-size: 11px;
                    font-weight: 600;
                    text-transform: uppercase;
                    padding: 3px 8px;
                    border-radius: 12px;
                }
                .status-open { background: #e3f2fd; color: #2196f3; }
                .status-in-progress { background: #fff3e0; color: #ff9800; }
                .status-resolved { background: #e8f5e9; color: #4caf50; }
                .ticket-body {
                    font-size: 14px;
                    margin-bottom: 10px;
                }
                .ticket-desc {
                    margin-top: 5px;
                    color: #555;
                    display: -webkit-box;
                    -webkit-line-clamp: 2;
                    -webkit-box-orient: vertical;
                    overflow: hidden;
                }
                .ticket-footer {
                    font-size: 12px;
                    color: #999;
                    text-align: right;
                }
            `}</style>
        </div>
    );
};

export default Support;
