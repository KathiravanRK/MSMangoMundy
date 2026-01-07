import { Request, Response } from 'express';
import mongoose from 'mongoose';
import Invoice from '../models/Invoice';
import Buyer from '../models/Buyer';
import Entry from '../models/Entry';
import AuditLog from '../models/AuditLog';
import Product from '../models/Product';
import Supplier from '../models/Supplier';
import { calculateEntryStatus } from '../utils/entryStatusCalculator';
import CashFlowTransaction from '../models/CashFlowTransaction';

// Helper to generate invoice number
const generateInvoiceNumber = async (): Promise<string> => {
    const today = new Date();
    const startOfDay = new Date(today.setHours(0, 0, 0, 0));
    const endOfDay = new Date(today.setHours(23, 59, 59, 999));

    const invoicesToday = await Invoice.find({
        createdAt: { $gte: startOfDay, $lte: endOfDay }
    });

    const newDailyCounter = invoicesToday.length + 1;
    const formattedYear = today.getFullYear();
    const formattedMonth = (today.getMonth() + 1).toString().padStart(2, '0');
    const formattedDay = today.getDate().toString().padStart(3, '0');

    return `BI-${formattedYear}${formattedMonth}${formattedDay}-${newDailyCounter.toString().padStart(3, '0')}`;
};

export const getInvoices = async (req: Request, res: Response) => {
    try {
        const { startDate, endDate } = req.query;
        console.log(`[DEBUG] getInvoices query params: startDate=${startDate}, endDate=${endDate}`);
        let query: any = {};

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

        const invoices = await Invoice.find(query).sort({ createdAt: -1 });

        // Migration: Ensure all invoices have custom id field
        let needsSave = false;
        for (const invoice of invoices) {
            if (!invoice.id) {
                invoice.id = `inv_${invoice._id}`;
                await invoice.save();
                needsSave = true;
            }
        }

        // Refetch if we made changes, preserving the original filter
        const finalInvoices = needsSave ? await Invoice.find(query).sort({ createdAt: -1 }) : invoices;
        res.json(finalInvoices);
    } catch (error: any) {
        res.status(500).json({ message: error.message });
    }
};

export const getInvoice = async (req: Request, res: Response) => {
    try {
        const invoice = await Invoice.findOne({ id: req.params.id });
        if (invoice) {
            res.json(invoice);
        } else {
            res.status(404).json({ message: 'Invoice not found' });
        }
    } catch (error: any) {
        res.status(500).json({ message: error.message });
    }
};

export const getDraftItemsForBuyer = async (req: Request, res: Response) => {
    try {
        const { buyerId } = req.params;

        // Resolve buyer to get both ID and _id
        let buyer = await Buyer.findOne({ id: buyerId });
        if (!buyer && mongoose.isValidObjectId(buyerId)) {
            buyer = await Buyer.findById(buyerId);
        }

        if (!buyer) {
            return res.json([]);
        }

        const possibleBuyerIds = [buyer.id, buyer._id.toString()];

        const entries = await Entry.find({ "items.buyerId": { $in: possibleBuyerIds }, "items.invoiceId": null });

        // Fetch all products and suppliers to resolve IDs
        const [allProducts, allSuppliers] = await Promise.all([
            Product.find({}),
            Supplier.find({})
        ]);

        const productMap = new Map(allProducts.map(p => [p._id.toString(), p.id]));
        const supplierMap = new Map(allSuppliers.map(s => [s._id.toString(), s.id]));

        // Also map custom ID to custom ID to be safe
        allProducts.forEach(p => productMap.set(p.id, p.id));
        allSuppliers.forEach(s => supplierMap.set(s.id, s.id));

        const draftItems: any[] = [];
        entries.forEach(entry => {
            // Resolve Supplier ID
            const resolvedSupplierId = supplierMap.get(entry.supplierId) || entry.supplierId;

            entry.items.forEach((item: any) => {
                if (possibleBuyerIds.includes(String(item.buyerId)) && !item.invoiceId) {
                    // Resolve Product ID
                    const resolvedProductId = productMap.get(item.productId) || item.productId;

                    draftItems.push({
                        ...item.toObject(),
                        productId: resolvedProductId,
                        entryId: entry.id,
                        entrySerialNumber: entry.serialNumber,
                        supplierId: resolvedSupplierId
                    });
                }
            });
        });

        res.json(draftItems);
    } catch (error: any) {
        res.status(500).json({ message: error.message });
    }
};

