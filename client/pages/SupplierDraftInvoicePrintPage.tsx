import React, { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Supplier, Entry, EntryItem, CashFlowTransaction } from '../types';
import SupplierDraftInvoicePrintView from '../components/print/SupplierDraftInvoicePrintView';
import { fetchSupplier, fetchEntries, fetchCashFlowTransactions } from '../services/api';

interface EnrichedEntryItem extends EntryItem {
  productName?: string;
  unitPrice?: number;
  total?: number;
}

interface EnrichedEntry extends Omit<Entry, 'items'> {
  items: EnrichedEntryItem[];
}

const SupplierDraftInvoicePrintPage: React.FC = () => {
  const [searchParams] = useSearchParams();
  const [supplier, setSupplier] = useState<Supplier | null>(null);
  const [entries, setEntries] = useState<EnrichedEntry[]>([]);
  const [transactions, setTransactions] = useState<CashFlowTransaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const loadData = async () => {
      try {
        const supplierId = searchParams.get('supplierId');
        if (!supplierId) {
          setError('Supplier ID is required');
          setLoading(false);
          return;
        }

        // Fetch supplier details
        const supplierData = await fetchSupplier(supplierId);
        setSupplier(supplierData as any);

        // Fetch entries and filter by supplierId
        const allEntries = await fetchEntries();
        const supplierEntries = (allEntries || []).filter((e: any) => e.supplierId === supplierId);
        setEntries(supplierEntries as any);

        // Fetch cash flow transactions and filter by supplierId (if present on txn)
        const allTxns = await fetchCashFlowTransactions();
        const supplierTxns = (allTxns || []).filter((t: any) => t.supplierId === supplierId);
        setTransactions(supplierTxns as any);

        setLoading(false);
      } catch (err) {
        setError('Failed to load supplier data');
        setLoading(false);
      }
    };

    loadData();
  }, [searchParams]);

  if (loading) {
    return <div className="p-8">Loading...</div>;
  }

  if (error || !supplier) {
    return <div className="p-8 text-red-600">{error || 'Failed to load supplier'}</div>;
  }

  return (
    <div className="w-full">
      <SupplierDraftInvoicePrintView
        supplier={supplier}
        entries={entries}
        transactions={transactions}
      />
    </div>
  );
};

export default SupplierDraftInvoicePrintPage;
