import { Buyer, Supplier, Product, Entry, EntryItem, EntryStatus, Stats, Invoice, InvoiceItem, SupplierInvoice, SupplierInvoiceItem, SupplierInvoiceStatus, CashFlowTransaction, TransactionType, PaymentMethod, ExpenseCategory, DashboardData, SalesReportData, PurchaseReportData, LedgerReportData, ProfitAndLossData, LedgerEntry, BuyerBalanceSheetData, BuyerBalanceSheetItem, CashFlowDetailsData, WagesReportData, WagesReportItem, BuyerDetailStats, SupplierDetailStats, UninvoicedBuyerWithEntries, UninvoicedEntryForBuyer, IncomeLedgerData, ExpenseLedgerData, Role, PermissionKey, User, Feature, RolePermission, AuditLog, ALL_PERMISSION_KEYS, ProductDetailData, ProductSaleItem, ChartDataItem, ProductAnalyticsData, BuyerInvoicesAnalyticsData, SupplierInvoicesAnalyticsData, AnalyticsDashboardData, InvoiceAgingReportData, InvoiceAgingItem, SupplierBalanceSheetData, SupplierBalanceSheetItem, ProductSalesReportData, ProductSalesReportItem, AdjustmentsReportData, AdjustmentItem, DiscountReportData, DiscountReportItem, CommissionReportData, CommissionReportItem, AuditAction, SupplierWagesReportData, SupplierWagesReportItem } from '../types';

// --- MOCK DATABASE ---
const createId = () => `id_${Math.random().toString(36).substr(2, 9)}`;

let auditLogs: AuditLog[] = [];

// --- INTERNAL HELPERS ---
const addAuditLog = (log: Omit<AuditLog, 'id' | 'timestamp'>): void => {
    auditLogs.unshift({ ...log, id: createId(), timestamp: new Date() });
};

type Actor = { id: string, name: string };
const formatCurrency = (amount: number) => new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR' }).format(amount);
const getISODateString = (date: Date) => date.toISOString().split('T')[0];


// --- RBAC DATA ---
let roles: Role[] = [
    {
        id: 'role-admin',
        name: 'Admin',
        permissions: ALL_PERMISSION_KEYS.reduce((acc, key) => {
            acc[key] = true;
            return acc;
        }, {} as RolePermission)
    },
    {
        id: 'role-manager',
        name: 'Manager',
        permissions: {
            // Dashboard
            'dashboard.view_page.view': true,
            'dashboard.kpis.view': true,
            'dashboard.charts.view': true,
            'dashboard.at_a_glance.view': true,
            'dashboard.operations.view': true,
            // Entries
            'entries.list.view': true,
            'entries.list.create': true,
            'entries.list.update': true,
            'entries.list.delete': true,
            'entries.auction_action.view': true,
            'entries.auction_action.update': true,
            'entries.invoice_action.view': true,
            'entries.invoice_action.create': true,
            'entries.quick_create_supplier.create': true,
            'entries.quick_create_product.create': true,
            // Auction
            'auction.list.view': true,
            'auction.manage_items.view': true,
            'auction.manage_items.create': true,
            'auction.manage_items.update': true,
            'auction.manage_items.delete': true,
            // Buyers
            'buyers.list.view': true,
            'buyers.list.create': true,
            'buyers.list.update': true,
            'buyers.list.delete': true,
            'buyers.details.view': true,
            'buyers.details_quick_stats.view': true,
            'buyers.details_analytics.view': true,
            'buyers.details_financial_summary.view': true,
            'buyers.details_invoice_history.view': true,
            'buyers.details_payment_history.view': true,
            // Suppliers
            'suppliers.list.view': true,
            'suppliers.list.create': true,
            'suppliers.list.update': true,
            'suppliers.list.delete': true,
            'suppliers.details.view': true,
            'suppliers.details_quick_stats.view': true,
            'suppliers.details_analytics.view': true,
            'suppliers.details_financial_summary.view': true,
            'suppliers.details_invoice_history.view': true,
            'suppliers.details_payment_history.view': true,
            'suppliers.details_bank_details.view': true,
            // Products
            'products.list.view': true,
            'products.list.create': true,
            'products.list.update': true,
            'products.list.delete': true,
            'products.details.view': true,
            'products.details_quick_stats.view': true,
            'products.details_analytics.view': true,
            'products.details_recent_sales.view': true,
            // Buyer Invoices
            'buyer_invoices.manage.view': true,
            'buyer_invoices.manage.create': true,
            'buyer_invoices.manage.update': true,
            'buyer_invoices.manage.delete': true,
            'buyer_invoices.print.view': true,
            'buyer_invoices.payment.create': true,
            // Supplier Invoices
            'supplier_invoices.manage.view': true,
            'supplier_invoices.manage.create': true,
            'supplier_invoices.manage.update': true,
            'supplier_invoices.manage.delete': true,
            'supplier_invoices.draft.view': true,
            'supplier_invoices.draft.create': true,
            'supplier_invoices.print.view': true,
            'supplier_invoices.payment.create': true,
            // Cash Flow
            'cash_flow.view.view': true,
            'cash_flow.add_income.create': true,
            'cash_flow.add_expense.create': true,
            'cash_flow.update_transaction.update': true,
            'cash_flow.delete_transaction.delete': true,
            // Reports
            'reports.view_page.view': true,
            'reports.analytics_kpis.view': true,
            'reports.analytics_charts.view': true,
            'reports.analytics_lists.view': true,
            'reports.sales.view': true,
            'reports.buyer_balance_sheet.view': true,
            'reports.invoice_aging.view': true,
            'reports.wages_report.view': true,
            'reports.adjustments_report.view': true,
            'reports.discount_report.view': true,
            'reports.buyer_ledger.view': true,
            'reports.purchases.view': true,
            'reports.supplier_balance_sheet.view': true,
            'reports.supplier_ledger.view': true,
            'reports.pnl.view': true,
            'reports.commission_report.view': true,
            'reports.cash_flow_details.view': true,
            'reports.income_ledger.view': true,
            'reports.expense_ledger.view': true,
            'reports.product_sales.view': true,
        }
    },
    {
        id: 'role-de',
        name: 'Data Entry',
        permissions: {
            // Dashboard
            'dashboard.view_page.view': true,
            // Entries
            'entries.list.view': true,
            'entries.list.create': true,
            'entries.list.update': true,
            'entries.quick_create_supplier.create': true,
            'entries.quick_create_product.create': true,
            // Auction
            'auction.list.view': true,
            'auction.manage_items.view': true,
            'auction.manage_items.update': true,
            // Buyers
            'buyers.list.view': true,
            'buyers.list.create': true,
            'buyers.list.update': true,
            // Suppliers
            'suppliers.list.view': true,
            'suppliers.list.create': true,
            'suppliers.list.update': true,
            // Products
            'products.list.view': true,
            'products.list.create': true,
            'products.list.update': true,
        }
    }
];

let users: User[] = [
    { id: 'user-admin', name: 'Admin User', roleId: 'role-admin', contactNumber: '9876543210', password: 'admin' },
    { id: 'user-manager', name: 'Manager User', roleId: 'role-manager', contactNumber: '9876543211', password: 'manager' },
    { id: 'user-de', name: 'Data Entry User', roleId: 'role-de', contactNumber: '9876543212', password: 'de' },
];

// --- BASE DATA ---

let buyers: Buyer[] = [
    { id: 'b1', buyerName: 'Global Fruit Co.', displayName: 'Global Fruit Co.', contactNumber: '111-222-3333', place: 'City A', alias: 'GFC', outstanding: 0, tokenNumber: 'T01', description: 'Major exporter.' },
    { id: 'b2', buyerName: 'Fresh Produce Inc.', displayName: 'Fresh Produce Inc.', contactNumber: '444-555-6666', place: 'City B', alias: 'FPI', outstanding: 0, tokenNumber: 'T02', description: 'Local distributor.' },
    { id: 'b3', buyerName: 'Daily Needs Grocers', displayName: 'Daily Needs', contactNumber: '777-123-4567', place: 'City A', outstanding: 0, tokenNumber: 'T03' },
    { id: 'b4', buyerName: 'SuperMart Hyper', displayName: 'SuperMart Hyper', contactNumber: '888-987-6543', place: 'City C', alias: 'SuperMart', outstanding: 0 },
    { id: 'b5', buyerName: 'Organic World', displayName: 'Organic World', contactNumber: '555-444-3333', place: 'City B', outstanding: 0, tokenNumber: 'T05' },
    { id: 'b6', buyerName: 'Fruit Basket Retail', displayName: 'Fruit Basket', contactNumber: '222-333-4444', place: 'City D', outstanding: 0 },
    { id: 'b7', buyerName: 'Mr. Kumar (Juice Shop)', displayName: 'Mr. Kumar (Juice Shop)', contactNumber: '666-777-8888', place: 'City A', outstanding: 0, description: 'Cash only buyer.' },
    { id: 'b8', buyerName: 'Healthy Eats Cafe', displayName: 'Healthy Eats Cafe', contactNumber: '999-000-1111', place: 'City C', outstanding: 0, tokenNumber: 'T08' },
    { id: 'b9', buyerName: 'The Mango Project', displayName: 'The Mango Project', contactNumber: '123-123-1234', place: 'City D', alias: 'TMP', outstanding: 0 },
    { id: 'b10', buyerName: 'Five Star Hotels', displayName: 'Five Star Hotels', contactNumber: '456-456-4567', place: 'City B', outstanding: 0 },
];

let suppliers: Supplier[] = [
    { id: 's1', supplierName: 'Green Valley Farms', displayName: 'GVF', contactNumber: '777-888-9999', place: 'Rural Area X', outstanding: -5000, bankAccountDetails: 'SBI\nAcct: 1234567890\nIFSC: SBIN0001234' },
    { id: 's2', supplierName: 'Sunny Orchard', contactNumber: '123-456-7890', place: 'Rural Area Y', outstanding: 0, bankAccountDetails: 'HDFC Bank\nAcct: 0987654321\nIFSC: HDFC0005678' },
    { id: 's3', supplierName: 'Deccan Plantations', displayName: 'Deccan', contactNumber: '321-654-0987', place: 'Southern Fields', outstanding: -12000 },
    { id: 's4', supplierName: 'Himalayan Organics', contactNumber: '567-890-1234', place: 'Northern Hills', outstanding: 3500 },
    { id: 's5', supplierName: 'Coastal Growers', displayName: 'Coastal', contactNumber: '890-123-4567', place: 'Coastal Belt', outstanding: 0, bankAccountDetails: 'ICICI Bank\nAcct: 555566667777\nIFSC: ICIC0001111' },
    { id: 's6', supplierName: 'Ganga River Farms', contactNumber: '432-109-8765', place: 'River Valley', outstanding: -8500 },
    { id: 's7', supplierName: 'Central Plains Agri', contactNumber: '654-321-0987', place: 'Central Province', outstanding: 0 },
    { id: 's8', supplierName: 'Village Co-operative', contactNumber: '789-012-3456', place: 'Local Village', outstanding: 1500 },
    { id: 's9', supplierName: 'Satpura Cultivators', contactNumber: '210-987-6543', place: 'Satpura Range', outstanding: -2500, bankAccountDetails: 'Axis Bank\nAcct: 9988776655\nIFSC: UTIB0002222' },
    { id: 's10', supplierName: 'Evergreen Estates', contactNumber: '109-876-5432', place: 'Western Ghats', outstanding: 0 },
];

let products: Product[] = [
    { id: 'p1', productName: 'மல்கோவா', displayName: 'Malgova' },
    { id: 'p2', productName: 'செந்தூரா', displayName: 'Senthoora' },
    { id: 'p3', productName: 'தோதாபுரி', displayName: 'Totapuri' },
    { id: 'p4', productName: 'பீத்தர்', displayName: 'Peethar' },
    { id: 'p5', productName: 'இமாம்பசந்த்', displayName: 'Imam Pasand' },
    { id: 'p6', productName: 'கிளி மூக்கு', displayName: 'Kili Mooku' },
    { id: 'p7', productName: 'பங்கனப்பள்ளி', displayName: 'Banganapalli' },
    { id: 'p8', productName: 'நீலம்', displayName: 'Neelam' },
    { id: 'p9', productName: 'காசா லட்டு', displayName: 'Kasa Laddu' },
    { id: 'p10', productName: 'அல்போன்சா', displayName: 'Alphonso' },
];

let entries: Entry[] = [
    {
        id: 'e1', serialNumber: '0726-001', supplierId: 's1', status: EntryStatus.Pending, createdAt: new Date('2024-07-26T10:00:00Z'), lastSubSerialNumber: 2,
        items: [
            { id: 'ei1', subSerialNumber: 1, productId: 'p1', quantity: 50, nettWeight: 0, subTotal: 0, invoiceId: null, supplierInvoiceId: null },
            { id: 'ei2', subSerialNumber: 2, productId: 'p2', quantity: 80, nettWeight: 0, subTotal: 0, invoiceId: null, supplierInvoiceId: null },
        ],
        totalQuantities: 130, totalAmount: 0,
    },
    {
        id: 'e2', serialNumber: '0726-002', supplierId: 's2', status: EntryStatus.Draft, createdAt: new Date('2024-07-26T11:30:00Z'), lastSubSerialNumber: 2,
        items: [
            { id: 'ei3', subSerialNumber: 1, productId: 'p3', quantity: 12, grossWeight: 150, shuteWeight: 10, nettWeight: 140, ratePerQuantity: 50, buyerId: 'b1', subTotal: 7000, invoiceId: null, supplierInvoiceId: null },
            { id: 'ei4', subSerialNumber: 2, productId: 'p7', quantity: 70, nettWeight: 0, subTotal: 0, invoiceId: null, supplierInvoiceId: null },
        ],
        totalQuantities: 82, totalAmount: 7000,
    },
    {
        id: 'e3', serialNumber: '0725-001', supplierId: 's3', status: EntryStatus.Invoiced, createdAt: new Date('2024-07-25T09:00:00Z'), lastSubSerialNumber: 2,
        items: [
            { id: 'ei5', subSerialNumber: 1, productId: 'p8', quantity: 200, nettWeight: 0, ratePerQuantity: 30, buyerId: 'b3', subTotal: 6000, invoiceId: 'inv1', supplierInvoiceId: 'si2' },
            { id: 'ei6', subSerialNumber: 2, productId: 'p6', quantity: 150, nettWeight: 0, ratePerQuantity: 25, buyerId: 'b3', subTotal: 3750, invoiceId: 'inv1', supplierInvoiceId: 'si2' },
        ],
        totalQuantities: 350, totalAmount: 9750,
    },
    {
        id: 'e4', serialNumber: '0725-002', supplierId: 's4', status: EntryStatus.Auctioned, createdAt: new Date('2024-07-25T14:00:00Z'), lastSubSerialNumber: 2,
        items: [
            { id: 'ei7', subSerialNumber: 1, productId: 'p5', quantity: 25, grossWeight: 40, shuteWeight: 2.5, nettWeight: 37.5, ratePerQuantity: 200, buyerId: 'b5', subTotal: 7500, invoiceId: null, supplierInvoiceId: null },
            { id: 'ei8', subSerialNumber: 2, productId: 'p9', quantity: 100, grossWeight: 110, shuteWeight: 5, nettWeight: 105, ratePerQuantity: 40, buyerId: 'b5', subTotal: 4200, invoiceId: 'inv2', supplierInvoiceId: null },
        ],
        totalQuantities: 125, totalAmount: 11700,
    },
    {
        id: 'e5', serialNumber: '0724-001', supplierId: 's5', status: EntryStatus.Auctioned, createdAt: new Date('2024-07-24T12:00:00Z'), lastSubSerialNumber: 1,
        items: [
            { id: 'ei9', subSerialNumber: 1, productId: 'p1', quantity: 60, nettWeight: 0, ratePerQuantity: 120, buyerId: 'b2', subTotal: 7200, invoiceId: 'inv3', supplierInvoiceId: null },
        ],
        totalQuantities: 60, totalAmount: 7200,
    },
    {
        id: 'e6', serialNumber: '0724-002', supplierId: 's1', status: EntryStatus.Invoiced, createdAt: new Date('2024-07-24T16:00:00Z'), lastSubSerialNumber: 2,
        items: [
            { id: 'ei10', subSerialNumber: 1, productId: 'p10', quantity: 30, nettWeight: 0, ratePerQuantity: 300, buyerId: 'b10', subTotal: 9000, invoiceId: 'inv4', supplierInvoiceId: 'si1' },
            { id: 'ei11', subSerialNumber: 2, productId: 'p4', quantity: 90, nettWeight: 0, ratePerQuantity: 80, buyerId: 'b10', subTotal: 7200, invoiceId: 'inv4', supplierInvoiceId: 'si1' },
        ],
        totalQuantities: 120, totalAmount: 16200,
    },
    {
        id: 'e7', serialNumber: '0723-001', supplierId: 's6', status: EntryStatus.Pending, createdAt: new Date('2024-07-23T10:30:00Z'), lastSubSerialNumber: 2,
        items: [
            { id: 'ei12', subSerialNumber: 1, productId: 'p7', quantity: 150, nettWeight: 0, subTotal: 0, invoiceId: null, supplierInvoiceId: null },
            { id: 'ei13', subSerialNumber: 2, productId: 'p8', quantity: 100, nettWeight: 0, subTotal: 0, invoiceId: null, supplierInvoiceId: null },
        ],
        totalQuantities: 250, totalAmount: 0,
    }
];

