import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useNavigate, useLocation, Link } from 'react-router-dom';
import * as api from '../../services/api';
import { Supplier, Entry, EntryItem, SupplierInvoice, SupplierInvoiceItem, SupplierInvoiceStatus, Product, PaymentMethod, ExpenseCategory, CashFlowTransaction, TransactionType, EntryStatus, Feature, SupplierInvoicesAnalyticsData } from '../../types';
import { ICONS } from '../../constants';
import Card from '../../components/ui/Card';
import Modal from '../../components/ui/Modal';
import SearchableSelect from '../../components/ui/SearchableSelect';
import { useAuth, usePermissions } from '../../contexts/AuthContext';
import SupplierInvoicesAnalytics from './SupplierInvoicesAnalytics';
import Spinner from '../../components/ui/Spinner';
import { SortableTable, Column } from '../../components/ui/SortableTable';
import { formatDate, formatCurrency } from '../../utils/formatters';
import StatusChip from '../../components/ui/StatusChip';
import { useLocalStorage } from '../../hooks/useLocalStorage';
import usePrintPreview from '../../hooks/usePrintPreview';
import SupplierInvoicePrintView from '../../components/print/SupplierInvoicePrintView';
import SupplierDraftInvoicePrintView from '../../components/print/SupplierDraftInvoicePrintView';
import Button from '../../components/ui/Button';

interface PaymentFormEntry {
    id: string;
    amount: number | '';
    method: PaymentMethod;
    reference: string;
}

// Helper function to aggregate items for the invoice
const aggregateItems = (items: (EntryItem & { productName: string })[]): SupplierInvoiceItem[] => {
    const itemMap = new Map<string, SupplierInvoiceItem>();

    items.forEach(item => {
        const key = `${item.productId}-${item.ratePerQuantity}`;
        const productName = item.productName || 'Unknown Product';

        if (itemMap.has(key)) {
            const existing = itemMap.get(key)!;
            existing.quantity += item.quantity;
            existing.grossWeight = (existing.grossWeight || 0) + (item.grossWeight || 0);
            existing.shuteWeight = (existing.shuteWeight || 0) + (item.shuteWeight || 0);
            existing.nettWeight += item.nettWeight;
            existing.subTotal += item.subTotal;
        } else {
            itemMap.set(key, {
                productId: item.productId,
                productName,
                quantity: item.quantity,
                grossWeight: item.grossWeight || 0,
                shuteWeight: item.shuteWeight || 0,
                nettWeight: item.nettWeight,
                ratePerQuantity: item.ratePerQuantity || 0,
                subTotal: item.subTotal
            });
        }
    });

    return Array.from(itemMap.values());
};


