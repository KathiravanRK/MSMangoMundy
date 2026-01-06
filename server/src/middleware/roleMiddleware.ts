import { Response, NextFunction } from 'express';
import User from '../models/User';
import Role from '../models/Role';

export const checkPermission = (permissionKey: string) => {
    return async (req: any, res: Response, next: NextFunction) => {
        try {
            if (!req.user || !req.user.id) {
                return res.status(401).json({ message: 'Not authorized, no user data' });
            }

            const user = await User.findOne({ id: req.user.id });
            if (!user) {
                return res.status(404).json({ message: 'User not found' });
            }

            const role = await Role.findOne({ id: user.roleId });
            if (!role) {
                return res.status(403).json({ message: 'User role not found' });
            }

            // Admin role has all permissions
            if (role.name === 'Admin') {
                return next();
            }

            // Check if specific permission is granted
            if (role.permissions && role.permissions[permissionKey] === true) {
                return next();
            }

            res.status(403).json({ message: `Insufficient permissions: ${permissionKey}` });
        } catch (error: any) {
            res.status(500).json({ message: error.message });
        }
    };
};
