import { Request, Response } from 'express';
import SupplierInvoice from '../models/SupplierInvoice';
import Supplier from '../models/Supplier';
import Entry from '../models/Entry';
import AuditLog from '../models/AuditLog';
import { calculateEntryStatus } from '../utils/entryStatusCalculator';
import CashFlowTransaction from '../models/CashFlowTransaction';

// Helper to generate invoice number
const generateInvoiceNumber = async (): Promise<string> => {
    const today = new Date();
    const startOfDay = new Date(today.setHours(0, 0, 0, 0));
    const endOfDay = new Date(today.setHours(23, 59, 59, 999));

    const invoicesToday = await SupplierInvoice.find({
        createdAt: { $gte: startOfDay, $lte: endOfDay }
    });

    const newDailyCounter = invoicesToday.length + 1;
    const formattedYear = today.getFullYear();
    const formattedMonth = (today.getMonth() + 1).toString().padStart(2, '0');
    const formattedDay = today.getDate().toString().padStart(3, '0');

    return `SI-${formattedYear}${formattedMonth}${formattedDay}-${newDailyCounter.toString().padStart(3, '0')}`;
};

export const getSupplierInvoices = async (req: Request, res: Response) => {
    try {
        const { startDate, endDate } = req.query;
        console.log(`[DEBUG] getSupplierInvoices query params: startDate=${startDate}, endDate=${endDate}`);
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

        const invoices = await SupplierInvoice.find(query).sort({ createdAt: -1 });
        res.json(invoices);
    } catch (error: any) {
        res.status(500).json({ message: error.message });
    }
};

export const getSupplierInvoice = async (req: Request, res: Response) => {
    try {
        const invoice = await SupplierInvoice.findOne({ id: req.params.id });
        if (invoice) {
            res.json(invoice);
        } else {
            res.status(404).json({ message: 'Supplier Invoice not found' });
        }
    } catch (error: any) {
        res.status(500).json({ message: error.message });
    }
};

