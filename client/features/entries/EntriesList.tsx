import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Entry, EntryItem, EntryStatus, Product, Supplier, Feature } from '../../types';
import { fetchEntries, fetchProducts, fetchSuppliers, addEntry, updateEntry, deleteEntry, addSupplier, addProduct } from '../../services/api';
import Modal from '../../components/ui/Modal';
import { ICONS } from '../../constants';
import { useAuth, usePermissions } from '../../contexts/AuthContext';
import SearchableSelect from '../../components/ui/SearchableSelect';
import { SortableTable, Column } from '../../components/ui/SortableTable';
import { formatDate } from '../../utils/formatters';
import StatusChip from '../../components/ui/StatusChip';
import { useLocalStorage } from '../../hooks/useLocalStorage';
import Card from '../../components/ui/Card';
import DateRangePicker from '../../components/ui/DateRangePicker';
import StatCard from '../../components/ui/StatCard';


const initialItemState: Omit<EntryItem, 'id' | 'subTotal'> = {
  subSerialNumber: 0,
  productId: '',
  quantity: 0,
  grossWeight: 0,
  shuteWeight: 0,
  nettWeight: 0,
};

const EntriesList: React.FC = () => {
  const todayStr = new Date().toISOString().split('T')[0];
  const [entries, setEntries] = useState<Entry[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingEntry, setEditingEntry] = useState<Entry | null>(null);

  const [newEntrySupplier, setNewEntrySupplier] = useState('');
  const [newEntryItems, setNewEntryItems] = useState<(Omit<EntryItem, 'id' | 'subTotal'> & { hasWeight: boolean })[]>([{ ...initialItemState, hasWeight: false }]);

  const [isAddSupplierModalOpen, setIsAddSupplierModalOpen] = useState(false);
  const [newSupplierForm, setNewSupplierForm] = useState({ supplierName: '', contactNumber: '', place: '' });
  const [isAddingSupplier, setIsAddingSupplier] = useState(false);

  const [isAddProductModalOpen, setIsAddProductModalOpen] = useState(false);
  const [newProductForm, setNewProductForm] = useState({ productName: '', displayName: '' });
  const [isAddingProduct, setIsAddingProduct] = useState(false);
  const [addingProductForItemIndex, setAddingProductForItemIndex] = useState<number | null>(null);

  const [filters, setFilters] = useState({ startDate: todayStr, endDate: todayStr });
  const [duplicateError, setDuplicateError] = useState<{ message: string; existingEntryId: string } | null>(null);
  const [validationErrors, setValidationErrors] = useState<Set<number>>(new Set());

  const { user } = useAuth();
  const { canCreate, canUpdate, canDelete, canView } = usePermissions();
  const canManageSuppliers = canCreate(Feature.Suppliers);
  const canManageProducts = canCreate(Feature.Products);
  const canAuction = canUpdate(Feature.Auction);
  const canManageInvoices = canCreate(Feature.SupplierInvoices);

  const navigate = useNavigate();

  useEffect(() => {
    if (!canView(Feature.Entries)) {
      navigate('/unauthorized', { replace: true });
    }
  }, [canView, navigate]);

  const getSupplierName = useCallback((supplierId: string) => {
    return suppliers.find(s => s.id === supplierId)?.supplierName || 'N/A';
  }, [suppliers]);

  const getProductName = useCallback((productId: string) => {
    const product = products.find(p => p.id === productId);
    return product?.productName || 'N/A';
  }, [products]);

  const loadData = useCallback(() => {
    console.log('[DEBUG] EntriesList loadData called with filters:', filters);
    setLoading(true);
    return Promise.all([fetchEntries(filters), fetchProducts(), fetchSuppliers()])
      .then(([entryData, productData, supplierData]) => {
        console.log(`[DEBUG] EntriesList fetchEntries returned ${entryData.length} records`);
        setEntries(entryData);
        setProducts(productData);
        setSuppliers(supplierData);
      })
      .finally(() => setLoading(false));
  }, [filters]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleItemChange = (index: number, field: keyof Omit<EntryItem, 'id' | 'subTotal' | 'subSerialNumber'> | 'hasWeight', value: any) => {
    const updatedItems = [...newEntryItems];
    const item = { ...updatedItems[index] };

    if (field === 'hasWeight') {
      item.hasWeight = value;
      if (!value) {
        item.grossWeight = 0;
        item.shuteWeight = 0;
        item.nettWeight = 0;
      }
    } else {
      (item as any)[field] = value;
    }

    // Auto-calculate shute weight when gross weight changes
    if (field === 'grossWeight') {
      const grossWeightValue = Number(value) || 0;
      item.shuteWeight = Math.round(grossWeightValue * 0.05);
    }

    // If shute weight is manually entered, ensure it's an integer.
    if (field === 'shuteWeight') {
      item.shuteWeight = Math.round(Number(value) || 0);
    }

    item.nettWeight = (Number(item.grossWeight) || 0) - (Number(item.shuteWeight) || 0);

    updatedItems[index] = item;
    setNewEntryItems(updatedItems);
  };

  const addNewItem = () => {
    setNewEntryItems([...newEntryItems, { ...initialItemState, hasWeight: false }]);
  };

  const removeItem = (index: number) => {
    setNewEntryItems(newEntryItems.filter((_, i) => i !== index));
  };

  const resetForm = () => {
    setNewEntrySupplier('');
    setNewEntryItems([{ ...initialItemState, hasWeight: false }]);
    setEditingEntry(null);
  }

  const handleOpenModal = (entry: Entry | null) => {
    setValidationErrors(new Set()); // Reset validation on open
    if (entry) {
      if (!canUpdate(Feature.Entries)) return;
      setEditingEntry(entry);
      setNewEntrySupplier(entry.supplierId);
      setNewEntryItems(entry.items.map(i => ({ ...i, hasWeight: (i.nettWeight || 0) > 0 })));
    } else {
      if (!canCreate(Feature.Entries)) return;
      resetForm();
    }
    setIsModalOpen(true);
  }

  const handleCloseModal = () => {
    setIsModalOpen(false);
    resetForm();
    setValidationErrors(new Set()); // Reset validation on close
  }

  const handleOpenAddProductModal = (index: number) => {
    setAddingProductForItemIndex(index);
    setIsAddProductModalOpen(true);
  };

  const handleAddNewSupplier = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    if (!newSupplierForm.supplierName || !newSupplierForm.contactNumber) {
      alert('Supplier Name and Contact Number are required.');
      return;
    }
    setIsAddingSupplier(true);
    try {
      const newSupplier = await addSupplier(newSupplierForm, user);
      setSuppliers(prev => [...prev, newSupplier].sort((a, b) => a.supplierName.localeCompare(b.supplierName)));
      setNewEntrySupplier(newSupplier.id);
      setIsAddSupplierModalOpen(false);
      setNewSupplierForm({ supplierName: '', contactNumber: '', place: '' });
    } catch (error) {
      console.error("Failed to add supplier:", error);
      alert("Failed to add new supplier.");
    } finally {
      setIsAddingSupplier(false);
    }
  };

  const handleAddNewProduct = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    if (!newProductForm.productName) {
      alert('Product Name is required.');
      return;
    }
    if (addingProductForItemIndex === null) return;

    setIsAddingProduct(true);
    try {
      const newProduct = await addProduct(newProductForm, user);
      setProducts(prev => [...prev, newProduct].sort((a, b) => a.productName.localeCompare(b.productName)));

      const updatedItems = [...newEntryItems];
      updatedItems[addingProductForItemIndex].productId = newProduct.id;
      setNewEntryItems(updatedItems);

      setIsAddProductModalOpen(false);
      setNewProductForm({ productName: '', displayName: '' });
      setAddingProductForItemIndex(null);
    } catch (error) {
      console.error("Failed to add product:", error);
      alert("Failed to add new product.");
    } finally {
      setIsAddingProduct(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    const errors = new Set<number>();
    if (!newEntrySupplier) {
      alert('Supplier is required.');
      return;
    }
    if (newEntryItems.length === 0) {
      alert('At least one item is required.');
      return;
    }

    newEntryItems.forEach((item, index) => {
      if (!item.productId || Number(item.quantity) <= 0) {
        errors.add(index);
      }
    });

    if (errors.size > 0) {
      setValidationErrors(errors);
      alert('Please correct the highlighted items. All items must have a product and a quantity greater than 0.');
      return;
    }

    setValidationErrors(new Set()); // Clear errors before submission

    const processedItems = newEntryItems.map(({ hasWeight, ...item }) => ({
      ...item,
      id: (item as EntryItem).id || '',
      subTotal: 0
    }));

    const totalQuantities = processedItems.reduce((sum, item) => sum + Number(item.quantity), 0);

    setLoading(true);

    try {
      if (editingEntry) {
        const entryToUpdate: Omit<Entry, 'serialNumber' | 'createdAt'> = {
          id: editingEntry.id,
          supplierId: newEntrySupplier,
          items: processedItems,
          totalAmount: editingEntry.totalAmount,
          totalQuantities,
          status: editingEntry.status,
          lastSubSerialNumber: editingEntry.lastSubSerialNumber
        };
        await updateEntry(entryToUpdate, user);
      } else {
        const entryToAdd = {
          supplierId: newEntrySupplier,
          items: processedItems,
          totalAmount: 0,
          totalQuantities,
          status: EntryStatus.Pending
        };
        await addEntry(entryToAdd, user);
      }
      loadData();
      handleCloseModal();
    } catch (error: any) {
      if (error && error.existingEntryId) {
        setDuplicateError({ message: error.message, existingEntryId: error.existingEntryId });
      } else {
        console.error("Failed to save entry:", error);
        alert("Failed to save entry. Please try again.");
      }
      setLoading(false);
    }
  };

  const handleDelete = async (entryId: string) => {
    if (!canDelete(Feature.Entries) || !user) return;
    if (window.confirm('Are you sure you want to delete this entry? This action cannot be undone.')) {
      setLoading(true);
      try {
        await deleteEntry(entryId, user);
        loadData();
      } catch (error: any) {
        console.error("Failed to delete entry:", error);
        alert(`Failed to delete entry: ${error.message}`);
        setLoading(false);
      }
    }
  }

  const handleCreateInvoice = (entry: Entry) => {
    navigate('/supplier-invoices', {
      state: {
        supplierIdToLoad: entry.supplierId,
        entryIdToSelect: entry.id
      }
    });
  };

  const columns: Column<Entry>[] = useMemo(() => [
    { key: 'serialNumber', header: 'Serial No.', accessor: 'serialNumber', sortable: true, isDefault: true, className: 'font-semibold text-primary' },
    { key: 'supplierName', header: 'Supplier', accessor: (e) => getSupplierName(e.supplierId), sortAccessor: (e) => getSupplierName(e.supplierId), sortable: true, isDefault: true, className: 'font-medium text-dark' },
    {
      key: 'items',
      header: 'Items',
      isDefault: true,
      accessor: (entry) => (
        <table className="w-full text-xs">
          <tbody>
            {entry.items.map((item, idx) => (
              <tr key={item.id || `item-${idx}`}>
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
              </tr>
            ))}
          </tbody>
          <tfoot>
            <tr className="border-t"><td colSpan={2} className="pr-2 font-semibold text-dark pt-1">Total Qty</td><td className="text-right font-semibold text-dark pt-1">{entry.totalQuantities}</td></tr>
          </tfoot>
        </table>
      )
    },
    { key: 'status', header: 'Status', accessor: (e) => <StatusChip status={e.status} />, sortable: true, sortAccessor: 'status', isDefault: true },
    { key: 'createdAt', header: 'Date', accessor: (e) => formatDate(e.createdAt), sortable: true, sortAccessor: 'createdAt', isDefault: true },
    {
      key: 'actions',
      header: 'Actions',
      isDefault: true,
      className: 'text-right',
      accessor: (entry) => {
        const isActionable = entry.status !== EntryStatus.Invoiced && entry.status !== EntryStatus.Cancelled;
        const isDeletable = !entry.items.some(item => item.buyerId != null || item.ratePerQuantity != null);
        return (
          <div className="flex items-center gap-2 flex-wrap justify-end">
            {canAuction && <button onClick={(e) => { e.stopPropagation(); navigate(`/auction?serial=${entry.serialNumber}`); }} className="bg-yellow-100 text-yellow-700 hover:bg-yellow-200 text-xs font-bold py-1 px-2 rounded-md flex items-center gap-1 disabled:opacity-50 disabled:cursor-not-allowed" disabled={!isActionable}>
              {React.cloneElement(ICONS.auction, { className: "h-4 w-4" })} Auction
            </button>}
            {canManageInvoices && <button onClick={(e) => { e.stopPropagation(); handleCreateInvoice(entry); }} className="bg-blue-100 text-blue-700 hover:bg-blue-200 text-xs font-bold py-1 px-2 rounded-md flex items-center gap-1 disabled:opacity-50 disabled:cursor-not-allowed" disabled={!isActionable}>
              {React.cloneElement(ICONS.invoices, { className: "h-4 w-4" })} Invoice
            </button>}
            {canUpdate(Feature.Entries) && <button onClick={(e) => { e.stopPropagation(); handleOpenModal(entry); }} className="bg-gray-100 text-gray-700 hover:bg-gray-200 text-xs font-bold py-1 px-2 rounded-md flex items-center gap-1 disabled:opacity-50 disabled:cursor-not-allowed" disabled={!isActionable}>
              {React.cloneElement(ICONS.edit, { className: "h-4 w-4" })} Edit
            </button>}
            {canDelete(Feature.Entries) && (
              <button onClick={(e) => { e.stopPropagation(); handleDelete(entry.id); }} className="text-danger hover:text-red-700 p-1 rounded-full hover:bg-red-50 disabled:opacity-50 disabled:cursor-not-allowed" disabled={!isDeletable} title={isDeletable ? "Delete Entry" : "Cannot delete an entry with auctioned items."}>
                {React.cloneElement(ICONS.trash, { className: "h-4 w-4" })}
              </button>
            )}
          </div>
        )
      }
    }
  ], [getSupplierName, getProductName, navigate, canAuction, canManageInvoices, canUpdate, canDelete]);

  const [visibleColumns, setVisibleColumns] = useLocalStorage<string[]>('table-cols-entries-list', columns.filter(c => c.isDefault).map(c => c.key));

  const stats = useMemo(() => {
    return {
      total: entries.length,
      pending: entries.filter(e => e.status === EntryStatus.Pending).length,
      draft: entries.filter(e => e.status === EntryStatus.Draft).length,
      auctioned: entries.filter(e => e.status === EntryStatus.Auctioned).length,
    }
  }, [entries]);

  const renderMobileCard = (entry: Entry) => {
    const actionsColumn = columns.find(c => c.key === 'actions');
    const actionsContent = actionsColumn && typeof actionsColumn.accessor === 'function'
      ? actionsColumn.accessor(entry)
      : null;

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
          {entry.items.map((i, idx) => <div key={i.id || `mobile-item-${idx}`} className="flex justify-between"><span>{i.subSerialNumber}. {getProductName(i.productId)}</span><span>{i.quantity} Nos</span></div>)}
        </div>
        <div className="flex justify-end pt-2 border-t">
          {actionsContent}
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
      startLabel="From"
      endLabel="To"
    />
  );

  const addEntryButton = canCreate(Feature.Entries) && (
    <button onClick={() => handleOpenModal(null)} className="bg-primary text-white font-bold py-2 px-4 rounded-lg flex items-center gap-2 hover:bg-primary-hover transition-colors h-[42px] self-end">
      {ICONS.plus} Add Entry
    </button>
  );

  return (
    <div>
      <h1 className="text-3xl font-bold mb-6">Entries</h1>

      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <StatCard title="Total Entries" value={stats.total} icon={ICONS.entries} className="bg-blue-100 text-blue-800" />
        <StatCard title="Pending" value={stats.pending} icon={ICONS.auction} className="bg-yellow-100 text-yellow-800" />
        <StatCard title="Draft" value={stats.draft} icon={ICONS.edit} className="bg-orange-100 text-orange-800" />
        <StatCard title="Auctioned" value={stats.auctioned} icon={ICONS.invoices} className="bg-green-100 text-green-800" />
      </div>

      <SortableTable
        columns={columns}
        data={entries}
        tableId="entries-list"
        defaultSortField="createdAt"
        searchPlaceholder="Search Serial No. or Supplier..."
        renderMobileCard={renderMobileCard}
        loading={loading}
        customActions={<div className="flex items-end gap-2">{dateFilters}{addEntryButton}</div>}
        visibleColumns={visibleColumns}
        onColumnToggle={(key) => setVisibleColumns(prev => prev.includes(key) ? prev.filter(k => k !== key) : [...prev, key])}
      />

      <Modal isOpen={isModalOpen} onClose={handleCloseModal} title={editingEntry ? "Edit Entry" : "Add New Entry"} size="4xl">
        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label htmlFor="supplierId" className="block text-sm font-medium text-muted mb-1">Supplier</label>
            <SearchableSelect
              options={suppliers.map(s => ({ value: s.id, label: s.supplierName, subLabel: s.place }))}
              value={newEntrySupplier || null}
              onChange={(val) => setNewEntrySupplier(val || '')}
              placeholder="Select a supplier"
              onAddNew={canManageSuppliers ? () => setIsAddSupplierModalOpen(true) : undefined}
              addNewLabel="Add New Supplier"
            />
          </div>

          <div className="space-y-4">
            <h3 className="font-semibold text-lg border-b pb-2">Items</h3>
            {newEntryItems.map((item, index) => (
              <div key={index} className={`p-3 bg-gray-50 rounded-lg transition-all ${validationErrors.has(index) ? 'border-2 border-danger bg-red-50' : 'border-2 border-transparent'}`}>
                <div className="grid grid-cols-1 md:grid-cols-12 gap-3 items-end">
                  <div className="md:col-span-1 pt-6 font-bold text-muted text-center">{index + 1}.</div>
                  <div className="md:col-span-4">
                    <label className="text-xs text-muted mb-1 block">Product</label>
                    <SearchableSelect
                      options={products.map(p => ({ value: p.id, label: p.productName, subLabel: p.displayName }))}
                      value={item.productId || null}
                      onChange={(val) => handleItemChange(index, 'productId', val || '')}
                      placeholder="Select product"
                      onAddNew={canManageProducts ? () => handleOpenAddProductModal(index) : undefined}
                      addNewLabel="Add New Product"
                    />
                  </div>
                  <div className="md:col-span-2">
                    <label className="text-xs text-muted">Quantity (Nos)</label>
                    <input type="number" value={item.quantity} onChange={e => handleItemChange(index, 'quantity', Number(e.target.value))} className="mt-1 w-full p-2 border border-gray-300 rounded-md text-sm bg-white" required />
                  </div>
                  <div className="md:col-span-3 flex items-center self-end pb-1">
                    <input type="checkbox" id={`hasWeight-${index}`} checked={item.hasWeight} onChange={e => handleItemChange(index, 'hasWeight', e.target.checked)} className="h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary bg-white" />
                    <label htmlFor={`hasWeight-${index}`} className="ml-2 text-sm text-muted">Add Weight Details</label>
                  </div>
                  <div className="md:col-span-2 flex items-end justify-end">
                    {newEntryItems.length > 1 && (
                      <button type="button" onClick={() => removeItem(index)} className="text-danger hover:text-red-700 p-2 rounded-full hover:bg-red-100">
                        {React.cloneElement(ICONS.trash, { className: "h-5 w-5" })}
                      </button>
                    )}
                  </div>
                </div>
                {item.hasWeight && (
                  <div className="grid grid-cols-1 md:grid-cols-12 gap-3 items-end mt-2 pt-2 border-t">
                    <div className="md:col-span-5"></div>
                    <div className="md:col-span-2">
                      <label className="text-xs text-muted">Gross (Kg)</label>
                      <input type="number" step="any" value={item.grossWeight || ''} onChange={e => handleItemChange(index, 'grossWeight', Number(e.target.value))} className="mt-1 w-full p-2 border border-gray-300 rounded-md text-sm bg-white" />
                    </div>
                    <div className="md:col-span-2">
                      <label className="text-xs text-muted">Shute (Kg)</label>
                      <input type="number" value={item.shuteWeight || ''} onChange={e => handleItemChange(index, 'shuteWeight', Number(e.target.value))} className="mt-1 w-full p-2 border border-gray-300 rounded-md text-sm bg-white" />
                    </div>
                    <div className="md:col-span-3">
                      <label className="text-xs text-muted">Nett (Kg)</label>
                      <p className="font-semibold p-2">{item.nettWeight}</p>
                    </div>
                  </div>
                )}
              </div>
            ))}
            <button type="button" onClick={addNewItem} className="text-sm font-medium text-primary hover:text-primary-hover flex items-center gap-1">
              {ICONS.plus} Add Another Item
            </button>
          </div>

          <div className="flex justify-end pt-4 border-t">
            <button type="button" onClick={handleCloseModal} className="bg-gray-200 text-gray-800 font-bold py-2 px-4 rounded-lg mr-2 hover:bg-gray-300">Cancel</button>
            <button type="submit" className="bg-primary text-white font-bold py-2 px-4 rounded-lg hover:bg-primary-hover" disabled={loading}>{loading ? 'Saving...' : 'Save Entry'}</button>
          </div>
        </form>
      </Modal>

      <Modal isOpen={!!duplicateError} onClose={() => setDuplicateError(null)} title="Duplicate Entry Detected">
        {duplicateError && (
          <div className="space-y-4">
            <p className="text-muted">{duplicateError.message}</p>
            <div className="flex justify-end gap-2 pt-4 border-t">
              <button type="button" onClick={() => setDuplicateError(null)} className="bg-gray-200 text-gray-800 font-bold py-2 px-4 rounded-lg hover:bg-gray-300">Cancel</button>
              <button
                type="button"
                onClick={() => {
                  const existing = entries.find(e => e.id === duplicateError.existingEntryId);
                  if (existing) {
                    handleCloseModal(); // close the 'add' modal if it's open
                    setDuplicateError(null);
                    handleOpenModal(existing); // open the 'edit' modal
                  } else {
                    alert("Could not find the existing entry to edit. It might have been deleted. Please refresh.");
                    setDuplicateError(null);
                  }
                }}
                className="bg-primary text-white font-bold py-2 px-4 rounded-lg hover:bg-primary-hover"
              >
                Edit Existing Entry
              </button>
            </div>
          </div>
        )}
      </Modal>

      <Modal isOpen={isAddSupplierModalOpen} onClose={() => setIsAddSupplierModalOpen(false)} title="Add New Supplier">
        <form onSubmit={handleAddNewSupplier} className="space-y-4">
          <div>
            <label htmlFor="newSupplierName" className="block text-sm font-medium text-muted">Supplier Name</label>
            <input type="text" name="supplierName" id="newSupplierName" value={newSupplierForm.supplierName} onChange={e => setNewSupplierForm({ ...newSupplierForm, supplierName: e.target.value })} className="mt-1 block w-full px-3 py-2 bg-white border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-primary focus:border-primary" required />
          </div>
          <div>
            <label htmlFor="newSupplierContact" className="block text-sm font-medium text-muted">Contact Number</label>
            <input type="text" name="contactNumber" id="newSupplierContact" value={newSupplierForm.contactNumber} onChange={e => setNewSupplierForm({ ...newSupplierForm, contactNumber: e.target.value })} className="mt-1 block w-full px-3 py-2 bg-white border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-primary focus:border-primary" required />
          </div>
          <div>
            <label htmlFor="newSupplierPlace" className="block text-sm font-medium text-muted">Place</label>
            <input type="text" name="place" id="newSupplierPlace" value={newSupplierForm.place} onChange={e => setNewSupplierForm({ ...newSupplierForm, place: e.target.value })} className="mt-1 block w-full px-3 py-2 bg-white border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-primary focus:border-primary" />
          </div>
          <div className="flex justify-end pt-4">
            <button type="button" onClick={() => setIsAddSupplierModalOpen(false)} className="bg-gray-200 text-gray-800 font-bold py-2 px-4 rounded-lg mr-2 hover:bg-gray-300">Cancel</button>
            <button type="submit" className="bg-primary text-white font-bold py-2 px-4 rounded-lg hover:bg-primary-hover" disabled={isAddingSupplier}>{isAddingSupplier ? 'Adding...' : 'Add Supplier'}</button>
          </div>
        </form>
      </Modal>

      <Modal isOpen={isAddProductModalOpen} onClose={() => setIsAddProductModalOpen(false)} title="Add New Product">
        <form onSubmit={handleAddNewProduct} className="space-y-4">
          <div>
            <label htmlFor="newProductName" className="block text-sm font-medium text-muted">Product Name</label>
            <input type="text" name="productName" id="newProductName" value={newProductForm.productName} onChange={e => setNewProductForm({ ...newProductForm, productName: e.target.value })} className="mt-1 block w-full px-3 py-2 bg-white border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-primary focus:border-primary" required />
          </div>
          <div>
            <label htmlFor="newProductDisplayName" className="block text-sm font-medium text-muted">Display Name (Optional)</label>
            <input type="text" name="displayName" id="newProductDisplayName" value={newProductForm.displayName} onChange={e => setNewProductForm({ ...newProductForm, displayName: e.target.value })} className="mt-1 block w-full px-3 py-2 bg-white border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-primary focus:border-primary" />
          </div>
          <div className="flex justify-end pt-4">
            <button type="button" onClick={() => setIsAddProductModalOpen(false)} className="bg-gray-200 text-gray-800 font-bold py-2 px-4 rounded-lg mr-2 hover:bg-gray-300">Cancel</button>
            <button type="submit" className="bg-primary text-white font-bold py-2 px-4 rounded-lg hover:bg-primary-hover" disabled={isAddingProduct}>{isAddingProduct ? 'Adding...' : 'Add Product'}</button>
          </div>
        </form>
      </Modal>
    </div>
  );
};

export default EntriesList;