let invoices: Invoice[] = [
    {
        id: 'inv1', invoiceNumber: 'BI-20240725-001', buyerId: 'b3', createdAt: new Date('2024-07-25T18:00:00Z'),
        items: [
            { id: 'ei5', productId: 'p8', productName: 'நீலம்', quantity: 200, nettWeight: 0, ratePerQuantity: 30, subTotal: 6000 },
            { id: 'ei6', productId: 'p6', productName: 'கிளி மூக்கு', quantity: 150, nettWeight: 0, ratePerQuantity: 25, subTotal: 3750 },
        ],
        totalQuantities: 350,
        totalAmount: 9750, wages: 350, adjustments: -50, nettAmount: 10050, paidAmount: 10000, discount: 50,
    },
    {
        id: 'inv2', invoiceNumber: 'BI-20240725-002', buyerId: 'b5', createdAt: new Date('2024-07-25T19:00:00Z'),
        items: [
            { id: 'ei8', productId: 'p9', productName: 'காசா லட்டு', quantity: 100, nettWeight: 105, ratePerQuantity: 40, subTotal: 4200 },
        ],
        totalQuantities: 100,
        totalAmount: 4200, wages: 150, adjustments: 0, nettAmount: 4350, paidAmount: 4350, discount: 0,
    },
    {
        id: 'inv3', invoiceNumber: 'BI-20240724-001', buyerId: 'b2', createdAt: new Date('2024-07-24T18:00:00Z'),
        items: [
            { id: 'ei9', productId: 'p1', productName: 'மல்கோவா', quantity: 60, nettWeight: 0, ratePerQuantity: 120, subTotal: 7200 },
        ],
        totalQuantities: 60,
        totalAmount: 7200, wages: 200, adjustments: 0, nettAmount: 7400, paidAmount: 5000, discount: 0,
    },
    {
        id: 'inv4', invoiceNumber: 'BI-20240724-002', buyerId: 'b10', createdAt: new Date('2024-07-24T20:00:00Z'),
        items: [
            { id: 'ei10', productId: 'p10', productName: 'அல்போன்சா', quantity: 30, nettWeight: 0, ratePerQuantity: 300, subTotal: 9000 },
            { id: 'ei11', productId: 'p4', productName: 'பீத்தர்', quantity: 90, nettWeight: 0, ratePerQuantity: 80, subTotal: 7200 },
        ],
        totalQuantities: 120,
        totalAmount: 16200, wages: 500, adjustments: 100, nettAmount: 16800, paidAmount: 15000, discount: 0,
    }
];

let supplierInvoices: SupplierInvoice[] = [
    {
        id: 'si1', invoiceNumber: 'SI-20240724-001', supplierId: 's1', createdAt: new Date('2024-07-24T21:00:00Z'),
        entryIds: ['e6'],
        items: [
            { productId: 'p10', productName: 'அல்போன்சா', quantity: 30, nettWeight: 0, ratePerQuantity: 300, subTotal: 9000 },
            { productId: 'p4', productName: 'பீத்தர்', quantity: 90, nettWeight: 0, ratePerQuantity: 80, subTotal: 7200 }
        ],
        totalQuantities: 120,
        grossTotal: 16200, commissionRate: 10, commissionAmount: 1620, wages: 200, adjustments: 0,
        nettAmount: 14380, advancePaid: 0, finalPayable: 14380, paidAmount: 0, status: SupplierInvoiceStatus.Unpaid,
    },
    {
        id: 'si2', invoiceNumber: 'SI-20240725-001', supplierId: 's3', createdAt: new Date('2024-07-25T21:00:00Z'),
        entryIds: ['e3'],
        items: [
            { productId: 'p8', productName: 'நீலம்', quantity: 200, nettWeight: 0, ratePerQuantity: 30, subTotal: 6000 },
            { productId: 'p6', productName: 'கிளி மூக்கு', quantity: 150, nettWeight: 0, ratePerQuantity: 25, subTotal: 3750 }
        ],
        totalQuantities: 350,
        grossTotal: 9750, commissionRate: 10, commissionAmount: 975, wages: 150, adjustments: 50,
        nettAmount: 8675, advancePaid: 5000, finalPayable: 3625, paidAmount: 5000, status: SupplierInvoiceStatus.PartiallyPaid,
    }
];

let cashFlowTransactions: CashFlowTransaction[] = [
    {
        id: 'cf1', date: new Date('2024-07-25T18:05:00Z'), type: TransactionType.Income, category: null,
        entityId: 'b3', entityName: 'Daily Needs Grocers', amount: 10000, discount: 50, method: PaymentMethod.Bank, description: 'Payment for BI-20240725-001', relatedInvoiceIds: ['inv1']
    },
    {
        id: 'cf2', date: new Date('2024-07-25T21:05:00Z'), type: TransactionType.Expense, category: ExpenseCategory.SupplierPayment,
        entityId: 's3', entityName: 'Deccan Plantations', amount: 5000, method: PaymentMethod.Cash, description: 'Payment for SI-20240725-001', relatedInvoiceIds: ['si2']
    },
    {
        id: 'cf3', date: new Date('2024-07-26T14:00:00Z'), type: TransactionType.Expense, category: ExpenseCategory.Other,
        entityId: null, entityName: 'Office Rent', amount: 15000, method: PaymentMethod.Bank, description: 'July Rent'
    },
];

// --- HELPERS for recalculating state ---
const _calculateEntryStatus = (entry: Entry): EntryStatus => {
    // A manually cancelled entry should remain cancelled.
    if (entry.status === EntryStatus.Cancelled) {
        return EntryStatus.Cancelled;
    }

    // An entry with no items is pending.
    if (entry.items.length === 0) {
        return EntryStatus.Pending;
    }

    // 1. INVOICED: If any item is part of a supplier invoice, the whole entry is invoiced.
    // This is the highest and final state (besides Cancelled).
    if (entry.items.some(item => !!item.supplierInvoiceId)) {
        return EntryStatus.Invoiced;
    }

    // 2. AUCTIONED: If ALL items have been assigned to a buyer's invoice.
    // This implies they all must have been sold first.
    if (entry.items.every(item => !!item.invoiceId)) {
        return EntryStatus.Auctioned;
    }

    // 3. DRAFT: If ALL items have been sold (have a buyer and a rate), but not all are on buyer invoices yet.
    if (entry.items.every(item => item.buyerId && item.ratePerQuantity != null)) {
        return EntryStatus.Draft;
    }

    // 4. PENDING: The default state if none of the above conditions are met.
    // This means at least one item has not been sold yet.
    return EntryStatus.Pending;
};

const _updateEntryStatus = (entryId: string) => {
    const entry = entries.find(e => e.id === entryId);
    if (entry) {
        entry.status = _calculateEntryStatus(entry);
    }
};

const recalculateBalances = () => {
    // Reset all derived values
    buyers.forEach(b => b.outstanding = 0);
    suppliers.forEach(s => s.outstanding = 0);
    invoices.forEach(inv => { inv.paidAmount = 0; });
    supplierInvoices.forEach(si => { si.paidAmount = 0; });
    entries.forEach(e => _updateEntryStatus(e.id));

    // Step 1: Establish base debt from invoices
    invoices.forEach(inv => {
        const buyer = buyers.find(b => b.id === inv.buyerId);
        if (buyer) {
            buyer.outstanding += (inv.nettAmount - (inv.discount || 0));
        }
    });
    supplierInvoices.forEach(si => {
        const supplier = suppliers.find(s => s.id === si.supplierId);
        if (supplier) {
            supplier.outstanding -= si.nettAmount;
        }
    });

    // Step 2: Process all payments and apply them to balances and invoice `paidAmount` fields
    // Sort transactions to ensure chronological processing
    const sortedTransactions = [...cashFlowTransactions].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

    sortedTransactions.forEach(t => {
        if (t.type === TransactionType.Income) {
            if (t.entityId) {
                const buyer = buyers.find(b => b.id === t.entityId);
                if (buyer) {
                    buyer.outstanding -= (t.amount + (t.discount || 0));
                }
            }
            // Apply payment to the related buyer invoice object
            if (t.relatedInvoiceIds && t.relatedInvoiceIds.length > 0) {
                let creditToDistribute = t.amount + (t.discount || 0);

                const relatedInvoices = t.relatedInvoiceIds
                    .map(id => invoices.find(i => i.id === id))
                    .filter((inv): inv is Invoice => !!inv)
                    .sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());

                for (const inv of relatedInvoices) {
                    if (creditToDistribute <= 0) break;

                    const balance = (inv.nettAmount - (inv.discount || 0)) - inv.paidAmount;
                    if (balance > 0) {
                        const creditForThisInvoice = Math.min(creditToDistribute, balance);
                        inv.paidAmount += creditForThisInvoice;
                        creditToDistribute -= creditForThisInvoice;
                    }
                }
            }
        } else if (t.type === TransactionType.Expense) {
            if ((t.category === ExpenseCategory.SupplierPayment || t.category === ExpenseCategory.AdvancePayment) && t.entityId) {
                const supplier = suppliers.find(s => s.id === t.entityId);
                if (supplier) {
                    supplier.outstanding += t.amount;
                }
                // Apply payment to related supplier invoice, either by direct invoice ID or by entry ID for advances
                if (t.relatedInvoiceIds && t.relatedInvoiceIds.length > 0) {
                    let amountToDistribute = t.amount;

                    const relatedInvoices = t.relatedInvoiceIds
                        .map(id => supplierInvoices.find(i => i.id === id))
                        .filter((inv): inv is SupplierInvoice => !!inv)
                        .sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());

                    for (const inv of relatedInvoices) {
                        if (amountToDistribute <= 0) break;

                        const balance = inv.nettAmount - inv.paidAmount;
                        if (balance > 0) {
                            const paymentForThisInvoice = Math.min(amountToDistribute, balance);
                            inv.paidAmount += paymentForThisInvoice;
                            amountToDistribute -= paymentForThisInvoice;
                        }
                    }
                } else if (t.relatedEntryIds) {
                    // This handles advance payments linked to entries before an invoice exists.
                    // Assumes the group of entries for an advance payment will end up on the same final invoice.
                    const targetInvoice = supplierInvoices.find(si => t.relatedEntryIds!.every(eId => si.entryIds.includes(eId)));
                    if (targetInvoice) {
                        targetInvoice.paidAmount += t.amount;
                    }
                }
            }
        }
    });

    // Step 3: Update supplier invoice status based on the newly calculated paidAmount
    supplierInvoices.forEach(si => {
        const finalPayable = si.nettAmount;
        if (si.paidAmount >= finalPayable) {
            si.status = SupplierInvoiceStatus.Paid;
        } else if (si.paidAmount > 0) {
            si.status = SupplierInvoiceStatus.PartiallyPaid;
        } else {
            si.status = SupplierInvoiceStatus.Unpaid;
        }
    });
};

recalculateBalances();


// --- API FUNCTIONS ---
const simulateDelay = <T,>(data: T): Promise<T> =>
    new Promise(resolve => {
        // Recalculate balances synchronously to prevent race conditions where UI fetches stale data.
        recalculateBalances();
        // Then, simulate the network delay.
        setTimeout(() => {
            resolve(JSON.parse(JSON.stringify(data)))
        }, 300);
    });


// Stats
export const fetchStats = (): Promise<Stats> => {
    return simulateDelay({
        buyers: buyers.length,
        suppliers: suppliers.length,
        products: products.length,
        entries: entries.length,
        totalRevenue: invoices.reduce((acc, inv) => acc + inv.nettAmount, 0),
        totalExpenses: cashFlowTransactions.filter(t => t.type === TransactionType.Expense).reduce((sum, t) => sum + t.amount, 0),
    });
};

// --- AUDIT API ---
export const fetchAuditLogs = (filters?: { startDate?: string, endDate?: string, userId?: string, feature?: Feature, action?: AuditAction }): Promise<AuditLog[]> => {
    let logs = [...auditLogs];
    if (filters?.startDate) {
        const start = new Date(filters.startDate);
        start.setHours(0, 0, 0, 0);
        logs = logs.filter(log => new Date(log.timestamp) >= start);
    }
    if (filters?.endDate) {
        const end = new Date(filters.endDate);
        end.setHours(23, 59, 59, 999);
        logs = logs.filter(log => new Date(log.timestamp) <= end);
    }
    if (filters?.userId) {
        logs = logs.filter(log => log.actorId === filters.userId);
    }
    if (filters?.feature) {
        logs = logs.filter(log => log.feature === filters.feature);
    }
    if (filters?.action) {
        logs = logs.filter(log => log.action === filters.action);
    }
    return simulateDelay(logs);
}