export const createSupplierInvoice = async (req: Request, res: Response) => {
    console.log('Create Supplier Invoice request received:', JSON.stringify(req.body, null, 2));
    try {
        const { supplierId, entryIds, items, commissionRate, commissionAmount, wages, adjustments, advancePaid } = req.body;

        console.log('=== DETAILED VALIDATION CHECKS ===');
        console.log('1. entryIds validation:');
        console.log('   - Type:', typeof entryIds);
        console.log('   - Is Array:', Array.isArray(entryIds));
        console.log('   - Length:', entryIds?.length);
        console.log('   - Value:', entryIds);

        console.log('2. items validation:');
        console.log('   - Type:', typeof items);
        console.log('   - Is Array:', Array.isArray(items));
        console.log('   - Length:', items?.length);
        console.log('   - First item:', items?.[0]);

        console.log('3. supplierId validation:');
        console.log('   - Value:', supplierId);
        console.log('   - Type:', typeof supplierId);

        if (!Array.isArray(entryIds)) {
            console.error('❌ VALIDATION FAILED: entryIds is not an array');
            console.error('   - Type:', typeof entryIds);
            console.error('   - Value:', entryIds);
            return res.status(400).json({
                message: "entryIds must be an array",
                details: { type: typeof entryIds, value: entryIds }
            });
        }

        if (!Array.isArray(items)) {
            console.error('❌ VALIDATION FAILED: items is not an array');
            console.error('   - Type:', typeof items);
            console.error('   - Value:', items);
            return res.status(400).json({
                message: "items must be an array",
                details: { type: typeof items, value: items }
            });
        }

        if (entryIds.length === 0) {
            console.error('❌ VALIDATION FAILED: entryIds is empty');
            return res.status(400).json({ message: "entryIds cannot be empty" });
        }

        if (items.length === 0) {
            console.error('❌ VALIDATION FAILED: items is empty');
            return res.status(400).json({ message: "items cannot be empty" });
        }

        if (!supplierId) {
            console.error('❌ VALIDATION FAILED: supplierId is missing');
            return res.status(400).json({ message: "supplierId is required" });
        }

        console.log('✅ All basic validations passed');

        // Check for duplicate invoicing and log specifics
        console.log('4. Checking for duplicate invoicing...');
        console.log('   - Searching for invoices with entryIds:', entryIds);

        const existingInvoice = await SupplierInvoice.findOne({ entryIds: { $in: entryIds } });
        if (existingInvoice) {
            const conflictingIds = entryIds.filter(id => existingInvoice.entryIds.includes(id));
            console.error('❌ DUPLICATE INVOICING DETECTED:');
            console.error('   - Conflicting IDs:', conflictingIds);
            console.error('   - Existing Invoice:', existingInvoice.invoiceNumber);
            return res.status(400).json({
                message: `Duplicate invoicing detected. Entries already associated with invoice ${existingInvoice.invoiceNumber}. Conflicting: ${conflictingIds.join(', ')}`
            });
        }
        console.log('✅ No duplicate invoicing found');

        const invoiceNumber = await generateInvoiceNumber();

        // Calculate totals with sanitization
        const totalQuantities = items.reduce((sum: number, item: any) => sum + (Number(item.quantity) || 0), 0);
        const grossRaw = items.reduce((sum: number, item: any) => sum + (Number(item.subTotal) || 0), 0);
        // Round gross total to nearest rupee (do not round rate-per-qty)
        const grossTotal = Math.round(grossRaw);

        // Calculate amounts with consistent rules
        const commRate = Number(commissionRate) || 0;
        // Commission is rounded UP to the next whole rupee as requested, based on rounded gross
        const commAmt = Math.ceil((grossTotal * commRate) / 100);
        const wagesAmt = Number(wages) || 0;
        const adjAmt = Number(adjustments) || 0;
        const advPaid = Number(advancePaid) || 0;

        // Nett = Gross - Commission - Wages + Adjustments (adjustments can be positive)
        const nettRaw = grossTotal - commAmt - wagesAmt + adjAmt;
        const nettAmount = Math.round(nettRaw);
        const finalPayable = Math.round(nettAmount - advPaid);

        const newInvoice = await SupplierInvoice.create({
            id: `si_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`,
            invoiceNumber,
            supplierId,
            entryIds,
            items,
            totalQuantities: Number(totalQuantities) || 0,
            grossTotal: Number(grossTotal) || 0,
            commissionRate: Number(commRate) || 0,
            commissionAmount: Number(commAmt) || 0,
            wages: Number(wagesAmt) || 0,
            adjustments: Number(adjAmt) || 0,
            nettAmount,
            advancePaid: Number(advPaid) || 0,
            finalPayable,
            paidAmount: Number(advPaid) || 0,
            status: 'Unpaid',
            createdAt: new Date()
        });

        // Update Supplier Balance
        const supplier = await Supplier.findOne({ id: supplierId });
        if (supplier) {
            supplier.outstanding -= nettAmount; // We owe them this amount
            await supplier.save();
        }

        // Link entries to this invoice and set status to INVOICED
        for (const entryId of entryIds) {
            // Support both custom id and MongoDB _id for linkage
            // Only search by custom id field, don't try to cast to ObjectId
            const entry = await Entry.findOne({
                id: entryId
            });

            if (entry) {
                entry.items.forEach((item: any) => {
                    // Only link items that were part of this invoice items list
                    const invoiceItem = items.find((ii: any) =>
                        ii.productId === item.productId &&
                        Math.abs(ii.ratePerQuantity - item.ratePerQuantity) < 0.001
                    );
                    if (invoiceItem) {
                        item.supplierInvoiceId = newInvoice.id;
                    }
                });
                // Recalculate status - if any item is linked to this invoice, status should eventually be Invoiced
                // We pass true because we know at least some items are now invoiced
                entry.status = calculateEntryStatus(entry.items, true);
                await entry.save();
                console.log(`Updated entry ${entry.serialNumber} status to ${entry.status}`);
            } else {
                console.warn(`Could not find entry ${entryId} to update status.`);
            }
        }

        // Audit Log
        await AuditLog.create({
            id: `log_${Date.now()}`,
            actorId: (req as any).user?.id || 'system',
            actorName: (req as any).user?.name || 'System',
            action: 'Create',
            feature: 'SupplierInvoices',
            description: `Created supplier invoice ${newInvoice.invoiceNumber} for '${supplier?.supplierName}'. Nett: ${nettAmount}.`
        });

        res.status(201).json(newInvoice);
    } catch (error: any) {
        console.error('Create Supplier Invoice Error:', error);
        res.status(500).json({ message: error.message });
    }
};

