import React from 'react';

/**
 * Thermal Print Visual Guide Component
 * Shows exactly how the thermal print should look with visual examples
 */
const ThermalPrintVisualGuide: React.FC = () => {
  return (
    <div className="thermal-print-visual-guide">
      <style>{`
        .guide-container {
          max-width: 900px;
          margin: 20px auto;
          padding: 20px;
          font-family: Arial, sans-serif;
        }
        .guide-header {
          text-align: center;
          color: #2c3e50;
          margin-bottom: 30px;
          border-bottom: 3px solid #3498db;
          padding-bottom: 15px;
        }
        .example-box {
          border: 2px solid #333;
          background: #fff;
          margin: 20px 0;
          padding: 15px;
          position: relative;
          box-shadow: 0 4px 6px rgba(0,0,0,0.1);
        }
        .paper-width-label {
          position: absolute;
          top: -25px;
          left: 50%;
          transform: translateX(-50%);
          background: #3498db;
          color: white;
          padding: 2px 10px;
          border-radius: 4px;
          font-size: 12px;
          font-weight: bold;
        }
        .margin-guide {
          border: 1px dashed #ccc;
          margin: 5px 0;
          padding: 2px 5px;
          font-size: 10px;
          color: #666;
          background: #f8f9fa;
        }
        .content-area {
          border: 1px solid #ddd;
          padding: 10px;
          background: #fafafa;
        }
        .header-section {
          text-align: center;
          margin-bottom: 10px;
        }
        .company-name {
          font-size: 18px;
          font-weight: bold;
          margin: 5px 0;
        }
        .mobile-numbers {
          font-size: 12px;
          font-weight: bold;
        }
        .divider-line {
          border-top: 1px dashed #333;
          margin: 8px 0;
        }
        .invoice-details {
          font-size: 12px;
          margin-bottom: 10px;
        }
        .table-header {
          font-weight: bold;
          border-bottom: 1px solid #333;
          margin-bottom: 5px;
          display: flex;
          justify-content: space-between;
        }
        .table-row {
          display: flex;
          justify-content: space-between;
          margin-bottom: 3px;
          font-size: 11px;
        }
        .totals-section {
          margin-top: 10px;
          border-top: 2px solid #333;
          padding-top: 10px;
        }
        .total-row {
          display: flex;
          justify-content: space-between;
          font-size: 12px;
          margin-bottom: 3px;
        }
        .final-amount {
          font-size: 14px;
          font-weight: bold;
          border-top: 2px solid #333;
          padding-top: 8px;
          margin-top: 8px;
        }
        .footer-section {
          text-align: center;
          font-size: 11px;
          margin-top: 10px;
          border-top: 1px dashed #333;
          padding-top: 8px;
        }
        .problem-highlight {
          background: #ffebee;
          border-left: 4px solid #f44336;
          padding: 10px;
          margin: 15px 0;
        }
        .solution-highlight {
          background: #e8f5e9;
          border-left: 4px solid #4caf50;
          padding: 10px;
          margin: 15px 0;
        }
        .measurement-label {
          font-size: 10px;
          color: #666;
          text-align: center;
          margin-top: 5px;
        }
        .arrow-guide {
          position: relative;
          height: 20px;
        }
        .arrow-guide::after {
          content: "↕ 2mm margin";
          position: absolute;
          top: 50%;
          left: 50%;
          transform: translate(-50%, -50%);
          background: #fff;
          padding: 0 5px;
          font-size: 10px;
          color: #333;
          border: 1px solid #333;
          border-radius: 3px;
        }
      `}</style>

      <div className="guide-container">
        <h1 className="guide-header">📄 Thermal Print Layout Visual Guide</h1>
        <p style={{textAlign: 'center', color: '#666', marginBottom: '30px'}}>
          This guide shows exactly how your 80mm thermal print should look
        </p>

        {/* Example 1: Correct Layout */}
        <div className="example-box">
          <div className="paper-width-label">80mm PAPER WIDTH</div>
          
          {/* Top Margin Guide */}
          <div className="arrow-guide">
            <div className="margin-guide">↕ 2mm TOP MARGIN</div>
          </div>

          <div className="content-area">
            {/* Header Section */}
            <div className="header-section">
              <div style={{fontSize: '24px', fontWeight: 'bold'}}>MS</div>
              <div className="company-name">Mango Mundy</div>
              <div className="mobile-numbers">Mob: 9952235676, 9443735676</div>
            </div>

            <div className="divider-line"></div>

            {/* Invoice Details */}
            <div className="invoice-details">
              <div><strong>Invoice No:</strong> INV-001</div>
              <div><strong>Date:</strong> 23/12/2025</div>
              <div><strong>Buyer:</strong> Customer Name</div>
            </div>

            {/* Items Table */}
            <div className="table-header">
              <span style={{width: '42%'}}>ITEM</span>
              <span style={{width: '16%', textAlign: 'right'}}>QTY</span>
              <span style={{width: '18%', textAlign: 'right'}}>RATE</span>
              <span style={{width: '24%', textAlign: 'right'}}>AMOUNT</span>
            </div>

            <div className="table-row">
              <span style={{width: '42%'}}>Mango Alphonso</span>
              <span style={{width: '16%', textAlign: 'right'}}>10</span>
              <span style={{width: '18%', textAlign: 'right'}}>120</span>
              <span style={{width: '24%', textAlign: 'right'}}>1200</span>
            </div>

            <div className="table-row">
              <span style={{width: '42%'}}>Mango Badami</span>
              <span style={{width: '16%', textAlign: 'right'}}>5</span>
              <span style={{width: '18%', textAlign: 'right'}}>100</span>
              <span style={{width: '24%', textAlign: 'right'}}>500</span>
            </div>

            <div className="divider-line"></div>

            {/* Totals Section */}
            <div className="totals-section">
              <div className="total-row">
                <span>Total Quantity:</span>
                <span>15 Nos</span>
              </div>
            </div>

            <div className="divider-line"></div>

            <div className="totals-section">
              <div className="total-row">
                <span>Total Amount:</span>
                <span>₹1,700.00</span>
              </div>
              <div className="total-row">
                <span>Net Amount:</span>
                <span>₹1,700.00</span>
              </div>
              <div className="total-row">
                <span>Final Amount:</span>
                <span className="final-amount">₹1,700.00</span>
              </div>
            </div>

            <div className="footer-section">
              Salem Main Road, Kaveripattinam<br/>
              635112, Tamil Nadu
            </div>
          </div>

          {/* Bottom Margin Guide */}
          <div className="arrow-guide">
            <div className="margin-guide">↕ 2mm BOTTOM MARGIN</div>
          </div>

          <div className="measurement-label">← 2mm LEFT MARGIN | 76mm CONTENT AREA | 2mm RIGHT MARGIN →</div>
        </div>

        {/* Problem Examples */}
        <div className="problem-highlight">
          <h3>❌ Common Problems to Avoid:</h3>
          <ul>
            <li><strong>Content cut off:</strong> Using full 80mm width instead of 76mm</li>
            <li><strong>Misalignment:</strong> Not accounting for printer margins</li>
            <li><strong>Preview mismatch:</strong> Different CSS for screen vs print</li>
            <li><strong>Wasted space:</strong> Too much padding/margin</li>
          </ul>
        </div>

        <div className="solution-highlight">
          <h3>✅ Our Solution Provides:</h3>
          <ul>
            <li><strong>Perfect alignment:</strong> 76mm content area with 2mm margins</li>
            <li><strong>Consistent preview:</strong> Same layout for screen and print</li>
            <li><strong>Space optimization:</strong> Maximum content in minimum space</li>
            <li><strong>Driver compatibility:</strong> Works with all thermal printer drivers</li>
          </ul>
        </div>

        {/* Technical Specifications */}
        <div className="example-box">
          <h3>📐 Technical Specifications:</h3>
          <div style={{display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px'}}>
            <div>
              <h4>Paper Settings:</h4>
              <ul>
                <li>Paper Size: 80mm x 297mm</li>
                <li>Content Width: 76mm</li>
                <li>Left/Right Margins: 2mm each</li>
                <li>Top/Bottom Margins: 2mm each</li>
              </ul>
            </div>
            <div>
              <h4>Layout Settings:</h4>
              <ul>
                <li>Table Columns: 42% | 16% | 18% | 24%</li>
                <li>Font Size: 11pt for body, 14pt for totals</li>
                <li>Line Height: 1.4 for readability</li>
                <li>Flexible Height: Auto-adjusts to content</li>
              </ul>
            </div>
          </div>
        </div>

        {/* Browser Print Instructions */}
        <div className="example-box">
          <h3>🖨️ Browser Print Instructions:</h3>
          <div style={{display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px'}}>
            <div>
              <h4>Chrome/Edge:</h4>
              <ul>
                <li>Ctrl+P (Print)</li>
                <li>Paper Size: Custom → 80mm x 297mm</li>
                <li>Margins: None</li>
                <li>Scale: 100%</li>
                <li>Background graphics: Enabled</li>
              </ul>
            </div>
            <div>
              <h4>Firefox:</h4>
              <ul>
                <li>Ctrl+P (Print)</li>
                <li>Page Setup → Custom Format</li>
                <li>Width: 80mm, Height: 297mm</li>
                <li>Margins: 0mm</li>
                <li>Scaling: 100%</li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ThermalPrintVisualGuide;
