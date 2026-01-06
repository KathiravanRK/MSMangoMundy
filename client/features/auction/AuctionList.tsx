import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { fetchEntries, fetchBuyers, fetchProducts, fetchSuppliers, updateEntry } from '../../services/api';
import { Entry, EntryItem, Buyer, Product, Supplier, EntryStatus, Feature } from '../../types';
import { ICONS } from '../../constants';
import Modal from '../../components/ui/Modal';
import { useAuth, usePermissions } from '../../contexts/AuthContext';
import SearchableSelect from '../../components/ui/SearchableSelect';
import { SortableTable, Column } from '../../components/ui/SortableTable';
import { formatDate, formatCurrency } from '../../utils/formatters';
import StatusChip from '../../components/ui/StatusChip';
import { useLocalStorage } from '../../hooks/useLocalStorage';
import Spinner from '../../components/ui/Spinner';
import Card from '../../components/ui/Card';
import DateRangePicker from '../../components/ui/DateRangePicker';
import StatCard from '../../components/ui/StatCard';

type AuctionableItem = EntryItem & {
    _id?: string;
    _isSaved?: boolean;
    _isSaving?: boolean;
    entryId?: string;
    entrySerialNumber?: string;
    hasWeight?: boolean;
};

type DisplayableAuctionItem = AuctionableItem;

type AuctionableEntry = Omit<Entry, 'items'> & {
    _id?: string;
    items: AuctionableItem[];
};

type DisplayableAuctionEntry = AuctionableEntry;

const initialAuctionItem: Omit<DisplayableAuctionItem, 'id' | 'subTotal'> = {
    subSerialNumber: 0,
    productId: '',
    quantity: 1,
    grossWeight: 0,
    shuteWeight: 0,
    nettWeight: 0,
    ratePerQuantity: 0,
    buyerId: undefined,
    _isSaved: false,
    _isSaving: false,
    hasWeight: false,
};

const validateItem = (item: AuctionableItem): Set<keyof AuctionableItem> => {
    const errors = new Set<keyof AuctionableItem>();
    if (!item.productId) errors.add('productId');
    if (!item.quantity || Number(item.quantity) <= 0) errors.add('quantity');
    if (item.ratePerQuantity === undefined || item.ratePerQuantity === null || Number(item.ratePerQuantity) <= 0) errors.add('ratePerQuantity');
    if (!item.buyerId) errors.add('buyerId');
    return errors;
};

