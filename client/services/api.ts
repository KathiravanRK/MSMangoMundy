import { logger } from './logger';
import {
    User, Role, Buyer, Supplier, Product, Entry, Invoice, SupplierInvoice,
    CashFlowTransaction, AuditLog, EntryItem, EntryStatus, SupplierInvoiceStatus,
    Feature, AuditAction, Stats, TransactionType, ExpenseCategory,
    SalesReportData, PurchaseReportData, LedgerReportData
} from '../types';

// Use environment variable or detect network IP automatically
// For cloud deployment, set VITE_API_URL in your hosting platform (e.g., Vercel, Netlify)
// For local network access, the app detects the network IP from the current location
const getAPIUrl = () => {
    // Check Vite environment variable (for production deployment)
    if (import.meta.env.VITE_API_URL) {
        return import.meta.env.VITE_API_URL;
    }

    // Try to detect network IP from current location (for LAN access)
    const currentHost = window.location.hostname;
    if (currentHost !== 'localhost' && currentHost !== '127.0.0.1') {
        return `http://${currentHost}:5000/api`;
    }

    // Fallback to localhost for local development
    return 'http://localhost:5000/api';
};

const API_URL = getAPIUrl();

// Helper to get token
const getToken = () => localStorage.getItem('token');

interface RequestOptions extends RequestInit {
    retries?: number;
    retryDelay?: number;
}

// Helper for requests
const request = async (endpoint: string, options: RequestOptions = {}) => {
    const { retries = 1, retryDelay = 1000, ...fetchOptions } = options;
    const token = getToken();

    const headers = {
        'Content-Type': 'application/json',
        ...(token ? { 'Authorization': `Bearer ${token}` } : {}),
        ...fetchOptions.headers,
    };

    let lastError: any;

    for (let i = 0; i <= retries; i++) {
        try {
            const response = await fetch(`${API_URL}${endpoint}`, {
                ...fetchOptions,
                headers,
            });

            const data = await response.json();

            if (!response.ok) {
                if (response.status === 401) {
                    logger.warn(`Unauthorized access at ${endpoint}. Clearing session.`);
                    localStorage.removeItem('token');
                    localStorage.removeItem('user');
                    if (!window.location.pathname.includes('/login')) {
                        window.location.href = '/login';
                    }
                }

                const errorMessage = data.message || `API Error: ${response.status} ${response.statusText}`;
                logger.error(`API Request Failed: ${endpoint}`, { status: response.status, data });
                throw new Error(errorMessage);
            }

            return data;
        } catch (error: any) {
            lastError = error;

            // Only retry on network errors or GET requests that failed with 5xx
            const isNetworkError = error instanceof TypeError && error.message === 'Failed to fetch';
            const isRetryableStatus = lastError.message?.includes('50') || lastError.message?.includes('502') || lastError.message?.includes('503') || lastError.message?.includes('504');
            const isGetRequest = !fetchOptions.method || fetchOptions.method.toUpperCase() === 'GET';

            if (i < retries && (isNetworkError || (isGetRequest && isRetryableStatus))) {
                logger.warn(`Retrying request to ${endpoint} (${i + 1}/${retries})...`);
                await new Promise(resolve => setTimeout(resolve, retryDelay * (i + 1))); // Exponential backoff
                continue;
            }
            break;
        }
    }

    throw lastError;
};

// --- AUTH ---
export const loginUser = async (credentials: { contactNumber: string, password?: string }): Promise<User> => {
    const data = await request('/auth/login', {
        method: 'POST',
        body: JSON.stringify(credentials),
    });
    localStorage.setItem('token', data.token);
    return data;
};

export const recordLogout = async (actor: any): Promise<{}> => {
    localStorage.removeItem('token');
    return Promise.resolve({});
};

