import { Request, Response } from 'express';
import Invoice from '../models/Invoice';
import SupplierInvoice from '../models/SupplierInvoice';
import CashFlowTransaction from '../models/CashFlowTransaction';
import Buyer from '../models/Buyer';
import Supplier from '../models/Supplier';
import Product from '../models/Product';


// Helper to build date query
const buildDateQuery = (startDate: any, endDate: any, fieldName: string = 'createdAt') => {
    let query: any = {};
    if (startDate || endDate) {
        query[fieldName] = {};
        if (startDate) {
            const start = new Date(startDate as string);
            start.setHours(0, 0, 0, 0);
            query[fieldName].$gte = start;
        }
        if (endDate) {
            const end = new Date(endDate as string);
            end.setHours(23, 59, 59, 999);
            query[fieldName].$lte = end;
        }
    }
    return query;
};

export const getWagesReport = async (req: Request, res: Response) => {
    try {
        const { startDate, endDate } = req.query;
        const query = buildDateQuery(startDate, endDate);
        const invoices = await Invoice.find(query);
        const buyers = await Buyer.find({});

        const details = invoices.map(inv => {
            const buyer = buyers.find(b => b.id === inv.buyerId);
            return {
                invoiceId: inv.id,
                invoiceNumber: inv.invoiceNumber,
                createdAt: inv.createdAt,
                buyerName: buyer?.buyerName || 'Unknown',
                wages: inv.wages || 0,
                invoiceTotal: inv.nettAmount
            };
        });

        const totalWages = details.reduce((sum, d) => sum + d.wages, 0);

        res.json({
            summary: { totalWages, invoiceCount: details.length },
            details
        });
    } catch (error: any) {
        res.status(500).json({ message: error.message });
    }
};

export const getSupplierWagesReport = async (req: Request, res: Response) => {
    try {
        const { startDate, endDate } = req.query;
        const query = buildDateQuery(startDate, endDate);
        const invoices = await SupplierInvoice.find(query);
        const suppliers = await Supplier.find({});

        const details = invoices.map(inv => {
            const supplier = suppliers.find(s => s.id === inv.supplierId);
            return {
                invoiceId: inv.id,
                invoiceNumber: inv.invoiceNumber,
                createdAt: inv.createdAt,
                supplierName: supplier?.supplierName || 'Unknown',
                wages: inv.wages || 0,
                invoiceTotal: inv.nettAmount
            };
        });

        const totalWages = details.reduce((sum, d) => sum + d.wages, 0);

        res.json({
            summary: { totalWages, invoiceCount: details.length },
            details
        });
    } catch (error: any) {
        res.status(500).json({ message: error.message });
    }
};

export const getBuyerBalanceSheet = async (req: Request, res: Response) => {
    try {
        const buyers = await Buyer.find({});
        const { asOfDate } = req.query;

        // Aggregate to find the last invoice date for each buyer
        const lastInvoices = await Invoice.aggregate([
            { $sort: { createdAt: -1 } },
            {
                $group: {
                    _id: "$buyerId",
                    lastInvoiceDate: { $first: "$createdAt" }
                }
            }
        ]);

        const lastInvoiceMap = new Map();
        lastInvoices.forEach(item => {
            lastInvoiceMap.set(item._id, item.lastInvoiceDate);
        });

        const balances = buyers.map(b => ({
            id: b.id,
            buyerId: b.id,
            buyerName: b.buyerName,
            contactNumber: b.contactNumber,
            balance: b.outstanding,
            lastInvoiceDate: lastInvoiceMap.get(b.id)
        }));

        res.json({
            asOfDate: asOfDate || new Date().toISOString().split('T')[0],
            balances
        });
    } catch (error: any) {
        res.status(500).json({ message: error.message });
    }
};

export const getSupplierBalanceSheet = async (req: Request, res: Response) => {
    try {
        const suppliers = await Supplier.find({});
        const balances = suppliers.map(s => ({
            id: s.id,
            supplierId: s.id,
            supplierName: s.supplierName,
            balance: s.outstanding
        }));

        res.json({
            asOfDate: req.query.asOfDate || new Date().toISOString().split('T')[0],
            balances
        });
    } catch (error: any) {
        res.status(500).json({ message: error.message });
    }
};

export const getCashFlowDetails = async (req: Request, res: Response) => {
    try {
        const { startDate, endDate } = req.query;
        const query = buildDateQuery(startDate, endDate, 'date');
        const transactions = await CashFlowTransaction.find(query).sort({ date: -1 });
        const incomeTransactions = transactions.filter(t => t.type === 'Income');
        const expenseTransactions = transactions.filter(t => t.type === 'Expense');

        res.json({
            incomeTransactions,
            expenseTransactions
        });
    } catch (error: any) {
        res.status(500).json({ message: error.message });
    }
};

