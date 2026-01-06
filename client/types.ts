export enum EntryStatus {
  Pending = "Pending",
  Draft = "Draft",
  Auctioned = "Auctioned",
  Invoiced = "Invoiced",
  Cancelled = "Cancelled",
}

export enum TransactionType {
  Income = "Income",
  Expense = "Expense",
  Transfer = "Transfer",
}

export enum PaymentMethod {
  Cash = "Cash",
  Bank = "Bank",
}

export enum ExpenseCategory {
  SupplierPayment = "Supplier Payment",
  AdvancePayment = "Advance Payment",
  Other = "Other",
}

export interface Buyer {
  id: string;
  buyerName: string;
  displayName?: string;
  alias?: string;
  tokenNumber?: string;
  description?: string;
  contactNumber: string;
  place?: string;
  outstanding: number;
  paymentHistory?: CashFlowTransaction[];
}

export interface Supplier {
  id: string;
  supplierName: string;
  displayName?: string;
  contactNumber: string;
  place?: string;
  outstanding: number;
  bankAccountDetails?: string;
  paymentHistory?: CashFlowTransaction[];
}

export interface Product {
  id: string;
  productName: string;
  displayName?: string;
}

export interface EntryItem {
  id: string;
  _id?: string;
  subSerialNumber: number;
  productId: string;
  quantity: number;
  grossWeight?: number;
  shuteWeight?: number;
  nettWeight: number;
  ratePerQuantity?: number;
  buyerId?: string;
  subTotal: number;
  invoiceId?: string | null;
  supplierInvoiceId?: string | null;
}

export type DraftItem = EntryItem & {
  entryId: string;
  entrySerialNumber: string;
  supplierId: string;
};

export interface Entry {
  id: string;
  _id?: string;
  serialNumber: string;
  supplierId: string;
  items: EntryItem[];
  totalQuantities: number;
  totalAmount: number;
  status: EntryStatus;
  createdAt: Date;
  lastSubSerialNumber: number;
}

export interface Stats {
  buyers: number;
  suppliers: number;
  products: number;
  entries: number;
  totalRevenue: number;
  totalExpenses: number;
}

export interface InvoiceItem {
  id: string; // This is the original EntryItem id
  productId: string;
  productName: string;
  quantity: number;
  grossWeight?: number;
  shuteWeight?: number;
  nettWeight: number;
  ratePerQuantity: number;
  subTotal: number;
}

export interface Invoice {
  id: string;
  invoiceNumber: string;
  buyerId: string;
  items: InvoiceItem[];
  totalQuantities: number;
  totalAmount: number;
  wages: number;
  adjustments: number;
  nettAmount: number;
  paidAmount: number;
  discount: number;
  createdAt: Date;
}

export interface SupplierInvoiceItem {
  // This is an aggregated item
  productId: string;
  productName: string;
  quantity: number;
  grossWeight?: number;
  shuteWeight?: number;
  nettWeight: number;
  ratePerQuantity: number;
  subTotal: number;
}

export enum SupplierInvoiceStatus {
  Paid = "Paid",
  Unpaid = "Unpaid",
  PartiallyPaid = "Partially Paid",
}

export enum EntryPriority {
  High = "High",
  Medium = "Medium",
  Low = "Low",
}

export interface SupplierInvoice {
  id: string;
  invoiceNumber: string;
  supplierId: string;
  entryIds: string[];
  items: SupplierInvoiceItem[];
  totalQuantities: number;
  grossTotal: number;
  commissionRate: number; // percentage
  commissionAmount: number;
  wages: number;
  adjustments: number;
  nettAmount: number; // gross - deductions
  advancePaid: number;
  finalPayable: number; // DEPRECATED in favor of (nettAmount - paidAmount)
  paidAmount: number;
  createdAt: Date;
  status: SupplierInvoiceStatus;
}

