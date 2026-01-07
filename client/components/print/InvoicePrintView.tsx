/**
 * Buyer Invoice Print View - Used in Print Preview Modal
 * 
 * This component is used by InvoicesManager for print preview with thermal styling.
 * It accepts props (invoice and buyer) rather than loading from URL params.
 */
import React from 'react';
import { Invoice, Buyer } from '../../types';
import { ThermalPrintStyles, ThermalHeader, ThermalFooter } from '../thermal';

interface InvoicePrintViewProps {
  invoice: Invoice;
  buyer: Buyer;
}

const InvoicePrintView: React.FC<InvoicePrintViewProps> = ({ invoice, buyer }) => {
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

  if (!invoice || !buyer) {
    return <div className="thermal-print-container">Loading...</div>;
  }

  return (
    <>
      <ThermalPrintStyles />
      <div id="thermal-print-area" className="thermal-print-container">
        <ThermalHeader />

        {/* <div className="dashed-line"></div> */}

        {/* Enhanced Invoice Header Section */}
        <section className="invoice-header-details">
          <div className="thick-line"></div>
          <div className="invoice-meta">
            <div className="meta-row">
              <span className="meta-label">Invoice No:</span>
              <span className="meta-value font-bold">{invoice.invoiceNumber}</span>
            </div>
            <div className="meta-row">
              <span className="meta-label">Date:</span>
              <span className="meta-value">{new Date(invoice.createdAt).toLocaleDateString('en-GB')}</span>
            </div>

          </div>

          <div className="buyer-info">
            {/* <div className="dashed-line"></div> */}
            <div className="buyer-header">BILL TO: {buyer.displayName && <span className="buyer-name font-bold">{buyer.displayName || buyer.buyerName}</span>}
              {buyer.place && (
                <span className="buyer-place"> ({buyer.place})</span>
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
          {/* <div className="dashed-line"></div> */}

          <div className="items-body">
            {invoice.items.map((item, index) => (
              <div key={item.id} className="item-row">
                <span className="col-sr text-center">{index + 1}</span>
                <span className="col-item text-left">
                  {item.productName}
                  {item.nettWeight > 0 && (
                    <div className="item-sub">Nett Wt: {item.nettWeight} kg</div>
                  )}
                </span>
                <span className="col-qty text-right">{item.quantity}</span>
                <span className="col-rate text-right">{formatCurrency(item.ratePerQuantity).replace('₹', '')}</span>
                <span className="col-amount text-right">{formatCurrency(item.subTotal).replace('₹', '')}</span>
              </div>
            ))}
          </div>

          {/* Total Quantity and Subtotal Row */}
          <div className="total-summary-row">
            <span className="col-sr text-center"></span>
            <span className="col-item text-left font-bold">TOTAL</span>
            <span className="col-qty text-right font-bold">{invoice.totalQuantities}</span>
            <span className="col-rate text-right font-bold"></span>
            <span className="col-amount text-right font-bold">{formatFullCurrency(invoice.totalAmount)}</span>
          </div>
        </section>

        {/* Enhanced Summary Section */}
        <section className="summary-section">

          <div className="dashed-line"></div>

          <div className="amount-details">


            {invoice.wages !== 0 && (
              <div className="amount-row">
                <span className="amount-label">Wages:</span>
                <span className="amount-value amount-negative">({formatFullCurrency(invoice.wages)})</span>
              </div>
            )}

            {invoice.adjustments !== 0 && (
              <div className="amount-row">
                <span className="amount-label">Adjustment:</span>
                <span className="amount-value">{formatFullCurrency(invoice.adjustments)}</span>
              </div>
            )}

            {/* <div className="dashed-line"></div> */}

            <div className="amount-row amount-net">
              <span className="amount-label font-bold">Gross Amount:</span>
              <span className="amount-value font-bold">{formatFullCurrency(invoice.totalAmount + (invoice.wages || 0) + (invoice.adjustments || 0))}</span>
            </div>

            {invoice.discount > 0 && (
              <div className="amount-row amount-discount">
                <span className="amount-label">Discount:</span>
                <span className="amount-value amount-negative font-bold">({formatFullCurrency(invoice.discount)})</span>
              </div>
            )}

            {/* <div className="dashed-line"></div> */}

            <div className="amount-row amount-final">
              <span className="amount-label font-bold">FINAL AMOUNT:</span>
              <span className="amount-value font-bold">{formatFullCurrency(invoice.nettAmount)}</span>
            </div>
          </div>

          {invoice.paidAmount > 0 && (
            <>
              {/* <div className="dashed-line"></div> */}
              <div className="payment-details">
                <div className="payment-row">
                  <span className="payment-label">Payment Received:</span>
                  <span className="payment-value">{formatFullCurrency(invoice.paidAmount)}</span>
                </div>
                <div className="payment-row payment-balance">
                  <span className="payment-label font-bold">BALANCE DUE:</span>
                  <span className="payment-value payment-amount">{formatFullCurrency(invoice.nettAmount - invoice.paidAmount)}</span>
                </div>
              </div>
            </>
          )}
        </section>

        {/* Additional Invoice Information */}
        <section className="invoice-footer-info">
          <div className="dashed-line"></div>



          <div className="signature-area">

            <div className="signature-text">Authorized Signature</div>
          </div>
        </section>

        <div className="dashed-line mt-2"></div>

        <ThermalFooter showAddress={true} />
      </div>
    </>
  );
};

export default InvoicePrintView;