export const getIncomeLedger = async (req: Request, res: Response) => {
    try {
        const { startDate, endDate } = req.query;
        const query = { ...buildDateQuery(startDate, endDate, 'date'), type: 'Income' };
        const transactions = await CashFlowTransaction.find(query).sort({ date: -1 });
        const totalIncome = transactions.reduce((sum, t) => sum + t.amount, 0);

        res.json({
            summary: { totalIncome, transactionCount: transactions.length },
            transactions
        });
    } catch (error: any) {
        res.status(500).json({ message: error.message });
    }
};

export const getExpenseLedger = async (req: Request, res: Response) => {
    try {
        const { startDate, endDate } = req.query;
        const query = { ...buildDateQuery(startDate, endDate, 'date'), type: 'Expense' };
        const transactions = await CashFlowTransaction.find(query).sort({ date: -1 });
        const totalExpense = transactions.reduce((sum, t) => sum + t.amount, 0);

        res.json({
            summary: { totalExpense, transactionCount: transactions.length },
            transactions
        });
    } catch (error: any) {
        res.status(500).json({ message: error.message });
    }
};

export const getInvoiceAging = async (req: Request, res: Response) => {
    try {
        const invoices = await Invoice.find({});
        const buyers = await Buyer.find({});
        const asOfDate = new Date(req.query.asOfDate as string || new Date());

        const buyerAging: any = {};

        invoices.forEach(inv => {
            const balance = inv.nettAmount - inv.paidAmount;
            if (balance <= 0) return;

            if (!buyerAging[inv.buyerId]) {
                const buyer = buyers.find(b => b.id === inv.buyerId);
                buyerAging[inv.buyerId] = {
                    buyerId: inv.buyerId,
                    buyerName: buyer?.buyerName || 'Unknown',
                    totalOverdue: 0,
                    buckets: { '0-30': 0, '31-60': 0, '61-90': 0, '90+': 0 }
                };
            }

            const daysOld = Math.floor((asOfDate.getTime() - new Date(inv.createdAt).getTime()) / (1000 * 60 * 60 * 24));

            buyerAging[inv.buyerId].totalOverdue += balance;

            if (daysOld <= 30) buyerAging[inv.buyerId].buckets['0-30'] += balance;
            else if (daysOld <= 60) buyerAging[inv.buyerId].buckets['31-60'] += balance;
            else if (daysOld <= 90) buyerAging[inv.buyerId].buckets['61-90'] += balance;
            else buyerAging[inv.buyerId].buckets['90+'] += balance;
        });

        const details = Object.values(buyerAging).map((d: any) => ({
            ...d,
            id: d.buyerId  // Add unique id for React keys
        }));
        const totalOverdue = details.reduce((sum: number, d: any) => sum + d.totalOverdue, 0);

        res.json({
            summary: { totalOverdue, buyerCount: details.length },
            details
        });
    } catch (error: any) {
        res.status(500).json({ message: error.message });
    }
};

export const getProductSalesReport = async (req: Request, res: Response) => {
    try {
        const { startDate, endDate } = req.query;
        const query = buildDateQuery(startDate, endDate);
        const invoices = await Invoice.find(query);
        const products = await Product.find({});

        const productSales: any = {};

        invoices.forEach(inv => {
            inv.items.forEach((item: any) => {
                if (!productSales[item.productId]) {
                    const product = products.find(p => p.id === item.productId);
                    productSales[item.productId] = {
                        productId: item.productId,
                        productName: product?.productName || 'Unknown',
                        quantitySold: 0,
                        totalValue: 0,
                        buyerCount: new Set()
                    };
                }

                productSales[item.productId].quantitySold += item.quantity;
                productSales[item.productId].totalValue += item.subTotal;
                productSales[item.productId].buyerCount.add(inv.buyerId);
            });
        });

        const details = Object.values(productSales).map((p: any) => ({
            ...p,
            id: p.productId,
            buyerCount: p.buyerCount.size,
            averagePrice: p.quantitySold > 0 ? p.totalValue / p.quantitySold : 0
        }));

        const totalQuantity = details.reduce((sum: number, d: any) => sum + d.quantitySold, 0);
        const totalValue = details.reduce((sum: number, d: any) => sum + d.totalValue, 0);

        res.json({
            summary: { totalQuantity, totalValue, productCount: details.length },
            details
        });
    } catch (error: any) {
        res.status(500).json({ message: error.message });
    }
};

