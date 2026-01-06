/**
 * Supplier Invoice Print View - Used in Print Preview Modal
 * 
 * This component is used by SupplierInvoicesManager for print preview with thermal styling.
 * It accepts props rather than loading from URL params.
 */
import React from 'react';
import { SupplierInvoice, Supplier, Entry, Product, TransactionType, ExpenseCategory, CashFlowTransaction } from '../../types';
import { ThermalPrintStyles, ThermalHeader, ThermalFooter } from '../thermal';

interface SupplierInvoicePrintViewProps {
  invoice: SupplierInvoice;
  supplier: Supplier;
  entries: Entry[];
  products: Product[];
  transactions: CashFlowTransaction[];
}

const SupplierInvoicePrintView: React.FC<SupplierInvoicePrintViewProps> = ({ invoice, supplier, entries, products, transactions }) => {
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

  const getProductName = (item: any) => item.productName || products.find(p => p.id === item.productId)?.productName || '...';
  const formatNumber = (num: number) => new Intl.NumberFormat('en-IN').format(num);

  if (!invoice || !supplier) {
    return <div className="thermal-print-container">Loading...</div>;
  }

  // Recompute commission and nett for display to ensure rounding matches frontend
  const displayedCommission = Math.ceil((invoice.grossTotal * (Number(invoice.commissionRate) || 0)) / 100);
  const displayedNett = Math.round(invoice.grossTotal - displayedCommission - (invoice.wages || 0) + (invoice.adjustments || 0));
  const otherPayments = invoice.paidAmount - invoice.advancePaid;

  return (
    <>
      <ThermalPrintStyles />
      <div id="thermal-print-area" className="thermal-print-container">
        <ThermalHeader />

        {/* Enhanced Supplier Invoice Header Section */}
        <section className="invoice-header-details">
          <div className="thick-line"></div>
          <div className="invoice-meta">
            <div className="meta-row">
              <span className="meta-label">No:</span>
              <span className="meta-value font-bold">{invoice.invoiceNumber}</span>
              <span className="meta-label">Date:</span>
              <span className="meta-value">{new Date(invoice.createdAt).toLocaleDateString('en-GB')}</span>
            </div>

          </div>

          <div className="buyer-info">
            <div className="dashed-line"></div>
            <div className="buyer-header">SUPPLIER:
              <span className="buyer-name font-bold">{supplier.supplierName}</span>
              {supplier.place && (
                <span className="buyer-place"> ({supplier.place}) </span>
              )}
            </div>
          </div>
        </section>

        {/* Enhanced Items Table with More Details */}
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
            // Get ALL advance transactions for this entry (sum them, don't split)
            const advanceForEntry = transactions
              .filter(t => t.type === TransactionType.Expense && t.category === ExpenseCategory.AdvancePayment && t.relatedEntryIds?.includes(entry.id))
              .reduce((sum, t) => sum + t.amount, 0);

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
                        {getProductName(item)}
                        {item.nettWeight > 0 && (
                          <div className="item-sub">Nett Wt: {item.nettWeight} kg</div>
                        )}
                      </span>
                      <span className="col-qty text-right">{formatNumber(item.quantity)}</span>
                      <span className="col-rate text-right">{formatCurrency(item.ratePerQuantity || 0).replace('₹', '')}</span>
                      <span className="col-amount text-right">{formatCurrency(Math.round(item.subTotal)).replace('₹', '')}</span>
                    </div>
                  ))}

                  {advanceForEntry > 0 && (
                    <div className="advance-row">
                      <span className="col-sr text-center"></span>
                      <span className="col-item text-left">Advance Paid</span>
                      <span className="col-qty text-right"></span>
                      <span className="col-rate text-right"></span>
                      <span className="col-amount text-right advance-amount">({formatCurrency(advanceForEntry).replace('₹', '')})</span>
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
            <span className="col-qty text-right font-bold">{invoice.totalQuantities}</span>
            <span className="col-rate text-right font-bold"></span>
            <span className="col-amount text-right font-bold">{formatCurrency(invoice.grossTotal)}</span>
          </div>
        </section>

        {/* Enhanced Summary Section */}
        <section className="summary-section">
        
          <div className="dashed-line"></div>

          <div className="amount-details">
            <div className="amount-row">
              <span className="amount-label">Gross Total:</span>
              <span className="amount-value">{formatCurrency(invoice.grossTotal)}</span>
            </div>

            <div className="deductions-header">DEDUCTIONS</div>

            <div className="amount-row">
              <span className="amount-label">Commission ({invoice.commissionRate}%):</span>
              <span className="amount-value amount-negative">({formatCurrency(displayedCommission)})</span>
            </div>

            {invoice.wages !== 0 && (
              <div className="amount-row">
                <span className="amount-label">Wages:</span>
                <span className="amount-value amount-negative">({formatCurrency(invoice.wages)})</span>
              </div>
            )}

            {invoice.adjustments !== 0 && (
              <div className="amount-row">
                <span className="amount-label">Adjustment:</span>
                <span className="amount-value">{formatCurrency(invoice.adjustments)}</span>
              </div>
            )}

           

            <div className="amount-row amount-net">
              <span className="amount-label font-bold">Nett Payable:</span>
              <span className="amount-value font-bold">{formatCurrency(displayedNett)}</span>
            </div>

            {invoice.advancePaid > 0 && (
              <>
                <div className="deductions-header">ADVANCE DEDUCTIONS</div>
                {entries.map(entry => {
                  // Get ALL advance transactions for this entry (sum them)
                  const entryAdvance = transactions
                    .filter(t => t.type === TransactionType.Expense && t.category === ExpenseCategory.AdvancePayment && t.relatedEntryIds?.includes(entry.id))
                    .reduce((sum, t) => sum + t.amount, 0);

                  if (entryAdvance > 0) {
                    return (
                      <div key={entry.id} className="amount-row">
                        <span className="amount-label">Entry {entry.serialNumber}:</span>
                        <span className="amount-value amount-negative">({formatCurrency(entryAdvance)})</span>
                      </div>
                    );
                  }
                  return null;
                })}
                <div className="amount-row">
                  <span className="amount-label font-bold">Total Advance:</span>
                  <span className="amount-value amount-negative font-bold">({formatCurrency(invoice.advancePaid)})</span>
                </div>
              </>
            )}

            {otherPayments > 0 && (
              <div className="amount-row">
                <span className="amount-label">Other Payments:</span>
                <span className="amount-value amount-negative font-bold">({formatCurrency(otherPayments)})</span>
              </div>
            )}

           

            <div className="amount-row amount-final">
              <span className="amount-label font-bold">BALANCE DUE:</span>
              <span className="amount-value font-bold">{formatCurrency(displayedNett - invoice.paidAmount)}</span>
            </div>
          </div>
        </section>

        <div className="dashed-line mt-2"></div>

        <ThermalFooter message="Thank you!" showAddress={false} />
      </div>
    </>
  );
};

export default SupplierInvoicePrintView;
