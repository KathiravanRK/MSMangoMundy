
import React, { useMemo, useState, ReactNode } from 'react';
import { useNavigate } from 'react-router-dom';
import { SalesReportData, PurchaseReportData, ProfitAndLossData, WagesReportData, LedgerReportData, BuyerBalanceSheetData, SupplierBalanceSheetData, CashFlowDetailsData, InvoiceAgingReportData, ProductSalesReportData, AdjustmentsReportData, IncomeLedgerData, ExpenseLedgerData, InvoiceAgingItem, ExpenseCategory, PaymentMethod, Buyer, Supplier, Product, DiscountReportData, CommissionReportData, SupplierWagesReportData, CashFlowTransaction } from '../../types';
import Card from '../../components/ui/Card';
import { SortableTable, Column } from '../../components/ui/SortableTable';
import { formatCurrency, formatDate } from '../../utils/formatters';
import { useAuth } from '../../contexts/AuthContext';
import * as api from '../../services/api';
import ReportPrintLayout from './components/ReportPrintLayout';
import { useLocalStorage } from '../../hooks/useLocalStorage';
import Modal from '../../components/ui/Modal';
import Button from '../../components/ui/Button';
import SupplierPaymentModal from './components/SupplierPaymentModal';
import BuyerPaymentModal from './components/BuyerPaymentModal';
import StatCard from '../../components/ui/StatCard';
import ReportActions from './components/ReportActions';

interface PrintPreviewOptions {
    mode?: 'thermal' | 'a4';
    size?: 'md' | 'lg' | 'xl' | '2xl' | '4xl' | '6xl';
}

interface ViewProps {
    filters: any;
    buyers: Buyer[];
    suppliers: Supplier[];
    products: Product[];
    onRefresh: () => void;
    openPrintPreview: (title: string, content: React.ReactNode, options?: PrintPreviewOptions) => void;
}

// --- SALES & RECEIVABLES ---

export const SalesReportView: React.FC<{ data: SalesReportData | any[] } & ViewProps> = ({ data: rawData, filters, buyers, onRefresh, openPrintPreview }) => {
    const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
    const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);
    const [payingBuyer, setPayingBuyer] = useState<Buyer | null>(null);

    const handleOpenPaymentModal = (buyerId: string) => {
        const buyer = buyers.find(b => b.id === buyerId);
        if (buyer) {
            setPayingBuyer(buyer);
            setIsPaymentModalOpen(true);
        }
    };

    const { invoices, summary } = useMemo(() => {
        if (Array.isArray(rawData)) {
            const invs = rawData.map(i => ({ ...i, id: i.id || i.invoiceNumber, balance: i.balance ?? ((i.nettAmount - (i.discount || 0)) - (i.paidAmount || 0)) }));
            return {
                invoices: invs,
                summary: {
                    totalSales: invs.reduce((sum, i) => sum + (i.nettAmount - (i.discount || 0)), 0),
                    totalPaid: invs.reduce((sum, i) => sum + (i.paidAmount || 0), 0),
                    totalBalance: invs.reduce((sum, i) => sum + i.balance, 0),
                    invoiceCount: invs.length
                }
            };
        }
        return rawData as SalesReportData;
    }, [rawData]);

    const handleSelectRow = (id: string) => {
        setSelectedIds(prev => {
            const next = new Set(prev);
            if (next.has(id)) {
                next.delete(id);
            } else {
                next.add(id);
            }
            return next;
        });
    };

    const handleSelectAll = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.checked) {
            setSelectedIds(new Set(invoices.map((i: any) => i.id)));
        } else {
            setSelectedIds(new Set());
        }
    };

    const isAllSelected = selectedIds.size > 0 && selectedIds.size === invoices.length;

    const allColumns = useMemo<Column<any>[]>(() => [
        {
            key: 'select',
            header: <input type="checkbox" checked={isAllSelected} onChange={handleSelectAll} />,
            accessor: (i: any) => <input type="checkbox" checked={selectedIds.has(i.id)} onChange={() => handleSelectRow(i.id)} onClick={(e) => e.stopPropagation()} />,
            className: "w-10 text-center",
            isDefault: true
        },
        { key: 'invoiceNumber', header: 'Invoice #', accessor: 'invoiceNumber', sortable: true, isDefault: true },
        { key: 'createdAt', header: 'Date', accessor: (i: any) => formatDate(i.createdAt), sortable: true, isDefault: true },
        { key: 'buyerName', header: 'Buyer', accessor: (i: any) => <span title={i.buyerName} className="truncate block max-w-xs">{i.buyerName}</span>, sortAccessor: 'buyerName', sortable: true, isDefault: true },
        { key: 'nettAmount', header: 'Amount', accessor: (i: any) => formatCurrency(i.nettAmount - (i.discount || 0)), sortable: true, className: 'text-right', isDefault: true },
        { key: 'paidAmount', header: 'Paid', accessor: (i: any) => formatCurrency(i.paidAmount), sortable: true, className: 'text-right' },
        { key: 'balance', header: 'Balance', accessor: (i: any) => formatCurrency(i.balance), sortable: true, className: 'text-right', isDefault: true },
        {
            key: 'paymentAction',
            header: 'Action',
            accessor: (item: any) => (
                <Button size="sm" onClick={(e) => { e.stopPropagation(); handleOpenPaymentModal(item.buyerId); }}>
                    Receive
                </Button>
            ),
            isDefault: true,
            className: 'text-center'
        }
    ], [buyers, isAllSelected, selectedIds, invoices]);

    const [visibleColumns, setVisibleColumns] = useLocalStorage<string[]>('table-cols-sales-report', allColumns.filter(c => c.isDefault).map(c => c.key));
    const printColumns = useMemo(() => allColumns.filter(c => visibleColumns.includes(c.key) && c.key !== 'paymentAction' && c.key !== 'select'), [allColumns, visibleColumns]);

    const handlePrintPreview = (selectedOnly: boolean) => {
        const dataToPrint = selectedOnly ? invoices.filter((i: any) => selectedIds.has(i.id)) : invoices;

        if (selectedOnly && dataToPrint.length === 0) {
            alert('Please select at least one row to print.');
            return;
        }

        const printSummary = {
            totalSales: dataToPrint.reduce((sum: number, i: any) => sum + (i.nettAmount - (i.discount || 0)), 0),
            totalPaid: dataToPrint.reduce((sum: number, i: any) => sum + (i.paidAmount || 0), 0),
            totalBalance: dataToPrint.reduce((sum: number, i: any) => sum + i.balance, 0),
            invoiceCount: dataToPrint.length
        };

        const title = selectedOnly ? `Sales Report (${dataToPrint.length} selected)` : 'Sales Report';
        const modalSize = printColumns.length <= 4 ? '2xl' : '6xl';

        openPrintPreview(title, (
            <ReportPrintLayout
                reportTitle={title}
                filters={<p><strong>Period:</strong> {filters.startDate ? formatDate(filters.startDate) : 'N/A'} to {formatDate(filters.endDate)}<br /><strong>Buyer:</strong> {filters.entityId ? buyers.find(b => b.id === filters.entityId)?.buyerName : 'All'}</p>}
                columns={printColumns}
                data={dataToPrint}
                summarySection={
                    Object.entries(printSummary).map(([key, value]) => (
                        <div className="summary-item" key={key}><span>{key.replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase())}</span><span>{typeof value === 'number' ? formatCurrency(value) : value}</span></div>
                    ))
                }
            />
        ), { mode: 'a4', size: modalSize });
    };

    const renderMobileCard = (invoice: any) => (
        <div className="p-4 space-y-2">
            <div className="flex items-start gap-3">
                <input type="checkbox" checked={selectedIds.has(invoice.id)} onChange={() => handleSelectRow(invoice.id)} onClick={(e) => e.stopPropagation()} className="h-5 w-5 mt-1" />
                <div className="flex-1">
                    <div className="flex justify-between items-start">
                        <div>
                            <p className="font-bold text-primary">{invoice.invoiceNumber}</p>
                            <p className="text-xs text-muted">{formatDate(invoice.createdAt)}</p>
                        </div>
                        <p className="text-right font-semibold">{formatCurrency(invoice.nettAmount - (invoice.discount || 0))}</p>
                    </div>
                    <p className="text-sm truncate">Buyer: {invoice.buyerName}</p>
                    <div className="flex justify-between text-sm pt-2 border-t mt-2 items-center">
                        <div>
                            <span className="text-muted">Balance:</span>
                            <span className="ml-1 font-semibold text-danger">{formatCurrency(invoice.balance)}</span>
                        </div>
                        <Button size="sm" onClick={(e) => { e.stopPropagation(); handleOpenPaymentModal(invoice.buyerId); }}>
                            Receive
                        </Button>
                    </div>
                </div>
            </div>
        </div>
    );

    const customActions = (
        <ReportActions
            onPrintPreview={() => handlePrintPreview(false)}
            onPrintSelected={() => handlePrintPreview(true)}
            selectedCount={selectedIds.size}
        />
    );

    return (
        <Card>
            <h2 className="text-xl font-bold mb-4">Sales Report</h2>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
                <StatCard title="Total Sales" value={formatCurrency(summary.totalSales)} className="bg-blue-50 text-blue-800 text-center" />
                <StatCard title="Total Paid" value={formatCurrency(summary.totalPaid)} className="bg-green-50 text-green-800 text-center" />
                <StatCard title="Total Balance" value={formatCurrency(summary.totalBalance)} className="bg-red-50 text-red-800 text-center" />
                <StatCard title="Invoice Count" value={summary.invoiceCount.toLocaleString('en-IN')} className="bg-gray-50 text-gray-800 text-center" />
            </div>
            <SortableTable columns={allColumns} data={invoices || []} tableId="sales-report" defaultSortField="createdAt" visibleColumns={visibleColumns} onColumnToggle={(key) => setVisibleColumns(prev => prev.includes(key) ? prev.filter(k => k !== key) : [...prev, key])} renderMobileCard={renderMobileCard} customActions={customActions} onRowClick={(item) => handleSelectRow(item.id)} />
            <BuyerPaymentModal
                isOpen={isPaymentModalOpen}
                onClose={() => setIsPaymentModalOpen(false)}
                onSuccess={() => {
                    setIsPaymentModalOpen(false);
                    onRefresh();
                }}
                buyer={payingBuyer}
            />
        </Card>
    );
};

