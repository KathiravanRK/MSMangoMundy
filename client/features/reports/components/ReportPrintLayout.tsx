import React from 'react';
import { Column } from '../../../components/ui/SortableTable';
import A4PrintStyles from '../../../components/print/A4PrintStyles';
import ThermalPrintStyles from '../../../components/thermal/ThermalPrintStyles';
import logo from '../../../utils/logo.png';

interface ReportPrintLayoutProps {
    reportTitle: string;
    filters: React.ReactNode;
    columns: Column<any>[];
    data: any[];
    summarySection: React.ReactNode;
    children?: React.ReactNode;
}

const ReportPrintLayout: React.FC<ReportPrintLayoutProps> = ({ reportTitle, filters, columns, data, summarySection, children }) => {

    const generationDate = new Date().toLocaleString('en-IN', {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        hour12: true
    });

    // Determine if we should use thermal (80mm) or A4 format
    // Use thermal for 4 or fewer columns
    const useThermalFormat = columns.length <= 4;

    const renderCell = (item: any, column: Column<any>) => {
        let value: React.ReactNode;
        if (typeof column.accessor === 'function') {
            value = column.accessor(item);
        } else {
            value = item[column.accessor as keyof any];
        }

        if (React.isValidElement<{ children?: React.ReactNode }>(value)) {
            if (value.props && typeof value.props.children === 'string') {
                return value.props.children;
            }
            if (value.type === 'input' || value.type === 'button') {
                return '';
            }
            return value;
        }

        return value;
    };

    // Thermal (80mm) Format
    if (useThermalFormat) {
        return (
            <>
                <ThermalPrintStyles />
                <div className="thermal-print-container">
                    {/* Header */}
                    <header className="thermal-header">
                        <div className="thermal-logo-container">
                            <img src={logo} alt="Mango Logo" />
                            <div className="company-name">
                                <h1 className="font-bold text-lg mb-0">MS</h1>
                                <h2 className="text-md font-bold">Mango Mundy</h2>
                            </div>
                        </div>
                        <p className="text-sm font-bold mt-1 text-center">Mob: 9952235676, 9443735676</p>
                    </header>

                    <div className="dashed-line"></div>

                    {/* Report Title */}
                    <h3 className="text-md font-bold">{reportTitle}</h3>

                    {/* Filters */}
                    <div className="text-xs" style={{ marginBottom: '8px' }}>
                        {filters}
                    </div>

                    {/* Table */}
                    {children ? (
                        children
                    ) : (
                        <table className="thermal-items-table">
                            <thead>
                                <tr>
                                    {columns.map(col => (
                                        <th key={col.key} className={col.className} style={{ background: '#1a3a5c', color: '#fff', padding: '6px 4px', fontSize: '9pt', textAlign: 'left' }}>
                                            {typeof col.header === 'string' ? col.header : col.key}
                                        </th>
                                    ))}
                                </tr>
                            </thead>
                            <tbody>
                                {data.map((row, rowIndex) => (
                                    <tr key={row.id || rowIndex} style={{ borderBottom: '1px solid #ddd' }}>
                                        {columns.map(col => (
                                            <td key={`${col.key}-${rowIndex}`} className={col.className} style={{ padding: '5px 4px', fontSize: '10pt' }}>
                                                {renderCell(row, col)}
                                            </td>
                                        ))}
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    )}

                    {/* Summary */}
                    {summarySection && (
                        <div className="thermal-totals" style={{ marginTop: '10px', borderTop: '1px dashed #000', paddingTop: '8px' }}>
                            <p className="text-sm font-bold" style={{ marginBottom: '6px' }}>Summary</p>
                            {summarySection}
                        </div>
                    )}

                    {/* Footer */}
                    <footer className="thermal-footer">
                        <div className="dashed-line"></div>
                        <p className="text-xs">Generated on: {generationDate}</p>
                        <p className="text-xs">Salem Main Road, Kaveripattinam - 635112</p>
                        <p className="text-xs">Tamil Nadu, India</p>
                    </footer>
                </div>
            </>
        );
    }

    // A4 Format (for 5+ columns)
    return (
        <>
            <A4PrintStyles />
            <div id="report-print-container" className="a4-thermal-container">
                {/* Header - Centered like thermal */}
                <header className="a4-thermal-header">
                    <div className="a4-thermal-logo-container">
                        <img src={logo} alt="Mango Logo" />
                        <div className="company-name">
                            <h1>MS</h1>
                            <h2>Mango Mundy</h2>
                        </div>
                    </div>
                    <p className="contact-info">Mob: 9952235676, 9443735676</p>
                </header>

                {/* Dashed separator */}
                <div className="dashed-line"></div>

                {/* Report Title */}
                <h3 className="a4-thermal-title">{reportTitle}</h3>

                {/* Filters/Meta */}
                <div className="a4-thermal-meta">
                    {filters}
                </div>

                {/* Table or Custom Content */}
                {children ? (
                    children
                ) : (
                    <table>
                        <thead>
                            <tr>
                                {columns.map(col => (
                                    <th key={col.key} className={col.className}>
                                        {typeof col.header === 'string' ? col.header : col.key}
                                    </th>
                                ))}
                            </tr>
                        </thead>
                        <tbody>
                            {data.map((row, rowIndex) => (
                                <tr key={row.id || rowIndex}>
                                    {columns.map(col => (
                                        <td key={`${col.key}-${rowIndex}`} className={col.className}>
                                            {renderCell(row, col)}
                                        </td>
                                    ))}
                                </tr>
                            ))}
                        </tbody>
                    </table>
                )}

                {/* Summary Section */}
                {summarySection && (
                    <div className="a4-thermal-summary">
                        <h4>Summary</h4>
                        {summarySection}
                    </div>
                )}

                {/* Footer - Centered like thermal */}
                <footer className="a4-thermal-footer">
                    <p>This is a computer-generated document.</p>
                    <p>Generated on: {generationDate}</p>
                    <p className="address">Salem Main Road, Kaveripattinam - 635112, Tamil Nadu, India</p>
                </footer>
            </div>
        </>
    );
};

export default ReportPrintLayout;
