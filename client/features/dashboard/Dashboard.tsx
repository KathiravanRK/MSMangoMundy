import React, { useState, useEffect, useMemo } from 'react';
import { DashboardData, TransactionType, Feature } from '../../types';
import { Link, useNavigate } from 'react-router-dom';
import { usePermissions } from '../../contexts/AuthContext';
import * as api from '../../services/api';

import StatCards from './StatCards';
import CashFlowChart from './CashFlowChart';
import DonutChart from '../../components/charts/DonutChart';
import Card from '../../components/ui/Card';
import { formatCurrency } from '../../utils/formatters';
import { ICONS } from '../../constants';
import PageHeader from '../../components/ui/PageHeader';
import Spinner from '../../components/ui/Spinner';
import Alert from '../../components/ui/Alert';
import AnalyticsCard from './AnalyticsCard';


const Dashboard: React.FC = () => {
    const [data, setData] = useState<DashboardData | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>({
        uninvoiced: false,
        pending: false,
        transactions: false
    });
    const navigate = useNavigate();
    const { canView, canCreate } = usePermissions();

    const toggleSection = (section: string) => {
        setExpandedSections(prev => ({
            ...prev,
            [section]: !prev[section]
        }));
    };

    useEffect(() => {
        const loadData = async () => {
            try {
                setLoading(true);
                setError(null);
                const dashboardData = await api.fetchDashboardData();
                setData(dashboardData);
            } catch (err) {
                setError("Failed to load dashboard data. Please try again.");
                console.error(err);
            } finally {
                setLoading(false);
            }
        };
        loadData();
    }, []);

    useEffect(() => {
        if (!canView(Feature.Dashboard, 'view_page')) {
            navigate('/unauthorized', { replace: true });
        }
    }, [canView, navigate]);

    if (loading) {
        return (
            <div className="flex justify-center items-center h-64">
                <Spinner size="lg" />
            </div>
        );
    }
    if (error) {
        return <Alert message={error} />;
    }
    if (!data) {
        return <Alert message="No dashboard data available." type="info" />;
    }

    const {
        kpis = {
            totalReceivables: 0,
            totalPayables: 0,
            todayAuctionValue: 0,
            todayCommission: 0,
            todayEntriesCount: 0,
            uninvoicedAuctionValue: 0
        },
        cashFlowChart = [],
        topProducts = [],
        salesByBuyer = [],
        expenseBreakdown = [],
        latestTransactions = [],
        pendingEntries = [],
        entryStatusDistribution = [],
        unInvoicedBuyersWithEntries = [],
        topBuyersByOutstanding = [],
        topSuppliersByPayable = []
    } = data;

    return (
        <div className="space-y-8">
            <PageHeader
                title="Dashboard"
                subtitle="An overview of your business performance."
            />

            {canView(Feature.Dashboard, 'kpis') && <StatCards kpis={kpis} />}

            {canView(Feature.Dashboard, 'at_a_glance') && (
                <div className="animate-fadeInUp" style={{ animationDelay: '100ms' }}>
                    <h2 className="text-2xl font-bold text-on-surface mb-4">At a Glance</h2>
                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                        <AnalyticsCard title="Top Buyers by Outstanding" data={topBuyersByOutstanding || []} linkPrefix="/buyers/" />
                        <AnalyticsCard title="Top Suppliers by Payable" data={topSuppliersByPayable || []} linkPrefix="/suppliers/" />
                        <AnalyticsCard title="Top Selling Products (by Value)" data={topProducts || []} linkPrefix="/products/" />
                    </div>
                </div>
            )}

            {canView(Feature.Dashboard, 'charts') && (
                <div className="animate-fadeInUp" style={{ animationDelay: '200ms' }}>
                    <h2 className="text-2xl font-bold text-on-surface mb-4">Analytics & Charts</h2>
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                        <CashFlowChart data={cashFlowChart} />
                        <Card className="h-full"><DonutChart title="Entry Status" data={entryStatusDistribution} /></Card>
                        <Card className="h-full"><DonutChart title="Top Sales by Buyer" data={salesByBuyer} /></Card>
                        <Card className="h-full"><DonutChart title="Expense Breakdown" data={expenseBreakdown} /></Card>
                    </div>
                </div>
            )}

            {canView(Feature.Dashboard, 'operations') && (
                <div className="animate-fadeInUp" style={{ animationDelay: '300ms' }}>
                    <h2 className="text-2xl font-bold text-on-surface mb-4">Operations</h2>
                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                        <Card className="lg:col-span-2">
                            <h3 className="font-bold text-lg mb-4">Uninvoiced Entries by Buyer</h3>
                            {unInvoicedBuyersWithEntries.length > 0 ? (
                                <div>
                                    <ul className="space-y-4 pr-2">
                                        {(expandedSections.uninvoiced ? unInvoicedBuyersWithEntries : unInvoicedBuyersWithEntries.slice(0, 5)).map(buyer => (
                                            <li key={buyer.buyerId}>
                                                <div className="flex justify-between items-center mb-2 p-2 bg-secondary-light rounded-md">
                                                    <div className="overflow-hidden">
                                                        <p className="font-bold text-on-surface truncate" title={buyer.buyerName}>{buyer.buyerName}</p>
                                                        <p className="text-xs text-muted">Total: {formatCurrency(buyer.totalAmount)} ({buyer.totalItemCount} items)</p>
                                                    </div>
                                                    <Link
                                                        to="/invoices"
                                                        state={{ buyerIdToLoad: buyer.buyerId }}
                                                        className="text-primary hover:underline font-semibold text-xs bg-primary-light px-2 py-1 rounded flex-shrink-0 ml-2"
                                                    >
                                                        Create Invoice
                                                    </Link>
                                                </div>
                                                <ul className="space-y-1 pl-4 border-l-2 border-border-color ml-2">
                                                    {buyer.entries.map(entry => (
                                                        <li key={entry.entryId} className="flex justify-between text-sm text-muted py-1">
                                                            <span>Entry #{entry.entrySerialNumber} ({entry.itemCount} items)</span>
                                                            <span className="font-medium">{formatCurrency(entry.amount)}</span>
                                                        </li>
                                                    ))}
                                                </ul>
                                            </li>
                                        ))}
                                    </ul>
                                    {unInvoicedBuyersWithEntries.length > 5 && (
                                        <button
                                            onClick={() => toggleSection('uninvoiced')}
                                            className="mt-4 text-primary hover:underline font-semibold text-sm flex items-center gap-2 transition-colors hover:text-primary-dark"
                                        >
                                            {expandedSections.uninvoiced ? '▼ Show Less' : '▶ Show All (' + unInvoicedBuyersWithEntries.length + ')'}
                                        </button>
                                    )}
                                </div>
                            ) : (
                                <div className="flex items-center justify-center h-48 text-muted">
                                    <p>No uninvoiced entries found.</p>
                                </div>
                            )}
                        </Card>
                        <div className="space-y-6">
                            <Card>
                                <div className="flex justify-between items-center mb-4">
                                    <h3 className="font-bold text-lg">Entries Pending Auction</h3>
                                    {canCreate(Feature.Entries) && (
                                        <Link
                                            to="/entries"
                                            className="bg-primary-light text-primary font-bold py-1 px-3 rounded-lg flex items-center gap-1 text-xs hover:bg-blue-200 transition-colors"
                                        >
                                            {React.cloneElement(ICONS.plus, { className: "h-3 w-3" })} Add Entry
                                        </Link>
                                    )}
                                </div>
                                {pendingEntries.length > 0 ? (
                                    <div>
                                        <ul className="space-y-3 pr-2">
                                            {(expandedSections.pending ? pendingEntries : pendingEntries.slice(0, 5)).map(e => (
                                                <li key={e.id} className="flex items-center justify-between text-sm p-2 rounded-md hover:bg-secondary-light transition-colors">
                                                    <div>
                                                        <p className="font-medium text-on-surface">{e.serialNumber}</p>
                                                        <p className="text-xs text-muted">{new Date(e.createdAt).toLocaleDateString()}</p>
                                                    </div>
                                                    <Link to={`/auction?serial=${e.serialNumber}`} className="text-primary hover:underline font-semibold">Start Auction</Link>
                                                </li>
                                            ))}
                                        </ul>
                                        {pendingEntries.length > 5 && (
                                            <button
                                                onClick={() => toggleSection('pending')}
                                                className="mt-4 text-primary hover:underline font-semibold text-sm flex items-center gap-2 transition-colors hover:text-primary-dark"
                                            >
                                                {expandedSections.pending ? '▼ Show Less' : '▶ Show All (' + pendingEntries.length + ')'}
                                            </button>
                                        )}
                                    </div>
                                ) : (
                                    <div className="flex items-center justify-center h-48 text-muted">
                                        <p>No entries are pending auction.</p>
                                    </div>
                                )}
                            </Card>
                            <Card>
                                <h3 className="font-bold text-lg mb-4">Latest Transactions</h3>
                                {latestTransactions.length > 0 ? (
                                    <div>
                                        <ul className="space-y-3 pr-2">
                                            {(expandedSections.transactions ? latestTransactions : latestTransactions.slice(0, 5)).map(t => (
                                                <li key={t.id} className="flex items-center justify-between text-sm">
                                                    <div className="flex items-center gap-3 overflow-hidden">
                                                        <span className={`flex items-center justify-center w-8 h-8 rounded-full flex-shrink-0 ${t.type === TransactionType.Income ? 'bg-green-100 text-green-600' : 'bg-red-100 text-red-600'}`}>
                                                            {t.type === TransactionType.Income ? '↓' : '↑'}
                                                        </span>
                                                        <div className="flex-1 overflow-hidden min-w-0">
                                                            <p className="font-medium text-on-surface truncate" title={t.entityName}>{t.entityName}</p>
                                                            <p className="text-xs text-muted">{new Date(t.date).toLocaleString()}</p>
                                                        </div>
                                                    </div>
                                                    <span className={`font-bold flex-shrink-0 ml-2 ${t.type === TransactionType.Income ? 'text-success' : 'text-danger'}`}>
                                                        {formatCurrency(t.amount)}
                                                    </span>
                                                </li>
                                            ))}
                                        </ul>
                                        {latestTransactions.length > 5 && (
                                            <button
                                                onClick={() => toggleSection('transactions')}
                                                className="mt-4 text-primary hover:underline font-semibold text-sm flex items-center gap-2 transition-colors hover:text-primary-dark"
                                            >
                                                {expandedSections.transactions ? '▼ Show Less' : '▶ Show All (' + latestTransactions.length + ')'}
                                            </button>
                                        )}
                                    </div>
                                ) : (
                                    <div className="flex items-center justify-center h-20 text-muted">
                                        <p>No transactions available.</p>
                                    </div>
                                )}
                            </Card>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default Dashboard;
