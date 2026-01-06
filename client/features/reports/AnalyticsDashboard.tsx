import React, { useMemo } from 'react';
import { AnalyticsDashboardData, ChartDataItem, Feature } from '../../types';
import Card from '../../components/ui/Card';
import { formatCurrency } from '../../utils/formatters';
import { usePermissions } from '../../contexts/AuthContext';
import DonutChart from '../../components/charts/DonutChart';
import StatCard from '../../components/ui/StatCard';

const SalesVsPurchasesChart: React.FC<{ data: { date: string; sales: number; purchases: number }[] }> = ({ data }) => {
    const width = 500;
    const height = 200;
    const padding = 30;

    const maxVal = useMemo(() => Math.max(...data.flatMap(d => [d.sales, d.purchases]), 1), [data]);
    const x = (i: number) => padding + (i / (data.length - 1)) * (width - padding * 2);
    const y = (val: number) => height - padding - (val / maxVal) * (height - padding * 2);

    const salesPath = data.map((d, i) => `${i === 0 ? 'M' : 'L'}${x(i)} ${y(d.sales)}`).join(' ');
    const purchasesPath = data.map((d, i) => `${i === 0 ? 'M' : 'L'}${x(i)} ${y(d.purchases)}`).join(' ');

    return (
        <Card>
            <h3 className="font-bold text-lg mb-2">Sales vs Purchases</h3>
            <div className="flex items-center gap-4 text-sm mb-2">
                <div className="flex items-center gap-2"><span className="w-3 h-3 rounded-full bg-primary"></span>Sales</div>
                <div className="flex items-center gap-2"><span className="w-3 h-3 rounded-full bg-danger"></span>Purchases</div>
            </div>
            <div className="overflow-x-auto">
                <svg viewBox={`0 0 ${width} ${height}`} className="w-full h-auto min-w-max">
                    {[0, 0.25, 0.5, 0.75, 1].map(tick => (
                        <g key={tick} className="text-gray-200">
                            <line x1={padding} y1={y(tick * maxVal)} x2={width - padding} y2={y(tick * maxVal)} stroke="currentColor" />
                            <text x={padding - 5} y={y(tick * maxVal) + 4} textAnchor="end" fontSize="10" fill="#6B7280">{Math.round(tick * maxVal / 1000)}k</text>
                        </g>
                    ))}
                    {data.map((d, i) => i % (Math.floor(data.length / 7)) === 0 && (<text key={i} x={x(i)} y={height - padding + 15} textAnchor="middle" fontSize="10" fill="#6B7280">{new Date(d.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}</text>))}
                    <path d={salesPath} fill="none" stroke="#3B82F6" strokeWidth="2" />
                    <path d={purchasesPath} fill="none" stroke="#EF4444" strokeWidth="2" />
                </svg>
            </div>
        </Card>
    );
};

const AnalyticsDashboard: React.FC<{ data: AnalyticsDashboardData }> = ({ data }) => {
    const { canView } = usePermissions();

    if (!data || !data.kpis) {
        return <Card><p className="text-center p-10 text-muted">Analytics data could not be loaded.</p></Card>;
    }

    const { kpis, salesVsPurchases, topProductsByValue, topBuyersBySales, expenseBreakdown } = data;
    return (
        <div className="space-y-6">
            {canView(Feature.Reports, 'analytics_kpis') && (
                <div className="grid gap-4" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))' }}>
                    <StatCard title="Total Sales" value={formatCurrency(kpis.totalSales)} className="!p-4 text-center" />
                    <StatCard title="Total Purchases" value={formatCurrency(kpis.totalPurchases)} className="!p-4 text-center" />
                    <StatCard title="Net Cash Flow" value={formatCurrency(kpis.netCashFlow)} className="!p-4 text-center" />
                    <StatCard title="Commission" value={formatCurrency(kpis.totalCommission)} className="!p-4 text-center" />
                    <StatCard title="Wages" value={formatCurrency(kpis.totalWages)} className="!p-4 text-center" />
                    <StatCard title="Invoices" value={kpis.invoiceCount.toLocaleString('en-IN')} className="!p-4 text-center" />
                </div>
            )}

            {canView(Feature.Reports, 'analytics_charts') && (
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    <SalesVsPurchasesChart data={salesVsPurchases} />
                    <Card className="h-full"><DonutChart title="Expense Breakdown" data={expenseBreakdown} /></Card>
                </div>
            )}

            {canView(Feature.Reports, 'analytics_lists') && (
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    <Card>
                        <h3 className="text-lg font-semibold mb-2 truncate">Top Products by Sales</h3>
                        <div className="space-y-2 max-h-72 overflow-y-auto pr-2">{topProductsByValue.map((item, index) => (<div key={`${item.name}-${index}`} className="flex justify-between items-center text-sm gap-2 min-w-0"><span className="truncate flex-1">{item.name}</span><span className="font-semibold flex-shrink-0 whitespace-nowrap">{formatCurrency(item.value)}</span></div>))}</div>
                    </Card>
                    <Card>
                        <h3 className="text-lg font-semibold mb-2 truncate">Top Buyers by Sales</h3>
                        <div className="space-y-2 max-h-72 overflow-y-auto pr-2">{topBuyersBySales.map((item, index) => (<div key={`${item.name}-${index}`} className="flex justify-between items-center text-sm gap-2 min-w-0"><span className="truncate flex-1">{item.name}</span><span className="font-semibold flex-shrink-0 whitespace-nowrap">{formatCurrency(item.value)}</span></div>))}</div>
                    </Card>
                </div>
            )}
        </div>
    );
};

export default AnalyticsDashboard;
