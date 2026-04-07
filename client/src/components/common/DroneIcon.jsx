import React from 'react';

const DroneIcon = ({ size = 24, color = 'currentColor', className = '' }) => {
    return (
        <svg
            width={size}
            height={size}
            viewBox="0 0 24 24"
            fill="none"
            stroke={color}
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            className={className}
        >
            <path d="M12 8l-4 -2" />
            <path d="M12 8l4 -2" />
            <path d="M12 16l-4 2" />
            <path d="M12 16l4 2" />
            <circle cx="12" cy="12" r="3" />
            <circle cx="7" cy="5" r="1.5" />
            <circle cx="17" cy="5" r="1.5" />
            <circle cx="7" cy="19" r="1.5" />
            <circle cx="17" cy="19" r="1.5" />
        </svg>
    );
};

export default DroneIcon;