export const getBuyerStats = async (req: Request, res: Response) => {
    try {
        const { buyerId } = req.params;
        let buyer = await Buyer.findOne({ id: buyerId });
        if (!buyer && mongoose.isValidObjectId(buyerId)) {
            buyer = await Buyer.findById(buyerId);
        }

        if (!buyer) return res.status(404).json({ message: 'Buyer not found' });

        const possibleBuyerIds = [buyer.id, buyer._id.toString()];

        const invoices = await Invoice.find({ buyerId: { $in: possibleBuyerIds } });

        const stats = invoices.reduce((acc, inv) => {
            acc.totalBuys += inv.nettAmount || 0;
            acc.totalItemValue += inv.totalAmount || 0;
            acc.totalPayments += inv.paidAmount || 0;
            acc.totalDiscounts += inv.discount || 0;
            acc.totalWages += inv.wages || 0;

            const adj = inv.adjustments || 0;
            if (adj > 0) acc.positiveAdjustments += adj;
            else acc.negativeAdjustments += adj;

            return acc;
        }, {
            totalBuys: 0,
            totalItemValue: 0,
            totalPayments: 0,
            totalDiscounts: 0,
            totalWages: 0,
            positiveAdjustments: 0,
            negativeAdjustments: 0
        });

        res.json(stats);
    } catch (error: any) {
        res.status(500).json({ message: error.message });
    }
};

