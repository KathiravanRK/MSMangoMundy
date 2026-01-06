import { Request, Response } from 'express';
import Invoice from '../models/Invoice';
import SupplierInvoice from '../models/SupplierInvoice';
import CashFlowTransaction from '../models/CashFlowTransaction';
import Buyer from '../models/Buyer';
import Supplier from '../models/Supplier';
import Product from '../models/Product';
import Entry from '../models/Entry';

// --- Dashboard ---
export const getDashboardStats = async (req: Request, res: Response) => {
    try {
        const buyers = await Buyer.find({});
        const suppliers = await Supplier.find({});
        const products = await Product.find({});
        const entries = await Entry.find({});
        const invoices = await Invoice.find({});
        const supplierInvoices = await SupplierInvoice.find({});
        const transactions = await CashFlowTransaction.find({}).sort({ date: -1 });

        // 1. KPIs
        const totalReceivables = buyers.reduce((sum, b) => sum + b.outstanding, 0);
        const totalPayables = Math.abs(suppliers.reduce((sum, s) => sum + (s.outstanding < 0 ? s.outstanding : 0), 0));

        const today = new Date();
        const startOfDay = new Date(today.setHours(0, 0, 0, 0));
        const endOfDay = new Date(today.setHours(23, 59, 59, 999));

        const todayEntries = entries.filter(e => e.createdAt >= startOfDay && e.createdAt <= endOfDay);
        const todayEntriesCount = todayEntries.length;
        const todayAuctionValue = todayEntries.reduce((sum, e) => sum + (e.totalAmount || 0), 0);

        const todaySupplierInvoices = supplierInvoices.filter(i => i.createdAt >= startOfDay && i.createdAt <= endOfDay);
        const todayCommission = todaySupplierInvoices.reduce((sum, i) => sum + i.commissionAmount, 0);

        let uninvoicedAuctionValue = 0;
        entries.forEach(e => {
            e.items.forEach((item: any) => {
                if (item.buyerId && !item.invoiceId) {
                    uninvoicedAuctionValue += item.subTotal || 0;
                }
            });
        });

        // 2. Charts & Lists

        // Entry Status Distribution
        const statusCounts: any = {};
        entries.forEach(e => {
            statusCounts[e.status] = (statusCounts[e.status] || 0) + 1;
        });
        const entryStatusDistribution = Object.keys(statusCounts).map(status => ({
            name: status,
            value: statusCounts[status]
        }));

        // Cash Flow Chart (Last 30 days)
        const cashFlowMap: any = {};
        transactions.forEach(t => {
            const dateStr = new Date(t.date).toISOString().split('T')[0];
            if (!cashFlowMap[dateStr]) cashFlowMap[dateStr] = { date: dateStr, income: 0, expense: 0 };
            if (t.type === 'Income') cashFlowMap[dateStr].income += t.amount;
            else cashFlowMap[dateStr].expense += t.amount;
        });
        const cashFlowChart = Object.values(cashFlowMap).sort((a: any, b: any) => new Date(a.date).getTime() - new Date(b.date).getTime());

        // Top Products (by Sales Value from Invoices)
        const productSales: any = {};
        invoices.forEach(inv => {
            inv.items.forEach((item: any) => {
                if (!productSales[item.productId]) productSales[item.productId] = 0;
                productSales[item.productId] += item.subTotal;
            });
        });
        const topProducts = Object.keys(productSales).map(pid => {
            const p = products.find(prod => prod.id === pid);
            return { name: p ? p.productName : 'Unknown', value: productSales[pid] };
        }).sort((a, b) => b.value - a.value).slice(0, 5);

        // Sales by Buyer
        const buyerSales: any = {};
        invoices.forEach(inv => {
            if (!buyerSales[inv.buyerId]) buyerSales[inv.buyerId] = 0;
            buyerSales[inv.buyerId] += inv.nettAmount;
        });
        const salesByBuyer = Object.keys(buyerSales).map(bid => {
            const b = buyers.find(buy => buy.id === bid);
            return { name: b ? b.buyerName : 'Unknown', value: buyerSales[bid] };
        }).sort((a, b) => b.value - a.value).slice(0, 5);

        // Expense Breakdown
        const expenseMap: any = {};
        transactions.filter(t => t.type === 'Expense').forEach(t => {
            const cat = t.category || 'Other';
            if (!expenseMap[cat]) expenseMap[cat] = 0;
            expenseMap[cat] += t.amount;
        });
        const expenseBreakdown = Object.keys(expenseMap).map(cat => ({
            name: cat,
            value: expenseMap[cat]
        }));

        // Latest Transactions
        const latestTransactions = transactions.slice(0, 10);

        // Pending Entries
        const pendingEntries = entries.filter(e => e.status === 'Pending');

        // Uninvoiced Buyers with Entries
        const uninvoicedMap: any = {};
        entries.forEach(e => {
            e.items.forEach((item: any) => {
                if (item.buyerId && !item.invoiceId) {
                    if (!uninvoicedMap[item.buyerId]) {
                        const b = buyers.find(buy => buy.id === item.buyerId);
                        uninvoicedMap[item.buyerId] = {
                            buyerId: item.buyerId,
                            buyerName: b ? b.buyerName : 'Unknown',
                            entries: [],
                            totalAmount: 0,
                            totalItemCount: 0
                        };
                    }
                    // Add entry info if not already added for this buyer
                    let entryEntry = uninvoicedMap[item.buyerId].entries.find((ee: any) => ee.entryId === e.id);
                    if (!entryEntry) {
                        entryEntry = {
                            entryId: e.id,
                            entrySerialNumber: e.serialNumber,
                            itemCount: 0,
                            amount: 0
                        };
                        uninvoicedMap[item.buyerId].entries.push(entryEntry);
                    }
                    entryEntry.itemCount++;
                    entryEntry.amount += item.subTotal || 0;
                    uninvoicedMap[item.buyerId].totalAmount += item.subTotal || 0;
                    uninvoicedMap[item.buyerId].totalItemCount++;
                }
            });
        });
        const unInvoicedBuyersWithEntries = Object.values(uninvoicedMap);

        // Top Buyers by Outstanding
        const topBuyersByOutstanding = buyers
            .sort((a, b) => b.outstanding - a.outstanding)
            .slice(0, 5)
            .map(b => ({ name: b.buyerName, value: b.outstanding, id: b.id }));

        // Top Suppliers by Payable
        const topSuppliersByPayable = suppliers
            .map(s => ({ ...s, payable: Math.abs(s.outstanding < 0 ? s.outstanding : 0) }))
            .sort((a, b) => b.payable - a.payable)
            .slice(0, 5)
            .map(s => ({ name: s.supplierName, value: s.payable, id: s.id }));

        res.json({
            kpis: {
                totalReceivables,
                totalPayables,
                todayAuctionValue,
                todayCommission,
                todayEntriesCount,
                uninvoicedAuctionValue
            },
            entryStatusDistribution,
            cashFlowChart,
            topProducts,
            salesByBuyer,
            expenseBreakdown,
            latestTransactions,
            pendingEntries,
            unInvoicedBuyersWithEntries,
            topBuyersByOutstanding,
            topSuppliersByPayable
        });
    } catch (error: any) {
        res.status(500).json({ message: error.message });
    }
};

