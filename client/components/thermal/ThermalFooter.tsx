import React from 'react';

interface ThermalFooterProps {
    showAddress?: boolean;
    message?: string;
}

/**
 * Shared thermal print footer for 80mm POS receipts.
 * Matches the exact layout from your image:
 * - Salem Main Road address
 * - Kaveripattinam - 635112, Tamil Nadu, India
 */
const ThermalFooter: React.FC<ThermalFooterProps> = ({ showAddress = true, message }) => {
    return (
        <footer className="thermal-footer">
            {message && <p className="font-bold">{message}</p>}
            {showAddress && (
                <>
                    <p>Salem Main Road, Kaveripattinam</p>
                    <p>635112, Tamil Nadu</p>
                </>
            )}
            {/* <p className="text-xs mt-1 italic">Computer Generated Receipt • {new Date().toLocaleString('en-GB', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })}</p> */}
        </footer>
    );
};

export default ThermalFooter;
