import express from 'express';
import { getInvoices, getInvoice, createInvoice, updateInvoice, deleteInvoice, getDraftItemsForBuyer, getBuyerStats } from '../controllers/invoiceController';
import { protect } from '../middleware/authMiddleware';
import { checkPermission } from '../middleware/roleMiddleware';

const router = express.Router();

router.use(protect);

router.route('/')
    .get(checkPermission('buyer_invoices.manage.view'), getInvoices)
    .post(checkPermission('buyer_invoices.manage.create'), createInvoice);

router.get('/draft-items/:buyerId', checkPermission('buyer_invoices.manage.create'), getDraftItemsForBuyer);
router.get('/buyer-stats/:buyerId', checkPermission('buyer_invoices.manage.view'), getBuyerStats);

router.route('/:id')
    .get(checkPermission('buyer_invoices.manage.view'), getInvoice)
    .put(checkPermission('buyer_invoices.manage.update'), updateInvoice)
    .delete(checkPermission('buyer_invoices.manage.delete'), deleteInvoice);

export default router;
