import express from 'express';
import { getDashboardStats, getSalesReport, getPurchaseReport, getLedger, getProfitLoss, getAnalyticsDashboardStats } from '../controllers/reportController';
import {
    getWagesReport,
    getSupplierWagesReport,
    getBuyerBalanceSheet,
    getSupplierBalanceSheet,
    getCashFlowDetails,
    getIncomeLedger,
    getExpenseLedger,
    getInvoiceAging,
    getProductSalesReport,
    getAdjustmentsReport,
    getDiscountReport,
    getCommissionReport
} from '../controllers/additionalReportController';
import { protect } from '../middleware/authMiddleware';
import { checkPermission } from '../middleware/roleMiddleware';

const router = express.Router();

router.use(protect);

router.get('/dashboard', checkPermission('dashboard.view_page.view'), getDashboardStats);
router.get('/analytics-dashboard', checkPermission('reports.analytics_kpis.view'), getAnalyticsDashboardStats);
router.get('/sales', checkPermission('reports.sales.view'), getSalesReport);
router.get('/purchases', checkPermission('reports.purchases.view'), getPurchaseReport);
router.get('/ledger', checkPermission('reports.buyer_ledger.view'), getLedger);
router.get('/profit-loss', checkPermission('reports.pnl.view'), getProfitLoss);

// Additional report routes
router.get('/wages', checkPermission('reports.wages_report.view'), getWagesReport);
router.get('/supplier-wages', checkPermission('reports.wages_report.view'), getSupplierWagesReport);
router.get('/buyer-balance-sheet', checkPermission('reports.buyer_balance_sheet.view'), getBuyerBalanceSheet);
router.get('/supplier-balance-sheet', checkPermission('reports.supplier_balance_sheet.view'), getSupplierBalanceSheet);
router.get('/cash-flow-details', checkPermission('reports.cash_flow_details.view'), getCashFlowDetails);
router.get('/income-ledger', checkPermission('reports.income_ledger.view'), getIncomeLedger);
router.get('/expense-ledger', checkPermission('reports.expense_ledger.view'), getExpenseLedger);
router.get('/invoice-aging', checkPermission('reports.invoice_aging.view'), getInvoiceAging);
router.get('/product-sales', checkPermission('reports.product_sales.view'), getProductSalesReport);
router.get('/adjustments', checkPermission('reports.adjustments_report.view'), getAdjustmentsReport);
router.get('/discounts', checkPermission('reports.discount_report.view'), getDiscountReport);
router.get('/commission', checkPermission('reports.commission_report.view'), getCommissionReport);
export default router;