// --- RBAC API ---
export const fetchUsers = (): Promise<User[]> => {
    const usersToReturn = users.map(u => {
        const { password, ...userWithoutPassword } = u;
        return { ...userWithoutPassword, role: roles.find(r => r.id === u.roleId) };
    });
    return simulateDelay(usersToReturn);
};
export const addUser = (user: Omit<User, 'id'>, actor: Actor): Promise<User> => {
    if (users.some(u => u.contactNumber === user.contactNumber)) {
        return Promise.reject(new Error('Contact number already exists.'));
    }
    const newUser: User = { ...user, id: createId() };
    users.push(newUser);
    const roleName = roles.find(r => r.id === newUser.roleId)?.name || 'N/A';
    addAuditLog({ actorId: actor.id, actorName: actor.name, action: AuditAction.Create, feature: Feature.Users, description: `Created user '${newUser.name}' with role '${roleName}'.` });
    const { password, ...userToReturn } = newUser;
    return simulateDelay({ ...userToReturn, role: roles.find(r => r.id === newUser.roleId) });
};
export const updateUser = (updatedUser: User, actor: Actor): Promise<User> => {
    const index = users.findIndex(u => u.id === updatedUser.id);
    if (index !== -1) {
        if (users.some(u => u.contactNumber === updatedUser.contactNumber && u.id !== updatedUser.id)) {
            return Promise.reject(new Error('Contact number already exists.'));
        }
        const originalUser = { ...users[index] };
        const changes: string[] = [];
        if (originalUser.name !== updatedUser.name) changes.push(`name from '${originalUser.name}' to '${updatedUser.name}'`);
        if (originalUser.contactNumber !== updatedUser.contactNumber) changes.push(`contact number from '${originalUser.contactNumber}' to '${updatedUser.contactNumber}'`);
        if (originalUser.roleId !== updatedUser.roleId) {
            const oldRole = roles.find(r => r.id === originalUser.roleId)?.name || 'N/A';
            const newRole = roles.find(r => r.id === updatedUser.roleId)?.name || 'N/A';
            changes.push(`role from '${oldRole}' to '${newRole}'`);
        }
        if (updatedUser.password) changes.push('password');

        if (changes.length > 0) {
            const description = `Updated user '${originalUser.name}': changed ${changes.join(', ')}.`;
            addAuditLog({ actorId: actor.id, actorName: actor.name, action: AuditAction.Update, feature: Feature.Users, description });
        }

        const userWithPasswordHandling = { ...originalUser, ...updatedUser, password: updatedUser.password ? updatedUser.password : originalUser.password };
        users[index] = userWithPasswordHandling;

        const { password, ...userToReturn } = users[index];
        return simulateDelay({ ...userToReturn, role: roles.find(r => r.id === userToReturn.roleId) });
    }
    return Promise.reject(new Error('User not found'));
};
export const deleteUser = (userId: string, actor: Actor): Promise<{ id: string }> => {
    const userToDelete = users.find(u => u.id === userId);
    if (userToDelete) {
        const roleName = roles.find(r => r.id === userToDelete.roleId)?.name || 'Unassigned';
        addAuditLog({ actorId: actor.id, actorName: actor.name, action: AuditAction.Delete, feature: Feature.Users, description: `Deleted user: ${userToDelete.name} (Role: ${roleName})` });
        users = users.filter(u => u.id !== userId);
    }
    return simulateDelay({ id: userId });
};

export const fetchRoles = (): Promise<Role[]> => simulateDelay(roles);
export const addRole = (role: Omit<Role, 'id'>, actor: Actor): Promise<Role> => {
    const newRole: Role = { ...role, id: createId() };
    roles.push(newRole);
    addAuditLog({ actorId: actor.id, actorName: actor.name, action: AuditAction.Create, feature: Feature.Roles, description: `Created role: '${newRole.name}'.` });
    return simulateDelay(newRole);
};
export const updateRole = (updatedRole: Role, actor: Actor): Promise<Role> => {
    const index = roles.findIndex(r => r.id === updatedRole.id);
    if (index !== -1) {
        addAuditLog({ actorId: actor.id, actorName: actor.name, action: AuditAction.Update, feature: Feature.Roles, description: `Updated permissions for role: '${updatedRole.name}'.` });
        roles[index] = updatedRole;
        return simulateDelay(updatedRole);
    }
    return Promise.reject(new Error('Role not found'));
};
export const deleteRole = (roleId: string, actor: Actor): Promise<{ id: string }> => {
    const roleToDelete = roles.find(r => r.id === roleId);
    if (roleToDelete) {
        addAuditLog({ actorId: actor.id, actorName: actor.name, action: AuditAction.Delete, feature: Feature.Roles, description: `Deleted role: '${roleToDelete.name}'.` });
        roles = roles.filter(r => r.id !== roleId);
        users.forEach(u => {
            if (u.roleId === roleId) u.roleId = '';
        });
    }
    return simulateDelay({ id: roleId });
};

export const loginUser = (credentials: { contactNumber: string, password?: string }): Promise<User> => {
    const contactNumber = credentials.contactNumber.trim();
    const user = users.find(u => u.contactNumber === contactNumber && u.password === credentials.password);
    if (!user) return Promise.reject(new Error('Invalid credentials'));

    const { password, ...userWithoutPassword } = user;
    const role = roles.find(r => r.id === user.roleId);

    addAuditLog({ actorId: user.id, actorName: user.name, action: AuditAction.Login, feature: Feature.Users, description: `User '${user.name}' logged in.` });

    return simulateDelay({ ...userWithoutPassword, role });
};


export const recordLogout = (actor: Actor): Promise<{}> => {
    addAuditLog({ actorId: actor.id, actorName: actor.name, action: AuditAction.Logout, feature: Feature.Users, description: `User '${actor.name}' logged out.` });
    return simulateDelay({});
}

// Buyers
export const fetchBuyers = (): Promise<Buyer[]> => simulateDelay(buyers);
export const fetchBuyer = (buyerId: string): Promise<Buyer | null> => simulateDelay(buyers.find(b => b.id === buyerId) || null);
export const addBuyer = (buyer: Omit<Buyer, 'id' | 'outstanding' | 'paymentHistory'>, actor: Actor): Promise<Buyer> => {
    const newBuyer: Buyer = {
        ...buyer,
        id: createId(),
        outstanding: 0,
        displayName: buyer.displayName || buyer.buyerName
    };
    buyers.push(newBuyer);
    addAuditLog({ actorId: actor.id, actorName: actor.name, action: AuditAction.Create, feature: Feature.Buyers, description: `Created buyer '${newBuyer.buyerName}' (Display: ${newBuyer.displayName}, Token: ${newBuyer.tokenNumber || 'N/A'}).` });
    return simulateDelay(newBuyer);
};
export const updateBuyer = (updatedBuyer: Omit<Buyer, 'outstanding' | 'paymentHistory'>, actor: Actor): Promise<Buyer> => {
    const index = buyers.findIndex(b => b.id === updatedBuyer.id);
    if (index !== -1) {
        const originalBuyer = buyers[index];
        const changes: string[] = [];
        if (originalBuyer.buyerName !== updatedBuyer.buyerName) changes.push(`name to '${updatedBuyer.buyerName}'`);
        if (originalBuyer.displayName !== updatedBuyer.displayName) changes.push(`display name from '${originalBuyer.displayName || ''}' to '${updatedBuyer.displayName || ''}'`);
        if (originalBuyer.alias !== updatedBuyer.alias) changes.push(`alias from '${originalBuyer.alias || ''}' to '${updatedBuyer.alias || ''}'`);
        if (originalBuyer.tokenNumber !== updatedBuyer.tokenNumber) changes.push(`token number from '${originalBuyer.tokenNumber || ''}' to '${updatedBuyer.tokenNumber || ''}'`);
        if (originalBuyer.description !== updatedBuyer.description) changes.push(`description`);
        if (originalBuyer.contactNumber !== updatedBuyer.contactNumber) changes.push(`contact from '${originalBuyer.contactNumber}' to '${updatedBuyer.contactNumber}'`);
        if (originalBuyer.place !== updatedBuyer.place) changes.push(`place from '${originalBuyer.place || ''}' to '${updatedBuyer.place || ''}'`);

        if (changes.length > 0) {
            const description = `Updated buyer '${originalBuyer.buyerName}': changed ${changes.join(', ')}.`;
            addAuditLog({ actorId: actor.id, actorName: actor.name, action: AuditAction.Update, feature: Feature.Buyers, description });
        }

        const originalOutstanding = buyers[index].outstanding;
        const finalBuyer = {
            ...updatedBuyer,
            outstanding: originalOutstanding,
            displayName: updatedBuyer.displayName || updatedBuyer.buyerName
        };
        buyers[index] = finalBuyer;
        return simulateDelay(buyers[index]);
    }
    return Promise.reject(new Error('Buyer not found'));
};
export const deleteBuyer = (buyerId: string, actor: Actor): Promise<{ id: string }> => {
    const buyerToDelete = buyers.find(b => b.id === buyerId);
    if (buyerToDelete) {
        if (buyerToDelete.outstanding !== 0) {
            return Promise.reject(new Error(`Cannot delete buyer '${buyerToDelete.buyerName}' as they have an outstanding balance of ${formatCurrency(buyerToDelete.outstanding)}. Please clear the balance first.`));
        }
        addAuditLog({ actorId: actor.id, actorName: actor.name, action: AuditAction.Delete, feature: Feature.Buyers, description: `Deleted buyer: '${buyerToDelete.buyerName}'.` });
        buyers = buyers.filter(b => b.id !== buyerId);
    }
    return simulateDelay({ id: buyerId });
};


// Suppliers
export const fetchSuppliers = (): Promise<Supplier[]> => simulateDelay(suppliers);
export const fetchSupplier = (supplierId: string): Promise<Supplier | null> => simulateDelay(suppliers.find(s => s.id === supplierId) || null);
export const addSupplier = (supplier: Omit<Supplier, 'id' | 'outstanding'>, actor: Actor): Promise<Supplier> => {
    const newSupplier: Supplier = { ...supplier, id: createId(), outstanding: 0 };
    suppliers.push(newSupplier);
    const details = [
        `Contact: ${newSupplier.contactNumber}`,
        `Place: ${newSupplier.place || 'N/A'}`,
        `Display Name: ${newSupplier.displayName || 'N/A'}`,
        `Bank Details: ${newSupplier.bankAccountDetails ? 'Provided' : 'Not Provided'}`
    ].join(', ');
    addAuditLog({ actorId: actor.id, actorName: actor.name, action: AuditAction.Create, feature: Feature.Suppliers, description: `Created supplier '${newSupplier.supplierName}' (${details}).` });
    return simulateDelay(newSupplier);
};
export const updateSupplier = (updatedSupplier: Omit<Supplier, 'outstanding'>, actor: Actor): Promise<Supplier> => {
    const index = suppliers.findIndex(s => s.id === updatedSupplier.id);
    if (index !== -1) {
        const originalSupplier = suppliers[index];
        const changes: string[] = [];
        if (originalSupplier.supplierName !== updatedSupplier.supplierName) changes.push(`name to '${updatedSupplier.supplierName}'`);
        if (originalSupplier.displayName !== updatedSupplier.displayName) changes.push(`display name from '${originalSupplier.displayName || ''}' to '${updatedSupplier.displayName || ''}'`);
        if (originalSupplier.contactNumber !== updatedSupplier.contactNumber) changes.push(`contact from '${originalSupplier.contactNumber}' to '${updatedSupplier.contactNumber}'`);
        if (originalSupplier.place !== updatedSupplier.place) changes.push(`place from '${originalSupplier.place || ''}' to '${updatedSupplier.place || ''}'`);
        if (originalSupplier.bankAccountDetails !== updatedSupplier.bankAccountDetails) changes.push(`bank details`);

        if (changes.length > 0) {
            const description = `Updated supplier '${originalSupplier.supplierName}': changed ${changes.join(', ')}.`;
            addAuditLog({ actorId: actor.id, actorName: actor.name, action: AuditAction.Update, feature: Feature.Suppliers, description });
        }

        const originalOutstanding = suppliers[index].outstanding;
        suppliers[index] = { ...updatedSupplier, outstanding: originalOutstanding };
        return simulateDelay(suppliers[index]);
    }
    return Promise.reject(new Error('Supplier not found'));
};
export const deleteSupplier = (supplierId: string, actor: Actor): Promise<{ id: string }> => {
    const supplierToDelete = suppliers.find(s => s.id === supplierId);
    if (supplierToDelete) {
        if (supplierToDelete.outstanding !== 0) {
            return Promise.reject(new Error(`Cannot delete supplier '${supplierToDelete.supplierName}' as they have a payable balance of ${formatCurrency(Math.abs(supplierToDelete.outstanding))}. Please clear the balance first.`));
        }
        addAuditLog({ actorId: actor.id, actorName: actor.name, action: AuditAction.Delete, feature: Feature.Suppliers, description: `Deleted supplier: '${supplierToDelete.supplierName}'.` });
        suppliers = suppliers.filter(s => s.id !== supplierId);
    }
    return simulateDelay({ id: supplierId });
};

// Products
export const fetchProducts = (): Promise<Product[]> => simulateDelay(products);
export const fetchProduct = (productId: string): Promise<Product | null> => simulateDelay(products.find(p => p.id === productId) || null);
export const addProduct = (product: Omit<Product, 'id'>, actor: Actor): Promise<Product> => {
    const newProduct: Product = { ...product, id: createId() };
    products.push(newProduct);
    addAuditLog({ actorId: actor.id, actorName: actor.name, action: AuditAction.Create, feature: Feature.Products, description: `Created product '${newProduct.productName}' (Display: ${newProduct.displayName || 'N/A'}).` });
    return simulateDelay(newProduct);
};
export const updateProduct = (updatedProduct: Product, actor: Actor): Promise<Product> => {
    const index = products.findIndex(p => p.id === updatedProduct.id);
    if (index !== -1) {
        const originalProduct = products[index];
        const changes: string[] = [];
        if (originalProduct.productName !== updatedProduct.productName) changes.push(`name to '${updatedProduct.productName}'`);
        if (originalProduct.displayName !== updatedProduct.displayName) changes.push(`display name to '${updatedProduct.displayName || ''}'`);

        if (changes.length > 0) {
            const description = `Updated product '${originalProduct.productName}': changed ${changes.join(', ')}.`;
            addAuditLog({ actorId: actor.id, actorName: actor.name, action: AuditAction.Update, feature: Feature.Products, description });
        }

        products[index] = updatedProduct;
        return simulateDelay(updatedProduct);
    }
    return Promise.reject(new Error('Product not found'));
};
export const deleteProduct = (productId: string, actor: Actor): Promise<{ id: string }> => {
    const productToDelete = products.find(p => p.id === productId);
    if (productToDelete) {
        addAuditLog({ actorId: actor.id, actorName: actor.name, action: AuditAction.Delete, feature: Feature.Products, description: `Deleted product: '${productToDelete.productName}'.` });
        products = products.filter(p => p.id !== productId);
    }
    return simulateDelay({ id: productId });
};


