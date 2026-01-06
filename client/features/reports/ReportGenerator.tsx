import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import Card from '../../components/ui/Card';
import { ICONS } from '../../constants';
import * as api from '../../services/api';
import { Buyer, Supplier, Product, PaymentMethod, Feature } from '../../types';
import SearchableSelect from '../../components/ui/SearchableSelect';
import { usePermissions } from '../../contexts/AuthContext';
import usePrintPreview from '../../hooks/usePrintPreview';
import BuyerStatementPrintView from '../../components/print/BuyerStatementPrintView';
import SupplierStatementPrintView from '../../components/print/SupplierStatementPrintView';

import AnalyticsDashboard from '../reports/AnalyticsDashboard';
import * as ReportViews from '../reports/ReportViews';
import DateRangePicker from '../../components/ui/DateRangePicker';
import DatePicker from '../../components/ui/DatePicker';

type ReportType = 'analytics' | 'sales' | 'purchases' | 'pnl' | 'wages_report' | 'buyer_ledger' | 'supplier_ledger' | 'buyer_balance_sheet' | 'supplier_balance_sheet' | 'cash_flow_details' | 'income_ledger' | 'expense_ledger' | 'invoice_aging' | 'product_sales' | 'adjustments_report' | 'discount_report' | 'commission_report';

const reportCategories = [
    {
        name: 'Overview', reports: [
            { value: 'analytics', label: 'Analytics Dashboard', icon: ICONS.analytics, feature: Feature.Reports, functionality: 'analytics' }
        ]
    },
    {
        name: 'Sales & Receivables', reports: [
            { value: 'sales', label: 'Sales Report', icon: ICONS.invoices, feature: Feature.Reports, functionality: 'sales' },
            { value: 'buyer_balance_sheet', label: 'Buyer Balance Sheet', icon: ICONS.balance_sheet, feature: Feature.Reports, functionality: 'buyer_balance_sheet' },
            { value: 'invoice_aging', label: 'Invoice Aging', icon: ICONS.aging, feature: Feature.Reports, functionality: 'invoice_aging' },
            { value: 'wages_report', label: 'Wages Report', icon: ICONS.cash, feature: Feature.Reports, functionality: 'wages_report' },
            { value: 'adjustments_report', label: 'Adjustments Report', icon: ICONS.edit, feature: Feature.Reports, functionality: 'adjustments_report' },
            { value: 'discount_report', label: 'Discount Report', icon: ICONS.minus, feature: Feature.Reports, functionality: 'discount_report' },
            { value: 'buyer_ledger', label: 'Buyer Ledger', icon: ICONS.buyers, feature: Feature.Reports, functionality: 'buyer_ledger' },
        ]
    },
    {
        name: 'Purchases & Payables', reports: [
            { value: 'purchases', label: 'Purchase Report', icon: ICONS.invoices, feature: Feature.Reports, functionality: 'purchases' },
            { value: 'supplier_balance_sheet', label: 'Supplier Balance Sheet', icon: ICONS.balance_sheet, feature: Feature.Reports, functionality: 'supplier_balance_sheet' },
            { value: 'supplier_ledger', label: 'Supplier Ledger', icon: ICONS.suppliers, feature: Feature.Reports, functionality: 'supplier_ledger' },
        ]
    },
    {
        name: 'Financials', reports: [
            { value: 'pnl', label: 'Profit & Loss', icon: ICONS.reports, feature: Feature.Reports, functionality: 'pnl' },
            { value: 'commission_report', label: 'Commission Report', icon: ICONS.cash, feature: Feature.Reports, functionality: 'commission_report' },
            { value: 'cash_flow_details', label: 'Cash Flow Details', icon: ICONS.cash, feature: Feature.Reports, functionality: 'cash_flow_details' },
            { value: 'income_ledger', label: 'Income Ledger', icon: ICONS.cash, feature: Feature.Reports, functionality: 'income_ledger' },
            { value: 'expense_ledger', label: 'Expense Ledger', icon: ICONS.cash, feature: Feature.Reports, functionality: 'expense_ledger' },
        ]
    },
    {
        name: 'Operational', reports: [
            { value: 'product_sales', label: 'Product Sales Analysis', icon: ICONS.products, feature: Feature.Reports, functionality: 'product_sales' },
        ]
    },
];