// --- USERS & ROLES ---
export const fetchUsers = async (): Promise<User[]> => request('/users');
export const addUser = async (user: any, actor: any): Promise<User> => request('/users', { method: 'POST', body: JSON.stringify(user) });
export const updateUser = async (user: any, actor: any): Promise<User> => request(`/users/${user.id}`, { method: 'PUT', body: JSON.stringify(user) });
export const deleteUser = async (userId: string, actor: any): Promise<{ id: string }> => request(`/users/${userId}`, { method: 'DELETE' });

export const fetchRoles = async (): Promise<Role[]> => request('/roles');
export const addRole = async (role: any, actor: any): Promise<Role> => request('/roles', { method: 'POST', body: JSON.stringify(role) });
export const updateRole = async (role: any, actor: any): Promise<Role> => request(`/roles/${role.id}`, { method: 'PUT', body: JSON.stringify(role) });
export const deleteRole = async (roleId: string, actor: any): Promise<{ id: string }> => request(`/roles/${roleId}`, { method: 'DELETE' });

// --- BUYERS ---
export const fetchBuyers = async (): Promise<Buyer[]> => request('/buyers');
export const fetchBuyer = async (id: string): Promise<Buyer | null> => request(`/buyers/${id}`);
export const addBuyer = async (buyer: any, actor: any): Promise<Buyer> => request('/buyers', { method: 'POST', body: JSON.stringify(buyer) });
export const updateBuyer = async (buyer: any, actor: any): Promise<Buyer> => request(`/buyers/${buyer.id}`, { method: 'PUT', body: JSON.stringify(buyer) });
export const deleteBuyer = async (id: string, actor: any): Promise<{ id: string }> => request(`/buyers/${id}`, { method: 'DELETE' });

// --- SUPPLIERS ---
export const fetchSuppliers = async (): Promise<Supplier[]> => request('/suppliers');
export const fetchSupplier = async (id: string): Promise<Supplier | null> => request(`/suppliers/${id}`);
export const addSupplier = async (supplier: any, actor: any): Promise<Supplier> => request('/suppliers', { method: 'POST', body: JSON.stringify(supplier) });
export const updateSupplier = async (supplier: any, actor: any): Promise<Supplier> => request(`/suppliers/${supplier.id}`, { method: 'PUT', body: JSON.stringify(supplier) });
export const deleteSupplier = async (id: string, actor: any): Promise<{ id: string }> => request(`/suppliers/${id}`, { method: 'DELETE' });

// --- PRODUCTS ---
export const fetchProducts = async (): Promise<Product[]> => request('/products');
export const fetchProduct = async (id: string): Promise<Product | null> => request(`/products/${id}`);
export const addProduct = async (product: any, actor: any): Promise<Product> => request('/products', { method: 'POST', body: JSON.stringify(product) });
export const updateProduct = async (product: any, actor: any): Promise<Product> => request(`/products/${product.id}`, { method: 'PUT', body: JSON.stringify(product) });
export const deleteProduct = async (id: string, actor: any): Promise<{ id: string }> => request(`/products/${id}`, { method: 'DELETE' });

// --- ENTRIES ---
export const fetchEntries = async (filters?: any): Promise<Entry[]> => {
    const query = filters ? new URLSearchParams(filters).toString() : '';
    return request(`/entries${query ? `?${query}` : ''}`);
};
export const addEntry = async (entry: any, actor: any): Promise<Entry> => request('/entries', { method: 'POST', body: JSON.stringify(entry) });
export const updateEntry = async (entry: any, actor: any): Promise<Entry> => request(`/entries/${entry.id}`, { method: 'PUT', body: JSON.stringify(entry) });
export const deleteEntry = async (id: string, actor: any): Promise<{ id: string }> => request(`/entries/${id}`, { method: 'DELETE' });

// --- INVOICES ---
export const fetchInvoices = async (filters?: any): Promise<Invoice[]> => {
    const query = filters ? new URLSearchParams(filters).toString() : '';
    return request(`/invoices${query ? `?${query}` : ''}`);
};
export const fetchInvoice = async (id: string): Promise<Invoice | null> => request(`/invoices/${id}`);
export const addInvoice = async (invoice: any, actor: any): Promise<Invoice> => request('/invoices', { method: 'POST', body: JSON.stringify(invoice) });
export const deleteInvoice = async (id: string, actor: any): Promise<{ id: string }> => request(`/invoices/${id}`, { method: 'DELETE' });