const AuctionList = () => {
    const { user } = useAuth();
    const { canUpdate, canDelete } = usePermissions();
    const canManage = canUpdate(Feature.Auction, 'manage_items');
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const [searchParams] = useSearchParams();

    const [allEntries, setAllEntries] = useState<Entry[]>([]);
    const [buyers, setBuyers] = useState<Buyer[]>([]);
    const [products, setProducts] = useState<Product[]>([]);
    const [suppliers, setSuppliers] = useState<Supplier[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const [auctioningEntry, setAuctioningEntry] = useState<AuctionableEntry | null>(null);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [modalLoading, setModalLoading] = useState(false);
    const [validationErrors, setValidationErrors] = useState<Map<string, Set<string>>>(new Map());

    const todayStr = new Date().toISOString().split('T')[0];
    const [filters, setFilters] = useState({
        startDate: todayStr,
        endDate: todayStr
    });

    const loadData = useCallback(async () => {
        try {
            console.log('[DEBUG] AuctionList loadData called with filters:', filters);
            setLoading(true);
            const apiFilters = {
                startDate: filters.startDate,
                endDate: filters.endDate
            };

            const [entriesData, buyersData, productsData, suppliersData] = await Promise.all([
                fetchEntries(apiFilters),
                fetchBuyers(),
                fetchProducts(),
                fetchSuppliers()
            ]);
            console.log(`[DEBUG] AuctionList fetchEntries returned ${entriesData.length} records`);
            setAllEntries(entriesData);
            setBuyers(buyersData);
            setProducts(productsData);
            setSuppliers(suppliersData);
        } catch (err) {
            console.error(err);
            setError('Failed to load auction data.');
        } finally {
            setLoading(false);
        }
    }, [filters]);

    useEffect(() => {
        loadData();
    }, [loadData]);


    const getSupplierName = useCallback((id: string) => {
        const supplier = suppliers.find(s => s.id === id || (s as any)._id === id);
        return supplier?.supplierName || 'Unknown';
    }, [suppliers]);

    const getProductName = useCallback((id: string) => {
        const product = products.find(p => p.id === id || (p as any)._id === id);
        return product?.productName || 'Unknown';
    }, [products]);


    const handleOpenAuctionModal = useCallback((entry: Entry) => {
        const auctionItems: AuctionableItem[] = entry.items.map(item => ({
            ...item,
            _isSaved: !!item.buyerId,
            hasWeight: !!item.grossWeight
        }));
        setAuctioningEntry({ ...entry, items: auctionItems });
        setIsModalOpen(true);
        setValidationErrors(new Map());
    }, []);

    const handleCloseAuctionModal = () => {
        setIsModalOpen(false);
        setAuctioningEntry(null);
    };

    const handleItemUpdate = (itemId: string, field: keyof AuctionableItem | 'hasWeight', value: any) => {
        setAuctioningEntry(prev => {
            if (!prev) return null;
            return {
                ...prev,
                items: prev.items.map(item => {
                    if ((item._id || item.id) === itemId) {
                        const updated = { ...item, [field]: value };

                        // Auto-calculate nettWeight when grossWeight or shuteWeight changes
                        if (field === 'grossWeight' || field === 'shuteWeight') {
                            const gross = field === 'grossWeight' ? Number(value) || 0 : Number(updated.grossWeight) || 0;
                            const shute = field === 'shuteWeight' ? Number(value) || 0 : Number(updated.shuteWeight) || 0;
                            updated.nettWeight = gross - shute;
                        }

                        // Calculate subTotal based on weight or quantity
                        if (field === 'quantity' || field === 'ratePerQuantity' || field === 'grossWeight' || field === 'shuteWeight' || field === 'hasWeight') {
                            const rate = Number(updated.ratePerQuantity) || 0;
                            // If item has weight details, use nettWeight * rate, otherwise use quantity * rate
                            if (updated.hasWeight && (Number(updated.grossWeight) || 0) > 0) {
                                updated.subTotal = (Number(updated.nettWeight) || 0) * rate;
                            } else {
                                updated.subTotal = (Number(updated.quantity) || 0) * rate;
                            }
                        }

                        if (['productId', 'quantity', 'ratePerQuantity', 'buyerId', 'grossWeight', 'shuteWeight'].includes(field)) {
                            updated._isSaved = false;
                        }
                        return updated;
                    }
                    return item;
                })
            };
        });
    };

    const handleItemSave = async (itemId: string) => {
        if (!auctioningEntry) return;
        const item = auctioningEntry.items.find(i => (i._id || i.id) === itemId);
        if (!item) return;

        const errors = validateItem(item);
        if (errors.size > 0) {
            setValidationErrors(prev => new Map(prev).set(itemId, errors));
            return;
        }

        try {
            setModalLoading(true);
            const updatedItems = auctioningEntry.items.map(i => {
                // eslint-disable-next-line @typescript-eslint/no-unused-vars
                const { _isSaved, _isSaving, hasWeight, ...rest } = i;
                return rest;
            });

            const updatedEntry = { ...auctioningEntry, items: updatedItems };
            await updateEntry(updatedEntry, user);

            setAuctioningEntry(prev => {
                if (!prev) return null;
                return {
                    ...prev,
                    items: prev.items.map(i => (i._id || i.id) === itemId ? { ...i, _isSaved: true, _isSaving: false } : i)
                };
            });

            setAllEntries(prev => prev.map(e => e._id === auctioningEntry._id ? { ...e, items: updatedItems } : e));

        } catch (err) {
            console.error(err);
            alert('Failed to save item');
        } finally {
            setModalLoading(false);
        }
    };

    const handleRemoveItem = async (itemId: string) => {
        if (!auctioningEntry) return;
        if (!confirm('Are you sure you want to delete this item?')) return;

        try {
            setModalLoading(true);
            const updatedItems = auctioningEntry.items.filter(i => (i._id || i.id) !== itemId).map(i => {
                // eslint-disable-next-line @typescript-eslint/no-unused-vars
                const { _isSaved, _isSaving, hasWeight, ...rest } = i;
                return rest;
            });

            const updatedEntry = { ...auctioningEntry, items: updatedItems };
            await updateEntry(updatedEntry, user);

            setAuctioningEntry(prev => prev ? { ...prev, items: prev.items.filter(i => (i._id || i.id) !== itemId) } : null);
            setAllEntries(prev => prev.map(e => e._id === auctioningEntry._id ? { ...e, items: updatedItems } : e));
        } catch (err) {
            console.error(err);
            alert('Failed to delete item');
        } finally {
            setModalLoading(false);
        }
    };

    const handleAddItem = () => {
        setAuctioningEntry(prev => {
            if (!prev) return null;
            const newItem: AuctionableItem = {
                ...initialAuctionItem,
                id: `temp_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
                entryId: prev.id,
                entrySerialNumber: prev.serialNumber,
                subTotal: 0
            };
            return {
                ...prev,
                items: [...prev.items, newItem]
            };
        });
    };

    const columns = useMemo<Column<Entry>[]>(() => [
        { key: 'serialNumber', header: 'Serial No', accessor: 'serialNumber', sortable: true, isDefault: true, className: 'font-bold text-primary' },
        { key: 'supplier', header: 'Supplier', accessor: (e) => getSupplierName(e.supplierId), sortable: true, sortAccessor: (e) => getSupplierName(e.supplierId), isDefault: true },
        {
            key: 'items',
            header: 'Items Summary',
            accessor: (entry) => (
                <table className="w-full text-xs">
                    <tbody>
                        {entry.items.map((item, idx) => (
                            <tr key={item._id || item.id || `item-${idx}`}>
                                <td className="pr-2 py-0.5 w-8 font-bold text-muted">{item.subSerialNumber}.</td>
                                <td className="pr-2 truncate max-w-[120px] py-0.5">{getProductName(item.productId)}</td>
                                <td className="text-right py-0.5">
                                    <div>{item.quantity} Nos</div>
                                    {(item.grossWeight ?? 0) > 0 && (
                                        <div className="text-gray-500 text-[10px] whitespace-nowrap">
                                            {item.grossWeight} - {item.shuteWeight} = {item.nettWeight} kg
                                        </div>
                                    )}
                                </td>
                                <td className="text-right py-0.5 text-muted">
                                    x {formatCurrency(item.ratePerQuantity || 0)}
                                </td>
                                <td className="text-right py-0.5 font-medium">
                                    = {formatCurrency(item.subTotal || 0)}
                                </td>
                            </tr>
                        ))}
                    </tbody>
                    <tfoot>
                        <tr className="border-t">
                            <td colSpan={2} className="pr-2 font-semibold text-dark pt-1">Total</td>
                            <td className="text-right font-semibold text-dark pt-1">{entry.totalQuantities}</td>
                            <td className="text-right font-semibold text-dark pt-1"></td>
                            <td className="text-right font-semibold text-dark pt-1">{formatCurrency(entry.totalAmount)}</td>
                        </tr>
                    </tfoot>
                </table>
            ),
            isDefault: true
        },
        { key: 'totalAmount', header: 'Total Amount', accessor: (e) => formatCurrency(e.totalAmount), sortable: true, sortAccessor: 'totalAmount', isDefault: true, className: 'text-right font-semibold' },
        { key: 'status', header: 'Status', accessor: (e) => <StatusChip status={e.status} />, sortable: true, sortAccessor: 'status', isDefault: true },
        { key: 'createdAt', header: 'Date', accessor: (e) => formatDate(e.createdAt), sortable: true, sortAccessor: 'createdAt', isDefault: true },
        {
            key: 'action', header: 'Action', isDefault: true, className: 'text-center',
            accessor: (entry) => {
                const isActionable = entry.status !== EntryStatus.Invoiced && entry.status !== EntryStatus.Cancelled;
                return (
                    <div className="flex items-center justify-center gap-2">
                        <button onClick={(e) => { e.stopPropagation(); handleOpenAuctionModal(entry); }} className="bg-primary-light text-primary font-bold py-2 px-4 rounded-lg flex items-center gap-2 hover:bg-blue-200 transition-colors text-xs disabled:opacity-50 disabled:cursor-not-allowed" disabled={!isActionable}>
                            {ICONS.auction} {entry.status === EntryStatus.Pending ? 'Start Auction' : 'View / Edit'}
                        </button>
                    </div>
                )
            }
        }
    ], [getSupplierName, getProductName, handleOpenAuctionModal]);

    const [visibleColumns, setVisibleColumns] = useLocalStorage<string[]>('table-cols-auction-list', columns.filter(c => c.isDefault).map(c => c.key));

    const stats = useMemo(() => {
        return {
            pendingAuction: allEntries.filter(e => e.status === EntryStatus.Pending).length,
            auctionedValue: allEntries.flatMap(e => e.items).filter(i => i.buyerId).reduce((sum, i) => sum + i.subTotal, 0),
            uninvoicedItems: allEntries.flatMap(e => e.items).filter(i => i.buyerId && !i.invoiceId).length,
            totalQuantity: allEntries.reduce((sum, e) => sum + e.totalQuantities, 0),
        }
    }, [allEntries]);

    const renderMobileCard = (entry: Entry) => {
        const isActionable = entry.status !== EntryStatus.Invoiced && entry.status !== EntryStatus.Cancelled;
        const uniqueProducts = [...new Set(entry.items.map(i => getProductName(i.productId)))];
        return (
            <div className="p-4 space-y-2">
                <div className="flex justify-between items-start">
                    <div>
                        <p className="font-bold text-primary">{entry.serialNumber}</p>
                        <p className="text-sm font-medium">{getSupplierName(entry.supplierId)}</p>
                        <p className="text-xs text-muted">{formatDate(entry.createdAt)}</p>
                    </div>
                    <StatusChip status={entry.status} />
                </div>
                <div className="text-xs text-muted border-t pt-2">
                    {entry.items.map((i, idx) => (
                        <div key={i._id || i.id || `mobile-item-${idx}`} className="flex justify-between items-center py-1 border-b border-dashed last:border-0">
                            <div className="flex flex-col">
                                <span className="font-medium text-xs">{i.subSerialNumber}. {getProductName(i.productId)}</span>
                                <span className="text-[10px] text-muted">{i.quantity} x {formatCurrency(i.ratePerQuantity || 0)}</span>
                            </div>
                            <span className="text-xs font-medium">{formatCurrency(i.subTotal || 0)}</span>
                        </div>
                    ))}
                </div>
                <div className="text-sm flex justify-between items-center border-t pt-2">
                    <span className="text-muted">Total: <span className="font-semibold text-dark">{formatCurrency(entry.totalAmount)}</span></span>
                    <button
                        onClick={(e) => { e.stopPropagation(); handleOpenAuctionModal(entry); }}
                        className="bg-primary-light text-primary font-bold py-1 px-3 rounded-lg flex items-center gap-2 hover:bg-blue-200 transition-colors text-xs disabled:opacity-50 disabled:cursor-not-allowed"
                        disabled={!isActionable}
                    >
                        {React.cloneElement(ICONS.auction, { className: "h-4 w-4" })} {entry.status === EntryStatus.Pending ? 'Start' : 'View'}
                    </button>
                </div>
            </div>
        );
    };

    const dateFilters = (
        <DateRangePicker
            startDate={filters.startDate}
            endDate={filters.endDate}
            onStartDateChange={date => setFilters(f => ({ ...f, startDate: date }))}
            onEndDateChange={date => setFilters(f => ({ ...f, endDate: date }))}
            startLabel="From Date"
            endLabel="To Date"
        />
    );

    const currentTotalAmount = useMemo(() => {
        if (!auctioningEntry) return 0;
        return auctioningEntry.items.reduce((sum, item) => sum + (item.subTotal || 0), 0);
    }, [auctioningEntry]);

    if (error) return <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded-lg" role="alert">{error}</div>;

    return (
        <div>
            <h1 className="text-3xl font-bold mb-6">Auction Floor</h1>

            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4 mb-6">
                <StatCard title="Pending Auction" value={stats.pendingAuction} icon={ICONS.auction} className="bg-orange-100 text-orange-800" />
                <StatCard title="Auctioned Value" value={formatCurrency(stats.auctionedValue)} icon={ICONS.cash} className="bg-green-100 text-green-800" />
                <StatCard title="Uninvoiced Items" value={stats.uninvoicedItems.toLocaleString('en-IN')} icon={ICONS.invoices} className="bg-blue-100 text-blue-800" />
                <StatCard title="Total Quantity (Nos)" value={stats.totalQuantity.toLocaleString('en-IN')} icon={ICONS.products} className="bg-purple-100 text-purple-800" />
            </div>

            <SortableTable<Entry>
                columns={columns}
                data={allEntries}
                tableId="auction-list"
                defaultSortField="createdAt"
                searchPlaceholder="Search Serial No. or Supplier..."
                onRowClick={(entry) => {
                    const isActionable = entry.status !== EntryStatus.Invoiced && entry.status !== EntryStatus.Cancelled;
                    if (isActionable) handleOpenAuctionModal(entry);
                }}
                loading={loading}
                customActions={dateFilters}
                renderMobileCard={renderMobileCard}
                visibleColumns={visibleColumns}
                onColumnToggle={(key) => setVisibleColumns(prev => prev.includes(key) ? prev.filter(k => k !== key) : [...prev, key])}
            />

            {auctioningEntry && (
                <Modal isOpen={isModalOpen} onClose={handleCloseAuctionModal} title={`Auction: ${auctioningEntry.serialNumber}`} size="6xl">
                    <div className="relative">
                        {modalLoading && (
                            <div className="absolute inset-0 bg-white/70 backdrop-blur-sm flex items-center justify-center z-50 rounded-lg">
                                <Spinner size="lg" />
                            </div>
                        )}
                        <div className="space-y-6">
                            <div className='p-4 bg-gray-50 rounded-lg flex justify-between items-start'>
                                <div>
                                    <p className='text-muted'>Supplier: <span className='font-semibold text-dark'>{getSupplierName(auctioningEntry.supplierId)}</span></p>
                                    <p className='text-muted'>Date: {new Date(auctioningEntry.createdAt).toLocaleDateString()}</p>
                                </div>
                                <div className='text-right'>
                                    <StatusChip status={auctioningEntry.status} />
                                    <p className='text-lg font-medium text-muted mt-2'>Total Amount:</p>
                                    <p className='text-3xl font-bold text-primary'>{formatCurrency(currentTotalAmount)}</p>
                                </div>
                            </div>
                            <div className="overflow-x-auto hidden lg:block">
                                <table className="min-w-full divide-y divide-gray-200">
                                    <thead className="bg-gray-50">
                                        <tr>
                                            <th className="p-2 text-center text-xs font-medium text-muted uppercase tracking-wider w-12">SS#</th>
                                            <th className="p-2 text-left text-xs font-medium text-muted uppercase tracking-wider w-[20%]">Product</th>
                                            <th className="p-2 text-left text-xs font-medium text-muted uppercase tracking-wider w-24">Qty (Nos)</th>
                                            <th className="p-2 text-left text-xs font-medium text-muted uppercase tracking-wider w-48">Weight (Kg)</th>
                                            <th className="p-2 text-left text-xs font-medium text-muted uppercase tracking-wider w-32">Rate</th>
                                            <th className="p-2 text-left text-xs font-medium text-muted uppercase tracking-wider w-[20%]">Buyer</th>
                                            <th className="p-2 text-right text-xs font-medium text-muted uppercase tracking-wider">Sub-Total</th>
                                            <th className="p-2 text-center text-xs font-medium text-muted uppercase tracking-wider w-28">Action</th>
                                        </tr>
                                    </thead>
                                    <tbody className="bg-white divide-y divide-gray-200">
                                        {auctioningEntry.items.map((item) => {
                                            const itemId = item._id || item.id;
                                            const itemErrors = validationErrors.get(itemId);
                                            return (
                                                <tr key={itemId} className={item._isSaved ? 'bg-green-50' : 'hover:bg-gray-50'}>
                                                    <td className="p-2 align-top text-center font-semibold text-muted">{item.subSerialNumber}</td>
                                                    <td className="p-2 align-top">
                                                        <div className={itemErrors?.has('productId') ? 'border-2 border-red-500 rounded-md' : ''}>
                                                            <SearchableSelect
                                                                options={products.map(p => ({ value: p.id, label: p.displayName || p.productName, subLabel: p.displayName ? p.productName : undefined }))}
                                                                value={item.productId || null}
                                                                onChange={val => handleItemUpdate(itemId, 'productId', val)}
                                                                placeholder="Select Product"
                                                                disabled={auctioningEntry.status === EntryStatus.Invoiced || item._isSaving || !canManage || modalLoading}
                                                            />
                                                        </div>
                                                    </td>
                                                    <td className="p-2 align-top"><input type="number" value={item.quantity} onChange={e => handleItemUpdate(itemId, 'quantity', Number(e.target.value))} className={`w-full p-2 border rounded-md text-sm bg-white ${itemErrors?.has('quantity') ? 'border-red-500' : 'border-gray-300'}`} placeholder="Qty" disabled={auctioningEntry.status === EntryStatus.Invoiced || item._isSaving || !canManage || modalLoading} /></td>
                                                    <td className="p-2 align-top">
                                                        <div className="flex items-start gap-2">
                                                            <input type="checkbox" id={`hasWeight-${itemId}`} checked={item.hasWeight} onChange={e => handleItemUpdate(itemId, 'hasWeight', e.target.checked)} className="h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary bg-white mt-1" disabled={auctioningEntry.status === EntryStatus.Invoiced || item._isSaving || !canManage || modalLoading} />
                                                            {item.hasWeight && (
                                                                <div className="grid grid-cols-3 gap-1">
                                                                    <input type="number" step="any" value={item.grossWeight || ''} onChange={e => handleItemUpdate(itemId, 'grossWeight', Number(e.target.value))} className="w-full p-1 border border-gray-300 rounded-md text-xs bg-white" placeholder="Gross" />
                                                                    <input type="number" step="any" value={item.shuteWeight || ''} onChange={e => handleItemUpdate(itemId, 'shuteWeight', Number(e.target.value))} className="w-full p-1 border border-gray-300 rounded-md text-xs bg-white" placeholder="Shute" />
                                                                    <input type="number" step="any" value={item.nettWeight || ''} disabled className="w-full p-1 border border-gray-300 rounded-md text-xs bg-gray-100" placeholder="Nett" />
                                                                </div>
                                                            )}
                                                        </div>
                                                    </td>
                                                    <td className="p-2 align-top"><input type="number" step="any" value={item.ratePerQuantity || ''} onChange={e => handleItemUpdate(itemId, 'ratePerQuantity', Number(e.target.value))} className={`w-full p-2 border rounded-md text-sm bg-white ${itemErrors?.has('ratePerQuantity') ? 'border-red-500' : 'border-gray-300'}`} placeholder="Rate" disabled={auctioningEntry.status === EntryStatus.Invoiced || item._isSaving || !canManage || modalLoading} /></td>
                                                    <td className="p-2 align-top">
                                                        <div className={itemErrors?.has('buyerId') ? 'border-2 border-red-500 rounded-md' : ''}>
                                                            <SearchableSelect
                                                                options={buyers.map(b => ({ value: b.id, label: b.buyerName, subLabel: b.tokenNumber }))}
                                                                value={item.buyerId || null}
                                                                onChange={val => handleItemUpdate(itemId, 'buyerId', val)}
                                                                placeholder="Select Buyer"
                                                                disabled={auctioningEntry.status === EntryStatus.Invoiced || item._isSaving || !canManage || modalLoading}
                                                            />
                                                        </div>
                                                    </td>
                                                    <td className="p-2 align-top text-right font-semibold">{formatCurrency(item.subTotal)}</td>
                                                    <td className="p-2 align-top text-center">
                                                        <div className="flex flex-col items-center gap-1">
                                                            <button onClick={() => handleItemSave(itemId)} disabled={item._isSaved || item._isSaving || !canManage || modalLoading} className="bg-green-100 text-green-700 hover:bg-green-200 text-xs font-bold py-1 px-2 rounded-md flex items-center gap-1 disabled:opacity-50 disabled:cursor-not-allowed w-full justify-center">
                                                                {item._isSaving ? <Spinner size="sm" /> : (item._isSaved ? 'Saved' : 'Save')}
                                                            </button>
                                                            {canDelete(Feature.Auction) && (
                                                                <button onClick={() => handleRemoveItem(itemId)} disabled={item._isSaving || modalLoading} className="text-danger hover:text-red-700 p-1 rounded-full hover:bg-red-50 disabled:opacity-50">
                                                                    {React.cloneElement(ICONS.trash, { className: "h-4 w-4" })}
                                                                </button>
                                                            )}
                                                        </div>
                                                    </td>
                                                </tr>
                                            )
                                        })}
                                    </tbody>
                                </table >
                            </div >
                            <div className="lg:hidden space-y-4 mt-4">
                                {auctioningEntry.items.map((item) => {
                                    const itemId = item._id || item.id;
                                    const itemErrors = validationErrors.get(itemId);
                                    return (
                                        <div key={itemId} className={`p-4 rounded-lg ${item._isSaved ? 'bg-green-50' : 'bg-gray-50'}`}>
                                            <h4 className="font-semibold text-dark mb-2">Item #{item.subSerialNumber}</h4>
                                            <div className="grid grid-cols-2 gap-4">
                                                <div className="col-span-2">
                                                    <label className="text-xs text-muted">Product</label>
                                                    <div className={itemErrors?.has('productId') ? 'border-2 border-red-500 rounded-md' : ''}>
                                                        <SearchableSelect options={products.map(p => ({ value: p.id, label: p.displayName || p.productName, subLabel: p.displayName ? p.productName : undefined }))} value={item.productId || null} onChange={val => handleItemUpdate(itemId, 'productId', val)} placeholder="Select Product" disabled={auctioningEntry.status === EntryStatus.Invoiced || item._isSaving || !canManage || modalLoading} />
                                                    </div>
                                                </div>
                                                <div><label className="text-xs text-muted">Quantity</label><input type="number" value={item.quantity} onChange={e => handleItemUpdate(itemId, 'quantity', Number(e.target.value))} className={`w-full p-2 border rounded-md text-sm bg-white ${itemErrors?.has('quantity') ? 'border-red-500' : 'border-gray-300'}`} disabled={auctioningEntry.status === EntryStatus.Invoiced || item._isSaving || !canManage || modalLoading} /></div>
                                                <div><label className="text-xs text-muted">Rate</label><input type="number" step="any" value={item.ratePerQuantity || ''} onChange={e => handleItemUpdate(itemId, 'ratePerQuantity', Number(e.target.value))} className={`w-full p-2 border rounded-md text-sm bg-white ${itemErrors?.has('ratePerQuantity') ? 'border-red-500' : 'border-gray-300'}`} disabled={auctioningEntry.status === EntryStatus.Invoiced || item._isSaving || !canManage || modalLoading} /></div>
                                                <div className="col-span-2"><label className="text-xs text-muted">Buyer</label>
                                                    <div className={itemErrors?.has('buyerId') ? 'border-2 border-red-500 rounded-md' : ''}>
                                                        <SearchableSelect options={buyers.map(b => ({ value: b.id, label: b.buyerName }))} value={item.buyerId || null} onChange={val => handleItemUpdate(itemId, 'buyerId', val)} placeholder="Select Buyer" disabled={auctioningEntry.status === EntryStatus.Invoiced || item._isSaving || !canManage || modalLoading} />
                                                    </div>
                                                </div>
                                                <div className="col-span-2 font-bold text-right text-lg">{formatCurrency(item.subTotal)}</div>
                                            </div>
                                            <div className="flex justify-end items-center gap-2 mt-2 pt-2 border-t">
                                                {canDelete(Feature.Auction) && (<button onClick={() => handleRemoveItem(itemId)} disabled={item._isSaving || modalLoading} className="text-danger p-2">{ICONS.trash}</button>)}
                                                <button onClick={() => handleItemSave(itemId)} disabled={item._isSaved || item._isSaving || !canManage || modalLoading} className="bg-green-500 text-white font-bold py-2 px-4 rounded-lg flex-1 disabled:bg-gray-400">{item._isSaving ? 'Saving...' : (item._isSaved ? 'Saved' : 'Save Item')}</button>
                                            </div>
                                        </div>
                                    )
                                })}
                            </div>
                            <div className="flex justify-between items-center mt-6 pt-4 border-t">
                                {canManage && (
                                    <button type="button" onClick={handleAddItem} disabled={modalLoading} className="text-sm font-medium text-primary hover:text-primary-hover flex items-center gap-1 disabled:opacity-50">
                                        {ICONS.plus} Add Another Item
                                    </button>
                                )}
                                <div className="flex gap-2">
                                    <button type="button" onClick={handleCloseAuctionModal} disabled={modalLoading} className="bg-gray-200 text-gray-800 font-bold py-2 px-4 rounded-lg hover:bg-gray-300 disabled:opacity-50">Close</button>
                                </div>
                            </div>
                        </div >
                    </div >
                </Modal >
            )}
        </div >
    );
};

export default AuctionList;