export const BuyerBalanceSheetView: React.FC<{ data: BuyerBalanceSheetData } & ViewProps> = ({ data, buyers, onRefresh, openPrintPreview }) => {
    const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
    const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);
    const [payingBuyer, setPayingBuyer] = useState<Buyer | null>(null);

    const handleSelectRow = (buyerId: string) => {
        setSelectedIds(prev => {
            const next = new Set(prev);
            if (next.has(buyerId)) {
                next.delete(buyerId);
            } else {
                next.add(buyerId);
            }
            return next;
        });
    };

    const handleOpenPaymentModal = (buyerId: string) => {
        const buyerToPay = buyers.find(b => b.id === buyerId);
        if (buyerToPay) {
            setPayingBuyer({ ...buyerToPay, outstanding: data.balances.find(b => b.buyerId === buyerId)?.balance || 0 });
            setIsPaymentModalOpen(true);
        }
    };

    const handleSelectAll = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.checked) {
            setSelectedIds(new Set(data.balances.map(b => b.buyerId)));
        } else {
            setSelectedIds(new Set());
        }
    };

    const isAllSelected = selectedIds.size > 0 && selectedIds.size === data.balances.length;

    const allColumns = useMemo<Column<any>[]>(() => [
        {
            key: 'select',
            header: <input type="checkbox" checked={isAllSelected} onChange={handleSelectAll} />,
            accessor: (i: any) => <input type="checkbox" checked={selectedIds.has(i.buyerId)} onChange={() => handleSelectRow(i.buyerId)} onClick={(e) => e.stopPropagation()} />,
            className: "w-10 text-center",
            isDefault: true
        },
        { key: 'buyerName', header: 'Buyer Name', accessor: (i: any) => <span title={i.buyerName} className="truncate block max-w-xs">{i.buyerName}</span>, sortAccessor: 'buyerName', sortable: true, isDefault: true },
        { key: 'contactNumber', header: 'Contact Number', accessor: 'contactNumber', isDefault: true },
        { key: 'lastInvoiceDate', header: 'Last Invoice', accessor: (i: any) => i.lastInvoiceDate ? formatDate(i.lastInvoiceDate) : 'N/A', sortable: true, isDefault: true },

        { key: 'balance', header: 'Balance Due', accessor: (i: any) => formatCurrency(i.balance), sortable: true, className: 'text-right', isDefault: true },
        {
            key: 'paymentAction',
            header: 'Action',
            accessor: (item: any) => (
                <Button size="sm" onClick={(e) => { e.stopPropagation(); handleOpenPaymentModal(item.buyerId); }}>
                    Receive
                </Button>
            ),
            isDefault: true,
            className: 'text-center'
        }
    ], [isAllSelected, selectedIds, data.balances]);

    const [visibleColumns, setVisibleColumns] = useLocalStorage<string[]>('table-cols-buyer-balance', allColumns.filter(c => c.isDefault).map(c => c.key));
    const printColumns = useMemo(() => allColumns.filter(c => visibleColumns.includes(c.key) && c.key !== 'paymentAction'), [allColumns, visibleColumns]);

    const handlePrintPreview = (selectedOnly: boolean) => {
        const dataToPrint = selectedOnly ? data.balances.filter(b => selectedIds.has(b.buyerId)) : data.balances;

        if (selectedOnly && dataToPrint.length === 0) {
            alert('Please select at least one buyer to print.');
            return;
        }

        const title = selectedOnly ? `Selected Buyer Balances (${dataToPrint.length})` : 'Buyer Balance Sheet';

        openPrintPreview(
            title,
            <ReportPrintLayout
                reportTitle={title}
                filters={<p><strong>As of Date:</strong> {formatDate(data.asOfDate)}</p>}
                columns={printColumns.filter(c => c.key !== 'select')}
                data={dataToPrint}
                summarySection={
                    <div className="summary-item"><span>Total Balance Due</span><span>{formatCurrency(dataToPrint.reduce((sum, b) => sum + b.balance, 0))}</span></div>
                }
            />,
            { mode: 'a4', size: '6xl' }
        );
    };

    const renderMobileCard = (buyer: any) => (
        <div className="p-4 flex items-center">
            <div className="pl-2 pr-4">
                <input type="checkbox" checked={selectedIds.has(buyer.buyerId)} onChange={() => handleSelectRow(buyer.buyerId)} onClick={(e) => e.stopPropagation()} className="h-5 w-5" />
            </div>
            <div className="flex-1 overflow-hidden">
                <p className="font-bold truncate">{buyer.buyerName}</p>
                <p className="text-xs text-muted">{buyer.contactNumber}</p>
                <p className="text-xs text-muted">Last Invoice: {buyer.lastInvoiceDate ? formatDate(buyer.lastInvoiceDate) : 'N/A'}</p>
            </div>
            <p className="text-right font-semibold text-danger flex-shrink-0 ml-2">{formatCurrency(buyer.balance)}</p>
            <div className="w-full flex justify-end pt-2 mt-2 border-t">
                <Button size="sm" onClick={(e) => { e.stopPropagation(); handleOpenPaymentModal(buyer.buyerId); }}>
                    Receive
                </Button>
            </div>
        </div>
    );

    const customActions = (
        <div className="flex items-center gap-2">
            <Button onClick={() => handlePrintPreview(true)} disabled={selectedIds.size === 0}>
                Print Selected ({selectedIds.size})
            </Button>
            <ReportActions onPrintPreview={() => handlePrintPreview(false)} />
        </div>
    );

    return (
        <Card>
            <div className="flex justify-between items-center mb-4">
                <h2 className="text-xl font-bold">Buyer Balance Sheet <span className="text-sm font-normal text-muted">(as of {formatDate(data.asOfDate)})</span></h2>
            </div>
            <SortableTable columns={allColumns} data={(data.balances || []).map(b => ({ ...b, id: b.buyerId }))} tableId="buyer-balance-sheet" defaultSortField="balance" visibleColumns={visibleColumns} onColumnToggle={(key) => setVisibleColumns(prev => prev.includes(key) ? prev.filter(k => k !== key) : [...prev, key])} renderMobileCard={renderMobileCard} customActions={customActions} onRowClick={(item) => handleSelectRow(item.buyerId)} />
            <BuyerPaymentModal
                isOpen={isPaymentModalOpen}
                onClose={() => setIsPaymentModalOpen(false)}
                onSuccess={() => {
                    setIsPaymentModalOpen(false);
                    onRefresh();
                }}
                buyer={payingBuyer}
            />
        </Card>
    );
};

