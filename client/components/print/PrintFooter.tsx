import React from 'react';

/**
 * A4 Document Print Footer
 * 
 * Professional footer for A4 document prints with timestamp.
 */
const PrintFooter: React.FC<{ message?: string }> = ({ message }) => {
    const generationDate = new Date().toLocaleString('en-IN', {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        hour12: true
    });

    return (
        <footer className="print-footer">
            {message && <p style={{ fontWeight: 500, marginBottom: '8px' }}>{message}</p>}
            <p>This is a computer-generated document. No signature required.</p>
            <p style={{ marginTop: '6px' }}>
                <strong>Generated on:</strong> {generationDate} |
                <strong style={{ marginLeft: '10px' }}>MS Mango Mundy</strong> – Kaveripattinam
            </p>
        </footer>
    );
};

export default PrintFooter;