export interface CashFlowTransaction {
  id: string;
  date: Date;
  type: TransactionType;
  category: ExpenseCategory | null; // Null for an Income transaction
  entityId: string | null; // Buyer ID, Supplier ID, or null for 'Other' expense
  entityName: string; // Buyer Name, Supplier Name, or Expense Name
  amount: number;
  discount?: number;
  method: PaymentMethod;
  toMethod?: PaymentMethod; // For Transfer transactions
  reference?: string;
  description?: string;
  relatedEntryIds?: string[]; // IDs of entries related to an advance payment
  relatedInvoiceIds?: string[]; // IDs of supplier invoices paid
}

// --- NEW TYPES FOR DASHBOARD & REPORTS ---

export interface ChartDataItem {
  name: string;
  value: number;
  id?: string;
}

export interface UninvoicedEntryForBuyer {
  entryId: string;
  entrySerialNumber: string;
  itemCount: number;
  amount: number;
}

export interface UninvoicedBuyerWithEntries {
  buyerId: string;
  buyerName: string;
  entries: UninvoicedEntryForBuyer[];
  totalAmount: number;
  totalItemCount: number;
}

export interface DashboardData {
  kpis: {
    totalReceivables: number;
    totalPayables: number;
    todayAuctionValue: number;
    todayCommission: number;
    todayEntriesCount: number;
    uninvoicedAuctionValue: number;
  };
  entryStatusDistribution: ChartDataItem[];
  cashFlowChart: { date: string; income: number; expense: number }[];
  topProducts: ChartDataItem[];
  salesByBuyer: ChartDataItem[];
  expenseBreakdown: ChartDataItem[];
  latestTransactions: CashFlowTransaction[];
  pendingEntries: Entry[];
  unInvoicedBuyersWithEntries: UninvoicedBuyerWithEntries[];
  topBuyersByOutstanding: ChartDataItem[];
  topSuppliersByPayable: ChartDataItem[];
}

export interface SalesReportData {
  summary: {
    totalSales: number;
    totalPaid: number;
    totalBalance: number;
    invoiceCount: number;
  };
  invoices: (Invoice & { buyerName: string; balance: number })[];
}

export interface PurchaseReportData {
  summary: {
    totalPurchases: number; // Represents amount payable to suppliers
    totalPaid: number;
    totalBalance: number;
    invoiceCount: number;
  };
  invoices: (SupplierInvoice & { supplierName: string; balance: number })[];
}

export interface WagesReportItem {
  invoiceId: string;
  invoiceNumber: string;
  buyerId: string;
  buyerName: string;
  createdAt: Date;
  wages: number;
  invoiceTotal: number;
}

export interface WagesReportData {
  summary: {
    totalWages: number;
    invoiceCount: number;
  };
  details: WagesReportItem[];
}

export interface SupplierWagesReportItem {
  invoiceId: string;
  invoiceNumber: string;
  supplierId: string;
  supplierName: string;
  createdAt: Date;
  wages: number;
  invoiceTotal: number;
}

export interface SupplierWagesReportData {
  summary: {
    totalWages: number;
    invoiceCount: number;
  };
  details: SupplierWagesReportItem[];
}

export interface ProfitAndLossData {
  totalCommission: number;
  otherRevenue: number; // e.g. from buyer wages
  totalRevenue: number;
  operatingExpenses: number;
  netProfit: number;
}

export interface BuyerBalanceSheetItem {
  buyerId: string;
  buyerName: string;
  contactNumber: string;
  balance: number;
  lastInvoiceDate?: Date;
}

export interface BuyerBalanceSheetData {
  asOfDate: string;
  balances: BuyerBalanceSheetItem[];
}

export interface CashFlowDetailsData {
  incomeTransactions: CashFlowTransaction[];
  expenseTransactions: CashFlowTransaction[];
}

export interface LedgerEntry {
  id?: string;
  date: Date;
  particulars: string;
  debit: number;
  credit: number;
  balance: number;
  type?: string;
}

export interface LedgerReportData {
  entityName: string;
  outstanding: number;
  entries: LedgerEntry[];
  balanceBroughtForward: number;
  startDate?: string;
  summary?: {
    closingBalance: number;
  };
}