export const PurchaseReportView: React.FC<{ data: PurchaseReportData | any[] } & ViewProps> = ({ data: rawData, filters, suppliers, onRefresh, openPrintPreview }) => {
    const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);
    const [payingSupplier, setPayingSupplier] = useState<Supplier | null>(null);

    const handleOpenPaymentModal = (supplierId: string) => {
        const supplier = suppliers.find(s => s.id === supplierId);
        if (supplier) {
            setPayingSupplier(supplier);
            setIsPaymentModalOpen(true);
        }
    };

    const { invoices, summary } = useMemo(() => {
        if (Array.isArray(rawData)) {
            const invs = rawData.map(i => ({ ...i, balance: i.balance ?? ((i.nettAmount || 0) - (i.paidAmount || 0)) }));
            return {
                invoices: invs,
                summary: {
                    totalPurchases: invs.reduce((sum, i) => sum + (i.nettAmount || 0), 0),
                    totalPaid: invs.reduce((sum, i) => sum + (i.paidAmount || 0), 0),
                    totalBalance: invs.reduce((sum, i) => sum + i.balance, 0),
                    invoiceCount: invs.length
                }
            };
        }
        return rawData as PurchaseReportData;
    }, [rawData]);

    const allColumns = useMemo(() => [
        { key: 'invoiceNumber', header: 'Invoice #', accessor: 'invoiceNumber', sortable: true, isDefault: true },
        { key: 'createdAt', header: 'Date', accessor: (i: any) => formatDate(i.createdAt), sortable: true, isDefault: true },
        { key: 'supplierName', header: 'Supplier', accessor: (i: any) => <span title={i.supplierName} className="truncate block max-w-xs">{i.supplierName}</span>, sortAccessor: 'supplierName', sortable: true, isDefault: true },
        { key: 'nettAmount', header: 'Payable', accessor: (i: any) => formatCurrency(i.nettAmount), sortable: true, className: 'text-right', isDefault: true },
        { key: 'paidAmount', header: 'Paid', accessor: (i: any) => formatCurrency(i.paidAmount), sortable: true, className: 'text-right' },
        { key: 'balance', header: 'Balance', accessor: (i: any) => formatCurrency(i.balance), sortable: true, className: 'text-right', isDefault: true },
        {
            key: 'paymentAction',
            header: 'Action',
            accessor: (item: any) => (
                <Button size="sm" onClick={(e) => { e.stopPropagation(); handleOpenPaymentModal(item.supplierId); }}>
                    Pay
                </Button>
            ),
            isDefault: true,
            className: 'text-center'
        }
    ], [suppliers]);

    const [visibleColumns, setVisibleColumns] = useLocalStorage<string[]>('table-cols-purchase-report', allColumns.filter(c => c.isDefault).map(c => c.key));
    const printColumns = useMemo(() => allColumns.filter(c => visibleColumns.includes(c.key) && c.key !== 'paymentAction'), [allColumns, visibleColumns]);

    const handlePrintPreview = () => {
        openPrintPreview("Purchase Report", (
            <ReportPrintLayout
                reportTitle="Purchase Report"
                filters={<p><strong>Period:</strong> {filters.startDate ? formatDate(filters.startDate) : 'N/A'} to {formatDate(filters.endDate)}<br /><strong>Supplier:</strong> {filters.entityId ? suppliers.find(s => s.id === filters.entityId)?.supplierName : 'All'}</p>}
                columns={printColumns}
                data={invoices}
                summarySection={
                    Object.entries(summary).map(([key, value]) => (
                        <div className="summary-item" key={key}><span>{key.replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase())}</span><span>{typeof value === 'number' ? formatCurrency(value) : value}</span></div>
                    ))
                }
            />
        ), { mode: 'a4', size: '6xl' });
    };

    const renderMobileCard = (invoice: any) => (
        <div className="p-4 space-y-2">
            <div className="flex justify-between items-start">
                <div>
                    <p className="font-bold text-primary">{invoice.invoiceNumber}</p>
                    <p className="text-xs text-muted">{formatDate(invoice.createdAt)}</p>
                </div>
                <p className="text-right font-semibold">{formatCurrency(invoice.nettAmount)}</p>
            </div>
            <p className="text-sm truncate">Supplier: {invoice.supplierName}</p>
            <div className="flex justify-between text-sm pt-2 border-t mt-2 items-center">
                <div>
                    <span className="text-muted">Balance:</span>
                    <span className="ml-1 font-semibold text-danger">{formatCurrency(invoice.balance)}</span>
                </div>
                <Button size="sm" onClick={(e) => { e.stopPropagation(); handleOpenPaymentModal(invoice.supplierId); }}>
                    Pay
                </Button>
            </div>
        </div>
    );

    return (
        <Card>
            <h2 className="text-xl font-bold mb-4">Purchase Report</h2>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
                <StatCard title="Total Purchases" value={formatCurrency(summary.totalPurchases)} className="bg-blue-50 text-blue-800 text-center" />
                <StatCard title="Total Paid" value={formatCurrency(summary.totalPaid)} className="bg-green-50 text-green-800 text-center" />
                <StatCard title="Total Balance" value={formatCurrency(summary.totalBalance)} className="bg-red-50 text-red-800 text-center" />
                <StatCard title="Invoice Count" value={summary.invoiceCount.toLocaleString('en-IN')} className="bg-gray-50 text-gray-800 text-center" />
            </div>
            <SortableTable columns={allColumns} data={invoices || []} tableId="purchase-report" defaultSortField="createdAt" visibleColumns={visibleColumns} onColumnToggle={(key) => setVisibleColumns(prev => prev.includes(key) ? prev.filter(k => k !== key) : [...prev, key])} renderMobileCard={renderMobileCard} customActions={<ReportActions onPrintPreview={handlePrintPreview} />} />
            <SupplierPaymentModal
                isOpen={isPaymentModalOpen}
                onClose={() => setIsPaymentModalOpen(false)}
                onSuccess={() => {
                    setIsPaymentModalOpen(false);
                    onRefresh();
                }}
                supplier={payingSupplier}
            />
        </Card>
    );
};

export const SupplierBalanceSheetView: React.FC<{ data: SupplierBalanceSheetData } & ViewProps> = ({ data, suppliers, onRefresh, openPrintPreview }) => {
    const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);
    const [payingSupplier, setPayingSupplier] = useState<Supplier | null>(null);

    const handleOpenPaymentModal = (supplierId: string) => {
        const supplierToPay = suppliers.find(s => s.id === supplierId);
        if (supplierToPay) {
            setPayingSupplier({ ...supplierToPay, outstanding: data.balances.find(b => b.supplierId === supplierId)?.balance || 0 });
            setIsPaymentModalOpen(true);
        }
    };

    const allColumns = useMemo(() => [
        { key: 'supplierName', header: 'Supplier Name', accessor: (i: any) => <span title={i.supplierName} className="truncate block max-w-xs">{i.supplierName}</span>, sortAccessor: 'supplierName', sortable: true, isDefault: true },
        { key: 'balance', header: 'Amount Payable', accessor: (i: any) => formatCurrency(Math.abs(i.balance)), sortable: true, className: 'text-right', isDefault: true },
        {
            key: 'bankDetails',
            header: 'Bank Details',
            accessor: (item: any) => {
                const supplier = suppliers.find(s => s.id === item.supplierId);
                return <pre className="text-xs whitespace-pre-wrap">{supplier?.bankAccountDetails || 'N/A'}</pre>;
            },
            isDefault: true
        },
        {
            key: 'paymentAction',
            header: 'Action',
            accessor: (item: any) => (
                <Button size="sm" onClick={(e) => { e.stopPropagation(); handleOpenPaymentModal(item.supplierId); }}>
                    Pay
                </Button>
            ),
            isDefault: true,
            className: 'text-center'
        }
    ], [suppliers]);
    const [visibleColumns, setVisibleColumns] = useLocalStorage<string[]>('table-cols-supplier-balance', allColumns.filter(c => c.isDefault).map(c => c.key));
    const printColumns = useMemo(() => allColumns.filter(c => visibleColumns.includes(c.key) && c.key !== 'paymentAction'), [allColumns, visibleColumns]);

    const handlePrintPreview = () => {
        openPrintPreview("Supplier Balance Sheet", (
            <ReportPrintLayout
                reportTitle="Supplier Balance Sheet"
                filters={<p><strong>As of Date:</strong> {formatDate(data.asOfDate)}</p>}
                columns={printColumns}
                data={data.balances}
                summarySection={
                    <div className="summary-item"><span>Total Amount Payable</span><span>{formatCurrency(Math.abs(data.balances.reduce((sum, s) => sum + s.balance, 0)))}</span></div>
                }
            />
        ), { mode: 'a4', size: '6xl' });
    };

    const renderMobileCard = (supplier: any) => (
        <div className="p-4 space-y-2">
            <div className="flex items-center">
                <div className="flex-1 overflow-hidden">
                    <p className="font-bold truncate">{supplier.supplierName}</p>
                    <p className="text-right font-semibold text-danger">{formatCurrency(Math.abs(supplier.balance))}</p>
                </div>
            </div>
            <div className="pt-2 border-t mt-2">
                <pre className="text-xs whitespace-pre-wrap bg-gray-50 p-2 rounded">{suppliers.find(s => s.id === supplier.supplierId)?.bankAccountDetails || 'N/A'}</pre>
            </div>
            <div className="flex justify-end pt-2">
                <Button size="sm" onClick={(e) => { e.stopPropagation(); handleOpenPaymentModal(supplier.supplierId); }}>
                    Pay
                </Button>
            </div>
        </div>
    );

    return (
        <>
            <Card>
                <div className="flex justify-between items-center mb-4">
                    <h2 className="text-xl font-bold">Supplier Balance Sheet <span className="text-sm font-normal text-muted">(as of {formatDate(data.asOfDate)})</span></h2>
                </div>
                <SortableTable columns={allColumns} data={(data.balances || []).map(b => ({ ...b, id: b.supplierId }))} tableId="supplier-balance-sheet" defaultSortField="balance" visibleColumns={visibleColumns} onColumnToggle={(key) => setVisibleColumns(prev => prev.includes(key) ? prev.filter(k => k !== key) : [...prev, key])} renderMobileCard={renderMobileCard} customActions={<ReportActions onPrintPreview={handlePrintPreview} />} />
            </Card>
            <SupplierPaymentModal
                isOpen={isPaymentModalOpen}
                onClose={() => setIsPaymentModalOpen(false)}
                onSuccess={() => {
                    setIsPaymentModalOpen(false);
                    onRefresh();
                }}
                supplier={payingSupplier}
            />
        </>
    );
};

