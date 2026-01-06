import React from 'react';

interface PrintPreviewWrapperProps {
  children: React.ReactNode;
}

/**
 * Wrapper component to ensure thermal print content stays within modal bounds
 */
const PrintPreviewWrapper: React.FC<PrintPreviewWrapperProps> = ({ children }) => {
  return (
    <div className="print-preview-wrapper">
      <style>{`
        .print-preview-wrapper {
          width: 100%;
          height: 100%;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: flex-start;
          padding: 140px 0 20px 0;
          box-sizing: border-box;
        }
        
        .print-content-container {
          width: 100%;
          max-width: 80mm;
          margin: 0 auto;
          position: relative;
          z-index: 1;
        }
        
        .thermal-print-container {
          width: 100% !important;
          max-width: 80mm !important;
          margin: 0 auto !important;
          position: relative !important;
          z-index: 1 !important;
          background: white !important;
          box-shadow: none !important;
          border: none !important;
          border-radius: 0 !important;
          padding: 2mm !important;
          margin-top: 0 !important;
        }
        
        /* Ensure no content escapes the wrapper */
        .print-preview-wrapper * {
          position: relative !important;
          z-index: 1 !important;
          max-width: 100% !important;
          box-sizing: border-box !important;
        }
        
        /* Ensure content is visible below header with extra padding */
        .print-preview-wrapper .thermal-print-container {
          margin-top: 0 !important;
          padding-top: 4mm !important;
        }
      `}</style>
      
      <div className="print-content-container">
        {children}
      </div>
    </div>
  );
};

export default PrintPreviewWrapper;