const SupplierInvoicesManager: React.FC = () => {
    const { user } = useAuth();
    const { canView, canDelete } = usePermissions();
    const { openPrintPreview, PrintPreview } = usePrintPreview();


    // Analytics Data
    const [analyticsData, setAnalyticsData] = useState<SupplierInvoicesAnalyticsData | null>(null);
    const [analyticsLoading, setAnalyticsLoading] = useState(true);

    const [suppliers, setSuppliers] = useState<Supplier[]>([]);
    const [products, setProducts] = useState<Product[]>([]);
    const [allTransactions, setAllTransactions] = useState<CashFlowTransaction[]>([]);
    const [allEntries, setAllEntries] = useState<Entry[]>([]);
    const [selectedSupplier, setSelectedSupplier] = useState<Supplier | null>(null);
    const [supplierInvoices, setSupplierInvoices] = useState<SupplierInvoice[]>([]);
    const [loading, setLoading] = useState<{ page: boolean, data: boolean }>({ page: true, data: false });
    const [error, setError] = useState<string | null>(null);

    // Form state
    // itemsForInvoice acts as the "confirmed items" for the invoice form
    // If itemsForInvoice.length > 0 or editingInvoice is not null, the form is visible.

    // New invoice form state
    const [selectedEntryIds, setSelectedEntryIds] = useState<Set<string>>(new Set());
    const [itemsForInvoice, setItemsForInvoice] = useState<(EntryItem & { productName: string; entrySerialNumber?: string })[]>([]);
    const [commissionRate, setCommissionRate] = useState<number | ''>(10); // Default 10%
    const [wages, setWages] = useState<number | ''>(0);
    const [adjustments, setAdjustments] = useState<number | ''>(0);
    const [paymentEntries, setPaymentEntries] = useState<PaymentFormEntry[]>([]);
    const [editingInvoice, setEditingInvoice] = useState<SupplierInvoice | null>(null);
    const [draftedEntryIds, setDraftedEntryIds] = useState<Set<string>>(new Set());

    // Invoice Date
    const [invoiceDate, setInvoiceDate] = useState<string>(new Date().toISOString().split('T')[0]);

    // Input visibility state
    const [isWagesInputVisible, setIsWagesInputVisible] = useState(false);
    const [isAdjustmentsInputVisible, setIsAdjustmentsInputVisible] = useState(false);

    // Draft Memorandum Mode State
    const [isDraftMode, setIsDraftMode] = useState(false);
    const [draftAdvancePayments, setDraftAdvancePayments] = useState<PaymentFormEntry[]>([]);
    const [hasExcludedWagesItems, setHasExcludedWagesItems] = useState(false);



    // Detail modal state
    const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
    const [selectedInvoiceForDetail, setSelectedInvoiceForDetail] = useState<SupplierInvoice | null>(null);

    const navigate = useNavigate();
    const location = useLocation();

    // Auto-selection state
    const [autoAction, setAutoAction] = useState<{ type: 'draft' | 'view'; supplierId: string; targetId: string } | null>(null);
    const [isPreparingDraft, setIsPreparingDraft] = useState(false);

    useEffect(() => {
        if (!canView(Feature.SupplierInvoices)) {
            navigate('/unauthorized', { replace: true });
        }
    }, [canView, navigate]);

    useEffect(() => {
        const storedDraftedIds = sessionStorage.getItem('draftedEntryIds');
        if (storedDraftedIds) {
            setDraftedEntryIds(new Set(JSON.parse(storedDraftedIds)));
        }
    }, []);

    const loadTransactions = useCallback(async () => {
        try {
            const cashFlowData = await api.fetchCashFlowTransactions();
            setAllTransactions(cashFlowData);
        } catch (e) {
            console.error("Failed to reload transactions", e);
        }
    }, []);

    // Load initial static data and analytics
    useEffect(() => {
        const loadInitialData = async () => {
            setLoading(l => ({ ...l, page: true }));
            setAnalyticsLoading(true);
            try {
                const [supplierData, productData, entryData, cashFlowData, analytics] = await Promise.all([
                    api.fetchSuppliers(),
                    api.fetchProducts(),
                    api.fetchEntries(),
                    api.fetchCashFlowTransactions(),
                    api.fetchSupplierInvoicesAnalytics(),
                ]);
                setSuppliers(supplierData);
                setProducts(productData);
                setAllEntries(entryData);
                setAllTransactions(cashFlowData);
                setAnalyticsData(analytics);
            } catch (err) {
                setError("Failed to load initial page data.");
            } finally {
                setLoading(l => ({ ...l, page: false }));
                setAnalyticsLoading(false);
            }
        };
        loadInitialData();
    }, []);

    const getProductName = useCallback((id: string) => products.find(p => p.id === id || (p as any)._id === id)?.productName || 'N/A', [products]);

    const resetForm = useCallback(() => {
        setSelectedEntryIds(new Set());
        setItemsForInvoice([]);
        setCommissionRate(10);
        setWages(0);
        setAdjustments(0);
        setPaymentEntries([]);
        setEditingInvoice(null);
        setInvoiceDate(new Date().toISOString().split('T')[0]);
        setIsWagesInputVisible(false);
        setIsAdjustmentsInputVisible(false);
        setIsDraftMode(false);
        setDraftAdvancePayments([]);
    }, []);

    const uninvoicedEntries = useMemo(() => {
        if (!selectedSupplier) return [];
        // Handle both custom id and MongoDB _id for supplier matching
        const supplierEntries = allEntries.filter(e =>
            e.supplierId === selectedSupplier.id ||
            e.supplierId === (selectedSupplier as any)._id
        );
        // An entry is "uninvoiced" if its status is not 'Invoiced' and not 'Cancelled'.
        // This will include entries with both sold and unsold items.
        return supplierEntries.filter(e => {
            return e.status !== EntryStatus.Invoiced && e.status !== EntryStatus.Cancelled && e.items.length > 0;
        });
    }, [allEntries, selectedSupplier]);

    const handleOpenDetailModal = (invoice: SupplierInvoice) => {
        setSelectedInvoiceForDetail(invoice);
        setIsDetailModalOpen(true);
    };

    const handleCloseDetailModal = () => {
        setSelectedInvoiceForDetail(null);
        setIsDetailModalOpen(false);
    };

    // Load data when a supplier is selected
    const loadSupplierData = useCallback(async (supplierId: string) => {
        setLoading(l => ({ ...l, data: true }));
        try {
            const [invoicesData, supplierData, entriesData] = await Promise.all([
                api.fetchSupplierInvoicesForSupplier(supplierId),
                api.fetchSupplier(supplierId),
                api.fetchEntries(),
            ]);
            setSupplierInvoices(invoicesData.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()));
            setSelectedSupplier(supplierData);
            setAllEntries(entriesData);
            return { invoicesData };
        } catch (e) {
            setError("Failed to load supplier data.");
            return { invoicesData: [] };
        } finally {
            setLoading(l => ({ ...l, data: false }));
        }
    }, []);

    const handleSupplierChange = useCallback((supplierId: string) => {
        const supplier = suppliers.find(s => (s as any)._id === supplierId || s.id === supplierId);
        if (supplier) {
            setSelectedSupplier(supplier);
            loadSupplierData(supplier.id);
            resetForm();
        } else {
            setSelectedSupplier(null);
            setSupplierInvoices([]);
        }
    }, [suppliers, loadSupplierData, resetForm]);

    // Effect for handling navigation state
    useEffect(() => {
        const { supplierIdToLoad, entryIdToSelect, invoiceIdToView } = location.state || {};
        if (supplierIdToLoad && suppliers.length > 0) {
            if (entryIdToSelect) {
                setIsPreparingDraft(true);
                setAutoAction({ type: 'draft', supplierId: supplierIdToLoad, targetId: entryIdToSelect });
            } else if (invoiceIdToView) {
                setAutoAction({ type: 'view', supplierId: supplierIdToLoad, targetId: invoiceIdToView });
            }
            handleSupplierChange(supplierIdToLoad);
            navigate(location.pathname, { replace: true, state: {} });
        }
    }, [location.state, navigate, handleSupplierChange, suppliers]);

    // Effect to perform auto-action once data is loaded
    useEffect(() => {
        if (!autoAction || loading.data || !selectedSupplier || selectedSupplier.id !== autoAction.supplierId) return;

        if (autoAction.type === 'draft' && uninvoicedEntries.some(e => e.id === autoAction.targetId)) {
            const newEntryIds = new Set([autoAction.targetId]);
            setSelectedEntryIds(newEntryIds);
            // We need to trigger handlePrepareInvoice, but we can't call it directly inside effect easily without dependencies issues.
            // Instead, we can set a flag or just manually set the items.
            const entriesToInvoice = uninvoicedEntries.filter(e => newEntryIds.has(e.id));
            const allItems = entriesToInvoice.flatMap(e => e.items.map(i => ({ ...i, productName: getProductName(i.productId), entrySerialNumber: e.serialNumber })));
            setItemsForInvoice(allItems);

            let wagesQty = 0;
            let excluded = false;
            allItems.forEach(item => {
                const qty = Number(item.quantity || 0);
                const weight = item.nettWeight || 0;
                const avgWeight = qty > 0 ? weight / qty : 0;
                if (weight > 0 && avgWeight > 100) {
                    excluded = true;
                } else {
                    wagesQty += qty;
                }
            });
            setWages(wagesQty * 5);
            setHasExcludedWagesItems(excluded);
            setIsWagesInputVisible(true);

        } else if (autoAction.type === 'view' && supplierInvoices.some(i => (i as any)._id === autoAction.targetId || i.id === autoAction.targetId)) {
            const invoice = supplierInvoices.find(i => (i as any)._id === autoAction.targetId || i.id === autoAction.targetId);
            if (invoice) handleOpenDetailModal(invoice);
        }
        setAutoAction(null);
        setIsPreparingDraft(false);
    }, [autoAction, loading.data, selectedSupplier, uninvoicedEntries, supplierInvoices, getProductName]);

    const handleEntrySelection = (entryId: string) => {
        const newSet = new Set(selectedEntryIds);
        if (newSet.has(entryId)) newSet.delete(entryId);
        else newSet.add(entryId);
        setSelectedEntryIds(newSet);
    };

    const handleAddPaymentEntry = () => {
        setPaymentEntries(prev => [...prev, { id: `payment_${Date.now()}`, amount: '', method: PaymentMethod.Cash, reference: '' }]);
    };
    const handleRemovePaymentEntry = (id: string) => {
        setPaymentEntries(prev => prev.filter(p => p.id !== id));
    };
    const handlePaymentEntryChange = (id: string, field: keyof PaymentFormEntry, value: string | number | PaymentMethod) => {
        setPaymentEntries(prev => prev.map(p => p.id === id ? { ...p, [field]: value } : p));
    };

    const handleAddDraftAdvance = () => {
        setDraftAdvancePayments(prev => [...prev, { id: `draft_adv_${Date.now()}`, amount: '', method: PaymentMethod.Cash, reference: '' }]);
    };
    const handleRemoveDraftAdvance = (id: string) => {
        setDraftAdvancePayments(prev => prev.filter(p => p.id !== id));
    };
    const handleDraftAdvanceChange = (id: string, field: keyof PaymentFormEntry, value: string | number | PaymentMethod) => {
        setDraftAdvancePayments(prev => prev.map(p => p.id === id ? { ...p, [field]: value } : p));
    };

    const handleSaveSingleDraftAdvance = async (advanceId: string) => {
        if (!selectedSupplier || !user) return;
        if (selectedEntryIds.size === 0) {
            alert("No entries selected.");
            return;
        }

        const advanceToSave = draftAdvancePayments.find(a => a.id === advanceId);
        if (!advanceToSave || !Number(advanceToSave.amount)) {
            alert('Please enter a valid amount.');
            return;
        }

        setLoading(l => ({ ...l, data: true }));
        try {
            await api.addCashFlowTransaction({
                date: new Date(),
                type: TransactionType.Expense,
                category: ExpenseCategory.AdvancePayment,
                entityId: selectedSupplier.id,
                entityName: selectedSupplier.supplierName,
                amount: Number(advanceToSave.amount),
                method: advanceToSave.method,
                reference: advanceToSave.reference,
                description: `Advance payment for supplier ${selectedSupplier.supplierName}`,
                relatedEntryIds: Array.from(selectedEntryIds),
            }, user);

            await loadTransactions();

            // Remove ONLY this saved advance from the draft list
            setDraftAdvancePayments(prev => prev.filter(p => p.id !== advanceId));

        } catch (error: any) {
            console.error('Failed to save advance payment:', error);
            alert(error.message || 'Failed to save advance payment.');
        } finally {
            setLoading(l => ({ ...l, data: false }));
        }
    };

    const { grossTotal, commissionAmount, nettAmount, aggregatedItems, totalQuantities } = useMemo(() => {
        const qty = itemsForInvoice.reduce((sum, item) => sum + Number(item.quantity || 0), 0);
        const grossRaw = itemsForInvoice.reduce((sum, item) => sum + item.subTotal, 0);
        const gross = Math.round(grossRaw);
        // Commission rounded UP to nearest rupee to match backend behavior (based on rounded gross)
        const commission = Math.ceil((gross * (Number(commissionRate) || 0)) / 100);
        const nettRaw = gross - commission - (Number(wages) || 0) + (Number(adjustments) || 0);
        const nett = Math.round(nettRaw);
        const aggItems = aggregateItems(itemsForInvoice);

        return {
            grossTotal: gross,
            commissionAmount: commission,
            nettAmount: nett,
            aggregatedItems: aggItems,
            totalQuantities: qty,
        };
    }, [itemsForInvoice, commissionRate, wages, adjustments]);

    const entriesForPrint = useMemo(() => {
        const sourceEntries = editingInvoice ? allEntries : uninvoicedEntries;
        return sourceEntries.filter(e => selectedEntryIds.has(e.id)).map(entry => ({
            ...entry,
            items: entry.items.map(item => ({
                ...item,
                productName: getProductName(item.productId)
            }))
        }));
    }, [editingInvoice, allEntries, uninvoicedEntries, selectedEntryIds, getProductName]);

    // Get individual advance transactions per entry (with dates)
    const advanceTransactionsByEntry = useMemo(() => {
        const map = new Map<string, CashFlowTransaction[]>();
        if (!selectedEntryIds.size) return map;

        allTransactions.forEach(t => {
            if (t.type === TransactionType.Expense && t.category === ExpenseCategory.AdvancePayment && t.relatedEntryIds) {
                t.relatedEntryIds.forEach(eid => {
                    if (selectedEntryIds.has(eid)) {
                        const existing = map.get(eid) || [];
                        existing.push(t);
                        map.set(eid, existing);
                    }
                });
            }
        });
        return map;
    }, [allTransactions, selectedEntryIds]);

    const advancesByEntry = useMemo(() => {
        const map = new Map<string, number>();
        if (!selectedEntryIds.size) return map;

        allTransactions.forEach(t => {
            if (t.type === TransactionType.Expense && t.category === ExpenseCategory.AdvancePayment && t.relatedEntryIds) {
                t.relatedEntryIds.forEach(eid => {
                    if (selectedEntryIds.has(eid)) {
                        map.set(eid, (map.get(eid) || 0) + t.amount);
                    }
                });
            }
        });
        return map;
    }, [allTransactions, selectedEntryIds]);

    const totalAdvanceFromSaved = useMemo(() => {
        const relevantTransactions = allTransactions.filter(t =>
            t.type === TransactionType.Expense &&
            t.category === ExpenseCategory.AdvancePayment &&
            t.relatedEntryIds &&
            t.relatedEntryIds.some(id => selectedEntryIds.has(id))
        );
        return relevantTransactions.reduce((sum, t) => sum + t.amount, 0);
    }, [allTransactions, selectedEntryIds]);

    const handlePrepareInvoice = useCallback(() => {
        if (selectedEntryIds.size === 0) return;

        const entriesToInvoice = uninvoicedEntries.filter(e => selectedEntryIds.has(e.id));
        // Include ALL items from the selected entries (both sold and unsold)
        const allItems = entriesToInvoice.flatMap(e => e.items.map(i => ({ ...i, productName: getProductName(i.productId), entrySerialNumber: e.serialNumber })));
        setItemsForInvoice(allItems);

        // Enter Draft Mode
        setIsDraftMode(true);

        // Clear draft advance payments (existing advances are tracked separately)
        setDraftAdvancePayments([]);

    }, [selectedEntryIds, uninvoicedEntries, getProductName, advancesByEntry]);

    const handleFinalizeDraft = useCallback(() => {
        // Transition from Draft Mode to Finalize Mode
        setIsDraftMode(false);

        // Calculate default wages (₹5 per quantity), excluding heavy items (>100kg avg)
        let wagesQty = 0;
        let excluded = false;
        itemsForInvoice.forEach(item => {
            const qty = Number(item.quantity || 0);
            const weight = item.nettWeight || 0;
            const avgWeight = qty > 0 ? weight / qty : 0;
            if (weight > 0 && avgWeight > 100) {
                excluded = true;
            } else {
                wagesQty += qty;
            }
        });
        setWages(wagesQty * 5);
        setHasExcludedWagesItems(excluded);
        setIsWagesInputVisible(true);
    }, [itemsForInvoice]);

    const handleGenerateDraft = (isDownload: boolean) => {
        const currentDraftEntryIds = Array.from(selectedEntryIds);
        const newDraftedIds = new Set([...draftedEntryIds, ...currentDraftEntryIds]);
        setDraftedEntryIds(newDraftedIds);
        sessionStorage.setItem('draftedEntryIds', JSON.stringify(Array.from(newDraftedIds)));

        const relevantTransactions = allTransactions.filter(t =>
            t.type === TransactionType.Expense &&
            t.category === ExpenseCategory.AdvancePayment &&
            t.relatedEntryIds &&
            t.relatedEntryIds.some(id => selectedEntryIds.has(id))
        );

        // Open draft memorandum in print preview modal
        openPrintPreview(
            `Draft Memorandum`,
            <SupplierDraftInvoicePrintView
                supplier={selectedSupplier!}
                entries={entriesForPrint}
                transactions={relevantTransactions}
            />
        );
    };

    const newPaymentsTotal = useMemo(() => paymentEntries.reduce((sum, p) => sum + (Number(p.amount) || 0), 0), [paymentEntries]);

    const handleSaveInvoice = async () => {
        if (loading.data) return;
        if (!selectedSupplier || itemsForInvoice.length === 0 || !user) return;

        setLoading(l => ({ ...l, data: true }));
        setError(null);

        try {
            const isEditing = !!editingInvoice;

            const invoicePayload: Omit<SupplierInvoice, 'id' | 'invoiceNumber' | 'createdAt' | 'status'> = {
                supplierId: selectedSupplier.id,
                entryIds: Array.from(selectedEntryIds),
                items: aggregatedItems,
                totalQuantities,
                grossTotal,
                commissionRate: Number(commissionRate) || 0,
                commissionAmount,
                wages: Number(wages) || 0,
                adjustments: Number(adjustments) || 0,
                nettAmount,
                advancePaid: editingInvoice ? editingInvoice.advancePaid : totalAdvanceFromSaved,
                finalPayable: nettAmount - (editingInvoice ? editingInvoice.advancePaid : totalAdvanceFromSaved),
                paidAmount: 0,
            };

            console.log('Frontend: handleSaveInvoice payload:', JSON.stringify(invoicePayload, null, 2));
            console.log('Frontend: entryIds type:', typeof invoicePayload.entryIds, 'isArray:', Array.isArray(invoicePayload.entryIds));
            console.log('Frontend: entryIds value:', invoicePayload.entryIds);

            let savedInvoice: SupplierInvoice;
            if (isEditing) {
                savedInvoice = await api.updateSupplierInvoice({ ...invoicePayload, id: editingInvoice.id, invoiceNumber: editingInvoice.invoiceNumber, createdAt: editingInvoice.createdAt, status: editingInvoice.status }, user);
            } else {
                savedInvoice = await api.addSupplierInvoice({ ...invoicePayload, status: SupplierInvoiceStatus.Unpaid }, user);
            }

            const newPayments = paymentEntries.filter(p => (Number(p.amount) || 0) > 0);
            for (const payment of newPayments) {
                const desc = isEditing
                    ? `Additional payment for ${savedInvoice.invoiceNumber}`
                    : `Final settlement for ${savedInvoice.invoiceNumber}`;

                await api.addSupplierPayment({
                    date: new Date(),
                    category: ExpenseCategory.SupplierPayment,
                    entityId: savedInvoice.supplierId,
                    entityName: selectedSupplier.supplierName,
                    amount: Number(payment.amount) || 0,
                    method: payment.method,
                    reference: payment.reference,
                    description: desc,
                    relatedInvoiceIds: [savedInvoice.id],
                }, user);
            }

            // Clear drafted status for invoiced entries
            const invoicedEntryIds = Array.from(selectedEntryIds);
            setDraftedEntryIds(prev => {
                const next = new Set(prev);
                invoicedEntryIds.forEach(id => next.delete(id));
                sessionStorage.setItem('draftedEntryIds', JSON.stringify(Array.from(next)));
                return next;
            });

            await loadSupplierData(selectedSupplier.id);
            await loadTransactions();
            resetForm();

        } catch (e: any) {
            setError(e.message || "Failed to save invoice.");
        } finally {
            setLoading(l => ({ ...l, data: false }));
        }
    };

    const handleEditInvoice = (invoice: SupplierInvoice) => {
        resetForm(); // Clear any ongoing new invoice
        setEditingInvoice(invoice);
        setCommissionRate(invoice.commissionRate || '');
        setWages(invoice.wages || '');
        setAdjustments(invoice.adjustments || '');

        setIsWagesInputVisible(!!invoice.wages);
        setIsAdjustmentsInputVisible(!!invoice.adjustments);
        setPaymentEntries([]);

        const entriesForThisInvoice = allEntries.filter(e => invoice.entryIds.includes(e.id));
        const allItemsFromEntries = entriesForThisInvoice.flatMap(e =>
            e.items
                .filter(i => i.supplierInvoiceId === invoice.id || !i.supplierInvoiceId) // Also include items that may have been unlinked
                .map(i => ({ ...i, productName: getProductName(i.productId), entrySerialNumber: e.serialNumber }))
        );
        setItemsForInvoice(allItemsFromEntries);

        setSelectedEntryIds(new Set(invoice.entryIds));
        handleCloseDetailModal();
    }

    const advancesForAllUninvoicedEntries = useMemo(() => {
        const map = new Map<string, number>();
        if (!uninvoicedEntries.length) return map;
        const uninvoicedEntryIds = new Set(uninvoicedEntries.map(e => e.id));
        allTransactions.forEach(t => {
            if (t.type === TransactionType.Expense && t.category === ExpenseCategory.AdvancePayment && t.relatedEntryIds) {
                t.relatedEntryIds.forEach(eid => {
                    if (uninvoicedEntryIds.has(eid)) {
                        map.set(eid, (map.get(eid) || 0) + t.amount);
                    }
                });
            }
        });
        return map;
    }, [allTransactions, uninvoicedEntries]);

    const handlePrintInvoice = useCallback((invoiceToPrint: SupplierInvoice) => {
        if (selectedSupplier) {
            const entriesForInvoice = allEntries.filter(e => invoiceToPrint.entryIds.includes(e.id));
            openPrintPreview(
                `Print Invoice ${invoiceToPrint.invoiceNumber}`,
                <SupplierInvoicePrintView
                    invoice={invoiceToPrint}
                    supplier={selectedSupplier}
                    entries={entriesForInvoice}
                    transactions={allTransactions}
                    products={products}
                />
            );
        }
    }, [selectedSupplier, allEntries, allTransactions, products, openPrintPreview]);

    const handleDeleteInvoice = useCallback(async (invoiceId: string) => {
        if (!user || !canDelete(Feature.SupplierInvoices)) return;
        if (window.confirm("Are you sure you want to delete this invoice? This action cannot be undone.")) {
            setLoading(l => ({ ...l, data: true }));
            try {
                await api.deleteSupplierInvoice(invoiceId, user);
                if (selectedSupplier) {
                    await loadSupplierData(selectedSupplier.id);
                }
            } catch (e) {
                setError("Failed to delete invoice.");
            } finally {
                setLoading(l => ({ ...l, data: false }));
                handleCloseDetailModal();
            }
        }
    }, [user, canDelete, selectedSupplier, loadSupplierData]);


    const uninvoicedEntriesColumns: Column<Entry>[] = useMemo(() => [
        { key: 'select', header: <input type="checkbox" onChange={e => setSelectedEntryIds(e.target.checked ? new Set(uninvoicedEntries.map(en => en.id)) : new Set())} />, accessor: (entry) => <input type="checkbox" checked={selectedEntryIds.has(entry.id)} onChange={() => handleEntrySelection(entry.id)} />, className: "w-10", isDefault: true },
        { key: 'serialNumber', header: 'Entry #', accessor: 'serialNumber', sortable: true, isDefault: true, className: 'font-semibold text-primary' },
        { key: 'createdAt', header: 'Date', accessor: e => formatDate(e.createdAt), sortable: true, sortAccessor: 'createdAt', isDefault: true },
        { key: 'items', header: 'Items', accessor: e => e.items.map(i => getProductName(i.productId)).join(', '), isDefault: true },
        {
            key: 'advanceStatus',
            header: 'Advance Status',
            accessor: (entry: Entry) => {
                const advance = advancesForAllUninvoicedEntries.get(entry.id);
                const isDrafted = draftedEntryIds.has(entry.id);

                if (!advance && !isDrafted) {
                    return <span className="text-gray-400">-</span>;
                }

                return (
                    <div>
                        {advance && <span className="font-semibold text-red-600">{formatCurrency(advance)}</span>}
                        {isDrafted && <div className="text-xs text-gray-500">Drafted</div>}
                    </div>
                );
            },
            sortAccessor: (entry: Entry) => advancesForAllUninvoicedEntries.get(entry.id) || 0,
            sortable: true,
            isDefault: true,
            className: 'text-right'
        },
        { key: 'totalAmount', header: 'Total Amount', accessor: e => formatCurrency(e.items.reduce((s, i) => s + i.subTotal, 0)), sortable: true, sortAccessor: 'totalAmount', isDefault: true, className: 'text-right font-semibold' },
    ], [uninvoicedEntries, selectedEntryIds, getProductName, handleEntrySelection, advancesForAllUninvoicedEntries, draftedEntryIds]);

    const [uninvoicedCols, setUninvoicedCols] = useLocalStorage<string[]>('table-cols-supplier-uninvoiced', uninvoicedEntriesColumns.filter(c => c.isDefault).map(c => c.key));

    const invoiceHistoryColumns: Column<SupplierInvoice>[] = useMemo(() => [
        { key: 'invoiceNumber', header: 'Invoice #', accessor: 'invoiceNumber', sortable: true, isDefault: true, className: 'font-semibold text-primary' },
        { key: 'createdAt', header: 'Date', accessor: i => formatDate(i.createdAt), sortable: true, sortAccessor: 'createdAt', isDefault: true },
        { key: 'nettAmount', header: 'Payable Amt', accessor: i => formatCurrency(i.nettAmount), sortable: true, sortAccessor: 'nettAmount', isDefault: true, className: 'text-right' },
        { key: 'balance', header: 'Balance Due', accessor: i => formatCurrency(i.nettAmount - i.paidAmount), sortable: true, sortAccessor: i => i.nettAmount - i.paidAmount, isDefault: true, className: 'text-right text-danger' },
        { key: 'status', header: 'Status', accessor: i => <StatusChip status={i.status} />, sortable: true, sortAccessor: 'status', isDefault: true, className: 'text-center' },
        {
            key: 'actions',
            header: 'Actions',
            accessor: (inv) => (
                <div className="flex items-center justify-center gap-2">
                    <Button size="sm" variant="ghost" onClick={(e) => { e.stopPropagation(); handlePrintInvoice(inv); }}>Print</Button>
                    <Button size="sm" variant="secondary" onClick={(e) => { e.stopPropagation(); handleOpenDetailModal(inv); }}>View</Button>
                    {canDelete(Feature.SupplierInvoices) && <Button size="sm" variant="danger" onClick={(e) => { e.stopPropagation(); handleDeleteInvoice(inv.id); }}>Delete</Button>}
                </div>
            ),
            isDefault: true,
            className: 'text-center'
        },
    ], [handleOpenDetailModal, handlePrintInvoice, handleDeleteInvoice, canDelete]);

    const [historyCols, setHistoryCols] = useLocalStorage<string[]>(`table-cols-supplier-history-${selectedSupplier?.id}`, invoiceHistoryColumns.filter(c => c.isDefault).map(c => c.key));


    const renderUninvoicedMobileCard = (entry: Entry) => {
        const advance = advancesForAllUninvoicedEntries.get(entry.id);
        const isDrafted = draftedEntryIds.has(entry.id);
        return (
            <div className="p-4 space-y-2">
                <div className="flex justify-between items-start">
                    <div className="flex items-start gap-3">
                        <input type="checkbox" checked={selectedEntryIds.has(entry.id)} onChange={() => handleEntrySelection(entry.id)} className="mt-1" />
                        <div>
                            <p className="font-bold text-primary">{entry.serialNumber}</p>
                            <p className="text-xs text-muted">{formatDate(entry.createdAt)}</p>
                        </div>
                    </div>
                    <div className="text-right">
                        <p className="font-semibold">{formatCurrency(entry.items.reduce((s, i) => s + i.subTotal, 0))}</p>
                        {advance && <p className="text-xs text-danger">Adv: {formatCurrency(advance)}</p>}
                        {isDrafted && <p className="text-xs text-gray-500">Drafted</p>}
                    </div>
                </div>
            </div>
        );
    };

    const renderHistoryMobileCard = (inv: SupplierInvoice) => (
        <div className="p-4 space-y-2">
            <div className="cursor-pointer" onClick={() => handleOpenDetailModal(inv)}>
                <div className="flex justify-between items-start">
                    <div>
                        <p className="font-bold text-primary">{inv.invoiceNumber}</p>
                        <p className="text-xs text-muted">{formatDate(inv.createdAt)}</p>
                    </div>
                    <div className="text-right">
                        <span className="font-semibold">{formatCurrency(inv.nettAmount)}</span>
                    </div>
                    <div className="text-right">
                        <span className="text-muted">Balance: </span>
                        <span className="font-semibold text-danger">{formatCurrency(inv.nettAmount - inv.paidAmount)}</span>
                    </div>
                </div>
            </div>
            <div className="flex justify-end items-center gap-2 pt-2 border-t border-border-color">
                <Button size="sm" variant="ghost" onClick={(e) => { e.stopPropagation(); handlePrintInvoice(inv); }}>Print</Button>
                <Button size="sm" variant="secondary" onClick={(e) => { e.stopPropagation(); handleOpenDetailModal(inv); }}>View</Button>
                {canDelete(Feature.SupplierInvoices) && <Button size="sm" variant="danger" onClick={(e) => { e.stopPropagation(); handleDeleteInvoice(inv.id); }}>Delete</Button>}
            </div>
        </div>
    );

    if (loading.page) return <div>Loading page...</div>;

    const isFormVisible = itemsForInvoice.length > 0 || editingInvoice;

    const displayAdvance = editingInvoice ? editingInvoice.advancePaid : totalAdvanceFromSaved;
    const otherPayments = editingInvoice ? (editingInvoice.paidAmount - editingInvoice.advancePaid) : 0;
    const finalPayable = nettAmount - displayAdvance;
    const balanceDue = finalPayable - otherPayments - newPaymentsTotal;

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <h1 className="text-3xl font-bold">Supplier Invoices</h1>
            </div>

            <Card className="relative z-10">
                <div className="flex flex-col sm:flex-row sm:items-end gap-4">
                    <div className="flex-grow">
                        <label htmlFor="supplier-select" className="block text-sm font-medium text-muted mb-1">Select Supplier</label>
                        <SearchableSelect
                            options={suppliers.map(s => ({ value: s.id, label: s.supplierName }))}
                            value={selectedSupplier?.id || null}
                            onChange={(val) => handleSupplierChange(val || '')}
                            placeholder="-- Choose a supplier --"
                        />
                    </div>
                    {selectedSupplier && (
                        <div className="text-right flex-shrink-0">
                            <p className="text-sm text-muted">Outstanding Balance</p>
                            <p className={`text-xl font-bold ${selectedSupplier.outstanding < 0 ? 'text-danger' : 'text-success'}`}>
                                {formatCurrency(Math.abs(selectedSupplier.outstanding))}
                                {selectedSupplier.outstanding < 0 ? ' Payable' : ' Receivable'}
                            </p>
                        </div>
                    )}
                </div>
            </Card>

            {!selectedSupplier ? (
                analyticsLoading ? <div className="flex justify-center p-10"><Spinner /></div> : analyticsData && <SupplierInvoicesAnalytics data={analyticsData} />
            ) : (
                <>
                    {isDraftMode ? (
                        // ========== DRAFT MEMORANDUM VIEW ==========
                        <Card className="border-2 border-yellow-400">
                            <div className="flex justify-between items-center mb-4">
                                <h2 className="text-2xl font-bold">Draft Memorandum</h2>
                                <button onClick={resetForm} className="text-muted hover:text-dark">{ICONS.close}</button>
                            </div>

                            {/* Entry Details */}
                            <div className="space-y-4 mb-6">
                                {entriesForPrint.map(entry => {
                                    const entryAdvanceTransactions = advanceTransactionsByEntry.get(entry.id) || [];
                                    const entryAdvanceTotal = entryAdvanceTransactions.reduce((sum, t) => sum + t.amount, 0);
                                    return (
                                        <div key={entry.id} className="border border-gray-300 rounded-lg p-4 bg-yellow-50">
                                            <div className="flex justify-between items-center mb-2">
                                                <h3 className="text-lg font-bold text-primary">{entry.serialNumber}</h3>
                                                <span className="text-sm text-muted">{formatDate(entry.createdAt)}</span>
                                            </div>
                                            <table className="w-full text-sm">
                                                <thead>
                                                    <tr className="border-b">
                                                        <th className="text-left py-1">Product</th>
                                                        <th className="text-right py-1">Qty/Wt</th>
                                                        <th className="text-right py-1">Rate</th>
                                                        <th className="text-right py-1">Amount</th>
                                                    </tr>
                                                </thead>
                                                <tbody>
                                                    {entry.items.map((item, idx) => (
                                                        <tr key={idx} className="border-b">
                                                            <td className="py-1">{item.productName}</td>
                                                            <td className="text-right">{item.quantity} Nos</td>
                                                            <td className="text-right">{formatCurrency(item.ratePerQuantity || 0)}</td>
                                                            <td className="text-right font-semibold">{formatCurrency(item.subTotal)}</td>
                                                        </tr>
                                                    ))}
                                                </tbody>
                                            </table>
                                            {entryAdvanceTransactions.length > 0 && (
                                                <div className="mt-2 p-2 bg-blue-50 border border-blue-200 rounded text-sm">
                                                    <p className="text-blue-800 font-semibold mb-1">📝 Advance Payments (for reference):</p>
                                                    <ul className="space-y-1 ml-4">
                                                        {entryAdvanceTransactions.map((t, idx) => (
                                                            <li key={idx} className="text-blue-700 flex justify-between">
                                                                <span>{formatDate(t.date)}</span>
                                                                <span>{formatCurrency(t.amount)}</span>
                                                            </li>
                                                        ))}
                                                    </ul>
                                                    {entryAdvanceTransactions.length > 1 && (
                                                        <div className="flex justify-between mt-1 pt-1 border-t border-blue-300 font-semibold text-blue-800">
                                                            <span>Total Advance:</span>
                                                            <span>{formatCurrency(entryAdvanceTotal)}</span>
                                                        </div>
                                                    )}
                                                </div>
                                            )}
                                        </div>
                                    );
                                })}
                            </div>

                            {/* Totals */}
                            <div className="bg-gray-100 p-4 rounded-lg mb-6">
                                <div className="flex justify-between items-center text-lg font-bold">
                                    <span>Gross Total</span>
                                    <span>{formatCurrency(grossTotal)}</span>
                                </div>
                                {totalAdvanceFromSaved > 0 && (
                                    <div className="mt-3 p-3 bg-yellow-50 border border-yellow-300 rounded-lg">
                                        <p className="text-sm font-semibold text-yellow-800">📝 Advance Payment Reference (Memo Only)</p>
                                        <p className="text-sm text-yellow-700">Existing Advances: {formatCurrency(totalAdvanceFromSaved)}</p>
                                        <p className="text-xs text-yellow-600 italic mt-1">This will be deducted from the final invoice upon finalization.</p>
                                    </div>
                                )}
                            </div>

                            {/* Add Advance Payment Section */}
                            {/* Add Advance Payment Section */}
                            <div className="mb-6">
                                <div className="flex justify-between items-center mb-3">
                                    <h3 className="font-semibold">Advance Payments</h3>
                                    <button onClick={handleAddDraftAdvance} className="text-primary hover:text-primary-hover font-semibold text-sm">
                                        + Add Advance Payment
                                    </button>
                                </div>
                                {draftAdvancePayments.length > 0 && (
                                    <div className="space-y-2">
                                        {draftAdvancePayments.map(adv => (
                                            <div key={adv.id} className="grid grid-cols-12 gap-2 items-center p-2 bg-gray-50 rounded">
                                                <div className="col-span-3">
                                                    <input
                                                        type="number"
                                                        value={adv.amount}
                                                        onChange={(e) => handleDraftAdvanceChange(adv.id, 'amount', Number(e.target.value))}
                                                        placeholder="Amount"
                                                        className="w-full p-2 border rounded"
                                                    />
                                                </div>
                                                <div className="col-span-6">
                                                    <input
                                                        type="text"
                                                        value={adv.reference}
                                                        onChange={(e) => handleDraftAdvanceChange(adv.id, 'reference', e.target.value)}
                                                        placeholder="Reference"
                                                        className="w-full p-2 border rounded"
                                                    />
                                                </div>
                                                <div className="col-span-3 flex justify-end gap-2">
                                                    <button
                                                        onClick={() => handleSaveSingleDraftAdvance(adv.id)}
                                                        className="text-green-600 hover:text-green-800 p-2"
                                                        title="Save Advance"
                                                    >
                                                        {ICONS.save}
                                                    </button>
                                                    <button
                                                        onClick={() => handleRemoveDraftAdvance(adv.id)}
                                                        className="text-red-600 hover:text-red-800 p-2"
                                                        title="Remove"
                                                    >
                                                        {ICONS.trash}
                                                    </button>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>

                            {/* Action Buttons */}
                            <div className="flex flex-wrap gap-3 justify-end border-t pt-4">
                                <Button onClick={() => handleGenerateDraft(true)} variant="secondary" icon={ICONS.download}>
                                    Download Draft
                                </Button>
                                <Button onClick={() => handleGenerateDraft(false)} variant="secondary" icon={ICONS.print}>
                                    Print Draft
                                </Button>
                                <Button onClick={() => navigate('/auction')} variant="secondary" icon={ICONS.auction}>
                                    Edit Auction
                                </Button>
                                <Button onClick={resetForm} variant="secondary">
                                    Cancel
                                </Button>
                                <Button onClick={handleFinalizeDraft} variant="primary" className="bg-green-600 hover:bg-green-700">
                                    Finalize Invoice
                                </Button>
                            </div>
                        </Card>
                    ) : isFormVisible ? (
                        // INVOICE FORM VIEW
                        <Card className="border-2 border-primary-light">
                            <div className="flex justify-between items-center mb-4">
                                <h2 className="text-2xl font-bold">{editingInvoice ? `Editing Invoice #${editingInvoice.invoiceNumber}` : "Create New Invoice"}</h2>
                                <div className="flex items-center gap-4">
                                    <div className="flex items-center gap-2">
                                        <label htmlFor="invoiceDate" className="text-sm font-medium text-muted">Date:</label>
                                        <input
                                            type="date"
                                            id="invoiceDate"
                                            value={invoiceDate}
                                            onChange={(e) => setInvoiceDate(e.target.value)}
                                            className="p-1 border rounded bg-white text-sm"
                                        />
                                    </div>
                                    <button onClick={resetForm} className="text-muted hover:text-dark">{ICONS.close}</button>
                                </div>
                            </div>
                            <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
                                <div className="lg:col-span-3 space-y-2 max-h-[60vh] overflow-y-auto pr-2">
                                    {itemsForInvoice.map((item, idx) => (
                                        <div key={`${item.id}-${idx}`} className="p-3 bg-gray-50 rounded-md grid grid-cols-12 gap-2 text-sm items-center">
                                            <div className="col-span-12 sm:col-span-5">
                                                <p className="font-semibold text-dark">{item.productName}</p>
                                                <p className="text-xs text-muted">Entry: {item.entrySerialNumber || 'N/A'}</p>
                                            </div>
                                            <div className="col-span-6 sm:col-span-2 text-left sm:text-right">
                                                {item.quantity} Nos
                                                {item.nettWeight > 0 && <div className="text-xs text-muted">{item.nettWeight} Kg</div>}
                                            </div>
                                            <div className="col-span-6 sm:col-span-2 text-left sm:text-right">
                                                {formatCurrency(item.ratePerQuantity || 0)}
                                            </div>
                                            <div className="col-span-12 sm:col-span-3 text-right font-bold">
                                                {formatCurrency(item.subTotal)}
                                            </div>
                                        </div>
                                    ))}
                                </div>
                                <div className="lg:col-span-2 bg-gray-50 p-4 rounded-lg space-y-3 flex flex-col">
                                    <h3 className="font-semibold">Invoice Summary</h3>
                                    <div className="flex-grow space-y-2">
                                        <div className="flex justify-between items-center"><span className="text-sm text-muted">Gross Total</span><span className="font-semibold">{formatCurrency(grossTotal)}</span></div>

                                        <div className="flex justify-between items-center">
                                            <label htmlFor="commission" className="text-sm text-muted">Commission (%)</label>
                                            <input type="number" id="commission" value={commissionRate} onChange={e => setCommissionRate(e.target.value === '' ? '' : Number(e.target.value))} className="w-20 p-1 border rounded text-right bg-white" />
                                        </div>
                                        <div className="flex justify-between items-center"><span className="text-sm text-muted">Commission Amt</span><span className="font-semibold text-danger">- {formatCurrency(commissionAmount)}</span></div>

                                        {(isWagesInputVisible || (wages !== '' && wages !== 0)) ? (
                                            <div className="flex flex-col">
                                                <div className="flex justify-between items-center">
                                                    <label htmlFor="wages" className="text-sm text-muted">Wages</label>
                                                    <input type="number" id="wages" value={wages} onChange={e => setWages(e.target.value === '' ? '' : Number(e.target.value))} className="w-24 p-1 border rounded text-right bg-white" />
                                                </div>
                                                {hasExcludedWagesItems && <p className="text-xs text-orange-500 text-right mt-1">Heavy items excluded from auto-calc</p>}
                                            </div>
                                        ) : (<button onClick={() => setIsWagesInputVisible(true)} className="text-sm font-medium text-primary hover:text-primary-hover w-full text-left">+ Add Wages</button>)}
                                        {(isAdjustmentsInputVisible || (adjustments !== '' && adjustments !== 0)) ? (<div className="flex justify-between items-center"><label htmlFor="adjustments" className="text-sm text-muted">Adjustments</label><input type="number" id="adjustments" value={adjustments} onChange={e => setAdjustments(e.target.value === '' ? '' : Number(e.target.value))} className="w-24 p-1 border rounded text-right bg-white" /></div>) : (<button onClick={() => setIsAdjustmentsInputVisible(true)} className="text-sm font-medium text-primary hover:text-primary-hover w-full text-left">+ Add Adjustments</button>)}

                                        <div className="border-t my-2"></div>
                                        <div className="flex justify-between items-center font-bold text-lg"><span className="text-primary">Nett Amount</span><span>{formatCurrency(nettAmount)}</span></div>

                                        {displayAdvance > 0 && (<div className="flex justify-between items-center text-sm"><span className="text-muted">Advance Paid</span><span className="font-semibold text-danger">- {formatCurrency(displayAdvance)}</span></div>)}

                                        <div className="border-t my-2"></div>
                                        <div className="flex justify-between items-center font-bold text-xl"><span className="text-success">Final Payable</span><span>{formatCurrency(finalPayable)}</span></div>

                                        {otherPayments > 0 && (<div className="flex justify-between items-center text-sm"><span className="text-muted">Other Payments</span><span className="font-semibold text-danger">- {formatCurrency(otherPayments)}</span></div>)}

                                        <div className="space-y-2 pt-2 border-t mt-2">
                                            <h4 className="font-semibold text-sm text-muted">Record Payments</h4>
                                            {paymentEntries.map(p => (
                                                <div key={p.id} className="p-1 bg-blue-50 rounded-md grid grid-cols-12 gap-1 items-center">
                                                    <input type="number" placeholder="Amount" value={p.amount} onChange={e => handlePaymentEntryChange(p.id, 'amount', e.target.value === '' ? '' : Number(e.target.value))} className="col-span-7 md:col-span-8 p-1 border rounded bg-white text-sm" />
                                                    <select value={p.method} onChange={e => handlePaymentEntryChange(p.id, 'method', e.target.value as PaymentMethod)} className="col-span-5 md:col-span-4 p-1 border rounded bg-white text-xs">
                                                        <option value={PaymentMethod.Cash}>Cash</option>
                                                        <option value={PaymentMethod.Bank}>Bank</option>
                                                    </select>

                                                    <input type="text" placeholder="Ref" value={p.reference} onChange={e => handlePaymentEntryChange(p.id, 'reference', e.target.value)} className="col-span-11 p-1 border rounded bg-white text-sm" />
                                                    <button onClick={() => handleRemovePaymentEntry(p.id)} className="text-danger p-1 hover:bg-red-100 rounded-full justify-self-center">
                                                        {React.cloneElement(ICONS.trash, { className: "h-4 w-4" })}
                                                    </button>
                                                </div>
                                            ))}
                                            <button onClick={handleAddPaymentEntry} className="text-xs font-medium text-primary hover:underline">+ Add Payment</button>
                                        </div>

                                        <div className="flex justify-between items-center font-bold text-lg border-t pt-2 mt-2"><span className="text-danger">Balance Due</span><span>{formatCurrency(balanceDue)}</span></div>
                                    </div>
                                    <div className="flex flex-col gap-2">
                                        <button onClick={handleSaveInvoice} disabled={loading.data} className="w-full bg-success text-white font-bold py-2 px-4 rounded-lg hover:bg-green-600 disabled:bg-gray-400">{loading.data ? 'Saving...' : (editingInvoice ? 'Update Invoice' : 'Save Invoice')}</button>
                                    </div>
                                </div>
                            </div>
                        </Card>
                    ) : (
                        // UNINVOICED ENTRIES VIEW
                        <Card>
                            <h2 className="text-xl font-bold mb-2">Uninvoiced Entries</h2>
                            {loading.data ? <p>Loading...</p> : uninvoicedEntries.length > 0 ? (
                                <>
                                    <SortableTable columns={uninvoicedEntriesColumns} data={uninvoicedEntries} tableId="supplier-uninvoiced" loading={loading.data} renderMobileCard={renderUninvoicedMobileCard} visibleColumns={uninvoicedCols} onColumnToggle={(key) => setUninvoicedCols(prev => prev.includes(key) ? prev.filter(k => k !== key) : [...prev, key])} />
                                    <button onClick={handlePrepareInvoice} disabled={selectedEntryIds.size === 0} className="mt-4 bg-primary text-white font-bold py-2 px-4 rounded-lg hover:bg-primary-hover disabled:bg-gray-400">
                                        Prepare Draft Memorandum for {selectedEntryIds.size} entries
                                    </button>
                                </>
                            ) : <p className="text-muted">No uninvoiced entries found for this supplier.</p>}
                        </Card>
                    )}

                    {/* INVOICE HISTORY */}
                    <Card>
                        <h2 className="text-xl font-bold mb-2">Invoice History</h2>
                        <SortableTable columns={invoiceHistoryColumns} data={supplierInvoices} tableId="supplier-invoices" defaultSortField="balance" loading={loading.data} renderMobileCard={renderHistoryMobileCard} visibleColumns={historyCols} onColumnToggle={(key) => setHistoryCols(prev => prev.includes(key) ? prev.filter(k => k !== key) : [...prev, key])} />
                    </Card>
                </>
            )}

            {selectedInvoiceForDetail && (
                <Modal isOpen={isDetailModalOpen} onClose={handleCloseDetailModal} title={`Invoice: ${selectedInvoiceForDetail.invoiceNumber}`} size="4xl">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="space-y-4">
                            <h3 className="font-bold">Items</h3>
                            <div className="space-y-2 max-h-80 overflow-y-auto pr-2">
                                {selectedInvoiceForDetail.items.map((item, index) => (
                                    <div key={`${item.productId}-${index}`} className="p-2 bg-gray-50 rounded-md grid grid-cols-3 gap-2 text-sm">
                                        <p className="font-semibold col-span-2">{item.productName}</p>
                                        <p className="text-right font-bold">{formatCurrency(item.subTotal)}</p>
                                        <p className="text-xs text-muted col-span-2">{item.quantity} Nos @ {formatCurrency(item.ratePerQuantity)}</p>
                                    </div>
                                ))}
                            </div>
                        </div>
                        <div className="bg-gray-50 p-4 rounded-lg space-y-2 flex flex-col">
                            <h3 className="font-bold">Summary</h3>
                            <div className="flex-grow space-y-1">
                                <div className="flex justify-between text-sm"><span className="text-muted">Gross Total</span><span>{formatCurrency(selectedInvoiceForDetail.grossTotal)}</span></div>
                                <div className="flex justify-between text-sm"><span className="text-muted">Commission ({selectedInvoiceForDetail.commissionRate}%)</span><span className="text-danger">- {formatCurrency(selectedInvoiceForDetail.commissionAmount)}</span></div>
                                <div className="flex justify-between text-sm"><span className="text-muted">Wages</span><span className="text-danger">- {formatCurrency(selectedInvoiceForDetail.wages)}</span></div>
                                <div className="flex justify-between text-sm"><span className="text-muted">Adjustments</span><span>{selectedInvoiceForDetail.adjustments >= 0 ? '+' : '-'} {formatCurrency(Math.abs(selectedInvoiceForDetail.adjustments))}</span></div>
                                <div className="flex justify-between font-bold border-t pt-1 mt-1"><span className="text-primary">Nett Amount</span><span>{formatCurrency(selectedInvoiceForDetail.nettAmount)}</span></div>
                                <div className="flex justify-between text-sm"><span className="text-muted">Advance Paid</span><span className="font-semibold text-danger">- {formatCurrency(selectedInvoiceForDetail.advancePaid)}</span></div>
                                <div className="flex justify-between text-sm"><span className="text-muted">Other Payments</span><span className="font-semibold text-danger">- {formatCurrency(selectedInvoiceForDetail.paidAmount - selectedInvoiceForDetail.advancePaid)}</span></div>
                                <div className="flex justify-between font-bold text-lg border-t pt-1 mt-1"><span className="text-danger">Balance Due</span><span>{formatCurrency(selectedInvoiceForDetail.nettAmount - selectedInvoiceForDetail.paidAmount)}</span></div>
                            </div>
                            <div className="flex gap-2 mt-auto">
                                <button onClick={() => handlePrintInvoice(selectedInvoiceForDetail)} className="w-full bg-purple-100 text-purple-700 font-bold py-2 px-4 rounded-lg hover:bg-purple-200">Print</button>
                                <button onClick={() => handleEditInvoice(selectedInvoiceForDetail)} className="w-full bg-blue-100 text-blue-700 font-bold py-2 px-4 rounded-lg hover:bg-blue-200">Edit Invoice</button>
                            </div>
                        </div>
                    </div>
                </Modal>
            )}
            <PrintPreview />
        </div>
    );
};

export default SupplierInvoicesManager;
