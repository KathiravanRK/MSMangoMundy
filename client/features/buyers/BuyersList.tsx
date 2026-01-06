import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Buyer, Feature } from '../../types';
import * as api from '../../services/api';
import { useAuth, usePermissions } from '../../contexts/AuthContext';
import { formatCurrency } from '../../utils/formatters';
import useDialog from '../../hooks/useDialog';
import { useLocalStorage } from '../../hooks/useLocalStorage';

// UI Components
import PageHeader from '../../components/ui/PageHeader';
import Button from '../../components/ui/Button';
import BuyerForm from './BuyerForm';
import { ICONS } from '../../constants';
import Alert from '../../components/ui/Alert';
import { SortableTable, Column } from '../../components/ui/SortableTable';
import BuyerPaymentModal from '../reports/components/BuyerPaymentModal';

const BuyersList: React.FC = () => {
  const [buyers, setBuyers] = useState<Buyer[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [editingBuyer, setEditingBuyer] = useState<Buyer | null>(null);
  const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);
  const [payingBuyer, setPayingBuyer] = useState<Buyer | null>(null);

  const { isOpen, open, close } = useDialog();
  const { user } = useAuth();
  const { canView, canCreate, canUpdate, canDelete } = usePermissions();
  const navigate = useNavigate();

  useEffect(() => {
    if (!canView(Feature.Buyers)) {
      navigate('/unauthorized', { replace: true });
    }
  }, [canView, navigate]);

  const loadBuyers = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await api.fetchBuyers();
      setBuyers(data);
    } catch (err) {
      setError('Failed to fetch buyers.');
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadBuyers();
  }, [loadBuyers]);

  const handleOpenModal = useCallback((buyer: Buyer | null = null) => {
    setEditingBuyer(buyer);
    open();
  }, [open]);

  const handleOpenPaymentModal = useCallback((buyer: Buyer) => {
    setPayingBuyer(buyer);
    setIsPaymentModalOpen(true);
  }, []);

  const handleCloseModal = () => {
    setEditingBuyer(null);
    close();
  };

  const handleSuccess = () => {
    handleCloseModal();
    loadBuyers();
  };

  const handlePaymentSuccess = () => {
    setIsPaymentModalOpen(false);
    loadBuyers();
  };

  const handleDelete = useCallback(async (buyerId: string) => {
    if (!user || !canDelete(Feature.Buyers)) return;
    if (window.confirm('Are you sure you want to delete this buyer? This action cannot be undone.')) {
      try {
        await api.deleteBuyer(buyerId, user);
        loadBuyers();
      } catch (err: any) {
        alert(`Failed to delete buyer: ${err.message}`);
      }
    }
  }, [user, canDelete, loadBuyers]);

  const allColumns: Column<Buyer>[] = useMemo(() => [
    {
      key: 'buyerName',
      header: 'Buyer Name',
      accessor: (item) => <span className="truncate block max-w-xs" title={item.buyerName}>{item.buyerName}</span>,
      sortAccessor: 'buyerName',
      sortable: true,
      isDefault: true,
    },
    { key: 'displayName', header: 'Display Name', accessor: (item) => <span className="truncate block max-w-xs" title={item.displayName}>{item.displayName}</span>, sortAccessor: 'displayName', sortable: true },
    { key: 'tokenNumber', header: 'Token #', accessor: 'tokenNumber', sortable: true },
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
          <Button size="sm" variant="secondary" onClick={(e) => { e.stopPropagation(); handleOpenPaymentModal(item); }}>Receive</Button>
          {canUpdate(Feature.Buyers) && <Button size="sm" variant="ghost" onClick={(e) => { e.stopPropagation(); handleOpenModal(item); }}>Edit</Button>}
          {canDelete(Feature.Buyers) && <Button size="sm" variant="danger" onClick={(e) => { e.stopPropagation(); handleDelete(item.id); }}>Delete</Button>}
        </div>
      ),
    },
  ], [canUpdate, canDelete, handleOpenModal, handleOpenPaymentModal, handleDelete]);

  const [visibleColumns, setVisibleColumns] = useLocalStorage<string[]>('table-cols-buyers-list', allColumns.filter(c => c.isDefault).map(c => c.key));

  const renderMobileCard = (buyer: Buyer) => (
    <div className="p-4 space-y-2">
      <div className="flex justify-between items-start">
        <div className="flex-1 overflow-hidden">
          <p className="font-bold text-primary-hover truncate">{buyer.displayName || buyer.buyerName}</p>
          <p className="text-sm text-muted">{buyer.contactNumber} | {buyer.place}</p>
        </div>
        <p className={`text-lg font-bold flex-shrink-0 ml-2 ${buyer.outstanding > 0 ? 'text-danger' : 'text-success'}`}>{formatCurrency(buyer.outstanding)}</p>
      </div>
      <div className="flex justify-end items-center gap-2 pt-2 border-t border-border-color">
        <Button size="sm" variant="primary" onClick={(e) => { e.stopPropagation(); handleOpenPaymentModal(buyer); }}>Receive</Button>
        {canUpdate(Feature.Buyers) && <Button size="sm" variant="secondary" onClick={(e) => { e.stopPropagation(); handleOpenModal(buyer); }}>Edit</Button>}
        {canDelete(Feature.Buyers) && <Button size="sm" variant="danger" onClick={(e) => { e.stopPropagation(); handleDelete(buyer.id); }}>Delete</Button>}
      </div>
    </div>
  );

  return (
    <>
      <PageHeader title="Buyers" />

      {error && <Alert message={error} onClose={() => setError(null)} />}

      <SortableTable<Buyer>
        columns={allColumns}
        data={buyers}
        tableId="buyers-list"
        defaultSortField="buyerName"
        onRowClick={(buyer) => navigate(`/buyers/${buyer.id}`)}
        renderMobileCard={renderMobileCard}
        searchPlaceholder="Search buyers..."
        loading={loading}
        visibleColumns={visibleColumns}
        onColumnToggle={(key) => setVisibleColumns(prev => prev.includes(key) ? prev.filter(k => k !== key) : [...prev, key])}
        customActions={
          canCreate(Feature.Buyers) && (
            <Button onClick={() => handleOpenModal()} icon={ICONS.plus}>
              Add Buyer
            </Button>
          )
        }
      />

      <BuyerForm
        isOpen={isOpen}
        onClose={handleCloseModal}
        onSuccess={handleSuccess}
        buyer={editingBuyer}
      />

      <BuyerPaymentModal
        isOpen={isPaymentModalOpen}
        onClose={() => setIsPaymentModalOpen(false)}
        onSuccess={handlePaymentSuccess}
        buyer={payingBuyer}
      />
    </>
  );
};

export default BuyersList;
