import { Request, Response } from 'express';
import Buyer from '../models/Buyer';
import AuditLog from '../models/AuditLog';

export const getBuyers = async (req: Request, res: Response) => {
    try {
        const buyers = await Buyer.find({});

        // Migration: Ensure all buyers have custom id field
        let needsSave = false;
        for (const buyer of buyers) {
            if (!buyer.id) {
                buyer.id = `b_${buyer._id}`;
                await buyer.save();
                needsSave = true;
            }
        }

        // Refetch if we made changes
        const finalBuyers = needsSave ? await Buyer.find({}) : buyers;
        res.json(finalBuyers);
    } catch (error: any) {
        res.status(500).json({ message: error.message });
    }
};

export const getBuyer = async (req: Request, res: Response) => {
    try {
        const { id } = req.params;

        // Try to find by custom id first
        let buyer = await Buyer.findOne({ id });

        // If not found and the id looks like a MongoDB ObjectId, try finding by _id
        if (!buyer && id.match(/^[0-9a-fA-F]{24}$/)) {
            buyer = await Buyer.findById(id);
        }

        if (buyer) {
            res.json(buyer);
        } else {
            res.status(404).json({ message: 'Buyer not found' });
        }
    } catch (error: any) {
        res.status(500).json({ message: error.message });
    }
};

export const createBuyer = async (req: Request, res: Response) => {
    try {
        const { buyerName, displayName, alias, tokenNumber, description, contactNumber, place } = req.body;

        const newBuyer = await Buyer.create({
            id: `b_${Date.now()}`,
            buyerName,
            displayName: displayName || buyerName,
            alias,
            tokenNumber,
            description,
            contactNumber,
            place,
            outstanding: 0
        });

        // Audit Log
        // await AuditLog.create({...});

        res.status(201).json(newBuyer);
    } catch (error: any) {
        res.status(500).json({ message: error.message });
    }
};

export const updateBuyer = async (req: Request, res: Response) => {
    try {
        const buyer = await Buyer.findOne({ id: req.params.id });
        if (buyer) {
            buyer.buyerName = req.body.buyerName || buyer.buyerName;
            buyer.displayName = req.body.displayName || buyer.displayName;
            buyer.alias = req.body.alias || buyer.alias;
            buyer.tokenNumber = req.body.tokenNumber || buyer.tokenNumber;
            buyer.description = req.body.description || buyer.description;
            buyer.contactNumber = req.body.contactNumber || buyer.contactNumber;
            buyer.place = req.body.place || buyer.place;

            const updatedBuyer = await buyer.save();
            res.json(updatedBuyer);
        } else {
            res.status(404).json({ message: 'Buyer not found' });
        }
    } catch (error: any) {
        res.status(500).json({ message: error.message });
    }
};

export const deleteBuyer = async (req: Request, res: Response) => {
    try {
        const buyer = await Buyer.findOne({ id: req.params.id });
        if (buyer) {
            if (buyer.outstanding !== 0) {
                return res.status(400).json({ message: 'Cannot delete buyer with outstanding balance' });
            }
            await Buyer.deleteOne({ id: req.params.id });
            res.json({ id: req.params.id });
        } else {
            res.status(404).json({ message: 'Buyer not found' });
        }
    } catch (error: any) {
        res.status(500).json({ message: error.message });
    }
};