// --- Reports ---

export const getSalesReport = async (req: Request, res: Response) => {
    try {
        const { startDate, endDate, buyerId } = req.query;
        const query: any = {};
        if (startDate || endDate) {
            query.createdAt = {};
            if (startDate) {
                const start = new Date(startDate as string);
                start.setHours(0, 0, 0, 0);
                query.createdAt.$gte = start;
            }
            if (endDate) {
                const end = new Date(endDate as string);
                end.setHours(23, 59, 59, 999);
                query.createdAt.$lte = end;
            }
        }
        if (buyerId) {
            query.buyerId = buyerId;
        }

        const invoicesDocs = await Invoice.find(query).lean();

        // Manual populate buyer names
        const buyerIds = [...new Set(invoicesDocs.map((i: any) => i.buyerId))];
        const buyers = await Buyer.find({ id: { $in: buyerIds } });
        const buyerMap = new Map(buyers.map(b => [b.id, b.buyerName]));

        const invoices = invoicesDocs.map((inv: any) => {
            const nett = inv.nettAmount || 0;
            const discount = inv.discount || 0;
            const paid = inv.paidAmount || 0;

            // Fix Calculation Logic for Hybrid Data (Old vs New Invoice logic)
            // Old: nettAmount = Gross (no discount subtracted). Final = nett - discount.
            // New: nettAmount = Final (discount subtracted). Final = nett.

            const calculatedGross = (inv.totalAmount || 0) + (inv.wages || 0) + (inv.adjustments || 0);
            let finalAmount = nett;

            // Heuristic: If nett is exactly gross (and there is a discount), then it's likely Old Logic.
            // If nett is less than gross (by approx discount), it's New Logic.
            if (discount > 0 && Math.abs(nett - calculatedGross) < 0.01) {
                finalAmount = nett - discount;
            } else {
                finalAmount = nett;
            }

            const balance = finalAmount - paid;
            const buyerName = buyerMap.get(inv.buyerId) || 'Unknown';

            return { ...inv, nettAmount: finalAmount, balance, buyerName };
        });

        const summary = {
            totalSales: invoices.reduce((sum, inv) => sum + inv.nettAmount, 0),
            totalPaid: invoices.reduce((sum, inv) => sum + (inv.paidAmount || 0), 0),
            totalBalance: invoices.reduce((sum, inv) => sum + inv.balance, 0),
            invoiceCount: invoices.length
        };

        res.json({ invoices, summary });
    } catch (error: any) {
        res.status(500).json({ message: error.message });
    }
};

