import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Product, Feature, ProductAnalyticsData } from '../../types';
import * as api from '../../services/api';
import { useAuth, usePermissions } from '../../contexts/AuthContext';
import useDialog from '../../hooks/useDialog';
import { useLocalStorage } from '../../hooks/useLocalStorage';

// UI Components
import PageHeader from '../../components/ui/PageHeader';
import Button from '../../components/ui/Button';
import ProductForm from './ProductForm';
import { ICONS } from '../../constants';
import Alert from '../../components/ui/Alert';
import ProductAnalytics from './ProductAnalytics';
import Spinner from '../../components/ui/Spinner';
import { SortableTable, Column } from '../../components/ui/SortableTable';

const ProductsList: React.FC = () => {
  const [products, setProducts] = useState<Product[]>([]);
  const [analyticsData, setAnalyticsData] = useState<ProductAnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [analyticsLoading, setAnalyticsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  
  const { isOpen, open, close } = useDialog();
  const { user } = useAuth();
  const { canView, canCreate, canUpdate, canDelete } = usePermissions();
  const navigate = useNavigate();
  
  useEffect(() => {
    if (!canView(Feature.Products)) {
      navigate('/unauthorized', { replace: true });
    }
  }, [canView, navigate]);

  const loadProducts = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await api.fetchProducts();
      setProducts(data);
    } catch (err) {
      setError('Failed to fetch products.');
    } finally {
      setLoading(false);
    }
  }, []);

  const loadAnalytics = useCallback(async () => {
    try {
      setAnalyticsLoading(true);
      const data = await api.fetchProductAnalytics();
      setAnalyticsData(data);
    } catch (err) {
      console.error("Failed to load product analytics", err);
    } finally {
      setAnalyticsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadProducts();
    loadAnalytics();
  }, [loadProducts, loadAnalytics]);

  const handleOpenModal = useCallback((product: Product | null = null) => {
    setEditingProduct(product);
    open();
  }, [open]);

  const handleCloseModal = () => {
    setEditingProduct(null);
    close();
  };

  const handleSuccess = () => {
    handleCloseModal();
    loadProducts();
    loadAnalytics();
  };

  const handleDelete = useCallback(async (productId: string) => {
    if (!user || !canDelete(Feature.Products)) return;
    if (window.confirm('Are you sure you want to delete this product? This action cannot be undone.')) {
      try {
        await api.deleteProduct(productId, user);
        handleSuccess();
      } catch (err) {
        alert('Failed to delete product. Please try again.');
      }
    }
  }, [user, canDelete, handleSuccess]);

  const allColumns: Column<Product>[] = useMemo(() => [
    { key: 'productName', header: 'Product Name', accessor: 'productName', sortable: true, isDefault: true, className: 'font-medium text-on-surface' },
    { key: 'displayName', header: 'Display Name', accessor: 'displayName', sortable: true, isDefault: true, className: 'text-muted' },
    {
        key: 'actions',
        header: 'Actions',
        isDefault: true,
        className: 'text-right',
        accessor: (item) => (
            <div className="flex items-center justify-end gap-2">
                {canUpdate(Feature.Products) && <Button size="sm" variant="ghost" onClick={(e) => { e.stopPropagation(); handleOpenModal(item);}}>Edit</Button>}
                {canDelete(Feature.Products) && <Button size="sm" variant="danger" onClick={(e) => { e.stopPropagation(); handleDelete(item.id);}}>Delete</Button>}
            </div>
        ),
    },
  ], [canUpdate, canDelete, handleOpenModal, handleDelete]);
  
  const [visibleColumns, setVisibleColumns] = useLocalStorage<string[]>('table-cols-products-list', allColumns.filter(c => c.isDefault).map(c => c.key));

  const renderMobileCard = (product: Product) => (
    <div className="p-4 space-y-2">
        <div>
            <p className="font-bold text-on-surface">{product.productName}</p>
            <p className="text-sm text-muted">{product.displayName || 'No display name'}</p>
        </div>
        <div className="flex justify-end items-center gap-2 pt-2 border-t border-border-color">
            {canUpdate(Feature.Products) && <Button size="sm" variant="secondary" onClick={(e) => { e.stopPropagation(); handleOpenModal(product);}}>Edit</Button>}
            {canDelete(Feature.Products) && <Button size="sm" variant="danger" onClick={(e) => { e.stopPropagation(); handleDelete(product.id);}}>Delete</Button>}
        </div>
    </div>
  );

  return (
    <>
      <PageHeader title="Products" />
      
      {error && <Alert message={error} onClose={() => setError(null)} />}
      
      {analyticsLoading ? (
        <div className="flex justify-center p-10"><Spinner /></div>
      ) : analyticsData && (
        <ProductAnalytics data={analyticsData} />
      )}

      <SortableTable<Product>
        columns={allColumns}
        data={products}
        tableId="products-list"
        defaultSortField="productName"
        onRowClick={(product) => navigate(`/products/${product.id}`)}
        renderMobileCard={renderMobileCard}
        searchPlaceholder="Search products..."
        loading={loading}
        visibleColumns={visibleColumns}
        onColumnToggle={(key) => setVisibleColumns(prev => prev.includes(key) ? prev.filter(k => k !== key) : [...prev, key])}
        customActions={
          canCreate(Feature.Products) && (
            <Button onClick={() => handleOpenModal()} icon={ICONS.plus}>
              Add Product
            </Button>
          )
        }
      />

      <ProductForm
        isOpen={isOpen}
        onClose={handleCloseModal}
        onSuccess={handleSuccess}
        product={editingProduct}
      />
    </>
  );
};

export default ProductsList;
