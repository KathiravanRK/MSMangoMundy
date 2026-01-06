import React from 'react';

/**
 * A4 Document Print Header
 * 
 * Professional header for A4 document prints with company branding.
 * Styled to match thermal receipt aesthetics at a larger scale.
 */
const PrintHeader: React.FC<{ reportTitle?: string }> = ({ reportTitle }) => {
    return (
        <header className="print-header">
            <div className="company-details" style={{ display: 'flex', alignItems: 'flex-start', gap: '20px' }}>
                <img
                    src="https://i.imgur.com/gYfQXy5.png"
                    alt="MS Mango Mundy Logo"
                    style={{
                        width: '70px',
                        height: 'auto',
                        borderRadius: '8px',
                        boxShadow: '0 2px 8px rgba(0,0,0,0.1)'
                    }}
                />
                <div>
                    <h1>MS Mango Mundy</h1>
                    <p>Salem Main Road, Kaveripattinam - 635112</p>
                    <p>Krishnagiri District, Tamil Nadu, India</p>
                    <p><strong>Contact:</strong> 9952235676, 9443735676</p>
                </div>
            </div>
            {reportTitle && (
                <div className="document-title">
                    <h2>{reportTitle}</h2>
                </div>
            )}
        </header>
    );
};

export default PrintHeader;