export const getPurchaseReport = async (req: Request, res: Response) => {
    try {
        const { startDate, endDate, supplierId } = req.query;
        const query: any = {};
        if (startDate || endDate) {
            query.createdAt = {};
            if (startDate) {
                const start = new Date(startDate as string);
                start.setHours(0, 0, 0, 0);
                query.createdAt.$gte = start;
            }
            if (endDate) {
                const end = new Date(endDate as string);
                end.setHours(23, 59, 59, 999);
                query.createdAt.$lte = end;
            }
        }
        if (supplierId) {
            query.supplierId = supplierId;
        }

        const invoicesDocs = await SupplierInvoice.find(query).lean();

        // Manual populate supplier names
        const supplierIds = [...new Set(invoicesDocs.map((i: any) => i.supplierId))];
        const suppliers = await Supplier.find({ id: { $in: supplierIds } });
        const supplierMap = new Map(suppliers.map(s => [s.id, s.supplierName]));

        const invoices = invoicesDocs.map((inv: any) => {
            const nett = inv.nettAmount || 0;
            const paid = inv.paidAmount || 0;
            const balance = nett - paid;
            const supplierName = supplierMap.get(inv.supplierId) || 'Unknown';

            return { ...inv, balance, supplierName };
        });

        const summary = {
            totalPurchases: invoices.reduce((sum, inv) => sum + (inv.nettAmount || 0), 0),
            totalPaid: invoices.reduce((sum, inv) => sum + (inv.paidAmount || 0), 0),
            totalBalance: invoices.reduce((sum, inv) => sum + inv.balance, 0),
            invoiceCount: invoices.length
        };

        res.json({ invoices, summary });
    } catch (error: any) {
        res.status(500).json({ message: error.message });
    }
};

