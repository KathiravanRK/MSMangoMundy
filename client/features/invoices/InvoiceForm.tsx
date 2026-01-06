import React from 'react';
import { Invoice, PaymentMethod, DraftItem, Feature } from '../../types';
import { ICONS } from '../../constants';
import { formatCurrency } from '../../utils/formatters';
import { usePermissions } from '../../contexts/AuthContext';
import Button from '../../components/ui/Button';

export interface PaymentFormEntry {
    id: string;
    amount: number | '';
    discount: number | '';
    method: PaymentMethod;
    reference: string;
}

interface InvoiceFormProps {
    editingInvoice: Invoice | null;
    confirmedItems: DraftItem[];
    wages: number | '';
    adjustments: number | '';
    invoiceDate: string;
    paymentEntries: PaymentFormEntry[];
    subTotal: number;
    totalQuantity: number;
    nettAmount: number;
    balanceDue: number;
    isWagesInputVisible: boolean;
    isAdjustmentsInputVisible: boolean;
    hasExcludedWagesItems: boolean;
    loading: boolean;
    getProductName: (id: string) => string;
    getSupplierName: (id: string) => string;
    setWages: (val: number | '') => void;
    setAdjustments: (val: number | '') => void;
    setInvoiceDate: (val: string) => void;
    setIsWagesInputVisible: (val: boolean) => void;
    setIsAdjustmentsInputVisible: (val: boolean) => void;
    resetInvoiceForm: () => void;
    handleAddPaymentEntry: () => void;
    handleRemovePaymentEntry: (id: string) => void;
    handlePaymentEntryChange: (id: string, field: keyof PaymentFormEntry, value: any) => void;
    handleSaveInvoice: () => void;
}

