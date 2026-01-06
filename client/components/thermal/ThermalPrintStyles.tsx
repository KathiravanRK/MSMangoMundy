import React from 'react';

/**
 * Thermal print styles for 80mm POS receipt printers.
 * Optimized for MAXIMUM space utilization and solid alignment.
 */
const ThermalPrintStyles: React.FC = () => {
  return (
    <style>{`
      @import url('https://fonts.googleapis.com/css2?family=Roboto:wght@400;500;700&display=swap');
      
      /* Global Print Setup */
      @page {
        size: 80mm auto;
        margin: 0 !important;
      }
      
      @media print {
        /* Single, simplified print block to avoid nested media queries */
        /* Use a fixed height to help browser render the narrow receipt canvas without large side gutters */
        @page {
          size: 80mm 200mm; /* 80mm width, 200mm height (adjust as needed) */
          margin: 0 !important;
        }

        /* Global resets for print */
        * {
          -webkit-print-color-adjust: exact !important;
          print-color-adjust: exact !important;
          animation: none !important;
          transition: none !important;
        }

        /* Ensure page and root occupy the 80mm width and have no margins */
        html, body, #root, #root > div {
          width: 80mm !important;
          min-height: 200mm !important; /* match @page height to avoid auto-scaling */
          margin: 0 !important;
          padding: 0 !important;
          background: #fff !important;
          overflow: visible !important;
          height: auto !important;
        }

        /* Hide the rest of the app, reveal only the print area */
        body * {
          visibility: hidden !important;
        }

        /* Reveal likely containers and the explicit thermal print area by id/class */
        #root,
        #root > div,
        .print-modal-active,
        .modal-content,
        .modal-body,
        #thermal-print-area,
        .thermal-print-container {
          display: contents !important;
          visibility: visible !important;
          border: none !important;
          box-shadow: none !important;
          padding: 0 !important;
          margin: 0 !important;
        }

        /* Force the thermal container to fill the page width and remove print-only decorations */
        #thermal-print-area, .thermal-print-container {
          display: block !important;
          width: 80mm !important; /* force exact receipt width */
          max-width: 80mm !important;
          margin: 0 !important;
          padding: 2mm !important; /* minimal inner margin */
          background: #fff !important;
          box-sizing: border-box !important;
          position: relative !important;
          border: none !important;
          box-shadow: none !important;
        }

        /* Make sure all elements inside are visible and not clipped */
        #thermal-print-area *, .thermal-print-container * {
          visibility: visible !important;
          -webkit-transform: none !important;
          transform: none !important;
        }

        /* Hide chrome */
        aside, nav, .no-print, .modal-header, .modal-footer, .print-modal-chrome, button {
          display: none !important;
        }

        /* Force punchy black text and bold weight for all printable content */
        #thermal-print-area, .thermal-print-container, #thermal-print-area *, .thermal-print-container * {
          color: #000 !important;
          -webkit-text-fill-color: #000 !important;
          -webkit-print-color-adjust: exact !important;
          print-color-adjust: exact !important;
          -webkit-font-smoothing: antialiased !important;
          text-shadow: none !important;
          filter: none !important;
          opacity: 1 !important;
          font-weight: 700 !important;
          -webkit-font-weight: 700 !important;
        }

        /* Also ensure pseudo elements are black */
        #thermal-print-area *::before, #thermal-print-area *::after, .thermal-print-container *::before, .thermal-print-container *::after {
          color: #000 !important;
        }

        /* Force common typographic elements to bold black explicitly */
        #thermal-print-area h1, #thermal-print-area h2, #thermal-print-area h3,
        #thermal-print-area p, #thermal-print-area span, #thermal-print-area div,
        #thermal-print-area td, #thermal-print-area th,
        .thermal-print-container h1, .thermal-print-container h2, .thermal-print-container h3,
        .thermal-print-container p, .thermal-print-container span, .thermal-print-container div,
        .thermal-print-container td, .thermal-print-container th {
          color: #000 !important;
          font-weight: 700 !important;
        }

        /* Make sure lines and dividers print black */
        .thermal-print-container .dashed-line { border-top-color: #000 !important; }
        .thermal-print-container .thick-line { border-top-color: #000 !important; }
        .entry-divider { background: #000 !important; }
        .item-row { border-bottom-color: #000 !important; }
        .total-summary-row { border-top-color: #000 !important; }

        /* Override colored accents to black */
        .advance-amount, .buyer-place, .buyer-contact, .entry-date, .buyer-place-inline, .deductions-header, .nw-text {
          color: #000 !important;
          font-weight: 700 !important;
        }

        /* Ensure SVGs/images don't carry muted colors */
        #thermal-print-area img, .thermal-print-container img { filter: none !important; opacity: 1 !important; }
        #thermal-print-area svg * { fill: #000 !important; stroke: #000 !important; }
      }
      
        /* Screen / Preview Styles */
      .thermal-print-container {
        width: 76mm; /* Match print width */
        font-family: 'Roboto', 'Inter', system-ui, sans-serif;
        font-size: 11pt;
        color: #000;
        line-height: 1.4;
        padding: 2mm !important; /* Match print margins */
        box-sizing: border-box;
        background: white;
        margin: 8px auto; /* Tucked right under the title */
        border: 1px solid #ddd;
        border-radius: 4px;
        box-shadow: 0 4px 15px rgba(0,0,0,0.1);
        position: relative;
        z-index: 10;
        min-height: auto !important;
        height: auto !important;
      }

      .text-center { text-align: center !important; }
      .text-right { text-align: right !important; }
      .text-left { text-align: left !important; }
      .font-bold { font-weight: 700 !important; }
      .text-lg { font-size: 15pt !important; }
      .text-md { font-size: 13pt !important; }
      .text-sm { font-size: 11pt !important; }
      .text-xs { font-size: 10pt !important; }

      .thermal-print-container p, 
      .thermal-print-container h1, 
      .thermal-print-container h2, 
      .thermal-print-container h3 {
        margin: 0 !important;
        padding: 0 !important;
      }

      .thermal-logo-container {
        display: flex;
        align-items: center;
        justify-content: center;
        width: 100%;
        gap: 12px;
      }

      .thermal-logo-container img {
        width: 52px;
        height: auto;
      }

      .company-name {
        text-align: center;
      }
      
      .thermal-print-container .dashed-line {
        border-top: 1px dashed #000 !important;
        margin: 2px 0 !important;
        width: 100% !important;
      }
      
      .thermal-print-container .thick-line {
        border-top: 2px solid #000 !important;
        margin: 6px 0 !important;
        width: 100% !important;
      }
      
      /* Columns for full-width utilization - optimized for 80mm thermal paper */
      .thermal-items-table .col-item { width: 42% !important; }
      .thermal-items-table .col-qty { width: 16% !important; }
      .thermal-items-table .col-rate { width: 18% !important; }
      .thermal-items-table .col-amount { width: 24% !important; }

      .thermal-entry-table .col-e-item { width: 38% !important; }
      .thermal-entry-table .col-e-qty { width: 20% !important; }
      .thermal-entry-table .col-e-rate { width: 18% !important; }
      .thermal-entry-table .col-e-amount { width: 24% !important; }

      .thermal-totals .row {
        display: flex !important;
        justify-content: space-between !important;
        padding: 2px 0 !important;
      }

      .thermal-footer {
        text-align: center !important;
        margin-top: 4px !important;
        width: 100% !important;
      }

      .thermal-footer p {
        text-align: center !important;
        margin: 1px 0 !important;
      }

      .final-amount {
        font-size: 14pt !important;
        font-weight: 700 !important;
        border-top: 2px solid #000 !important;
        padding-top: 4px !important;
        margin-top: 4px !important;
      }

      .nw-text {
        font-size: 9pt !important;
        font-style: italic !important;
        color: #000 !important;
        display: block !important;
      }

      /* Professional Invoice Layout Styles */
      .invoice-header-details {
        margin-bottom: 8px;
      }
      
      .invoice-meta {
        margin-bottom: 6px;
      }
      
      .meta-row {
        display: flex !important;
        justify-content: space-between !important;
        padding: 2px 0 !important;
        font-size: 10pt !important;
      }
      
      .meta-label {
        font-weight: 500 !important;
        color: #000 !important;
      }
      
      .meta-value {
        font-weight: 600 !important;
        color: #000 !important;
      }
      
      .buyer-info {
        margin-top: 6px;
      }
      
      .buyer-header {
        font-size: 10pt !important;
        font-weight: 700 !important;
        color: #000 !important;
        margin-bottom: 2px !important;
        text-transform: title !important;
        letter-spacing: 0.5px !important;
      }
      
      .buyer-name {
        font-size: 12pt !important;
        margin-bottom: 2px !important;
      }
      
      .buyer-contact, .buyer-place {
        font-size: 9pt !important;
        color: #000 !important;
        margin-bottom: 1px !important;
      }
      
      .items-section {
        margin: 8px 0 !important;
      }
      
      .table-header.professional {
        display: grid !important;
        grid-template-columns: 7% 40% 13% 18% 22% !important;
        gap: 0 !important;
        padding: 4px 0 !important;
        font-size: 10pt !important;
        font-weight: 700 !important;
        border-bottom: 1px solid #000 !important;
        margin-bottom: 2px !important;
        width: 100% !important;
      }
      
      .items-body {
        margin-top: 2px !important;
      }
      
      .item-row {
        display: grid !important;
        grid-template-columns: 7% 40% 13% 18% 22% !important;
        gap: 0 !important;
        align-items: flex-start !important;
        padding: 2px 0 !important;
        font-size: 10pt !important;
        border-bottom: 1px solid #000 !important;
        width: 100% !important;
      }
      
      .item-row:last-child {
        border-bottom: none !important;
      }
      
      .col-sr {
        text-align: center !important;
      }
      
      .col-item {
        text-align: left !important;
      }
      
      .col-qty {
        text-align: right !important;
      }
      
      .col-rate {
        text-align: right !important;
      }
      
      .col-amount {
        text-align: right !important;
      }
      
      .item-sub {
        font-size: 8pt !important;
        color: #000 !important;
        margin-top: 1px !important;
        font-style: italic !important;
        display: block !important;
        width: 100% !important;
      }
      
      .total-summary-row {
        display: grid !important;
        grid-template-columns: 7% 40% 13% 18% 22% !important;
        gap: 0 !important;
        align-items: flex-start !important;
        padding: 2px 0 !important;
        font-size: 10pt !important;
        border-top: 1px solid #000 !important;
        margin-top: 2px !important;
        width: 100% !important;
        font-weight: 700 !important;
      }
      
      .buyer-place-inline {
        font-size: 9pt !important;
        color: #000 !important;
        font-weight: normal !important;
        margin-left: 4px !important;
      }
      
      /* Supplier Invoice Specific Styles */
      .entry-section {
        margin-bottom: 8px !important;
      }
      
      .entry-header {
        display: flex !important;
        justify-content: space-between !important;
        padding: 2px 0 !important;
        font-size: 9pt !important;
        font-weight: 600 !important;
        color: #000 !important;
        margin-bottom: 2px !important;
      }
      
      .entry-label {
        font-weight: 700 !important;
      }
      
      .entry-date {
        font-weight: 500 !important;
        color: #000 !important;
      }
      
      .entry-divider {
        height: 1px !important;
        background: #ddd !important;
        margin: 4px 0 !important;
      }
      
      .advance-row {
        display: grid !important;
        grid-template-columns: 7% 40% 13% 18% 22% !important;
        gap: 0 !important;
        padding: 2px 0 !important;
        font-size: 10pt !important;
        border-top: 1px solid #eee !important;
        margin-top: 2px !important;
      }
      
      .advance-amount {
        color: #5e0000ff !important;
        font-weight: 600 !important;
      }
      
      .deductions-header {
        font-size: 9pt !important;
        font-weight: 700 !important;
        color: #000 !important;
        margin: 4px 0 2px 0 !important;
        text-transform: uppercase !important;
        letter-spacing: 0.5px !important;
      }
      
      .summary-section {
        margin: 8px 0 !important;
      }
      
      .summary-grid {
        display: grid !important;
        grid-template-columns: 1fr 1fr !important;
        gap: 4px !important;
        margin-bottom: 4px !important;
      }
      
      .summary-row {
        display: flex !important;
        justify-content: space-between !important;
        padding: 2px 0 !important;
        font-size: 10pt !important;
      }
      
      .summary-label {
        font-weight: 500 !important;
        color: #000 !important;
      }
      
      .summary-value {
        font-weight: 600 !important;
        color: #000 !important;
      }
      
      .amount-details {
        margin: 4px 0 !important;
      }
      
      .amount-row {
        display: flex !important;
        justify-content: space-between !important;
        padding: 3px 0 !important;
        font-size: 10pt !important;
      }
      
      .amount-label {
        font-weight: 500 !important;
        color: #000 !important;
      }
      
      .amount-value {
        font-weight: 600 !important;
        color: #000 !important;
      }
      
      .amount-negative {
        color: #5e0000ff !important;
      }
      
      .amount-net {
        border-top: 1px solid #000 !important;
        padding-top: 6px !important;
        margin-top: 4px !important;
      }
      
      .amount-discount {
        color: #5e0000ff !important;
      }
      
      .amount-final {
        border-top: 2px solid #000 !important;
        padding-top: 6px !important;
        margin-top: 4px !important;
        font-size: 12pt !important;
      }
      
      .payment-details {
        margin: 4px 0 !important;
      }
      
      .payment-row {
        display: flex !important;
        justify-content: space-between !important;
        padding: 3px 0 !important;
        font-size: 10pt !important;
      }
      
      .payment-label {
        font-weight: 500 !important;
        color: #000 !important;
      }
      
      .payment-value {
        font-weight: 600 !important;
        color: #000 !important;
      }
      
      .payment-balance {
        border-top: 1px solid #000 !important;
        padding-top: 6px !important;
        margin-top: 4px !important;
      }
      
      .payment-amount {
        color: #5e0000ff !important;
        font-size: 12pt !important;
        font-weight: 700 !important;
      }
      
      .invoice-footer-info {
        margin: 8px 0 !important;
      }
      
      .footer-grid {
        display: grid !important;
        grid-template-columns: 1fr 1fr !important;
        gap: 4px !important;
        margin-bottom: 6px !important;
      }
      
      .footer-item {
        display: flex !important;
        flex-direction: column !important;
        font-size: 9pt !important;
      }
      
      .footer-label {
        font-weight: 500 !important;
        color: #000 !important;
        margin-bottom: 1px !important;
      }
      
      .footer-value {
        font-weight: 600 !important;
        color: #000 !important;
      }
      
      .terms-note {
        margin: 6px 0 !important;
        font-size: 8pt !important;
      }
      
      .note-label {
        font-weight: 700 !important;
        color: #000 !important;
        margin-bottom: 2px !important;
        text-transform: uppercase !important;
        letter-spacing: 0.5px !important;
      }
      
      .note-text {
        color: #000 !important;
        line-height: 1.2 !important;
      }
      
      .signature-area {
        margin-top: 40px !important;
        text-align: right !important;
        padding-bottom: 1px !important;
      }
      
      .signature-line {
        width: 150px !important;
        align-self: right !important;
        height: 1px !important;
        background: #000 !important;
        margin: 0 auto 4px auto !important;
      }
      
      .signature-text {
        font-size: 7pt !important;
        align-self: right !important;
        font-weight: 700 !important;
        color: #000 !important;
        text-transform: uppercase !important;
        letter-spacing: 1px !important;
      }

      .flex { display: flex !important; }
      .justify-between { justify-content: space-between !important; }
    `}</style>
  );
};

export default ThermalPrintStyles;
