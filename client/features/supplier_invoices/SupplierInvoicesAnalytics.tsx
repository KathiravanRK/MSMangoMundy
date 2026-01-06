import React from 'react';
import { SupplierInvoicesAnalyticsData, ChartDataItem } from '../../types';
import Card from '../../components/ui/Card';
import { formatCurrency } from '../../utils/formatters';

const AnalyticsTable: React.FC<{ title: string; data: ChartDataItem[] }> = ({ title, data }) => (
    <Card>
        <h3 className="text-lg font-semibold mb-2">{title}</h3>
        <div className="overflow-y-auto max-h-96 border rounded-lg">
            <table className="w-full text-sm">
                <thead className="sticky top-0 bg-secondary-light">
                    <tr>
                        <th className="p-2 text-left font-medium text-muted">Supplier</th>
                        <th className="p-2 text-right font-medium text-muted">Amount</th>
                    </tr>
                </thead>
                <tbody>
                    {data.length > 0 ? data.map(item => (
                        <tr key={item.name} className="border-b border-border-color last:border-b-0">
                            <td className="p-2">{item.name}</td>
                            <td className="p-2 text-right font-semibold">{formatCurrency(item.value)}</td>
                        </tr>
                    )) : (
                        <tr><td colSpan={2} className="text-center p-4 text-muted">No data available.</td></tr>
                    )}
                </tbody>
            </table>
        </div>
    </Card>
);

interface SupplierInvoicesAnalyticsProps {
    data: SupplierInvoicesAnalyticsData;
}

const SupplierInvoicesAnalytics: React.FC<SupplierInvoicesAnalyticsProps> = ({ data }) => {
    if (!data || !data.stats) {
        return <div className="p-4 text-center text-muted">Loading analytics data...</div>;
    }

    const { stats, topSuppliersByPayable, topSuppliersByPurchases } = data;

    return (
        <div className="space-y-6 mb-6">
            <Card>
                <h2 className="text-xl font-bold mb-4">Overall Settlement Performance</h2>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
                    <div className="bg-secondary-light p-3 rounded-lg">
                        <p className="text-sm text-muted">Total Invoices</p>
                        <p className="font-bold text-lg text-on-surface">{stats.invoiceCount.toLocaleString('en-IN')}</p>
                    </div>
                    <div className="bg-secondary-light p-3 rounded-lg">
                        <p className="text-sm text-muted">Total Purchase Value</p>
                        <p className="font-bold text-lg text-on-surface">{formatCurrency(stats.totalPurchaseValue)}</p>
                    </div>
                    <div className="bg-secondary-light p-3 rounded-lg">
                        <p className="text-sm text-muted">Total Paid</p>
                        <p className="font-bold text-lg text-success-dark">{formatCurrency(stats.totalAmountPaid)}</p>
                    </div>
                    <div className="bg-secondary-light p-3 rounded-lg">
                        <p className="text-sm text-muted">Total Payables</p>
                        <p className="font-bold text-lg text-danger-dark">{formatCurrency(stats.totalPayables)}</p>
                    </div>
                </div>
            </Card>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <AnalyticsTable title="Top Suppliers by Outstanding Payables" data={topSuppliersByPayable} />
                <AnalyticsTable title="Top Suppliers by Purchase Value" data={topSuppliersByPurchases} />
            </div>
        </div>
    );
};

export default SupplierInvoicesAnalytics;
