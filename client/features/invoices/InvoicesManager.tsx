import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useNavigate, useLocation, Link } from 'react-router-dom';
import * as api from '../../services/api';
import { Buyer, Invoice, EntryItem, DraftItem, InvoiceItem, Product, Supplier, Entry, PaymentMethod, Feature, BuyerInvoicesAnalyticsData, CashFlowTransaction } from '../../types';
import { ICONS } from '../../constants';
import Card from '../../components/ui/Card';
import Modal from '../../components/ui/Modal';
import SearchableSelect from '../../components/ui/SearchableSelect';
import { useAuth, usePermissions } from '../../contexts/AuthContext';
import BuyerInvoicesAnalytics from './BuyerInvoicesAnalytics';
import Spinner from '../../components/ui/Spinner';
import Alert from '../../components/ui/Alert';
import Button from '../../components/ui/Button';
import { SortableTable, Column } from '../../components/ui/SortableTable';
import { formatDate, formatCurrency } from '../../utils/formatters';
import usePrintPreview from '../../hooks/usePrintPreview';
import InvoicePrintView from '../../components/print/InvoicePrintView';
// FIX: Added missing import
import { useLocalStorage } from '../../hooks/useLocalStorage';
import InvoiceForm, { PaymentFormEntry } from './InvoiceForm';