// Entries
export const fetchEntries = (filters?: { startDate?: string, endDate?: string }): Promise<Entry[]> => {
    let filteredEntries = [...entries];

    if (filters?.startDate) {
        const start = new Date(filters.startDate);
        start.setHours(0, 0, 0, 0);
        filteredEntries = filteredEntries.filter(e => new Date(e.createdAt) >= start);
    }

    if (filters?.endDate) {
        const end = new Date(filters.endDate);
        end.setHours(23, 59, 59, 999);
        filteredEntries = filteredEntries.filter(e => new Date(e.createdAt) <= end);
    }

    return simulateDelay(filteredEntries);
};
export const addEntry = (entry: Omit<Entry, 'id' | 'serialNumber' | 'createdAt' | 'items' | 'lastSubSerialNumber'> & { items: Omit<EntryItem, 'id' | 'subTotal' | 'subSerialNumber'>[] }, actor: Actor): Promise<Entry> => {
    const today = new Date();
    const year = today.getFullYear();
    const month = today.getMonth();
    const day = today.getDate();

    const existingEntry = entries.find(e => {
        const entryDate = new Date(e.createdAt);
        return e.supplierId === entry.supplierId &&
            entryDate.getFullYear() === year &&
            entryDate.getMonth() === month &&
            entryDate.getDate() === day;
    });

    if (existingEntry) {
        return Promise.reject({
            message: `An entry for this supplier already exists for today (Serial #: ${existingEntry.serialNumber}). You can edit the existing entry to add more items.`,
            existingEntryId: existingEntry.id
        });
    }

    const entriesToday = entries.filter(e => {
        const entryDate = new Date(e.createdAt);
        return entryDate.getFullYear() === year &&
            entryDate.getMonth() === month &&
            entryDate.getDate() === day;
    });

    const newDailyCounter = entriesToday.length + 1;
    const formattedMonth = (month + 1).toString().padStart(2, '0');
    const formattedDay = day.toString().padStart(2, '0');

    const newSerialNumber = `${formattedMonth}${formattedDay}-${newDailyCounter.toString().padStart(3, '0')}`;

    const newEntryData: Entry = {
        ...entry,
        id: createId(),
        serialNumber: newSerialNumber,
        createdAt: today,
        items: entry.items.map((item, index) => ({ ...item, id: createId(), subSerialNumber: index + 1, subTotal: 0, invoiceId: null, supplierInvoiceId: null })),
        lastSubSerialNumber: entry.items.length,
    };
    entries.push(newEntryData);
    _updateEntryStatus(newEntryData.id);
    const supplierName = suppliers.find(s => s.id === newEntryData.supplierId)?.supplierName || 'N/A';
    addAuditLog({ actorId: actor.id, actorName: actor.name, action: AuditAction.Create, feature: Feature.Entries, description: `Created entry ${newEntryData.serialNumber} for supplier '${supplierName}' with ${newEntryData.items.length} item(s).` });
    return simulateDelay(newEntryData);
};

export const updateEntry = (updatedEntry: Omit<Entry, 'serialNumber' | 'createdAt'>, actor: Actor): Promise<Entry> => {
    const index = entries.findIndex(e => e.id === updatedEntry.id);
    if (index !== -1) {
        const originalEntry = { ...entries[index] };

        // --- Detailed Audit Logging ---
        let description = `Updated entry ${originalEntry.serialNumber}.`;

        const soldItemsChanges: string[] = [];
        updatedEntry.items.forEach(updatedItem => {
            const originalItem = originalEntry.items.find(i => i.id === updatedItem.id);
            if (updatedItem.buyerId && (!originalItem || !originalItem.buyerId || originalItem.buyerId !== updatedItem.buyerId || originalItem.subTotal !== updatedItem.subTotal)) {
                const productName = products.find(p => p.id === updatedItem.productId)?.displayName || 'product';
                const buyerName = buyers.find(b => b.id === updatedItem.buyerId)?.buyerName || 'a buyer';
                soldItemsChanges.push(`Sold '${productName}' (Qty: ${updatedItem.quantity}) to '${buyerName}' for ${formatCurrency(updatedItem.subTotal)}`);
            }
        });

        if (soldItemsChanges.length > 0) {
            description = soldItemsChanges.join('; ') + ` in entry ${originalEntry.serialNumber}.`;
            addAuditLog({ actorId: actor.id, actorName: actor.name, action: AuditAction.Update, feature: Feature.Auction, description });
        }
        // --- End Audit Logging ---

        const isAuctioned = originalEntry.items.some(i => !!i.buyerId) || updatedEntry.items.some(i => !!i.buyerId);

        let finalItems: EntryItem[];
        let newLastSubSerialNumber = originalEntry.lastSubSerialNumber;

        if (!isAuctioned) {
            // Pre-auction: re-order everything based on the incoming item list order.
            finalItems = updatedEntry.items.map((item, idx) => ({
                ...item,
                id: item.id && !item.id.startsWith("temp_") ? item.id : createId(),
                subSerialNumber: idx + 1,
            }));
            newLastSubSerialNumber = finalItems.length;
        } else {
            // Auction/Post-auction: preserve existing numbers, add new ones for new items.
            const originalItemsMap = new Map(originalEntry.items.map(i => [i.id, i]));
            finalItems = updatedEntry.items.map(item => {
                const originalItem = originalItemsMap.get(item.id);
                if (originalItem) {
                    // Existing item, preserve its subSerialNumber.
                    return { ...item, subSerialNumber: originalItem.subSerialNumber };
                } else {
                    // New item added during auction.
                    newLastSubSerialNumber++;
                    return {
                        ...item,
                        id: createId(),
                        subSerialNumber: newLastSubSerialNumber,
                    };
                }
            });
        }

        entries[index] = {
            ...originalEntry,
            ...updatedEntry,
            items: finalItems,
            lastSubSerialNumber: newLastSubSerialNumber,
        };
        _updateEntryStatus(updatedEntry.id);
        return simulateDelay(entries[index]);
    }
    return Promise.reject(new Error('Entry not found'));
}

export const deleteEntry = (entryId: string, actor: Actor): Promise<{ id: string }> => {
    const entryToDelete = entries.find(e => e.id === entryId);
    if (entryToDelete) {
        if (entryToDelete.items.some(item => item.buyerId != null || item.ratePerQuantity != null)) {
            return Promise.reject(new Error('Cannot delete an entry that has one or more auctioned items.'));
        }
        addAuditLog({ actorId: actor.id, actorName: actor.name, action: AuditAction.Delete, feature: Feature.Entries, description: `Deleted entry ${entryToDelete.serialNumber}.` });
        entries = entries.filter(e => e.id !== entryId);
    }
    return simulateDelay({ id: entryId });
};

// --- BUYER INVOICE API ---

export const fetchAllInvoices = (): Promise<Invoice[]> => simulateDelay(invoices);
export const fetchInvoice = (invoiceId: string): Promise<Invoice | null> => simulateDelay(invoices.find(inv => inv.id === invoiceId) || null);

export const fetchDraftItemsForBuyer = (buyerId: string): Promise<(EntryItem & { entryId: string, entrySerialNumber: string, supplierId: string })[]> => {
    const draftItems: (EntryItem & { entryId: string, entrySerialNumber: string, supplierId: string })[] = [];
    entries.forEach(entry => {
        // Look through all non-cancelled entries. An item is available for a buyer invoice
        // regardless of whether the supplier invoice has been generated.
        if (entry.status !== EntryStatus.Cancelled) {
            entry.items.forEach(item => {
                // An item is draft if it's sold to this buyer but not yet on a buyer invoice.
                if (item.buyerId === buyerId && !item.invoiceId) {
                    draftItems.push({ ...item, entryId: entry.id, entrySerialNumber: entry.serialNumber, supplierId: entry.supplierId });
                }
            });
        }
    });
    return simulateDelay(draftItems);
};

export const changeBuyerForItem = (itemId: string, newBuyerId: string, actor: Actor): Promise<EntryItem> => {
    const entry = entries.find(e => e.items.some(i => i.id === itemId));
    const newBuyer = buyers.find(b => b.id === newBuyerId);

    if (!entry || !newBuyer) {
        return Promise.reject(new Error('Entry or new Buyer not found.'));
    }

    const itemIndex = entry.items.findIndex(i => i.id === itemId);
    if (itemIndex === -1) {
        return Promise.reject(new Error('Item not found in entry.'));
    }

    const originalItem = entry.items[itemIndex];
    const originalBuyer = buyers.find(b => b.id === originalItem.buyerId);

    if (originalItem.invoiceId) {
        return Promise.reject(new Error('Cannot change buyer for an item that is already invoiced.'));
    }

    entry.items[itemIndex].buyerId = newBuyerId;

    const productName = products.find(p => p.id === originalItem.productId)?.displayName || 'Unknown';
    const description = `Changed buyer for item '${productName}' (Entry: ${entry.serialNumber}) from '${originalBuyer?.buyerName || 'Unassigned'}' to '${newBuyer.buyerName}'.`;
    addAuditLog({ actorId: actor.id, actorName: actor.name, action: AuditAction.Update, feature: Feature.Auction, description });

    return simulateDelay(entry.items[itemIndex]);
};


export const fetchInvoicesForBuyer = (buyerId: string): Promise<Invoice[]> => {
    const buyerInvoices = invoices.filter(inv => inv.buyerId === buyerId).sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    return simulateDelay(buyerInvoices);
};

export const addInvoice = (invoiceData: Omit<Invoice, 'id' | 'invoiceNumber' | 'createdAt'>, actor: Actor): Promise<Invoice> => {
    const today = new Date();

    const invoicesToday = invoices.filter(inv => {
        const invDate = new Date(inv.createdAt);
        return invDate.getFullYear() === today.getFullYear() &&
            invDate.getMonth() === today.getMonth() &&
            invDate.getDate() === today.getDate();
    });

    const newDailyCounter = invoicesToday.length + 1;
    const formattedYear = today.getFullYear();
    const formattedMonth = (today.getMonth() + 1).toString().padStart(2, '0');
    const formattedDay = today.getDate().toString().padStart(3, '0');
    const newInvoiceNumber = `BI-${formattedYear}${formattedMonth}${formattedDay}-${newDailyCounter.toString().padStart(3, '0')}`;

    const newInvoice: Invoice = {
        ...invoiceData,
        id: createId(),
        invoiceNumber: newInvoiceNumber,
        createdAt: today,
    };
    invoices.push(newInvoice);
    const finalAmount = newInvoice.nettAmount - (newInvoice.discount || 0);
    const buyerName = buyers.find(b => b.id === newInvoice.buyerId)?.buyerName || 'N/A';
    addAuditLog({ actorId: actor.id, actorName: actor.name, action: AuditAction.Create, feature: Feature.BuyerInvoices, description: `Created buyer invoice ${newInvoice.invoiceNumber} for '${buyerName}' with ${newInvoice.items.length} item(s). Total: ${formatCurrency(finalAmount)}.` });

    const entryIds = new Set<string>();
    newInvoice.items.forEach(invoiceItem => {
        const entry = entries.find(e => e.items.some(i => i.id === invoiceItem.id));
        if (entry) {
            const itemIndex = entry.items.findIndex(i => i.id === invoiceItem.id);
            if (itemIndex !== -1) {
                // Just link the item to the new invoice.
                // Financial details are considered final after auction and should not be modified here.
                entry.items[itemIndex].invoiceId = newInvoice.id;
                entryIds.add(entry.id);
            }
        }
    });

    entryIds.forEach(entryId => {
        _updateEntryStatus(entryId);
    });

    return simulateDelay(newInvoice);
};


export const updateInvoice = (updatedInvoice: Invoice, actor: Actor): Promise<Invoice> => {
    const index = invoices.findIndex(inv => inv.id === updatedInvoice.id);
    if (index === -1) {
        return Promise.reject(new Error('Invoice not found'));
    }
    const finalAmount = updatedInvoice.nettAmount - (updatedInvoice.discount || 0);
    addAuditLog({ actorId: actor.id, actorName: actor.name, action: AuditAction.Update, feature: Feature.BuyerInvoices, description: `Updated buyer invoice ${updatedInvoice.invoiceNumber}. Total: ${formatCurrency(finalAmount)}, Paid: ${formatCurrency(updatedInvoice.paidAmount)}.` });

    const originalItemIds = new Set(invoices[index].items.map(i => i.id));
    const updatedItemIds = new Set(updatedInvoice.items.map(i => i.id));

    const itemsThatWereRemoved = [...originalItemIds].filter(id => !updatedItemIds.has(id));

    const allItemIdsInvolved = new Set([...originalItemIds, ...updatedItemIds]);
    const affectedEntryIds = new Set<string>();

    allItemIdsInvolved.forEach(itemId => {
        const entry = entries.find(e => e.items.some(i => i.id === itemId));
        if (entry) {
            affectedEntryIds.add(entry.id);
            const itemIndex = entry.items.findIndex(i => i.id === itemId);
            if (itemIndex > -1) {
                if (itemsThatWereRemoved.includes(itemId)) {
                    // Unlink item from invoice
                    entry.items[itemIndex].invoiceId = null;
                } else {
                    // Link item to invoice.
                    // Financial details are considered final after auction and should not be modified here.
                    entry.items[itemIndex].invoiceId = updatedInvoice.id;
                }
            }
        }
    });

    affectedEntryIds.forEach(entryId => {
        _updateEntryStatus(entryId);
    });

    invoices[index] = updatedInvoice;

    return simulateDelay(updatedInvoice);
};


export const deleteInvoice = (invoiceId: string, actor: Actor): Promise<{ id: string }> => {
    const index = invoices.findIndex(inv => inv.id === invoiceId);
    if (index !== -1) {
        const invoiceToDelete = invoices[index];
        const buyerName = buyers.find(b => b.id === invoiceToDelete.buyerId)?.buyerName || 'N/A';
        addAuditLog({ actorId: actor.id, actorName: actor.name, action: AuditAction.Delete, feature: Feature.BuyerInvoices, description: `Deleted buyer invoice ${invoiceToDelete.invoiceNumber} for '${buyerName}'.` });

        // Unlink associated cash flow transactions, but do not delete them
        cashFlowTransactions.forEach(t => {
            if (t.relatedInvoiceIds?.includes(invoiceId)) {
                t.relatedInvoiceIds = t.relatedInvoiceIds.filter(id => id !== invoiceId);
            }
        });

        const affectedEntryIds = new Set<string>();
        invoiceToDelete.items.forEach(invoiceItem => {
            const entry = entries.find(e => e.items.some(i => i.id === invoiceItem.id));
            if (entry) {
                const itemIndex = entry.items.findIndex(i => i.id === invoiceItem.id);
                if (itemIndex > -1) {
                    entry.items[itemIndex].invoiceId = null;
                    affectedEntryIds.add(entry.id);
                }
            }
        });

        affectedEntryIds.forEach(entryId => {
            _updateEntryStatus(entryId);
        });

        invoices = invoices.filter(inv => inv.id !== invoiceId);
        return simulateDelay({ id: invoiceId });
    }
    return Promise.reject(new Error('Invoice not found'));
}

// --- SUPPLIER INVOICE API ---

export const fetchUninvoicedEntriesForSupplier = (supplierId: string): Promise<Entry[]> => {
    const supplierEntries = entries.filter(e => e.supplierId === supplierId);
    const uninvoicedEntries = supplierEntries.filter(e => {
        return e.status !== EntryStatus.Invoiced && e.items.some(item => !!item.buyerId && !item.supplierInvoiceId);
    }).map(e => {
        return {
            ...e,
            items: e.items.filter(item => !!item.buyerId && !item.supplierInvoiceId)
        };
    });
    return simulateDelay(uninvoicedEntries);
};

export const fetchSupplierInvoicesForSupplier = (supplierId: string): Promise<SupplierInvoice[]> => {
    const invoices = supplierInvoices.filter(si => si.supplierId === supplierId);
    return simulateDelay(invoices);
};

export const fetchSupplierInvoice = (invoiceId: string): Promise<SupplierInvoice | null> => {
    const invoice = supplierInvoices.find(si => si.id === invoiceId);
    return simulateDelay(invoice || null);
};