export interface BuyerDetailStats {
  totalBuys: number;
  totalItemValue: number;
  totalPayments: number;
  totalDiscounts: number;
  positiveAdjustments: number;
  negativeAdjustments: number;
  totalWages: number;
}

export interface SupplierDetailStats {
  totalSales: number; // This is now Gross Sales
  totalNettPayable: number;
  totalPayments: number;
  totalCommission: number;
  totalWages: number;
  positiveAdjustments: number;
  negativeAdjustments: number;
  pendingEntriesCount: number;
}

export interface ProductSaleItem {
  id: string; // Unique ID for the table row, can be invoiceId + itemId
  invoiceId: string;
  invoiceNumber: string;
  buyerId: string;
  buyerName: string;
  date: Date;
  quantity: number;
  rate: number;
  subTotal: number;
}

export interface ProductDetailData {
  product: Product;
  stats: {
    totalQuantitySold: number;
    totalSalesValue: number;
    averagePrice: number;
    supplierCount: number;
    buyerCount: number;
  };
  monthlySales: ChartDataItem[];
  topBuyers: ChartDataItem[];
  topSuppliers: ChartDataItem[]; // based on quantity supplied
  recentSales: ProductSaleItem[];
}

export interface ProductAnalyticsData {
  stats: {
    productCount: number;
    totalSalesValue: number;
    totalQuantitySold: number;
    bestSellingProductByValue: ChartDataItem | null;
  };
  topProductsByValue: ChartDataItem[];
  topProductsByQuantity: ChartDataItem[];
}

export interface BuyerInvoicesAnalyticsData {
  stats: {
    invoiceCount: number;
    totalSalesValue: number;
    totalAmountPaid: number;
    totalOutstanding: number;
  };
  topBuyersByOutstanding: ChartDataItem[];
  topBuyersBySales: ChartDataItem[];
}

export interface SupplierInvoicesAnalyticsData {
  stats: {
    invoiceCount: number;
    totalPurchaseValue: number;
    totalAmountPaid: number;
    totalPayables: number;
  };
  topSuppliersByPayable: ChartDataItem[];
  topSuppliersByPurchases: ChartDataItem[];
}


// --- NEW TYPES FOR RBAC ---

export enum Feature {
  Dashboard = 'dashboard',
  Entries = 'entries',
  Auction = 'auction',
  Buyers = 'buyers',
  Suppliers = 'suppliers',
  Products = 'products',
  BuyerInvoices = 'buyer_invoices',
  SupplierInvoices = 'supplier_invoices',
  CashFlow = 'cash_flow',
  Reports = 'reports',
  Roles = 'roles',
  Users = 'users',
  AuditLog = 'audit_log',
}

