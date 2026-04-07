export const getRemainingTimeLabel = (startDate) => {
    if (!startDate) return null;
    
    const start = new Date(startDate);
    const expiry = new Date(start);
    expiry.setFullYear(expiry.getFullYear() + 1); // 1 year validity
    
    const now = new Date();
    const remainingTime = expiry - now;
    
    if (remainingTime <= 0) {
        return { label: 'Expired', color: '#f44336', isExpired: true };
    }
    
    const daysRemaining = Math.ceil(remainingTime / (1000 * 60 * 60 * 24));
    
    if (daysRemaining > 30) {
        const months = Math.floor(daysRemaining / 30);
        const days = daysRemaining % 30;
        return { 
            label: `${months} month${months > 1 ? 's' : ''}${days > 0 ? ` ${days} day${days > 1 ? 's' : ''}` : ''} remaining`, 
            color: '#4caf50', 
            isExpired: false 
        };
    } else {
        return { 
            label: `${daysRemaining} day${daysRemaining > 1 ? 's' : ''} remaining`, 
            color: daysRemaining <= 10 ? '#ff9800' : '#4caf50', 
            isExpired: false 
        };
    }
};