export const ProfitAndLossView: React.FC<{ data: ProfitAndLossData, filters: any } & ViewProps> = ({ data, filters, openPrintPreview }) => {

    const handlePrintPreview = () => {
        openPrintPreview("Profit & Loss Statement", (
            <ReportPrintLayout
                reportTitle="Profit & Loss Statement"
                filters={<p><strong>Period:</strong> {filters.startDate ? formatDate(filters.startDate) : 'N/A'} to {formatDate(filters.endDate)}</p>}
                columns={[{ key: 'item', header: 'Item', accessor: 'item' }, { key: 'amount', header: 'Amount', accessor: 'amount', className: 'text-right' }]}
                data={[
                    { id: 1, item: 'Total Commission', amount: formatCurrency(data.totalCommission || 0) },
                    { id: 2, item: 'Other Revenue (Wages, etc)', amount: formatCurrency(data.otherRevenue || 0) },
                    { id: 3, item: 'Operating Expenses', amount: `(${formatCurrency(data.operatingExpenses || 0)})` },
                ]}
                summarySection={
                    <>
                        <div className="summary-item"><span>Total Revenue</span><span>{formatCurrency(data.totalRevenue || 0)}</span></div>
                        <div className="summary-item"><span>Net Profit</span><span>{formatCurrency(data.netProfit || 0)}</span></div>
                    </>
                }
            />
        ), { mode: 'a4', size: '6xl' });
    };

    return (
        <Card>
            <div className="flex justify-between items-center mb-4">
                <h2 className="text-xl font-bold">Profit & Loss Statement</h2>
                <ReportActions onPrintPreview={handlePrintPreview} />
            </div>
            <div className="space-y-4">
                <div className="flex justify-between p-2 border-b"><span>Total Commission</span><span>{formatCurrency(data.totalCommission || 0)}</span></div>
                <div className="flex justify-between p-2 border-b"><span>Other Revenue</span><span>{formatCurrency(data.otherRevenue || 0)}</span></div>
                <div className="flex justify-between p-2 border-b"><span>Operating Expenses</span><span className="text-danger">({formatCurrency(data.operatingExpenses || 0)})</span></div>
                <div className="flex justify-between p-2 border-b font-bold text-lg"><span>Net Profit</span><span className={(data.netProfit || 0) >= 0 ? 'text-success' : 'text-danger'}>{formatCurrency(data.netProfit || 0)}</span></div>
            </div>
        </Card>
    );
};

export const LedgerReportView: React.FC<{ data: LedgerReportData } & ViewProps> = ({ data, filters, buyers, suppliers, onRefresh, openPrintPreview }) => {
    const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);

    const isBuyer = useMemo(() => buyers.some(b => b.id === filters.entityId), [buyers, filters.entityId]);
    const isSupplier = useMemo(() => suppliers.some(s => s.id === filters.entityId), [suppliers, filters.entityId]);

    const entity = useMemo(() => {
        if (isBuyer) return buyers.find(b => b.id === filters.entityId);
        if (isSupplier) return suppliers.find(s => s.id === filters.entityId);
        return null;
    }, [isBuyer, isSupplier, buyers, suppliers, filters.entityId]);

    const tableData = useMemo(() => {
        const rows = [...(data.entries || [])];
        // Prepend Balance Brought Forward if it exists and we have a start date
        if (filters.startDate && data.balanceBroughtForward !== undefined) {
            rows.unshift({
                id: 'opening-balance',
                date: filters.startDate, // Use start date
                particulars: 'Balance Brought Forward',
                debit: 0,
                credit: 0,
                balance: data.balanceBroughtForward,
                type: 'Opening'
            });
        }
        return rows;
    }, [data.entries, data.balanceBroughtForward, filters.startDate]);

    const allColumns = useMemo<Column<any>[]>(() => [
        { key: 'date', header: 'Date', accessor: (i: any) => formatDate(i.date), sortable: true, isDefault: true },
        { key: 'particulars', header: 'Particulars', accessor: (i: any) => <span title={i.particulars} className="truncate block max-w-xs">{i.particulars}</span>, sortAccessor: 'particulars', isDefault: true },
        { key: 'debit', header: 'Debit', accessor: (i: any) => i.debit ? formatCurrency(i.debit) : '-', sortable: true, className: 'text-right text-danger', isDefault: true },
        { key: 'credit', header: 'Credit', accessor: (i: any) => i.credit ? formatCurrency(i.credit) : '-', sortable: true, className: 'text-right text-success', isDefault: true },
        { key: 'balance', header: 'Balance', accessor: (i: any) => formatCurrency(i.balance), sortable: true, className: 'text-right font-bold', isDefault: true },
    ], []);
    const [visibleColumns, setVisibleColumns] = useLocalStorage<string[]>('table-cols-ledger', allColumns.filter(c => c.isDefault).map(c => c.key));
    const printColumns = useMemo(() => allColumns.filter(c => visibleColumns.includes(c.key)), [allColumns, visibleColumns]);

    const handlePrintPreview = () => {
        openPrintPreview("Ledger Report", (
            <ReportPrintLayout
                reportTitle="Ledger Report"
                filters={<p><strong>Period:</strong> {filters.startDate ? formatDate(filters.startDate) : 'N/A'} to {formatDate(filters.endDate)}</p>}
                columns={printColumns}
                data={tableData}
                summarySection={<div className="summary-item"><span>Closing Balance</span><span>{formatCurrency(data.summary?.closingBalance || 0)}</span></div>}
            />
        ), { mode: 'a4', size: '6xl' });
    };

    const renderMobileCard = (entry: any) => {
        if (entry.particulars === 'Balance Brought Forward') {
            return (
                <div className="p-4 flex justify-between items-center bg-gray-50 border-b border-gray-200">
                    <div>
                        <p className="font-bold text-sm">Balance Brought Forward</p>
                        <p className="text-xs text-muted">{formatDate(entry.date)}</p>
                    </div>
                    <p className="font-bold">{formatCurrency(entry.balance)}</p>
                </div>
            );
        }
        return (
            <div className="p-4 space-y-1">
                <div className="flex justify-between items-center">
                    <div className="font-medium text-dark truncate max-w-[70%]">{entry.particulars}</div>
                    <p className="text-xs text-muted">{formatDate(entry.date)}</p>
                </div>
                <div className="flex justify-between items-center text-sm">
                    <div className="text-center">
                        <p className="text-xs text-muted">Debit</p>
                        <p className="font-semibold text-danger">{entry.debit ? formatCurrency(entry.debit) : '-'}</p>
                    </div>
                    <div className="text-center">
                        <p className="text-xs text-muted">Credit</p>
                        <p className="font-semibold text-success">{entry.credit ? formatCurrency(entry.credit) : '-'}</p>
                    </div>
                    <div className="text-right">
                        <p className="text-xs text-muted">Balance</p>
                        <p className="font-bold">{formatCurrency(entry.balance)}</p>
                    </div>
                </div>
            </div>
        );
    };

    return (
        <Card>
            <div className="flex justify-between items-center mb-4">
                <h2 className="text-xl font-bold">Ledger Report</h2>
                <div className="flex items-center gap-2">
                    {isBuyer && <Button size="sm" variant="secondary" onClick={() => setIsPaymentModalOpen(true)}>Receive Payment</Button>}
                    {isSupplier && <Button size="sm" variant="secondary" onClick={() => setIsPaymentModalOpen(true)}>Pay Supplier</Button>}
                    <div className="text-right ml-4">
                        <p className="text-xs text-muted">Closing Balance</p>
                        <p className="text-lg font-bold">{formatCurrency(data.summary?.closingBalance || (tableData.length > 0 ? tableData[tableData.length - 1].balance : 0))}</p>
                    </div>
                </div>
            </div>
            <SortableTable columns={allColumns} data={tableData} tableId="ledger-report" defaultSortField="date" visibleColumns={visibleColumns} onColumnToggle={(key) => setVisibleColumns(prev => prev.includes(key) ? prev.filter(k => k !== key) : [...prev, key])} renderMobileCard={renderMobileCard} customActions={<ReportActions onPrintPreview={handlePrintPreview} />} />

            {isBuyer && (
                <BuyerPaymentModal
                    isOpen={isPaymentModalOpen}
                    onClose={() => setIsPaymentModalOpen(false)}
                    onSuccess={() => {
                        setIsPaymentModalOpen(false);
                        onRefresh();
                    }}
                    buyer={entity as Buyer}
                />
            )}
            {isSupplier && (
                <SupplierPaymentModal
                    isOpen={isPaymentModalOpen}
                    onClose={() => setIsPaymentModalOpen(false)}
                    onSuccess={() => {
                        setIsPaymentModalOpen(false);
                        onRefresh();
                    }}
                    supplier={entity as Supplier}
                />
            )}
        </Card>
    );
};

