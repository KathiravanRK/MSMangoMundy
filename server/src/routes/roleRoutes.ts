import express from 'express';
import { getRoles, createRole, updateRole, deleteRole } from '../controllers/roleController';
import { protect } from '../middleware/authMiddleware';
import { checkPermission } from '../middleware/roleMiddleware';

const router = express.Router();

router.use(protect); // All role routes are protected

router.route('/')
    .get(checkPermission('roles.list.view'), getRoles)
    .post(checkPermission('roles.list.create'), createRole);

router.route('/:id')
    .put(checkPermission('roles.list.update'), updateRole)
    .delete(checkPermission('roles.list.delete'), deleteRole);

export default router;
