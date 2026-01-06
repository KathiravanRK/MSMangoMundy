import React, { useState, useEffect, useMemo } from 'react';
import { Supplier, SupplierInvoice, SupplierInvoiceStatus, PaymentMethod, ExpenseCategory } from '../../../types';
import * as api from '../../../services/api';
import { useAuth } from '../../../contexts/AuthContext';
import Modal from '../../../components/ui/Modal';
import Button from '../../../components/ui/Button';
import Input from '../../../components/ui/Input';
import Alert from '../../../components/ui/Alert';
import { formatCurrency } from '../../../utils/formatters';

interface SupplierPaymentModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  supplier: Supplier | null;
}

const SupplierPaymentModal: React.FC<SupplierPaymentModalProps> = ({ isOpen, onClose, onSuccess, supplier }) => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [unpaidInvoices, setUnpaidInvoices] = useState<SupplierInvoice[]>([]);
  const [selectedInvoiceIds, setSelectedInvoiceIds] = useState<Set<string>>(new Set());
  const [paymentAmount, setPaymentAmount] = useState<number | ''>('');
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>(PaymentMethod.Cash);
  const [paymentRef, setPaymentRef] = useState('');
  const [paymentDesc, setPaymentDesc] = useState('');

  const { user } = useAuth();

  useEffect(() => {
    if (isOpen && supplier) {
      setError(null);
      setPaymentAmount(Math.abs(supplier.outstanding));
      setPaymentMethod(PaymentMethod.Cash);
      setPaymentRef('');
      setPaymentDesc('');
      setSelectedInvoiceIds(new Set());

      api.fetchSupplierInvoicesForSupplier(supplier.id).then(invoices => {
        const unpaid = invoices.filter(inv => inv.status !== SupplierInvoiceStatus.Paid);
        setUnpaidInvoices(unpaid);
      });
    }
  }, [isOpen, supplier]);

  useEffect(() => {
    if (selectedInvoiceIds.size > 0) {
      const totalDue = unpaidInvoices
        .filter(inv => selectedInvoiceIds.has(inv.id))
        .reduce((sum, inv) => sum + (inv.nettAmount - inv.paidAmount), 0);
      setPaymentAmount(totalDue > 0 ? totalDue : '');
    }
  }, [selectedInvoiceIds, unpaidInvoices]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !supplier || !paymentAmount || paymentAmount <= 0) {
      setError("Please enter a valid amount.");
      return;
    }
    setLoading(true);
    setError(null);
    try {
      await api.addSupplierPayment({
        date: new Date(),
        category: ExpenseCategory.SupplierPayment,
        entityId: supplier.id,
        entityName: supplier.supplierName,
        amount: paymentAmount,
        method: paymentMethod,
        reference: paymentRef,
        description: paymentDesc,
        relatedInvoiceIds: Array.from(selectedInvoiceIds),
      }, user);
      onSuccess();
    } catch (err: any) {
      setError(err.message || "Failed to make payment.");
    } finally {
      setLoading(false);
    }
  };

  if (!supplier) return null;

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={`Pay Supplier: ${supplier.supplierName}`}>
      <form onSubmit={handleSubmit} className="space-y-4">
        {error && <Alert message={error} onClose={() => setError(null)} />}

        <div className="p-4 bg-secondary-light rounded-lg">
          <p className="text-sm text-muted">Amount Payable to Supplier</p>
          <p className="text-2xl font-bold text-danger-dark">{formatCurrency(Math.abs(supplier.outstanding))}</p>
        </div>

        {unpaidInvoices.length > 0 && (
          <div className="max-h-40 overflow-y-auto border rounded-lg">
            <table className="min-w-full text-sm">
              <thead className="bg-gray-50"><tr className="text-left text-xs text-muted uppercase">
                <th className="p-2 w-8"></th><th className="p-2">Invoice #</th><th className="p-2">Date</th><th className="p-2 text-right">Balance Due</th>
              </tr></thead>
              <tbody>{unpaidInvoices.map(inv => <tr key={inv.id} className="border-t">
                <td className="p-2"><input type="checkbox" checked={selectedInvoiceIds.has(inv.id)} onChange={() => setSelectedInvoiceIds(prev => { const next = new Set(prev); next.has(inv.id) ? next.delete(inv.id) : next.add(inv.id); return next; })} /></td>
                <td className="p-2 font-medium">{inv.invoiceNumber}</td><td className="p-2">{new Date(inv.createdAt).toLocaleDateString()}</td><td className="p-2 text-right">{formatCurrency(inv.nettAmount - inv.paidAmount)}</td>
              </tr>)}</tbody>
            </table>
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Input
            label="Payment Amount"
            type="number"
            value={paymentAmount}
            onChange={e => setPaymentAmount(e.target.value === '' ? '' : Number(e.target.value))}
            placeholder="Enter amount or select invoices"
            required
          />
          <div>
            <label className="block text-sm font-medium text-muted mb-1">Payment Method</label>
            <select value={paymentMethod} onChange={e => setPaymentMethod(e.target.value as PaymentMethod)} className="w-full p-2 border border-border-color rounded-md bg-surface h-[42px]" required>
              <option value={PaymentMethod.Cash}>Cash</option>
              <option value={PaymentMethod.Bank}>Bank</option>
            </select>
          </div>
        </div>
        <Input
          label="Reference / Description"
          id="paymentDesc"
          name="paymentDesc"
          value={paymentDesc}
          onChange={(e) => setPaymentDesc(e.target.value)}
          placeholder="e.g. Cleared pending dues"
        />
        <div className="flex justify-end pt-4 gap-2">
          <Button type="button" variant="secondary" onClick={onClose}>Cancel</Button>
          <Button type="submit" isLoading={loading}>Make Payment</Button>
        </div>
      </form>
    </Modal>
  );
};

export default SupplierPaymentModal;
