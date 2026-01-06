import express from 'express';
import { getTransactions, createTransaction, deleteTransaction, updateTransaction, getOpeningBalance } from '../controllers/cashFlowController';
import { protect } from '../middleware/authMiddleware';
import { checkPermission } from '../middleware/roleMiddleware';

const router = express.Router();

router.use(protect);

router.get('/opening-balance', checkPermission('cash_flow.view.view'), getOpeningBalance);

router.route('/')
    .get(checkPermission('cash_flow.view.view'), getTransactions)
    .post(checkPermission('cash_flow.add_income.create'), createTransaction); // This handles both income and expense in some cases, but generally 'create' is needed.

router.route('/:id')
    .put(checkPermission('cash_flow.update_transaction.update'), updateTransaction)
    .delete(checkPermission('cash_flow.delete_transaction.delete'), deleteTransaction);

export default router;