export const createInvoice = async (req: Request, res: Response) => {
    try {
        const { buyerId, items, wages, adjustments, discount, createdAt, payments } = req.body;

        const invoiceNumber = await generateInvoiceNumber();

        // Calculate totals
        const totalQuantities = items.reduce((sum: number, item: any) => sum + item.quantity, 0);
        const totalAmount = items.reduce((sum: number, item: any) => sum + item.subTotal, 0);
        // Gross (before any invoice-level discount).
        const grossAmount = totalAmount + (wages || 0) + (adjustments || 0);
        // Nett Amount now includes the discount deduction, so it reflects the actual payable amount.
        const nettAmount = grossAmount - (discount || 0);

        const newInvoice = await Invoice.create({
            id: `inv_${Date.now()}`,
            invoiceNumber,
            buyerId,
            items,
            totalQuantities,
            totalAmount,
            wages,
            adjustments,
            nettAmount,
            paidAmount: 0,
            discount: discount || 0,
            createdAt: createdAt ? new Date(createdAt) : new Date()
        });

        // Resolve buyer by custom id or MongoDB _id
        let buyer = await Buyer.findOne({ id: buyerId });
        if (!buyer && mongoose.isValidObjectId(buyerId)) {
            buyer = await Buyer.findById(buyerId);
        }

        // Update Buyer Balance by nett payable (not reduced by invoice-level discount)
        if (buyer) {
            buyer.outstanding += nettAmount;
            // We'll save after processing payments
        }

        // Process Initial Payments
        if (payments && Array.isArray(payments) && payments.length > 0) {
            for (const payment of payments) {
                const amount = Number(payment.amount) || 0;
                const payDiscount = Number(payment.discount) || 0;
                const totalCredit = amount + payDiscount;

                if (totalCredit > 0) {
                    // Create Transaction
                    await CashFlowTransaction.create({
                        id: `txn_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
                        date: newInvoice.createdAt,
                        type: 'Income',
                        category: 'Sales',
                        entityId: buyerId,
                        entityName: buyer ? buyer.buyerName : 'Unknown',
                        amount: amount,
                        discount: payDiscount,
                        method: payment.method || 'Cash',
                        reference: payment.reference,
                        description: `Payment for invoice ${newInvoice.invoiceNumber}`,
                        relatedInvoiceIds: [newInvoice.id]
                    });

                    // Update Invoice Status/PaidAmount
                    newInvoice.paidAmount += totalCredit;

                    // Update Buyer Balance (Payment Effect)
                    if (buyer) {
                        buyer.outstanding -= totalCredit;
                    }
                }
            }
        }

        if (buyer) {
            await buyer.save();
        }
        await newInvoice.save(); // Save invoice again if paidAmount updated

        // Link items to invoice in Entries and update entry status
        for (const item of items) {
            const entry = await Entry.findOne({ "items.id": item.id });
            if (entry) {
                const entryItem = entry.items.find((i: any) => i.id === item.id);
                if (entryItem) {
                    entryItem.invoiceId = newInvoice.id;
                    // Recalculate entry status based on new logic
                    entry.status = calculateEntryStatus(entry.items, false);
                }
                await entry.save();
            }
        }

        // Audit Log
        await AuditLog.create({
            id: `log_${Date.now()}`,
            actorId: (req as any).user.id,
            actorName: 'Admin',
            action: 'Create',
            feature: 'BuyerInvoices',
            description: `Created buyer invoice ${newInvoice.invoiceNumber} for '${buyer?.buyerName}'. Total: ${nettAmount}. Paid: ${newInvoice.paidAmount}.`
        });

        res.status(201).json(newInvoice);
    } catch (error: any) {
        console.error('Create Invoice Error:', error);
        res.status(500).json({ message: error.message });
    }
};

export const updateInvoice = async (req: Request, res: Response) => {
    try {
        const { id } = req.params;
        const { buyerId, items, wages, adjustments, discount, createdAt } = req.body;

        const oldInvoice = await Invoice.findOne({ id });
        if (!oldInvoice) {
            return res.status(404).json({ message: 'Invoice not found' });
        }

        // 1. Revert Old Buyer Balance
        const buyer = await Buyer.findOne({ id: oldInvoice.buyerId });
        if (buyer) {
            // Revert based on how it was likely stored. 
            // If old invoice followed new logic: outstanding += nettAmount. So we subtract nettAmount.
            // If old invoice followed old logic: outstanding += (nettAmount - discount).
            // We'll assume consistency with the new logic for simplicity, or we check if nettAmount includes discount.
            // Since we can't easily know, we'll assume the 'nettAmount' field in DB is the "Payable Amount".
            // Wait, in old logic: nettAmount = Gross + Wages + Adj. (No discount).
            // And Outstanding += (nettAmount - discount).
            // So to revert old logic, we subtract (nettAmount - discount).
            // In new logic: nettAmount = Gross + Wages + Adj - Discount.
            // And Outstanding += nettAmount.
            // So regardless, "Payable" is what was added.
            // If we assume the DB field 'nettAmount' MIGHT NOT include discount subtraction for old records...
            // We should calculate the "Payable" amount to revert.
            // Payable = oldInvoice.nettAmount - (oldInvoice.discount || 0) IF oldInvoice.nettAmount didn't include discount.
            // BUT if oldInvoice.nettAmount DID include discount, then Payable = oldInvoice.nettAmount.
            // This is tricky.
            // Let's look at the OLD code again.
            // Old Create: nettAmount = total + wages + adj. (NO DISCOUNT).
            // Old Balance Update: outstanding += (nettAmount - discount).
            // So for OLD invoices, Payable = nettAmount - discount.
            // For NEW invoices (created with this new code), nettAmount WILL include discount.
            // So Payable = nettAmount.
            // How do we distinguish?
            // We can re-calculate what nettAmount SHOULD be without discount.
            // CalculatedGross = totalAmount + wages + adjustments.
            // If oldInvoice.nettAmount == CalculatedGross, then it's OLD format.
            // If oldInvoice.nettAmount == CalculatedGross - discount, then it's NEW format.

            const calculatedGross = oldInvoice.totalAmount + (oldInvoice.wages || 0) + (oldInvoice.adjustments || 0);
            let amountToRevert = 0;

            if (Math.abs(oldInvoice.nettAmount - calculatedGross) < 0.01) {
                // Old format: nettAmount didn't include discount
                amountToRevert = oldInvoice.nettAmount - (oldInvoice.discount || 0);
            } else {
                // New format: nettAmount already includes discount (or some other adjustment)
                amountToRevert = oldInvoice.nettAmount;
            }

            buyer.outstanding -= amountToRevert;
            // We will save buyer later
        }

        // 2. Unlink Old Items from Entries
        for (const item of oldInvoice.items) {
            const entry = await Entry.findOne({ "items.id": item.id });
            if (entry) {
                const entryItem = entry.items.find((i: any) => i.id === item.id);
                if (entryItem) {
                    entryItem.invoiceId = null;
                }
                await entry.save();
            }
        }

        // 3. Calculate New Totals
        const totalQuantities = items.reduce((sum: number, item: any) => sum + item.quantity, 0);
        const totalAmount = items.reduce((sum: number, item: any) => sum + item.subTotal, 0);
        // Nett Amount = Gross Total + Wages + Adjustments - Discount
        const nettAmount = totalAmount + (wages || 0) + (adjustments || 0) - (discount || 0);

        // 4. Update Invoice Fields
        oldInvoice.items = items;
        oldInvoice.totalQuantities = totalQuantities;
        oldInvoice.totalAmount = totalAmount;
        oldInvoice.wages = wages;
        oldInvoice.adjustments = adjustments;
        oldInvoice.nettAmount = nettAmount;
        oldInvoice.discount = discount;
        if (createdAt) {
            oldInvoice.createdAt = new Date(createdAt);
        }

        if (buyerId !== oldInvoice.buyerId) {
            // If buyer changed, save the OLD buyer with the reverted balance
            if (buyer) await buyer.save();

            // Find NEW buyer
            const newBuyer = await Buyer.findOne({ id: buyerId });
            if (newBuyer) {
                newBuyer.outstanding += nettAmount;
                await newBuyer.save();
            }
            oldInvoice.buyerId = buyerId;
        } else {
            // Same buyer, just update balance
            if (buyer) {
                buyer.outstanding += nettAmount;
                await buyer.save();
            }
        }

        await oldInvoice.save();

        // 5. Link New Items to Entries and update status
        for (const item of items) {
            const entry = await Entry.findOne({ "items.id": item.id });
            if (entry) {
                const entryItem = entry.items.find((i: any) => i.id === item.id);
                if (entryItem) {
                    entryItem.invoiceId = oldInvoice.id;
                    // Recalculate entry status based on new logic
                    entry.status = calculateEntryStatus(entry.items, false);
                }
                await entry.save();
            }
        }

        // Audit Log
        await AuditLog.create({
            id: `log_${Date.now()}`,
            actorId: (req as any).user.id,
            actorName: 'Admin', // Should fetch user name
            action: 'Update',
            feature: 'BuyerInvoices',
            description: `Updated buyer invoice ${oldInvoice.invoiceNumber}. New Total: ${nettAmount}.`
        });

        res.json(oldInvoice);

    } catch (error: any) {
        res.status(500).json({ message: error.message });
    }
};

// Link CashFlowTransaction import at the top (will be added in separate step or assumes checked)
// But I can't add import here easily in one block if it's far away.
// I will just replace the function body assuming imports are fixed in next step or I will perform two edits.
// This step replaces deleteInvoice body.

export const deleteInvoice = async (req: Request, res: Response) => {
    console.log('Delete Buyer Invoice request received for ID:', req.params.id);
    try {
        const invoice = await Invoice.findOne({ id: req.params.id });
        if (!invoice) {
            console.log('Invoice not found');
            return res.status(404).json({ message: 'Invoice not found' });
        }
        console.log('Invoice found:', invoice.invoiceNumber);

        // Revert Buyer Balance
        // Revert Buyer Balance (Undo the Sale)
        // Sale increased outstanding. Deleting sale decreases outstanding.
        const buyer = await Buyer.findOne({ id: invoice.buyerId });
        if (buyer) {
            // Revert based on new logic (nettAmount includes everything final)
            // If the invoice was created with old logic (no discount in nett), we might need adjustment,
            // but assuming forward compatibility, we subtract nettAmount.
            // However, to be safe against the hybrid issue mentioned in update:
            const calculatedGross = invoice.totalAmount + (invoice.wages || 0) + (invoice.adjustments || 0);
            let amountToRevert = 0;
            if (Math.abs(invoice.nettAmount - calculatedGross) < 0.01) {
                // Old format: nettAmount didn't include discount
                amountToRevert = invoice.nettAmount - (invoice.discount || 0);
            } else {
                amountToRevert = invoice.nettAmount;
            }
            buyer.outstanding -= amountToRevert;
        }

        // Handle linked Transactions (Payments)
        const linkedTransactions = await CashFlowTransaction.find({ relatedInvoiceIds: invoice.id });
        for (const txn of linkedTransactions) {
            if (txn.type === 'Income') {
                if (txn.category === 'Advance Payment') {
                    // Unlink advance, keep the credit.
                    txn.relatedInvoiceIds = txn.relatedInvoiceIds?.filter(id => id !== invoice.id);
                    await txn.save();
                } else {
                    // Assume 'Sales' or 'Payment' for this invoice.
                    // A Payment (Income) DECREASED outstanding.
                    // If we delete the payment, we must INCREASE outstanding to revert it?
                    // Wait.
                    // Scenario:
                    // 1. Invoice Created: Outstanding += 100.
                    // 2. Payment Made: Outstanding -= 100. (Net 0).
                    // 3. Delete Invoice:
                    //    a. We reverted Invoice: Outstanding -= 100. (Net -100).
                    //    b. If we delete Payment: We must REVERT the payment effect.
                    //       Reverting "Outstanding -= 100" means "Outstanding += 100".
                    //    c. Net change: -100 + 100 = 0. Correct.
                    if (buyer) {
                        buyer.outstanding += txn.amount + (txn.discount || 0);
                    }
                    await CashFlowTransaction.deleteOne({ id: txn.id });
                }
            }
        }

        if (buyer) {
            await buyer.save();
        }

        // Unlink items in Entries and update status
        for (const item of invoice.items) {
            const entry = await Entry.findOne({ "items.id": item.id });
            if (entry) {
                const entryItem = entry.items.find((i: any) => i.id === item.id);
                if (entryItem) {
                    entryItem.invoiceId = null;
                    // Recalculate entry status based on new logic
                    entry.status = calculateEntryStatus(entry.items, false);
                }
                await entry.save();
            }
        }

        await Invoice.deleteOne({ id: req.params.id });
        res.json({ id: req.params.id });

    } catch (error: any) {
        res.status(500).json({ message: error.message });
    }
};
