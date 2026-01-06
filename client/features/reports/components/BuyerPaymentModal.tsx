import React, { useState, useEffect } from 'react';
import { Buyer, Invoice, PaymentMethod, TransactionType } from '../../../types';
import * as api from '../../../services/api';
import { useAuth } from '../../../contexts/AuthContext';
import Modal from '../../../components/ui/Modal';
import Button from '../../../components/ui/Button';
import Input from '../../../components/ui/Input';
import Alert from '../../../components/ui/Alert';
import { formatCurrency } from '../../../utils/formatters';

interface BuyerPaymentModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSuccess: () => void;
    buyer: Buyer | null;
}

const BuyerPaymentModal: React.FC<BuyerPaymentModalProps> = ({ isOpen, onClose, onSuccess, buyer }) => {
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    // Although the CashFlowManager Income form doesn't explicitly link to invoices yet in the UI, 
    // users might want to see outstanding invoices here to decide the amount.
    // For now, we'll keep it simple and just show the outstanding amount, similar to the simplified Income form,
    // OR we can fetch invoices to show them as reference. Let's fetch invoices for context.
    const [unpaidInvoices, setUnpaidInvoices] = useState<Invoice[]>([]);

    const [paymentAmount, setPaymentAmount] = useState<number | ''>('');
    const [paymentDiscount, setPaymentDiscount] = useState<number | ''>('');
    const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>(PaymentMethod.Cash);
    const [paymentRef, setPaymentRef] = useState('');
    const [paymentDesc, setPaymentDesc] = useState('');

    const { user } = useAuth();

    useEffect(() => {
        if (isOpen && buyer) {
            setError(null);
            setPaymentAmount(buyer.outstanding > 0 ? buyer.outstanding : '');
            setPaymentDiscount('');
            setPaymentMethod(PaymentMethod.Cash);
            setPaymentRef('');
            setPaymentDesc('');

            api.fetchInvoicesForBuyer(buyer.id).then(invoices => {
                // Filter for invoices with balance > 0
                // Calculate balance locally if not provided by API
                const unpaid = invoices.filter(inv => {
                    const balance = inv.nettAmount - inv.paidAmount; // Simplified check
                    return balance > 0.01; // tolerance
                });
                unpaid.sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
                setUnpaidInvoices(unpaid);
            });
        }
    }, [isOpen, buyer]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!user || !buyer || (!paymentAmount && !paymentDiscount)) {
            setError("Please enter a valid amount or discount.");
            return;
        }
        setLoading(true);
        setError(null);
        try {
            await api.addIncome({
                date: new Date(),
                entityId: buyer.id,
                entityName: buyer.buyerName,
                amount: Number(paymentAmount) || 0,
                discount: Number(paymentDiscount) || 0,
                method: paymentMethod,
                reference: paymentRef,
                description: paymentDesc,
                // relatedInvoiceIds: ... // The backend addIncome doesn't automatically allocate to invoices yet without extra logic, 
                // but it does update the buyer balance. 
            }, user);
            onSuccess();
        } catch (err: any) {
            setError(err.message || "Failed to record payment.");
        } finally {
            setLoading(false);
        }
    };

    if (!buyer) return null;

    return (
        <Modal isOpen={isOpen} onClose={onClose} title={`Receive Payment: ${buyer.buyerName}`}>
            <form onSubmit={handleSubmit} className="space-y-4">
                {error && <Alert message={error} onClose={() => setError(null)} />}

                <div className="p-4 bg-secondary-light rounded-lg">
                    <p className="text-sm text-muted">Current Outstanding Balance</p>
                    <p className={`text-2xl font-bold ${buyer.outstanding > 0 ? 'text-danger-dark' : 'text-success-dark'}`}>
                        {formatCurrency(buyer.outstanding)}
                    </p>
                </div>

                {unpaidInvoices.length > 0 && (
                    <div className="max-h-40 overflow-y-auto border rounded-lg">
                        <table className="min-w-full text-sm">
                            <thead className="bg-gray-50"><tr className="text-left text-xs text-muted uppercase">
                                <th className="p-2">Invoice #</th><th className="p-2">Date</th><th className="p-2 text-right">Balance Due</th>
                            </tr></thead>
                            <tbody>{unpaidInvoices.map(inv => {
                                const balance = inv.nettAmount - inv.paidAmount;
                                return (
                                    <tr key={inv.id} className="border-t">
                                        <td className="p-2 font-medium">{inv.invoiceNumber}</td>
                                        <td className="p-2">{new Date(inv.createdAt).toLocaleDateString()}</td>
                                        <td className="p-2 text-right">{formatCurrency(balance)}</td>
                                    </tr>
                                );
                            })}</tbody>
                        </table>
                    </div>
                )}

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <Input
                        label="Amount Received"
                        type="number"
                        value={paymentAmount}
                        onChange={e => setPaymentAmount(e.target.value === '' ? '' : Number(e.target.value))}
                        placeholder="Enter amount"
                    />
                    <Input
                        label="Discount Given"
                        type="number"
                        value={paymentDiscount}
                        onChange={e => setPaymentDiscount(e.target.value === '' ? '' : Number(e.target.value))}
                        placeholder="Optional discount"
                    />
                </div>

                <div>
                    <label className="block text-sm font-medium text-muted mb-1">Payment Method</label>
                    <select value={paymentMethod} onChange={e => setPaymentMethod(e.target.value as PaymentMethod)} className="w-full p-2 border border-border-color rounded-md bg-surface h-[42px]" required>
                        <option value={PaymentMethod.Cash}>Cash</option>
                        <option value={PaymentMethod.Bank}>Bank</option>
                    </select>
                </div>

                <Input
                    label="Reference / Description"
                    id="paymentDesc"
                    name="paymentDesc"
                    value={paymentDesc}
                    onChange={(e) => setPaymentDesc(e.target.value)}
                    placeholder="e.g. Received via UPI"
                />
                <div className="flex justify-end pt-4 gap-2">
                    <Button type="button" variant="secondary" onClick={onClose}>Cancel</Button>
                    <Button type="submit" isLoading={loading}>Record Receipt</Button>
                </div>
            </form>
        </Modal>
    );
};

export default BuyerPaymentModal;
