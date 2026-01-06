import { Request, Response } from 'express';
import Supplier from '../models/Supplier';

export const getSuppliers = async (req: Request, res: Response) => {
    try {
        const suppliers = await Supplier.find({});

        // Migration: Ensure all suppliers have custom id field
        let needsSave = false;
        for (const supplier of suppliers) {
            if (!supplier.id) {
                supplier.id = `s_${supplier._id}`;
                await supplier.save();
                needsSave = true;
            }
        }

        // Refetch if we made changes
        const finalSuppliers = needsSave ? await Supplier.find({}) : suppliers;

        // Explicitly map to ensure id field is present
        const suppliersWithId = finalSuppliers.map(s => ({
            id: s.id || `s_${s._id}`,
            supplierName: s.supplierName,
            displayName: s.displayName,
            contactNumber: s.contactNumber,
            place: s.place,
            outstanding: s.outstanding,
            bankAccountDetails: s.bankAccountDetails
        }));

        res.json(suppliersWithId);
    } catch (error: any) {
        res.status(500).json({ message: error.message });
    }
};

export const getSupplier = async (req: Request, res: Response) => {
    try {
        const { id } = req.params;

        // Try to find by custom id first
        let supplier = await Supplier.findOne({ id });

        // If not found and the id looks like a MongoDB ObjectId, try finding by _id
        if (!supplier && id.match(/^[0-9a-fA-F]{24}$/)) {
            supplier = await Supplier.findById(id);
        }

        if (supplier) {
            res.json(supplier);
        } else {
            res.status(404).json({ message: 'Supplier not found' });
        }
    } catch (error: any) {
        res.status(500).json({ message: error.message });
    }
};

export const createSupplier = async (req: Request, res: Response) => {
    try {
        const { supplierName, displayName, contactNumber, place, bankAccountDetails } = req.body;

        const newSupplier = await Supplier.create({
            id: `s_${Date.now()}`,
            supplierName,
            displayName: displayName || supplierName,
            contactNumber,
            place,
            bankAccountDetails,
            outstanding: 0
        });

        res.status(201).json(newSupplier);
    } catch (error: any) {
        res.status(500).json({ message: error.message });
    }
};

export const updateSupplier = async (req: Request, res: Response) => {
    try {
        const supplier = await Supplier.findOne({ id: req.params.id });
        if (supplier) {
            supplier.supplierName = req.body.supplierName || supplier.supplierName;
            supplier.displayName = req.body.displayName || supplier.displayName;
            supplier.contactNumber = req.body.contactNumber || supplier.contactNumber;
            supplier.place = req.body.place || supplier.place;
            supplier.bankAccountDetails = req.body.bankAccountDetails || supplier.bankAccountDetails;

            const updatedSupplier = await supplier.save();
            res.json(updatedSupplier);
        } else {
            res.status(404).json({ message: 'Supplier not found' });
        }
    } catch (error: any) {
        res.status(500).json({ message: error.message });
    }
};

export const deleteSupplier = async (req: Request, res: Response) => {
    try {
        const supplier = await Supplier.findOne({ id: req.params.id });
        if (supplier) {
            if (supplier.outstanding !== 0) {
                return res.status(400).json({ message: 'Cannot delete supplier with outstanding balance' });
            }
            await Supplier.deleteOne({ id: req.params.id });
            res.json({ id: req.params.id });
        } else {
            res.status(404).json({ message: 'Supplier not found' });
        }
    } catch (error: any) {
        res.status(500).json({ message: error.message });
    }
};
