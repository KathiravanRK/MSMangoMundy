import { Request, Response } from 'express';
import Entry, { IEntry, IEntryItem } from '../models/Entry';
import Supplier from '../models/Supplier';
import AuditLog from '../models/AuditLog';
import { calculateEntryStatus } from '../utils/entryStatusCalculator';

// Helper to generate serial number
const generateSerialNumber = async (supplierId: string): Promise<string> => {
    const today = new Date();
    const startOfDay = new Date(today.setHours(0, 0, 0, 0));
    const endOfDay = new Date(today.setHours(23, 59, 59, 999));

    const entriesToday = await Entry.find({
        createdAt: { $gte: startOfDay, $lte: endOfDay }
    });

    const newDailyCounter = entriesToday.length + 1;
    const formattedMonth = (today.getMonth() + 1).toString().padStart(2, '0');
    const formattedDay = today.getDate().toString().padStart(2, '0');

    return `${formattedMonth}${formattedDay}-${newDailyCounter.toString().padStart(3, '0')}`;
};

export const getEntriesFinal = async (req: Request, res: Response) => {
    try {
        const { startDate, endDate } = req.query;
        console.log(`[DEBUG] getEntriesFinal query params: startDate=${startDate}, endDate=${endDate}`);
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

        const entries = await Entry.find(query).sort({ createdAt: -1 });

        // Migration: Ensure all entries have custom id field
        let needsSave = false;
        for (const entry of entries) {
            if (!entry.id) {
                entry.id = `e_${entry._id}`;
                await entry.save();
                needsSave = true;
            }
        }

        // Refetch if we made changes, preserving the original filter
        const finalEntries = needsSave ? await Entry.find(query).sort({ createdAt: -1 }) : entries;

        // Explicitly map to ensure supplierId and productId match the custom ID format
        const entriesWithTransformedIds = finalEntries.map(entry => {
            const supplierIdStr = String(entry.supplierId);

            return {
                id: entry.id || `e_${entry._id}`,
                serialNumber: entry.serialNumber,
                supplierId: supplierIdStr.startsWith('s_') ? supplierIdStr : `s_${supplierIdStr}`,
                items: entry.items.map((item: IEntryItem) => {
                    const productIdStr = String(item.productId);

                    return {
                        id: item.id,
                        subSerialNumber: item.subSerialNumber,
                        productId: productIdStr.startsWith('p_') ? productIdStr : `p_${productIdStr}`,
                        quantity: item.quantity,
                        grossWeight: item.grossWeight,
                        shuteWeight: item.shuteWeight,
                        nettWeight: item.nettWeight,
                        buyerId: item.buyerId,
                        ratePerQuantity: item.ratePerQuantity,
                        subTotal: item.subTotal,
                        invoiceId: item.invoiceId,
                        supplierInvoiceId: item.supplierInvoiceId
                    };
                }),
                totalAmount: entry.totalAmount,
                totalQuantities: entry.totalQuantities,
                status: calculateEntryStatus(entry.items, false),
                lastSubSerialNumber: entry.lastSubSerialNumber,
                createdAt: entry.createdAt
            };
        });

        res.json(entriesWithTransformedIds);
    } catch (error: any) {
        res.status(500).json({ message: error.message });
    }
};

export const getEntry = async (req: Request, res: Response) => {
    try {
        const entry = await Entry.findOne({ id: req.params.id });
        if (entry) {
            res.json(entry);
        } else {
            res.status(404).json({ message: 'Entry not found' });
        }
    } catch (error: any) {
        res.status(500).json({ message: error.message });
    }
};

