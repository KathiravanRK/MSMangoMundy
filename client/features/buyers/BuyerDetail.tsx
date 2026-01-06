
import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { Buyer, Invoice, BuyerDetailStats, Feature, CashFlowTransaction, TransactionType } from '../../types';
import * as api from '../../services/api';
import { ICONS } from '../../constants';
import Card from '../../components/ui/Card';
import PageHeader from '../../components/ui/PageHeader';
import Spinner from '../../components/ui/Spinner';
import Alert from '../../components/ui/Alert';
import { formatCurrency, formatDate } from '../../utils/formatters';
import Button from '../../components/ui/Button';
import { SortableTable, Column } from '../../components/ui/SortableTable';
import { usePermissions } from '../../contexts/AuthContext';
import DonutChart from '../../components/charts/DonutChart';
import { useLocalStorage } from '../../hooks/useLocalStorage';
import DateRangePicker from '../../components/ui/DateRangePicker';
import BuyerPaymentModal from '../reports/components/BuyerPaymentModal';

const BarChart: React.FC<{ title: string; data: { id?: string; name: string; value: number }[] }> = ({ title, data }) => (
  <div>
    <h3 className="text-lg font-semibold mb-2">{title}</h3>
    <div className="space-y-2">
      {data.length > 0 ? data.map(item => (
        <div key={item.id || item.name} className="flex items-center gap-2 group">
          <span className="text-xs text-muted w-20 text-right truncate">{item.name}</span>
          <div className="flex-1 bg-secondary-light rounded-full h-6 relative">
            <div
              className="bg-primary h-6 rounded-full transition-all duration-500 ease-out flex items-center pl-2"
              style={{ width: `${(item.value / Math.max(...data.map(d => d.value), 1)) * 100}%` }}
            >
              <span className="text-xs font-bold text-white">
                {formatCurrency(item.value, { maximumFractionDigits: 0 })}
              </span>
            </div>
          </div>
        </div>
      )) : <p className="text-muted text-sm py-8 text-center">No purchase data available.</p>}
    </div>
  </div>
);

