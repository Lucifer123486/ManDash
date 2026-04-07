import React, { useState, useEffect } from 'react';
import { ticketsAPI, usersAPI } from '../services/api';

const CreateTicketForm = ({ clientId, onClose, onSuccess }) => {
    const [engineers, setEngineers] = useState([]);
    const [loading, setLoading] = useState(false);
    const [clientData, setClientData] = useState(null);
    const [supportCount, setSupportCount] = useState(0);

    const [formData, setFormData] = useState({
        customerEmail: '',
        customerName: '',
        customerMobile: '',
        customerLocation: '',
        droneSerialNumber: '',
        dateOfPurchase: '',
        warrantyStatus: '',
        problemDescription: '',
        photoVideoReceived: '',
        problemCategory: 'Call/Video Call', // default
        assignedTo: '',
        contactedCustomerAt: '',
        actionToBeTaken: 'Solve On Call',
        finalResolutionTime: ''
    });

    useEffect(() => {
        const fetchEngineers = async () => {
            try {
                // Fetch users with role 'staff' and staffType 'service_engineer'
                const res = await usersAPI.getAll({ role: 'staff', staffType: 'service_engineer' });
                if (res.data?.data) {
                    setEngineers(res.data.data);
                }
            } catch (err) {
                console.error("Error fetching engineers:", err);
            }
        };
        fetchEngineers();

        if (clientId) {
            const fetchClient = async () => {
                try {
                    const res = await usersAPI.getById(clientId);
                    if (res.data?.data) {
                        const client = res.data.data;
                        setClientData(client);
                        setFormData(prev => ({
                            ...prev,
                            customerEmail: client.email || '',
                            customerName: client.name || '',
                            customerMobile: client.phone || '',
                            customerLocation: client.address || ''
                        }));

                        // Fetch ticket count for this client
                        try {
                            const ticketsRes = await ticketsAPI.getAll({ user: clientId });
                            if (ticketsRes.data?.data) {
                                setSupportCount(ticketsRes.data.data.length);
                            }
                        } catch (tErr) {
                            console.error("Error fetching ticket count", tErr);
                        }
                    }
                } catch (err) {
                    console.error("Error fetching client details:", err);
                }
            };
            fetchClient();
        }
    }, [clientId]);

    const handleChange = (e) => {
        const { name, value, type, checked } = e.target;
        if (type === 'radio') {
            // map 'Yes'/'No' strings back to boolean for warranty and photo
            let finalValue = value;
            if (name === 'warrantyStatus' || name === 'photoVideoReceived') {
                finalValue = value === 'Yes';
            }
            setFormData(prev => ({ ...prev, [name]: finalValue }));
        } else {
            setFormData(prev => ({ ...prev, [name]: value }));
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        try {
            await ticketsAPI.create(formData);
            alert('Ticket Created successfully');
            if (onSuccess) onSuccess();
        } catch (err) {
            console.error('Error creating ticket:', err);
            alert('Error creating ticket: ' + (err.response?.data?.message || err.message));
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="create-ticket-modal">
            <div className="modal-content">
                <div className="modal-header">
                    <h2>CS-KRISHI (After Sale Support Ticket)</h2>
                    <p className="subtitle">All customer complaints and service requests must be logged here.</p>
                    <button className="close-btn" onClick={onClose}>&times;</button>
                </div>

                {clientData && (
                    <div style={{ margin: '0 20px 20px 20px', padding: '15px', borderRadius: '8px', background: clientData.hasAMC || clientData.hasASS ? '#e8f5e9' : '#ffebee', border: `1px solid ${clientData.hasAMC || clientData.hasASS ? '#4caf50' : '#f44336'}` }}>
                        <h4 style={{ margin: '0 0 10px 0', color: clientData.hasAMC || clientData.hasASS ? '#2e7d32' : '#c62828' }}>
                            Customer Eligibility Status
                        </h4>
                        <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
                            {clientData.hasAMC && <span style={{ background: '#2196F3', color: 'white', padding: '4px 8px', borderRadius: '4px', fontSize: '12px', fontWeight: 'bold' }}>AMC Active</span>}
                            {clientData.hasASS && <span style={{ background: '#9C27B0', color: 'white', padding: '4px 8px', borderRadius: '4px', fontSize: '12px', fontWeight: 'bold' }}>ASS Active </span>}

                            {(clientData.hasAMC || clientData.hasASS) && (
                                <span style={{ background: '#FF9800', color: 'white', padding: '4px 8px', borderRadius: '4px', fontSize: '12px', fontWeight: 'bold', marginLeft: 'auto' }}>
                                    Support Used: {supportCount} / 6
                                </span>
                            )}

                            {!clientData.hasAMC && !clientData.hasASS && (
                                <span style={{ color: '#c62828', fontSize: '14px', fontWeight: '500' }}>⚠️ This customer does not have an active AMC or ASS. After-sales support may be chargeable.</span>
                            )}
                        </div>
                    </div>
                )}

                <form onSubmit={handleSubmit} className="ticket-form">
                    <div className="form-group">
                        <label>Email <span className="req">*</span></label>
                        <input type="email" name="customerEmail" value={formData.customerEmail} onChange={handleChange} required className="form-input" placeholder="Your email" />
                    </div>

                    <div className="form-group">
                        <label>Customer Full Name <span className="req">*</span></label>
                        <input type="text" name="customerName" value={formData.customerName} onChange={handleChange} required className="form-input" placeholder="Your answer" />
                    </div>

                    <div className="form-group">
                        <label>Mobile Number <span className="req">*</span></label>
                        <input type="text" name="customerMobile" value={formData.customerMobile} onChange={handleChange} required className="form-input" placeholder="Your answer" />
                    </div>

                    <div className="form-group">
                        <label>Location(Village/Taluka/District) <span className="req">*</span></label>
                        <input type="text" name="customerLocation" value={formData.customerLocation} onChange={handleChange} required className="form-input" placeholder="Your answer" />
                    </div>

                    <div className="form-group">
                        <label>Drone Serial Number <span className="req">*</span></label>
                        <input type="text" name="droneSerialNumber" value={formData.droneSerialNumber} onChange={handleChange} required className="form-input" placeholder="Your answer" />
                        {clientData?.orders?.length > 0 && (
                            <div className="linked-drones-selection" style={{ marginTop: '10px' }}>
                                <p style={{ fontSize: '12px', color: '#666', marginBottom: '5px' }}>Quick Select from Linked Drones:</p>
                                <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                                    {(() => {
                                        const drones = [];
                                        clientData.orders.forEach(o => {
                                            if (o.drones) {
                                                o.drones.forEach(d => {
                                                    if (d.serialNo && !drones.includes(d.serialNo)) {
                                                        drones.push(d.serialNo);
                                                    }
                                                });
                                            }
                                        });
                                        return drones.map(sn => (
                                            <button
                                                key={sn}
                                                type="button"
                                                onClick={() => setFormData(prev => ({ ...prev, droneSerialNumber: sn }))}
                                                style={{
                                                    padding: '4px 8px',
                                                    fontSize: '11px',
                                                    background: formData.droneSerialNumber === sn ? '#f2994a' : '#fff',
                                                    color: formData.droneSerialNumber === sn ? '#fff' : '#444',
                                                    border: '1px solid #f2994a',
                                                    borderRadius: '4px',
                                                    cursor: 'pointer'
                                                }}
                                            >
                                                {sn}
                                            </button>
                                        ));
                                    })()}
                                </div>
                            </div>
                        )}
                    </div>

                    <div className="form-group">
                        <label>Date of Purchase</label>
                        <input type="date" name="dateOfPurchase" value={formData.dateOfPurchase} onChange={handleChange} className="form-input" />
                    </div>

                    <div className="form-group">
                        <label>Warranty Status</label>
                        <div className="radio-group">
                            <label><input type="radio" name="warrantyStatus" value="Yes" onChange={handleChange} checked={formData.warrantyStatus === true} /> Yes</label>
                            <label><input type="radio" name="warrantyStatus" value="No" onChange={handleChange} checked={formData.warrantyStatus === false} /> No</label>
                        </div>
                    </div>

                    <div className="form-group">
                        <label>Problem Reported Description <span className="req">*</span></label>
                        <textarea name="problemDescription" value={formData.problemDescription} onChange={handleChange} required className="form-input" placeholder="Your answer"></textarea>
                    </div>

                    <div className="form-group">
                        <label>Photo/Video Received? <span className="req">*</span></label>
                        <div className="radio-group">
                            <label><input type="radio" name="photoVideoReceived" value="Yes" onChange={handleChange} required checked={formData.photoVideoReceived === true} /> Yes</label>
                            <label><input type="radio" name="photoVideoReceived" value="No" onChange={handleChange} required checked={formData.photoVideoReceived === false} /> No</label>
                        </div>
                    </div>

                    <div className="form-group">
                        <label>Problem Category <span className="req">*</span></label>
                        <div className="radio-group vertical">
                            {['Call/Video Call', 'Field Visit', 'Major Repair(Service Center)'].map(cat => (
                                <label key={cat}>
                                    <input type="radio" name="problemCategory" value={cat} onChange={handleChange} required checked={formData.problemCategory === cat} /> {cat}
                                </label>
                            ))}
                        </div>
                    </div>

                    <div className="form-group">
                        <label>Assigned Support Engineer</label>
                        <select name="assignedTo" value={formData.assignedTo} onChange={handleChange} className="form-input">
                            <option value="">-- Select Engineer --</option>
                            {engineers.map(eng => (
                                <option key={eng._id} value={eng._id}>{eng.name}</option>
                            ))}
                        </select>
                    </div>

                    <div className="form-group">
                        <label>Contacted Customer At (Time) <span className="req">*</span></label>
                        <input type="time" name="contactedCustomerAt" value={formData.contactedCustomerAt} onChange={handleChange} required className="form-input" />
                    </div>

                    <div className="form-group">
                        <label>Action To be Taken <span className="req">*</span></label>
                        <div className="radio-group vertical">
                            {['Solve On Call', 'Solve On Feild', 'Service Center'].map(action => (
                                <label key={action}>
                                    <input type="radio" name="actionToBeTaken" value={action} onChange={handleChange} required checked={formData.actionToBeTaken === action} /> {action}
                                </label>
                            ))}
                        </div>
                    </div>

                    <div className="form-group">
                        <label>Final Resolution Time</label>
                        <input type="time" name="finalResolutionTime" value={formData.finalResolutionTime} onChange={handleChange} className="form-input" />
                    </div>

                    <div className="form-actions">
                        <button type="submit" className="submit-btn" disabled={loading}>
                            {loading ? 'Submitting...' : 'Submit'}
                        </button>
                        <button type="button" className="clear-btn" onClick={() => setFormData({ // simple clear
                            customerEmail: '', customerName: '', customerMobile: '', customerLocation: '', droneSerialNumber: '',
                            dateOfPurchase: '', warrantyStatus: '', problemDescription: '', photoVideoReceived: '', problemCategory: 'Call/Video Call',
                            assignedTo: '', contactedCustomerAt: '', actionToBeTaken: 'Solve On Call', finalResolutionTime: ''
                        })}>Clear form</button>
                    </div>
                </form>
            </div>

            <style>{`
                .create-ticket-modal {
                    position: fixed;
                    top: 0; left: 0; right: 0; bottom: 0;
                    background: rgba(0,0,0,0.5);
                    display: flex;
                    justify-content: center;
                    align-items: flex-start;
                    overflow-y: auto;
                    z-index: 1000;
                    padding: 40px 20px;
                }
                .modal-content {
                    background: #fbf0e6; /* Match google form bg somewhat */
                    width: 100%;
                    max-width: 700px;
                    border-radius: 8px;
                    box-shadow: 0 4px 12px rgba(0,0,0,0.15);
                    padding-bottom: 20px;
                }
                .modal-header {
                    background: white;
                    border-top: 10px solid #f2994a;
                    padding: 24px;
                    border-radius: 8px 8px 0 0;
                    position: relative;
                    margin-bottom: 12px;
                    box-shadow: 0 1px 3px rgba(0,0,0,0.05);
                }
                .modal-header h2 { margin: 0 0 10px 0; font-size: 32px; color: #202124; }
                .subtitle { color: #5f6368; font-size: 14px; margin: 0; }
                .close-btn {
                    position: absolute; top: 15px; right: 20px;
                    background: none; border: none; font-size: 28px; cursor: pointer; color: #555;
                }
                .ticket-form {
                    display: flex; flex-direction: column; gap: 12px;
                    padding: 0 20px;
                }
                .form-group {
                    background: white;
                    padding: 24px;
                    border-radius: 8px;
                    border: 1px solid #dadce0;
                    display: flex; flex-direction: column; gap: 15px;
                }
                .form-group label {
                    font-size: 16px; font-weight: 500; color: #202124;
                }
                .form-input {
                    border: none;
                    border-bottom: 1px solid #dadce0;
                    padding: 8px 0;
                    font-size: 14px;
                    color: #202124;
                    background: transparent;
                    outline: none;
                    width: 100%;
                    max-width: 300px;
                }
                .form-input:focus { border-bottom: 2px solid #f2994a; }
                textarea.form-input { max-width: 100%; resize: vertical; }
                .req { color: #d93025; }
                .radio-group { display: flex; gap: 20px; }
                .radio-group.vertical { flex-direction: column; gap: 15px; }
                .radio-group label { font-weight: 400; display: flex; align-items: center; gap: 10px; cursor: pointer; }
                .form-actions { display: flex; justify-content: space-between; padding: 10px 0; }
                .submit-btn { background: #d94916; color: white; border: none; padding: 10px 24px; border-radius: 4px; font-size: 14px; font-weight: 500; cursor: pointer; }
                .clear-btn { background: transparent; border: none; color: #d94916; font-weight: 500; cursor: pointer; }
            `}</style>
        </div>
    );
};

export default CreateTicketForm;
