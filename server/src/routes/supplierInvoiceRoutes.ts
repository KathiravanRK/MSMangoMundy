import express from 'express';
import { getSupplierInvoices, getSupplierInvoice, createSupplierInvoice, updateSupplierInvoice, deleteSupplierInvoice, getSupplierInvoicesAnalytics } from '../controllers/supplierInvoiceController';
import { protect } from '../middleware/authMiddleware';
import { checkPermission } from '../middleware/roleMiddleware';

const router = express.Router();

router.use(protect);

router.route('/')
    .get(checkPermission('supplier_invoices.manage.view'), getSupplierInvoices)
    .post(checkPermission('supplier_invoices.manage.create'), createSupplierInvoice);

router.get('/analytics', checkPermission('supplier_invoices.manage.view'), getSupplierInvoicesAnalytics);

router.route('/:id')
    .get(checkPermission('supplier_invoices.manage.view'), getSupplierInvoice)
    .put(checkPermission('supplier_invoices.manage.update'), updateSupplierInvoice)
    .delete(checkPermission('supplier_invoices.manage.delete'), deleteSupplierInvoice);

export default router;
