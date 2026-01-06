import { Request, Response } from 'express';
import CashFlowTransaction from '../models/CashFlowTransaction';
import Buyer from '../models/Buyer';
import Supplier from '../models/Supplier';
import Invoice from '../models/Invoice';
import SupplierInvoice from '../models/SupplierInvoice';
import AuditLog from '../models/AuditLog';

export const getTransactions = async (req: Request, res: Response) => {
    try {
        const { startDate, endDate } = req.query;
        const query: any = {};

        if (startDate || endDate) {
            query.date = {};
            if (startDate) {
                const start = new Date(startDate as string);
                start.setHours(0, 0, 0, 0);
                query.date.$gte = start;
            }
            if (endDate) {
                const end = new Date(endDate as string);
                end.setHours(23, 59, 59, 999);
                query.date.$lte = end;
            }
        }

        const transactions = await CashFlowTransaction.find(query).sort({ date: -1 });
        res.json(transactions);
    } catch (error: any) {
        res.status(500).json({ message: error.message });
    }
};

export const getOpeningBalance = async (req: Request, res: Response) => {
    try {
        const { date } = req.query;
        if (!date) {
            return res.status(400).json({ message: 'Date is required' });
        }

        const queryDate = new Date(date as string);
        queryDate.setHours(0, 0, 0, 0); // Start of the day

        // Find all transactions BEFORE this date
        const transactions = await CashFlowTransaction.find({
            date: { $lt: queryDate }
        });

        const balance = {
            total: 0,
            cash: 0,
            bank: 0
        };

        transactions.forEach(txn => {
            const amount = txn.amount;
            // Note: We only track actual cash flow amount, not discounts

            if (txn.type === 'Income') {
                balance.total += amount;
                if (txn.method === 'Cash') balance.cash += amount;
                else if (txn.method === 'Bank') balance.bank += amount;
            } else if (txn.type === 'Expense') {
                balance.total -= amount;
                if (txn.method === 'Cash') balance.cash -= amount;
                else if (txn.method === 'Bank') balance.bank -= amount;
            } else if (txn.type === 'Transfer' && txn.toMethod) {
                // Transfer from method (Source) to toMethod (Destination)
                // Source decreases, Destination increases. Total stays same.
                if (txn.method === 'Cash') balance.cash -= amount;
                else if (txn.method === 'Bank') balance.bank -= amount;

                if (txn.toMethod === 'Cash') balance.cash += amount;
                else if (txn.toMethod === 'Bank') balance.bank += amount;
            }
        });

        res.json(balance);
    } catch (error: any) {
        res.status(500).json({ message: error.message });
    }
};

export const createTransaction = async (req: Request, res: Response) => {
    try {
        const { date, type, category, entityId, entityName, amount, discount, method, toMethod, reference, description, relatedEntryIds, relatedInvoiceIds } = req.body;

        console.log('Creating Transaction:', JSON.stringify(req.body));

        const newTransaction = await CashFlowTransaction.create({
            id: `txn_${Date.now()}`,
            date,
            type,
            category,
            entityId,
            entityName,
            amount,
            discount,
            method,
            toMethod, // Added
            reference,
            description,
            relatedEntryIds,
            relatedInvoiceIds
        });

        // Update Balances
        if (type === 'Transfer') {
            // Transfers don't affect Buyer/Supplier balances
        } else if (type === 'Income') {
            if (entityId) {
                const buyer = await Buyer.findOne({ id: entityId });
                if (buyer) {
                    buyer.outstanding -= (amount + (discount || 0));
                    await buyer.save();
                } else {
                    console.warn(`Buyer not found for entityId: ${entityId}`);
                }
            }
            // Apply to related invoices
            if (relatedInvoiceIds && relatedInvoiceIds.length > 0) {
                let creditToDistribute = amount + (discount || 0);
                // Fetch invoices, sort by date (oldest first)
                const invoices = await Invoice.find({ id: { $in: relatedInvoiceIds } }).sort({ createdAt: 1 });

                for (const inv of invoices) {
                    if (creditToDistribute <= 0) break;
                    const balance = (inv.nettAmount - (inv.discount || 0)) - inv.paidAmount;
                    if (balance > 0) {
                        const creditForThisInvoice = Math.min(creditToDistribute, balance);
                        inv.paidAmount += creditForThisInvoice;
                        await inv.save();
                        creditToDistribute -= creditForThisInvoice;
                    }
                }
            }
        } else if (type === 'Expense') {
            if ((category === 'Supplier Payment' || category === 'Advance Payment') && entityId) {
                const supplier = await Supplier.findOne({ id: entityId });
                if (supplier) {
                    supplier.outstanding += amount;
                    await supplier.save();
                } else {
                    console.warn(`Supplier not found for entityId: ${entityId}`);
                }

                // Apply to related supplier invoices
                if (relatedInvoiceIds && relatedInvoiceIds.length > 0) {
                    let amountToDistribute = amount;
                    const invoices = await SupplierInvoice.find({ id: { $in: relatedInvoiceIds } }).sort({ createdAt: 1 });

                    for (const inv of invoices) {
                        if (amountToDistribute <= 0) break;
                        const balance = inv.nettAmount - inv.paidAmount;
                        if (balance > 0) {
                            const paymentForThisInvoice = Math.min(amountToDistribute, balance);
                            inv.paidAmount += paymentForThisInvoice;

                            // Update status
                            if (inv.paidAmount >= inv.nettAmount) inv.status = 'Paid';
                            else if (inv.paidAmount > 0) inv.status = 'Partially Paid';

                            await inv.save();
                            amountToDistribute -= paymentForThisInvoice;
                        }
                    }
                } else if (relatedEntryIds && relatedEntryIds.length > 0) {
                    // Advance payment linked to entries
                    const targetInvoice = await SupplierInvoice.findOne({ entryIds: { $all: relatedEntryIds } });
                    if (targetInvoice) {
                        targetInvoice.paidAmount += amount;
                        if (targetInvoice.paidAmount >= targetInvoice.nettAmount) targetInvoice.status = 'Paid';
                        else if (targetInvoice.paidAmount > 0) targetInvoice.status = 'Partially Paid';
                        await targetInvoice.save();
                    }
                }
            }
        }

        // Audit Log
        const actorId = (req as any).user && (req as any).user.id ? (req as any).user.id : 'unknown_user';
        await AuditLog.create({
            id: `log_${Date.now()}`,
            actorId: actorId,
            actorName: 'Admin',
            action: 'Create',
            feature: 'CashFlow',
            description: `Recorded ${type} of ${amount} from/to '${entityName}'.`
        });

        res.status(201).json(newTransaction);
    } catch (error: any) {
        console.error('Error creating transaction:', error);
        res.status(500).json({ message: error.message, stack: process.env.NODE_ENV === 'development' ? error.stack : undefined });
    }
};