export const getLedger = async (req: Request, res: Response) => {
    try {
        const { entityId, startDate, endDate } = req.query;
        // Ledger requires combining Invoices and Payments for a specific entity

        if (!entityId) return res.status(400).json({ message: 'Entity ID required' });

        const dateFilter: any = {};
        if (startDate || endDate) {
            if (startDate) {
                const start = new Date(startDate as string);
                start.setHours(0, 0, 0, 0);
                dateFilter.$gte = start;
            }
            if (endDate) {
                const end = new Date(endDate as string);
                end.setHours(23, 59, 59, 999);
                dateFilter.$lte = end;
            }
        }

        // Check if Buyer or Supplier
        const buyer = await Buyer.findOne({ id: entityId });
        const supplier = await Supplier.findOne({ id: entityId });

        let ledgerEntries: any[] = [];
        let entityName = '';
        let outstanding = 0;
        let balanceBroughtForward = 0;

        if (buyer) {
            entityName = buyer.buyerName;
            outstanding = buyer.outstanding;

            // 1. Calculate Opening Balance (Transactions & Invoices before startDate)
            if (startDate) {
                const start = new Date(startDate as string);
                start.setHours(0, 0, 0, 0);

                const prevInvoices = await Invoice.find({ buyerId: entityId, createdAt: { $lt: start } });
                const prevTransactions = await CashFlowTransaction.find({ entityId: entityId, date: { $lt: start } });

                const totalInvoiced = prevInvoices.reduce((sum, inv) => sum + inv.nettAmount, 0); // Debit

                let totalDebit = totalInvoiced;
                let totalCredit = 0;

                prevTransactions.forEach(t => {
                    const totalAmt = t.amount + (t.discount || 0);
                    if (t.type === 'Income') {
                        // Payment FROM Buyer -> Credit (Reduces Balance)
                        totalCredit += totalAmt;
                    } else if (t.type === 'Expense') {
                        // Refund TO Buyer -> Debit (Increases Balance / Restores Debt)
                        totalDebit += t.amount;
                    }
                });

                // Balance = Debit - Credit
                balanceBroughtForward = totalDebit - totalCredit;
            }

            // 2. Get Period Invoices
            const invoiceQuery: any = { buyerId: entityId };
            if (startDate || endDate) invoiceQuery.createdAt = dateFilter;
            const invoices = await Invoice.find(invoiceQuery);

            invoices.forEach(inv => {
                ledgerEntries.push({
                    date: inv.createdAt,
                    particulars: `Invoice #${inv.invoiceNumber}`,
                    debit: inv.nettAmount, // Debit increases receivable
                    credit: 0,
                    type: 'Invoice',
                    balance: 0
                });
            });

            // 3. Get Period Transactions (Income/Expense)
            const txnQuery: any = { entityId: entityId };
            if (startDate || endDate) txnQuery.date = dateFilter;
            const transactions = await CashFlowTransaction.find(txnQuery);

            transactions.forEach(t => {
                if (t.type === 'Income') {
                    let creditAmount = t.amount;
                    if (t.discount) creditAmount += t.discount;

                    ledgerEntries.push({
                        date: t.date,
                        particulars: t.description || `Payment - ${t.method}${t.discount ? ` (Disc: ${t.discount})` : ''}`,
                        debit: 0,
                        credit: creditAmount,
                        type: 'Payment',
                        balance: 0
                    });
                } else if (t.type === 'Expense') {
                    ledgerEntries.push({
                        date: t.date,
                        particulars: t.description || `Refund - ${t.method}`,
                        debit: t.amount,
                        credit: 0,
                        type: 'Refund',
                        balance: 0
                    });
                }
            });

        } else if (supplier) {
            entityName = supplier.supplierName;
            outstanding = Math.abs(supplier.outstanding);

            // 1. Calculate Opening Balance
            if (startDate) {
                const start = new Date(startDate as string);
                start.setHours(0, 0, 0, 0);

                const prevInvoices = await SupplierInvoice.find({ supplierId: entityId, createdAt: { $lt: start } });
                const prevTransactions = await CashFlowTransaction.find({ entityId: entityId, date: { $lt: start } });

                const totalPurchased = prevInvoices.reduce((sum, inv) => sum + inv.nettAmount, 0); // Credit (+ Payable)

                let totalCredit = totalPurchased;
                let totalDebit = 0;

                prevTransactions.forEach(t => {
                    const totalAmt = t.amount + (t.discount || 0); // Discount received from supplier reduces our payment
                    if (t.type === 'Expense') {
                        // Payment TO Supplier -> Debit (Decreases Payable)
                        totalDebit += totalAmt;
                    } else if (t.type === 'Income') {
                        // Refund FROM Supplier -> Credit (Increases Payable / Restores Debt)
                        totalCredit += t.amount;
                    }
                });

                balanceBroughtForward = totalCredit - totalDebit;
            }

            // 2. Period Invoices
            const invoiceQuery: any = { supplierId: entityId };
            if (startDate || endDate) invoiceQuery.createdAt = dateFilter;
            const invoices = await SupplierInvoice.find(invoiceQuery);

            invoices.forEach(inv => {
                ledgerEntries.push({
                    date: inv.createdAt,
                    particulars: `Invoice #${inv.invoiceNumber}`,
                    debit: 0,
                    credit: inv.nettAmount, // Credit increases payable
                    type: 'Invoice',
                    balance: 0
                });
            });

            // 3. Period Transactions
            const txnQuery: any = { entityId: entityId };
            if (startDate || endDate) txnQuery.date = dateFilter;
            const transactions = await CashFlowTransaction.find(txnQuery);

            transactions.forEach(t => {
                if (t.type === 'Expense') {
                    let debitAmount = t.amount;
                    if (t.discount) debitAmount += t.discount;

                    ledgerEntries.push({
                        date: t.date,
                        particulars: t.description || `Payment - ${t.method}${t.discount ? ` (Disc: ${t.discount})` : ''}`,
                        debit: debitAmount, // Debit decreases payable
                        credit: 0,
                        type: 'Payment',
                        balance: 0
                    });
                } else if (t.type === 'Income') {
                    ledgerEntries.push({
                        date: t.date,
                        particulars: t.description || `Refund - ${t.method}`,
                        debit: 0,
                        credit: t.amount, // Credit increases payable
                        type: 'Refund',
                        balance: 0
                    });
                }
            });
        }

        // Sort by date
        ledgerEntries.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

        // Calculate running balance
        let runningBalance = balanceBroughtForward;

        ledgerEntries = ledgerEntries.map(entry => {
            if (buyer) {
                // Receivable: Debit (Inv/Refund) increases, Credit (Pay) decreases
                runningBalance += (entry.debit - entry.credit);
            } else {
                // Payable: Credit (Inv/Refund) increases, Debit (Pay) decreases
                runningBalance += (entry.credit - entry.debit);
            }
            return { ...entry, balance: runningBalance };
        });

        res.json({
            entries: ledgerEntries,
            entityName,
            outstanding,
            balanceBroughtForward
        });

    } catch (error: any) {
        res.status(500).json({ message: error.message });
    }
};

