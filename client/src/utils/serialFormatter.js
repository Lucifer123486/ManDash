/**
 * Standardizes drone serial numbers to the format CSKRISHIXXX (no underscores).
 * e.g., "001" -> "CSKRISHI001"
 * e.g., "CS_KRISHI_001" -> "CSKRISHI001"
 * e.g., "CSKRISHI_001" -> "CSKRISHI001"
 * 
 * @param {string} serial - The raw serial number string
 * @returns {string} - The formatted serial number
 */
export const formatSerialNo = (serial) => {
    if (!serial) return '';

    // Remove all underscores for both serial and model numbers
    let clean = serial.toString().replace(/_/g, '');

    // Handle standard CSKRISHI serial numbers
    if (/^\d+$/.test(clean)) {
        return `CSKRISHI${clean}`;
    }

    const digits = clean.match(/\d+$/);
    if (digits && clean.toUpperCase().includes('KRISHI')) {
        return `CSKRISHI${digits[0]}`;
    }

    return clean;
};
