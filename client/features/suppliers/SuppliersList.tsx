import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Supplier, Feature } from '../../types';
import * as api from '../../services/api';
import { useAuth, usePermissions } from '../../contexts/AuthContext';
import { formatCurrency } from '../../utils/formatters';
import useDialog from '../../hooks/useDialog';
import { useLocalStorage } from '../../hooks/useLocalStorage';

// UI Components
import PageHeader from '../../components/ui/PageHeader';
import Button from '../../components/ui/Button';
import SupplierForm from './SupplierForm';
import { ICONS } from '../../constants';
import Alert from '../../components/ui/Alert';
import { SortableTable, Column } from '../../components/ui/SortableTable';
import SupplierPaymentModal from '../reports/components/SupplierPaymentModal';

const SuppliersList: React.FC = () => {
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [editingSupplier, setEditingSupplier] = useState<Supplier | null>(null);
  const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);
  const [payingSupplier, setPayingSupplier] = useState<Supplier | null>(null);

  const { isOpen, open, close } = useDialog();
  const { user } = useAuth();
  const { canView, canCreate, canUpdate, canDelete } = usePermissions();
  const navigate = useNavigate();

  useEffect(() => {
    if (!canView(Feature.Suppliers)) {
      navigate('/unauthorized', { replace: true });
    }
  }, [canView, navigate]);

  const loadSuppliers = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await api.fetchSuppliers();
      setSuppliers(data);
    } catch (err) {
      setError('Failed to fetch suppliers.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadSuppliers();
  }, [loadSuppliers]);

  const handleOpenModal = useCallback((supplier: Supplier | null = null) => {
    setEditingSupplier(supplier);
    open();
  }, [open]);

  const handleOpenPaymentModal = useCallback((supplier: Supplier) => {
    setPayingSupplier(supplier);
    setIsPaymentModalOpen(true);
  }, []);

  const handleCloseModal = () => {
    setEditingSupplier(null);
    close();
  };

  const handleSuccess = () => {
    handleCloseModal();
    loadSuppliers();
  };

  const handlePaymentSuccess = () => {
    setIsPaymentModalOpen(false);
    loadSuppliers();
  };

  const handleDelete = useCallback(async (supplierId: string) => {
    if (!user || !canDelete(Feature.Suppliers)) return;
    if (window.confirm('Are you sure you want to delete this supplier? This action cannot be undone.')) {
      try {
        await api.deleteSupplier(supplierId, user);
        loadSuppliers();
      } catch (err: any) {
        alert(`Failed to delete supplier: ${err.message}`);
      }
    }
  }, [user, canDelete, loadSuppliers]);

  const allColumns: Column<Supplier>[] = useMemo(() => [
    {
      key: 'supplierName',
      header: 'Supplier Name',
      accessor: (item) => <span className="truncate block max-w-xs" title={item.supplierName}>{item.supplierName}</span>,
      sortAccessor: 'supplierName',
      sortable: true,
      isDefault: true,
    },
    { key: 'contactNumber', header: 'Contact', accessor: 'contactNumber', isDefault: true },
    { key: 'place', header: 'Place', accessor: 'place', sortable: true },
    {
      key: 'outstanding',
      header: 'Outstanding',
      accessor: (item) => formatCurrency(item.outstanding),
      sortable: true,
      isDefault: true,
      className: 'text-right font-semibold',
    },
    {
      key: 'actions',
      header: 'Actions',
      isDefault: true,
      className: 'text-right',
      accessor: (item) => (
        <div className="flex items-center justify-end gap-2">
          <Button size="sm" variant="secondary" onClick={(e) => { e.stopPropagation(); handleOpenPaymentModal(item); }}>Pay</Button>
          {canUpdate(Feature.Suppliers) && <Button size="sm" variant="ghost" onClick={(e) => { e.stopPropagation(); handleOpenModal(item); }}>Edit</Button>}
          {canDelete(Feature.Suppliers) && <Button size="sm" variant="danger" onClick={(e) => { e.stopPropagation(); handleDelete(item.id); }}>Delete</Button>}
        </div>
      ),
    },
  ], [canUpdate, canDelete, handleOpenModal, handleOpenPaymentModal, handleDelete]);

  const [visibleColumns, setVisibleColumns] = useLocalStorage<string[]>('table-cols-suppliers-list', allColumns.filter(c => c.isDefault).map(c => c.key));

  const renderMobileCard = (supplier: Supplier) => (
    <div className="p-4 space-y-2">
      <div className="flex justify-between items-start">
        <div className="flex-1 overflow-hidden">
          <p className="font-bold text-primary-hover truncate" title={`${supplier.supplierName} ${supplier.displayName ? `(${supplier.displayName})` : ''}`}>{supplier.supplierName} {supplier.displayName && `(${supplier.displayName})`}</p>
          <p className="text-sm text-muted">{supplier.contactNumber} | {supplier.place}</p>
        </div>
        <p className={`text-lg font-bold flex-shrink-0 ml-2 ${supplier.outstanding < 0 ? 'text-danger' : 'text-success'}`}>{formatCurrency(supplier.outstanding)}</p>
      </div>
      <div className="flex justify-end items-center gap-2 pt-2 border-t border-border-color">
        <Button size="sm" variant="primary" onClick={(e) => { e.stopPropagation(); handleOpenPaymentModal(supplier); }}>Pay</Button>
        {canUpdate(Feature.Suppliers) && <Button size="sm" variant="secondary" onClick={(e) => { e.stopPropagation(); handleOpenModal(supplier); }}>Edit</Button>}
        {canDelete(Feature.Suppliers) && <Button size="sm" variant="danger" onClick={(e) => { e.stopPropagation(); handleDelete(supplier.id); }}>Delete</Button>}
      </div>
    </div>
  );

  return (
    <>
      <PageHeader title="Suppliers" />

      {error && <Alert message={error} onClose={() => setError(null)} />}

      <SortableTable<Supplier>
        columns={allColumns}
        data={suppliers}
        tableId="suppliers-list"
        defaultSortField="supplierName"
        onRowClick={(supplier) => navigate(`/suppliers/${supplier.id}`)}
        renderMobileCard={renderMobileCard}
        searchPlaceholder="Search suppliers..."
        loading={loading}
        visibleColumns={visibleColumns}
        onColumnToggle={(key) => setVisibleColumns(prev => prev.includes(key) ? prev.filter(k => k !== key) : [...prev, key])}
        customActions={
          canCreate(Feature.Suppliers) && (
            <Button onClick={() => handleOpenModal()} icon={ICONS.plus}>
              Add Supplier
            </Button>
          )
        }
      />

      <SupplierForm
        isOpen={isOpen}
        onClose={handleCloseModal}
        onSuccess={handleSuccess}
        supplier={editingSupplier}
      />

      <SupplierPaymentModal
        isOpen={isPaymentModalOpen}
        onClose={() => setIsPaymentModalOpen(false)}
        onSuccess={handlePaymentSuccess}
        supplier={payingSupplier}
      />
    </>
  );
};

export default SuppliersList;
