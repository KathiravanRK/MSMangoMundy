import express from 'express';
import { getEntriesFinal, getEntry, createEntry, updateEntry, deleteEntry } from '../controllers/entryController';
import { protect } from '../middleware/authMiddleware';
import { checkPermission } from '../middleware/roleMiddleware';

const router = express.Router();

router.use(protect);

router.route('/')
    .get(checkPermission('entries.list.view'), getEntriesFinal)
    .post(checkPermission('entries.list.create'), createEntry);

router.route('/:id')
    .get(checkPermission('entries.list.view'), getEntry)
    .put(checkPermission('entries.list.update'), updateEntry)
    .delete(checkPermission('entries.list.delete'), deleteEntry);

export default router;
