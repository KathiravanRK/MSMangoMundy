import React from 'react';
import { ProductAnalyticsData, ChartDataItem } from '../../types';
import Card from '../../components/ui/Card';
import { formatCurrency } from '../../utils/formatters';

const ProductPerformanceTable: React.FC<{ title: string; data: ChartDataItem[]; unit: 'currency' | 'quantity' }> = ({ title, data, unit }) => (
    <Card>
        <h3 className="text-lg font-semibold mb-2">{title}</h3>
        <div className="overflow-y-auto max-h-96 border rounded-lg">
            <table className="w-full text-sm">
                <thead className="sticky top-0 bg-secondary-light">
                    <tr>
                        <th className="p-2 text-left font-medium text-muted">Product</th>
                        <th className="p-2 text-right font-medium text-muted">{unit === 'currency' ? 'Sales Value' : 'Quantity Sold'}</th>
                    </tr>
                </thead>
                <tbody>
                    {data.length > 0 ? data.map((item, index) => (
                        <tr key={`${item.name}-${index}`} className="border-b border-border-color last:border-b-0">
                            <td className="p-2">{item.name}</td>
                            <td className="p-2 text-right font-semibold">
                                {unit === 'currency' ? formatCurrency(item.value) : item.value.toLocaleString('en-IN')}
                            </td>
                        </tr>
                    )) : (
                        <tr>
                            <td colSpan={2} className="text-center p-4 text-muted">No product data available.</td>
                        </tr>
                    )}
                </tbody>
            </table>
        </div>
    </Card>
);

interface ProductAnalyticsProps {
    data: ProductAnalyticsData;
}

const ProductAnalytics: React.FC<ProductAnalyticsProps> = ({ data }) => {
    if (!data || !data.stats) {
        return <div className="text-center p-4">Loading analytics data...</div>;
    }

    const { stats, topProductsByValue, topProductsByQuantity } = data;

    return (
        <div className="space-y-6 mb-6">
            <Card>
                <h2 className="text-xl font-bold mb-4">Overall Product Performance</h2>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
                    <div className="bg-secondary-light p-3 rounded-lg">
                        <p className="text-sm text-muted">Total Products</p>
                        <p className="font-bold text-lg text-on-surface">{stats.productCount}</p>
                    </div>
                    <div className="bg-secondary-light p-3 rounded-lg">
                        <p className="text-sm text-muted">Total Sales Value</p>
                        <p className="font-bold text-lg text-on-surface">{formatCurrency(stats.totalSalesValue)}</p>
                    </div>
                    <div className="bg-secondary-light p-3 rounded-lg">
                        <p className="text-sm text-muted">Total Quantity Sold</p>
                        <p className="font-bold text-lg text-on-surface">{stats.totalQuantitySold.toLocaleString('en-IN')}</p>
                    </div>
                    <div className="bg-secondary-light p-3 rounded-lg">
                        <p className="text-sm text-muted">Best Seller (Value)</p>
                        <p className="font-bold text-lg text-on-surface truncate" title={stats.bestSellingProductByValue?.name}>
                            {stats.bestSellingProductByValue?.name || 'N/A'}
                        </p>
                    </div>
                </div>
            </Card>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <ProductPerformanceTable title="Products by Sales Value" data={topProductsByValue} unit="currency" />
                <ProductPerformanceTable title="Products by Quantity Sold" data={topProductsByQuantity} unit="quantity" />
            </div>
        </div>
    );
};

export default ProductAnalytics;