const ReportGenerator: React.FC = () => {
    const location = useLocation();
    const navigate = useNavigate();
    const { canView } = usePermissions();
    const { openPrintPreview, PrintPreview } = usePrintPreview();

    const [loading, setLoading] = useState(true);
    const [reportData, setReportData] = useState<any>(null);
    const [buyers, setBuyers] = useState<Buyer[]>([]);
    const [suppliers, setSuppliers] = useState<Supplier[]>([]);
    const [products, setProducts] = useState<Product[]>([]);
    const [isSidebarOpen, setIsSidebarOpen] = useState(false);

    const [filters, setFilters] = useState({
        startDate: new Date().toISOString().split('T')[0],
        endDate: new Date().toISOString().split('T')[0],
        entityId: '',
        productId: '',
        method: '',
    });

    const [wagesType, setWagesType] = useState<'buyer' | 'supplier'>('buyer');
    const [allWagesSummary, setAllWagesSummary] = useState<{ buyer: number; supplier: number } | null>(null);
    const hasInitialized = useRef(false);

    const availableReportCategories = useMemo(() => {
        if (!canView(Feature.Reports, 'view_page')) return [];
        return reportCategories.map(category => ({
            ...category,
            reports: category.reports.filter(report => canView(report.feature, report.functionality)),
        })).filter(category => category.reports.length > 0);
    }, [canView]);

    const firstAvailableReport = useMemo(() => {
        return availableReportCategories[0]?.reports[0]?.value as ReportType | undefined;
    }, [availableReportCategories]);

    const [reportType, setReportType] = useState<ReportType | undefined>();

    useEffect(() => {
        if (!canView(Feature.Reports, 'view_page')) navigate('/unauthorized');
        api.fetchBuyers().then(setBuyers);
        api.fetchSuppliers().then(setSuppliers);
        api.fetchProducts().then(setProducts);
    }, [canView, navigate]);

    const handleGenerateReport = useCallback(async (type: ReportType | undefined, currentFilters: typeof filters) => {
        if (!type) {
            setLoading(false);
            setReportData(null);
            return;
        };
        setLoading(true);
        setReportData(null);
        setAllWagesSummary(null);

        // For Analytics, if start date is empty, make it same as end date.
        let finalFilters = { ...currentFilters };
        if (type === 'analytics' && !finalFilters.startDate) {
            finalFilters.startDate = finalFilters.endDate;
        }

        const { startDate, endDate, entityId, productId, method } = finalFilters;

        try {
            let data;
            switch (type) {
                case 'analytics': data = await api.generateAnalyticsDashboardData({ startDate, endDate }); break;
                case 'sales': data = await api.generateSalesReport({ startDate, endDate, buyerId: entityId }); break;
                case 'purchases': data = await api.generatePurchaseReport({ startDate, endDate, supplierId: entityId }); break;
                case 'pnl': data = await api.generateProfitAndLoss({ startDate, endDate }); break;
                case 'wages_report':
                    // Fetch data for the currently selected table view, with all filters
                    if (wagesType === 'buyer') {
                        data = await api.generateWagesReport({ startDate, endDate, buyerId: entityId });
                    } else {
                        data = await api.generateSupplierWagesReport({ startDate, endDate, supplierId: entityId });
                    }

                    // For the summary cards, we need both totals.
                    const [buyerWagesData, supplierWagesData] = await Promise.all([
                        api.generateWagesReport({ startDate, endDate }),
                        api.generateSupplierWagesReport({ startDate, endDate })
                    ]);

                    setAllWagesSummary({
                        buyer: buyerWagesData?.summary?.totalWages || 0,
                        supplier: supplierWagesData?.summary?.totalWages || 0
                    });
                    break;
                case 'buyer_ledger': if (!entityId) { setLoading(false); return; } data = await api.generateLedger({ startDate, endDate, entityId, entityType: 'buyer' }); break;
                case 'supplier_ledger': if (!entityId) { setLoading(false); return; } data = await api.generateLedger({ startDate, endDate, entityId, entityType: 'supplier' }); break;
                case 'buyer_balance_sheet': data = await api.generateBuyerBalanceSheet({ asOfDate: endDate }); break;
                case 'supplier_balance_sheet': data = await api.generateSupplierBalanceSheet({ asOfDate: endDate }); break;
                case 'cash_flow_details': data = await api.generateCashFlowReport({ startDate, endDate }); break;
                case 'income_ledger': data = await api.generateIncomeLedger({ startDate, endDate, method: method as PaymentMethod }); break;
                case 'expense_ledger': data = await api.generateExpenseLedger({ startDate, endDate, method: method as PaymentMethod }); break;
                case 'invoice_aging': data = await api.generateInvoiceAgingReport({ asOfDate: endDate }); break;
                case 'product_sales': data = await api.generateProductSalesReport({ startDate, endDate, productId }); break;
                case 'adjustments_report': data = await api.generateAdjustmentsReport({ startDate, endDate, buyerId: entityId }); break;
                case 'discount_report': data = await api.generateDiscountReport({ startDate, endDate, buyerId: entityId }); break;
                case 'commission_report': data = await api.generateCommissionReport({ startDate, endDate }); break;
                default: break;
            }
            setReportData(data);
        } catch (error) {
            console.error("Failed to generate report:", error);
        } finally {
            setLoading(false);
        }
    }, [wagesType]);

    // Effect for handling initial load & navigation state
    useEffect(() => {
        if (hasInitialized.current) return;

        const state = location.state as any;
        const today = new Date().toISOString().split('T')[0];

        if (state?.reportType) {
            const type = state.reportType as ReportType;
            setReportType(type);
            setFilters({
                startDate: state.startDate ?? today,
                endDate: state.endDate ?? today,
                entityId: state.entityId ?? '', productId: state.productId ?? '', method: state.method ?? ''
            });
            navigate(location.pathname, { replace: true });
        } else if (firstAvailableReport) {
            setReportType(firstAvailableReport);
        }

        hasInitialized.current = true;
    }, [firstAvailableReport, location.state, navigate]);

    const handleReportTypeChange = (newType: ReportType) => {
        setReportType(newType);
        setReportData(null);
        const today = new Date().toISOString().split('T')[0];
        setFilters({
            startDate: today,
            endDate: today,
            entityId: '', productId: '', method: ''
        });
        // Close sidebar on mobile when report is selected
        if (window.innerWidth < 768) {
            setIsSidebarOpen(false);
        }
    };

    // Effect to call handleGenerateReport
    useEffect(() => {
        if (reportType && hasInitialized.current) {
            handleGenerateReport(reportType, filters);
        }
    }, [reportType, filters, handleGenerateReport]);


    const needsDateRange = !['buyer_balance_sheet', 'supplier_balance_sheet', 'invoice_aging'].includes(reportType || '');
    const needsAsOfDate = ['buyer_balance_sheet', 'supplier_balance_sheet', 'invoice_aging'].includes(reportType || '');
    const needsEntity = ['buyer_ledger', 'supplier_ledger', 'sales', 'purchases', 'wages_report', 'adjustments_report', 'discount_report', 'buyer_balance_sheet', 'supplier_balance_sheet', 'invoice_aging', 'commission_report'].includes(reportType || '');
    const needsProduct = reportType === 'product_sales';
    const needsMethod = ['income_ledger', 'expense_ledger'].includes(reportType || '');

    const renderFilters = () => {
        const isSupplierReport = ['supplier_ledger', 'purchases', 'supplier_balance_sheet', 'commission_report'].includes(reportType || '') || (reportType === 'wages_report' && wagesType === 'supplier');
        const isBuyerReport = ['buyer_ledger', 'sales', 'adjustments_report', 'discount_report', 'buyer_balance_sheet', 'invoice_aging'].includes(reportType || '') || (reportType === 'wages_report' && wagesType === 'buyer');

        return (
            <div className="flex flex-wrap items-end gap-4">
                {reportType === 'wages_report' && (
                    <div>
                        <label className="text-xs text-muted">Wages Type</label>
                        <select value={wagesType} onChange={e => setWagesType(e.target.value as 'buyer' | 'supplier')} className="w-full p-2 border border-gray-300 rounded-md text-sm h-[42px]">
                            <option value="buyer">Buyer Wages</option>
                            <option value="supplier">Supplier Wages</option>
                        </select>
                    </div>
                )}
                {needsDateRange && (
                    <div className="flex-grow">
                        <DateRangePicker
                            startDate={filters.startDate}
                            endDate={filters.endDate}
                            onStartDateChange={date => setFilters(f => ({ ...f, startDate: date }))}
                            onEndDateChange={date => setFilters(f => ({ ...f, endDate: date }))}
                            startLabel="From"
                            endLabel="To"
                        />
                    </div>
                )}
                {needsAsOfDate && (
                    <div className="flex-grow">
                        <DatePicker
                            label="As of Date"
                            value={filters.endDate}
                            onChange={date => setFilters(f => ({ ...f, endDate: date }))}
                        />
                    </div>
                )}
                {needsEntity && (
                    <div className="flex-grow min-w-[200px]">
                        <label className="text-xs text-muted">{isSupplierReport ? 'Supplier' : 'Buyer'}</label>
                        <SearchableSelect
                            options={isSupplierReport ? suppliers.map(s => ({ value: s.id, label: s.supplierName })) : buyers.map(b => ({ value: b.id, label: b.buyerName }))}
                            value={filters.entityId || null}
                            onChange={val => setFilters(f => ({ ...f, entityId: val || '' }))}
                            placeholder={`All ${isSupplierReport ? 'Suppliers' : 'Buyers'}`}
                        />
                    </div>
                )}
                {needsProduct && (<div className="flex-grow min-w-[200px]"><label className="text-xs text-muted">Product</label><SearchableSelect options={products.map(p => ({ value: p.id, label: p.displayName || p.productName }))} value={filters.productId || null} onChange={val => setFilters(f => ({ ...f, productId: val || '' }))} placeholder="All Products" /></div>)}
                {needsMethod && (<div><label className="text-xs text-muted">Method</label><select value={filters.method} onChange={e => setFilters(f => ({ ...f, method: e.target.value }))} className="w-full p-2 border border-gray-300 rounded-md text-sm h-[42px]"><option value="">All</option><option value={PaymentMethod.Bank}>Bank</option><option value={PaymentMethod.Cash}>Cash</option></select></div>)}
            </div>
        );
    };

    const renderReport = () => {
        if (!reportType) return <Card><p className="text-center p-10 text-muted">You do not have permission to view any reports.</p></Card>;
        const viewProps = {
            data: reportData,
            filters,
            buyers,
            suppliers,
            products,
            onRefresh: () => handleGenerateReport(reportType, filters),
            openPrintPreview,
        };
        if (!reportData) return <Card><p className="text-center p-10 text-muted">Please select filters to view a report.</p></Card>;
        switch (reportType) {
            case 'analytics': return <AnalyticsDashboard data={reportData} />;
            case 'sales': return <ReportViews.SalesReportView {...viewProps} />;
            case 'purchases': return <ReportViews.PurchaseReportView {...viewProps} />;
            case 'pnl': return <ReportViews.ProfitAndLossView {...viewProps} />;
            case 'wages_report': return <ReportViews.WagesReportView {...viewProps} wagesType={wagesType} allWagesSummary={allWagesSummary} />;
            case 'buyer_ledger': return <ReportViews.LedgerReportView {...viewProps} />;
            case 'supplier_ledger': return <ReportViews.LedgerReportView {...viewProps} />;
            case 'buyer_balance_sheet': return <ReportViews.BuyerBalanceSheetView {...viewProps} />;
            case 'supplier_balance_sheet': return <ReportViews.SupplierBalanceSheetView {...viewProps} />;
            case 'cash_flow_details': return <ReportViews.CashFlowDetailsView {...viewProps} />;
            case 'income_ledger': return <ReportViews.IncomeLedgerView {...viewProps} />;
            case 'expense_ledger': return <ReportViews.ExpenseLedgerView {...viewProps} />;
            case 'invoice_aging': return <ReportViews.InvoiceAgingView {...viewProps} />;
            case 'product_sales': return <ReportViews.ProductSalesReportView {...viewProps} />;
            case 'adjustments_report': return <ReportViews.AdjustmentsReportView {...viewProps} />;
            case 'discount_report': return <ReportViews.DiscountReportView {...viewProps} />;
            case 'commission_report': return <ReportViews.CommissionReportView {...viewProps} />;
            default: return <Card><h2 className="text-xl font-bold p-4">Report view not implemented for {reportType}</h2></Card>;
        }
    };

    return (
        <>
            {/* Mobile overlay for reports sidebar */}
            {isSidebarOpen && (
                <div 
                    onClick={() => setIsSidebarOpen(false)} 
                    className="fixed inset-0 bg-black bg-opacity-50 z-30 md:hidden"
                    aria-hidden="true"
                ></div>
            )}

            <div className="flex flex-col md:flex-row gap-6 min-w-0">
                {/* Reports Sidebar - Hidden on mobile, shown via button or always on md+ */}
                <aside className={`fixed inset-0 top-auto left-0 md:static w-full md:w-72 flex-shrink-0 no-print transition-transform duration-300 ease-in-out transform md:transform-none z-40 ${isSidebarOpen ? 'translate-y-0' : 'translate-y-full md:translate-y-0'}`}>
                    <Card>
                        <div className="flex items-center justify-between mb-4 md:mb-0">
                            <h2 className="text-lg font-semibold">Reports</h2>
                            <button 
                                onClick={() => setIsSidebarOpen(false)} 
                                className="md:hidden text-muted hover:text-on-surface transition-colors"
                                aria-label="Close reports menu"
                            >
                                {ICONS.close}
                            </button>
                        </div>
                        <nav className="space-y-4">
                            {availableReportCategories.map(category => (
                                <div key={category.name}>
                                    <h3 className="text-xs font-bold uppercase text-muted tracking-wider">{category.name}</h3>
                                    <ul className="mt-2 space-y-1">
                                        {category.reports.map(report => (
                                            <li key={report.value}>
                                                <button onClick={() => handleReportTypeChange(report.value as ReportType)} className={`w-full text-left flex items-center gap-3 p-2 rounded-md text-sm transition-colors ${reportType === report.value ? 'bg-primary-light text-primary font-bold' : 'text-on-surface hover:bg-secondary-light'}`}>{React.cloneElement(report.icon, { className: 'h-5 w-5' })}{report.label}</button>
                                            </li>
                                        ))}
                                    </ul>
                                </div>
                            ))}
                        </nav>
                    </Card>
                </aside>

                <main className="flex-1 space-y-6 min-w-0">
                    <Card className="relative z-40 no-print">
                        <div className="flex items-center gap-3">
                            <button 
                                onClick={() => setIsSidebarOpen(true)} 
                                className="md:hidden text-muted hover:text-on-surface transition-colors"
                                aria-label="Open reports menu"
                            >
                                {ICONS.menu}
                            </button>
                            <div className="flex-1">
                                {renderFilters()}
                            </div>
                        </div>
                    </Card>
                    <div id="report-content">
                        {loading ? <div className="flex justify-center p-10"><div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div></div> : renderReport()}
                    </div>
                </main>
            </div>
            <PrintPreview />
        </>
    );
};

export default ReportGenerator;