// This object defines the structure for the permissions UI and generates the permission keys.
export const PERMISSION_CONFIG = {
  [Feature.Dashboard]: {
    label: 'Dashboard',
    functionalities: {
      view_page: { label: 'View Dashboard Page', permissions: ['view'] },
      kpis: { label: 'View KPIs (Totals)', permissions: ['view'] },
      at_a_glance: { label: 'View "At a Glance" Section', description: 'Outstanding balances and top product lists.', permissions: ['view'] },
      charts: { label: 'View Analytics & Charts Section', permissions: ['view'] },
      operations: { label: 'View Operations Section', description: 'Uninvoiced entries, pending auctions, latest transactions.', permissions: ['view'] },
    },
  },
  [Feature.Entries]: {
    label: 'Entries Page',
    functionalities: {
      list: { label: 'Entry Management', description: 'View list and perform basic CRUD on entries before invoicing.', permissions: ['view', 'create', 'update', 'delete'] },
      auction_action: { label: 'Auction Action', description: 'Permission to send an entry to the auction page.', permissions: ['view', 'update'] },
      invoice_action: { label: 'Supplier Invoice Action', description: 'Permission to start creating a supplier invoice from an entry.', permissions: ['view', 'create'] },
      quick_create_supplier: { label: 'Quick-Create Supplier', description: 'Allow creating a new supplier from within the Entry form.', permissions: ['create'] },
      quick_create_product: { label: 'Quick-Create Product', description: 'Allow creating a new product from within the Entry form.', permissions: ['create'] },
    },
  },
  [Feature.Auction]: {
    label: 'Auction Page',
    functionalities: {
      list: { label: 'View Auction Page', description: 'View the list of all entries available for auction.', permissions: ['view'] },
      manage_items: { label: 'Manage Auction Items', description: 'Sell items, set prices, assign buyers, and add/remove items within the auction modal.', permissions: ['view', 'create', 'update', 'delete'] },
    },
  },
  [Feature.Buyers]: {
    label: 'Buyers',
    functionalities: {
      list: { label: 'Buyer Management', description: 'View, create, edit, and delete buyers.', permissions: ['view', 'create', 'update', 'delete'] },
      details: { label: 'View Buyer Details Page', description: 'Access the detailed financial summary and history for a buyer.', permissions: ['view'] },
      details_quick_stats: { label: 'View Quick Stats Card', permissions: ['view'] },
      details_analytics: { label: 'View Analytics Overview Card', permissions: ['view'] },
      details_financial_summary: { label: 'View Financial Summary Card', permissions: ['view'] },
      details_invoice_history: { label: 'View Invoice History Card', permissions: ['view'] },
      details_payment_history: { label: 'View Payment History Card', permissions: ['view'] },
    },
  },
  [Feature.Suppliers]: {
    label: 'Suppliers',
    functionalities: {
      list: { label: 'Supplier Management', description: 'View, create, edit, and delete suppliers.', permissions: ['view', 'create', 'update', 'delete'] },
      details: { label: 'View Supplier Details Page', description: 'Access the detailed financial summary and history for a supplier.', permissions: ['view'] },
      details_quick_stats: { label: 'View Quick Stats Card', permissions: ['view'] },
      details_analytics: { label: 'View Analytics Overview Card', permissions: ['view'] },
      details_financial_summary: { label: 'View Financial Summary Card', permissions: ['view'] },
      details_invoice_history: { label: 'View Invoice History Card', permissions: ['view'] },
      details_payment_history: { label: 'View Payment History Card', permissions: ['view'] },
      details_bank_details: { label: 'View Bank Account Details', permissions: ['view'] },
    },
  },
  [Feature.Products]: {
    label: 'Products',
    functionalities: {
      list: { label: 'Product Management', description: 'View, create, edit, and delete products.', permissions: ['view', 'create', 'update', 'delete'] },
      details: { label: 'View Product Details Page', description: 'Access detailed analytics and sales history for a product.', permissions: ['view'] },
      details_quick_stats: { label: 'View Quick Stats Card', permissions: ['view'] },
      details_analytics: { label: 'View Analytics Overview Card', permissions: ['view'] },
      details_recent_sales: { label: 'View Recent Sales Card', permissions: ['view'] },
    }
  },
  [Feature.BuyerInvoices]: {
    label: 'Buyer Invoices',
    functionalities: {
      manage: { label: 'Invoice Management', description: 'View, create, edit, and delete buyer invoices.', permissions: ['view', 'create', 'update', 'delete'] },
      print: { label: 'Print/Download Invoice', permissions: ['view'] },
      payment: { label: 'Record Payments on Invoice', permissions: ['create'] }
    }
  },
  [Feature.SupplierInvoices]: {
    label: 'Supplier Invoices',
    functionalities: {
      manage: { label: 'Invoice Management', description: 'View, create, edit, and delete supplier invoices.', permissions: ['view', 'create', 'update', 'delete'] },
      draft: { label: 'Manage Draft Memorandum', description: 'Create, view and print draft memorandums before finalizing.', permissions: ['view', 'create'] },
      print: { label: 'Print/Download Final Invoice', permissions: ['view'] },
      payment: { label: 'Record Payments on Invoice', permissions: ['create'] }
    }
  },
  [Feature.CashFlow]: {
    label: 'Cash Flow',
    functionalities: {
      view: { label: 'View Transactions', permissions: ['view'] },
      add_income: { label: 'Record Income', permissions: ['create'] },
      add_expense: { label: 'Record Expense (Supplier/Other)', permissions: ['create'] },
      update_transaction: { label: 'Edit Transactions', description: 'Allow editing existing cash flow entries.', permissions: ['update'] },
      delete_transaction: { label: 'Delete Transactions', description: 'Allow deleting cash flow entries.', permissions: ['delete'] }
    }
  },
  [Feature.Reports]: {
    label: 'Reports',
    functionalities: {
      view_page: { label: 'Access Reports Page', description: 'Grants access to the main reports page to see the list of available reports.', permissions: ['view'] },
      analytics_kpis: { label: 'View Analytics KPIs', permissions: ['view'] },
      analytics_charts: { label: 'View Analytics Charts', permissions: ['view'] },
      analytics_lists: { label: 'View Analytics Lists (Top Products/Buyers)', permissions: ['view'] },
      sales: { label: 'View Sales Report', permissions: ['view'] },
      buyer_balance_sheet: { label: 'View Buyer Balance Sheet', permissions: ['view'] },
      invoice_aging: { label: 'View Invoice Aging Report', permissions: ['view'] },
      wages_report: { label: 'View Wages Report', permissions: ['view'] },
      adjustments_report: { label: 'View Adjustments Report', permissions: ['view'] },
      discount_report: { label: 'View Discount Report', permissions: ['view'] },
      buyer_ledger: { label: 'View Buyer Ledger', permissions: ['view'] },
      purchases: { label: 'View Purchase Report', permissions: ['view'] },
      supplier_balance_sheet: { label: 'View Supplier Balance Sheet', permissions: ['view'] },
      supplier_ledger: { label: 'View Supplier Ledger', permissions: ['view'] },
      pnl: { label: 'View Profit & Loss Report', permissions: ['view'] },
      commission_report: { label: 'View Commission Report', permissions: ['view'] },
      cash_flow_details: { label: 'View Cash Flow Details Report', permissions: ['view'] },
      income_ledger: { label: 'View Income Ledger', permissions: ['view'] },
      expense_ledger: { label: 'View Expense Ledger', permissions: ['view'] },
      product_sales: { label: 'View Product Sales Analysis', permissions: ['view'] },
    }
  },
  [Feature.Users]: {
    label: 'User Management',
    functionalities: {
      list: { label: 'User Management', description: 'View, create, edit, and delete user accounts.', permissions: ['view', 'create', 'update', 'delete'] },
    }
  },
  [Feature.Roles]: {
    label: 'Roles & Permissions',
    functionalities: {
      list: { label: 'Role Management', description: 'View, create, edit, and delete roles and their permissions.', permissions: ['view', 'create', 'update', 'delete'] },
    }
  },
  [Feature.AuditLog]: {
    label: 'Audit Log',
    functionalities: {
      view: { label: 'View Audit Log', description: 'Access the log of all user actions in the system.', permissions: ['view'] },
    }
  }
} as const;

