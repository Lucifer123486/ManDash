import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { dronesAPI, activationAPI } from '../../services/api';
import ActivationRecordsTable from '../../components/ActivationRecordsTable';

const ActivationForm = () => {
    const { id } = useParams();
    const navigate = useNavigate();

    const [drone, setDrone] = useState(null);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [refreshKey, setRefreshKey] = useState(0);

    // Form State
    const [formData, setFormData] = useState({
        serialNumber: '',
        clientName: '',
        flightControllerNumber: '',
        gcsNumber: '',
        obstacleAvoidance: '',
        groundRadar: '',
        gps: '',
        manufacturingDate: '',
        uin: '',
        issueDate: '',
        status: 'INSTALLED',
        uinTransfer: 'Accepted'
    });

    useEffect(() => {
        const fetchData = async () => {
            try {
                // 1. Fetch Drone details to autofill
                const droneRes = await dronesAPI.getById(id);
                const d = droneRes.data.data || droneRes.data;
                setDrone(d);

                // 2. Fetch existing ActivationRecord if it exists (e.g. they hit FILL again or are editing)
                const actRes = await activationAPI.get(id);
                const record = actRes.data.data;

                if (record) {
                    // Populate with existing record
                    setFormData({
                        serialNumber: record.serialNumber || '',
                        clientName: record.clientName || '',
                        flightControllerNumber: record.flightControllerNumber || '',
                        gcsNumber: record.gcsNumber || '',
                        obstacleAvoidance: record.obstacleAvoidance || '',
                        groundRadar: record.groundRadar || '',
                        gps: record.gps || '',
                        manufacturingDate: record.manufacturingDate ? record.manufacturingDate.split('T')[0] : '',
                        uin: record.uin || '',
                        issueDate: record.issueDate ? record.issueDate.split('T')[0] : '',
                        status: record.status || 'INSTALLED',
                        uinTransfer: record.uinTransfer || 'Accepted'
                    });
                } else {
                    // Autofill from drone data
                    setFormData(prev => ({
                        ...prev,
                        serialNumber: d.serialNo || '',
                        clientName: d.order?.customerName || '',
                        flightControllerNumber: d.components?.flightControllerNumber || '',
                        gcsNumber: d.components?.gcsNumber || '',
                        obstacleAvoidance: d.components?.obstacleAvoidanceNumber || '',
                        groundRadar: d.components?.groundRadarNumber || '',
                        gps: d.components?.gpsNumber || '',
                        // Usually manufacturing date is roughly when this form is filled, but user can change
                        manufacturingDate: new Date().toISOString().split('T')[0],
                        issueDate: new Date().toISOString().split('T')[0]
                    }));
                }
                setLoading(false);
            } catch (err) {
                console.error("Error fetching data:", err);
                alert("Failed to load drone details");
                setLoading(false);
            }
        };
        fetchData();
    }, [id]);

    const handleChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        try {
            setSaving(true);
            await activationAPI.save(id, formData);
            alert("Activation record saved successfully!");
            setRefreshKey(prev => prev + 1); // Refresh the table
            // Optionally, we can remove the redirect so they stay on the page to view the table
        } catch (err) {
            console.error("Error saving activation record:", err);
            alert(`Failed: ${err.response?.data?.message || err.message}`);
        } finally {
            setSaving(false);
        }
    };

    const handleDownloadExcel = async () => {
        try {
            setSaving(true);
            const response = await activationAPI.exportExcel();
            // Create a blob from the response
            const blob = new Blob([response.data], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });

            // Create a link element, set its href to the blob URL, and programmatically click it to trigger download
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = 'Activation_Records.xlsx';
            document.body.appendChild(a);
            a.click();

            // Clean up
            window.URL.revokeObjectURL(url);
            document.body.removeChild(a);
        } catch (err) {
            console.error("Error downloading excel:", err);
            alert("Failed to download excel sheet.");
        } finally {
            setSaving(false);
        }
    };

    if (loading) return <div style={{ padding: '50px', textAlign: 'center' }}>Loading Form...</div>;

    return (
        <div className="drone-detail-page">
            <div className="detail-layout" style={{ display: 'block' }}>
                <div className="detail-content" style={{ maxWidth: '800px', margin: '0 auto' }}>

                    <div className="page-header" style={{ marginBottom: '20px' }}>
                        <button onClick={() => navigate(-1)} className="btn-back">← Back</button>
                        <div className="header-info">
                            <h1>Activation & Pairing Record</h1>
                            <span className="model-tag">{drone?.serialNo || 'Unknown'}</span>
                        </div>
                        <div className="header-actions">
                            <button
                                onClick={handleDownloadExcel}
                                disabled={saving}
                                style={{
                                    background: '#4CAF50',
                                    color: 'white',
                                    border: 'none',
                                    padding: '8px 15px',
                                    borderRadius: '5px',
                                    cursor: 'pointer',
                                    fontWeight: 'bold',
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '8px'
                                }}
                            >
                                <span>📥 Download Global Excel Sheet</span>
                            </button>
                        </div>
                    </div>

                    <div className="dashboard-card" style={{ padding: '30px', background: 'white', borderRadius: '10px', boxShadow: '0 2px 10px rgba(0,0,0,0.05)' }}>
                        <form onSubmit={handleSubmit}>

                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px', marginBottom: '30px' }}>

                                <div className="form-group">
                                    <label style={{ display: 'block', marginBottom: '8px', fontWeight: 'bold', fontSize: '14px' }}>Serial Number</label>
                                    <input type="text" name="serialNumber" value={formData.serialNumber} onChange={handleChange} required style={{ width: '100%', padding: '10px', border: '1px solid #ddd', borderRadius: '5px' }} />
                                </div>

                                <div className="form-group">
                                    <label style={{ display: 'block', marginBottom: '8px', fontWeight: 'bold', fontSize: '14px' }}>Client Name</label>
                                    <input type="text" name="clientName" value={formData.clientName} onChange={handleChange} style={{ width: '100%', padding: '10px', border: '1px solid #ddd', borderRadius: '5px' }} />
                                </div>

                                <div className="form-group">
                                    <label style={{ display: 'block', marginBottom: '8px', fontWeight: 'bold', fontSize: '14px' }}>Flight Controller Number</label>
                                    <input type="text" name="flightControllerNumber" value={formData.flightControllerNumber} onChange={handleChange} style={{ width: '100%', padding: '10px', border: '1px solid #ddd', borderRadius: '5px' }} />
                                </div>

                                <div className="form-group">
                                    <label style={{ display: 'block', marginBottom: '8px', fontWeight: 'bold', fontSize: '14px' }}>GCS Number</label>
                                    <input type="text" name="gcsNumber" value={formData.gcsNumber} onChange={handleChange} style={{ width: '100%', padding: '10px', border: '1px solid #ddd', borderRadius: '5px' }} />
                                </div>

                                <div className="form-group">
                                    <label style={{ display: 'block', marginBottom: '8px', fontWeight: 'bold', fontSize: '14px' }}>Obstacle Avoidance</label>
                                    <input type="text" name="obstacleAvoidance" value={formData.obstacleAvoidance} onChange={handleChange} style={{ width: '100%', padding: '10px', border: '1px solid #ddd', borderRadius: '5px' }} />
                                </div>

                                <div className="form-group">
                                    <label style={{ display: 'block', marginBottom: '8px', fontWeight: 'bold', fontSize: '14px' }}>Ground Radar</label>
                                    <input type="text" name="groundRadar" value={formData.groundRadar} onChange={handleChange} style={{ width: '100%', padding: '10px', border: '1px solid #ddd', borderRadius: '5px' }} />
                                </div>

                                <div className="form-group">
                                    <label style={{ display: 'block', marginBottom: '8px', fontWeight: 'bold', fontSize: '14px' }}>GPS</label>
                                    <input type="text" name="gps" value={formData.gps} onChange={handleChange} style={{ width: '100%', padding: '10px', border: '1px solid #ddd', borderRadius: '5px' }} />
                                </div>

                                <div className="form-group">
                                    <label style={{ display: 'block', marginBottom: '8px', fontWeight: 'bold', fontSize: '14px' }}>Manufacturing Date</label>
                                    <input type="date" name="manufacturingDate" value={formData.manufacturingDate} onChange={handleChange} style={{ width: '100%', padding: '10px', border: '1px solid #ddd', borderRadius: '5px' }} />
                                </div>

                                <div className="form-group">
                                    <label style={{ display: 'block', marginBottom: '8px', fontWeight: 'bold', fontSize: '14px' }}>UIN</label>
                                    <input type="text" name="uin" value={formData.uin} onChange={handleChange} style={{ width: '100%', padding: '10px', border: '1px solid #ddd', borderRadius: '5px' }} />
                                </div>

                                <div className="form-group">
                                    <label style={{ display: 'block', marginBottom: '8px', fontWeight: 'bold', fontSize: '14px' }}>Issue Date</label>
                                    <input type="date" name="issueDate" value={formData.issueDate} onChange={handleChange} style={{ width: '100%', padding: '10px', border: '1px solid #ddd', borderRadius: '5px' }} />
                                </div>

                                <div className="form-group">
                                    <label style={{ display: 'block', marginBottom: '8px', fontWeight: 'bold', fontSize: '14px' }}>Status</label>
                                    <select name="status" value={formData.status} onChange={handleChange} style={{ width: '100%', padding: '10px', border: '1px solid #ddd', borderRadius: '5px', background: 'white' }}>
                                        <option value="INSTALLED">INSTALLED</option>
                                        <option value="NOT INSTALLED">NOT INSTALLED</option>
                                    </select>
                                </div>

                                <div className="form-group">
                                    <label style={{ display: 'block', marginBottom: '8px', fontWeight: 'bold', fontSize: '14px' }}>UIN Transfer</label>
                                    <select name="uinTransfer" value={formData.uinTransfer} onChange={handleChange} style={{ width: '100%', padding: '10px', border: '1px solid #ddd', borderRadius: '5px', background: 'white' }}>
                                        <option value="Transferred">Transferred</option>
                                        <option value="Accepted">Accepted</option>
                                        <option value="Not issued">Not issued</option>
                                        <option value="Cancelled">Cancelled</option>
                                    </select>
                                </div>

                            </div>

                            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '15px' }}>
                                <button type="button" onClick={() => navigate(`/staff/drones/${id}`)} style={{ padding: '12px 24px', background: '#f5f5f5', border: '1px solid #ddd', borderRadius: '5px', cursor: 'pointer', fontWeight: 'bold' }}>Back</button>
                                <button type="submit" disabled={saving} style={{ padding: '12px 24px', background: '#2196F3', color: 'white', border: 'none', borderRadius: '5px', cursor: 'pointer', fontWeight: 'bold' }}>
                                    {saving ? 'Saving...' : 'Save & Update Entry'}
                                </button>
                            </div>

                        </form>
                    </div>

                    <div className="dashboard-card" style={{ padding: '30px', background: 'white', borderRadius: '10px', boxShadow: '0 2px 10px rgba(0,0,0,0.05)', marginTop: '30px' }}>
                        <h2 style={{ marginBottom: '15px', color: '#333' }}>Global Activation & Pairing Records</h2>
                        <ActivationRecordsTable refreshTrigger={refreshKey} />
                    </div>

                </div>
            </div>
        </div>
    );
};

export default ActivationForm;
