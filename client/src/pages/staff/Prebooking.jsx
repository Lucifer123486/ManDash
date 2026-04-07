import React, { useState, useEffect } from 'react';
import { prebookingAPI, usersAPI } from '../../services/api';
import { FaPhone, FaUser, FaEnvelope, FaMapMarkerAlt, FaMoneyBillWave, FaHistory, FaPlus, FaSearch, FaEdit, FaFileExcel } from 'react-icons/fa';
import { toast } from 'react-toastify';

const Prebooking = () => {
    const [leads, setLeads] = useState([]);
    const [staff, setStaff] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState('');
    
    // Modals
    const [showAddModal, setShowAddModal] = useState(false);
    const [showCallModal, setShowCallModal] = useState(false);
    const [selectedLead, setSelectedLead] = useState(null);
    const user = JSON.parse(localStorage.getItem('user'));
    const isAdmin = user?.role === 'admin';
    
    const [formData, setFormData] = useState({
        name: '',
        phone: '',
        email: '',
        address: '',
        city: '',
        district: '',
        state: '',
        pincode: '',
        source: 'Referral',
        sourceOther: '',
        tokenAmount: '',
        assignedSalesStaff: '',
        status: 'Pending'
    });
    const [callDescription, setCallDescription] = useState('');
    const [specialNote, setSpecialNote] = useState('');
    const [callRecording, setCallRecording] = useState(null);

    useEffect(() => {
        fetchData();
        fetchStaff();
    }, []);

    const fetchData = async () => {
        try {
            setLoading(true);
            const response = await prebookingAPI.getAll();
            setLeads(response.data.data || []);
        } catch (error) {
            console.error('Error fetching leads:', error);
            toast.error('Failed to fetch prebooking leads');
        } finally {
            setLoading(false);
        }
    };

    const fetchStaff = async () => {
        try {
            const response = await usersAPI.getAll({ role: 'admin,staff', limit: 100 });
            setStaff(response.data.data || []);
        } catch (error) {
            console.error('Error fetching staff:', error);
        }
    };

    const handleInputChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
    };

    const handleAddSubmit = async (e) => {
        e.preventDefault();
        try {
            if (selectedLead) {
                await prebookingAPI.update(selectedLead._id, formData);
                toast.success('Lead updated successfully');
            } else {
                await prebookingAPI.create(formData);
                toast.success('New lead added successfully');
            }
            setShowAddModal(false);
            setSelectedLead(null);
            setFormData({
                name: '',
                phone: '',
                email: '',
                address: '',
                city: '',
                district: '',
                state: '',
                pincode: '',
                source: 'Referral',
                sourceOther: '',
                tokenAmount: '',
                assignedSalesStaff: '',
                status: 'Pending'
            });
            fetchData();
        } catch (error) {
            toast.error(error.response?.data?.message || 'Error saving lead');
        }
    };

    const handleAddCall = async (e) => {
        e.preventDefault();
        try {
            if (!callRecording) {
                toast.error('Call recording is mandatory');
                return;
            }

            const formData = new FormData();
            formData.append('description', callDescription);
            formData.append('specialNote', specialNote);
            formData.append('callRecording', callRecording);

            await prebookingAPI.addCall(selectedLead._id, formData);
            toast.success('Call logged successfully');
            
            setShowCallModal(false);
            setCallDescription('');
            setSpecialNote('');
            setCallRecording(null);
            fetchData();
        } catch (error) {
            toast.error(error.response?.data?.message || 'Error logging call');
        }
    };

    const openEditModal = (lead) => {
        setSelectedLead(lead);
        setFormData({
            name: lead.name,
            phone: lead.phone,
            email: lead.email || '',
            address: lead.address || '',
            city: lead.city || '',
            district: lead.district || '',
            state: lead.state || '',
            pincode: lead.pincode || '',
            source: lead.source || 'Referral',
            sourceOther: lead.sourceOther || '',
            tokenAmount: lead.tokenAmount || '',
            assignedSalesStaff: lead.assignedSalesStaff?._id || lead.assignedSalesStaff || '',
            status: lead.status || 'Pending'
        });
        setShowAddModal(true);
    };

    const openCallModal = (lead) => {
        setSelectedLead(lead);
        setShowCallModal(true);
    };

    const handleExport = async () => {
        try {
            toast.info('Generating Excel report...');
            // We use the base axios instance to handle the blob response
            const response = await prebookingAPI.exportExcel();
            
            // Create a URL for the blob
            const url = window.URL.createObjectURL(new Blob([response.data]));
            const link = document.createElement('a');
            link.href = url;
            link.setAttribute('download', `Prebooking_Communications_${new Date().toLocaleDateString()}.xlsx`);
            document.body.appendChild(link);
            link.click();
            link.remove();
            window.URL.revokeObjectURL(url);
            toast.success('Report downloaded successfully');
        } catch (error) {
            console.error('Export error:', error);
            toast.error('Failed to export data');
        }
    };

    const filteredLeads = leads.filter(lead => 
        lead.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        lead.phone.includes(searchQuery)
    );

    const stats = {
        total: leads.length,
        interested: leads.filter(l => l.status === 'Interested').length,
        totalToken: leads.reduce((acc, curr) => acc + (Number(curr.tokenAmount) || 0), 0)
    };

    if (loading) return <div className="loading-container">Loading Prebooking data...</div>;

    return (
        <div className="prebooking-page" style={{ padding: '24px' }}>
            <div className="header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '32px' }}>
                <div>
                    <h1 style={{ fontSize: '24px', fontWeight: '700', color: '#1a1a1a', margin: '0' }}>Prebooking Management</h1>
                    <p style={{ color: '#666', marginTop: '4px' }}>Manage potential clients and sales activities</p>
                </div>
                <div style={{ display: 'flex', gap: '12px' }}>
                    {isAdmin && (
                        <button 
                            onClick={handleExport}
                            className="btn-secondary"
                            style={{ 
                                display: 'flex', 
                                alignItems: 'center', 
                                gap: '8px', 
                                padding: '12px 20px', 
                                background: '#217346', 
                                color: 'white', 
                                border: 'none', 
                                borderRadius: '8px', 
                                fontWeight: '600', 
                                cursor: 'pointer' 
                            }}
                        >
                            <FaFileExcel /> Export Communications
                        </button>
                    )}
                    <button 
                        onClick={() => { setSelectedLead(null); setShowAddModal(true); }}
                        className="btn-primary"
                        style={{ 
                            display: 'flex', 
                            alignItems: 'center', 
                            gap: '8px', 
                            padding: '12px 20px', 
                            background: '#0066ff', 
                            color: 'white', 
                            border: 'none', 
                            borderRadius: '8px', 
                            fontWeight: '600', 
                            cursor: 'pointer' 
                        }}
                    >
                        <FaPlus /> Add New Lead
                    </button>
                </div>
            </div>

            {/* Stats Section */}
            <div className="stats-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '20px', marginBottom: '32px' }}>
                <div className="stat-card" style={{ background: 'white', padding: '24px', borderRadius: '12px', boxShadow: '0 2px 4px rgba(0,0,0,0.05)' }}>
                    <p style={{ color: '#666', fontSize: '14px', marginBottom: '8px' }}>Total Leads</p>
                    <h3 style={{ fontSize: '28px', margin: '0', color: '#1a1a1a' }}>{stats.total}</h3>
                </div>
                <div className="stat-card" style={{ background: 'white', padding: '24px', borderRadius: '12px', boxShadow: '0 2px 4px rgba(0,0,0,0.05)' }}>
                    <p style={{ color: '#666', fontSize: '14px', marginBottom: '8px' }}>Interested Clients</p>
                    <h3 style={{ fontSize: '28px', margin: '0', color: '#00c853' }}>{stats.interested}</h3>
                </div>
                <div className="stat-card" style={{ background: 'white', padding: '24px', borderRadius: '12px', boxShadow: '0 2px 4px rgba(0,0,0,0.05)' }}>
                    <p style={{ color: '#666', fontSize: '14px', marginBottom: '8px' }}>Total Token Amount</p>
                    <h3 style={{ fontSize: '28px', margin: '0', color: '#0066ff' }}>₹{stats.totalToken.toLocaleString()}</h3>
                </div>
            </div>

            {/* Table Section */}
            <div className="content-card" style={{ background: 'white', borderRadius: '12px', boxShadow: '0 2px 4px rgba(0,0,0,0.05)', overflow: 'hidden' }}>
                <div className="table-header" style={{ padding: '20px', borderBottom: '1px solid #eee', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div className="search-box" style={{ position: 'relative', width: '300px' }}>
                        <FaSearch style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: '#999' }} />
                        <input 
                            type="text" 
                            placeholder="Search by name or phone..." 
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            style={{ width: '100%', padding: '10px 10px 10px 40px', border: '1px solid #ddd', borderRadius: '8px', fontSize: '14px' }}
                        />
                    </div>
                </div>

                <div style={{ overflowX: 'auto' }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
                        <thead style={{ background: '#f8f9fa' }}>
                            <tr>
                                <th style={{ padding: '16px', fontSize: '14px', fontWeight: '600', color: '#666' }}>Customer Information</th>
                                <th style={{ padding: '16px', fontSize: '14px', fontWeight: '600', color: '#666' }}>Token Amount</th>
                                <th style={{ padding: '16px', fontSize: '14px', fontWeight: '600', color: '#666' }}>Assigned Staff</th>
                                <th style={{ padding: '16px', fontSize: '14px', fontWeight: '600', color: '#666' }}>Last Call</th>
                                <th style={{ padding: '16px', fontSize: '14px', fontWeight: '600', color: '#666' }}>Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            {filteredLeads.map(lead => (
                                <tr key={lead._id} style={{ borderBottom: '1px solid #eee' }}>
                                    <td style={{ padding: '16px' }}>
                                        <div style={{ fontWeight: '600', color: '#1a1a1a' }}>{lead.name}</div>
                                        <div style={{ fontSize: '13px', color: '#666', marginTop: '4px' }}>
                                            <FaPhone size={12} style={{ marginRight: '6px' }} /> {lead.phone}
                                        </div>
                                        {lead.email && (
                                            <div style={{ fontSize: '13px', color: '#666', marginTop: '4px' }}>
                                                <FaEnvelope size={12} style={{ marginRight: '6px' }} /> {lead.email}
                                            </div>
                                        )}
                                    </td>
                                    <td style={{ padding: '16px', color: '#0066ff', fontWeight: '600' }}>
                                        ₹{Number(lead.tokenAmount || 0).toLocaleString()}
                                    </td>
                                    <td style={{ padding: '16px' }}>
                                        {lead.assignedSalesStaff ? (
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                                <div style={{ width: '24px', height: '24px', background: '#e3f2fd', color: '#2196f3', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '12px' }}>
                                                    {lead.assignedSalesStaff.name?.charAt(0)}
                                                </div>
                                                <span style={{ fontSize: '14px' }}>{lead.assignedSalesStaff.name}</span>
                                            </div>
                                        ) : (
                                            <span style={{ color: '#999', fontSize: '13px' }}>Unassigned</span>
                                        )}
                                    </td>
                                    <td style={{ padding: '16px' }}>
                                        {lead.callLogs?.length > 0 ? (
                                            <div>
                                                <div style={{ fontSize: '13px', fontWeight: '500' }}>{new Date(lead.callLogs[lead.callLogs.length - 1].date).toLocaleDateString()}</div>
                                                <div style={{ fontSize: '12px', color: '#666', maxWidth: '200px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                                    {lead.callLogs[lead.callLogs.length - 1].description}
                                                </div>
                                            </div>
                                        ) : (
                                            <span style={{ color: '#999', fontSize: '13px' }}>No calls recorded</span>
                                        )}
                                    </td>
                                    <td style={{ padding: '16px' }}>
                                        <div style={{ display: 'flex', gap: '10px' }}>
                                            <button onClick={() => openEditModal(lead)} style={{ background: 'none', border: 'none', color: '#666', cursor: 'pointer' }} title="Edit"><FaEdit /></button>
                                            <button onClick={() => openCallModal(lead)} style={{ background: 'none', border: 'none', color: '#0066ff', cursor: 'pointer' }} title="Add Interaction"><FaHistory /></button>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Add/Edit Modal */}
            {showAddModal && (
                <div className="modal-overlay" style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1100 }}>
                    <div className="modal-content" style={{ background: 'white', padding: '32px', borderRadius: '16px', width: '100%', maxWidth: '500px', maxHeight: '90vh', overflowY: 'auto' }}>
                        <h2 style={{ marginBottom: '24px' }}>{selectedLead ? 'Edit Lead' : 'Add New Lead'}</h2>
                        <form onSubmit={handleAddSubmit}>
                            <div style={{ display: 'grid', gap: '16px' }}>
                                <div className="form-group">
                                    <label style={{ display: 'block', fontSize: '14px', marginBottom: '6px', fontWeight: '500' }}>Customer Name *</label>
                                    <input type="text" name="name" value={formData.name} onChange={handleInputChange} required style={{ width: '100%', padding: '10px', border: '1px solid #ddd', borderRadius: '8px' }} />
                                </div>
                                <div className="form-row" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                                    <div>
                                        <label style={{ display: 'block', fontSize: '14px', marginBottom: '6px', fontWeight: '500' }}>Phone Number *</label>
                                        <input type="tel" name="phone" value={formData.phone} onChange={handleInputChange} required style={{ width: '100%', padding: '10px', border: '1px solid #ddd', borderRadius: '8px' }} />
                                    </div>
                                    <div>
                                        <label style={{ display: 'block', fontSize: '14px', marginBottom: '6px', fontWeight: '500' }}>Token Amount *</label>
                                        <input type="number" name="tokenAmount" value={formData.tokenAmount} onChange={handleInputChange} required style={{ width: '100%', padding: '10px', border: '1px solid #ddd', borderRadius: '8px' }} />
                                    </div>
                                </div>
                                <div className="form-group">
                                    <label style={{ display: 'block', fontSize: '14px', marginBottom: '6px', fontWeight: '500' }}>Email Address</label>
                                    <input type="email" name="email" value={formData.email} onChange={handleInputChange} style={{ width: '100%', padding: '10px', border: '1px solid #ddd', borderRadius: '8px' }} />
                                </div>
                                <div className="form-group">
                                    <label style={{ display: 'block', fontSize: '14px', marginBottom: '6px', fontWeight: '500' }}>Address</label>
                                    <textarea name="address" value={formData.address} onChange={handleInputChange} rows="2" style={{ width: '100%', padding: '10px', border: '1px solid #ddd', borderRadius: '8px', resize: 'none' }}></textarea>
                                </div>
                                <div className="form-row" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                                    <div>
                                        <label style={{ display: 'block', fontSize: '14px', marginBottom: '6px', fontWeight: '500' }}>City</label>
                                        <input type="text" name="city" value={formData.city} onChange={handleInputChange} style={{ width: '100%', padding: '10px', border: '1px solid #ddd', borderRadius: '8px' }} />
                                    </div>
                                    <div>
                                        <label style={{ display: 'block', fontSize: '14px', marginBottom: '6px', fontWeight: '500' }}>District</label>
                                        <input type="text" name="district" value={formData.district} onChange={handleInputChange} style={{ width: '100%', padding: '10px', border: '1px solid #ddd', borderRadius: '8px' }} />
                                    </div>
                                </div>
                                <div className="form-row" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                                    <div>
                                        <label style={{ display: 'block', fontSize: '14px', marginBottom: '6px', fontWeight: '500' }}>State</label>
                                        <input type="text" name="state" value={formData.state} onChange={handleInputChange} style={{ width: '100%', padding: '10px', border: '1px solid #ddd', borderRadius: '8px' }} />
                                    </div>
                                    <div>
                                        <label style={{ display: 'block', fontSize: '14px', marginBottom: '6px', fontWeight: '500' }}>Pin Code</label>
                                        <input type="text" name="pincode" value={formData.pincode} onChange={handleInputChange} style={{ width: '100%', padding: '10px', border: '1px solid #ddd', borderRadius: '8px' }} />
                                    </div>
                                </div>
                                <div className="form-group">
                                    <label style={{ display: 'block', fontSize: '14px', marginBottom: '6px', fontWeight: '500' }}>Lead Source</label>
                                    <select name="source" value={formData.source} onChange={handleInputChange} style={{ width: '100%', padding: '10px', border: '1px solid #ddd', borderRadius: '8px', background: 'white' }}>
                                        <option value="Referral">Referral</option>
                                        <option value="IndiaMart">IndiaMart</option>
                                        <option value="Instagram">Instagram</option>
                                        <option value="Dealer">Dealer</option>
                                        <option value="Exhibition">Exhibition</option>
                                        <option value="Other">Other</option>
                                    </select>
                                    {formData.source === 'Other' && (
                                        <input
                                            type="text"
                                            name="sourceOther"
                                            value={formData.sourceOther}
                                            onChange={handleInputChange}
                                            placeholder="Please specify source..."
                                            style={{ width: '100%', padding: '10px', border: '1px solid #ddd', borderTop: 'none', borderRadius: '0 0 8px 8px', marginTop: '-4px' }}
                                            required
                                        />
                                    )}
                                </div>
                                <div className="form-group">
                                    <label style={{ display: 'block', fontSize: '14px', marginBottom: '6px', fontWeight: '500' }}>Assign Sales Staff</label>
                                    <select name="assignedSalesStaff" value={formData.assignedSalesStaff} onChange={handleInputChange} style={{ width: '100%', padding: '10px', border: '1px solid #ddd', borderRadius: '8px', background: 'white' }}>
                                        <option value="">Select Staff</option>
                                        {staff.map(s => (
                                            <option key={s._id} value={s._id}>{s.name} ({s.role})</option>
                                        ))}
                                    </select>
                                </div>
                            </div>
                            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px', marginTop: '32px' }}>
                                <button type="button" onClick={() => setShowAddModal(false)} style={{ padding: '10px 20px', border: '1px solid #ddd', background: 'none', borderRadius: '8px', cursor: 'pointer' }}>Cancel</button>
                                <button type="submit" style={{ padding: '10px 24px', border: 'none', background: '#0066ff', color: 'white', borderRadius: '8px', fontWeight: '600', cursor: 'pointer' }}>
                                    {selectedLead ? 'Update Lead' : 'Add Lead'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Call Log Modal */}
            {showCallModal && (
                <div className="modal-overlay" style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1100 }}>
                    <div className="modal-content" style={{ background: 'white', padding: '32px', borderRadius: '16px', width: '100%', maxWidth: '600px', maxHeight: '90vh', overflowY: 'auto' }}>
                        <h2 style={{ marginBottom: '8px' }}>Interaction History: {selectedLead?.name}</h2>
                        <p style={{ color: '#666', marginBottom: '24px', fontSize: '14px' }}>Track direct client communications over call or text.</p>
                        
                        <form onSubmit={handleAddCall} style={{ background: '#f8f9fa', padding: '20px', borderRadius: '12px', marginBottom: '32px' }}>
                            <div className="form-group" style={{ marginBottom: '16px' }}>
                                <label style={{ display: 'block', fontSize: '14px', marginBottom: '6px', fontWeight: '500' }}>Description (Mandatory)</label>
                                <textarea 
                                    value={callDescription} 
                                    onChange={(e) => setCallDescription(e.target.value)} 
                                    required 
                                    placeholder="What happened on the call?"
                                    rows="3" 
                                    style={{ width: '100%', padding: '10px', border: '1px solid #ddd', borderRadius: '8px', resize: 'vertical' }}
                                ></textarea>
                            </div>
                            <div className="form-group" style={{ marginBottom: '16px' }}>
                                <label style={{ display: 'block', fontSize: '14px', marginBottom: '6px', fontWeight: '500' }}>Add Call Recording (Mandatory)</label>
                                <input 
                                    type="file" 
                                    accept="audio/*"
                                    onChange={(e) => setCallRecording(e.target.files[0])}
                                    required
                                    style={{ width: '100%', padding: '10px', border: '1px solid #ddd', borderRadius: '8px', background: 'white' }}
                                />
                                <p style={{ fontSize: '11px', color: '#666', marginTop: '4px' }}>Supported formats: mp3, wav, m4a, ogg, etc.</p>
                            </div>
                            <div className="form-group" style={{ marginBottom: '20px' }}>
                                <label style={{ display: 'block', fontSize: '14px', marginBottom: '6px', fontWeight: '500' }}>Special Note (Optional)</label>
                                <input 
                                    type="text"
                                    value={specialNote} 
                                    onChange={(e) => setSpecialNote(e.target.value)} 
                                    placeholder="Any internal notes or highlights..."
                                    style={{ width: '100%', padding: '10px', border: '1px solid #ddd', borderRadius: '8px' }}
                                />
                            </div>
                            <button type="submit" style={{ width: '100%', padding: '12px', border: 'none', background: '#0066ff', color: 'white', borderRadius: '8px', fontWeight: '600', cursor: 'pointer' }}>
                                Log Call History
                            </button>
                        </form>

                        <div className="history">
                            <h4 style={{ marginBottom: '16px' }}>Past Interactions</h4>
                            {(() => {
                                const allInteractions = (selectedLead?.callLogs || []).sort((a, b) => new Date(a.date) - new Date(b.date));
                                
                                return allInteractions.length > 0 ? (
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                                        {allInteractions.slice().reverse().map((log, idx) => (
                                            <div key={idx} style={{ padding: '16px', borderLeft: '3px solid #0066ff', background: '#f8fbff', borderRadius: '0 8px 8px 0' }}>
                                                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                                                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '12px', color: '#666', fontWeight: '600' }}>
                                                        <span style={{ fontSize: '13px' }}>📞 Call Logged</span>
                                                        <span>•</span>
                                                        <span>{new Date(log.date).toLocaleString()}</span>
                                                    </div>
                                                </div>
                                                <p style={{ margin: '0 0 12px 0', fontSize: '14px', color: '#333', lineHeight: '1.5' }}>{log.description}</p>
                                                
                                                {log.specialNote && (
                                                    <div style={{ marginBottom: '12px', padding: '10px', background: '#fff9c4', borderRadius: '6px', fontSize: '13px', borderLeft: '3px solid #fbc02d', color: '#5d4037' }}>
                                                        <strong>Special Note:</strong> {log.specialNote}
                                                    </div>
                                                )}

                                                {log.callRecording && (
                                                    <div style={{ marginTop: '10px' }}>
                                                        <p style={{ fontSize: '12px', fontWeight: '600', color: '#666', marginBottom: '8px' }}>🎙️ Call Recording:</p>
                                                        <audio controls style={{ width: '100%', height: '32px' }}>
                                                            <source src={`${import.meta.env.VITE_API_URL?.replace('/api', '') || 'http://localhost:5001'}${log.callRecording}`} type="audio/mpeg" />
                                                            Your browser does not support the audio element.
                                                        </audio>
                                                    </div>
                                                )}
                                            </div>
                                        ))}
                                    </div>
                                ) : (
                                    <p style={{ color: '#999', textAlign: 'center', padding: '20px' }}>No previous interactions found.</p>
                                );
                            })()}
                        </div>

                        <div style={{ marginTop: '32px', textAlign: 'right' }}>
                            <button type="button" onClick={() => setShowCallModal(false)} style={{ padding: '10px 24px', border: '1px solid #ddd', background: 'none', borderRadius: '8px', cursor: 'pointer' }}>Close History</button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default Prebooking;
