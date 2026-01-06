import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { ProductDetailData, Feature, ProductSaleItem } from '../../types';
import * as api from '../../services/api';
import Card from '../../components/ui/Card';
import PageHeader from '../../components/ui/PageHeader';
import Spinner from '../../components/ui/Spinner';
import Alert from '../../components/ui/Alert';
import { formatCurrency, formatDate } from '../../utils/formatters';
import { usePermissions } from '../../contexts/AuthContext';
import DonutChart from '../../components/charts/DonutChart';
import { SortableTable, Column } from '../../components/ui/SortableTable';
import DateRangePicker from '../../components/ui/DateRangePicker';
import BarChart from '../../components/charts/BarChart';
import SimpleTable from '../../components/charts/SimpleTable';

const ProductDetail: React.FC = () => {
    const { productId } = useParams<{ productId: string }>();
    const navigate = useNavigate();
    const { canView } = usePermissions();

    const [data, setData] = useState<ProductDetailData | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [filters, setFilters] = useState({
        startDate: '',
        endDate: '',
    });

    useEffect(() => {
        if (!canView(Feature.Products, 'details')) {
            navigate('/unauthorized', { replace: true });
        }
    }, [canView, navigate]);

    const loadData = useCallback(async () => {
        if (!productId) return;
        setLoading(true);
        setError(null);
        try {
            const productData = await api.fetchProductDetailData(productId, filters);
            setData(productData);
        } catch (e) {
            setError('Failed to load product data.');
        } finally {
            setLoading(false);
        }
    }, [productId, filters]);

    useEffect(() => {
        loadData();
    }, [loadData]);

    if (loading) return <div className="flex justify-center p-10"><Spinner size="lg" /></div>;
    if (error) return <Alert message={error} />;
    if (!data) return <Alert message="Product not found." type="warning" />;
    
    const { product, stats, monthlySales, topBuyers, topSuppliers, recentSales } = data;

    const recentSalesColumns: Column<ProductSaleItem>[] = [
        { key: 'invoiceNumber', header: 'Invoice #', accessor: (item) => <Link to={`/invoices`} state={{ buyerIdToLoad: item.buyerId, invoiceIdToView: item.invoiceId }} className="text-primary hover:underline">{item.invoiceNumber}</Link> },
        { key: 'date', header: 'Date', accessor: (item) => formatDate(item.date) },
        { key: 'buyerName', header: 'Buyer', accessor: (item) => <Link to={`/buyers/${item.buyerId}`} className="text-primary hover:underline truncate block max-w-xs" title={item.buyerName}>{item.buyerName}</Link> },
        { key: 'quantity', header: 'Quantity', accessor: 'quantity', className: 'text-right' },
        { key: 'rate', header: 'Rate', accessor: (item) => formatCurrency(item.rate), className: 'text-right' },
        { key: 'subTotal', header: 'Total', accessor: (item) => formatCurrency(item.subTotal), className: 'text-right font-semibold' },
    ];
    
    const renderSaleMobileCard = (sale: ProductSaleItem) => (
        <div className="p-4 space-y-2">
            <div className="flex justify-between items-start">
                <div>
                    <Link to={`/invoices`} state={{ buyerIdToLoad: sale.buyerId, invoiceIdToView: sale.invoiceId }} className="font-bold text-primary hover:underline">{sale.invoiceNumber}</Link>
                    <p className="text-xs text-muted">{formatDate(sale.date)}</p>
                </div>
                <p className="font-semibold text-lg">{formatCurrency(sale.subTotal)}</p>
            </div>
            <div className="pt-2 border-t text-sm">
                <p>Buyer: <Link to={`/buyers/${sale.buyerId}`} className="text-primary hover:underline">{sale.buyerName}</Link></p>
                <p>Qty: {sale.quantity} @ {formatCurrency(sale.rate)}</p>
            </div>
        </div>
    );

    return (
        <div className="space-y-8">
            <PageHeader title={product.productName} subtitle={product.displayName} />

            {canView(Feature.Products, 'details_quick_stats') && (
                <Card>
                    <h2 className="text-xl font-bold mb-4">Quick Stats</h2>
                    <div className="grid grid-cols-2 md:grid-cols-5 gap-4 text-center">
                        <div className="bg-secondary-light p-3 rounded-lg">
                            <p className="text-sm text-muted">Total Qty Sold</p>
                            <p className="font-bold text-lg text-on-surface">{stats.totalQuantitySold.toLocaleString('en-IN')}</p>
                        </div>
                        <div className="bg-secondary-light p-3 rounded-lg">
                            <p className="text-sm text-muted">Total Sales Value</p>
                            <p className="font-bold text-lg text-on-surface">{formatCurrency(stats.totalSalesValue)}</p>
                        </div>
                        <div className="bg-secondary-light p-3 rounded-lg">
                            <p className="text-sm text-muted">Average Price</p>
                            <p className="font-bold text-lg text-on-surface">{formatCurrency(stats.averagePrice)}</p>
                        </div>
                        <div className="bg-secondary-light p-3 rounded-lg">
                            <p className="text-sm text-muted"># of Buyers</p>
                            <p className="font-bold text-lg text-on-surface">{stats.buyerCount}</p>
                        </div>
                        <div className="bg-secondary-light p-3 rounded-lg">
                            <p className="text-sm text-muted"># of Suppliers</p>
                            <p className="font-bold text-lg text-on-surface">{stats.supplierCount}</p>
                        </div>
                    </div>
                </Card>
            )}

            {canView(Feature.Products, 'details_analytics') && (
                <Card>
                    <h2 className="text-xl font-bold mb-4">Analytics Overview</h2>
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                        <div className="space-y-8">
                            <BarChart title="Monthly Sales (Last 12 Months)" data={monthlySales} />
                            <DonutChart title="Top Suppliers (by Quantity)" data={topSuppliers} />
                            <SimpleTable title="Top Suppliers by Quantity" data={topSuppliers} />
                        </div>
                        <div className="space-y-8">
                            <DonutChart title="Top Buyers (by Value)" data={topBuyers} />
                            <SimpleTable title="Top Buyers by Value" data={topBuyers} />
                        </div>
                    </div>
                </Card>
            )}

            {canView(Feature.Products, 'details_recent_sales') && (
                <Card>
                    <div className="flex flex-col md:flex-row justify-between md:items-center gap-4 mb-4">
                        <h2 className="text-xl font-bold">Sales History</h2>
                        <DateRangePicker
                            startDate={filters.startDate}
                            endDate={filters.endDate}
                            onStartDateChange={date => setFilters(f => ({ ...f, startDate: date }))}
                            onEndDateChange={date => setFilters(f => ({ ...f, endDate: date }))}
                        />
                    </div>
                    <SortableTable<ProductSaleItem>
                        columns={recentSalesColumns.map(c => ({...c, key: c.key as string}))}
                        data={recentSales}
                        tableId={`product-sales-${productId}`}
                        defaultSortField="date"
                        emptyStateMessage={filters.startDate || filters.endDate ? "No sales found for this product in the selected period." : "No recent sales found for this product."}
                        renderMobileCard={renderSaleMobileCard}
                        visibleColumns={recentSalesColumns.map(c => c.key as string)}
                        onColumnToggle={() => {}} // No selector for this simple table
                    />
                </Card>
            )}
        </div>
    );
};

export default ProductDetail;