export const InvoiceAgingView: React.FC<{ data: InvoiceAgingReportData } & ViewProps> = ({ data, filters, openPrintPreview }) => {
    const allColumns = useMemo<Column<any>[]>(() => [
        { key: 'buyerName', header: 'Buyer', accessor: (i: any) => <span title={i.buyerName} className="truncate block max-w-xs">{i.buyerName}</span>, sortAccessor: 'buyerName', sortable: true, isDefault: true },
        { key: 'totalOverdue', header: 'Total Overdue', accessor: (i: any) => formatCurrency(i.totalOverdue), sortable: true, className: 'text-right font-semibold', isDefault: true },
        { key: '0-30', header: '0-30 Days', accessor: (i: any) => formatCurrency(i.buckets['0-30']), sortable: true, className: 'text-right', isDefault: true },
        { key: '31-60', header: '31-60 Days', accessor: (i: any) => formatCurrency(i.buckets['31-60']), sortable: true, className: 'text-right', isDefault: true },
        { key: '61-90', header: '61-90 Days', accessor: (i: any) => formatCurrency(i.buckets['61-90']), sortable: true, className: 'text-right', isDefault: true },
        { key: '90+', header: '90+ Days', accessor: (i: any) => formatCurrency(i.buckets['90+']), sortable: true, className: 'text-right', isDefault: true },
    ], []);
    const [visibleColumns, setVisibleColumns] = useLocalStorage<string[]>('table-cols-invoice-aging', allColumns.filter(c => c.isDefault).map(c => c.key));
    const printColumns = useMemo(() => allColumns.filter(c => visibleColumns.includes(c.key)), [allColumns, visibleColumns]);

    const handlePrintPreview = () => {
        openPrintPreview("Invoice Aging Report", (
            <ReportPrintLayout
                reportTitle="Invoice Aging Report"
                filters={<p><strong>As of Date:</strong> {formatDate(filters.endDate)}</p>}
                columns={printColumns}
                data={data.details}
                summarySection={<div className="summary-item"><span>Total Overdue Amount</span><span>{formatCurrency(data.summary?.totalOverdue || 0)}</span></div>}
            />
        ), { mode: 'a4', size: '6xl' });
    };

    const renderMobileCard = (item: any) => (
        <div className="p-4 space-y-2">
            <div className="flex justify-between items-center">
                <p className="font-bold truncate">{item.buyerName}</p>
                <p className="font-bold text-lg text-danger">{formatCurrency(item.totalOverdue)}</p>
            </div>
            <div className="grid grid-cols-2 gap-2 text-xs pt-2 border-t">
                <div className="flex justify-between"><span>0-30 Days:</span><span className="font-medium">{formatCurrency(item.buckets['0-30'])}</span></div>
                <div className="flex justify-between"><span>31-60 Days:</span><span className="font-medium">{formatCurrency(item.buckets['31-60'])}</span></div>
                <div className="flex justify-between"><span>61-90 Days:</span><span className="font-medium">{formatCurrency(item.buckets['61-90'])}</span></div>
                <div className="flex justify-between"><span>90+ Days:</span><span className="font-medium">{formatCurrency(item.buckets['90+'])}</span></div>
            </div>
        </div>
    );

    return (
        <Card>
            <h2 className="text-xl font-bold mb-4">Invoice Aging Report <span className="text-sm font-normal text-muted">(as of {formatDate(filters.endDate)})</span></h2>
            <div className="grid grid-cols-2 gap-4 mb-6">
                <StatCard title="Total Overdue Amount" value={formatCurrency(data.summary?.totalOverdue || 0)} className="bg-red-50 text-red-800 text-center" />
                <StatCard title="Buyers with Overdue" value={(data.summary?.buyerCount || 0).toLocaleString('en-IN')} className="bg-gray-50 text-gray-800 text-center" />
            </div>
            <SortableTable columns={allColumns} data={(data.details || []).map(d => ({ ...d, id: d.buyerId }))} tableId="invoice-aging" defaultSortField="totalOverdue" visibleColumns={visibleColumns} onColumnToggle={(key) => setVisibleColumns(prev => prev.includes(key) ? prev.filter(k => k !== key) : [...prev, key])} renderMobileCard={renderMobileCard} customActions={<ReportActions onPrintPreview={handlePrintPreview} />} />
        </Card>
    );
};

export const WagesReportView: React.FC<{ data: WagesReportData | SupplierWagesReportData } & ViewProps & { wagesType: 'buyer' | 'supplier', allWagesSummary: { buyer: number; supplier: number } | null }> = ({ data, filters, buyers, suppliers, wagesType, allWagesSummary, openPrintPreview }) => {
    const isBuyerWages = wagesType === 'buyer';

    const allColumns = useMemo<Column<any>[]>(() => {
        if (isBuyerWages) {
            return [
                { key: 'invoiceNumber', header: 'Invoice #', accessor: 'invoiceNumber', sortable: true, isDefault: true },
                { key: 'createdAt', header: 'Date', accessor: (i: any) => formatDate(i.createdAt), sortable: true, isDefault: true },
                { key: 'buyerName', header: 'Buyer', accessor: (i: any) => <span title={i.buyerName} className="truncate block max-w-xs">{i.buyerName}</span>, sortAccessor: 'buyerName', sortable: true, isDefault: true },
                { key: 'wages', header: 'Wages', accessor: (i: any) => formatCurrency(i.wages), sortable: true, className: 'text-right', isDefault: true },
                { key: 'invoiceTotal', header: 'Invoice Total', accessor: (i: any) => formatCurrency(i.invoiceTotal), sortable: true, className: 'text-right' },
            ];
        } else { // Supplier Wages
            return [
                { key: 'invoiceNumber', header: 'Invoice #', accessor: 'invoiceNumber', sortable: true, isDefault: true },
                { key: 'createdAt', header: 'Date', accessor: (i: any) => formatDate(i.createdAt), sortable: true, isDefault: true },
                { key: 'supplierName', header: 'Supplier', accessor: (i: any) => <span title={i.supplierName} className="truncate block max-w-xs">{i.supplierName}</span>, sortAccessor: 'supplierName', sortable: true, isDefault: true },
                { key: 'wages', header: 'Wages', accessor: (i: any) => formatCurrency(i.wages), sortable: true, className: 'text-right', isDefault: true },
                { key: 'invoiceTotal', header: 'Invoice Total', accessor: (i: any) => formatCurrency(i.invoiceTotal), sortable: true, className: 'text-right' },
            ];
        }
    }, [isBuyerWages]);

    const [visibleColumns, setVisibleColumns] = useLocalStorage<string[]>(`table-cols-wages-report-${wagesType}`, allColumns.filter(c => c.isDefault).map(c => c.key));
    const printColumns = useMemo(() => allColumns.filter(c => visibleColumns.includes(c.key)), [allColumns, visibleColumns]);

    const handlePrintPreview = () => {
    };

    const renderMobileCard = (item: any) => (
        <div className="p-4 space-y-1">
            <div className="flex justify-between items-start">
                <div>
                    <p className="font-bold">{item.invoiceNumber}</p>
                    <p className="text-sm text-muted truncate">{isBuyerWages ? item.buyerName : item.supplierName}</p>
                </div>
                <p className="font-semibold text-lg">{formatCurrency(item.wages)}</p>
            </div>
            <p className="text-xs text-muted">{formatDate(item.createdAt)}</p>
        </div>
    );

    return (
        <>
            <Card>
                <h2 className="text-xl font-bold mb-4">{isBuyerWages ? 'Buyer' : 'Supplier'} Wages Report</h2>
                <div className="grid grid-cols-2 gap-4 mb-6">
                    <StatCard title="Total Wages" value={formatCurrency(data.summary?.totalWages || 0)} className="bg-yellow-50 text-yellow-800 text-center" />
                    <StatCard title="Invoice Count" value={(data.summary?.invoiceCount || 0).toLocaleString('en-IN')} className="bg-gray-50 text-gray-800 text-center" />
                </div>
                <SortableTable columns={allColumns} data={(data.details || []).map(d => ({ ...d, id: d.invoiceId }))} tableId="wages-report" defaultSortField="createdAt" visibleColumns={visibleColumns} onColumnToggle={(key) => setVisibleColumns(prev => prev.includes(key) ? prev.filter(k => k !== key) : [...prev, key])} renderMobileCard={renderMobileCard} customActions={<ReportActions onPrintPreview={handlePrintPreview} />} />
            </Card>

            {allWagesSummary && (
                <div className="mt-6 grid grid-cols-1 md:grid-cols-2 gap-6">
                    <Card className="border-primary bg-primary-light text-primary-dark">
                        <h3 className="text-lg font-semibold">Total Buyer Wages</h3>
                        <p className="text-3xl font-bold">{formatCurrency(allWagesSummary.buyer)}</p>
                        <p className="text-sm opacity-80 mt-1">Wages collected from buyers in period.</p>
                    </Card>
                    <Card className="border-info bg-info-light text-info-dark">
                        <h3 className="text-lg font-semibold">Total Supplier Wages</h3>
                        <p className="text-3xl font-bold">{formatCurrency(allWagesSummary.supplier)}</p>
                        <p className="text-sm opacity-80 mt-1">Wages deducted from suppliers in period.</p>
                    </Card>
                </div>
            )}
        </>
    );
};

