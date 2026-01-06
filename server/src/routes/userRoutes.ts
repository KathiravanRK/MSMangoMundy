import express from 'express';
import { getUsers, createUser, updateUser, deleteUser } from '../controllers/userController';
import { protect } from '../middleware/authMiddleware';
import { checkPermission } from '../middleware/roleMiddleware';

const router = express.Router();

router.use(protect);

router.route('/')
    .get(checkPermission('users.list.view'), getUsers)
    .post(checkPermission('users.list.create'), createUser);

router.route('/:id')
    .put(checkPermission('users.list.update'), updateUser)
    .delete(checkPermission('users.list.delete'), deleteUser);

export default router;
