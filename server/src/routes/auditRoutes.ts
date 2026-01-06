import express from 'express';
import { getAuditLogs } from '../controllers/auditController';
import { protect } from '../middleware/authMiddleware';
import { checkPermission } from '../middleware/roleMiddleware';

const router = express.Router();

router.use(protect);

router.get('/', checkPermission('audit_log.view.view'), getAuditLogs);

export default router;
