import React from 'react';

/**
 * Thermal Print Optimization Component
 * Automatically configures browser print settings for thermal printers
 */
const ThermalPrintOptimization: React.FC = () => {
  React.useEffect(() => {
    // Add print event listener to optimize print settings
    const handleBeforePrint = () => {
      console.log('Thermal print optimization: Before print triggered');
    };

    const handleAfterPrint = () => {
      console.log('Thermal print optimization: After print completed');
    };

    window.addEventListener('beforeprint', handleBeforePrint);
    window.addEventListener('afterprint', handleAfterPrint);

    return () => {
      window.removeEventListener('beforeprint', handleBeforePrint);
      window.removeEventListener('afterprint', handleAfterPrint);
    };
  }, []);

  const optimizePrint = () => {
    // Create a print stylesheet that forces correct settings
    const printStyles = `
      @media print {
        /* Force 80mm paper size */
        @page {
          size: 80mm auto;
          margin: 0 !important;
        }
        
        /* Remove browser margins and force isolation */
        html, body {
          margin: 0 !important;
          padding: 0 !important;
          width: 80mm !important;
          background: #fff !important;
        }

        /* Collapse all wrappers to prevent desktop scaling */
        #root, .print-modal-active, [class*="fixed"], [class*="max-w-"] {
          display: block !important;
          width: 80mm !important;
          height: 0 !important;
          margin: 0 !important;
          position: static !important;
          overflow: visible !important;
          visibility: hidden !important;
        }
        
        /* Ensure content fits within 80mm */
        .thermal-print-container {
          position: absolute !important;
          top: 0 !important;
          left: 0 !important;
          width: 80mm !important;
          margin: 0 !important;
          padding: 2mm !important;
          visibility: visible !important;
          display: block !important;
          z-index: 999999 !important;
        }
        
        /* Hide browser UI elements */
        .no-print, .print-modal-chrome, .modal-header, button {
          display: none !important;
        }
      }
    `;

    // Inject print styles
    const style = document.createElement('style');
    style.textContent = printStyles;
    document.head.appendChild(style);

    // Trigger print after a small delay to allow styles to apply
    setTimeout(() => {
      window.print();
      // Remove the injected styles after print
      setTimeout(() => {
        document.head.removeChild(style);
      }, 100);
    }, 100);
  };

  return (
    <div className="thermal-print-optimization">
      <style>{`
        .optimization-panel {
          background: #e8f4fd;
          border: 1px solid #b3d9ff;
          border-radius: 8px;
          padding: 15px;
          margin: 10px 0;
          font-family: Arial, sans-serif;
        }
        .optimization-header {
          color: #0066cc;
          font-weight: bold;
          margin-bottom: 10px;
          display: flex;
          align-items: center;
          gap: 10px;
        }
        .optimization-steps {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 10px;
          margin-bottom: 15px;
        }
        .step-card {
          background: white;
          padding: 10px;
          border-radius: 6px;
          border-left: 4px solid #28a745;
        }
        .step-number {
          font-weight: bold;
          color: #28a745;
          margin-bottom: 5px;
        }
        .print-button {
          background: #007bff;
          color: white;
          border: none;
          padding: 10px 20px;
          border-radius: 6px;
          cursor: pointer;
          font-size: 14px;
          font-weight: bold;
        }
        .print-button:hover {
          background: #0056b3;
        }
        .warning-box {
          background: #fff3cd;
          border: 1px solid #ffeaa7;
          border-radius: 6px;
          padding: 10px;
          margin: 10px 0;
          color: #856404;
        }
      `}</style>

      <div className="optimization-panel">
        <div className="optimization-header">
          🔧 Thermal Print Optimization
        </div>

        <div className="optimization-steps">
          <div className="step-card">
            <div className="step-number">Step 1</div>
            <div>Configure printer driver for 80mm paper</div>
          </div>
          <div className="step-card">
            <div className="step-number">Step 2</div>
            <div>Set margins to 0mm in printer properties</div>
          </div>
          <div className="step-card">
            <div className="step-number">Step 3</div>
            <div>Enable borderless printing</div>
          </div>
          <div className="step-card">
            <div className="step-number">Step 4</div>
            <div>Use this optimized print button</div>
          </div>
        </div>

        <div className="warning-box">
          <strong>⚠️ Important:</strong> This optimization works best when your printer driver
          is already configured for 80mm thermal paper. If prints are still misaligned,
          check your printer driver settings first.
        </div>

        <button className="print-button" onClick={optimizePrint}>
          🖨️ Optimized Thermal Print
        </button>
      </div>
    </div>
  );
};

export default ThermalPrintOptimization;
