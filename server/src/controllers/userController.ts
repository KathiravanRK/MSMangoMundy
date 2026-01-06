import { Request, Response } from 'express';
import User from '../models/User';
import Role from '../models/Role';
import AuditLog from '../models/AuditLog';

import bcrypt from 'bcryptjs';

// Helper to get actor from request
const getActor = (req: any) => ({ id: req.user.id, name: req.user.name || 'User' });

export const getUsers = async (req: Request, res: Response) => {
    try {
        const users = await User.find({});
        const usersWithRoles = await Promise.all(users.map(async (u) => {
            const role = await Role.findOne({ id: u.roleId });
            const userObj = u.toObject();
            delete userObj.password;
            return { ...userObj, role };
        }));
        res.json(usersWithRoles);
    } catch (error: any) {
        res.status(500).json({ message: error.message });
    }
};

export const createUser = async (req: Request, res: Response) => {
    try {
        const { id, name, contactNumber, password, roleId } = req.body;

        const userExists = await User.findOne({ contactNumber });
        if (userExists) {
            return res.status(400).json({ message: 'User already exists' });
        }

        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(password, salt);

        const user = await User.create({
            id: id || `user_${Date.now()}`,
            name,
            contactNumber,
            password: hashedPassword,
            roleId,
        });

        const role = await Role.findOne({ id: roleId });

        // Audit Log
        const actor = getActor(req);
        await AuditLog.create({
            id: `log_${Date.now()}`,
            actorId: actor.id,
            actorName: actor.name,
            action: 'Create',
            feature: 'Users',
            description: `Created new user '${name}' with role '${role?.name || 'Unknown'}'.`
        });

        const userObj = user.toObject();
        delete userObj.password;
        res.status(201).json({ ...userObj, role });
    } catch (error: any) {
        res.status(500).json({ message: error.message });
    }
};

export const updateUser = async (req: Request, res: Response) => {
    try {
        const { id } = req.params;
        const { name, contactNumber, password, roleId } = req.body;

        const user = await User.findOne({ id });
        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }

        user.name = name || user.name;
        user.contactNumber = contactNumber || user.contactNumber;
        user.roleId = roleId || user.roleId;

        if (password) {
            const salt = await bcrypt.genSalt(10);
            user.password = await bcrypt.hash(password, salt);
        }

        await user.save();

        const role = await Role.findOne({ id: user.roleId });

        // Audit Log
        const actor = getActor(req);
        await AuditLog.create({
            id: `log_${Date.now()}`,
            actorId: actor.id,
            actorName: actor.name,
            action: 'Update',
            feature: 'Users',
            description: `Updated user '${user.name}'.`
        });

        const userObj = user.toObject();
        delete userObj.password;
        res.json({ ...userObj, role });
    } catch (error: any) {
        res.status(500).json({ message: error.message });
    }
};

export const deleteUser = async (req: Request, res: Response) => {
    try {
        const { id } = req.params;

        const user = await User.findOne({ id });
        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }

        const role = await Role.findOne({ id: user.roleId });
        if (role?.name === 'Admin') {
            return res.status(403).json({ message: 'Cannot delete an Admin user' });
        }

        await User.deleteOne({ id });

        // Audit Log
        const actor = getActor(req);
        await AuditLog.create({
            id: `log_${Date.now()}`,
            actorId: actor.id,
            actorName: actor.name,
            action: 'Delete',
            feature: 'Users',
            description: `Deleted user '${user.name}'.`
        });

        res.json({ message: 'User removed' });
    } catch (error: any) {
        res.status(500).json({ message: error.message });
    }
};
