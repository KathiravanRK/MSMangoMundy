import React from 'react';

/**
 * A4 print styles that match the 80mm thermal receipt design.
 * Same visual style as ThermalPrintStyles but scaled for A4 paper.
 */
const A4PrintStyles: React.FC = () => {
    return (
        <style>{`
      @import url('https://fonts.googleapis.com/css2?family=Roboto:wght@400;500;700&display=swap');
      
      /* Global Print Setup for A4 */
      @page {
        size: A4;
        margin: 15mm;
      }
      
      @media print {
        html, body {
          margin: 0 !important;
          padding: 0 !important;
          background: #fff !important;
          -webkit-print-color-adjust: exact !important;
          print-color-adjust: exact !important;
        }

        body > *:not(#root):not(.print-modal-active) {
          display: none !important;
        }
        
        body * {
          visibility: hidden !important;
        }

        .a4-thermal-container,
        .a4-thermal-container * {
          visibility: visible !important;
          opacity: 1 !important;
        }

        .a4-thermal-container {
          display: block !important;
          position: absolute !important;
          top: 0 !important;
          left: 0 !important;
          width: 100% !important;
          margin: 0 !important;
          padding: 0 !important;
          background: #fff !important;
          box-sizing: border-box !important;
        }

        .print-modal-chrome, .modal-header, button, .no-print {
          display: none !important;
        }
      }
      
      /* Screen / Preview Styles - A4 Thermal Look */
      .a4-thermal-container {
        width: 210mm;
        min-height: 297mm;
        font-family: 'Roboto', 'Inter', system-ui, sans-serif;
        font-size: 12pt;
        color: #000;
        line-height: 1.5;
        padding: 15mm 20mm;
        box-sizing: border-box;
        background: white;
        margin: 20px auto;
        border: 1px solid #ddd;
        border-radius: 4px;
        box-shadow: 0 4px 15px rgba(0,0,0,0.1);
        display: flex;
        flex-direction: column;
      }

      /* Utility Classes */
      .a4-thermal-container .text-center { text-align: center !important; }
      .a4-thermal-container .text-right { text-align: right !important; }
      .a4-thermal-container .text-left { text-align: left !important; }
      .a4-thermal-container .font-bold { font-weight: 700 !important; }
      .a4-thermal-container .text-xl { font-size: 28pt !important; }
      .a4-thermal-container .text-lg { font-size: 20pt !important; }
      .a4-thermal-container .text-md { font-size: 16pt !important; }
      .a4-thermal-container .text-sm { font-size: 12pt !important; }
      .a4-thermal-container .text-xs { font-size: 10pt !important; }

      .a4-thermal-container p, 
      .a4-thermal-container h1, 
      .a4-thermal-container h2, 
      .a4-thermal-container h3 {
        margin: 0 !important;
        padding: 0 !important;
      }

      /* Header - Centered like thermal */
      .a4-thermal-header {
        text-align: center;
        margin-bottom: 15px;
      }

      .a4-thermal-logo-container {
        display: flex;
        align-items: center;
        justify-content: center;
        gap: 20px;
        margin-bottom: 10px;
      }

      .a4-thermal-logo-container img {
        width: 80px;
        height: auto;
      }

      .a4-thermal-logo-container .company-name h1 {
        font-size: 36pt;
        font-weight: 700;
        margin: 0;
        line-height: 1;
      }

      .a4-thermal-logo-container .company-name h2 {
        font-size: 22pt;
        font-weight: 700;
        margin: 0;
      }

      .a4-thermal-header .contact-info {
        font-size: 14pt;
        font-weight: 700;
        margin-top: 8px;
      }

      /* Dashed separator line - like thermal */
      .a4-thermal-container .dashed-line {
        border-top: 2px dashed #000 !important;
        margin: 15px 0 !important;
        width: 100% !important;
      }
      
      .a4-thermal-container .thick-line {
        border-top: 3px solid #000 !important;
        margin: 15px 0 !important;
        width: 100% !important;
      }

      /* Report Title - like thermal invoice title */
      .a4-thermal-title {
        font-size: 18pt;
        font-weight: 700;
        margin: 15px 0 !important;
      }

      /* Report Meta / Filters */
      .a4-thermal-meta {
        margin-bottom: 15px;
        font-size: 13pt;
      }

      .a4-thermal-meta p {
        margin: 5px 0 !important;
      }

      /* Table - matching thermal style with blue header */
      .a4-thermal-container table {
        width: 100%;
        border-collapse: collapse;
        margin: 15px 0;
        font-size: 12pt;
        border: 2px solid #000;
      }

      .a4-thermal-container thead th {
        background: #1a3a5c !important;
        color: #fff !important;
        font-weight: 700;
        font-size: 12pt;
        text-transform: uppercase;
        padding: 12px 10px;
        text-align: left;
        border: 1px solid #000;
      }

      .a4-thermal-container tbody td {
        padding: 10px;
        border: 1px solid #000;
        color: #000;
        vertical-align: middle;
      }

      .a4-thermal-container tbody tr:nth-child(even) {
        background-color: #f5f5f5 !important;
      }

      .a4-thermal-container .text-right {
        text-align: right !important;
      }

      /* Summary Section - like thermal totals */
      .a4-thermal-summary {
        margin-top: 20px;
        padding-top: 15px;
        border-top: 2px dashed #000;
      }

      .a4-thermal-summary h4 {
        font-size: 16pt;
        font-weight: 700;
        margin: 0 0 15px 0 !important;
        text-transform: uppercase;
      }

      .a4-thermal-summary .summary-row {
        display: flex;
        justify-content: flex-end;
        padding: 8px 0;
        font-size: 14pt;
        border-bottom: 1px dashed #ccc;
      }

      .a4-thermal-summary .summary-row:last-child {
        border-bottom: none;
        padding-top: 15px;
        margin-top: 10px;
        border-top: 3px solid #000;
        font-size: 18pt;
        font-weight: 700;
      }

      .a4-thermal-summary .summary-row .label {
        text-align: right;
        margin-right: 30px;
        min-width: 200px;
      }

      .a4-thermal-summary .summary-row .value {
        text-align: right;
        font-weight: 600;
        min-width: 150px;
      }

      /* Support for summary-item class (backwards compatibility) */
      .a4-thermal-summary .summary-item {
        display: flex;
        justify-content: flex-end;
        padding: 8px 0;
        font-size: 14pt;
        border-bottom: 1px dashed #ccc;
      }

      .a4-thermal-summary .summary-item:last-child {
        border-bottom: none;
        padding-top: 15px;
        margin-top: 10px;
        border-top: 3px solid #000;
        font-size: 18pt;
        font-weight: 700;
      }

      .a4-thermal-summary .summary-item span:first-child {
        text-align: right;
        margin-right: 30px;
        min-width: 200px;
      }

      .a4-thermal-summary .summary-item span:last-child {
        text-align: right;
        font-weight: 600;
        min-width: 150px;
      }

      /* Footer - centered like thermal */
      .a4-thermal-footer {
        margin-top: auto;
        padding-top: 20px;
        text-align: center;
        font-size: 11pt;
        border-top: 2px dashed #000;
      }

      .a4-thermal-footer p {
        margin: 5px 0 !important;
      }

      .a4-thermal-footer .address {
        font-weight: 600;
        margin-top: 10px !important;
      }

      /* NW text styling */
      .a4-thermal-container .nw-text {
        font-size: 10pt !important;
        font-style: italic !important;
        color: #444 !important;
        display: block !important;
      }

      /* Flex utilities */
      .a4-thermal-container .flex { display: flex !important; }
      .a4-thermal-container .justify-between { justify-content: space-between !important; }
      .a4-thermal-container .items-center { align-items: center !important; }
    `}</style>
    );
};

export default A4PrintStyles;
