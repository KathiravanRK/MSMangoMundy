import { Request, Response } from 'express';
import User from '../models/User';
import Role from '../models/Role';
import jwt from 'jsonwebtoken';
import AuditLog from '../models/AuditLog';

import bcrypt from 'bcryptjs';

const generateToken = (id: string) => {
    return jwt.sign({ id }, process.env.JWT_SECRET || 'secret', {
        expiresIn: '30d',
    });
};

export const loginUser = async (req: Request, res: Response) => {
    const { contactNumber, password } = req.body;

    try {
        const user = await User.findOne({ contactNumber });

        if (user && user.password && (await bcrypt.compare(password, user.password))) {
            const role = await Role.findOne({ id: user.roleId });

            // Audit Log
            await AuditLog.create({
                id: `log_${Date.now()}`,
                actorId: user.id,
                actorName: user.name,
                action: 'Login',
                feature: 'Users',
                description: `User '${user.name}' logged in.`
            });

            res.json({
                id: user.id,
                name: user.name,
                contactNumber: user.contactNumber,
                roleId: user.roleId,
                role: role,
                token: generateToken(user.id),
            });
        } else {
            res.status(401).json({ message: 'Invalid contact number or password' });
        }
    } catch (error: any) {
        res.status(500).json({ message: error.message });
    }
};

export const getMe = async (req: any, res: Response) => {
    try {
        const user = await User.findOne({ id: req.user.id });
        if (user) {
            const role = await Role.findOne({ id: user.roleId });
            res.json({
                id: user.id,
                name: user.name,
                contactNumber: user.contactNumber,
                roleId: user.roleId,
                role: role,
            });
        } else {
            res.status(404).json({ message: 'User not found' });
        }
    } catch (error: any) {
        res.status(500).json({ message: error.message });
    }
};