export const createEntry = async (req: Request, res: Response) => {
    try {
        const { supplierId, items } = req.body;

        // Check for existing entry for this supplier today
        const today = new Date();
        const startOfDay = new Date(today.setHours(0, 0, 0, 0));
        const endOfDay = new Date(today.setHours(23, 59, 59, 999));

        const existingEntry = await Entry.findOne({
            supplierId,
            createdAt: { $gte: startOfDay, $lte: endOfDay }
        });

        if (existingEntry) {
            return res.status(400).json({
                message: `An entry for this supplier already exists for today (Serial #: ${existingEntry.serialNumber}).`,
                existingEntryId: existingEntry.id
            });
        }

        const serialNumber = await generateSerialNumber(supplierId);

        const newEntry = await Entry.create({
            id: `e_${Date.now()}`,
            serialNumber,
            supplierId,
            items: items.map((item: any, index: number) => ({
                ...item,
                id: item.id || `ei_${Date.now()}_${index}`,
                subSerialNumber: index + 1,
                subTotal: 0,
                invoiceId: null,
                supplierInvoiceId: null
            })),
            totalQuantities: items.reduce((sum: number, item: any) => sum + item.quantity, 0),
            totalAmount: 0,
            status: 'Pending',
        });

        const supplier = await Supplier.findOne({ id: supplierId });

        // Audit Log
        await AuditLog.create({
            id: `log_${Date.now()}`,
            actorId: (req as any).user.id,
            actorName: 'Admin',
            action: 'Create',
            feature: 'Entries',
            description: `Created entry ${newEntry.serialNumber} for supplier '${supplier?.supplierName}' with ${newEntry.items.length} item(s).`
        });

        res.status(201).json(newEntry);
    } catch (error: any) {
        res.status(500).json({ message: error.message });
    }
};

export const updateEntry = async (req: Request, res: Response) => {
    try {
        const entry = await Entry.findOne({ id: req.params.id });
        if (!entry) {
            return res.status(404).json({ message: 'Entry not found' });
        }

        const updatedData = req.body;

        // Logic to handle item updates, re-ordering, and status calculation
        // This is a simplified version, mirroring the mockApi logic

        // Check if auctioned (any item has buyerId)
        const isAuctioned = entry.items.some(i => !!i.buyerId) || updatedData.items.some((i: any) => !!i.buyerId);

        let finalItems: IEntryItem[] = [];
        let newLastSubSerialNumber = entry.lastSubSerialNumber;

        if (!isAuctioned) {
            // Pre-auction: re-order
            finalItems = updatedData.items.map((item: any, idx: number) => ({
                ...item,
                id: item.id && !item.id.startsWith("temp_") ? item.id : `ei_${Date.now()}_${idx}`,
                subSerialNumber: idx + 1,
            }));
            newLastSubSerialNumber = finalItems.length;
        } else {
            // Auction/Post-auction: preserve numbers
            const originalItemsMap = new Map(entry.items.map(i => [i.id, i]));
            finalItems = updatedData.items.map((item: any) => {
                const originalItem = originalItemsMap.get(item.id);
                if (originalItem) {
                    return { ...item, subSerialNumber: originalItem.subSerialNumber };
                } else {
                    newLastSubSerialNumber++;
                    return {
                        ...item,
                        id: `ei_${Date.now()}_${newLastSubSerialNumber}`,
                        subSerialNumber: newLastSubSerialNumber,
                    };
                }
            });
        }

        entry.items = finalItems as any; // Type casting for embedded doc array
        entry.lastSubSerialNumber = newLastSubSerialNumber;
        entry.totalQuantities = finalItems.reduce((sum, item) => sum + item.quantity, 0);
        entry.totalAmount = finalItems.reduce((sum, item) => sum + item.subTotal, 0);

        // Calculate status using new business logic
        // Note: We don't check for supplier invoice here as that's handled separately
        // when supplier invoices are created/deleted
        entry.status = calculateEntryStatus(finalItems, false);

        await entry.save();
        res.json(entry);

    } catch (error: any) {
        res.status(500).json({ message: error.message });
    }
};

export const deleteEntry = async (req: Request, res: Response) => {
    try {
        const entry = await Entry.findOne({ id: req.params.id });
        if (entry) {
            // Check if any items are invoiced
            if (entry.items.some(i => !!i.invoiceId)) {
                return res.status(400).json({ message: 'Cannot delete entry with invoiced items' });
            }
            await Entry.deleteOne({ id: req.params.id });
            res.json({ id: req.params.id });
        } else {
            res.status(404).json({ message: 'Entry not found' });
        }
    } catch (error: any) {
        res.status(500).json({ message: error.message });
    }
};