const SimpleTable: React.FC<{ title: string; data: { id?: string; name: string; value: number }[] }> = ({ title, data }) => (
  <div className="mt-4">
    <h3 className="text-lg font-semibold mb-2">{title}</h3>
    <div className="overflow-y-auto max-h-60 border rounded-lg">
      <table className="w-full text-sm">
        <thead className="sticky top-0 bg-secondary-light">
          <tr>
            <th className="p-2 text-left font-medium text-muted">Product</th>
            <th className="p-2 text-right font-medium text-muted">Total Value</th>
          </tr>
        </thead>
        <tbody>
          {data.length > 0 ? data.map(item => (
            <tr key={item.id || item.name} className="border-b border-border-color">
              <td className="p-2">{item.name}</td>
              <td className="p-2 text-right font-semibold">{formatCurrency(item.value)}</td>
            </tr>
          )) : (
            <tr>
              <td colSpan={2} className="text-center p-4 text-muted">No product data available.</td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  </div>
);

interface LedgerItem {
  id: string;
  date: Date;
  particulars: React.ReactNode;
  debit: number;
  credit: number;
  balance: number;
  type: 'invoice' | 'payment';
}

const BuyerDetail: React.FC = () => {
  const { buyerId } = useParams<{ buyerId: string }>();
  const navigate = useNavigate();
  const { canView } = usePermissions();

  const [buyer, setBuyer] = useState<Buyer | null>(null);
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [stats, setStats] = useState<BuyerDetailStats | null>(null);
  const [transactions, setTransactions] = useState<CashFlowTransaction[]>([]);
  const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);


  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [historyFilters, setHistoryFilters] = useState({
    startDate: '',
    endDate: '',
    type: 'all', // 'all', 'invoice', 'payment'
  });

  useEffect(() => {
    if (!canView(Feature.Buyers, 'details')) {
      navigate('/unauthorized', { replace: true });
    }
  }, [canView, navigate]);

  const loadAllData = useCallback(async () => {
    if (!buyerId) return;
    setLoading(true);
    setError(null);
    try {
      const [buyerData, invoicesData, statsData, cashFlowData] = await Promise.all([
        api.fetchBuyer(buyerId),
        api.fetchInvoicesForBuyer(buyerId),
        api.fetchBuyerDetailStats(buyerId),
        api.fetchCashFlowTransactions(),
      ]);
      setBuyer(buyerData);
      setInvoices(invoicesData);
      setStats(statsData);
      setTransactions(cashFlowData);
    } catch (e) {
      setError('Failed to load buyer data.');
      console.error(e);
    } finally {
      setLoading(false);
    }
  }, [buyerId]);

  useEffect(() => {
    loadAllData();
  }, [loadAllData]);

  const paymentHistory = useMemo(() =>
    transactions.filter(t => t.entityId === buyerId && t.type === TransactionType.Income),
    [transactions, buyerId]
  );

  const quickStats = useMemo(() => {
    if (!stats || !invoices || invoices.length === 0) {
      return null;
    }
    const sortedInvoices = [...invoices].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

    return {
      totalInvoices: invoices.length,
      totalInvoiceValue: stats.totalBuys,
      lastActiveDate: formatDate(sortedInvoices[0].createdAt),
      totalItemsPurchased: invoices.reduce((sum, inv) => sum + inv.totalQuantities, 0),
      totalWages: stats.totalWages,
    };
  }, [stats, invoices]);

  const weeklyPurchaseData = useMemo(() => {
    if (!invoices || invoices.length === 0) return [];

    const twelveWeeksAgo = new Date();
    twelveWeeksAgo.setDate(twelveWeeksAgo.getDate() - (12 * 7));

    const weeklyData: { [key: string]: number } = {};

    const getWeekStart = (d: Date) => {
      const date = new Date(d);
      const day = date.getDay();
      const diff = date.getDate() - day + (day === 0 ? -6 : 1); // Monday as start of week
      date.setDate(diff);
      return new Date(date.setHours(0, 0, 0, 0));
    };

    invoices
      .filter(inv => new Date(inv.createdAt) >= twelveWeeksAgo)
      .forEach(inv => {
        const weekStart = getWeekStart(new Date(inv.createdAt));
        const weekKey = weekStart.toISOString().split('T')[0];
        weeklyData[weekKey] = (weeklyData[weekKey] || 0) + (inv.nettAmount - (inv.discount || 0));
      });

    return Object.entries(weeklyData)
      .sort(([weekA], [weekB]) => new Date(weekA).getTime() - new Date(weekB).getTime())
      .map(([week, value]) => ({
        name: new Date(week + 'T12:00:00Z').toLocaleString('default', { month: 'short', day: 'numeric' }),
        value
      }));
  }, [invoices]);

  const topProductsData = useMemo(() => {
    if (!invoices || invoices.length === 0) return [];
    const productData: { [key: string]: { id: string; name: string; value: number } } = {};

    invoices.forEach(inv => {
      inv.items.forEach(item => {
        if (!productData[item.productId]) {
          productData[item.productId] = { id: item.productId, name: item.productName, value: 0 };
        }
        productData[item.productId].value += item.subTotal;
      });
    });

    return Object.values(productData)
      .sort((a, b) => b.value - a.value);

  }, [invoices]);

  const ledgerEntries = useMemo(() => {
    const combined: Omit<LedgerItem, 'balance'>[] = [];

    invoices.forEach(inv => {
      combined.push({
        id: `inv-${inv.id}`,
        date: new Date(inv.createdAt),
        particulars: (
          <Link to="/invoices" state={{ buyerIdToLoad: buyer?.id, invoiceIdToView: inv.id }} className="text-primary hover:underline">
            Invoice #{inv.invoiceNumber}
          </Link>
        ),
        debit: inv.nettAmount - (inv.discount || 0),
        credit: 0,
        type: 'invoice',
      });
    });

    paymentHistory.forEach(p => {
      const totalCredit = p.amount + (p.discount || 0);
      combined.push({
        id: `pay-${p.id}`,
        date: new Date(p.date),
        particulars: p.description || 'Payment Received',
        debit: 0,
        credit: totalCredit,
        type: 'payment',
      });
    });

    combined.sort((a, b) => a.date.getTime() - b.date.getTime());

    const startDateObj = historyFilters.startDate ? new Date(historyFilters.startDate) : null;
    if (startDateObj) startDateObj.setHours(0, 0, 0, 0);

    const openingBalance = combined
      .filter(item => startDateObj && item.date < startDateObj)
      .reduce((acc, item) => acc + item.debit - item.credit, 0);

    const endDateObj = historyFilters.endDate ? new Date(historyFilters.endDate) : null;
    if (endDateObj) endDateObj.setHours(23, 59, 59, 999);

    const filtered = combined.filter(item => {
      const itemDate = item.date;
      const isAfterStart = !startDateObj || itemDate >= startDateObj;
      const isBeforeEnd = !endDateObj || itemDate <= endDateObj;
      const typeMatch = historyFilters.type === 'all' || item.type === historyFilters.type;
      return isAfterStart && isBeforeEnd && typeMatch;
    });

    let runningBalance = openingBalance;
    const finalLedger: LedgerItem[] = [];

    if (startDateObj) {
      finalLedger.push({
        id: 'opening-balance',
        date: startDateObj,
        particulars: <strong>Opening Balance</strong>,
        debit: 0, credit: 0,
        balance: openingBalance,
        type: 'payment',
      });
    }

    filtered.forEach(item => {
      runningBalance += item.debit - item.credit;
      finalLedger.push({ ...item, balance: runningBalance });
    });

    return finalLedger.sort((a, b) => b.date.getTime() - a.date.getTime());
  }, [invoices, paymentHistory, historyFilters, buyer]);

  const ledgerColumns: Column<LedgerItem>[] = useMemo(() => [
    { key: 'date', header: 'Date', accessor: (item) => formatDate(item.date), sortable: true, sortAccessor: 'date', isDefault: true },
    { key: 'particulars', header: 'Particulars', accessor: 'particulars', isDefault: true },
    { key: 'debit', header: 'Debit', accessor: (item) => item.debit > 0 ? formatCurrency(item.debit) : '-', className: 'text-right font-medium text-red-600', sortable: true, sortAccessor: 'debit', isDefault: true },
    { key: 'credit', header: 'Credit', accessor: (item) => item.credit > 0 ? formatCurrency(item.credit) : '-', className: 'text-right font-medium text-green-600', sortable: true, sortAccessor: 'credit', isDefault: true },
    { key: 'balance', header: 'Balance', accessor: (item) => formatCurrency(item.balance), className: 'text-right font-semibold', sortable: true, sortAccessor: 'balance', isDefault: true },
  ], []);

  const [visibleLedgerColumns, setVisibleLedgerColumns] = useLocalStorage<string[]>(
    `table-cols-buyer-ledger-${buyerId}`,
    ledgerColumns.filter(c => c.isDefault).map(c => c.key)
  );

  const renderLedgerMobileCard = (item: LedgerItem) => (
    <div className="p-4 space-y-2">
      <div className="flex justify-between items-start">
        <div>
          <p className="font-semibold text-dark">{item.particulars}</p>
          <p className="text-xs text-muted">{formatDate(item.date)}</p>
        </div>
        <div className="text-right">
          <p className="font-bold text-lg">{formatCurrency(item.balance)}</p>
          {item.debit > 0 && <p className="text-sm text-danger">-{formatCurrency(item.debit)}</p>}
          {item.credit > 0 && <p className="text-sm text-success">+{formatCurrency(item.credit)}</p>}
        </div>
      </div>
    </div>
  );

  if (loading) {
    return (
      <div className="space-y-8 animate-pulse">
        <div className="h-20 bg-gray-200 rounded-lg"></div>
        <div className="h-48 bg-gray-200 rounded-lg"></div>
        <div className="h-64 bg-gray-200 rounded-lg"></div>
        <div className="h-80 bg-gray-200 rounded-lg"></div>
      </div>
    );
  }

  if (error) {
    return <Alert message={error} />;
  }

  if (!buyer) {
    return <Alert message="Buyer not found." type="warning" />;
  }

  return (
    <>
      <PageHeader title={buyer.displayName || buyer.buyerName} subtitle={`${buyer.place} | ${buyer.contactNumber}`}>
        <div className="flex items-center gap-4">
          <Button onClick={() => setIsPaymentModalOpen(true)} variant="primary">Receive Payment</Button>
          <div className="text-right">
            <p className="text-sm text-muted">Outstanding Balance</p>
            <p className={`text-2xl font-bold ${buyer.outstanding > 0 ? 'text-danger' : 'text-success'}`}>{formatCurrency(buyer.outstanding)}</p>
          </div>
        </div>
      </PageHeader>

      <Card>
        <div className="flex justify-between items-start">
          <div>
            <h1 className="text-3xl font-bold">{buyer.displayName || buyer.buyerName}</h1>
            <div className="flex items-center gap-x-4 gap-y-1 text-muted flex-wrap mt-1">
              {buyer.displayName && buyer.displayName !== buyer.buyerName && <span>(Legal Name: {buyer.buyerName})</span>}
              {buyer.alias && <span>(Alias: {buyer.alias})</span>}
              {buyer.tokenNumber && <span>Token #: <span className="font-semibold text-on-surface">{buyer.tokenNumber}</span></span>}
            </div>
            <p className="text-muted mt-2">{buyer.place} | {buyer.contactNumber}</p>
          </div>
          <div className="text-right flex-shrink-0 ml-4">
            <p className="text-sm text-muted">Outstanding Balance</p>
            <p className={`text-2xl font-bold ${buyer.outstanding > 0 ? 'text-danger' : 'text-success'}`}>{formatCurrency(buyer.outstanding)}</p>
          </div>
        </div>
        {buyer.description && (
          <div className="mt-4 pt-4 border-t border-border-color">
            <h3 className="text-sm font-bold text-muted uppercase tracking-wider">Description</h3>
            <p className="mt-1 text-on-surface whitespace-pre-wrap">{buyer.description}</p>
          </div>
        )}
      </Card>

      {quickStats && canView(Feature.Buyers, 'details_quick_stats') && (
        <Card>
          <h2 className="text-xl font-bold mb-4">Quick Stats</h2>
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4 text-center">
            <div className="bg-secondary-light p-3 rounded-lg">
              <p className="text-sm text-muted">Total Invoices</p>
              <p className="font-bold text-lg text-on-surface">{quickStats.totalInvoices}</p>
            </div>
            <div className="bg-secondary-light p-3 rounded-lg">
              <p className="text-sm text-muted">Total Invoice Value</p>
              <p className="font-bold text-lg text-on-surface">{formatCurrency(quickStats.totalInvoiceValue)}</p>
            </div>
            <div className="bg-secondary-light p-3 rounded-lg">
              <p className="text-sm text-muted">Total Items</p>
              <p className="font-bold text-lg text-on-surface">{quickStats.totalItemsPurchased.toLocaleString('en-IN')}</p>
            </div>
            <div className="bg-secondary-light p-3 rounded-lg">
              <p className="text-sm text-muted">Total Wages</p>
              <p className="font-bold text-lg text-on-surface">{formatCurrency(quickStats.totalWages)}</p>
            </div>
            <div className="bg-secondary-light p-3 rounded-lg">
              <p className="text-sm text-muted">Last Purchase</p>
              <p className="font-bold text-lg text-on-surface">{quickStats.lastActiveDate}</p>
            </div>
          </div>
        </Card>
      )}

      {canView(Feature.Buyers, 'details_analytics') && (
        <Card>
          <h2 className="text-xl font-bold mb-4">Analytics Overview</h2>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            <BarChart title="Weekly Purchases (Last 12 Weeks)" data={weeklyPurchaseData} />
            <div>
              <DonutChart title="Top Products Purchased" data={topProductsData} />
              <SimpleTable title="Product Breakdown" data={topProductsData} />
            </div>
          </div>
        </Card>
      )}

      {stats && canView(Feature.Buyers, 'details_financial_summary') && (
        <Card>
          <h2 className="text-xl font-bold mb-4">Financial Summary</h2>
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-4 text-center">
            <div className="bg-secondary-light p-3 rounded-lg">
              <p className="text-sm text-muted">Total Item Value</p>
              <p className="font-bold text-lg text-on-surface">{formatCurrency(stats.totalItemValue)}</p>
            </div>
            <div className="bg-secondary-light p-3 rounded-lg">
              <p className="text-sm text-muted">Total Invoice Value</p>
              <p className="font-bold text-lg text-on-surface">{formatCurrency(stats.totalBuys)}</p>
            </div>
            <div className="bg-secondary-light p-3 rounded-lg">
              <p className="text-sm text-muted">Total Payments</p>
              <p className="font-bold text-lg text-success-dark">{formatCurrency(stats.totalPayments)}</p>
            </div>
            <div className="bg-secondary-light p-3 rounded-lg">
              <p className="text-sm text-muted">Total Wages</p>
              <p className="font-bold text-lg text-on-surface">{formatCurrency(stats.totalWages)}</p>
            </div>
            <div className="bg-secondary-light p-3 rounded-lg">
              <p className="text-sm text-muted">Total Discounts</p>
              <p className="font-bold text-lg text-info-dark">{formatCurrency(stats.totalDiscounts)}</p>
            </div>
            <div className="bg-secondary-light p-3 rounded-lg">
              <p className="text-sm text-muted">Adjustments (+)</p>
              <p className="font-bold text-lg text-success-dark">{formatCurrency(stats.positiveAdjustments)}</p>
            </div>
            <div className="bg-secondary-light p-3 rounded-lg">
              <p className="text-sm text-muted">Adjustments (-)</p>
              <p className="font-bold text-lg text-danger-dark">{formatCurrency(Math.abs(stats.negativeAdjustments))}</p>
            </div>
          </div>
        </Card>
      )}

      {canView(Feature.Buyers, 'details_invoice_history') && (
        <Card>
          <div className="flex flex-col md:flex-row justify-between md:items-center gap-4 mb-4">
            <h2 className="text-xl font-bold">Transaction History</h2>
            <div className="flex flex-wrap items-end gap-4">
              <DateRangePicker
                startDate={historyFilters.startDate}
                endDate={historyFilters.endDate}
                onStartDateChange={date => setHistoryFilters(f => ({ ...f, startDate: date }))}
                onEndDateChange={date => setHistoryFilters(f => ({ ...f, endDate: date }))}
              />
              <div>
                <label className="text-xs text-muted">Type</label>
                <select
                  value={historyFilters.type}
                  onChange={e => setHistoryFilters(f => ({ ...f, type: e.target.value }))}
                  className="w-full p-2 border border-gray-300 rounded-md text-sm h-[42px] bg-white"
                >
                  <option value="all">All Transactions</option>
                  <option value="invoice">Invoices</option>
                  <option value="payment">Payments</option>
                </select>
              </div>
            </div>
          </div>

          <SortableTable<LedgerItem>
            columns={ledgerColumns}
            data={ledgerEntries}
            loading={loading}
            tableId={`buyer-ledger-${buyerId}`}
            defaultSortField='date'
            visibleColumns={visibleLedgerColumns}
            onColumnToggle={(key) => setVisibleLedgerColumns(prev => prev.includes(key) ? prev.filter(k => k !== key) : [...prev, key])}
            emptyStateMessage="No transactions found for the selected period."
            renderMobileCard={renderLedgerMobileCard}
          />
        </Card>
      )}
      <BuyerPaymentModal
        isOpen={isPaymentModalOpen}
        onClose={() => setIsPaymentModalOpen(false)}
        onSuccess={() => {
          setIsPaymentModalOpen(false);
          loadAllData();
        }}
        buyer={buyer}
      />
    </>
  );
};

export default BuyerDetail;
