import React from 'react';
import logoAsset from '../../assets/CSI logo.png';

const CompanyLogo = ({ size = 80, theme = 'dark' }) => {
    // Determine background based on theme
    const backgroundColor = theme === 'dark' ? '#1b1b1b' : '#ffffff';

    return (
        <div style={{
            width: size,
            height: 'auto',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            background: backgroundColor,
            borderRadius: '4px',
            padding: '2px',
            margin: '0 auto'
        }}>
            <img
                src={logoAsset}
                alt="CerebroSpark Logo"
                style={{
                    width: '100%',
                    height: 'auto',
                    objectFit: 'contain'
                }}
            />
        </div>
    );
};

export default CompanyLogo;

