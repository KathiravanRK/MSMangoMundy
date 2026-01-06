import React from 'react';

/**
 * Thermal Printer Driver Guide and Troubleshooting Component
 * Helps diagnose and fix common thermal printer driver issues
 */
const ThermalPrinterDriverGuide: React.FC = () => {
  return (
    <div className="thermal-printer-guide">
      <style>{`
        .guide-container {
          max-width: 800px;
          margin: 20px auto;
          padding: 20px;
          background: #f8f9fa;
          border-radius: 8px;
          font-family: Arial, sans-serif;
        }
        .guide-header {
          color: #2c3e50;
          border-bottom: 2px solid #3498db;
          padding-bottom: 10px;
          margin-bottom: 20px;
        }
        .guide-section {
          background: white;
          padding: 15px;
          margin-bottom: 15px;
          border-radius: 6px;
          box-shadow: 0 2px 4px rgba(0,0,0,0.1);
        }
        .issue-item {
          background: #fff;
          border-left: 4px solid #e74c3c;
          padding: 10px;
          margin-bottom: 10px;
        }
        .solution-item {
          background: #d5f4e6;
          border-left: 4px solid #27ae60;
          padding: 10px;
          margin-bottom: 10px;
        }
        .warning {
          background: #fff3cd;
          border-left: 4px solid #ffc107;
          padding: 10px;
          margin-bottom: 15px;
        }
        .code-block {
          background: #f8f9fa;
          border: 1px solid #dee2e6;
          padding: 10px;
          border-radius: 4px;
          font-family: monospace;
          font-size: 12px;
        }
        .checklist {
          list-style-type: none;
          padding-left: 0;
        }
        .checklist li {
          padding: 5px 0;
          border-bottom: 1px solid #eee;
        }
        .checklist li:before {
          content: "✓ ";
          color: #27ae60;
          font-weight: bold;
        }
      `}</style>

      <div className="guide-container">
        <h1 className="guide-header">Thermal Printer Driver Troubleshooting Guide</h1>
        
        <div className="warning">
          <strong>⚠️ Common Thermal Printer Issues:</strong>
          <ul>
            <li>Print preview doesn't match actual print</li>
            <li>Content gets cut off or misaligned</li>
            <li>Wrong paper size detected</li>
            <li>Print quality issues</li>
            <li>Driver conflicts</li>
          </ul>
        </div>

        <div className="guide-section">
          <h2>🔧 Driver Configuration Steps</h2>
          
          <div className="issue-item">
            <h3>1. Set Correct Paper Size</h3>
            <p><strong>Problem:</strong> Printer defaults to A4 or Letter size instead of 80mm</p>
            <div className="solution-item">
              <strong>Solution:</strong>
              <ol>
                <li>Go to Control Panel → Devices and Printers</li>
                <li>Right-click your thermal printer → Printer properties</li>
                <li>Go to "Paper/Quality" or "Advanced" tab</li>
                <li>Set Paper Size to "80mm x 297mm" or "Custom"</li>
                <li>Width: 80mm, Height: 297mm (or "Roll Paper")</li>
              </ol>
            </div>
          </div>

          <div className="issue-item">
            <h3>2. Configure Margins</h3>
            <p><strong>Problem:</strong> Printer adds unwanted margins or cuts off content</p>
            <div className="solution-item">
              <strong>Solution:</strong>
              <ol>
                <li>In printer properties, go to "Layout" or "Page Setup"</li>
                <li>Set all margins to 0mm or minimum possible</li>
                <li>Enable "Borderless Printing" if available</li>
                <li>Disable "Fit to Page" or "Scale to Fit"</li>
              </ol>
            </div>
          </div>

          <div className="issue-item">
            <h3>3. Set Print Quality</h3>
            <p><strong>Problem:</strong> Faint or blurry print output</p>
            <div className="solution-item">
              <strong>Solution:</strong>
              <ol>
                <li>Set print quality to "Best" or "High"</li>
                <li>Enable "Print in Black and White" for thermal printers</li>
                <li>Set DPI to 300 or higher if available</li>
              </ol>
            </div>
          </div>
        </div>

        <div className="guide-section">
          <h2>💻 Browser Print Settings</h2>
          
          <div className="issue-item">
            <h3>Chrome/Edge Print Settings</h3>
            <div className="solution-item">
              <strong>When printing from browser:</strong>
              <ol>
                <li>Press Ctrl+P (or Cmd+P on Mac)</li>
                <li>Set Destination: Your thermal printer</li>
                <li>Set Paper Size: Custom → 80mm x 297mm</li>
                <li>Set Margins: None</li>
                <li>Enable "Background graphics"</li>
                <li>Disable "Headers and footers"</li>
                <li>Set Scale: 100%</li>
              </ol>
            </div>
          </div>

          <div className="issue-item">
            <h3>Firefox Print Settings</h3>
            <div className="solution-item">
              <strong>Firefox specific settings:</strong>
              <ol>
                <li>Press Ctrl+P</li>
                <li>Click "Page Setup"</li>
                <li>Set Paper Size: Custom Format</li>
                <li>Width: 80mm, Height: 297mm</li>
                <li>Margins: 0mm</li>
                <li>Scaling: 100%</li>
              </ol>
            </div>
          </div>
        </div>

        <div className="guide-section">
          <h2>🛠️ Advanced Troubleshooting</h2>
          
          <div className="issue-item">
            <h3>Driver Reinstallation</h3>
            <p><strong>When to do this:</strong> Persistent alignment issues or driver conflicts</p>
            <div className="solution-item">
              <strong>Steps:</strong>
              <ol>
                <li>Uninstall current printer driver</li>
                <li>Download latest driver from manufacturer website</li>
                <li>Install driver as Administrator</li>
                <li>Restart computer</li>
                <li>Reconfigure printer settings</li>
              </ol>
            </div>
          </div>

          <div className="issue-item">
            <h3>Registry Fix (Windows)</h3>
            <p><strong>For advanced users only:</strong></p>
            <div className="code-block">
              Windows Registry Editor Version 5.00<br/>
              [HKEY_CURRENT_USER\\Software\\Microsoft\\Internet Explorer\\PageSetup]<br/>
              "margin_bottom"="0.000000"<br/>
              "margin_left"="0.000000"<br/>
              "margin_right"="0.000000"<br/>
              "margin_top"="0.000000"
            </div>
          </div>
        </div>

        <div className="guide-section">
          <h2>📋 Quick Checklist</h2>
          <ul className="checklist">
            <li>Printer driver is latest version</li>
            <li>Paper size set to 80mm x 297mm</li>
            <li>All margins set to 0mm</li>
            <li>Borderless printing enabled</li>
            <li>Print quality set to high</li>
            <li>Browser print settings configured correctly</li>
            <li>No "Fit to page" or scaling enabled</li>
            <li>Background graphics enabled</li>
          </ul>
        </div>

        <div className="guide-section">
          <h2>📞 Common Printer Models & Settings</h2>
          
          <div className="issue-item">
            <h3>Star Micronics TSP100</h3>
            <div className="solution-item">
              <strong>Recommended Settings:</strong>
              <ul>
                <li>Paper Size: 80mm x 297mm</li>
                <li>Margins: 0mm</li>
                <li>Print Mode: Text + Graphics</li>
                <li>Resolution: 203 DPI</li>
              </ul>
            </div>
          </div>

          <div className="issue-item">
            <h3>Epson TM-T20</h3>
            <div className="solution-item">
              <strong>Recommended Settings:</strong>
              <ul>
                <li>Paper Size: 80mm x 297mm</li>
                <li>Margins: 0mm</li>
                <li>Print Mode: High Speed</li>
                <li>Resolution: 203 DPI</li>
              </ul>
            </div>
          </div>

          <div className="issue-item">
            <h3>HP Thermal Printers</h3>
            <div className="solution-item">
              <strong>Recommended Settings:</strong>
              <ul>
                <li>Paper Size: Custom 80mm</li>
                <li>Margins: Minimum</li>
                <li>Print Quality: Best</li>
                <li>Borderless: Enabled</li>
              </ul>
            </div>
          </div>
        </div>

        <div className="warning">
          <strong>💡 Pro Tips:</strong>
          <ul>
            <li>Always test print with a simple text document first</li>
            <li>Check printer's physical paper width setting</li>
            <li>Ensure thermal paper is loaded correctly</li>
            <li>Update printer firmware if available</li>
            <li>Contact printer manufacturer support for model-specific issues</li>
          </ul>
        </div>
      </div>
    </div>
  );
};

export default ThermalPrinterDriverGuide;