export const deleteTransaction = async (req: Request, res: Response) => {
    try {
        const txn = await CashFlowTransaction.findOne({ id: req.params.id });
        if (!txn) return res.status(404).json({ message: 'Transaction not found' });

        if (txn.type === 'Income') {
            if (txn.entityId) {
                const buyer = await Buyer.findOne({ id: txn.entityId });
                if (buyer) {
                    buyer.outstanding += (txn.amount + (txn.discount || 0));
                    await buyer.save();
                }
            }
        } else if (txn.type === 'Expense') {
            if (txn.entityId) {
                const supplier = await Supplier.findOne({ id: txn.entityId });
                if (supplier) {
                    supplier.outstanding -= txn.amount;
                    await supplier.save();
                }
            }
        }

        await CashFlowTransaction.deleteOne({ id: req.params.id });
        res.json({ id: req.params.id });
    } catch (error: any) {
        res.status(500).json({ message: error.message });
    }
};

export const updateTransaction = async (req: Request, res: Response) => {
    try {
        const { id } = req.params;
        const { date, type, category, entityId, entityName, amount, discount, method, toMethod, reference, description, relatedEntryIds, relatedInvoiceIds } = req.body;

        const oldTxn = await CashFlowTransaction.findOne({ id });
        if (!oldTxn) {
            return res.status(404).json({ message: 'Transaction not found' });
        }

        // Revert old balance changes
        if (oldTxn.type === 'Income') {
            if (oldTxn.entityId) {
                const buyer = await Buyer.findOne({ id: oldTxn.entityId });
                if (buyer) {
                    buyer.outstanding += (oldTxn.amount + (oldTxn.discount || 0));
                    await buyer.save();
                }
            }
        } else if (oldTxn.type === 'Expense') {
            if (oldTxn.entityId && (oldTxn.category === 'Supplier Payment' || oldTxn.category === 'Advance Payment')) {
                const supplier = await Supplier.findOne({ id: oldTxn.entityId });
                if (supplier) {
                    supplier.outstanding -= oldTxn.amount;
                    await supplier.save();
                }
            }
        }
        // Transfers don't affect entity balances, so nothing to revert except if we were tracking bank balances, which we calculate dynamically.

        // Update the transaction
        oldTxn.date = date || oldTxn.date;
        oldTxn.type = type || oldTxn.type;
        oldTxn.category = category || oldTxn.category;
        oldTxn.entityId = entityId !== undefined ? entityId : oldTxn.entityId;
        oldTxn.entityName = entityName || oldTxn.entityName;
        oldTxn.amount = amount !== undefined ? amount : oldTxn.amount;
        oldTxn.discount = discount !== undefined ? discount : oldTxn.discount;
        oldTxn.method = method || oldTxn.method;
        oldTxn.toMethod = toMethod || oldTxn.toMethod; // Added
        oldTxn.reference = reference !== undefined ? reference : oldTxn.reference;
        oldTxn.description = description !== undefined ? description : oldTxn.description;
        oldTxn.relatedEntryIds = relatedEntryIds !== undefined ? relatedEntryIds : oldTxn.relatedEntryIds;
        oldTxn.relatedInvoiceIds = relatedInvoiceIds !== undefined ? relatedInvoiceIds : oldTxn.relatedInvoiceIds;

        await oldTxn.save();

        // Apply new balance changes
        if (oldTxn.type === 'Income') {
            if (oldTxn.entityId) {
                const buyer = await Buyer.findOne({ id: oldTxn.entityId });
                if (buyer) {
                    buyer.outstanding -= (oldTxn.amount + (oldTxn.discount || 0));
                    await buyer.save();
                }
            }
        } else if (oldTxn.type === 'Expense') {
            if ((oldTxn.category === 'Supplier Payment' || oldTxn.category === 'Advance Payment') && oldTxn.entityId) {
                const supplier = await Supplier.findOne({ id: oldTxn.entityId });
                if (supplier) {
                    supplier.outstanding += oldTxn.amount;
                    await supplier.save();
                }
            }
        }

        // Audit Log
        const actorId = (req as any).user && (req as any).user.id ? (req as any).user.id : 'unknown_user';
        await AuditLog.create({
            id: `log_${Date.now()}`,
            actorId: actorId,
            actorName: 'Admin',
            action: 'Update',
            feature: 'CashFlow',
            description: `Updated ${oldTxn.type} transaction for '${oldTxn.entityName}'.`
        });

        res.json(oldTxn);
    } catch (error: any) {
        console.error('Error updating transaction:', error);
        res.status(500).json({ message: error.message, stack: process.env.NODE_ENV === 'development' ? error.stack : undefined });
    }
};