export const addSupplierInvoice = (invoiceData: Omit<SupplierInvoice, 'id' | 'invoiceNumber' | 'createdAt'>, actor: Actor): Promise<SupplierInvoice> => {
    const today = new Date();

    const invoicesToday = supplierInvoices.filter(inv => {
        const invDate = new Date(inv.createdAt);
        return invDate.getFullYear() === today.getFullYear() &&
            invDate.getMonth() === today.getMonth() &&
            invDate.getDate() === today.getDate();
    });

    const newDailyCounter = invoicesToday.length + 1;
    const formattedYear = today.getFullYear();
    const formattedMonth = (today.getMonth() + 1).toString().padStart(2, '0');
    const formattedDay = today.getDate().toString().padStart(3, '0');
    const newInvoiceNumber = `SI-${formattedYear}${formattedMonth}${formattedDay}-${newDailyCounter.toString().padStart(3, '0')}`;

    const newInvoice: SupplierInvoice = {
        ...invoiceData,
        id: createId(),
        invoiceNumber: newInvoiceNumber,
        createdAt: today,
    };
    const supplierName = suppliers.find(s => s.id === newInvoice.supplierId)?.supplierName || 'N/A';
    addAuditLog({ actorId: actor.id, actorName: actor.name, action: AuditAction.Create, feature: Feature.SupplierInvoices, description: `Created supplier invoice ${newInvoice.invoiceNumber} for '${supplierName}'. Nett Payable: ${formatCurrency(newInvoice.nettAmount)}.` });

    // Find and apply advance payments linked to the entries of this invoice
    const advancePayments = cashFlowTransactions.filter(t =>
        t.type === TransactionType.Expense &&
        t.category === ExpenseCategory.AdvancePayment &&
        t.relatedEntryIds &&
        // This logic assumes an advance payment transaction is for a set of entries that will all be on the same final invoice.
        t.relatedEntryIds.every(eid => newInvoice.entryIds.includes(eid))
    );

    const totalAdvance = advancePayments.reduce((sum, t) => sum + t.amount, 0);
    newInvoice.advancePaid = totalAdvance;
    // Note: The total `paidAmount` (including this advance) will be correctly calculated by the `recalculateBalances` function, which runs after every API call.

    supplierInvoices.push(newInvoice);

    newInvoice.entryIds.forEach(entryId => {
        const entry = entries.find(e => e.id === entryId);
        if (entry) {
            entry.items.forEach(item => {
                // Mark ALL items from the entry as invoiced, not just sold ones.
                item.supplierInvoiceId = newInvoice.id;
            });
            _updateEntryStatus(entryId);
        }
    });

    return simulateDelay(newInvoice);
};


export const updateSupplierInvoice = (updatedInvoice: SupplierInvoice, actor: Actor): Promise<SupplierInvoice> => {
    const index = supplierInvoices.findIndex(inv => inv.id === updatedInvoice.id);
    if (index === -1) {
        return Promise.reject(new Error('Supplier invoice not found'));
    }
    addAuditLog({ actorId: actor.id, actorName: actor.name, action: AuditAction.Update, feature: Feature.SupplierInvoices, description: `Updated supplier invoice ${updatedInvoice.invoiceNumber}. Nett Payable: ${formatCurrency(updatedInvoice.nettAmount)}, Paid: ${formatCurrency(updatedInvoice.paidAmount)}.` });
    supplierInvoices[index] = updatedInvoice;
    return simulateDelay(updatedInvoice);
}

export const deleteSupplierInvoice = (invoiceId: string, actor: Actor): Promise<{ id: string }> => {
    const index = supplierInvoices.findIndex(inv => inv.id === invoiceId);
    if (index !== -1) {
        const invoiceToDelete = supplierInvoices[index];
        const supplierName = suppliers.find(s => s.id === invoiceToDelete.supplierId)?.supplierName || 'N/A';
        addAuditLog({ actorId: actor.id, actorName: actor.name, action: AuditAction.Delete, feature: Feature.SupplierInvoices, description: `Deleted supplier invoice ${invoiceToDelete.invoiceNumber} for '${supplierName}'.` });

        // Unlink associated cash flow transactions, but do not delete them
        cashFlowTransactions.forEach(t => {
            if (t.relatedInvoiceIds?.includes(invoiceId)) {
                t.relatedInvoiceIds = t.relatedInvoiceIds.filter(id => id !== invoiceId);
            }
        });

        invoiceToDelete.entryIds.forEach(entryId => {
            const entry = entries.find(e => e.id === entryId);
            if (entry) {
                entry.items.forEach(item => {
                    if (item.supplierInvoiceId === invoiceId) {
                        item.supplierInvoiceId = null;
                    }
                });
                _updateEntryStatus(entryId);
            }
        });

        supplierInvoices = supplierInvoices.filter(inv => inv.id !== invoiceId);
        return simulateDelay({ id: invoiceId });
    }
    return Promise.reject(new Error('Supplier invoice not found'));
}

// --- CASH FLOW API ---

export const fetchCashFlowTransactions = (startDate?: string, endDate?: string): Promise<{ transactions: CashFlowTransaction[], openingBalance: number }> => {
    // 1. Calculate Opening Balance (carry forward)
    let openingBalance = 0;
    if (startDate) {
        const startOfPeriod = new Date(startDate);
        startOfPeriod.setHours(0, 0, 0, 0);

        const priorTransactions = cashFlowTransactions.filter(t => new Date(t.date) < startOfPeriod);

        openingBalance = priorTransactions.reduce((acc, t) => {
            if (t.type === TransactionType.Income) {
                // Income adds to the balance
                return acc + t.amount;
            } else { // Expense
                // Expense subtracts from the balance
                return acc - t.amount;
            }
        }, 0);
    }

    // 2. Filter transactions for the specified period
    let transactionsInPeriod = cashFlowTransactions;
    if (startDate) {
        const start = new Date(startDate);
        start.setHours(0, 0, 0, 0);
        transactionsInPeriod = transactionsInPeriod.filter(t => new Date(t.date) >= start);
    }
    if (endDate) {
        const end = new Date(endDate);
        end.setHours(23, 59, 59, 999);
        transactionsInPeriod = transactionsInPeriod.filter(t => new Date(t.date) <= end);
    }

    const sortedTransactions = [...transactionsInPeriod].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

    // 3. Return both transactions and the opening balance
    return simulateDelay({ transactions: sortedTransactions, openingBalance });
};

export const addIncome = (data: Omit<CashFlowTransaction, 'id' | 'date' | 'type' | 'category'>, actor: Actor): Promise<CashFlowTransaction> => {
    const buyer = buyers.find(b => b.id === data.entityId);
    if (!buyer && data.entityId) return Promise.reject(new Error("Buyer not found"));

    // Automatically associate payment with oldest unpaid invoices if not specified.
    if (data.entityId && (!data.relatedInvoiceIds || data.relatedInvoiceIds.length === 0)) {
        const unpaidInvoices = invoices
            .filter(inv => inv.buyerId === data.entityId && ((inv.nettAmount - (inv.discount || 0) - inv.paidAmount) > 0.01))
            .sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());

        if (unpaidInvoices.length > 0) {
            const totalReceivable = unpaidInvoices.reduce((sum, inv) => sum + (inv.nettAmount - (inv.discount || 0) - inv.paidAmount), 0);
            const paymentValue = (data.amount || 0) + (data.discount || 0);

            if (paymentValue > totalReceivable && Math.abs(paymentValue - totalReceivable) > 0.01) {
                return Promise.reject(new Error(`Payment amount (${formatCurrency(paymentValue)}) exceeds total receivable amount (${formatCurrency(totalReceivable)}). To record an advance payment, please ensure all existing buyer dues are cleared.`));
            }

            let amountToApply = paymentValue;
            const affectedInvoiceIds: string[] = [];
            for (const invoice of unpaidInvoices) {
                if (amountToApply <= 0) break;
                const invoiceBalance = (invoice.nettAmount - (invoice.discount || 0)) - invoice.paidAmount;
                if (invoiceBalance > 0) {
                    const paymentForThisInvoice = Math.min(amountToApply, invoiceBalance);
                    amountToApply -= paymentForThisInvoice;
                    affectedInvoiceIds.push(invoice.id);
                }
            }
            data.relatedInvoiceIds = affectedInvoiceIds;
        }
    }

    const description = data.description || `Payment from ${data.entityName}`;
    const newTransaction: CashFlowTransaction = { ...data, id: createId(), date: new Date(), type: TransactionType.Income, category: null, description };
    cashFlowTransactions.push(newTransaction);

    const descParts = [];
    if (newTransaction.amount > 0) descParts.push(`amount of ${formatCurrency(newTransaction.amount)}`);
    if (newTransaction.discount && newTransaction.discount > 0) descParts.push(`discount of ${formatCurrency(newTransaction.discount)}`);
    const auditDescription = `Recorded income (${descParts.join(' and ')}) from '${newTransaction.entityName}' via ${newTransaction.method}.`;
    addAuditLog({ actorId: actor.id, actorName: actor.name, action: AuditAction.Create, feature: Feature.CashFlow, description: auditDescription });

    return simulateDelay(newTransaction);
};

export const addSupplierPayment = (data: Omit<CashFlowTransaction, 'id' | 'date' | 'type'>, actor: Actor): Promise<CashFlowTransaction> => {
    const supplier = suppliers.find(s => s.id === data.entityId);
    if (!supplier) return Promise.reject(new Error("Supplier not found"));

    let finalCategory = data.category;
    const isAdvance = data.category === ExpenseCategory.SupplierPayment && data.relatedEntryIds && data.relatedEntryIds.length > 0 && (!data.relatedInvoiceIds || data.relatedInvoiceIds.length === 0);

    if (isAdvance) {
        finalCategory = ExpenseCategory.AdvancePayment;
    }

    if (data.category === ExpenseCategory.SupplierPayment && !isAdvance && data.entityId && (!data.relatedInvoiceIds || data.relatedInvoiceIds.length === 0) && !data.relatedEntryIds) {
        const unpaidInvoices = supplierInvoices
            .filter(inv => inv.supplierId === data.entityId && inv.status !== SupplierInvoiceStatus.Paid)
            .sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());

        if (unpaidInvoices.length > 0) {
            const totalInvoicedPayable = unpaidInvoices.reduce((sum, inv) => sum + (inv.nettAmount - inv.paidAmount), 0);
            if (data.amount > totalInvoicedPayable && Math.abs(data.amount - totalInvoicedPayable) > 0.01) {
                return Promise.reject(new Error(`Payment amount (${formatCurrency(data.amount)}) exceeds total invoiced payable amount (${formatCurrency(totalInvoicedPayable)}). To make an advance payment while dues exist, please do so from the Supplier Invoices page.`));
            }

            let amountToApply = data.amount;
            const affectedInvoiceIds: string[] = [];
            for (const invoice of unpaidInvoices) {
                if (amountToApply <= 0) break;
                const invoiceBalance = invoice.nettAmount - invoice.paidAmount;
                if (invoiceBalance > 0) {
                    const paymentForThisInvoice = Math.min(amountToApply, invoiceBalance);
                    amountToApply -= paymentForThisInvoice;
                    affectedInvoiceIds.push(invoice.id);
                }
            }
            data.relatedInvoiceIds = affectedInvoiceIds;
        }
    }

    let description = data.description;
    if (!description) {
        if (data.relatedInvoiceIds && data.relatedInvoiceIds.length > 0) {
            const invNumbers = data.relatedInvoiceIds.map(id => supplierInvoices.find(i => i.id === id)?.invoiceNumber).filter(Boolean).join(', ');
            description = `Payment for Invoice(s): ${invNumbers}`;
        } else if (data.relatedEntryIds && data.relatedEntryIds.length > 0) {
            const entryNumbers = data.relatedEntryIds.map(id => entries.find(e => e.id === id)?.serialNumber).filter(Boolean).join(', ');
            description = `Advance for Entry(s): ${entryNumbers}`;
        } else {
            description = `Payment to ${data.entityName}`;
        }
    }

    const newTransaction: CashFlowTransaction = { ...data, id: createId(), date: new Date(), type: TransactionType.Expense, category: finalCategory, description };
    cashFlowTransactions.push(newTransaction);

    const auditDescription = isAdvance
        ? `Recorded advance payment of ${formatCurrency(newTransaction.amount)} to '${newTransaction.entityName}' for Entry(s): ${(data.relatedEntryIds || []).map(id => entries.find(e => e.id === id)?.serialNumber).filter(Boolean).join(', ')}.`
        : `Recorded supplier payment of ${formatCurrency(newTransaction.amount)} to '${newTransaction.entityName}' (Method: ${newTransaction.method}).`;
    addAuditLog({ actorId: actor.id, actorName: actor.name, action: AuditAction.Create, feature: Feature.CashFlow, description: auditDescription });

    return simulateDelay(newTransaction);
};

export const addOtherExpense = (data: Omit<CashFlowTransaction, 'id' | 'date' | 'type' | 'entityId'>, actor: Actor): Promise<CashFlowTransaction> => {
    const description = data.description || data.entityName;
    const newTransaction: CashFlowTransaction = {
        ...data,
        id: createId(),
        date: new Date(),
        type: TransactionType.Expense,
        category: ExpenseCategory.Other,
        entityId: null,
        description,
    };
    cashFlowTransactions.push(newTransaction);
    addAuditLog({ actorId: actor.id, actorName: actor.name, action: AuditAction.Create, feature: Feature.CashFlow, description: `Recorded other expense of ${formatCurrency(newTransaction.amount)} for '${newTransaction.entityName}' (Method: ${newTransaction.method}).` });
    return simulateDelay(newTransaction);
};

export const updateCashFlowTransaction = (updatedTransaction: CashFlowTransaction, actor: Actor): Promise<CashFlowTransaction> => {
    const index = cashFlowTransactions.findIndex(t => t.id === updatedTransaction.id);
    if (index === -1) {
        return Promise.reject(new Error('Transaction not found.'));
    }
    const originalTransaction = cashFlowTransactions[index];

    const changes: string[] = [];
    if (new Date(originalTransaction.date).toISOString().split('T')[0] !== new Date(updatedTransaction.date).toISOString().split('T')[0]) changes.push(`date to ${getISODateString(new Date(updatedTransaction.date))}`);
    if (originalTransaction.amount !== updatedTransaction.amount) changes.push(`amount from ${formatCurrency(originalTransaction.amount)} to ${formatCurrency(updatedTransaction.amount)}`);
    if ((originalTransaction.discount || 0) !== (updatedTransaction.discount || 0)) changes.push(`discount to ${formatCurrency(updatedTransaction.discount || 0)}`);
    if (originalTransaction.method !== updatedTransaction.method) changes.push(`method to ${updatedTransaction.method}`);
    if (originalTransaction.entityName !== updatedTransaction.entityName && updatedTransaction.category === ExpenseCategory.Other) changes.push(`expense name to '${updatedTransaction.entityName}'`);
    if (originalTransaction.description !== updatedTransaction.description) changes.push(`description`);

    if (changes.length > 0) {
        const description = `Updated transaction for '${originalTransaction.entityName}': changed ${changes.join(', ')}.`;
        addAuditLog({ actorId: actor.id, actorName: actor.name, action: AuditAction.Update, feature: Feature.CashFlow, description });
    }

    cashFlowTransactions[index] = { ...originalTransaction, ...updatedTransaction };

    return simulateDelay(cashFlowTransactions[index]);
};