// --- SUPPLIER INVOICES ---
export const fetchSupplierInvoices = async (filters?: any): Promise<SupplierInvoice[]> => {
    const query = filters ? new URLSearchParams(filters).toString() : '';
    return request(`/supplier-invoices${query ? `?${query}` : ''}`);
};
export const fetchSupplierInvoice = async (id: string): Promise<SupplierInvoice | null> => request(`/supplier-invoices/${id}`);
export const addSupplierInvoice = async (invoice: any, actor: any): Promise<SupplierInvoice> => {
    console.log('API: addSupplierInvoice payload:', JSON.stringify(invoice, null, 2));
    console.log('API: entryIds type:', typeof invoice.entryIds, 'isArray:', Array.isArray(invoice.entryIds));
    return request('/supplier-invoices', { method: 'POST', body: JSON.stringify(invoice) });
};
export const deleteSupplierInvoice = async (id: string, actor: any): Promise<{ id: string }> => request(`/supplier-invoices/${id}`, { method: 'DELETE' });

// --- CASH FLOW ---
export const fetchCashFlowTransactions = async (startDate?: string, endDate?: string): Promise<CashFlowTransaction[]> => {
    const params = new URLSearchParams();
    if (startDate) params.append('startDate', startDate);
    if (endDate) params.append('endDate', endDate);
    return request(`/cash-flow?${params.toString()}`);
};

export const fetchOpeningBalance = async (date: string): Promise<{ total: number, cash: number, bank: number }> => {
    return request(`/cash-flow/opening-balance?date=${date}`);
};
export const addCashFlowTransaction = async (txn: any, actor: any): Promise<CashFlowTransaction> => request('/cash-flow', { method: 'POST', body: JSON.stringify(txn) });
export const deleteCashFlowTransaction = async (id: string, actor: any): Promise<{ id: string }> => request(`/cash-flow/${id}`, { method: 'DELETE' });

// --- REPORTS & DASHBOARD ---
export const fetchStats = async (): Promise<Stats> => request('/reports/dashboard');
export const fetchDashboardData = async (): Promise<any> => request('/reports/dashboard'); // Alias
export const fetchSalesReports = async (filters?: any): Promise<Invoice[]> => {
    const query = new URLSearchParams(filters).toString();
    return request(`/reports/sales?${query}`);
};
export const fetchPurchaseReports = async (filters?: any): Promise<SupplierInvoice[]> => {
    const query = new URLSearchParams(filters).toString();
    return request(`/reports/purchases?${query}`);
};
export const fetchLedger = async (filters?: any): Promise<LedgerReportData> => {
    const query = new URLSearchParams(filters).toString();
    return request(`/reports/ledger?${query}`);
};
export const fetchProfitLoss = async (filters?: any): Promise<any> => {
    const query = new URLSearchParams(filters).toString();
    return request(`/reports/profit-loss?${query}`);
};

// --- AUDIT ---
export const fetchAuditLogs = async (filters?: any): Promise<AuditLog[]> => {
    const query = new URLSearchParams();
    if (filters) {
        Object.entries(filters).forEach(([key, value]) => {
            if (value) query.append(key, value as string);
        });
    }
    return request(`/audit-logs?${query.toString()}`);
};
export const addAuditLog = async (log: any): Promise<void> => { }; // Backend handles this automatically

// --- UTILS ---
export const createId = () => `temp_${Date.now()}`; // Client-side temp ID
export const formatCurrency = (amount: number) => new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR' }).format(amount);
export const getISODateString = (date: Date) => date.toISOString().split('T')[0];

// --- MISSING EXPORTS IMPLEMENTATION ---

