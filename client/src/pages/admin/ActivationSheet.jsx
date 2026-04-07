import React, { useState } from 'react';
import ActivationRecordsTable from '../../components/ActivationRecordsTable';
import { activationAPI } from '../../services/api';
import { FaFileExcel } from 'react-icons/fa';

const ActivationSheet = () => {
    const [downloading, setDownloading] = useState(false);

    const handleDownloadExcel = async () => {
        try {
            setDownloading(true);
            const response = await activationAPI.exportExcel();
            const blob = new Blob([response.data], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });

            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = 'Activation_Records.xlsx';
            document.body.appendChild(a);
            a.click();

            window.URL.revokeObjectURL(url);
            document.body.removeChild(a);
        } catch (err) {
            console.error("Error downloading excel:", err);
            alert("Failed to download excel sheet.");
        } finally {
            setDownloading(false);
        }
    };

    return (
        <div style={{ padding: '30px', maxWidth: '1400px', margin: '0 auto' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '30px' }}>
                <div>
                    <h1 style={{ margin: 0, color: '#333' }}>Global Activation & Pairing Sheet</h1>
                    <p style={{ color: '#666', marginTop: '5px' }}>View all registered drone activation details across the system.</p>
                </div>

                <button
                    onClick={handleDownloadExcel}
                    disabled={downloading}
                    style={{
                        background: '#4CAF50',
                        color: 'white',
                        border: 'none',
                        padding: '10px 20px',
                        borderRadius: '6px',
                        cursor: 'pointer',
                        fontWeight: 'bold',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '8px',
                        fontSize: '15px',
                        boxShadow: '0 2px 5px rgba(0,0,0,0.1)'
                    }}
                >
                    <FaFileExcel size={18} />
                    {downloading ? 'Generating...' : 'Download Excel Sheet'}
                </button>
            </div>

            <ActivationRecordsTable />
        </div>
    );
};

export default ActivationSheet;