export const deleteCashFlowTransaction = (transactionId: string, actor: Actor): Promise<{ id: string }> => {
    const transactionIndex = cashFlowTransactions.findIndex(t => t.id === transactionId);
    if (transactionIndex === -1) {
        return Promise.reject(new Error('Transaction not found.'));
    }

    const transactionToDelete = cashFlowTransactions[transactionIndex];
    const description = `Deleted transaction: ${transactionToDelete.type} of ${formatCurrency(transactionToDelete.amount)} for '${transactionToDelete.entityName}' dated ${getISODateString(new Date(transactionToDelete.date))}.`;
    addAuditLog({ actorId: actor.id, actorName: actor.name, action: AuditAction.Delete, feature: Feature.CashFlow, description });

    cashFlowTransactions.splice(transactionIndex, 1);

    // The recalculateBalances function, which is called by simulateDelay, will automatically reverse the effects of the deleted transaction.
    return simulateDelay({ id: transactionId });
};

// --- NEW ANALYTICS APIS ---
export const fetchDashboardData = (): Promise<DashboardData> => {
    recalculateBalances();
    const today = new Date();
    const todayStr = getISODateString(today);

    // New Calculations
    const todayAuctionValue = entries
        .filter(entry => getISODateString(new Date(entry.createdAt)) === todayStr)
        .flatMap(entry => entry.items)
        .filter(item => !!item.buyerId)
        .reduce((sum, item) => sum + item.subTotal, 0);

    const todayEntriesCount = entries.filter(entry => getISODateString(new Date(entry.createdAt)) === todayStr).length;

    const uninvoicedAuctionValue = entries
        .flatMap(entry => entry.items)
        .filter(item => !!item.buyerId && !item.invoiceId)
        .reduce((sum, item) => sum + item.subTotal, 0);

    const entryStatusMap = new Map<string, number>();
    entries.forEach(entry => {
        entryStatusMap.set(entry.status, (entryStatusMap.get(entry.status) || 0) + 1);
    });
    const entryStatusDistribution = Array.from(entryStatusMap.entries())
        .map(([name, value]) => ({ name, value }))
        .filter(item => item.value > 0);

    const unInvoicedBuyersMap = new Map<string, { buyerName: string, totalAmount: number, totalItemCount: number, entries: Map<string, { entrySerialNumber: string, itemCount: number, amount: number }> }>();
    entries.forEach(entry => {
        entry.items.forEach(item => {
            if (item.buyerId && !item.invoiceId) {
                const buyer = buyers.find(b => b.id === item.buyerId);
                if (buyer) {
                    if (!unInvoicedBuyersMap.has(buyer.id)) {
                        unInvoicedBuyersMap.set(buyer.id, {
                            buyerName: buyer.buyerName,
                            totalAmount: 0,
                            totalItemCount: 0,
                            entries: new Map(),
                        });
                    }
                    const buyerRecord = unInvoicedBuyersMap.get(buyer.id)!;

                    buyerRecord.totalAmount += item.subTotal;
                    buyerRecord.totalItemCount += 1;

                    if (!buyerRecord.entries.has(entry.id)) {
                        buyerRecord.entries.set(entry.id, {
                            entrySerialNumber: entry.serialNumber,
                            itemCount: 0,
                            amount: 0,
                        });
                    }
                    const entryRecord = buyerRecord.entries.get(entry.id)!;

                    entryRecord.itemCount += 1;
                    entryRecord.amount += item.subTotal;
                }
            }
        });
    });

    const unInvoicedBuyersWithEntries: UninvoicedBuyerWithEntries[] = Array.from(unInvoicedBuyersMap.entries()).map(([buyerId, data]) => ({
        buyerId,
        buyerName: data.buyerName,
        totalAmount: data.totalAmount,
        totalItemCount: data.totalItemCount,
        entries: Array.from(data.entries.entries()).map(([entryId, entryData]) => ({
            entryId,
            ...entryData
        })).sort((a, b) => a.entrySerialNumber.localeCompare(b.entrySerialNumber)),
    })).sort((a, b) => b.totalAmount - a.totalAmount);


    // KPIs
    const kpis = {
        totalReceivables: buyers.reduce((sum, b) => sum + (b.outstanding > 0 ? b.outstanding : 0), 0),
        totalPayables: Math.abs(suppliers.reduce((sum, s) => sum + (s.outstanding < 0 ? s.outstanding : 0), 0)),
        todayCommission: supplierInvoices.filter(si => getISODateString(new Date(si.createdAt)) === todayStr)
            .reduce((sum, si) => sum + si.commissionAmount, 0),
        todayAuctionValue,
        todayEntriesCount,
        uninvoicedAuctionValue,
    };

    // Cash Flow Chart (last 30 days)
    const cashFlowMap = new Map<string, { income: number, expense: number }>();
    for (let i = 29; i >= 0; i--) {
        const date = new Date();
        date.setDate(today.getDate() - i);
        cashFlowMap.set(getISODateString(date), { income: 0, expense: 0 });
    }
    cashFlowTransactions.forEach(t => {
        const dateStr = getISODateString(new Date(t.date));
        if (cashFlowMap.has(dateStr)) {
            const day = cashFlowMap.get(dateStr)!;
            if (t.type === TransactionType.Income) day.income += t.amount;
            else day.expense += t.amount;
        }
    });
    const cashFlowChart = Array.from(cashFlowMap.entries()).map(([date, values]) => ({ date, ...values }));

    // Top Products
    const productSales = new Map<string, number>();
    invoices.forEach(inv => inv.items.forEach(item => {
        productSales.set(item.productId, (productSales.get(item.productId) || 0) + item.subTotal);
    }));
    const topProducts = Array.from(productSales.entries())
        .map(([productId, value]) => ({
            id: productId,
            name: products.find(p => p.id === productId)?.displayName || 'Unknown',
            value
        }))
        .sort((a, b) => b.value - a.value)
        .slice(0, 5);

    // Sales by Buyer
    const buyerSales = new Map<string, number>();
    invoices.forEach(inv => {
        buyerSales.set(inv.buyerId, (buyerSales.get(inv.buyerId) || 0) + (inv.nettAmount - (inv.discount || 0)));
    });
    const topBuyers = Array.from(buyerSales.entries())
        .map(([buyerId, value]) => ({
            id: buyerId,
            name: buyers.find(b => b.id === buyerId)?.buyerName || 'Unknown',
            value
        }))
        .sort((a, b) => b.value - a.value);

    // Expense Breakdown
    const expenseBreakdown = new Map<string, number>();
    cashFlowTransactions.filter(t => t.type === TransactionType.Expense).forEach(t => {
        const category = t.category || ExpenseCategory.Other;
        expenseBreakdown.set(category, (expenseBreakdown.get(category) || 0) + t.amount);
    });
    const topExpenses = Array.from(expenseBreakdown.entries()).map(([name, value]) => ({ name, value }));

    // Lists
    const latestTransactions = [...cashFlowTransactions].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()).slice(0, 5);
    const pendingEntries = entries.filter(e => e.status === EntryStatus.Pending).slice(0, 5);

    // New Analytics
    const topBuyersByOutstanding = [...buyers]
        .filter(b => b.outstanding > 0)
        .sort((a, b) => b.outstanding - a.outstanding)
        .slice(0, 5)
        .map(b => ({ id: b.id, name: b.buyerName, value: b.outstanding }));

    const topSuppliersByPayable = [...suppliers]
        .filter(s => s.outstanding < 0)
        .sort((a, b) => a.outstanding - b.outstanding)
        .slice(0, 5)
        .map(s => ({ id: s.id, name: s.supplierName, value: Math.abs(s.outstanding) }));

    const dashboardData: DashboardData = {
        kpis,
        entryStatusDistribution,
        cashFlowChart,
        topProducts,
        salesByBuyer: topBuyers,
        expenseBreakdown: topExpenses,
        latestTransactions,
        pendingEntries,
        unInvoicedBuyersWithEntries,
        topBuyersByOutstanding,
        topSuppliersByPayable,
    };

    return simulateDelay(dashboardData);
}

const filterByDate = (items: (Invoice | SupplierInvoice | CashFlowTransaction)[], startDate?: string, endDate?: string) => {
    let filtered = items;
    if (items.length === 0) return [];
    const dateField = 'createdAt' in items[0] ? 'createdAt' : 'date';

    if (startDate) {
        const start = new Date(startDate);
        start.setHours(0, 0, 0, 0);
        filtered = filtered.filter(i => new Date((i as any)[dateField]) >= start);
    }
    if (endDate) {
        const end = new Date(endDate);
        end.setHours(23, 59, 59, 999);
        filtered = filtered.filter(i => new Date((i as any)[dateField]) <= end);
    }
    return filtered;
}

export const generateSalesReport = (filters: { startDate?: string, endDate?: string, buyerId?: string }): Promise<SalesReportData> => {
    let filteredInvoices: Invoice[] = filterByDate(invoices, filters.startDate, filters.endDate) as Invoice[];
    if (filters.buyerId) {
        filteredInvoices = filteredInvoices.filter(inv => inv.buyerId === filters.buyerId);
    }

    const reportInvoices = filteredInvoices.map(inv => {
        const buyer = buyers.find(b => b.id === inv.buyerId);
        return {
            ...inv,
            buyerName: buyer?.buyerName || 'Unknown',
            balance: inv.nettAmount - (inv.discount || 0) - inv.paidAmount
        };
    });

    const summary = {
        totalSales: filteredInvoices.reduce((sum, inv) => sum + inv.nettAmount, 0),
        totalPaid: filteredInvoices.reduce((sum, inv) => sum + inv.paidAmount, 0),
        totalBalance: reportInvoices.reduce((sum, inv) => sum + inv.balance, 0),
        invoiceCount: filteredInvoices.length,
    };

    return simulateDelay({ summary, invoices: reportInvoices });
}

export const generatePurchaseReport = (filters: { startDate?: string, endDate?: string, supplierId?: string }): Promise<PurchaseReportData> => {
    let filteredInvoices: SupplierInvoice[] = filterByDate(supplierInvoices, filters.startDate, filters.endDate) as SupplierInvoice[];
    if (filters.supplierId) {
        filteredInvoices = filteredInvoices.filter(inv => inv.supplierId === filters.supplierId);
    }

    const summary = {
        totalPurchases: filteredInvoices.reduce((sum, inv) => sum + inv.nettAmount, 0),
        totalPaid: filteredInvoices.reduce((sum, inv) => sum + inv.paidAmount, 0),
        totalBalance: 0,
        invoiceCount: filteredInvoices.length,
    };
    summary.totalBalance = summary.totalPurchases - summary.totalPaid;

    const reportInvoices = filteredInvoices.map(inv => {
        const supplier = suppliers.find(s => s.id === inv.supplierId);
        return {
            ...inv,
            supplierName: supplier?.supplierName || 'Unknown',
            balance: inv.nettAmount - inv.paidAmount
        };
    });

    return simulateDelay({ summary, invoices: reportInvoices });
}

export const generateWagesReport = (filters: { startDate?: string, endDate?: string, buyerId?: string }): Promise<WagesReportData> => {
    const { startDate, endDate, buyerId } = filters;
    let filteredInvoices = filterByDate(invoices, startDate, endDate) as Invoice[];

    if (buyerId) {
        filteredInvoices = filteredInvoices.filter(inv => inv.buyerId === buyerId);
    }

    const details: WagesReportItem[] = [];
    let totalWages = 0;

    filteredInvoices.forEach(inv => {
        if (inv.wages > 0) {
            const buyer = buyers.find(b => b.id === inv.buyerId);
            details.push({
                invoiceId: inv.id,
                invoiceNumber: inv.invoiceNumber,
                buyerId: inv.buyerId,
                buyerName: buyer?.buyerName || 'Unknown Buyer',
                createdAt: new Date(inv.createdAt),
                wages: inv.wages,
                invoiceTotal: inv.nettAmount,
            });
            totalWages += inv.wages;
        }
    });

    const reportData: WagesReportData = {
        summary: {
            totalWages,
            invoiceCount: details.length
        },
        details
    };

    return simulateDelay(reportData);
};

export const generateSupplierWagesReport = (filters: { startDate?: string, endDate?: string, supplierId?: string }): Promise<SupplierWagesReportData> => {
    const { startDate, endDate, supplierId } = filters;
    let filteredInvoices = filterByDate(supplierInvoices, startDate, endDate) as SupplierInvoice[];

    if (supplierId) {
        filteredInvoices = filteredInvoices.filter(inv => inv.supplierId === supplierId);
    }

    const details: SupplierWagesReportItem[] = [];
    let totalWages = 0;

    filteredInvoices.forEach(inv => {
        if (inv.wages > 0) {
            const supplier = suppliers.find(s => s.id === inv.supplierId);
            details.push({
                invoiceId: inv.id,
                invoiceNumber: inv.invoiceNumber,
                supplierId: inv.supplierId,
                supplierName: supplier?.supplierName || 'Unknown Supplier',
                createdAt: new Date(inv.createdAt),
                wages: inv.wages,
                invoiceTotal: inv.nettAmount,
            });
            totalWages += inv.wages;
        }
    });

    const reportData: SupplierWagesReportData = {
        summary: {
            totalWages,
            invoiceCount: details.length
        },
        details
    };

    return simulateDelay(reportData);
};

export const generateProfitAndLoss = (filters: { startDate?: string, endDate?: string }): Promise<ProfitAndLossData> => {
    const periodSupplierInvoices = filterByDate(supplierInvoices, filters.startDate, filters.endDate) as SupplierInvoice[];
    const periodBuyerInvoices = filterByDate(invoices, filters.startDate, filters.endDate) as Invoice[];
    const periodExpenses = filterByDate(cashFlowTransactions, filters.startDate, filters.endDate) as CashFlowTransaction[];

    const totalCommission = periodSupplierInvoices.reduce((sum, inv) => sum + inv.commissionAmount, 0);

    const buyerWagesAndAdjustments = periodBuyerInvoices.reduce((sum, inv) => sum + inv.wages + (inv.adjustments > 0 ? inv.adjustments : 0), 0);
    const supplierWages = periodSupplierInvoices.reduce((sum, inv) => sum + inv.wages, 0);
    const otherRevenue = buyerWagesAndAdjustments + supplierWages;

    const totalRevenue = totalCommission + otherRevenue;

    const operatingExpenses = periodExpenses.filter(t => t.type === TransactionType.Expense && t.category === ExpenseCategory.Other).reduce((sum, t) => sum + t.amount, 0);

    const netProfit = totalRevenue - operatingExpenses;

    return simulateDelay({ totalCommission, otherRevenue, totalRevenue, operatingExpenses, netProfit });
}