export const getProfitLoss = async (req: Request, res: Response) => {
    // Simplified P&L
    try {
        const { startDate, endDate } = req.query;
        const query: any = {};
        const expenseQuery: any = {
            type: 'Expense',
            category: { $nin: ['Supplier Payment', 'Advance Payment'] }
        };

        if (startDate || endDate) {
            query.createdAt = {};
            expenseQuery.date = {};
            if (startDate) {
                const start = new Date(startDate as string);
                start.setHours(0, 0, 0, 0);
                query.createdAt.$gte = start;
                expenseQuery.date.$gte = start;
            }
            if (endDate) {
                const end = new Date(endDate as string);
                end.setHours(23, 59, 59, 999);
                query.createdAt.$lte = end;
                expenseQuery.date.$lte = end;
            }
        }

        const sales = await Invoice.find(query);
        const purchases = await SupplierInvoice.find(query);
        const expenses = await CashFlowTransaction.find(expenseQuery);

        const totalSales = sales.reduce((sum, i) => sum + i.nettAmount, 0);
        const totalPurchases = purchases.reduce((sum, i) => sum + i.nettAmount, 0);
        const totalCommission = purchases.reduce((sum, i) => sum + i.commissionAmount, 0);
        const operatingExpenses = expenses.reduce((sum, e) => sum + e.amount, 0);

        // Revenue largely comes from Sales (if principal) or Commission (if agent). 
        // Assuming Trading Model: Revenue = Total Sales
        const totalRevenue = totalSales;

        // Direct Costs = Total Purchases
        const grossProfit = totalRevenue - totalPurchases;

        // Net Profit = Gross Profit - Operating Expenses
        const netProfit = grossProfit - operatingExpenses;

        res.json({
            totalCommission,
            otherRevenue: 0, // Placeholder
            totalRevenue,
            operatingExpenses,
            netProfit,
            // Keep these for potential future use or debugging
            totalSales,
            totalPurchases,
            grossProfit
        });

    } catch (error: any) {
        res.status(500).json({ message: error.message });
    }
};