const InvoicesManager: React.FC = () => {
    const navigate = useNavigate();
    const location = useLocation();
    const { user } = useAuth();
    const { canView, canUpdate, canDelete, canCreate } = usePermissions();
    const { openPrintPreview, PrintPreview } = usePrintPreview();

    // Analytics Data
    const [analyticsData, setAnalyticsData] = useState<BuyerInvoicesAnalyticsData | null>(null);
    const [analyticsLoading, setAnalyticsLoading] = useState(true);

    // Global data
    const [buyers, setBuyers] = useState<Buyer[]>([]);
    const [products, setProducts] = useState<Product[]>([]);
    const [suppliers, setSuppliers] = useState<Supplier[]>([]);
    const [allEntries, setAllEntries] = useState<Entry[]>([]);
    const [allTransactions, setAllTransactions] = useState<CashFlowTransaction[]>([]);

    // Buyer-specific data
    const [selectedBuyer, setSelectedBuyer] = useState<Buyer | null>(null);
    const [draftItems, setDraftItems] = useState<DraftItem[]>([]);
    const [invoices, setInvoices] = useState<Invoice[]>([]);

    // Invoice form state
    const [selectedItemIds, setSelectedItemIds] = useState<Set<string>>(new Set());
    const [confirmedItems, setConfirmedItems] = useState<DraftItem[]>([]);
    const [editingInvoice, setEditingInvoice] = useState<Invoice | null>(null);
    const [wages, setWages] = useState<number | ''>('');
    const [adjustments, setAdjustments] = useState<number | ''>('');
    const [invoiceDate, setInvoiceDate] = useState<string>(new Date().toISOString().split('T')[0]);
    const [paymentEntries, setPaymentEntries] = useState<PaymentFormEntry[]>([]);

    // Change Buyer Modal State
    const [isChangeBuyerModalOpen, setIsChangeBuyerModalOpen] = useState(false);
    const [itemToChange, setItemToChange] = useState<DraftItem | null>(null);
    const [newBuyerIdForChange, setNewBuyerIdForChange] = useState<string | null>(null);

    // UI state
    const [loading, setLoading] = useState({ page: true, data: false });
    const [error, setError] = useState<string | null>(null);
    const [isInvoiceDetailModalOpen, setIsInvoiceDetailModalOpen] = useState(false);
    const [selectedInvoiceForDetail, setSelectedInvoiceForDetail] = useState<Invoice | null>(null);
    const [invoicePaymentHistory, setInvoicePaymentHistory] = useState<CashFlowTransaction[]>([]);
    const [isWagesInputVisible, setIsWagesInputVisible] = useState(false);
    const [isAdjustmentsInputVisible, setIsAdjustmentsInputVisible] = useState(false);
    const [hasExcludedWagesItems, setHasExcludedWagesItems] = useState(false);

    useEffect(() => {
        if (!canView(Feature.BuyerInvoices)) {
            navigate('/unauthorized', { replace: true });
        }
    }, [canView, navigate]);

    const getProductName = useCallback((id: string) => products.find(p => p.id === id)?.productName || 'N/A', [products]);
    const getSupplierName = useCallback((id: string) => suppliers.find(s => s.id === id)?.supplierName || 'N/A', [suppliers]);

    const resetInvoiceForm = useCallback(() => {
        setEditingInvoice(null);
        setConfirmedItems([]);
        setWages('');
        setAdjustments('');
        setInvoiceDate(new Date().toISOString().split('T')[0]);
        setPaymentEntries([]);
        setSelectedItemIds(new Set());
        setIsWagesInputVisible(false);
        setIsAdjustmentsInputVisible(false);
    }, []);

    const loadBuyerData = useCallback(async (buyerId: string, invoiceToViewId: string | null = null) => {
        const buyer = buyers.find(b => b.id === buyerId);
        if (!buyer) return;

        setSelectedBuyer(buyer);
        setLoading(l => ({ ...l, data: true }));
        setError(null);
        resetInvoiceForm();

        try {
            const [draftItemsData, invoicesData, updatedBuyerData, allEntriesData] = await Promise.all([
                api.fetchDraftItemsForBuyer(buyerId),
                api.fetchInvoicesForBuyer(buyerId),
                api.fetchBuyer(buyerId),
                api.fetchEntries(),
            ]);
            setDraftItems(draftItemsData);
            setInvoices(invoicesData);
            setSelectedBuyer(updatedBuyerData);
            setAllEntries(allEntriesData); // Keep all entries in sync

            if (invoiceToViewId) {
                const invoiceToView = invoicesData.find(inv => inv.id === invoiceToViewId);
                if (invoiceToView) {
                    setTimeout(() => handleOpenInvoiceDetailModal(invoiceToView), 0);
                }
            }

        } catch (e) {
            setError('Failed to load buyer data.');
        } finally {
            setLoading(l => ({ ...l, data: false }));
        }
    }, [buyers, resetInvoiceForm]);

    const handleBuyerChange = useCallback((buyerId: string, invoiceToViewId: string | null = null) => {
        if (buyerId) {
            loadBuyerData(buyerId, invoiceToViewId);
        } else {
            setSelectedBuyer(null);
            setDraftItems([]);
            setInvoices([]);
            resetInvoiceForm();
        }
    }, [loadBuyerData, resetInvoiceForm]);

    // Load static data and analytics once on page load
    useEffect(() => {
        const loadInitialData = async () => {
            setLoading(l => ({ ...l, page: true }));
            setAnalyticsLoading(true);
            try {
                const [buyerData, productData, supplierData, entryData, analytics, cashFlowData] = await Promise.all([
                    api.fetchBuyers(),
                    api.fetchProducts(),
                    api.fetchSuppliers(),
                    api.fetchEntries(),
                    api.fetchBuyerInvoicesAnalytics(),
                    api.fetchCashFlowTransactions(),
                ]);
                setBuyers(buyerData);
                setProducts(productData);
                setSuppliers(supplierData);
                setAllEntries(entryData);
                setAnalyticsData(analytics);
                setAllTransactions(cashFlowData);
            } catch (err) {
                setError("Failed to load initial page data.");
            } finally {
                setLoading(l => ({ ...l, page: false }));
                setAnalyticsLoading(false);
            }
        };
        loadInitialData();
    }, []);

    // Handle navigation with state for viewing
    useEffect(() => {
        const { buyerIdToLoad, invoiceIdToView } = location.state || {};
        if (buyerIdToLoad && buyers.length > 0) {
            handleBuyerChange(buyerIdToLoad, invoiceIdToView);
            navigate(location.pathname, { replace: true, state: {} });
        }
    }, [location.state, buyers, handleBuyerChange, navigate]);

    const handleOpenInvoiceDetailModal = (invoice: Invoice) => {
        setSelectedInvoiceForDetail(invoice);
        const payments = allTransactions.filter(t => t.relatedInvoiceIds?.includes(invoice.id));
        setInvoicePaymentHistory(payments);
        setIsInvoiceDetailModalOpen(true);
    };

    const handleSelectItem = (itemId: string) => {
        setSelectedItemIds(prev => {
            const newSet = new Set(prev);
            if (newSet.has(itemId)) newSet.delete(itemId);
            else newSet.add(itemId);
            return newSet;
        });
    };

    const handlePrepareInvoice = () => {
        if (selectedItemIds.size === 0) return;
        const itemsToConfirm = draftItems.filter(item => selectedItemIds.has(item.id));
        setConfirmedItems(itemsToConfirm);
    };

    const handleEditInvoice = useCallback((invoice: Invoice) => {
        resetInvoiceForm();
        setEditingInvoice(invoice);

        const invoiceItemIds = new Set(invoice.items.map(i => i.id));
        const itemsFromEntries: DraftItem[] = [];
        allEntries.forEach(entry => {
            entry.items.forEach(item => {
                if (invoiceItemIds.has(item.id)) {
                    itemsFromEntries.push({ ...item, entryId: entry.id, entrySerialNumber: entry.serialNumber, supplierId: entry.supplierId });
                }
            });
        });

        setConfirmedItems(itemsFromEntries);
        setWages(invoice.wages);
        setAdjustments(invoice.adjustments);
        setInvoiceDate(new Date(invoice.createdAt).toISOString().split('T')[0]);

        setIsWagesInputVisible(invoice.wages !== 0);
        setIsAdjustmentsInputVisible(invoice.adjustments !== 0);

        setIsInvoiceDetailModalOpen(false); // Close detail modal if it was open
    }, [allEntries, resetInvoiceForm]);

    const handleDeleteInvoice = useCallback(async (invoiceId: string) => {
        if (!user || !canDelete(Feature.BuyerInvoices)) return;
        if (window.confirm("Are you sure you want to delete this invoice and all its related payments? This action cannot be undone.")) {
            setLoading(l => ({ ...l, data: true }));
            try {
                await api.deleteInvoice(invoiceId, user);
                if (selectedBuyer) {
                    await loadBuyerData(selectedBuyer.id);
                }
            } catch (e) {
                setError("Failed to delete invoice.");
            } finally {
                setLoading(l => ({ ...l, data: false }));
                setIsInvoiceDetailModalOpen(false);
            }
        }
    }, [user, canDelete, selectedBuyer, loadBuyerData]);

    const handleAddPaymentEntry = () => setPaymentEntries(p => [...p, { id: `new_${Date.now()}`, amount: '', discount: '', method: PaymentMethod.Cash, reference: '' }]);
    const handleRemovePaymentEntry = (id: string) => setPaymentEntries(p => p.filter(entry => entry.id !== id));
    const handlePaymentEntryChange = (id: string, field: keyof PaymentFormEntry, value: any) => {
        setPaymentEntries(p => p.map(entry => entry.id === id ? { ...entry, [field]: value } : entry));
    };

    const handleSaveInvoice = async () => {
        if (!user || !selectedBuyer) return;

        const invoiceItems: InvoiceItem[] = confirmedItems.map(item => ({
            id: item.id,
            productId: item.productId,
            productName: getProductName(item.productId),
            quantity: item.quantity,
            nettWeight: item.nettWeight,
            ratePerQuantity: item.ratePerQuantity || 0,
            subTotal: item.subTotal,
        }));

        setLoading(l => ({ ...l, data: true }));

        try {
            // Prepare payments data
            const paymentsPayload = paymentEntries.map(p => ({
                amount: Number(p.amount) || 0,
                discount: Number(p.discount) || 0,
                method: p.method,
                reference: p.reference
            })).filter(p => p.amount > 0 || p.discount > 0);

            let savedInvoice: Invoice;
            if (editingInvoice) {
                // For updates, we might want to handle payments separately or differently.
                // Currently, this fix focuses on CREATION as per user request.
                // If editing, we generally just update invoice details. 
                // Adding payments during edit is usually done via the "Add Payment" feature individually, 
                // but if the UI allows it here, we should support it or warn.
                // The current UI binds paymentEntries to NEW payments.

                const payload: any = { // Use any to allow extra fields if needed, though update usually is stricter
                    ...editingInvoice,
                    items: invoiceItems,
                    totalQuantities: totalQuantity,
                    totalAmount: subTotal,
                    wages: Number(wages) || 0,
                    adjustments: Number(adjustments) || 0,
                    nettAmount: nettAmount,
                    createdAt: new Date(invoiceDate),
                    payments: paymentsPayload // Pass payments if backend supports adding them during update
                };
                savedInvoice = await api.updateInvoice(payload, user);
            } else {
                const payload: any = {
                    buyerId: selectedBuyer.id,
                    items: invoiceItems,
                    totalQuantities: totalQuantity,
                    totalAmount: subTotal,
                    wages: Number(wages) || 0,
                    adjustments: Number(adjustments) || 0,
                    nettAmount: nettAmount,
                    paidAmount: 0, // Backend will recalculate if payments allow
                    createdAt: new Date(invoiceDate),
                    payments: paymentsPayload // Send payments with creation
                };
                savedInvoice = await api.addInvoice(payload, user);
            }

            // Note: We removed the separate api.addIncome loop here because the backend now handles it.

            await loadBuyerData(selectedBuyer.id); // Reload all data for the buyer
            resetInvoiceForm();

        } catch (e) {
            setError("Failed to save invoice.");
        } finally {
            setLoading(l => ({ ...l, data: false }));
        }
    };

    const handlePrintInvoice = useCallback((invoiceToPrint: Invoice) => {
        if (selectedBuyer) {
            openPrintPreview(
                `Print Invoice ${invoiceToPrint.invoiceNumber}`,
                <InvoicePrintView invoice={invoiceToPrint} buyer={selectedBuyer} />
            );
        }
    }, [selectedBuyer, openPrintPreview]);

    const handleOpenChangeBuyerModal = (item: DraftItem) => {
        setItemToChange(item);
        setNewBuyerIdForChange(null);
        setIsChangeBuyerModalOpen(true);
    };
    const handleCloseChangeBuyerModal = () => {
        setItemToChange(null);
        setIsChangeBuyerModalOpen(false);
    };
    const handleConfirmChangeBuyer = async () => {
        if (!itemToChange || !newBuyerIdForChange || !user || !selectedBuyer) return;
        setLoading(l => ({ ...l, data: true }));
        setError(null);
        try {
            await api.changeBuyerForItem(itemToChange.entryId, itemToChange.id, newBuyerIdForChange, user);
            handleCloseChangeBuyerModal();
            await loadBuyerData(selectedBuyer.id); // Refresh current buyer's list
        } catch (err: any) {
            setError(`Failed to change buyer: ${err.message}`);
        } finally {
            setLoading(l => ({ ...l, data: false }));
        }
    };

    const totalQuantity = useMemo(() => confirmedItems.reduce((sum, item) => sum + Number(item.quantity || 0), 0), [confirmedItems]);
    const subTotal = useMemo(() => confirmedItems.reduce((sum, item) => sum + item.subTotal, 0), [confirmedItems]);
    const nettAmount = useMemo(() => subTotal + (Number(wages) || 0) + (Number(adjustments) || 0), [subTotal, wages, adjustments]);
    const newPaymentsTotal = useMemo(() => paymentEntries.reduce((sum, p) => sum + (Number(p.amount) || 0), 0), [paymentEntries]);
    const totalPaid = useMemo(() => (editingInvoice?.paidAmount || 0) + newPaymentsTotal, [editingInvoice, newPaymentsTotal]);
    const balanceDue = useMemo(() => nettAmount - totalPaid, [nettAmount, totalPaid]);

    useEffect(() => {
        if (!editingInvoice && confirmedItems.length > 0) {
            let wagesQty = 0;
            let excluded = false;
            confirmedItems.forEach(item => {
                const qty = Number(item.quantity || 0);
                const weight = item.nettWeight || 0;
                const avgWeight = qty > 0 ? weight / qty : 0;
                if (weight > 0 && avgWeight > 100) {
                    excluded = true;
                } else {
                    wagesQty += qty;
                }
            });
            setWages(wagesQty * 10);
            setHasExcludedWagesItems(excluded);
            setIsWagesInputVisible(true);
        }
    }, [editingInvoice, confirmedItems]);

    const uninvoicedItemsColumns: Column<DraftItem>[] = useMemo(() => [
        {
            key: 'select', header: <input type="checkbox" onChange={(e) => {
                if (e.target.checked) setSelectedItemIds(new Set(draftItems.map(item => item.id)));
                else setSelectedItemIds(new Set());
            }} />, accessor: (item) => <input type="checkbox" checked={selectedItemIds.has(item.id)} onChange={() => handleSelectItem(item.id)} />, className: "w-10 text-center"
        },
        { key: 'product', header: 'Product', accessor: (item) => getProductName(item.productId), sortable: true, sortAccessor: (item) => getProductName(item.productId) },
        { key: 'entry', header: 'Entry / Supplier', accessor: (item) => `${item.entrySerialNumber} (${getSupplierName(item.supplierId)})`, sortable: true, sortAccessor: 'entrySerialNumber' },
        { key: 'qty', header: 'Qty', accessor: 'quantity', sortable: true, className: 'text-right' },
        { key: 'rate', header: 'Rate', accessor: (item) => formatCurrency(item.ratePerQuantity || 0), sortable: true, sortAccessor: 'ratePerQuantity', className: 'text-right' },
        { key: 'amount', header: 'Amount', accessor: (item) => formatCurrency(item.subTotal), sortable: true, sortAccessor: 'subTotal', className: 'text-right font-semibold' },
        {
            key: 'actions',
            header: 'Actions',
            accessor: (item) => (
                canUpdate(Feature.Auction) ? (
                    <button
                        onClick={(e) => { e.stopPropagation(); handleOpenChangeBuyerModal(item); }}
                        className="p-1 text-blue-600 hover:bg-blue-100 rounded-full"
                        title="Change Buyer"
                    >
                        {React.cloneElement(ICONS.edit, { className: "h-4 w-4" })}
                    </button>
                ) : null
            ),
            className: "text-center"
        },
    ], [draftItems, selectedItemIds, getProductName, getSupplierName, canUpdate]);

    const [uninvoicedCols, setUninvoicedCols] = useLocalStorage<string[]>('table-cols-draft-items-buyer', uninvoicedItemsColumns.map(c => c.key));

    const invoiceHistoryColumns: Column<Invoice>[] = useMemo(() => [
        { key: 'invoiceNumber', header: 'Invoice #', accessor: (inv) => <span className="font-semibold text-primary hover:underline cursor-pointer" onClick={() => handleOpenInvoiceDetailModal(inv)}>{inv.invoiceNumber}</span>, sortable: true, sortAccessor: 'invoiceNumber' },
        { key: 'date', header: 'Date', accessor: (inv) => formatDate(inv.createdAt), sortable: true, sortAccessor: 'createdAt' },
        { key: 'amount', header: 'Amount', accessor: (inv) => formatCurrency(inv.nettAmount - (inv.discount || 0)), sortable: true, sortAccessor: 'nettAmount', className: 'text-right font-semibold' },
        { key: 'balance', header: 'Balance Due', accessor: (inv) => formatCurrency(inv.nettAmount - (inv.discount || 0) - inv.paidAmount), sortable: true, sortAccessor: (i) => i.nettAmount - (i.discount || 0) - i.paidAmount, className: 'text-right font-semibold text-danger' },
        {
            key: 'actions', header: 'Actions', className: 'text-right',
            accessor: (inv) => (
                <div className="flex items-center justify-end gap-2">
                    <Button size="sm" variant="ghost" onClick={(e) => { e.stopPropagation(); handlePrintInvoice(inv); }}>Print</Button>
                    {canUpdate(Feature.BuyerInvoices) && <Button size="sm" variant="secondary" onClick={(e) => { e.stopPropagation(); handleEditInvoice(inv); }}>Edit</Button>}
                    {canDelete(Feature.BuyerInvoices) && <Button size="sm" variant="danger" onClick={(e) => { e.stopPropagation(); handleDeleteInvoice(inv.id); }}>Delete</Button>}
                </div>
            )
        }
    ], [canUpdate, canDelete, handlePrintInvoice, handleEditInvoice, handleDeleteInvoice]);

    const [historyCols, setHistoryCols] = useLocalStorage<string[]>(`table-cols-buyer-history-${selectedBuyer?.id}`, invoiceHistoryColumns.map(c => c.key));


    const renderUninvoicedMobileCard = (item: DraftItem) => (
        <div className="p-4 space-y-2">
            <div className="flex justify-between items-start gap-2">
                <input type="checkbox" checked={selectedItemIds.has(item.id)} onChange={() => handleSelectItem(item.id)} className="mt-1" />
                <div className="flex-1">
                    <p className="font-bold text-dark">{getProductName(item.productId)}</p>
                    <p className="text-xs text-muted">{item.entrySerialNumber} ({getSupplierName(item.supplierId)})</p>
                </div>
                <div className="text-right">
                    <p className="font-semibold text-lg">{formatCurrency(item.subTotal)}</p>
                    <p className="text-xs text-muted">{item.quantity} Nos @ {formatCurrency(item.ratePerQuantity || 0)}</p>
                </div>
            </div>
            {canUpdate(Feature.Auction) && (
                <div className="flex justify-end pt-2 border-t">
                    <Button size="sm" variant="secondary" onClick={(e) => { e.stopPropagation(); handleOpenChangeBuyerModal(item); }}>Change Buyer</Button>
                </div>
            )}
        </div>
    );

    const renderHistoryMobileCard = (inv: Invoice) => (
        <div className="p-4 space-y-2">
            <div className="cursor-pointer" onClick={() => handleOpenInvoiceDetailModal(inv)}>
                <div className="flex justify-between items-start">
                    <div>
                        <p className="font-bold text-primary">{inv.invoiceNumber}</p>
                        <p className="text-xs text-muted">{formatDate(inv.createdAt)}</p>
                    </div>
                    <div className="text-right">
                        <p className="font-semibold">{formatCurrency(inv.nettAmount - (inv.discount || 0))}</p>
                        <p className="text-sm font-bold text-danger">Due: {formatCurrency(inv.nettAmount - (inv.discount || 0) - inv.paidAmount)}</p>
                    </div>
                </div>
            </div>
            <div className="flex justify-end items-center gap-2 pt-2 border-t border-border-color">
                <Button size="sm" variant="ghost" onClick={(e) => { e.stopPropagation(); handlePrintInvoice(inv); }}>Print</Button>
                {canUpdate(Feature.BuyerInvoices) && <Button size="sm" variant="secondary" onClick={(e) => { e.stopPropagation(); handleEditInvoice(inv); }}>Edit</Button>}
                {canDelete(Feature.BuyerInvoices) && <Button size="sm" variant="danger" onClick={(e) => { e.stopPropagation(); handleDeleteInvoice(inv.id); }}>Delete</Button>}
            </div>
        </div>
    );


    if (loading.page) return <div>Loading...</div>;

    const isFormVisible = confirmedItems.length > 0 || editingInvoice;

    return (
        <div className="space-y-6">
            <h1 className="text-3xl font-bold">Buyer Invoices</h1>
            <Card className="relative z-10">
                <div className="flex flex-col sm:flex-row sm:items-end gap-4">
                    <div className="flex-grow">
                        <label htmlFor="buyer-select" className="block text-sm font-medium text-muted mb-1">Select Buyer</label>
                        <SearchableSelect
                            options={buyers.map(b => ({ value: b.id, label: b.buyerName }))}
                            value={selectedBuyer?.id || null}
                            onChange={(val) => handleBuyerChange(val || '')}
                            placeholder="-- Choose a buyer to view invoices --"
                        />
                    </div>
                    {selectedBuyer && (
                        <div className="text-right flex-shrink-0">
                            <p className="text-sm text-muted">Outstanding Balance</p>
                            <p className={`text-xl font-bold ${selectedBuyer.outstanding > 0 ? 'text-danger' : 'text-success'}`}>{formatCurrency(selectedBuyer.outstanding)}</p>
                        </div>
                    )}
                </div>
            </Card>

            {!selectedBuyer ? (
                analyticsLoading ? <div className="flex justify-center p-10"><Spinner /></div> : analyticsData && <BuyerInvoicesAnalytics data={analyticsData} />
            ) : (
                <>
                    {isFormVisible ? (
                        <InvoiceForm
                            editingInvoice={editingInvoice}
                            confirmedItems={confirmedItems}
                            wages={wages}
                            adjustments={adjustments}
                            invoiceDate={invoiceDate}
                            paymentEntries={paymentEntries}
                            subTotal={subTotal}
                            totalQuantity={totalQuantity}
                            nettAmount={nettAmount}
                            balanceDue={balanceDue}
                            isWagesInputVisible={isWagesInputVisible}
                            isAdjustmentsInputVisible={isAdjustmentsInputVisible}
                            hasExcludedWagesItems={hasExcludedWagesItems}
                            loading={loading.data}
                            getProductName={getProductName}
                            getSupplierName={getSupplierName}
                            setWages={setWages}
                            setAdjustments={setAdjustments}
                            setInvoiceDate={setInvoiceDate}
                            setIsWagesInputVisible={setIsWagesInputVisible}
                            setIsAdjustmentsInputVisible={setIsAdjustmentsInputVisible}
                            resetInvoiceForm={resetInvoiceForm}
                            handleAddPaymentEntry={handleAddPaymentEntry}
                            handleRemovePaymentEntry={handleRemovePaymentEntry}
                            handlePaymentEntryChange={handlePaymentEntryChange}
                            handleSaveInvoice={handleSaveInvoice}
                        />
                    ) : (
                        // DRAFT SELECTION VIEW
                        <Card>
                            <h2 className="text-xl font-bold mb-2">Uninvoiced Items</h2>
                            {loading.data ? <p>Loading...</p> : draftItems.length > 0 ? (
                                <>
                                    <SortableTable columns={uninvoicedItemsColumns} data={draftItems} tableId="draft-items-buyer" loading={loading.data} renderMobileCard={renderUninvoicedMobileCard} visibleColumns={uninvoicedCols} onColumnToggle={(key) => setUninvoicedCols(prev => prev.includes(key) ? prev.filter(k => k !== key) : [...prev, key])} />
                                    <button onClick={handlePrepareInvoice} disabled={selectedItemIds.size === 0} className="mt-4 bg-primary text-white font-bold py-2 px-4 rounded-lg hover:bg-primary-hover disabled:bg-gray-400">
                                        Create Invoice for {selectedItemIds.size} selected items
                                    </button>
                                </>
                            ) : <p className="text-muted">No uninvoiced items found for this buyer.</p>}
                        </Card>
                    )}

                    <Card>
                        <h2 className="text-xl font-bold mb-2">Invoice History</h2>
                        <SortableTable
                            columns={invoiceHistoryColumns}
                            data={invoices}
                            tableId={`buyer-invoice-history-${selectedBuyer.id}`}
                            searchPlaceholder="Search Invoice History..."
                            loading={loading.data}
                            defaultSortField="balance"
                            renderMobileCard={renderHistoryMobileCard}
                            visibleColumns={historyCols}
                            onColumnToggle={(key) => setHistoryCols(prev => prev.includes(key) ? prev.filter(k => k !== key) : [...prev, key])}
                        />
                    </Card>
                </>
            )}

            <PrintPreview />

            {itemToChange && (
                <Modal isOpen={isChangeBuyerModalOpen} onClose={handleCloseChangeBuyerModal} title="Change Item Buyer">
                    <div className="space-y-4">
                        <p>Change buyer for item: <strong>{getProductName(itemToChange.productId)}</strong> from entry <strong>{itemToChange.entrySerialNumber}</strong>.</p>
                        <p className="text-sm text-muted">Current Buyer: {selectedBuyer?.buyerName}</p>
                        <div>
                            <label className="block text-sm font-medium text-muted mb-1">New Buyer</label>
                            <SearchableSelect
                                options={buyers.filter(b => b.id !== selectedBuyer?.id).map(b => ({ value: b.id, label: b.buyerName }))}
                                value={newBuyerIdForChange}
                                onChange={setNewBuyerIdForChange}
                                placeholder="Select a new buyer"
                            />
                        </div>
                        <div className="flex justify-end gap-2 pt-4">
                            <Button variant="secondary" onClick={handleCloseChangeBuyerModal}>Cancel</Button>
                            <Button onClick={handleConfirmChangeBuyer} disabled={!newBuyerIdForChange || loading.data} isLoading={loading.data}>
                                Confirm Change
                            </Button>
                        </div>
                    </div>
                </Modal>
            )}

            {selectedInvoiceForDetail && (
                <Modal isOpen={isInvoiceDetailModalOpen} onClose={() => setIsInvoiceDetailModalOpen(false)} title={`Invoice: ${selectedInvoiceForDetail.invoiceNumber}`} size="4xl">
                    <div>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div className="space-y-4">
                                <h3 className="font-bold">Items</h3>
                                <div className="space-y-2 max-h-80 overflow-y-auto pr-2">
                                    {selectedInvoiceForDetail.items.map(item => (
                                        <div key={item.id} className="p-2 bg-gray-50 rounded-md grid grid-cols-3 gap-2 text-sm">
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
                                    <div className="flex justify-between text-sm"><span className="text-muted">Sub-Total</span><span>{formatCurrency(selectedInvoiceForDetail.totalAmount)}</span></div>
                                    <div className="flex justify-between text-sm"><span className="text-muted">Wages</span><span>+ {formatCurrency(selectedInvoiceForDetail.wages)}</span></div>
                                    <div className="flex justify-between text-sm"><span className="text-muted">Adjustments</span><span>{selectedInvoiceForDetail.adjustments >= 0 ? '+' : '-'} {formatCurrency(Math.abs(selectedInvoiceForDetail.adjustments))}</span></div>
                                    <div className="flex justify-between font-bold border-t pt-1 mt-1"><span className="text-primary">Nett Amount</span><span>{formatCurrency(selectedInvoiceForDetail.nettAmount)}</span></div>
                                    <div className="flex justify-between text-sm"><span className="text-muted">Discount</span><span className="text-danger">- {formatCurrency(selectedInvoiceForDetail.discount)}</span></div>
                                    <div className="flex justify-between font-bold text-lg"><span className="text-primary">Final Amount</span><span>{formatCurrency(selectedInvoiceForDetail.nettAmount - selectedInvoiceForDetail.discount)}</span></div>
                                    <div className="flex justify-between text-sm"><span className="text-muted">Paid</span><span className="font-semibold text-success">{formatCurrency(selectedInvoiceForDetail.paidAmount)}</span></div>
                                    <div className="flex justify-between font-bold text-lg border-t pt-1 mt-1"><span className="text-danger">Balance Due</span><span>{formatCurrency(selectedInvoiceForDetail.nettAmount - selectedInvoiceForDetail.discount - selectedInvoiceForDetail.paidAmount)}</span></div>
                                </div>
                                <div className="flex gap-2 mt-auto">
                                    <button onClick={() => handlePrintInvoice(selectedInvoiceForDetail)} className="w-full bg-purple-100 text-purple-700 font-bold py-2 px-4 rounded-lg hover:bg-purple-200">Print</button>
                                </div>
                            </div>
                        </div>
                        <div className="mt-6 pt-4 border-t">
                            <h3 className="text-lg font-bold mb-2">Payment History</h3>
                            {invoicePaymentHistory.length > 0 ? (
                                <div className="overflow-x-auto">
                                    <table className="min-w-full text-sm">
                                        <thead className="bg-gray-100">
                                            <tr>
                                                <th className="p-2 text-left font-semibold">Date</th>
                                                <th className="p-2 text-left font-semibold">Description</th>
                                                <th className="p-2 text-left font-semibold">Method</th>
                                                <th className="p-2 text-right font-semibold">Amount</th>
                                                <th className="p-2 text-right font-semibold">Discount</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {invoicePaymentHistory.map(payment => (
                                                <tr key={payment.id} className="border-b">
                                                    <td className="p-2">{formatDate(payment.date)}</td>
                                                    <td className="p-2">{payment.description}</td>
                                                    <td className="p-2">{payment.method}</td>
                                                    <td className="p-2 text-right text-green-600 font-medium">{formatCurrency(payment.amount)}</td>
                                                    <td className="p-2 text-right text-orange-600 font-medium">{payment.discount ? formatCurrency(payment.discount) : '-'}</td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            ) : (
                                <p className="text-muted text-center p-4 bg-gray-50 rounded-md">No payments have been recorded for this invoice yet.</p>
                            )}
                        </div>
                    </div>
                </Modal>
            )}
        </div>
    );
};

export default InvoicesManager;