export const generateLedger = (filters: { startDate?: string, endDate?: string, entityId: string, entityType: 'buyer' | 'supplier' }): Promise<LedgerReportData> => {
    const { startDate, endDate, entityId, entityType } = filters;
    const ledgerEntries: Omit<LedgerEntry, 'balance'>[] = [];
    const openingBalance = 0; // Per user request, always start from zero for the period.

    const periodTransactions = filterByDate(cashFlowTransactions, startDate, endDate) as CashFlowTransaction[];

    if (entityType === 'buyer') {
        const periodInvoices = (filterByDate(invoices, startDate, endDate) as Invoice[]).filter(i => i.buyerId === entityId);
        const periodPayments = periodTransactions.filter(t => t.entityId === entityId && t.type === TransactionType.Income);

        periodInvoices.forEach(inv => {
            ledgerEntries.push({ date: new Date(inv.createdAt), particulars: `Invoice #${inv.invoiceNumber}`, debit: inv.nettAmount, credit: 0 });
            if (inv.discount && inv.discount > 0) {
                ledgerEntries.push({ date: new Date(inv.createdAt), particulars: `Invoice Discount`, debit: 0, credit: inv.discount });
            }
        });

        periodPayments.forEach(p => {
            if (p.amount > 0) {
                const paymentParticulars = p.description || `Payment Received`;
                ledgerEntries.push({ date: new Date(p.date), particulars: paymentParticulars, debit: 0, credit: p.amount });
            }
            if (p.discount && p.discount > 0) {
                const discountParticulars = `Discount on Payment`;
                ledgerEntries.push({ date: new Date(p.date), particulars: discountParticulars, debit: 0, credit: p.discount });
            }
        });
    } else { // Supplier
        const periodInvoices = (filterByDate(supplierInvoices, startDate, endDate) as SupplierInvoice[]).filter(i => i.supplierId === entityId);
        const periodPayments = periodTransactions.filter(t => t.entityId === entityId && (t.category === ExpenseCategory.SupplierPayment || t.category === ExpenseCategory.AdvancePayment));

        periodInvoices.forEach(inv => ledgerEntries.push({ date: new Date(inv.createdAt), particulars: `Purchase #${inv.invoiceNumber}`, debit: 0, credit: inv.nettAmount }));
        periodPayments.forEach(p => ledgerEntries.push({ date: new Date(p.date), particulars: p.description || `Payment Made`, debit: p.amount, credit: 0 }));
    }

    ledgerEntries.sort((a, b) => a.date.getTime() - b.date.getTime());

    let runningBalance = openingBalance;
    const finalEntries = ledgerEntries.map(entry => {
        if (entityType === 'supplier') {
            runningBalance += entry.credit - entry.debit;
        } else {
            runningBalance += entry.debit - entry.credit;
        }
        return { ...entry, balance: runningBalance };
    });

    const entity = entityType === 'buyer' ? buyers.find(b => b.id === entityId) : suppliers.find(s => s.id === entityId);
    const trueOutstanding = entity?.outstanding || 0;

    return simulateDelay({
        entityName: (entity as Buyer)?.buyerName || (entity as Supplier)?.supplierName || 'Unknown',
        balanceBroughtForward: 0,
        outstanding: entityType === 'supplier' ? Math.abs(trueOutstanding) : trueOutstanding,
        entries: finalEntries,
        startDate: filters.startDate,
        summary: { closingBalance: runningBalance }
    });
};


export const generateBuyerBalanceSheet = (filters: { asOfDate?: string }): Promise<BuyerBalanceSheetData> => {
    const asOfDate = filters.asOfDate ? new Date(filters.asOfDate) : new Date();
    asOfDate.setHours(23, 59, 59, 999);

    const balances: BuyerBalanceSheetItem[] = buyers.map(buyer => {
        // Calculate balance as of date
        const relevantInvoices = invoices.filter(i => i.buyerId === buyer.id && new Date(i.createdAt) <= asOfDate);
        const relevantPayments = cashFlowTransactions.filter(t => t.entityId === buyer.id && t.type === TransactionType.Income && new Date(t.date) <= asOfDate);

        const totalDebit = relevantInvoices.reduce((sum, inv) => sum + (inv.nettAmount - (inv.discount || 0)), 0);
        const totalCredit = relevantPayments.reduce((sum, p) => sum + p.amount + (p.discount || 0), 0);

        const lastInvoice = relevantInvoices.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())[0];

        return {
            buyerId: buyer.id,
            buyerName: buyer.buyerName,
            contactNumber: buyer.contactNumber,
            balance: totalDebit - totalCredit,
            lastInvoiceDate: lastInvoice ? new Date(lastInvoice.createdAt) : undefined
        };
    }).filter(b => b.balance > 0.01);

    return simulateDelay({
        asOfDate: asOfDate.toISOString().split('T')[0],
        balances: balances.sort((a, b) => b.balance - a.balance)
    });
};

export const generateSupplierBalanceSheet = (filters: { asOfDate?: string }): Promise<SupplierBalanceSheetData> => {
    const asOfDate = filters.asOfDate ? new Date(filters.asOfDate) : new Date();
    asOfDate.setHours(23, 59, 59, 999);

    const balances: SupplierBalanceSheetItem[] = suppliers.map(supplier => {
        const relevantInvoices = supplierInvoices.filter(i => i.supplierId === supplier.id && new Date(i.createdAt) <= asOfDate);
        const relevantPayments = cashFlowTransactions.filter(t => t.entityId === supplier.id && (t.category === ExpenseCategory.SupplierPayment || t.category === ExpenseCategory.AdvancePayment) && new Date(t.date) <= asOfDate);

        const totalCredit = relevantInvoices.reduce((sum, inv) => sum + inv.nettAmount, 0);
        const totalDebit = relevantPayments.reduce((sum, p) => sum + p.amount, 0);

        const lastInvoice = relevantInvoices.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())[0];

        return {
            supplierId: supplier.id,
            supplierName: supplier.supplierName,
            balance: totalDebit - totalCredit, // positive is advance, negative is payable
            lastInvoiceDate: lastInvoice ? new Date(lastInvoice.createdAt) : undefined
        };
    }).filter(s => s.balance < -0.01); // Only show payables

    return simulateDelay({
        asOfDate: asOfDate.toISOString().split('T')[0],
        balances: balances.sort((a, b) => a.balance - b.balance)
    });
};

export const generateCashFlowReport = (filters: { startDate?: string; endDate?: string }): Promise<CashFlowDetailsData> => {
    let filteredTransactions = filterByDate(cashFlowTransactions, filters.startDate, filters.endDate) as CashFlowTransaction[];

    const incomeTransactions = filteredTransactions.filter(t => t.type === TransactionType.Income);
    const expenseTransactions = filteredTransactions.filter(t => t.type === TransactionType.Expense);

    return simulateDelay({
        incomeTransactions,
        expenseTransactions,
    });
};

export const generateIncomeLedger = (filters: { startDate?: string; endDate?: string; method?: PaymentMethod }): Promise<IncomeLedgerData> => {
    let txns = filterByDate(cashFlowTransactions, filters.startDate, filters.endDate) as CashFlowTransaction[];
    txns = txns.filter(t => t.type === TransactionType.Income);

    if (filters.method) {
        txns = txns.filter(t => t.method === filters.method);
    }

    const summary = {
        totalIncome: txns.reduce((sum, t) => sum + t.amount, 0),
        transactionCount: txns.length,
    };

    return simulateDelay({ summary, transactions: txns });
};

export const generateExpenseLedger = (filters: { startDate?: string; endDate?: string; method?: PaymentMethod }): Promise<ExpenseLedgerData> => {
    let txns = filterByDate(cashFlowTransactions, filters.startDate, filters.endDate) as CashFlowTransaction[];
    txns = txns.filter(t => t.type === TransactionType.Expense);

    if (filters.method) {
        txns = txns.filter(t => t.method === filters.method);
    }

    const summary = {
        totalExpense: txns.reduce((sum, t) => sum + t.amount, 0),
        transactionCount: txns.length,
    };

    return simulateDelay({ summary, transactions: txns });
};

export const generateBankPaymentPendingReport = (): Promise<any[]> => {
    return simulateDelay([]);
};

export const generateInvoiceAgingReport = (filters: { asOfDate?: string }): Promise<InvoiceAgingReportData> => {
    const asOfDate = filters.asOfDate ? new Date(filters.asOfDate) : new Date();
    asOfDate.setHours(23, 59, 59, 999);

    const details: InvoiceAgingItem[] = [];
    let totalOverdue = 0;

    buyers.forEach(buyer => {
        const buyerInvoices = invoices.filter(inv => inv.buyerId === buyer.id && (inv.nettAmount - (inv.discount || 0) - inv.paidAmount) > 0.01);

        if (buyerInvoices.length > 0) {
            const agingItem: InvoiceAgingItem = {
                buyerId: buyer.id,
                buyerName: buyer.buyerName,
                totalOverdue: 0,
                buckets: { '0-30': 0, '31-60': 0, '61-90': 0, '90+': 0 }
            };

            buyerInvoices.forEach(inv => {
                const balance = inv.nettAmount - (inv.discount || 0) - inv.paidAmount;
                const daysOverdue = Math.floor((asOfDate.getTime() - new Date(inv.createdAt).getTime()) / (1000 * 3600 * 24));

                if (daysOverdue <= 30) agingItem.buckets['0-30'] += balance;
                else if (daysOverdue <= 60) agingItem.buckets['31-60'] += balance;
                else if (daysOverdue <= 90) agingItem.buckets['61-90'] += balance;
                else agingItem.buckets['90+'] += balance;

                agingItem.totalOverdue += balance;
            });

            if (agingItem.totalOverdue > 0) {
                details.push(agingItem);
                totalOverdue += agingItem.totalOverdue;
            }
        }
    });

    return simulateDelay({
        summary: {
            totalOverdue,
            buyerCount: details.length
        },
        details: details.sort((a, b) => b.totalOverdue - a.totalOverdue)
    });
};

export const generateProductSalesReport = (filters: { startDate?: string; endDate?: string; productId?: string }): Promise<ProductSalesReportData> => {
    let periodInvoices = filterByDate(invoices, filters.startDate, filters.endDate) as Invoice[];

    const productSalesMap = new Map<string, { productName: string; quantitySold: number; totalValue: number; buyerIds: Set<string> }>();

    periodInvoices.forEach(inv => {
        inv.items.forEach(item => {
            if (filters.productId && item.productId !== filters.productId) return;

            if (!productSalesMap.has(item.productId)) {
                productSalesMap.set(item.productId, {
                    productName: products.find(p => p.id === item.productId)?.productName || 'Unknown',
                    quantitySold: 0,
                    totalValue: 0,
                    buyerIds: new Set<string>()
                });
            }

            const productSale = productSalesMap.get(item.productId)!;
            productSale.quantitySold += item.quantity;
            productSale.totalValue += item.subTotal;
            productSale.buyerIds.add(inv.buyerId);
        });
    });

    const details: ProductSalesReportItem[] = Array.from(productSalesMap.entries()).map(([productId, saleData]) => ({
        productId,
        productName: saleData.productName,
        quantitySold: saleData.quantitySold,
        totalValue: saleData.totalValue,
        averagePrice: saleData.quantitySold > 0 ? saleData.totalValue / saleData.quantitySold : 0,
        buyerCount: saleData.buyerIds.size,
    }));

    const summary = {
        totalQuantity: details.reduce((sum, item) => sum + item.quantitySold, 0),
        totalValue: details.reduce((sum, item) => sum + item.totalValue, 0),
        productCount: details.length
    };

    return simulateDelay({ summary, details: details.sort((a, b) => b.totalValue - a.totalValue) });
};

export const generateAdjustmentsReport = (filters: { startDate?: string, endDate?: string, buyerId?: string }): Promise<AdjustmentsReportData> => {
    let periodInvoices = filterByDate(invoices, filters.startDate, filters.endDate) as Invoice[];
    if (filters.buyerId) {
        periodInvoices = periodInvoices.filter(inv => inv.buyerId === filters.buyerId);
    }

    const details: AdjustmentItem[] = periodInvoices.filter(inv => inv.adjustments !== 0).map(inv => ({
        invoiceId: inv.id,
        invoiceNumber: inv.invoiceNumber,
        createdAt: new Date(inv.createdAt),
        buyerId: inv.buyerId,
        buyerName: buyers.find(b => b.id === inv.buyerId)?.buyerName || 'Unknown',
        adjustmentAmount: inv.adjustments,
    }));

    const summary = {
        totalAdjustments: details.reduce((sum, item) => sum + item.adjustmentAmount, 0),
        positiveAdjustments: details.filter(i => i.adjustmentAmount > 0).reduce((sum, i) => sum + i.adjustmentAmount, 0),
        negativeAdjustments: details.filter(i => i.adjustmentAmount < 0).reduce((sum, i) => sum + i.adjustmentAmount, 0),
        invoiceCount: details.length
    };

    return simulateDelay({ summary, details });
};

export const generateDiscountReport = (filters: { startDate?: string, endDate?: string, buyerId?: string }): Promise<DiscountReportData> => {
    const details: DiscountReportItem[] = [];

    let periodInvoices = filterByDate(invoices, filters.startDate, filters.endDate) as Invoice[];
    let periodPayments = filterByDate(cashFlowTransactions, filters.startDate, filters.endDate) as CashFlowTransaction[];

    if (filters.buyerId) {
        periodInvoices = periodInvoices.filter(i => i.buyerId === filters.buyerId);
        periodPayments = periodPayments.filter(p => p.entityId === filters.buyerId);
    }

    periodInvoices.forEach(inv => {
        if (inv.discount && inv.discount > 0) {
            details.push({
                id: inv.id,
                date: new Date(inv.createdAt),
                type: 'Invoice Discount',
                buyerId: inv.buyerId,
                buyerName: buyers.find(b => b.id === inv.buyerId)?.buyerName || 'Unknown',
                relatedDocument: inv.invoiceNumber,
                discountAmount: inv.discount
            });
        }
    });

    periodPayments.forEach(t => {
        if (t.type === TransactionType.Income && t.discount && t.discount > 0) {
            details.push({
                id: t.id,
                date: new Date(t.date),
                type: 'Payment Discount',
                buyerId: t.entityId!,
                buyerName: t.entityName,
                relatedDocument: t.description || 'Payment',
                discountAmount: t.discount
            });
        }
    });

    const summary = {
        totalInvoiceDiscounts: details.filter(d => d.type === 'Invoice Discount').reduce((sum, d) => sum + d.discountAmount, 0),
        totalPaymentDiscounts: details.filter(d => d.type === 'Payment Discount').reduce((sum, d) => sum + d.discountAmount, 0),
        totalDiscounts: details.reduce((sum, d) => sum + d.discountAmount, 0),
        transactionCount: details.length
    };

    return simulateDelay({ summary, details: details.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()) });
};

export const generateCommissionReport = (filters: { startDate?: string, endDate?: string }): Promise<CommissionReportData> => {
    let periodInvoices = filterByDate(supplierInvoices, filters.startDate, filters.endDate) as SupplierInvoice[];

    const details: CommissionReportItem[] = periodInvoices.map(inv => ({
        invoiceId: inv.id,
        invoiceNumber: inv.invoiceNumber,
        supplierId: inv.supplierId,
        supplierName: suppliers.find(s => s.id === inv.supplierId)?.supplierName || 'Unknown',
        createdAt: new Date(inv.createdAt),
        grossTotal: inv.grossTotal,
        commissionRate: inv.commissionRate,
        commissionAmount: inv.commissionAmount
    }));

    const totalCommission = details.reduce((sum, item) => sum + item.commissionAmount, 0);
    const totalGrossSales = details.reduce((sum, item) => sum + item.grossTotal, 0);

    const summary = {
        totalCommission,
        totalGrossSales,
        averageCommissionRate: totalGrossSales > 0 ? (totalCommission / totalGrossSales) * 100 : 0,
        invoiceCount: details.length
    };

    return simulateDelay({ summary, details });
};

