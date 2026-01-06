import React from 'react';
import { BuyerBalanceSheetItem } from '../../types';
import PrintHeader from './PrintHeader';
import PrintFooter from './PrintFooter';

interface BuyerStatementPrintProps {
    selectedBuyers: BuyerBalanceSheetItem[];
    asOfDate: string;
}

const BuyerStatementPrintView: React.FC<BuyerStatementPrintProps> = ({ selectedBuyers, asOfDate }) => {
    const formatCurrency = (amount: number) => {
        return new Intl.NumberFormat('en-IN', {
            style: 'currency',
            currency: 'INR',
        }).format(amount);
    };

    if (!selectedBuyers || !asOfDate || selectedBuyers.length === 0) {
        return <div className="p-4">No buyers selected for printing.</div>;
    }
    
    const totalBalance = selectedBuyers.reduce((sum, b) => sum + b.balance, 0);

    return (
        <div className="a4-print-container">
            <PrintHeader reportTitle="Buyer Balance Statement" />
            <div className="report-meta">
                <p><strong>As of Date:</strong> {new Date(asOfDate).toLocaleDateString('en-GB', { year: 'numeric', month: 'long', day: 'numeric' })}</p>
            </div>
            <table className="print-table">
                <thead>
                    <tr>
                        <th>Buyer Name</th>
                        <th>Contact Number</th>
                        <th className="text-right">Balance Due</th>
                    </tr>
                </thead>
                <tbody>
                    {selectedBuyers.map(buyer => (
                        <tr key={buyer.buyerId}>
                            <td>{buyer.buyerName}</td>
                            <td>{buyer.contactNumber}</td>
                            <td className="text-right">{formatCurrency(buyer.balance)}</td>
                        </tr>
                    ))}
                </tbody>
                <tfoot>
                    <tr>
                        <td colSpan={2} className="text-right"><strong>Total Balance Due</strong></td>
                        <td className="text-right">
                            <strong>{formatCurrency(totalBalance)}</strong>
                        </td>
                    </tr>
                </tfoot>
            </table>
            <PrintFooter />
        </div>
    );
};

export default BuyerStatementPrintView;