export const getAnalyticsDashboardStats = async (req: Request, res: Response) => {
    try {
        const { startDate, endDate } = req.query;
        let query: any = {};
        let txnQuery: any = {};

        if (startDate || endDate) {
            query.createdAt = {};
            txnQuery.date = {};
            if (startDate) {
                const start = new Date(startDate as string);
                start.setHours(0, 0, 0, 0);
                query.createdAt.$gte = start;
                txnQuery.date.$gte = start;
            }
            if (endDate) {
                const end = new Date(endDate as string);
                end.setHours(23, 59, 59, 999);
                query.createdAt.$lte = end;
                txnQuery.date.$lte = end;
            }
        }

        const invoices = await Invoice.find(query);
        const supplierInvoices = await SupplierInvoice.find(query);
        const transactions = await CashFlowTransaction.find(txnQuery);

        // KPIs
        const totalSales = invoices.reduce((sum, i) => sum + i.nettAmount, 0);
        const totalPurchases = supplierInvoices.reduce((sum, i) => sum + i.nettAmount, 0);
        const totalCommission = supplierInvoices.reduce((sum, i) => sum + i.commissionAmount, 0);
        const totalWages = invoices.reduce((sum, i) => sum + (i.wages || 0), 0) + supplierInvoices.reduce((sum, i) => sum + (i.wages || 0), 0);

        const totalIncome = transactions.filter(t => t.type === 'Income').reduce((sum, t) => sum + t.amount, 0);
        const totalExpense = transactions.filter(t => t.type === 'Expense').reduce((sum, t) => sum + t.amount, 0);
        const netCashFlow = totalIncome - totalExpense;

        const invoiceCount = invoices.length;

        // Sales vs Purchases Chart (Last 30 days)
        const chartMap: any = {};
        const today = new Date();
        for (let i = 0; i < 30; i++) {
            const d = new Date(today);
            d.setDate(d.getDate() - i);
            const dateStr = d.toISOString().split('T')[0];
            chartMap[dateStr] = { date: dateStr, sales: 0, purchases: 0 };
        }

        invoices.forEach(inv => {
            const dateStr = new Date(inv.createdAt).toISOString().split('T')[0];
            if (chartMap[dateStr]) chartMap[dateStr].sales += inv.nettAmount;
        });

        supplierInvoices.forEach(inv => {
            const dateStr = new Date(inv.createdAt).toISOString().split('T')[0];
            if (chartMap[dateStr]) chartMap[dateStr].purchases += inv.nettAmount;
        });

        const salesVsPurchases = Object.values(chartMap).sort((a: any, b: any) => new Date(a.date).getTime() - new Date(b.date).getTime());

        // Top Products by Value
        const productSales: any = {};
        // Need products to get names, fetch them
        const products = await Product.find({});
        invoices.forEach(inv => {
            inv.items.forEach((item: any) => {
                if (!productSales[item.productId]) productSales[item.productId] = 0;
                productSales[item.productId] += item.subTotal;
            });
        });
        const topProductsByValue = Object.keys(productSales).map(pid => {
            const p = products.find(prod => prod.id === pid);
            return { name: p ? p.productName : 'Unknown', value: productSales[pid] };
        }).sort((a, b) => b.value - a.value).slice(0, 5);

        // Top Buyers by Sales
        const buyerSales: any = {};
        const buyers = await Buyer.find({});
        invoices.forEach(inv => {
            if (!buyerSales[inv.buyerId]) buyerSales[inv.buyerId] = 0;
            buyerSales[inv.buyerId] += inv.nettAmount;
        });
        const topBuyersBySales = Object.keys(buyerSales).map(bid => {
            const b = buyers.find(buy => buy.id === bid);
            return { name: b ? b.buyerName : 'Unknown', value: buyerSales[bid] };
        }).sort((a, b) => b.value - a.value).slice(0, 5);

        // Expense Breakdown
        const expenseMap: any = {};
        transactions.filter(t => t.type === 'Expense').forEach(t => {
            const cat = t.category || 'Other';
            if (!expenseMap[cat]) expenseMap[cat] = 0;
            expenseMap[cat] += t.amount;
        });
        const expenseBreakdown = Object.keys(expenseMap).map(cat => ({
            name: cat,
            value: expenseMap[cat]
        }));

        res.json({
            kpis: {
                totalSales,
                totalPurchases,
                totalCommission,
                totalWages,
                netCashFlow,
                invoiceCount
            },
            salesVsPurchases,
            topProductsByValue,
            topBuyersBySales,
            expenseBreakdown
        });

    } catch (error: any) {
        res.status(500).json({ message: error.message });
    }
};
