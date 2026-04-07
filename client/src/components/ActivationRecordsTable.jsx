import React, { useState, useEffect } from 'react';
import { activationAPI } from '../services/api';

const ActivationRecordsTable = ({ refreshTrigger = 0 }) => {
    const [records, setRecords] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchRecords = async () => {
            try {
                setLoading(true);
                const res = await activationAPI.getAll();
                setRecords(res.data.data);
            } catch (err) {
                console.error("Error fetching activation records for table:", err);
            } finally {
                setLoading(false);
            }
        };
        fetchRecords();
    }, [refreshTrigger]);

    if (loading) return <div style={{ padding: '20px', textAlign: 'center' }}>Loading table data...</div>;

    if (!records || records.length === 0) {
        return <div style={{ padding: '20px', textAlign: 'center', background: 'white', borderRadius: '10px' }}>No Activation Records found.</div>;
    }

    return (
        <div style={{ width: '100%', overflowX: 'auto', background: 'white', borderRadius: '10px', boxShadow: '0 2px 10px rgba(0,0,0,0.05)', marginTop: '20px' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12px', minWidth: '1200px' }}>
                <thead>
                    <tr style={{ background: '#f8f9fa', borderBottom: '2px solid #dee2e6' }}>
                        <th style={{ padding: '12px', textAlign: 'left', fontWeight: 'bold' }}>Serial Number</th>
                        <th style={{ padding: '12px', textAlign: 'left', fontWeight: 'bold' }}>Client Name</th>
                        <th style={{ padding: '12px', textAlign: 'left', fontWeight: 'bold' }}>Flight Controller Number</th>
                        <th style={{ padding: '12px', textAlign: 'left', fontWeight: 'bold' }}>GCS Number</th>
                        <th style={{ padding: '12px', textAlign: 'left', fontWeight: 'bold' }}>Obstacle avoidance</th>
                        <th style={{ padding: '12px', textAlign: 'left', fontWeight: 'bold' }}>Ground radar</th>
                        <th style={{ padding: '12px', textAlign: 'left', fontWeight: 'bold' }}>GPS</th>
                        <th style={{ padding: '12px', textAlign: 'left', fontWeight: 'bold' }}>Manufacturing Date</th>
                        <th style={{ padding: '12px', textAlign: 'left', fontWeight: 'bold' }}>UIN</th>
                        <th style={{ padding: '12px', textAlign: 'left', fontWeight: 'bold' }}>ISSUE DATE</th>
                        <th style={{ padding: '12px', textAlign: 'left', fontWeight: 'bold' }}>STATUS</th>
                        <th style={{ padding: '12px', textAlign: 'left', fontWeight: 'bold' }}>UIN TRANSFER</th>
                    </tr>
                </thead>
                <tbody>
                    {records.map((record, index) => (
                        <tr key={record._id || index} style={{ borderBottom: '1px solid #eee' }}>
                            <td style={{ padding: '10px' }}>{record.serialNumber || '-'}</td>
                            <td style={{ padding: '10px' }}>{record.clientName || '-'}</td>
                            <td style={{ padding: '10px' }}>{record.flightControllerNumber || '-'}</td>
                            <td style={{ padding: '10px' }}>{record.gcsNumber || '-'}</td>
                            <td style={{ padding: '10px' }}>{record.obstacleAvoidance || '-'}</td>
                            <td style={{ padding: '10px' }}>{record.groundRadar || '-'}</td>
                            <td style={{ padding: '10px' }}>{record.gps || '-'}</td>
                            <td style={{ padding: '10px' }}>{record.manufacturingDate ? new Date(record.manufacturingDate).toLocaleDateString('en-GB') : '-'}</td>
                            <td style={{ padding: '10px' }}>{record.uin || '-'}</td>
                            <td style={{ padding: '10px' }}>{record.issueDate ? new Date(record.issueDate).toLocaleDateString('en-GB') : '-'}</td>
                            <td style={{ padding: '10px' }}>
                                <span style={{
                                    padding: '4px 8px',
                                    borderRadius: '4px',
                                    backgroundColor: record.status === 'INSTALLED' ? '#e8f5e9' : '#ffebee',
                                    color: record.status === 'INSTALLED' ? '#2e7d32' : '#c62828',
                                    fontWeight: 'bold',
                                    textTransform: 'uppercase'
                                }}>
                                    {record.status || '-'}
                                </span>
                            </td>
                            <td style={{ padding: '10px' }}>{record.uinTransfer || '-'}</td>
                        </tr>
                    ))}
                </tbody>
            </table>
        </div >
    );
};

export default ActivationRecordsTable;
