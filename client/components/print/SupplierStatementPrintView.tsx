import React from 'react';
import { SupplierBalanceSheetItem } from '../../types';
import { formatCurrency } from '../../utils/formatters';
import { ThermalPrintStyles, ThermalHeader, ThermalFooter } from '../thermal';

interface SupplierStatementPrintProps {
    selectedSuppliers: SupplierBalanceSheetItem[];
    asOfDate: string;
}

const SupplierStatementPrintView: React.FC<SupplierStatementPrintProps> = ({ selectedSuppliers, asOfDate }) => {

    if (!selectedSuppliers || !asOfDate) {
        return <div>Data missing for statement print.</div>
    }

    return (
        <div className="statement-print-wrapper">
            <ThermalPrintStyles />
            {selectedSuppliers.map(supplier => (
                <div key={supplier.supplierId} className="thermal-print-container statement-slip mb-4">
                    <ThermalHeader />
                    <h2 className="text-md font-bold text-center mt-1">Statement of Account</h2>
                    <div className="dashed-line"></div>

                    <section className="invoice-details">
                        <p><strong>Date:</strong> {new Date().toLocaleDateString('en-GB')}</p>
                        <p><strong>As of:</strong> {new Date(asOfDate).toLocaleDateString('en-GB')}</p>
                        <p><strong>Supplier:</strong> {supplier.supplierName}</p>
                    </section>

                    <div className="dashed-line"></div>

                    <div className="text-center py-4">
                        <p className="text-sm uppercase text-gray-600 font-bold mb-1">Outstanding Balance</p>
                        <h1 className="text-2xl font-bold" style={{ color: supplier.balance < 0 ? '#d32f2f' : '#2e7d32' }}>
                            {formatCurrency(Math.abs(supplier.balance))}
                            <span className="text-sm ml-1">{supplier.balance < 0 ? 'Payable' : 'Receivable'}</span>
                        </h1>
                    </div>

                    <div className="dashed-line"></div>
                    <ThermalFooter message="Thank you for your business!" showAddress={false} />
                </div>
            ))}
        </div>
    );
};

export default SupplierStatementPrintView;
