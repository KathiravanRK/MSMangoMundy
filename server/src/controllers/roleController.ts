import { Request, Response } from 'express';
import Role from '../models/Role';
import AuditLog from '../models/AuditLog';

// Helper to get actor from request
const getActor = (req: any) => ({ id: req.user.id, name: req.user.name || 'User' });

export const getRoles = async (req: Request, res: Response) => {
    try {
        const roles = await Role.find({});
        res.json(roles);
    } catch (error: any) {
        res.status(500).json({ message: error.message });
    }
};

export const createRole = async (req: Request, res: Response) => {
    try {
        const { name, permissions } = req.body;

        const roleExists = await Role.findOne({ name });
        if (roleExists) {
            return res.status(400).json({ message: 'Role with this name already exists' });
        }

        const role = await Role.create({
            id: `role_${Date.now()}`,
            name,
            permissions,
        });

        // Audit Log
        const actor = getActor(req);
        await AuditLog.create({
            id: `log_${Date.now()}`,
            actorId: actor.id,
            actorName: actor.name,
            action: 'Create',
            feature: 'Roles',
            description: `Created new role '${name}'.`
        });

        res.status(201).json(role);
    } catch (error: any) {
        res.status(500).json({ message: error.message });
    }
};

export const updateRole = async (req: Request, res: Response) => {
    try {
        const { id } = req.params;
        const { name, permissions } = req.body;

        const role = await Role.findOne({ id });
        if (!role) {
            return res.status(404).json({ message: 'Role not found' });
        }

        if (role.name === 'Admin' && name !== 'Admin') {
            return res.status(403).json({ message: 'Cannot rename the Admin role' });
        }

        role.name = name || role.name;
        role.permissions = permissions || role.permissions;

        await role.save();

        // Audit Log
        const actor = getActor(req);
        await AuditLog.create({
            id: `log_${Date.now()}`,
            actorId: actor.id,
            actorName: actor.name,
            action: 'Update',
            feature: 'Roles',
            description: `Updated role '${role.name}'.`
        });

        res.json(role);
    } catch (error: any) {
        res.status(500).json({ message: error.message });
    }
};

export const deleteRole = async (req: Request, res: Response) => {
    try {
        const { id } = req.params;

        const role = await Role.findOne({ id });
        if (!role) {
            return res.status(404).json({ message: 'Role not found' });
        }

        if (role.name === 'Admin') {
            return res.status(403).json({ message: 'Cannot delete the Admin role' });
        }

        // Check if any users are assigned to this role
        const User = require('../models/User').default;
        const userCount = await User.countDocuments({ roleId: id });
        if (userCount > 0) {
            return res.status(400).json({ message: `Cannot delete role '${role.name}' as it is assigned to ${userCount} users.` });
        }

        await Role.deleteOne({ id });

        // Audit Log
        const actor = getActor(req);
        await AuditLog.create({
            id: `log_${Date.now()}`,
            actorId: actor.id,
            actorName: actor.name,
            action: 'Delete',
            feature: 'Roles',
            description: `Deleted role '${role.name}'.`
        });

        res.json({ message: 'Role removed' });
    } catch (error: any) {
        res.status(500).json({ message: error.message });
    }
};