export const fetchBuyerDetailStats = (buyerId: string): Promise<BuyerDetailStats> => {
    const buyerInvoices = invoices.filter(inv => inv.buyerId === buyerId);
    const buyerPayments = cashFlowTransactions.filter(t => t.entityId === buyerId && t.type === TransactionType.Income);

    const stats: BuyerDetailStats = {
        totalBuys: buyerInvoices.reduce((sum, inv) => sum + (inv.nettAmount - (inv.discount || 0)), 0),
        totalItemValue: buyerInvoices.reduce((sum, inv) => sum + inv.totalAmount, 0),
        totalPayments: buyerPayments.reduce((sum, t) => sum + t.amount, 0),
        totalDiscounts: buyerPayments.reduce((sum, t) => sum + (t.discount || 0), 0) + buyerInvoices.reduce((sum, inv) => sum + (inv.discount || 0), 0),
        positiveAdjustments: buyerInvoices.reduce((sum, inv) => sum + (inv.adjustments > 0 ? inv.adjustments : 0), 0),
        negativeAdjustments: buyerInvoices.reduce((sum, inv) => sum + (inv.adjustments < 0 ? inv.adjustments : 0), 0),
        totalWages: buyerInvoices.reduce((sum, inv) => sum + inv.wages, 0),
    };
    return simulateDelay(stats);
};

export const fetchSupplierDetailStats = (supplierId: string): Promise<SupplierDetailStats> => {
    const supplierInvoicesData = supplierInvoices.filter(si => si.supplierId === supplierId);
    const supplierPayments = cashFlowTransactions.filter(t => t.entityId === supplierId && (t.category === ExpenseCategory.SupplierPayment || t.category === ExpenseCategory.AdvancePayment));
    const pendingEntries = entries.filter(e => e.supplierId === supplierId && e.status !== EntryStatus.Invoiced && e.status !== EntryStatus.Cancelled);

    const stats: SupplierDetailStats = {
        totalSales: supplierInvoicesData.reduce((sum, inv) => sum + inv.grossTotal, 0),
        totalNettPayable: supplierInvoicesData.reduce((sum, inv) => sum + inv.nettAmount, 0),
        totalPayments: supplierPayments.reduce((sum, t) => sum + t.amount, 0),
        totalCommission: supplierInvoicesData.reduce((sum, inv) => sum + inv.commissionAmount, 0),
        totalWages: supplierInvoicesData.reduce((sum, inv) => sum + inv.wages, 0),
        positiveAdjustments: supplierInvoicesData.reduce((sum, inv) => sum + (inv.adjustments > 0 ? inv.adjustments : 0), 0),
        negativeAdjustments: supplierInvoicesData.reduce((sum, inv) => sum + (inv.adjustments < 0 ? inv.adjustments : 0), 0),
        pendingEntriesCount: pendingEntries.length,
    };
    return simulateDelay(stats);
};

export const fetchProductDetailData = (productId: string, filters?: { startDate?: string; endDate?: string }): Promise<ProductDetailData> => {
    const product = products.find(p => p.id === productId);
    if (!product) return Promise.reject(new Error("Product not found"));

    const allSalesInvoices = invoices.filter(inv => inv.items.some(i => i.productId === productId));

    const allSalesForProduct: ProductSaleItem[] = allSalesInvoices.flatMap(inv =>
        inv.items.filter(i => i.productId === productId).map(i => ({
            id: `${inv.id}-${i.id}`,
            invoiceId: inv.id,
            invoiceNumber: inv.invoiceNumber,
            buyerId: inv.buyerId,
            buyerName: buyers.find(b => b.id === inv.buyerId)?.buyerName || 'Unknown',
            date: new Date(inv.createdAt),
            quantity: i.quantity,
            rate: i.ratePerQuantity,
            subTotal: i.subTotal,
        }))
    ).sort((a, b) => b.date.getTime() - a.date.getTime());

    let salesToDisplay = allSalesForProduct;

    // Apply date filters if provided
    if (filters?.startDate) {
        const start = new Date(filters.startDate);
        start.setHours(0, 0, 0, 0);
        salesToDisplay = salesToDisplay.filter(sale => new Date(sale.date) >= start);
    }
    if (filters?.endDate) {
        const end = new Date(filters.endDate);
        end.setHours(23, 59, 59, 999);
        salesToDisplay = salesToDisplay.filter(sale => new Date(sale.date) <= end);
    }

    // If no filters are applied, show the most recent 20.
    if (!filters?.startDate && !filters?.endDate) {
        salesToDisplay = salesToDisplay.slice(0, 20);
    }

    const stats = {
        totalQuantitySold: allSalesForProduct.reduce((sum, s) => sum + s.quantity, 0),
        totalSalesValue: allSalesForProduct.reduce((sum, s) => sum + s.subTotal, 0),
        averagePrice: 0,
        supplierCount: new Set(entries.filter(e => e.items.some(i => i.productId === productId)).map(e => e.supplierId)).size,
        buyerCount: new Set(allSalesForProduct.map(s => s.buyerId)).size,
    };
    stats.averagePrice = stats.totalQuantitySold > 0 ? stats.totalSalesValue / stats.totalQuantitySold : 0;

    const monthlySalesMap = new Map<string, number>();
    allSalesForProduct.forEach(sale => {
        const monthKey = `${sale.date.getFullYear()}-${(sale.date.getMonth() + 1).toString().padStart(2, '0')}`;
        monthlySalesMap.set(monthKey, (monthlySalesMap.get(monthKey) || 0) + sale.subTotal);
    });
    const monthlySales = Array.from(monthlySalesMap.entries())
        .map(([name, value]) => ({ name, value }))
        .sort((a, b) => a.name.localeCompare(b.name))
        .slice(-12);

    const topBuyersMap = new Map<string, number>();
    allSalesForProduct.forEach(sale => {
        topBuyersMap.set(sale.buyerId, (topBuyersMap.get(sale.buyerId) || 0) + sale.subTotal);
    });
    const topBuyers = Array.from(topBuyersMap.entries()).map(([id, value]) => ({ id, name: buyers.find(b => b.id === id)?.buyerName || 'Unknown', value })).sort((a, b) => b.value - a.value).slice(0, 5);

    const topSuppliersMap = new Map<string, number>();
    entries.forEach(entry => {
        entry.items.forEach(item => {
            if (item.productId === productId) {
                topSuppliersMap.set(entry.supplierId, (topSuppliersMap.get(entry.supplierId) || 0) + item.quantity);
            }
        });
    });
    const topSuppliers = Array.from(topSuppliersMap.entries()).map(([id, value]) => ({ id, name: suppliers.find(s => s.id === id)?.supplierName || 'Unknown', value })).sort((a, b) => b.value - a.value).slice(0, 5);

    return simulateDelay({ product, stats, monthlySales, topBuyers, topSuppliers, recentSales: salesToDisplay });
};

export const generateAnalyticsDashboardData = (filters: { startDate?: string, endDate?: string }): Promise<AnalyticsDashboardData> => {
    recalculateBalances();
    const { startDate, endDate } = filters;

    const periodInvoices = filterByDate(invoices, startDate, endDate) as Invoice[];
    const periodSupplierInvoices = filterByDate(supplierInvoices, startDate, endDate) as SupplierInvoice[];
    const periodTransactions = filterByDate(cashFlowTransactions, startDate, endDate) as CashFlowTransaction[];

    // KPIs
    const totalSales = periodInvoices.reduce((sum, inv) => sum + (inv.nettAmount - (inv.discount || 0)), 0);
    const totalPurchases = periodSupplierInvoices.reduce((sum, inv) => sum + inv.nettAmount, 0);
    const totalCommission = periodSupplierInvoices.reduce((sum, inv) => sum + inv.commissionAmount, 0);
    const buyerWages = periodInvoices.reduce((sum, inv) => sum + inv.wages, 0);
    const supplierWages = periodSupplierInvoices.reduce((sum, inv) => sum + inv.wages, 0);
    const totalWages = buyerWages + supplierWages;
    const income = periodTransactions.filter(t => t.type === TransactionType.Income).reduce((sum, t) => sum + t.amount, 0);
    const expense = periodTransactions.filter(t => t.type === TransactionType.Expense).reduce((sum, t) => sum + t.amount, 0);
    const netCashFlow = income - expense;
    const invoiceCount = periodInvoices.length;

    const kpis = {
        totalSales,
        totalPurchases,
        totalCommission,
        totalWages,
        netCashFlow,
        invoiceCount,
    };

    // Sales vs Purchases Chart
    const salesVsPurchasesMap = new Map<string, { sales: number, purchases: number }>();
    periodInvoices.forEach(inv => {
        const dateStr = getISODateString(new Date(inv.createdAt));
        const day = salesVsPurchasesMap.get(dateStr) || { sales: 0, purchases: 0 };
        day.sales += (inv.nettAmount - (inv.discount || 0));
        salesVsPurchasesMap.set(dateStr, day);
    });
    periodSupplierInvoices.forEach(inv => {
        const dateStr = getISODateString(new Date(inv.createdAt));
        const day = salesVsPurchasesMap.get(dateStr) || { sales: 0, purchases: 0 };
        day.purchases += inv.nettAmount;
        salesVsPurchasesMap.set(dateStr, day);
    });
    const salesVsPurchases = Array.from(salesVsPurchasesMap.entries())
        .map(([date, values]) => ({ date, ...values }))
        .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

    // Top Products by Value
    const productSales = new Map<string, number>();
    periodInvoices.forEach(inv => inv.items.forEach(item => {
        productSales.set(item.productId, (productSales.get(item.productId) || 0) + item.subTotal);
    }));
    const topProductsByValue = Array.from(productSales.entries())
        .map(([productId, value]) => ({
            id: productId,
            name: products.find(p => p.id === productId)?.displayName || 'Unknown',
            value
        }))
        .sort((a, b) => b.value - a.value)
        .slice(0, 10);

    // Top Buyers by Sales
    const buyerSales = new Map<string, number>();
    periodInvoices.forEach(inv => {
        buyerSales.set(inv.buyerId, (buyerSales.get(inv.buyerId) || 0) + (inv.nettAmount - (inv.discount || 0)));
    });
    const topBuyersBySales = Array.from(buyerSales.entries())
        .map(([buyerId, value]) => ({
            id: buyerId,
            name: buyers.find(b => b.id === buyerId)?.buyerName || 'Unknown',
            value
        }))
        .sort((a, b) => b.value - a.value)
        .slice(0, 10);

    // Expense Breakdown
    const expenseBreakdownMap = new Map<string, number>();
    periodTransactions.filter(t => t.type === TransactionType.Expense).forEach(t => {
        const category = t.category || ExpenseCategory.Other;
        expenseBreakdownMap.set(category, (expenseBreakdownMap.get(category) || 0) + t.amount);
    });
    const expenseBreakdown = Array.from(expenseBreakdownMap.entries()).map(([name, value]) => ({ name, value }));

    const analyticsData: AnalyticsDashboardData = {
        kpis,
        salesVsPurchases,
        topProductsByValue,
        topBuyersBySales,
        expenseBreakdown,
    };

    return simulateDelay(analyticsData);
};

export const fetchProductAnalytics = (): Promise<ProductAnalyticsData> => {
    const stats = {
        productCount: products.length,
        totalSalesValue: invoices.reduce((sum, inv) => sum + inv.totalAmount, 0),
        totalQuantitySold: invoices.reduce((sum, inv) => sum + inv.totalQuantities, 0),
        bestSellingProductByValue: null as ChartDataItem | null,
    };

    const productSalesValue = new Map<string, number>();
    const productSalesQty = new Map<string, number>();

    invoices.forEach(inv => {
        inv.items.forEach(item => {
            productSalesValue.set(item.productId, (productSalesValue.get(item.productId) || 0) + item.subTotal);
            productSalesQty.set(item.productId, (productSalesQty.get(item.productId) || 0) + item.quantity);
        });
    });

    const topProductsByValue = Array.from(productSalesValue.entries())
        .map(([id, value]) => ({ id, name: products.find(p => p.id === id)?.displayName || 'Unknown', value }))
        .sort((a, b) => b.value - a.value);

    const topProductsByQuantity = Array.from(productSalesQty.entries())
        .map(([id, value]) => ({ id, name: products.find(p => p.id === id)?.displayName || 'Unknown', value }))
        .sort((a, b) => b.value - a.value);

    stats.bestSellingProductByValue = topProductsByValue[0] || null;

    return simulateDelay({ stats, topProductsByValue, topProductsByQuantity });
};

export const fetchBuyerInvoicesAnalytics = (): Promise<BuyerInvoicesAnalyticsData> => {
    const stats = {
        invoiceCount: invoices.length,
        totalSalesValue: invoices.reduce((sum, inv) => sum + (inv.nettAmount - (inv.discount || 0)), 0),
        totalAmountPaid: invoices.reduce((sum, inv) => sum + inv.paidAmount, 0),
        totalOutstanding: 0,
    };
    stats.totalOutstanding = stats.totalSalesValue - stats.totalAmountPaid;

    const topBuyersByOutstanding = [...buyers].filter(b => b.outstanding > 0).sort((a, b) => b.outstanding - a.outstanding).slice(0, 10).map(b => ({ id: b.id, name: b.buyerName, value: b.outstanding }));

    const buyerSales = new Map<string, number>();
    invoices.forEach(inv => {
        buyerSales.set(inv.buyerId, (buyerSales.get(inv.buyerId) || 0) + (inv.nettAmount - (inv.discount || 0)));
    });
    const topBuyersBySales = Array.from(buyerSales.entries()).map(([id, value]) => ({ id, name: buyers.find(b => b.id === id)?.buyerName || 'Unknown', value })).sort((a, b) => b.value - a.value).slice(0, 10);

    return simulateDelay({ stats, topBuyersByOutstanding, topBuyersBySales });
};

export const fetchSupplierInvoicesAnalytics = (): Promise<SupplierInvoicesAnalyticsData> => {
    const stats = {
        invoiceCount: supplierInvoices.length,
        totalPurchaseValue: supplierInvoices.reduce((sum, inv) => sum + inv.nettAmount, 0),
        totalAmountPaid: supplierInvoices.reduce((sum, inv) => sum + inv.paidAmount, 0),
        totalPayables: 0,
    };
    stats.totalPayables = stats.totalPurchaseValue - stats.totalAmountPaid;

    const topSuppliersByPayable = [...suppliers].filter(s => s.outstanding < 0).sort((a, b) => a.outstanding - b.outstanding).slice(0, 10).map(s => ({ id: s.id, name: s.supplierName, value: Math.abs(s.outstanding) }));

    const supplierPurchases = new Map<string, number>();
    supplierInvoices.forEach(inv => {
        supplierPurchases.set(inv.supplierId, (supplierPurchases.get(inv.supplierId) || 0) + inv.nettAmount);
    });
    const topSuppliersByPurchases = Array.from(supplierPurchases.entries()).map(([id, value]) => ({ id, name: suppliers.find(s => s.id === id)?.supplierName || 'Unknown', value })).sort((a, b) => b.value - a.value).slice(0, 10);

    return simulateDelay({ stats, topSuppliersByPayable, topSuppliersByPurchases });
};