export const CashFlowDetailsView: React.FC<{ data: CashFlowDetailsData } & ViewProps> = ({ data, filters, openPrintPreview }) => {
    const incomeColumns = useMemo<Column<any>[]>(() => [
        { key: 'date', header: 'Date', accessor: (i: any) => formatDate(i.date), sortable: true, isDefault: true },
        { key: 'entityName', header: 'From', accessor: (i: any) => <span title={i.entityName} className="truncate block max-w-xs">{i.entityName}</span>, sortAccessor: 'entityName', sortable: true, isDefault: true },
        { key: 'description', header: 'Description', accessor: (i: any) => <span title={i.description} className="truncate block max-w-xs">{i.description}</span>, sortAccessor: 'description', isDefault: true },
        { key: 'amount', header: 'Amount', accessor: (i: any) => formatCurrency(i.amount), sortable: true, className: 'text-right font-semibold', isDefault: true },
    ], []);

    const expensesByCategory = useMemo(() => {
        const grouped: Record<string, any[]> = {};
        (data.expenseTransactions || []).forEach(t => {
            const cat = t.category || 'Other';
            if (!grouped[cat]) grouped[cat] = [];
            grouped[cat].push(t);
        });
        return grouped;
    }, [data.expenseTransactions]);

    const expenseColumns = useMemo<Column<any>[]>(() => [
        { key: 'date', header: 'Date', accessor: (i: any) => formatDate(i.date), sortable: true, isDefault: true },
        { key: 'entityName', header: 'To', accessor: (i: any) => <span title={i.entityName} className="truncate block max-w-xs">{i.entityName}</span>, sortAccessor: 'entityName', sortable: true, isDefault: true },
        { key: 'description', header: 'Description', accessor: (i: any) => <span title={i.description} className="truncate block max-w-xs">{i.description}</span>, sortAccessor: 'description', isDefault: true },
        { key: 'amount', header: 'Amount', accessor: (i: any) => formatCurrency(i.amount), sortable: true, className: 'text-right font-semibold', isDefault: true },
    ], []);

    const renderIncomeMobileCard = (t: any) => (
        <div className="p-4 flex justify-between items-center">
            <div className="overflow-hidden">
                <p className="font-bold truncate">{t.entityName}</p>
                <p className="text-xs text-muted truncate">{t.description || formatDate(t.date)}</p>
            </div>
            <p className="font-semibold text-success ml-2 flex-shrink-0">{formatCurrency(t.amount)}</p>
        </div>
    );
    const renderExpenseMobileCard = (t: any) => (
        <div className="p-4 flex justify-between items-center">
            <div className="overflow-hidden">
                <p className="font-bold truncate">{t.entityName}</p>
                <p className="text-xs text-muted truncate">{formatDate(t.date)}</p>
            </div>
            <p className="font-semibold text-danger ml-2 flex-shrink-0">{formatCurrency(t.amount)}</p>
        </div>
    );

    const renderPrintTable = (title: string, columns: Column<any>[], tableData: any[]) => (
        <div className="mb-4">
            <h3 className="text-lg font-semibold mb-2">{title}</h3>
            <table className="w-full border-collapse">
                <thead>
                    <tr className="border-b">{columns.map(c => <th key={c.key} className={`text-left p-1 ${c.className || ''}`}>{typeof c.header === 'string' ? c.header : c.key}</th>)}</tr>
                </thead>
                <tbody>
                    {tableData.map((row, rowIndex) => (
                        <tr key={row.id || rowIndex} className="border-b border-gray-100">
                            {columns.map(col => <td key={col.key} className={`p-1 ${col.className || ''}`}>
                                {typeof col.accessor === 'function' ? col.accessor(row) : (row[col.accessor as keyof typeof row] as ReactNode)}
                            </td>)}
                        </tr>
                    ))}
                    <tr className="font-bold bg-gray-50">
                        <td colSpan={columns.length - 1} className="p-1 text-right">Total</td>
                        <td className="p-1 text-right">{formatCurrency(tableData.reduce((sum, item) => sum + item.amount, 0))}</td>
                    </tr>
                </tbody>
            </table>
        </div>
    );

    const handlePrintPreview = () => {
        openPrintPreview("Cash Flow Details", (
            <ReportPrintLayout
                reportTitle="Cash Flow Details Report"
                filters={<p><strong>Period:</strong> {filters.startDate ? formatDate(filters.startDate) : 'N/A'} to {formatDate(filters.endDate)}</p>}
                columns={[]} data={[]} summarySection={<></>}
            >
                <div>
                    <div className="mb-6">
                        {renderPrintTable("Income", incomeColumns, data.incomeTransactions)}
                    </div>
                    <div className="mb-6">
                        <h3 className="text-xl font-bold mb-4 text-red-700">Expenses</h3>
                        {Object.entries(expensesByCategory).map(([category, transactions]) => {
                            const transactionList = transactions as any[];
                            return (
                                <div key={category}>
                                    {renderPrintTable(category, expenseColumns, transactionList)}
                                </div>
                            );
                        })}
                    </div>
                </div>
            </ReportPrintLayout>
        ), { mode: 'a4', size: '6xl' });
    };

    return (
        <Card>
            <div className="flex justify-between items-center mb-4">
                <h2 className="text-xl font-bold">Cash Flow Details</h2>
                <ReportActions onPrintPreview={handlePrintPreview} />
            </div>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div>
                    <h3 className="text-lg font-semibold mb-2 text-green-700">Income</h3>
                    <SortableTable columns={incomeColumns} data={data.incomeTransactions || []} tableId="cashflow-income" defaultSortField="date" visibleColumns={incomeColumns.map(c => c.key)} onColumnToggle={() => { }} renderMobileCard={renderIncomeMobileCard} />
                </div>
                <div>
                    <h3 className="text-lg font-semibold mb-2 text-red-700">Expense</h3>
                    {Object.keys(expensesByCategory).length === 0 && <p className="text-muted text-sm">No expenses found.</p>}
                    {Object.entries(expensesByCategory).map(([category, transactions]) => {
                        const transactionList = transactions as any[];
                        return (
                            <div key={category} className="mb-6">
                                <h4 className="font-semibold text-md mb-2 bg-gray-100 p-2 rounded flex justify-between">
                                    <span>{category}</span>
                                    <span>{formatCurrency(transactionList.reduce((sum: number, t: any) => sum + t.amount, 0))}</span>
                                </h4>
                                <SortableTable
                                    columns={expenseColumns}
                                    data={transactionList}
                                    tableId={`cashflow-expense-${category}`}
                                    defaultSortField="date"
                                    visibleColumns={expenseColumns.map(c => c.key)}
                                    onColumnToggle={() => { }}
                                    renderMobileCard={renderExpenseMobileCard}
                                />
                            </div>
                        );
                    })}
                </div>
            </div>
        </Card>
    );
};