// Utility type to generate all permission keys like "dashboard.view.view", "entries.list.create"
type FlattenPermissionKeys<T> = {
  [F in keyof T]: T[F] extends { functionalities: infer Func }
  ? {
    [K in keyof Func]: Func[K] extends { permissions: infer P }
    ? P extends readonly (infer Action)[]
    ? `${F & string}.${K & string}.${Action & string}`
    : never
    : never;
  }[keyof Func]
  : never;
}[keyof T];

export type PermissionKey = FlattenPermissionKeys<typeof PERMISSION_CONFIG>;

export const ALL_PERMISSION_KEYS = Object.entries(PERMISSION_CONFIG).flatMap(([feature, featureConfig]) =>
  Object.entries(featureConfig.functionalities).flatMap(([func, funcConfig]) =>
    funcConfig.permissions.map(perm => `${feature}.${func}.${perm}`)
  )
) as PermissionKey[];


export type RolePermission = Partial<Record<PermissionKey, boolean>>;

export interface Role {
  id: string;
  name: string;
  permissions: RolePermission;
}

export interface User {
  id: string;
  name: string;
  contactNumber: string;
  password?: string;
  roleId: string;
  role?: Role; // This will be attached after fetching
}


export interface IncomeLedgerData {
  summary: {
    totalIncome: number;
    transactionCount: number;
  };
  transactions: CashFlowTransaction[];
}