export const updateSupplierInvoice = async (req: Request, res: Response) => {
    console.log('Update Supplier Invoice request received for ID:', req.params.id);
    console.log('Update Data:', JSON.stringify(req.body, null, 2));

    try {
        const { id } = req.params;
        const { supplierId, entryIds, items, commissionRate, commissionAmount, wages, adjustments, advancePaid, status } = req.body;

        if (!Array.isArray(entryIds) || !Array.isArray(items)) {
            return res.status(400).json({ message: "entryIds and items must be arrays" });
        }

        const oldInvoice = await SupplierInvoice.findOne({ id });
        if (!oldInvoice) {
            return res.status(404).json({ message: 'Supplier Invoice not found' });
        }

        // 1. Revert Old Supplier Balance
        const supplier = await Supplier.findOne({ id: oldInvoice.supplierId });
        if (supplier) {
            supplier.outstanding += oldInvoice.nettAmount;
        }

        // 2. Unlink Old Entries/Items
        for (const entryId of oldInvoice.entryIds) {
            const entry = await Entry.findOne({ id: entryId });
            if (entry) {
                entry.items.forEach((item: any) => {
                    if (item.supplierInvoiceId === oldInvoice.id) {
                        item.supplierInvoiceId = null;
                    }
                });
                await entry.save();
            }
        }

        // 3. Calculate New Totals
        const totalQuantities = items.reduce((sum: number, item: any) => sum + (Number(item.quantity) || 0), 0);
        const grossRaw = items.reduce((sum: number, item: any) => sum + (Number(item.subTotal) || 0), 0);
        const grossTotal = Math.round(grossRaw);

        const commRate = Number(commissionRate) || 0;
        // Commission rounded UP and based on rounded gross
        const commAmt = Math.ceil((grossTotal * commRate) / 100);
        const wagesAmt = Number(wages) || 0;
        const adjAmt = Number(adjustments) || 0;
        const advPaid = Number(advancePaid) || 0;

        const nettRaw = grossTotal - commAmt - wagesAmt + adjAmt;
        const nettAmount = Math.round(nettRaw);
        const finalPayable = Math.round(nettAmount - advPaid);

        // 4. Update Invoice Fields
        oldInvoice.supplierId = supplierId;
        oldInvoice.entryIds = entryIds;
        oldInvoice.items = items;
        oldInvoice.totalQuantities = totalQuantities;
        oldInvoice.grossTotal = grossTotal;
        oldInvoice.commissionRate = Number(commissionRate) || 0;
        oldInvoice.commissionAmount = commAmt;
        oldInvoice.wages = wagesAmt;
        oldInvoice.adjustments = adjAmt;
        oldInvoice.nettAmount = nettAmount;
        oldInvoice.advancePaid = advPaid;
        oldInvoice.finalPayable = finalPayable;
        if (status) oldInvoice.status = status;

        // 5. Update New/Same Supplier Balance
        if (supplierId !== oldInvoice.supplierId) {
            if (supplier) await supplier.save();
            const newSupplier = await Supplier.findOne({ id: supplierId });
            if (newSupplier) {
                newSupplier.outstanding -= nettAmount;
                await newSupplier.save();
            }
        } else {
            if (supplier) {
                supplier.outstanding -= nettAmount;
                await supplier.save();
            }
        }

        await oldInvoice.save();

        // 6. Link New Entries and update status
        for (const entryId of entryIds) {
            const entry = await Entry.findOne({ id: entryId });
            if (entry) {
                entry.items.forEach((item: any) => {
                    // Check if this item belongs to our invoice (e.g. key match)
                    const invoiceItem = items.find((ii: any) =>
                        ii.productId === item.productId &&
                        Math.abs(ii.ratePerQuantity - item.ratePerQuantity) < 0.01
                    );
                    if (invoiceItem) {
                        item.supplierInvoiceId = oldInvoice.id;
                    }
                });
                entry.status = calculateEntryStatus(entry.items, false);
                await entry.save();
            }
        }

        // Audit Log
        await AuditLog.create({
            id: `log_${Date.now()}_update`,
            actorId: (req as any).user?.id || 'system',
            actorName: (req as any).user?.name || 'System',
            action: 'Update',
            feature: 'SupplierInvoices',
            description: `Updated supplier invoice ${oldInvoice.invoiceNumber} for '${supplier?.supplierName}'.`
        });

        res.json(oldInvoice);

    } catch (error: any) {
        console.error('Update Supplier Invoice Error:', error);
        res.status(500).json({ message: error.message });
    }
};



