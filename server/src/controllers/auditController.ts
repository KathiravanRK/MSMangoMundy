import { Request, Response } from 'express';
import AuditLog from '../models/AuditLog';

export const getAuditLogs = async (req: Request, res: Response) => {
    try {
        const { startDate, endDate, userId, feature, action } = req.query;

        let query: any = {};

        if (startDate && endDate) {
            query.timestamp = {
                $gte: new Date(startDate as string),
                $lte: new Date(endDate as string + 'T23:59:59.999Z')
            };
        }

        if (userId) query.actorId = userId;
        if (feature) query.feature = feature;
        if (action) query.action = action;

        const logs = await AuditLog.find(query).sort({ timestamp: -1 });
        res.json(logs);
    } catch (error: any) {
        res.status(500).json({ message: error.message });
    }
};
