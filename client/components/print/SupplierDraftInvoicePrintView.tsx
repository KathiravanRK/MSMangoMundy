/**
 * Supplier Draft Invoice Print View - Used in Print Preview Modal and Print Page
 * 
 * This component is used for draft memorandum printing with thermal styling.
 * It accepts props rather than loading from URL params.
 * Updated to match the supplier invoice print setup style but with simplified content.
 */
import React from 'react';
import { Supplier, Entry, EntryItem, TransactionType, ExpenseCategory, CashFlowTransaction } from '../../types';
import { ThermalPrintStyles, ThermalHeader, ThermalFooter } from '../thermal';

interface EnrichedEntryItem extends EntryItem {
    productName: string;
}

interface EnrichedEntry extends Omit<Entry, 'items'> {
    items: EnrichedEntryItem[];
}

interface SupplierDraftInvoicePrintViewProps {
    supplier: Supplier;
    entries: EnrichedEntry[];
    transactions: CashFlowTransaction[];
}

const SupplierDraftInvoicePrintView: React.FC<SupplierDraftInvoicePrintViewProps> = ({ supplier, entries, transactions }) => {
    const formatCurrency = (amount: number) => {
        const formatted = new Intl.NumberFormat('en-IN', {
            style: 'currency',
            currency: 'INR',
            minimumFractionDigits: 0,
            maximumFractionDigits: 2,
        }).format(amount);
        return formatted.replace(/\.00$/, '');
    };

    const formatFullCurrency = (amount: number) => new Intl.NumberFormat('en-IN', {
        style: 'currency',
        currency: 'INR',
    }).format(amount);

    const formatNumber = (num: number) => new Intl.NumberFormat('en-IN').format(num);

    if (!supplier || !entries) {
        return <div className="thermal-print-container">Data missing...</div>;
    }

    const grossRaw = entries.flatMap(e => e.items).reduce((sum, item) => sum + item.subTotal, 0);
    const grossTotal = Math.round(grossRaw);

    return (
        <>
            <ThermalPrintStyles />
            <div id="thermal-print-area" className="thermal-print-container">
                <ThermalHeader />

                {/* Draft Memorandum Header Section */}
                <section className="invoice-header-details">
                    <div className="thick-line"></div>
                    

                    <div className="buyer-info">
                       
                        <div className="buyer-header">SUPPLIER:
                            <span className="buyer-name font-bold">{supplier.supplierName}</span>
                            {supplier.place && (
                                <span className="buyer-place"> ({supplier.place}) </span>
                            )}
                        </div>
                    </div>
                </section>

                {/* Items Table - Simplified Content */}
                <section className="items-section">
                    <div className="dashed-line"></div>
                    <div className="table-header professional">
                        <span className="col-sr text-center">S.No</span>
                        <span className="col-item text-left" style={{ paddingLeft: '20px' }}>ITEM</span>
                        <span className="col-qty text-right">QTY</span>
                        <span className="col-rate text-right">RATE</span>
                        <span className="col-amount text-right">AMOUNT</span>
                    </div>

                    {entries.map(entry => {
                        // List all advance transactions for this entry (for reference only)
                        const entryAdvTxns = transactions
                            .filter(t => t.type === TransactionType.Expense && t.category === ExpenseCategory.AdvancePayment && t.relatedEntryIds?.includes(entry.id));
                        const advanceForEntry = entryAdvTxns.reduce((sum, t) => sum + t.amount, 0);

                        return (
                            <div key={entry.id} className="entry-section">
                                <div className="entry-header">
                                    <span className="entry-label">Entry: {entry.serialNumber}</span>
                                    <span className="entry-date">{new Date(entry.createdAt).toLocaleDateString('en-GB')}</span>
                                </div>
                                <div className="dashed-line"></div>
                                <div className="items-body">
                                    {entry.items.filter(i => i.subTotal > 0).map((item, index) => (
                                        <div key={item.id} className="item-row">
                                            <span className="col-sr text-center">{index + 1}</span>
                                            <span className="col-item text-left">
                                                {item.productName}
                                                {item.nettWeight > 0 && (
                                                    <div className="item-sub">Nett Wt: {item.nettWeight} kg</div>
                                                )}
                                            </span>
                                            <span className="col-qty text-right">{formatNumber(item.quantity)}</span>
                                            <span className="col-rate text-right">{formatCurrency(item.ratePerQuantity || 0).replace('₹', '')}</span>
                                            <span className="col-amount text-right">{formatCurrency(Math.round(item.subTotal)).replace('₹', '')}</span>
                                        </div>
                                    ))}

                                    {entryAdvTxns.length > 0 && (
                                        <div className="advance-list p-2 bg-blue-50 rounded text-sm">
                                            <div className="font-semibold text-blue-800 mb-1">Advance Payments (for reference):</div>
                                            <ul className="ml-4">
                                                {entryAdvTxns.map((t, idx) => (
                                                    <li key={idx} className="flex justify-between text-blue-700">
                                                        <span>{new Date(t.date).toLocaleDateString('en-GB')}</span>
                                                        <span>{formatCurrency(t.amount)}</span>
                                                    </li>
                                                ))}
                                                <li className="flex justify-between font-semibold text-blue-800 border-t pt-1 mt-1">
                                                    <span>Total Advance:</span>
                                                    <span>{formatCurrency(advanceForEntry)}</span>
                                                </li>
                                            </ul>
                                        </div>
                                    )}
                                </div>

                                <div className="entry-divider"></div>
                            </div>
                        )
                    })}

                    {/* Total Quantity and Subtotal Row */}
                    <div className="total-summary-row">
                        <span className="col-sr text-center"></span>
                        <span className="col-item text-left font-bold">TOTAL</span>
                        <span className="col-qty text-right font-bold">{entries.flatMap(e => e.items).reduce((sum, item) => sum + item.quantity, 0)}</span>
                        <span className="col-rate text-right font-bold"></span>
                        <span className="col-amount text-right font-bold">{formatCurrency(grossTotal)}</span>
                    </div>
                </section>

                {/* Simple Summary - Only Gross Total and Advance */}
                <section className="summary-section">
                    <div className="dashed-line"></div>

                    <div className="amount-details">
                        <div className="amount-row">
                            <span className="amount-label">Gross Total:</span>
                            <span className="amount-value">{formatCurrency(grossTotal)}</span>
                        </div>

                        {transactions.filter(t => t.type === TransactionType.Expense && t.category === ExpenseCategory.AdvancePayment).length > 0 && (
                            <>
                                <div className="deductions-header">ADVANCE PAYMENTS</div>
                                {entries.map(entry => {
                                    // Get ALL advance transactions for this entry (sum them, don't split)
                                    const advanceForEntry = transactions
                                        .filter(t => t.type === TransactionType.Expense && t.category === ExpenseCategory.AdvancePayment && t.relatedEntryIds?.includes(entry.id))
                                        .reduce((sum, t) => sum + t.amount, 0);

                                    if (advanceForEntry > 0) {
                                        return (
                                            <div key={entry.id} className="amount-row">
                                                <span className="amount-label">Entry {entry.serialNumber}:</span>
                                                <span className="amount-value amount-negative">({formatCurrency(advanceForEntry)})</span>
                                            </div>
                                        );
                                    }
                                    return null;
                                })}
                            </>
                        )}

                       

                        <div className="amount-row amount-final">
                            <span className="amount-label font-bold">TOTAL DUE:</span>
                            <span className="amount-value font-bold">{formatCurrency(grossTotal)}</span>
                        </div>
                    </div>
                </section>

                <div className="dashed-line mt-2"></div>

                <div className="thermal-draft-note mt-3 text-center text-xs italic text-gray-500 border-t border-b border-gray-200 py-2">
                    This is a draft memorandum only.
                </div>

                <ThermalFooter message="Thank you!" showAddress={false} />
            </div>
        </>
    );
};

export default SupplierDraftInvoicePrintView;
