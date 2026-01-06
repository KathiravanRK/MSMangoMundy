import React, { useState, useCallback } from 'react';
import PrintPreviewModal from '../components/ui/PrintPreviewModal';

type ModalSize = 'sm' | 'md' | 'lg' | 'xl' | '2xl' | '4xl' | '6xl';

interface PrintPreviewOptions {
    mode?: 'thermal' | 'a4';
    size?: ModalSize;
}

const usePrintPreview = () => {
    const [isOpen, setIsOpen] = useState(false);
    const [printContent, setPrintContent] = useState<React.ReactNode>(null);
    const [printTitle, setPrintTitle] = useState('');
    const [options, setOptions] = useState<PrintPreviewOptions>({ mode: 'thermal', size: '4xl' });

    const openPrintPreview = useCallback((title: string, content: React.ReactNode, opts: PrintPreviewOptions = {}) => {
        // Default size: 'sm' for thermal (matches 80mm better), '4xl' for A4
        const defaultSize = (opts.mode === 'a4') ? '4xl' : 'sm';
        const finalOpts: PrintPreviewOptions = { mode: 'thermal', size: defaultSize, ...opts };

        setPrintTitle(title);
        setPrintContent(content);
        setOptions(finalOpts);
        setIsOpen(true);
        const modeClass = finalOpts.mode === 'thermal' ? 'thermal-print-view' : 'a4-print-view';
        document.body.classList.add('print-active', modeClass);
    }, []);

    const closePrintPreview = useCallback(() => {
        setIsOpen(false);
        const modeClass = options.mode === 'thermal' ? 'thermal-print-view' : 'a4-print-view';
        document.body.classList.remove('print-active', modeClass);
        setTimeout(() => {
            setPrintContent(null);
            setPrintTitle('');
        }, 300);
    }, [options.mode]);

    const handlePrint = () => {
        // Try to open a focused print window containing only the thermal print area
        try {
            const printEl = document.getElementById('thermal-print-area') || document.querySelector('.thermal-print-container');
            if (!printEl) {
                window.print();
                return;
            }

            const printWindow = window.open('', '_blank', 'width=600,height=800');
            if (!printWindow) { window.print(); return; }

            const doc = printWindow.document;
            doc.open();
            doc.write('<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">');
            doc.write(`<title>${printTitle || 'Print'}</title>`);

            // Clone and inject all style and link elements from the current document head (to include ThermalPrintStyles)
            const headStyles = Array.from(document.querySelectorAll('link[rel="stylesheet"], style'));
            headStyles.forEach(node => {
                try {
                    doc.head.appendChild(node.cloneNode(true));
                } catch (e) {
                    // ignore clone errors
                }
            });

            // Minimal body styling to remove default margins
            doc.write('<style>html,body{margin:0;padding:0;background:#fff;}@page{size:80mm auto;margin:0;}body{width:80mm;}</style>');

            doc.write('</head><body>');
            // Clone the print element into the new document
            const cloned = (printEl as HTMLElement).cloneNode(true) as HTMLElement;
            // Ensure outer container has expected id/class
            if (!cloned.id) cloned.id = 'thermal-print-area';
            doc.body.appendChild(cloned);

            // Script to trigger print and close window
            doc.write('\n<script>function finish(){window.focus();setTimeout(()=>{window.print();setTimeout(()=>window.close(),500);},250);}window.onload=finish;<\/script>');
            doc.write('</body></html>');
            doc.close();
        } catch (err) {
            // Fallback to default print
            window.print();
        }
    };

    const PrintPreview: React.FC = () => {
        return React.createElement(
            PrintPreviewModal,
            {
                isOpen: isOpen,
                onClose: closePrintPreview,
                title: printTitle,
                onPrint: handlePrint,
                size: options.size,
                children: printContent
            }
        );
    };

    return { openPrintPreview, PrintPreview };
};

export default usePrintPreview;