export const deleteSupplierInvoice = async (req: Request, res: Response) => {
    console.log('Delete Supplier Invoice request received for ID:', req.params.id);
    try {
        const invoice = await SupplierInvoice.findOne({ id: req.params.id });
        if (!invoice) {
            console.log('Invoice not found');
            return res.status(404).json({ message: 'Supplier Invoice not found' });
        }
        console.log('Invoice found:', invoice.invoiceNumber);

        // Revert Supplier Balance (Undo the Purchase)
        const supplier = await Supplier.findOne({ id: invoice.supplierId });
        if (supplier) {
            supplier.outstanding += invoice.nettAmount;
            // Note: We don't save yet, we might have more updates from payments
        }

        // Handle linked Transactions
        const linkedTransactions = await CashFlowTransaction.find({ relatedInvoiceIds: invoice.id });
        for (const txn of linkedTransactions) {
            if (txn.category === 'Advance Payment') {
                // If it's an advance payment, we just unlink it.
                // The payment remains valid as an advance.
                // The balance impact of the advance (Expense += amount) remains.
                txn.relatedInvoiceIds = txn.relatedInvoiceIds?.filter(id => id !== invoice.id);
                await txn.save();
            } else if (txn.category === 'Supplier Payment') {
                // If it's a payment made specifically for this invoice (Settlement), we delete it.
                // We must REVERT the balance impact of this payment.
                // Payment (Expense) increased outstanding (+= amount).
                // Revert means -= amount.
                if (supplier) {
                    supplier.outstanding -= txn.amount;
                }
                await CashFlowTransaction.deleteOne({ id: txn.id });
            }
        }

        if (supplier) {
            await supplier.save();
        }

        // Unlink entries and recalculate status
        for (const entryId of invoice.entryIds) {
            const entry = await Entry.findOne({ id: entryId });
            if (entry) {
                entry.items.forEach((item: any) => {
                    if (item.supplierInvoiceId === invoice.id) {
                        item.supplierInvoiceId = null;
                    }
                });
                // Recalculate status (will no longer be INVOICED)
                entry.status = calculateEntryStatus(entry.items, false);
                await entry.save();
            }
        }

        await SupplierInvoice.deleteOne({ id: req.params.id });
        // Audit Log
        await AuditLog.create({
            id: `log_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`,
            action: 'Delete',
            feature: 'supplier_invoices',
            actorId: (req as any).user?.id || 'System',
            actorName: (req as any).user?.name || 'System',
            description: `Deleted supplier invoice ${invoice.invoiceNumber}`
        });

        res.json({ id: req.params.id });

    } catch (error: any) {
        res.status(500).json({ message: error.message });
    }
};

export const getSupplierInvoicesAnalytics = async (req: Request, res: Response) => {
    try {
        const invoices = await SupplierInvoice.find({});
        const suppliers = await Supplier.find({});

        // Calculate stats
        const invoiceCount = invoices.length;
        const totalPurchaseValue = invoices.reduce((sum, inv) => sum + inv.nettAmount, 0);
        const totalAmountPaid = invoices.reduce((sum, inv) => sum + inv.paidAmount, 0);
        const totalPayables = totalPurchaseValue - totalAmountPaid;

        // Group by supplier for top suppliers
        const supplierMap = new Map<string, { name: string; payable: number; purchases: number }>();

        invoices.forEach(inv => {
            const supplier = suppliers.find(s => s.id === inv.supplierId);
            const supplierName = supplier?.supplierName || 'Unknown';
            const balance = inv.nettAmount - inv.paidAmount;

            if (!supplierMap.has(inv.supplierId)) {
                supplierMap.set(inv.supplierId, { name: supplierName, payable: 0, purchases: 0 });
            }

            const data = supplierMap.get(inv.supplierId)!;
            data.payable += balance;
            data.purchases += inv.nettAmount;
        });

        // Convert to arrays and sort
        const supplierData = Array.from(supplierMap.values());
        const topSuppliersByPayable = supplierData
            .filter(s => s.payable > 0)
            .sort((a, b) => b.payable - a.payable)
            .slice(0, 5)
            .map(s => ({ name: s.name, value: s.payable }));

        const topSuppliersByPurchases = supplierData
            .sort((a, b) => b.purchases - a.purchases)
            .slice(0, 5)
            .map(s => ({ name: s.name, value: s.purchases }));

        res.json({
            stats: {
                invoiceCount,
                totalPurchaseValue,
                totalAmountPaid,
                totalPayables
            },
            topSuppliersByPayable,
            topSuppliersByPurchases
        });
    } catch (error: any) {
        res.status(500).json({ message: error.message });
    }
};
