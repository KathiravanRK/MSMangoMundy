import { IEntryItem } from '../models/Entry';

/**
 * Calculate entry status based on the new business logic:
 * 
 * PENDING: Initial status when entry is created (no auction data)
 * DRAFT: ALL items have buyerId AND ratePerQuantity (auction completed, not yet in buyer invoices)
 * AUCTIONED: ALL items are in buyer invoices (all have invoiceId)
 * INVOICED: Entry is in a finalized supplier invoice (has supplierInvoiceId)
 * 
 * @param items - Array of entry items
 * @param hasSupplierInvoice - Whether entry is part of a confirmed supplier invoice
 * @returns Entry status string
 */
export function calculateEntryStatus(items: IEntryItem[], hasSupplierInvoice: boolean = false): string {
    if (!items || items.length === 0) {
        return 'Pending';
    }

    // Priority 1: If entry is in a supplier invoice, status is INVOICED
    if (hasSupplierInvoice || items.some(item => !!item.supplierInvoiceId)) {
        return 'Invoiced';
    }

    // Check if ALL items have buyer invoices (invoiceId)
    const allHaveBuyerInvoice = items.every(item => !!item.invoiceId);
    if (allHaveBuyerInvoice) {
        return 'Auctioned';
    }

    // Check if ALL items have buyer assignment and rate
    const allHaveBuyerAndRate = items.every(item => !!item.buyerId && !!item.ratePerQuantity);
    if (allHaveBuyerAndRate) {
        return 'Draft';
    }

    // Default: PENDING (no auction data or incomplete auction)
    return 'Pending';
}
