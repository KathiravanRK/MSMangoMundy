import React from 'react';
import Modal from './Modal';
import Button from './Button';
import { ICONS } from '../../constants';
import PrintPreviewWrapper from './PrintPreviewWrapper';

type ModalSize = 'sm' | 'md' | 'lg' | 'xl' | '2xl' | '4xl' | '6xl';

interface PrintPreviewModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
  onPrint: () => void;
  size?: ModalSize;
}

// @ts-ignore
import html2canvas from 'html2canvas';
// @ts-ignore
import { jsPDF } from 'jspdf';

const PrintPreviewModal: React.FC<PrintPreviewModalProps> = ({ isOpen, onClose, title, children, onPrint, size }) => {
  const handleDownload = async () => {
    try {
      // Try to find A4 thermal container first, then A4 regular, then thermal
      let element = document.querySelector('#print-preview-content .a4-thermal-container') as HTMLElement;
      let isA4 = true;

      if (!element) {
        element = document.querySelector('#print-preview-content .a4-print-container') as HTMLElement;
      }

      if (!element) {
        element = document.querySelector('#print-preview-content .thermal-print-container') as HTMLElement;
        isA4 = false;
      }

      if (!element) {
        console.error('Print content not found');
        alert('No printable content found.');
        return;
      }

      // Capture the element using html2canvas
      const canvas = await html2canvas(element, {
        scale: 2, // Higher scale for better quality
        useCORS: true,
        logging: false,
        backgroundColor: '#ffffff'
      });

      const imgData = canvas.toDataURL('image/png');

      if (isA4) {
        // A4 PDF generation
        const pdf = new jsPDF({
          orientation: 'portrait',
          unit: 'mm',
          format: 'a4' // Standard A4: 210mm x 297mm
        });

        const imgProps = pdf.getImageProperties(imgData);
        const pdfWidth = 190; // 210mm - 20mm margins
        const pdfHeight = (imgProps.height * pdfWidth) / imgProps.width;

        // Center the content with margins
        const xOffset = 10; // 10mm left margin
        const yOffset = 10; // 10mm top margin

        // Handle multi-page if content is taller than A4
        const pageHeight = 277; // 297mm - 20mm margins
        let heightLeft = pdfHeight;
        let position = yOffset;

        pdf.addImage(imgData, 'PNG', xOffset, position, pdfWidth, pdfHeight);
        heightLeft -= pageHeight;

        while (heightLeft > 0) {
          position = yOffset - (pdfHeight - heightLeft);
          pdf.addPage();
          pdf.addImage(imgData, 'PNG', xOffset, position, pdfWidth, pdfHeight);
          heightLeft -= pageHeight;
        }

        pdf.save(`${title.replace(/\s+/g, '_')}_${new Date().toISOString().split('T')[0]}.pdf`);
      } else {
        // Thermal 80mm PDF generation with flexible height
        const pdf = new jsPDF({
          orientation: 'portrait',
          unit: 'mm',
          format: [80, 297] // Start with standard length, will be adjusted
        });

        const imgProps = pdf.getImageProperties(imgData);
        const pdfWidth = 80;
        const pdfHeight = (imgProps.height * pdfWidth) / imgProps.width;

        // Set the actual height based on content
        pdf.internal.pageSize.height = pdfHeight;
        pdf.internal.pageSize.width = pdfWidth;

        pdf.addImage(imgData, 'PNG', 0, 0, pdfWidth, pdfHeight);
        pdf.save(`${title.replace(/\s+/g, '_')}_${new Date().toISOString().split('T')[0]}.pdf`);
      }

    } catch (error) {
      console.error('Error generating PDF:', error);
      alert('Failed to generate PDF. Please try again.');
    }
  };

  if (!isOpen) {
    return null;
  }

  return (
    <div className="print-modal-active">
      <style>{`
        @media screen {
          .print-modal-content-wrapper {
            position: relative;
            overflow: auto;
            padding-top: 40px !important;
            padding-bottom: 24px !important;
            margin-top: 0 !important;
          }
          #print-preview-content {
            max-width: 100%;
            box-sizing: border-box;
            position: relative;
            z-index: 1;
          }
          .thermal-print-container {
            max-height: none !important;
            height: auto !important;
            overflow: visible !important;
            margin: 0 auto !important;
            position: relative !important;
            z-index: 1 !important;
            background: white !important;
            box-shadow: none !important;
            border: none !important;
            border-radius: 0 !important;
            padding: 2mm !important;
          }
          .thermal-print-container * {
            position: relative !important;
            z-index: 1 !important;
          }
          .modal-header {
            position: relative !important;
            top: 0 !important;
            z-index: 10 !important;
            background: white !important;
            border-bottom: 1px solid #e5e7eb !important;
            margin-bottom: 0 !important;
          }
          .print-modal-chrome {
            position: relative !important;
            bottom: 0 !important;
            z-index: 10 !important;
            background: white !important;
            border-top: 1px solid #e5e7eb !important;
          }
          /* Force preview area below header with clear separation */
          .modal-header + .print-modal-content-wrapper {
            margin-top: 0 !important;
            padding-top: 40px !important;
            border-top: none !important;
          }
          /* Ensure no overlap by adding extra space */
          .print-modal-content-wrapper::before {
            content: '';
            display: block;
            height: 8px;
            background: transparent;
            margin-bottom: 8px;
          }
        }
      `}</style>
      <Modal isOpen={isOpen} onClose={onClose} title={title} size={size}>
        <div className="print-modal-content-wrapper bg-slate-200 p-4 md:p-6" style={{ height: '72vh', overflowY: 'auto' }}>
          <div id="print-preview-content">
            <PrintPreviewWrapper>
              {children}
            </PrintPreviewWrapper>
          </div>
        </div>
        <div className="flex justify-end pt-4 mt-4 border-t gap-2 print-modal-chrome">
          <Button variant="secondary" onClick={onClose}>Close</Button>
          <Button variant="secondary" onClick={handleDownload} icon={ICONS.download}>Download PDF</Button>
          <Button onClick={onPrint} icon={ICONS.print}>Print</Button>
        </div>
      </Modal>
    </div>
  );
};

export default PrintPreviewModal;