export const getAdjustmentsReport = async (req: Request, res: Response) => {
    try {
        const { startDate, endDate } = req.query;
        const query = buildDateQuery(startDate, endDate);
        const invoices = await Invoice.find(query);
        const buyers = await Buyer.find({});

        const details = invoices
            .filter(inv => inv.adjustments && inv.adjustments !== 0)
            .map(inv => {
                const buyer = buyers.find(b => b.id === inv.buyerId);
                return {
                    invoiceId: inv.id,
                    invoiceNumber: inv.invoiceNumber,
                    createdAt: inv.createdAt,
                    buyerName: buyer?.buyerName || 'Unknown',
                    adjustmentAmount: inv.adjustments || 0
                };
            });

        const totalAdjustments = details.reduce((sum, d) => sum + d.adjustmentAmount, 0);
        const positiveAdjustments = details.filter(d => d.adjustmentAmount > 0).reduce((sum, d) => sum + d.adjustmentAmount, 0);
        const negativeAdjustments = details.filter(d => d.adjustmentAmount < 0).reduce((sum, d) => sum + Math.abs(d.adjustmentAmount), 0);

        res.json({
            summary: { totalAdjustments, positiveAdjustments, negativeAdjustments, invoiceCount: details.length },
            details
        });
    } catch (error: any) {
        res.status(500).json({ message: error.message });
    }
};

export const getDiscountReport = async (req: Request, res: Response) => {
    try {
        const { startDate, endDate, buyerId } = req.query;
        const dateQuery = buildDateQuery(startDate, endDate);

        // 1. Fetch Invoices with discount
        const invoiceQuery: any = { ...dateQuery, discount: { $gt: 0 } };
        if (buyerId) {
            invoiceQuery.buyerId = buyerId;
        }
        const invoices = await Invoice.find(invoiceQuery);

        // 2. Fetch CashFlow Income with discount
        const cashFlowQuery: any = {
            ...buildDateQuery(startDate, endDate, 'date'),
            type: 'Income',
            discount: { $gt: 0 }
        };
        if (buyerId) {
            cashFlowQuery.entityId = buyerId;
        }
        const transactions = await CashFlowTransaction.find(cashFlowQuery);

        const buyers = await Buyer.find({});
        const details: any[] = [];

        // Process Invoices
        invoices.forEach(inv => {
            const buyer = buyers.find(b => b.id === inv.buyerId);
            details.push({
                id: `inv-${inv.id}`,
                date: inv.createdAt,
                buyerId: inv.buyerId,
                buyerName: buyer?.buyerName || 'Unknown',
                type: 'Invoice',
                relatedDocument: inv.invoiceNumber,
                discountAmount: inv.discount,
                description: 'Discount on Invoice Creation'
            });
        });

        // Process CashFlow Transactions (Payment Discounts)
        transactions.forEach(txn => {
            const buyer = buyers.find(b => b.id === txn.entityId);
            details.push({
                id: `txn-${txn.id}`,
                date: txn.date,
                buyerId: txn.entityId || '',
                buyerName: buyer?.buyerName || txn.entityName || 'Unknown',
                type: 'Payment',
                relatedDocument: txn.reference || txn.method,
                discountAmount: txn.discount || 0,
                description: txn.description || 'Discount on Payment'
            });
        });

        // Sort by date descending
        details.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

        const totalDiscounts = details.reduce((sum, d) => sum + d.discountAmount, 0);
        const totalInvoiceDiscounts = details.filter(d => d.type === 'Invoice').reduce((sum, d) => sum + d.discountAmount, 0);
        const totalPaymentDiscounts = details.filter(d => d.type === 'Payment').reduce((sum, d) => sum + d.discountAmount, 0);

        res.json({
            summary: {
                totalDiscounts,
                totalInvoiceDiscounts,
                totalPaymentDiscounts,
                transactionCount: details.length
            },
            details
        });
    } catch (error: any) {
        res.status(500).json({ message: error.message });
    }
};

export const getCommissionReport = async (req: Request, res: Response) => {
    try {
        const { startDate, endDate } = req.query;
        const query = buildDateQuery(startDate, endDate);
        const invoices = await SupplierInvoice.find(query);
        const suppliers = await Supplier.find({});

        const details = invoices.map(inv => {
            const supplier = suppliers.find(s => s.id === inv.supplierId);
            return {
                invoiceId: inv.id,
                invoiceNumber: inv.invoiceNumber,
                createdAt: inv.createdAt,
                supplierName: supplier?.supplierName || 'Unknown',
                grossTotal: inv.grossTotal,
                commissionRate: inv.commissionRate,
                commissionAmount: inv.commissionAmount
            };
        });

        const totalCommission = details.reduce((sum, d) => sum + d.commissionAmount, 0);
        const totalGrossSales = details.reduce((sum, d) => sum + d.grossTotal, 0);
        const averageCommissionRate = details.length > 0
            ? details.reduce((sum, d) => sum + d.commissionRate, 0) / details.length
            : 0;

        res.json({
            summary: {
                totalCommission,
                totalGrossSales,
                averageCommissionRate,
                invoiceCount: details.length
            },
            details
        });
    } catch (error: any) {
        res.status(500).json({ message: error.message });
    }
};