export const IncomeLedgerView: React.FC<{ data: IncomeLedgerData } & ViewProps> = ({ data, filters, openPrintPreview }) => {
    const allColumns = useMemo<Column<any>[]>(() => [
        { key: 'date', header: 'Date', accessor: (i: any) => formatDate(i.date), sortable: true, isDefault: true },
        { key: 'entityName', header: 'From', accessor: (i: any) => <span title={i.entityName} className="truncate block max-w-xs">{i.entityName}</span>, sortAccessor: 'entityName', sortable: true, isDefault: true },
        { key: 'description', header: 'Description', accessor: (i: any) => <span title={i.description} className="truncate block max-w-xs">{i.description}</span>, sortAccessor: 'description', isDefault: true },
        { key: 'method', header: 'Method', accessor: 'method', sortable: true },
        { key: 'amount', header: 'Amount', accessor: (i: any) => formatCurrency(i.amount), sortable: true, className: 'text-right font-semibold', isDefault: true },
    ], []);
    const [visibleColumns, setVisibleColumns] = useLocalStorage<string[]>('table-cols-income-ledger', allColumns.filter(c => c.isDefault).map(c => c.key));

    const printColumns = useMemo(() => allColumns.filter(c => visibleColumns.includes(c.key)), [allColumns, visibleColumns]);

    const handlePrintPreview = () => {
        openPrintPreview("Income Ledger", (
            <ReportPrintLayout
                reportTitle="Income Ledger"
                filters={<p><strong>Period:</strong> {filters.startDate ? formatDate(filters.startDate) : 'N/A'} to {formatDate(filters.endDate)}</p>}
                columns={printColumns}
                data={data.transactions}
                summarySection={<div className="summary-item"><span>Total Income</span><span>{formatCurrency(data.summary?.totalIncome || 0)}</span></div>}
            />
        ), { mode: 'a4', size: '6xl' });
    };

    const renderMobileCard = (t: any) => (
        <div className="p-4 flex justify-between items-center">
            <div className="overflow-hidden">
                <p className="font-bold truncate">{t.entityName}</p>
                <p className="text-xs text-muted truncate">{t.description || formatDate(t.date)}</p>
            </div>
            <p className="font-semibold text-success ml-2 flex-shrink-0">{formatCurrency(t.amount)}</p>
        </div>
    );

    return (
        <Card>
            <h2 className="text-xl font-bold mb-4">Income Ledger</h2>
            <div className="grid grid-cols-2 gap-4 mb-6">
                <StatCard title="Total Income" value={formatCurrency(data.summary?.totalIncome || 0)} className="bg-green-50 text-green-800 text-center" />
                <StatCard title="Transaction Count" value={(data.summary?.transactionCount || 0).toLocaleString('en-IN')} className="bg-gray-50 text-gray-800 text-center" />
            </div>
            <SortableTable columns={allColumns} data={data.transactions || []} tableId="income-ledger" defaultSortField="date" visibleColumns={visibleColumns} onColumnToggle={(key) => setVisibleColumns(prev => prev.includes(key) ? prev.filter(k => k !== key) : [...prev, key])} renderMobileCard={renderMobileCard} customActions={<ReportActions onPrintPreview={handlePrintPreview} />} />
        </Card>
    );
};

export const ExpenseLedgerView: React.FC<{ data: ExpenseLedgerData } & ViewProps> = ({ data, filters, openPrintPreview }) => {
    const allColumns = useMemo<Column<any>[]>(() => [
        { key: 'date', header: 'Date', accessor: (i: any) => formatDate(i.date), sortable: true, isDefault: true },
        { key: 'entityName', header: 'To', accessor: (i: any) => <span title={i.entityName} className="truncate block max-w-xs">{i.entityName}</span>, sortAccessor: 'entityName', sortable: true, isDefault: true },
        { key: 'category', header: 'Category', accessor: 'category', sortable: true, isDefault: true },
        { key: 'description', header: 'Description', accessor: (i: any) => <span title={i.description} className="truncate block max-w-xs">{i.description}</span>, sortAccessor: 'description', isDefault: true },
        { key: 'method', header: 'Method', accessor: 'method', sortable: true },
        { key: 'amount', header: 'Amount', accessor: (i: any) => formatCurrency(i.amount), sortable: true, className: 'text-right font-semibold', isDefault: true },
    ], []);
    const [visibleColumns, setVisibleColumns] = useLocalStorage<string[]>('table-cols-expense-ledger', allColumns.filter(c => c.isDefault).map(c => c.key));

    const printColumns = useMemo(() => allColumns.filter(c => visibleColumns.includes(c.key)), [allColumns, visibleColumns]);

    const handlePrintPreview = () => {
        openPrintPreview("Expense Ledger", (
            <ReportPrintLayout
                reportTitle="Expense Ledger"
                filters={<p><strong>Period:</strong> {filters.startDate ? formatDate(filters.startDate) : 'N/A'} to {formatDate(filters.endDate)}</p>}
                columns={printColumns}
                data={data.transactions}
                summarySection={<div className="summary-item"><span>Total Expense</span><span>{formatCurrency(data.summary?.totalExpense || 0)}</span></div>}
            />
        ), { mode: 'a4', size: '6xl' });
    };

    const renderMobileCard = (t: any) => (
        <div className="p-4 flex justify-between items-center">
            <div className="overflow-hidden">
                <p className="font-bold truncate">{t.entityName}</p>
                <p className="text-xs text-muted">{t.category} | {formatDate(t.date)}</p>
            </div>
            <p className="font-semibold text-danger ml-2 flex-shrink-0">{formatCurrency(t.amount)}</p>
        </div>
    );

    return (
        <Card>
            <h2 className="text-xl font-bold mb-4">Expense Ledger</h2>
            <div className="grid grid-cols-2 gap-4 mb-6">
                <StatCard title="Total Expense" value={formatCurrency(data.summary?.totalExpense || 0)} className="bg-red-50 text-red-800 text-center" />
                <StatCard title="Transaction Count" value={(data.summary?.transactionCount || 0).toLocaleString('en-IN')} className="bg-gray-50 text-gray-800 text-center" />
            </div>
            <SortableTable columns={allColumns} data={data.transactions || []} tableId="expense-ledger" defaultSortField="date" visibleColumns={visibleColumns} onColumnToggle={(key) => setVisibleColumns(prev => prev.includes(key) ? prev.filter(k => k !== key) : [...prev, key])} renderMobileCard={renderMobileCard} customActions={<ReportActions onPrintPreview={handlePrintPreview} />} />
        </Card>
    );
};

export const ProductSalesReportView: React.FC<{ data: ProductSalesReportData } & ViewProps> = ({ data, products, filters, openPrintPreview }) => {
    const allColumns = useMemo<Column<any>[]>(() => [
        { key: 'productName', header: 'Product', accessor: (i: any) => <span title={i.productName} className="truncate block max-w-xs">{i.productName}</span>, sortAccessor: 'productName', sortable: true, isDefault: true },
        { key: 'quantitySold', header: 'Qty Sold', accessor: (i: any) => i.quantitySold.toLocaleString('en-IN'), sortable: true, className: 'text-right', isDefault: true },
        { key: 'totalValue', header: 'Total Value', accessor: (i: any) => formatCurrency(i.totalValue), sortable: true, className: 'text-right', isDefault: true },
        { key: 'averagePrice', header: 'Avg. Price', accessor: (i: any) => formatCurrency(i.averagePrice), sortable: true, className: 'text-right' },
        { key: 'buyerCount', header: '# of Buyers', accessor: 'buyerCount', sortable: true, className: 'text-right' },
    ], []);
    const [visibleColumns, setVisibleColumns] = useLocalStorage<string[]>('table-cols-product-sales-report', allColumns.filter(c => c.isDefault).map(c => c.key));

    const printColumns = useMemo(() => allColumns.filter(c => visibleColumns.includes(c.key)), [allColumns, visibleColumns]);

    const handlePrintPreview = () => {
        openPrintPreview("Product Sales Analysis", (
            <ReportPrintLayout
                reportTitle="Product Sales Analysis"
                filters={<p><strong>Period:</strong> {filters.startDate ? formatDate(filters.startDate) : 'N/A'} to {formatDate(filters.endDate)}</p>}
                columns={printColumns}
                data={data.details}
                summarySection={
                    <>
                        <div className="summary-item"><span>Total Quantity</span><span>{(data.summary?.totalQuantity || 0).toLocaleString('en-IN')}</span></div>
                        <div className="summary-item"><span>Total Value</span><span>{formatCurrency(data.summary?.totalValue || 0)}</span></div>
                    </>
                }
            />
        ), { mode: 'a4', size: '6xl' });
    };

    return (
        <Card>
            <h2 className="text-xl font-bold mb-4">Product Sales Analysis</h2>
            <div className="grid grid-cols-3 gap-4 mb-6">
                <StatCard title="Total Quantity" value={(data.summary?.totalQuantity || 0).toLocaleString('en-IN')} className="bg-blue-50 text-blue-800 text-center" />
                <StatCard title="Total Value" value={formatCurrency(data.summary?.totalValue || 0)} className="bg-green-50 text-green-800 text-center" />
                <StatCard title="Unique Products" value={(data.summary?.productCount || 0).toLocaleString('en-IN')} className="bg-gray-50 text-gray-800 text-center" />
            </div>
            <SortableTable columns={allColumns} data={(data.details || []).map(d => ({ ...d, id: d.productId }))} tableId="product-sales-report" defaultSortField="totalValue" visibleColumns={visibleColumns} onColumnToggle={(key) => setVisibleColumns(prev => prev.includes(key) ? prev.filter(k => k !== key) : [...prev, key])} customActions={<ReportActions onPrintPreview={handlePrintPreview} />} />
        </Card>
    );
};