// Buyers
export const fetchInvoicesForBuyer = async (buyerId: string): Promise<Invoice[]> => {
    // Fetch buyer to get both ID formats
    const buyer = await fetchBuyer(buyerId);
    if (!buyer) return [];

    const allInvoices = await fetchInvoices();
    // Match against both custom ID and MongoDB _id for backward compatibility
    const buyerMongoId = (buyer as any)._id;
    return allInvoices.filter(inv => inv.buyerId === buyer.id || (buyerMongoId && inv.buyerId === buyerMongoId));
};

export const fetchBuyerDetailStats = async (buyerId: string): Promise<any> => {
    return request(`/invoices/buyer-stats/${buyerId}`);
};

export const fetchDraftItemsForBuyer = async (buyerId: string): Promise<any[]> => {
    return request(`/invoices/draft-items/${buyerId}`);
};

export const fetchBuyerInvoicesAnalytics = async (filters?: any): Promise<any> => {
    const [invoices, buyers] = await Promise.all([fetchInvoices(), fetchBuyers()]);

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

    return { stats, topBuyersByOutstanding, topBuyersBySales };
};

export const updateInvoice = async (invoice: any, actor: any): Promise<Invoice> => request(`/invoices/${invoice.id}`, { method: 'PUT', body: JSON.stringify(invoice) });

export const addIncome = async (transaction: any, actor: any): Promise<CashFlowTransaction> => {
    return addCashFlowTransaction({ ...transaction, type: 'Income' }, actor);
};

export const changeBuyerForItem = async (entryId: string, itemId: string, buyerId: string, actor: any): Promise<void> => {
    // This requires updating the entry.
    // Since we don't have a specific endpoint for this, we'll fetch, modify, and update.
    const entries = await fetchEntries();
    const entry = entries.find(e => e.id === entryId);
    if (entry) {
        const item = entry.items.find((i: any) => i.id === itemId);
        if (item) {
            (item as any).buyerId = buyerId;
            await updateEntry(entry, actor);
        }
    }
};

// Suppliers
export const fetchSupplierInvoicesForSupplier = async (supplierId: string): Promise<SupplierInvoice[]> => {
    const all = await fetchSupplierInvoices();
    return all.filter(inv => inv.supplierId === supplierId);
};

export const fetchSupplierDetailStats = async (supplierId: string): Promise<any> => {
    const invoices = await fetchSupplierInvoicesForSupplier(supplierId);

    // We also need pending entries count.
    const allEntries = await fetchEntries();
    const pendingEntriesCount = allEntries.filter(e => e.supplierId === supplierId && e.status !== EntryStatus.Invoiced).length;

    const stats = invoices.reduce((acc, inv) => {
        acc.totalSales += inv.grossTotal || 0;
        acc.totalNettPayable += inv.nettAmount || 0;
        acc.totalPayments += inv.paidAmount || 0;
        acc.totalCommission += inv.commissionAmount || 0;
        acc.totalWages += inv.wages || 0;

        const adj = inv.adjustments || 0;
        if (adj > 0) acc.positiveAdjustments += adj;
        else acc.negativeAdjustments += adj;

        return acc;
    }, {
        totalSales: 0,
        totalNettPayable: 0,
        totalPayments: 0,
        totalCommission: 0,
        totalWages: 0,
        positiveAdjustments: 0,
        negativeAdjustments: 0,
        pendingEntriesCount: 0
    });

    stats.pendingEntriesCount = pendingEntriesCount;

    return stats;
};

export const fetchSupplierInvoicesAnalytics = async (filters?: any): Promise<any> => {
    return request('/supplier-invoices/analytics');
};

export const addSupplierPayment = async (transaction: any, actor: any): Promise<CashFlowTransaction> => {
    return addCashFlowTransaction({ ...transaction, type: 'Expense', category: 'Supplier Payment' }, actor);
};

export const updateSupplierInvoice = async (invoice: any, actor: any): Promise<SupplierInvoice> => request(`/supplier-invoices/${invoice.id}`, { method: 'PUT', body: JSON.stringify(invoice) });