export interface ExpenseLedgerData {
  summary: {
    totalExpense: number;
    transactionCount: number;
  };
  transactions: CashFlowTransaction[];
}

// --- NEW ENUM FOR AUDITING ---
export enum AuditAction {
  Create = 'Create',
  Update = 'Update',
  Delete = 'Delete',
  Login = 'Login',
  Logout = 'Logout',
}

// --- NEW TYPE FOR AUDITING ---
export interface AuditLog {
  id: string;
  timestamp: Date;
  actorId: string;
  actorName: string;
  action: AuditAction;
  feature: Feature;
  description: string;
}

// --- NEW TYPES FOR ENHANCED REPORTS ---
export interface AnalyticsDashboardData {
  kpis: {
    totalSales: number;
    totalPurchases: number;
    totalCommission: number;
    totalWages: number;
    netCashFlow: number;
    invoiceCount: number;
  };
  salesVsPurchases: { date: string; sales: number; purchases: number }[];
  topProductsByValue: ChartDataItem[];
  topBuyersBySales: ChartDataItem[];
  expenseBreakdown: ChartDataItem[];
}

export interface AgingBucket {
  '0-30': number;
  '31-60': number;
  '61-90': number;
  '90+': number;
}

export interface InvoiceAgingItem {
  buyerId: string;
  buyerName: string;
  totalOverdue: number;
  buckets: AgingBucket;
}

export interface InvoiceAgingReportData {
  summary: {
    totalOverdue: number;
    buyerCount: number;
  };
  details: InvoiceAgingItem[];
}

export interface SupplierBalanceSheetItem {
  supplierId: string;
  supplierName: string;
  balance: number; // Negative value means payable
  lastInvoiceDate?: Date;
}

export interface SupplierBalanceSheetData {
  asOfDate: string;
  balances: SupplierBalanceSheetItem[];
}

export interface ProductSalesReportItem {
  productId: string;
  productName: string;
  quantitySold: number;
  totalValue: number;
  averagePrice: number;
  buyerCount: number;
}

export interface ProductSalesReportData {
  summary: {
    totalQuantity: number;
    totalValue: number;
    productCount: number;
  };
  details: ProductSalesReportItem[];
}

export interface AdjustmentItem {
  invoiceId: string;
  invoiceNumber: string;
  createdAt: Date;
  buyerId: string;
  buyerName: string;
  adjustmentAmount: number;
}

export interface AdjustmentsReportData {
  summary: {
    totalAdjustments: number;
    positiveAdjustments: number;
    negativeAdjustments: number;
    invoiceCount: number;
  };
  details: AdjustmentItem[];
}

export interface DiscountReportItem {
  id: string; // transactionId or invoiceId
  date: Date;
  type: 'Invoice Discount' | 'Payment Discount';
  buyerId: string;
  buyerName: string;
  relatedDocument: string; // invoiceNumber or transaction description
  discountAmount: number;
}

export interface DiscountReportData {
  summary: {
    totalInvoiceDiscounts: number;
    totalPaymentDiscounts: number;
    totalDiscounts: number;
    transactionCount: number;
  };
  details: DiscountReportItem[];
}

export interface CommissionReportItem {
  invoiceId: string;
  invoiceNumber: string;
  supplierId: string;
  supplierName: string;
  createdAt: Date;
  grossTotal: number;
  commissionRate: number;
  commissionAmount: number;
}

export interface CommissionReportData {
  summary: {
    totalCommission: number;
    totalGrossSales: number;
    averageCommissionRate: number;
    invoiceCount: number;
  };
  details: CommissionReportItem[];
}