const InvoiceForm: React.FC<InvoiceFormProps> = ({
    editingInvoice, confirmedItems, wages, adjustments,
    invoiceDate, paymentEntries, subTotal, totalQuantity, nettAmount, balanceDue,
    isWagesInputVisible, isAdjustmentsInputVisible, hasExcludedWagesItems, loading,
    getProductName, getSupplierName, setWages, setAdjustments,
    setInvoiceDate, setIsWagesInputVisible, setIsAdjustmentsInputVisible, resetInvoiceForm,
    handleAddPaymentEntry, handleRemovePaymentEntry, handlePaymentEntryChange, handleSaveInvoice
}) => {
    const { canCreate } = usePermissions();

    return (
        <div className="space-y-4 animate-scaleIn">
            <div className="flex justify-between items-center mb-4">
                <h2 className="text-2xl font-bold text-on-surface">
                    {editingInvoice ? `Editing Invoice #${editingInvoice.invoiceNumber}` : "Create New Invoice"}
                </h2>
                <div className="flex items-center gap-4">
                    <div className="flex items-center gap-2">
                        <label htmlFor="invoiceDate" className="text-sm font-medium text-muted">Date:</label>
                        <input
                            type="date"
                            id="invoiceDate"
                            value={invoiceDate}
                            onChange={(e) => setInvoiceDate(e.target.value)}
                            className="p-1.5 border border-border-color rounded-lg bg-surface text-sm focus:ring-2 focus:ring-primary/20 outline-none"
                        />
                    </div>
                    <button onClick={resetInvoiceForm} className="text-muted hover:text-dark transition-colors">{ICONS.close}</button>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
                <div className="lg:col-span-3 space-y-3 max-h-[60vh] overflow-y-auto pr-3 scrollbar-thin">
                    {confirmedItems.map(item => (
                        <div key={item.id} className="p-4 bg-secondary-light/40 backdrop-blur-sm border border-secondary-light rounded-xl grid grid-cols-12 gap-3 text-sm items-center hover:bg-secondary-light/60 transition-colors">
                            <div className="col-span-12 sm:col-span-5">
                                <p className="font-bold text-dark">{getProductName(item.productId)}</p>
                                <p className="text-xs text-muted">Entry: {item.entrySerialNumber} | Supplier: {getSupplierName(item.supplierId)}</p>
                            </div>
                            <div className="col-span-6 sm:col-span-2 text-left sm:text-right">
                                <span className="font-medium">{item.quantity}</span> Nos
                                {item.nettWeight > 0 && <div className="text-xs text-muted">{item.nettWeight} Kg</div>}
                            </div>
                            <div className="col-span-6 sm:col-span-2 text-left sm:text-right font-medium">
                                {formatCurrency(item.ratePerQuantity || 0)}
                            </div>
                            <div className="col-span-12 sm:col-span-3 text-right font-extrabold text-primary">
                                {formatCurrency(item.subTotal)}
                            </div>
                        </div>
                    ))}
                </div>

                <div className="lg:col-span-2 bg-surface p-6 rounded-2xl shadow-glow-sm border border-border-color space-y-5 flex flex-col glass">
                    <h3 className="font-bold text-lg border-b pb-2">Invoice Summary</h3>
                    <div className="flex-grow space-y-4">
                        <div className="flex justify-between items-center">
                            <span className="text-sm text-muted font-medium">Sub-Total</span>
                            <span className="font-bold">{formatCurrency(subTotal)}</span>
                        </div>

                        {(isWagesInputVisible || (wages !== '' && wages !== 0)) ? (
                            <div className="flex flex-col">
                                <div className="flex justify-between items-center group">
                                    <label htmlFor="wages" className="text-sm text-muted font-medium">Wages</label>
                                    <input
                                        type="number"
                                        id="wages"
                                        value={wages}
                                        onChange={e => setWages(e.target.value === '' ? '' : Number(e.target.value))}
                                        className="w-28 p-2 border border-border-color rounded-lg text-right bg-white focus:ring-2 focus:ring-primary/20 outline-none"
                                    />
                                </div>
                                {hasExcludedWagesItems && <p className="text-[10px] text-warning text-right mt-1">⚠️ Heavy items excluded from auto-calc</p>}
                            </div>
                        ) : (
                            <button type="button" onClick={() => setIsWagesInputVisible(true)} className="text-sm font-semibold text-primary hover:text-primary-hover flex items-center gap-1">
                                {ICONS.plus} Add Wages
                            </button>
                        )}

                        {(isAdjustmentsInputVisible || (adjustments !== '' && adjustments !== 0)) ? (
                            <div className="flex justify-between items-center">
                                <label htmlFor="adjustments" className="text-sm text-muted font-medium">Adjustments</label>
                                <input
                                    type="number"
                                    id="adjustments"
                                    value={adjustments}
                                    onChange={e => setAdjustments(e.target.value === '' ? '' : Number(e.target.value))}
                                    className="w-28 p-2 border border-border-color rounded-lg text-right bg-white focus:ring-2 focus:ring-primary/20 outline-none"
                                />
                            </div>
                        ) : (
                            <button type="button" onClick={() => setIsAdjustmentsInputVisible(true)} className="text-sm font-semibold text-primary hover:text-primary-hover flex items-center gap-1">
                                {ICONS.plus} Add Adjustments
                            </button>
                        )}

                        {/* Invoice-level discount removed — handled via payments/ cashflow only */}

                        <div className="border-t border-dashed border-border-color my-4"></div>

                        <div className="flex justify-between items-center">
                            <span className="text-base font-bold text-dark">Nett Payable</span>
                            <span className="text-xl font-black text-primary">{formatCurrency(nettAmount)}</span>
                        </div>

                        {editingInvoice && (
                            <div className="flex justify-between items-center text-sm p-2 bg-success/5 rounded-lg border border-success/10">
                                <span className="text-muted font-medium">Previously Paid</span>
                                <span className="font-bold text-success">{formatCurrency(editingInvoice.paidAmount)}</span>
                            </div>
                        )}

                        <div className="space-y-3 pt-4 border-t border-border-color">
                            <div className="flex justify-between items-center">
                                <h4 className="font-bold text-sm text-dark">Record Payments</h4>
                                {canCreate(Feature.CashFlow, 'add_income') && (
                                    <button onClick={handleAddPaymentEntry} className="text-xs font-bold text-primary hover:underline flex items-center gap-1">
                                        {ICONS.plus} Add
                                    </button>
                                )}
                            </div>

                            <div className="space-y-2 max-h-40 overflow-y-auto pr-1 scrollbar-thin">
                                {paymentEntries.map(p => (
                                    <div key={p.id} className="p-2 bg-primary/5 rounded-xl border border-primary/10 grid grid-cols-12 gap-2 items-center animate-slideInRight">
                                        {/* First row: Amount | Method */}
                                        <input type="number" placeholder="Amt" value={p.amount} onChange={e => handlePaymentEntryChange(p.id, 'amount', e.target.value === '' ? '' : Number(e.target.value))} className="col-span-7 md:col-span-8 p-1.5 border border-border-color rounded-lg bg-white text-xs font-bold" title="Payment Amount" />
                                        <select value={p.method} onChange={e => handlePaymentEntryChange(p.id, 'method', e.target.value as PaymentMethod)} className="col-span-5 md:col-span-4 p-1.5 border border-border-color rounded-lg bg-white text-[10px] font-semibold appearance-none">
                                            <option value={PaymentMethod.Cash}>Cash</option>
                                            <option value={PaymentMethod.Bank}>Bank</option>
                                        </select>

                                        {/* Second row: Discount | Reference | Remove */}
                                        <input type="number" placeholder="Disc" value={(p as any).discount} onChange={e => handlePaymentEntryChange(p.id, 'discount', e.target.value === '' ? '' : Number(e.target.value))} className="col-span-6 p-1.5 border border-border-color rounded-lg bg-white text-xs text-danger font-medium" title="Payment Discount" />
                                        <input type="text" placeholder="Ref" value={p.reference} onChange={e => handlePaymentEntryChange(p.id, 'reference', e.target.value)} className="col-span-5 p-1.5 border border-border-color rounded-lg bg-white text-xs" />
                                        <button type="button" onClick={() => handleRemovePaymentEntry(p.id)} className="col-span-1 text-danger p-1 hover:bg-danger/10 rounded-full flex justify-center transition-colors">
                                            {React.cloneElement(ICONS.trash, { className: "h-3.5 w-3.5" })}
                                        </button>
                                    </div>
                                ))}
                                {paymentEntries.length === 0 && (
                                    <p className="text-[10px] text-muted italic text-center py-2">No payments recorded in this form.</p>
                                )}
                            </div>
                        </div>

                        <div className="flex justify-between items-center font-black text-xl border-t border-double border-success/30 pt-4 mt-2">
                            <span className="text-success">Balance Due</span>
                            <span className={balanceDue > 0 ? 'text-danger' : 'text-success'}>
                                {formatCurrency(balanceDue)}
                            </span>
                        </div>
                    </div>

                    <div className="pt-4 flex gap-3">
                        <Button variant="secondary" className="flex-1" onClick={resetInvoiceForm}>Cancel</Button>
                        <Button
                            variant="success"
                            className="flex-1 shadow-glow-success"
                            onClick={handleSaveInvoice}
                            disabled={loading}
                            isLoading={loading}
                        >
                            {editingInvoice ? 'Update Invoice' : 'Save Invoice'}
                        </Button>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default InvoiceForm;