// CashFlow
export const addOtherExpense = async (transaction: any, actor: any): Promise<CashFlowTransaction> => {
    return addCashFlowTransaction({ ...transaction, type: 'Expense' }, actor);
};

export const updateCashFlowTransaction = async (txn: any, actor: any): Promise<CashFlowTransaction> => {
    return request(`/cash-flow/${txn.id}`, { method: 'PUT', body: JSON.stringify(txn) });
};

// Products
export const fetchProductAnalytics = async (productId: string): Promise<any> => {
    return { totalSold: 0, totalRevenue: 0 }; // Stub
};

export const fetchProductDetailData = async (productId: string, filters?: { startDate?: string; endDate?: string }): Promise<any> => {
    const params = new URLSearchParams();
    if (filters?.startDate) params.append('startDate', filters.startDate);
    if (filters?.endDate) params.append('endDate', filters.endDate);
    const queryString = params.toString();
    return request(`/products/${productId}/details${queryString ? `?${queryString}` : ''}`);
};

// Reports Generators
export const generateAnalyticsDashboardData = async (filters?: any): Promise<any> => {
    const query = filters ? new URLSearchParams(filters).toString() : '';
    return request(`/reports/analytics-dashboard${query ? `?${query}` : ''}`);
};
export const generateSalesReport = async (filters: any): Promise<SalesReportData> => fetchSalesReports(filters) as any;
export const generatePurchaseReport = async (filters: any): Promise<PurchaseReportData> => fetchPurchaseReports(filters) as any;
export const generateProfitAndLoss = async (filters: any): Promise<any> => fetchProfitLoss(filters);
export const generateLedger = async (filters: any): Promise<LedgerReportData> => fetchLedger(filters) as any;

// Stubs for specific reports
export const generateWagesReport = async (filters: any): Promise<any> => {
    const query = new URLSearchParams(filters).toString();
    return request(`/reports/wages?${query}`);
};
export const generateSupplierWagesReport = async (filters: any): Promise<any> => {
    const query = new URLSearchParams(filters).toString();
    return request(`/reports/supplier-wages?${query}`);
};
export const generateBuyerBalanceSheet = async (filters: any): Promise<any> => {
    const query = new URLSearchParams(filters).toString();
    return request(`/reports/buyer-balance-sheet?${query}`);
};
export const generateSupplierBalanceSheet = async (filters: any): Promise<any> => {
    const query = new URLSearchParams(filters).toString();
    return request(`/reports/supplier-balance-sheet?${query}`);
};
export const generateCashFlowReport = async (filters: any): Promise<any> => {
    const query = new URLSearchParams(filters).toString();
    return request(`/reports/cash-flow-details?${query}`);
};
export const generateIncomeLedger = async (filters: any): Promise<any> => {
    const query = new URLSearchParams(filters).toString();
    return request(`/reports/income-ledger?${query}`);
};
export const generateExpenseLedger = async (filters: any): Promise<any> => {
    const query = new URLSearchParams(filters).toString();
    return request(`/reports/expense-ledger?${query}`);
};
export const generateInvoiceAgingReport = async (filters: any): Promise<any> => {
    const query = new URLSearchParams(filters).toString();
    return request(`/reports/invoice-aging?${query}`);
};
export const generateProductSalesReport = async (filters: any): Promise<any> => {
    const query = new URLSearchParams(filters).toString();
    return request(`/reports/product-sales?${query}`);
};
export const generateAdjustmentsReport = async (filters: any): Promise<any> => {
    const query = new URLSearchParams(filters).toString();
    return request(`/reports/adjustments?${query}`);
};
export const generateDiscountReport = async (filters: any): Promise<any> => {
    const query = new URLSearchParams(filters).toString();
    return request(`/reports/discounts?${query}`);
};
export const generateCommissionReport = async (filters: any): Promise<any> => {
    const query = new URLSearchParams(filters).toString();
    return request(`/reports/commission?${query}`);
};