export const AdjustmentsReportView: React.FC<{ data: AdjustmentsReportData } & ViewProps> = ({ data, filters, openPrintPreview }) => {
    const allColumns = useMemo<Column<any>[]>(() => [
        { key: 'createdAt', header: 'Date', accessor: (i: any) => formatDate(i.createdAt), sortable: true, isDefault: true },
        { key: 'invoiceNumber', header: 'Invoice #', accessor: 'invoiceNumber', sortable: true, isDefault: true },
        { key: 'buyerName', header: 'Buyer', accessor: (i: any) => <span title={i.buyerName} className="truncate block max-w-xs">{i.buyerName}</span>, sortAccessor: 'buyerName', sortable: true, isDefault: true },
        { key: 'adjustmentAmount', header: 'Amount', accessor: (i: any) => formatCurrency(i.adjustmentAmount), sortable: true, className: 'text-right font-semibold', isDefault: true },
    ], []);
    const [visibleColumns, setVisibleColumns] = useLocalStorage<string[]>('table-cols-adjustments-report', allColumns.filter(c => c.isDefault).map(c => c.key));

    const printColumns = useMemo(() => allColumns.filter(c => visibleColumns.includes(c.key)), [allColumns, visibleColumns]);

    const handlePrintPreview = () => {
        openPrintPreview("Adjustments Report", (
            <ReportPrintLayout
                reportTitle="Adjustments Report"
                filters={<p><strong>Period:</strong> {filters.startDate ? formatDate(filters.startDate) : 'N/A'} to {formatDate(filters.endDate)}</p>}
                columns={printColumns}
                data={data.details}
                summarySection={<div className="summary-item"><span>Total Adjustments</span><span>{formatCurrency(data.summary?.totalAdjustments || 0)}</span></div>}
            />
        ), { mode: 'a4', size: '6xl' });
    };

    return (
        <Card>
            <h2 className="text-xl font-bold mb-4">Adjustments Report</h2>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
                <StatCard title="Total Adjustments" value={formatCurrency(data.summary?.totalAdjustments || 0)} className="bg-purple-50 text-purple-800 text-center" />
                <StatCard title="Positive" value={formatCurrency(data.summary?.positiveAdjustments || 0)} className="bg-green-50 text-green-800 text-center" />
                <StatCard title="Negative" value={formatCurrency(data.summary?.negativeAdjustments || 0)} className="bg-red-50 text-red-800 text-center" />
                <StatCard title="Invoice Count" value={(data.summary?.invoiceCount || 0).toLocaleString('en-IN')} className="bg-gray-50 text-gray-800 text-center" />
            </div>
            <SortableTable columns={allColumns} data={(data.details || []).map(d => ({ ...d, id: d.invoiceId }))} tableId="adjustments-report" defaultSortField="createdAt" visibleColumns={visibleColumns} onColumnToggle={(key) => setVisibleColumns(prev => prev.includes(key) ? prev.filter(k => k !== key) : [...prev, key])} customActions={<ReportActions onPrintPreview={handlePrintPreview} />} />
        </Card>
    );
};

export const DiscountReportView: React.FC<{ data: DiscountReportData } & ViewProps> = ({ data, filters, openPrintPreview }) => {
    const allColumns = useMemo<Column<any>[]>(() => [
        { key: 'date', header: 'Date', accessor: (i: any) => formatDate(i.date), sortable: true, isDefault: true },
        { key: 'buyerName', header: 'Buyer', accessor: (i: any) => <span title={i.buyerName} className="truncate block max-w-xs">{i.buyerName}</span>, sortAccessor: 'buyerName', sortable: true, isDefault: true },
        { key: 'type', header: 'Type', accessor: 'type', sortable: true, isDefault: true },
        { key: 'relatedDocument', header: 'Related To', accessor: (i: any) => <span title={i.relatedDocument} className="truncate block max-w-xs">{i.relatedDocument}</span>, sortAccessor: 'relatedDocument', isDefault: true },
        { key: 'discountAmount', header: 'Amount', accessor: (i: any) => formatCurrency(i.discountAmount), sortable: true, className: 'text-right font-semibold', isDefault: true },
    ], []);
    const [visibleColumns, setVisibleColumns] = useLocalStorage<string[]>('table-cols-discount-report', allColumns.filter(c => c.isDefault).map(c => c.key));

    const printColumns = useMemo(() => allColumns.filter(c => visibleColumns.includes(c.key)), [allColumns, visibleColumns]);

    const handlePrintPreview = () => {
        openPrintPreview("Discount Report", (
            <ReportPrintLayout
                reportTitle="Discount Report"
                filters={<p><strong>Period:</strong> {filters.startDate ? formatDate(filters.startDate) : 'N/A'} to {formatDate(filters.endDate)}</p>}
                columns={printColumns}
                data={data.details}
                summarySection={<div className="summary-item"><span>Total Discounts</span><span>{formatCurrency(data.summary?.totalDiscounts || 0)}</span></div>}
            />
        ), { mode: 'a4', size: '6xl' });
    };

    return (
        <Card>
            <h2 className="text-xl font-bold mb-4">Discount Report</h2>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
                <StatCard title="Total Discounts" value={formatCurrency(data.summary?.totalDiscounts || 0)} className="bg-blue-50 text-blue-800 text-center" />
                <StatCard title="Invoice Discounts" value={formatCurrency(data.summary?.totalInvoiceDiscounts || 0)} className="bg-gray-50 text-gray-800 text-center" />
                <StatCard title="Payment Discounts" value={formatCurrency(data.summary?.totalPaymentDiscounts || 0)} className="bg-gray-50 text-gray-800 text-center" />
                <StatCard title="Transaction Count" value={(data.summary?.transactionCount || 0).toLocaleString('en-IN')} className="bg-gray-50 text-gray-800 text-center" />
            </div>
            <SortableTable columns={allColumns} data={data.details || []} tableId="discount-report" defaultSortField="date" visibleColumns={visibleColumns} onColumnToggle={(key) => setVisibleColumns(prev => prev.includes(key) ? prev.filter(k => k !== key) : [...prev, key])} customActions={<ReportActions onPrintPreview={handlePrintPreview} />} />
        </Card>
    );
};

export const CommissionReportView: React.FC<{ data: CommissionReportData } & ViewProps> = ({ data, filters, openPrintPreview }) => {
    const allColumns = useMemo<Column<any>[]>(() => [
        { key: 'createdAt', header: 'Date', accessor: (i: any) => formatDate(i.createdAt), sortable: true, isDefault: true },
        { key: 'invoiceNumber', header: 'Invoice #', accessor: 'invoiceNumber', sortable: true, isDefault: true },
        { key: 'supplierName', header: 'Supplier', accessor: (i: any) => <span title={i.supplierName} className="truncate block max-w-xs">{i.supplierName}</span>, sortAccessor: 'supplierName', sortable: true, isDefault: true },
        { key: 'grossTotal', header: 'Gross Total', accessor: (i: any) => formatCurrency(i.grossTotal), sortable: true, className: 'text-right' },
        { key: 'commissionRate', header: 'Rate (%)', accessor: 'commissionRate', sortable: true, className: 'text-right' },
        { key: 'commissionAmount', header: 'Commission Amt', accessor: (i: any) => formatCurrency(i.commissionAmount), sortable: true, className: 'text-right font-semibold', isDefault: true },
    ], []);
    const [visibleColumns, setVisibleColumns] = useLocalStorage<string[]>('table-cols-commission-report', allColumns.filter(c => c.isDefault).map(c => c.key));

    const printColumns = useMemo(() => allColumns.filter(c => visibleColumns.includes(c.key)), [allColumns, visibleColumns]);

    const handlePrintPreview = () => {
        openPrintPreview("Commission Report", (
            <ReportPrintLayout
                reportTitle="Commission Report"
                filters={<p><strong>Period:</strong> {filters.startDate ? formatDate(filters.startDate) : 'N/A'} to {formatDate(filters.endDate)}</p>}
                columns={printColumns}
                data={data.details}
                summarySection={<div className="summary-item"><span>Total Commission</span><span>{formatCurrency(data.summary?.totalCommission || 0)}</span></div>}
            />
        ), { mode: 'a4', size: '6xl' });
    };

    return (
        <Card>
            <h2 className="text-xl font-bold mb-4">Commission Report</h2>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
                <StatCard title="Total Commission" value={formatCurrency(data.summary?.totalCommission || 0)} className="bg-green-50 text-green-800 text-center" />
                <StatCard title="Total Gross Sales" value={formatCurrency(data.summary?.totalGrossSales || 0)} className="bg-blue-50 text-blue-800 text-center" />
                <StatCard title="Avg. Rate" value={`${(data.summary?.averageCommissionRate || 0).toFixed(2)}%`} className="bg-gray-50 text-gray-800 text-center" />
                <StatCard title="Invoice Count" value={(data.summary?.invoiceCount || 0).toLocaleString('en-IN')} className="bg-gray-50 text-gray-800 text-center" />
            </div>
            <SortableTable columns={allColumns} data={(data.details || []).map(d => ({ ...d, id: d.invoiceId }))} tableId="commission-report" defaultSortField="createdAt" visibleColumns={visibleColumns} onColumnToggle={(key) => setVisibleColumns(prev => prev.includes(key) ? prev.filter(k => k !== key) : [...prev, key])} customActions={<ReportActions onPrintPreview={handlePrintPreview} />} />
        </Card>
    );
};

export const BankPaymentPendingView: React.FC<ViewProps> = () => (
    <Card>
        <h2 className="text-xl font-bold mb-4">Bank Payments Pending</h2>
        <p className="text-muted text-center p-8">This report is not yet implemented.</p>
    </Card>
);
